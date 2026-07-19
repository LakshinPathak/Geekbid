import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { razorpayRequest, isRazorpayConfigured } from "@/lib/razorpay";
import { handleDowngrade, enforceExpiredTeamSeatDeadlines } from "@/lib/plan-downgrade";
import { constantTimeEqual } from "@/lib/sanitize";

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

  for (const sub of expiredGrace) {
    await handleDowngrade(sub.userId, sub.plan, "free", "grace_period_expired", "cron", db);
    await db.collection("subscriptions").updateOne(
      { _id: sub._id },
      { $set: { status: "cancelled", updatedAt: now } }
    );
  }

  // Team seat deadlines (blueprint §23) — auto-remove members LIFO once an
  // over_limit team's owner-given deadline has passed.
  await enforceExpiredTeamSeatDeadlines(db);

  return NextResponse.json({ reconciled: corrected, graceExpired: expiredGrace.length });
}
