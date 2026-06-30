import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: ObjectId.createFromHexString(id) },
    { projection: { password: 0 } }
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ ...user, _id: user._id.toString(), id: user._id.toString() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await req.json();
  const allowed = ["role", "geekScore", "isVerified", "suspended", "bio", "skills", "fullName"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("users").updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: { ...update, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await logAction(auth.payload.userId, "update_user", `Updated user ${id}: ${Object.keys(update).join(", ")}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const db = await getDb();
  const result = await db.collection("users").updateOne(
    { _id: ObjectId.createFromHexString(id) },
    { $set: { deleted: true, deletedAt: new Date().toISOString(), deleteReason: reason ?? "" } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await logAction(auth.payload.userId, "delete_user", `Soft-deleted user ${id}. Reason: ${reason}`);
  return NextResponse.json({ ok: true });
}
