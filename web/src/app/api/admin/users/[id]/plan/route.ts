import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sanitizeObjectId } from "@/lib/sanitize";
import { PLANS, type PlanTier } from "@/lib/plans";

async function requireAdmin(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error, status: auth.status };
  if (auth.payload.role !== "admin") return { error: "Forbidden", status: 403 };
  return { payload: auth.payload };
}

// PATCH /api/admin/users/[id]/plan — admin manual plan override
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: rawId } = await params;
  const id = sanitizeObjectId(rawId);
  if (!id) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const { plan, reason } = await req.json();
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "plan must be one of: free, plus, premium" }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const oldPlan = user.plan ?? "free";
  const now = new Date().toISOString();

  await db.collection("users").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        plan: plan as PlanTier,
        planExpiresAt: null,
        updatedAt: now,
      },
    }
  );

  await db.collection("plan_change_log").insertOne({
    userId: id,
    oldPlan,
    newPlan: plan,
    changedBy: auth.payload.userId,
    reason: reason ?? "",
    createdAt: now,
  });

  await db.collection("audit_logs").insertOne({
    adminId: auth.payload.userId,
    action: "update_user_plan",
    detail: `Changed user ${id} plan: ${oldPlan} -> ${plan}${reason ? ` (${reason})` : ""}`,
    createdAt: now,
  });

  return NextResponse.json({ ok: true, oldPlan, newPlan: plan });
}
