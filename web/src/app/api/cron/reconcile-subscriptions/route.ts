import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { razorpayRequest, isRazorpayConfigured } from "@/lib/razorpay";
import { handleDowngrade, enforceExpiredTeamSeatDeadlines } from "@/lib/plan-downgrade";
import { constantTimeEqual } from "@/lib/sanitize";
import { sendGracePeriodReminderEmail } from "@/lib/billing-emails";

function mapRazorpayStatus(rzpStatus: string): string | null {
  switch (rzpStatus) {
    case "active": return "active";
    // Matches lib/webhook-processing.ts's handleHalted — "halted" isn't a
    // status this app's subscription state machine otherwise ever writes
    // (only "created" | "active" | "past_due" | "cancelled" | "completed"),
    // so a reconciliation run could set a value nothing else recognizes.
    case "halted":
    case "cancelled":
    case "expired": return "cancelled";
    case "completed": return "completed";
    case "pending": return "past_due";
    default: return null; // created/authenticated — no local state change needed
  }
}

// GET /api/cron/reconcile-subscriptions — runs daily (see vercel.json).
// Corrects local subscription state that drifted from Razorpay's actual
// state (e.g. a webhook delivery was lost), and sweeps expired grace
// periods + team seat deadlines that a webhook alone wouldn't catch.
export async function GET(req: NextRequest) {
  // A missing CRON_SECRET must never fail open — without this check,
  // `Bearer ${undefined}` becomes the literal string "Bearer undefined",
  // which anyone could send as the header and pass the comparison below.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || !authHeader || !constantTimeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  let corrected = 0;

  if (isRazorpayConfigured) {
    const candidateSubs = await db.collection("subscriptions").find({
      status: { $in: ["active", "past_due"] },
    }).toArray();
    // Mock subscriptions (created before real Razorpay Plans existed) have
    // nothing to reconcile against — skip them rather than erroring on a
    // fetch to a subscription id Razorpay has never heard of.
    const localSubs = candidateSubs.filter(
      (s) => typeof s.razorpaySubscriptionId === "string" && !s.razorpaySubscriptionId.startsWith("sub_mock_")
    );

    for (const localSub of localSubs) {
      try {
        const razorpaySub = await razorpayRequest<{ status: string }>(
          `/subscriptions/${localSub.razorpaySubscriptionId}`
        );
        const mappedStatus = mapRazorpayStatus(razorpaySub.status);
        if (mappedStatus && mappedStatus !== localSub.status) {
          await db.collection("subscriptions").updateOne(
            { _id: localSub._id },
            { $set: { status: mappedStatus, updatedAt: new Date().toISOString() } }
          );
          if (mappedStatus === "cancelled") {
            await handleDowngrade(localSub.userId, localSub.plan, "free", "reconciliation_drift", "cron", db);
          }
          corrected++;
        }
      } catch (err) {
        console.error(`[Reconciliation] Failed to fetch subscription ${localSub.razorpaySubscriptionId}:`, err);
      }
    }
  }

  // Expired grace periods — the state machine's #6 transition (past_due ->
  // cancelled) in case the halted/cancelled webhook was never delivered.
  const now = new Date().toISOString();
  const expiredGrace = await db.collection("subscriptions").find({
    status: "past_due",
    gracePeriodEndsAt: { $lte: now },
  }).toArray();

  let graceExpiredCount = 0;
  for (const sub of expiredGrace) {
    // Atomically claim the subscription before downgrading — same pattern as
    // the webhook route's findOneAndUpdate claim (see
    // api/webhooks/razorpay/route.ts). Without this, two overlapping cron
    // runs (a slow run still in flight when the next scheduled run starts)
    // could both read this doc while it's still "past_due" and both call
    // handleDowngrade for the same subscription — double-revoking API keys/
    // team seats and double-sending the downgrade email. Only the request
    // that wins this single-document status flip proceeds.
    const claimed = await db.collection("subscriptions").findOneAndUpdate(
      { _id: sub._id, status: "past_due" },
      { $set: { status: "cancelled", updatedAt: now } }
    );
    if (!claimed) continue; // already claimed by a concurrent run
    await handleDowngrade(sub.userId, sub.plan, "free", "grace_period_expired", "cron", db);
    graceExpiredCount++;
  }

  // Grace period reminders — nudge past_due users before their grace period
  // expires (sendGracePeriodReminderEmail was defined but never wired up).
  // Sent once per threshold per subscription, tracked via graceRemindersSent
  // so overlapping cron runs / repeated daily runs don't re-send.
  const upcomingGrace = await db.collection("subscriptions").find({
    status: "past_due",
    gracePeriodEndsAt: { $gt: now },
  }).toArray();

  const ONE_DAY_MS = 24 * 3600000;
  for (const sub of upcomingGrace) {
    const msLeft = new Date(sub.gracePeriodEndsAt).getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / ONE_DAY_MS);
    const threshold: "3day" | "1day" | null = daysLeft <= 1 ? "1day" : daysLeft <= 3 ? "3day" : null;
    if (!threshold) continue;

    const alreadySent: string[] = sub.graceRemindersSent ?? [];
    if (alreadySent.includes(threshold)) continue;

    // Same atomic-claim pattern as above so concurrent cron runs can't both
    // pass the alreadySent check and both send the same threshold's reminder.
    const claimedReminder = await db.collection("subscriptions").findOneAndUpdate(
      { _id: sub._id, status: "past_due", graceRemindersSent: { $ne: threshold } },
      { $addToSet: { graceRemindersSent: threshold }, $set: { updatedAt: new Date().toISOString() } }
    );
    if (!claimedReminder) continue;

    await sendGracePeriodReminderEmail(sub.userId, sub.plan, daysLeft, sub.gracePeriodEndsAt).catch((err) =>
      console.error("[Grace Period Reminder Email Failed]", err)
    );
  }

  // Team seat deadlines (blueprint §23) — auto-remove members LIFO once an
  // over_limit team's owner-given deadline has passed.
  await enforceExpiredTeamSeatDeadlines(db);

  return NextResponse.json({ reconciled: corrected, graceExpired: graceExpiredCount });
}
