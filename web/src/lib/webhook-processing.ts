import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { handleDowngrade } from "@/lib/plan-downgrade";
import { getPlanConfig } from "@/lib/plans";
import {
  sendSubscriptionWelcomeEmail,
  sendPaymentReceiptEmail,
  sendPaymentFailedWarningEmail,
  sendPlanUpgradedEmail,
  sendPlanDowngradedEmail,
} from "@/lib/billing-emails";

const GRACE_PERIOD_DAYS = 7;

// Razorpay webhook payloads carry the subscription entity directly for
// subscription.* events; for payment.* events tied to a subscription, the
// subscription id instead hangs off the payment entity's `subscription_id`.
function extractSubscriptionId(payload: Record<string, unknown>): string | null {
  const p = payload?.payload as Record<string, unknown> | undefined;
  const subEntity = (p?.subscription as { entity?: { id?: string } } | undefined)?.entity;
  if (subEntity?.id) return subEntity.id;
  const paymentEntity = (p?.payment as { entity?: { subscription_id?: string } } | undefined)?.entity;
  return paymentEntity?.subscription_id ?? null;
}

async function handleActivated(subId: string, db: Db) {
  // Same stale-event guard as handleCharged/handleHalted/handleCancelled — a
  // retried/replayed subscription.activated event (e.g. the retry-webhooks
  // cron sweeping an old 'failed' delivery, or Razorpay's own redelivery
  // arriving after the user already cancelled) must not resurrect an
  // already-cancelled subscription back to "active" and flip the user's
  // plan back to paid. Filtering status out of the update itself (rather
  // than a separate findOne-then-check) keeps the guard atomic.
  const sub = await db.collection("subscriptions").findOneAndUpdate(
    { razorpaySubscriptionId: subId, status: { $ne: "cancelled" } },
    { $set: { status: "active", updatedAt: new Date().toISOString() } },
    { returnDocument: "after" }
  );
  if (!sub) return;

  await db.collection("users").updateOne(
    { _id: new ObjectId(sub.userId) },
    { $set: { plan: sub.plan, subscriptionId: sub._id.toString() } }
  );

  // Real (non-mock) subscriptions previously never got the welcome/receipt
  // email — sendSubscriptionWelcomeEmail was only ever called from the mock
  // branch of POST /api/subscriptions. This is the real activation path
  // (subscription.activated webhook), so send it here too — it's legally
  // required in India/EU per the function's own doc comment.
  const config = getPlanConfig(sub.plan);
  await sendSubscriptionWelcomeEmail(sub.userId, sub.plan, config.price, sub._id.toString()).catch((err) =>
    console.error("[Subscription Welcome Email Failed]", err)
  );
}

async function handleCharged(subId: string, payload: Record<string, unknown>, db: Db) {
  const p = payload?.payload as Record<string, unknown> | undefined;
  const subEntity = (p?.subscription as { entity?: { current_start?: number; current_end?: number } } | undefined)?.entity;
  const paymentEntity = (p?.payment as { entity?: { amount?: number } } | undefined)?.entity;
  const now = new Date().toISOString();

  const currentPeriodStart = subEntity?.current_start
    ? new Date(subEntity.current_start * 1000).toISOString()
    : now;
  const currentPeriodEnd = subEntity?.current_end
    ? new Date(subEntity.current_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 3600000).toISOString();

  const existingSub = await db.collection("subscriptions").findOne({ razorpaySubscriptionId: subId });
  if (!existingSub) return;
  // Same stale-event guard as handleHalted/handleCancelled — a retried/replayed
  // subscription.charged event (e.g. the retry-webhooks cron sweeping an old
  // 'failed' delivery) must not resurrect a subscription that's already been
  // cancelled since this event was first attempted.
  if (existingSub.status === "cancelled") {
    console.log(`[Charged] Skipping stale event for already-cancelled subscription ${subId}`);
    return;
  }

  // Transition #12/#11: a plan change scheduled for cycle-end applies on the
  // renewal charge, not immediately when the user requested it.
  const appliedPlan = existingSub.pendingPlanChange ?? existingSub.plan;
  const planChanged = appliedPlan !== existingSub.plan;

  await db.collection("subscriptions").updateOne(
    { razorpaySubscriptionId: subId },
    {
      $set: {
        status: "active",
        plan: appliedPlan,
        pendingPlanChange: null,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: now,
      },
    }
  );

  await db.collection("users").updateOne(
    { _id: new ObjectId(existingSub.userId) },
    {
      $set: {
        plan: appliedPlan,
        planExpiresAt: currentPeriodEnd,
        // Reset ALL quota counters for the new billing period (blueprint §15) —
        // paying users' quotas are tied to their billing cycle, not the
        // calendar-month lazy-reset free users use.
        "planLimits.jobsPostedThisMonth": 0,
        "planLimits.bidsPlacedThisMonth": 0,
        "planLimits.aiUsesThisMonth": 0,
        "planLimits.aiBidUsesThisMonth": 0,
        "planLimits.featuredBoostsUsedThisMonth": 0,
        "planLimits.invitesSentThisMonth": 0,
        "planLimits.monthResetAt": now,
        "planLimits.aiMonthResetAt": now,
        "planLimits.aiBidMonthResetAt": now,
      },
    }
  );

  const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;
  await sendPaymentReceiptEmail(existingSub.userId, appliedPlan, amount, currentPeriodEnd).catch((err) =>
    console.error("[Payment Receipt Email Failed]", err)
  );

  if (planChanged) {
    const isUpgrade = appliedPlan === "premium" && existingSub.plan === "plus";
    // Stable per (subscription, billing cycle) so a retried/replayed charged
    // event dedupes against trackedSend instead of re-sending the same plan
    // change email on every retry.
    const contextId = `${existingSub._id.toString()}:${currentPeriodStart}`;
    const emailPromise = isUpgrade
      ? sendPlanUpgradedEmail(existingSub.userId, existingSub.plan, appliedPlan, contextId)
      : sendPlanDowngradedEmail(existingSub.userId, existingSub.plan, appliedPlan, "scheduled_plan_change", contextId);
    await emailPromise.catch((err) => console.error("[Plan Change Email Failed]", err));
  }
}

async function handlePaymentFailed(subId: string | null, db: Db) {
  if (!subId) return;
  const now = new Date().toISOString();
  const gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 3600000).toISOString();

  // Same stale-event guard as handleHalted/handleCancelled — a retried/
  // replayed payment.failed event must not knock an already-cancelled
  // subscription back into past_due.
  const existingSub = await db.collection("subscriptions").findOne({ razorpaySubscriptionId: subId });
  if (!existingSub) return;
  if (existingSub.status === "cancelled") {
    console.log(`[Payment Failed] Skipping stale event for already-cancelled subscription ${subId}`);
    return;
  }

  const sub = await db.collection("subscriptions").findOneAndUpdate(
    { razorpaySubscriptionId: subId },
    { $set: { status: "past_due", gracePeriodEndsAt, updatedAt: now } },
    { returnDocument: "after" }
  );
  if (!sub) return;

  await sendPaymentFailedWarningEmail(sub.userId, sub.plan, gracePeriodEndsAt).catch((err) =>
    console.error("[Payment Failed Warning Email Failed]", err)
  );
}

async function handlePaymentCaptured(subId: string | null, payload: Record<string, unknown>, db: Db) {
  if (!subId) return;
  const sub = await db.collection("subscriptions").findOne({ razorpaySubscriptionId: subId });
  if (!sub) return;

  // Only past_due -> active is this handler's job (transition #5); a captured
  // payment on an already-active subscription is handled by
  // subscription.charged, not this event, so no-op here to avoid double
  // quota resets.
  if (sub.status !== "past_due") return;

  await db.collection("subscriptions").updateOne(
    { _id: sub._id },
    { $set: { status: "active", gracePeriodEndsAt: null, updatedAt: new Date().toISOString() } }
  );

  const p = payload?.payload as Record<string, unknown> | undefined;
  const paymentEntity = (p?.payment as { entity?: { amount?: number } } | undefined)?.entity;
  const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;
  await sendPaymentReceiptEmail(sub.userId, sub.plan, amount, sub.currentPeriodEnd).catch((err) =>
    console.error("[Payment Recovery Receipt Email Failed]", err)
  );
}

async function handleHalted(subId: string, db: Db) {
  // Atomic check-and-claim, not findOne-then-updateOne: subscription.halted
  // and subscription.cancelled are distinct events (different eventIds), so
  // the webhook route's per-event dedup claim doesn't stop them racing each
  // other for the *same subscription* (e.g. one delivered live while the
  // other is being swept by the retry-webhooks cron). A separate check then
  // write left a window where both handlers could read status "active"
  // before either wrote "cancelled" — double-running handleDowngrade
  // (duplicate plan_change_log rows, duplicate downgrade emails). Filtering
  // status out of the update itself makes only one of the racers win.
  const sub = await db.collection("subscriptions").findOneAndUpdate(
    { razorpaySubscriptionId: subId, status: { $ne: "cancelled" } },
    { $set: { status: "cancelled", updatedAt: new Date().toISOString() } }
  );
  if (!sub) return;
  await handleDowngrade(sub.userId, sub.plan, "free", "subscription_halted", "webhook", db);
}

async function handleCancelled(subId: string, db: Db) {
  // Same atomic claim as handleHalted above, for the same reason.
  const sub = await db.collection("subscriptions").findOneAndUpdate(
    { razorpaySubscriptionId: subId, status: { $ne: "cancelled" } },
    { $set: { status: "cancelled", updatedAt: new Date().toISOString() } }
  );
  if (!sub) return;
  await handleDowngrade(sub.userId, sub.plan, "free", "cancellation", "webhook", db);
}

// Shared by POST /api/webhooks/razorpay (live delivery) and
// /api/cron/retry-webhooks (sweeps events stuck in 'failed').
export async function processWebhookEvent(payload: Record<string, unknown>, db: Db) {
  const eventType = payload.event as string;
  const subId = extractSubscriptionId(payload);

  switch (eventType) {
    case "subscription.activated":
      if (subId) await handleActivated(subId, db);
      return;
    case "subscription.charged":
      if (subId) await handleCharged(subId, payload, db);
      return;
    case "subscription.halted":
      if (subId) await handleHalted(subId, db);
      return;
    case "subscription.cancelled":
      if (subId) await handleCancelled(subId, db);
      return;
    case "payment.failed":
      await handlePaymentFailed(subId, db);
      return;
    case "payment.captured":
      await handlePaymentCaptured(subId, payload, db);
      return;
    default:
      console.log(`[Razorpay Webhook] Unhandled event type: ${eventType}`);
  }
}
