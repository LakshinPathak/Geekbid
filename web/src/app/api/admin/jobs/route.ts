import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { sanitizeSearchRegex, sanitizePagination, sanitizeString } from "@/lib/sanitize";

const ALLOWED_STATUSES = ["open", "accepted", "completed", "cancelled", "removed", "all"];

async function requireAdmin(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error, status: auth.status };
  if (auth.payload.role !== "admin") return { error: "Forbidden", status: 403 };
  return { payload: auth.payload };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, limit } = sanitizePagination(searchParams.get("page"), searchParams.get("limit"));
  // Escape regex metacharacters to prevent ReDoS attacks
  const search = sanitizeSearchRegex(searchParams.get("search"));
  const statusRaw = sanitizeString(searchParams.get("status"));
  const status = ALLOWED_STATUSES.includes(statusRaw) ? statusRaw : "";

  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [jobs, total] = await Promise.all([
    db.collection("jobs")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection("jobs").countDocuments(filter),
  ]);

  return NextResponse.json({
    jobs: jobs.map(j => ({ ...j, _id: j._id.toString(), id: j._id.toString() })),
    total, page,
    pages: Math.ceil(total / limit),
  });
}
