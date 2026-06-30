import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "30"));

  const db = await getDb();
  const [logs, total] = await Promise.all([
    db.collection("audit_logs")
      .find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    db.collection("audit_logs").countDocuments({}),
  ]);

  return NextResponse.json({
    logs: logs.map(l => ({ ...l, _id: l._id.toString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
