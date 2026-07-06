import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { trackedSend, wrapHtml, heading, subtext, highlight, ctaButton, infoCard } from "@/lib/email";
import { getPlanConfig } from "@/lib/plans";

const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function getUserContact(userId: string): Promise<{ email: string; name: string } | null> {
  const db = await getDb();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, fullName: 1, name: 1 } }
  );
  if (!user?.email) return null;
  return { email: user.email, name: user.fullName ?? user.name ?? "there" };
}

// 1. Subscription created — welcome + receipt (legally required in India/EU)
export async function sendSubscriptionWelcomeEmail(userId: string, plan: 'plus' | 'premium', amount: number) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const config = getPlanConfig(plan);
  const subject = `Welcome to GeekBid ${config.name}!`;
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "subscription_welcome", subject,
    idempotencyKey: `sub_welcome:${userId}:${plan}:${Date.now()}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading(`You're on ${config.name} now, ${contact.name}!`)}
      ${subtext(`Your subscription is active. You've been charged ${highlight(`$${amount.toFixed(2)}`)} for the first billing cycle.`)}
      ${infoCard([
        ["Plan", config.name],
        ["Jobs/month", String(config.limits.jobsPerMonth)],
        ["Bids/month", String(config.limits.bidsPerMonth)],
        ["Platform fee", `${config.platformFeePercent}%`],
      ])}
      ${ctaButton("Go to Dashboard →", `${APP_URL}/feed`)}
    `),
  });
}

// 2. Payment charged — monthly receipt (legally required in India/EU)
export async function sendPaymentReceiptEmail(userId: string, plan: 'plus' | 'premium', amount: number, periodEnd: string, razorpayPaymentId?: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const config = getPlanConfig(plan);
  const subject = `Your GeekBid ${config.name} receipt`;
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "payment_receipt", subject,
    idempotencyKey: `payment_receipt:${userId}:${razorpayPaymentId ?? periodEnd}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading("Payment received")}
      ${subtext(`Thanks, ${contact.name} — your ${config.name} plan renewed successfully.`)}
      ${infoCard([
        ["Amount charged", `$${amount.toFixed(2)}`],
        ["Plan", config.name],
        ["Next billing date", new Date(periodEnd).toLocaleDateString()],
        ...(razorpayPaymentId ? [["Payment ID", razorpayPaymentId] as [string, string]] : []),
      ])}
      ${ctaButton("View Billing →", `${APP_URL}/pricing`)}
    `),
  });
}

// 3. Payment failed — first-failure warning
export async function sendPaymentFailedWarningEmail(userId: string, plan: 'plus' | 'premium', gracePeriodEndsAt: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const config = getPlanConfig(plan);
  const subject = `Action needed: payment failed for your ${config.name} plan`;
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "payment_failed_warning", subject,
    idempotencyKey: `payment_failed:${userId}:${gracePeriodEndsAt}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading("We couldn't process your payment")}
      ${subtext(`Hi ${contact.name}, your last payment for ${highlight(config.name)} didn't go through. You still have full access for now.`)}
      ${subtext(`Please update your payment method before ${highlight(new Date(gracePeriodEndsAt).toLocaleDateString())} to avoid losing access.`)}
      ${ctaButton("Update Payment Method →", `${APP_URL}/pricing`)}
    `),
  });
}

// 4 & 5. Grace period warnings — 3 days left (urgency) and 1 day left (final)
export async function sendGracePeriodReminderEmail(userId: string, plan: 'plus' | 'premium', daysLeft: number, gracePeriodEndsAt: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const config = getPlanConfig(plan);
  const isFinal = daysLeft <= 1;
  const subject = isFinal
    ? `Final notice: your ${config.name} plan ends tomorrow`
    : `${daysLeft} days left to fix your ${config.name} billing`;
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: isFinal ? "grace_period_final" : "grace_period_warning", subject,
    idempotencyKey: `grace_period:${userId}:${daysLeft <= 1 ? "final" : "warning"}:${gracePeriodEndsAt}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading(isFinal ? "Last chance to keep your plan" : "Your payment still hasn't gone through")}
      ${subtext(`Hi ${contact.name}, ${isFinal
        ? `your ${config.name} access ends ${highlight("tomorrow")} unless payment succeeds.`
        : `you have ${highlight(`${daysLeft} days`)} left to update your payment method before you're downgraded to Free.`
      }`)}
      ${ctaButton("Update Payment Method →", `${APP_URL}/pricing`)}
    `),
  });
}

// 6, 7, 8. Plan change notifications — matches blueprint §16.1's
// sendPlanChangeEmail(userId, fromPlan, toPlan, reason) call signature exactly.
export async function sendPlanChangeEmail(
  userId: string,
  fromPlan: string,
  toPlan: string,
  reason: string
) {
  if (reason === "upgrade") return sendPlanUpgradedEmail(userId, fromPlan, toPlan);
  if (reason === "cancellation") return sendPlanCancelledEmail(userId, fromPlan);
  return sendPlanDowngradedEmail(userId, fromPlan, toPlan, reason);
}

export async function sendPlanUpgradedEmail(userId: string, fromPlan: string, toPlan: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const config = getPlanConfig(toPlan);
  const subject = `You're now on GeekBid ${config.name}!`;
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "plan_upgraded", subject,
    idempotencyKey: `plan_upgraded:${userId}:${fromPlan}:${toPlan}:${Date.now()}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading(`Welcome to ${config.name}, ${contact.name}!`)}
      ${subtext(`Your plan changed from ${highlight(fromPlan)} to ${highlight(config.name)}.`)}
      ${infoCard([
        ["Jobs/month", String(config.limits.jobsPerMonth)],
        ["Bids/month", String(config.limits.bidsPerMonth)],
        ["Team seats", String(config.limits.teamSeats)],
        ["Platform fee", `${config.platformFeePercent}%`],
      ])}
      ${ctaButton("Explore Your New Limits →", `${APP_URL}/pricing`)}
    `),
  });
}

export async function sendPlanDowngradedEmail(userId: string, fromPlan: string, toPlan: string, reason: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const config = getPlanConfig(toPlan);
  const subject = `Your GeekBid plan changed to ${config.name}`;
  const reasonText = reason === "renewal_failure"
    ? "your payment couldn't be processed after multiple attempts"
    : reason === "grace_period_expired"
    ? "your grace period ended without a successful payment"
    : "your subscription ended";
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "plan_downgraded", subject,
    idempotencyKey: `plan_downgraded:${userId}:${fromPlan}:${toPlan}:${Date.now()}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading(`You've been moved to ${config.name}`)}
      ${subtext(`Hi ${contact.name}, ${reasonText}, so your account moved from ${highlight(fromPlan)} to ${highlight(config.name)}.`)}
      ${subtext("Your existing jobs, bids, and data are all preserved — only new activity beyond the Free plan's limits is affected.")}
      ${ctaButton("Resubscribe →", `${APP_URL}/pricing`)}
    `),
  });
}

export async function sendPlanCancelledEmail(userId: string, fromPlan: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const subject = "Your GeekBid subscription has been cancelled";
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "plan_cancelled", subject,
    idempotencyKey: `plan_cancelled:${userId}:${fromPlan}:${Date.now()}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading("Subscription cancelled")}
      ${subtext(`Hi ${contact.name}, your ${highlight(fromPlan)} subscription has been cancelled as requested. You'll keep access until the end of your current billing period.`)}
      ${subtext("Changed your mind? You can resubscribe any time.")}
      ${ctaButton("Resubscribe →", `${APP_URL}/pricing`)}
    `),
  });
}

// 9. Win-back — resubscription invitation. Built here per the Phase 4.6
// checklist (9 templates); the 7-day-post-churn automation that calls this
// is Phase 5 scope (§12), not wired to a cron yet.
export async function sendWinBackEmail(userId: string, fromPlan: string) {
  const contact = await getUserContact(userId);
  if (!contact) return;
  const subject = "We miss you on GeekBid — come back?";
  await trackedSend({
    to: contact.email, recipientId: userId, emailType: "win_back", subject,
    idempotencyKey: `win_back:${userId}:${fromPlan}`, metadata: {},
    html: wrapHtml(subject, `
      ${heading(`Come back to ${fromPlan}, ${contact.name}?`)}
      ${subtext("It's been a week since your subscription ended. Resubscribe today and pick up right where you left off.")}
      ${ctaButton("View Plans →", `${APP_URL}/pricing`)}
    `),
  });
}
