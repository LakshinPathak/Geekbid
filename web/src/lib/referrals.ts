import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Flat one-time credit awarded to a referrer once their referred user completes their first job.
export const REFERRAL_COMPLETION_CREDIT = 25;

/**
 * Transitions a referral from "signed_up" to "credited" the first time the
 * referred user completes a job, and credits the referrer's account.
 * Safe to call on every job completion — it's a no-op unless the freelancer
 * was referred and hasn't been credited yet.
 */
export async function creditReferralOnFirstJobCompletion(referredUserId: string): Promise<void> {
  const db = await getDb();
  const referral = await db.collection("referrals").findOne({
    referredUserId,
    status: "signed_up",
  });
  if (!referral) return;

  const creditedAt = new Date().toISOString();
  const result = await db.collection("referrals").updateOne(
    { _id: referral._id, status: "signed_up" },
    { $set: { status: "credited", creditAmount: REFERRAL_COMPLETION_CREDIT, completedAt: creditedAt } }
  );
  if (result.modifiedCount === 0) return; // already credited by a concurrent call

  await db.collection("users").updateOne(
    { _id: new ObjectId(referral.referrerUserId) },
    { $inc: { referralCredits: REFERRAL_COMPLETION_CREDIT } }
  );
}
