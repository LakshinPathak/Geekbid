import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getPlanConfig } from "@/lib/plans";

// Shared cap across every AI feature except bid-strategy (which already
// tracks its own separate counter) — applies to every tier, not just free.
// Without this, a user could call chat-assist/evaluate-bids/generate-description/
// quality-check/pricing-advisor/smart-search unlimited times.

export async function checkAndConsumeAiQuota(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const _id = new ObjectId(userId);
  const user = await db
    .collection("users")
    .findOne({ _id }, { projection: { plan: 1, planLimits: 1 } });
  if (!user) return { ok: false, error: "User not found" };

  const config = getPlanConfig(user.plan);
  const aiLimit = config.limits.aiGeneralPerMonth;

  // Dedicated reset field (not the shared jobs/bids `planLimits.monthResetAt`)
  // so resetting this quota can never skip or double-fire a reset of the
  // job/bid counters, which key off that field independently.
  const aiMonthResetAt = user.planLimits?.aiMonthResetAt;
  if (!aiMonthResetAt || new Date(aiMonthResetAt) < new Date()) {
    await db.collection("users").updateOne({ _id }, {
      $set: {
        "planLimits.aiUsesThisMonth": 0,
        "planLimits.aiMonthResetAt": new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
      },
    });
  }

  // Atomic check-and-increment in one round trip: a plain findOne-then-updateOne
  // lets two concurrent requests both read "under the cap" before either write
  // lands, granting more uses than the limit allows. The $lt guard on the same
  // document makes MongoDB serialize the check and the increment together.
  const capped = await db.collection("users").findOneAndUpdate(
    {
      _id,
      $or: [
        { "planLimits.aiUsesThisMonth": { $lt: aiLimit } },
        { "planLimits.aiUsesThisMonth": { $exists: false } },
      ],
    },
    { $inc: { "planLimits.aiUsesThisMonth": 1 } }
  );

  if (!capped) {
    return {
      ok: false,
      error: `${config.name} plan AI usage limit reached: ${aiLimit}/month. Upgrade for more.`,
    };
  }
  return { ok: true };
}
