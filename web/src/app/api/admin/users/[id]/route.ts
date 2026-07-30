import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, revokeRefreshToken } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sanitizeObjectId } from "@/lib/sanitize";

const VALID_ROLES = ["freelancer", "client", "admin"];

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

  const { id: rawId } = await params;
  const id = sanitizeObjectId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(id) },
    { projection: { password: 0 } }
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ ...user, _id: user._id.toString(), id: user._id.toString() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: rawId } = await params;
  const id = sanitizeObjectId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const body = await req.json();
  // Allowlist prevents field injection — only these fields can be updated by admin
  const allowed = ["role", "geekScore", "isVerified", "suspended", "suspendReason", "bio", "skills", "fullName"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  if ("role" in update && !VALID_ROLES.includes(update.role as string)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const db = await getDb();

  // Setting `role` must keep it a member of the dual-role `roles` array —
  // otherwise POST /api/auth/switch-role (which checks roles.includes())
  // would refuse to switch back into the role an admin just set, since it
  // was never added to that array.
  if ("role" in update) {
    const existingUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const existingRoles: string[] = existingUser.roles ?? [existingUser.role];
    update.roles = Array.from(new Set([...existingRoles, update.role as string]));
  }

  const result = await db.collection("users").updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Suspending a user — or changing their role (e.g. admin -> freelancer) —
  // must end their existing session too, not just block future
  // logins/refreshes. Otherwise an already-issued access token keeps
  // passing requireAdmin()/role checks against the old role until it
  // naturally expires (~15 min), and an already-issued refresh token keeps
  // working until its own expiry.
  if (update.suspended === true || "role" in update) {
    await revokeRefreshToken(id);
  }

  await logAction(auth.payload.userId, "update_user", `Updated user ${id}: ${Object.keys(update).join(", ")}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: rawId } = await params;
  const id = sanitizeObjectId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const db = await getDb();
  const result = await db.collection("users").updateOne(
    { _id: new ObjectId(id) },
    { $set: { deleted: true, deletedAt: new Date().toISOString(), deleteReason: reason ?? "" } }
  );
  if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await revokeRefreshToken(id);
  await logAction(auth.payload.userId, "delete_user", `Soft-deleted user ${id}. Reason: ${reason}`);
  return NextResponse.json({ ok: true });
}
