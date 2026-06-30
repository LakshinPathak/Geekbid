import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sanitizeObjectId } from "@/lib/sanitize";

async function requireAdmin(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error, status: auth.status };
  if (auth.payload.role !== "admin") return { error: "Forbidden", status: 403 };
  return { payload: auth.payload };
}

async function logAction(adminId: string, action: string, detail: string) {
  const db = await getDb();
  await db.collection("audit_logs").insertOne({
    adminId, action, detail, createdAt: new Date().toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: rawId } = await params;
  const id = sanitizeObjectId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  const body = await req.json();
  const allowed = ["title", "description", "status", "startingPrice", "minimumPrice", "decayRatePerHour", "featured", "skillsRequired", "category"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const db = await getDb();
  const result = await db.collection("jobs").updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: { ...update, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await logAction(auth.payload.userId, "update_job", `Updated job ${id}: ${Object.keys(update).join(", ")}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: rawId } = await params;
  const id = sanitizeObjectId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const db = await getDb();
  const result = await db.collection("jobs").updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: { status: "removed", deletedAt: new Date().toISOString(), deleteReason: reason ?? "" } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await logAction(auth.payload.userId, "delete_job", `Removed job ${id}. Reason: ${reason}`);
  return NextResponse.json({ ok: true });
}
