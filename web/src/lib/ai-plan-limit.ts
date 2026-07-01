import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Shared free-plan cap across every AI feature except bid-strategy (which
// already tracks its own separate, stricter counter). Without this, a
// free-tier user could call chat-assist/evaluate-bids/generate-description/
// quality-check/pricing-advisor/smart-search unlimited times.
const FREE_PLAN_AI_MONTHLY_LIMIT = 5;

export async function checkAndConsumeAiQuota(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { plan: 1, planLimits: 1 } });
  if (!user) return { ok: false, error: "User not found" };

  if (user.plan && user.plan !== "free") return { ok: true };

  const limits = user.planLimits ?? {};
  const now = new Date();
  const resetAt = limits.monthResetAt ? new Date(limits.monthResetAt) : null;
  const sameMonth =
    resetAt && resetAt.getMonth() === now.getMonth() && resetAt.getFullYear() === now.getFullYear();
  const uses = sameMonth ? limits.aiUsesThisMonth ?? 0 : 0;

  if (uses >= FREE_PLAN_AI_MONTHLY_LIMIT) {
    return {
      ok: false,
      error: "Free plan AI usage limit reached. Upgrade to Pro for unlimited AI features.",
    };
  }

  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        "planLimits.aiUsesThisMonth": uses + 1,
        "planLimits.monthResetAt": sameMonth ? limits.monthResetAt : now.toISOString(),
      },
    }
  );
  return { ok: true };
}
