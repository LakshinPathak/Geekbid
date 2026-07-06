import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { authenticateRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getPlanConfig, type PlanTier } from "@/lib/plans";
import { razorpayRequest, isRazorpayConfigured, RAZORPAY_KEY_ID, verifySubscriptionCheckoutSignature } from "@/lib/razorpay";
import { sendSubscriptionWelcomeEmail, sendPlanCancelledEmail } from "@/lib/billing-emails";

const RAZORPAY_PLAN_IDS: Record<'plus' | 'premium', string | undefined> = {
  plus: process.env.RAZORPAY_PLAN_ID_PLUS,
  premium: process.env.RAZORPAY_PLAN_ID_PREMIUM,
};

function isPaidTier(plan: unknown): plan is 'plus' | 'premium' {
  return plan === "plus" || plan === "premium";
}

// GET /api/subscriptions — current user's most recent subscription
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = await getDb();
    const sub = await db.collection("subscriptions")
      .find({ userId: auth.payload.userId })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();

    if (!sub) return NextResponse.json({ subscription: null });

    return NextResponse.json({
      subscription: { ...sub, _id: sub._id.toString(), id: sub._id.toString() },
    });
  } catch (err) {
    console.error("[Subscriptions GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
}

// POST /api/subscriptions — create a new subscription + checkout
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { plan } = await req.json();
    if (!isPaidTier(plan)) {
      return NextResponse.json({ error: "plan must be 'plus' or 'premium'" }, { status: 400 });
    }

    const db = await getDb();

    const existing = await db.collection("subscriptions").findOne({
      userId: auth.payload.userId,
      status: { $in: ["created", "active", "past_due"] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active subscription. Use the change-plan action instead." },
        { status: 409 }
      );
    }

    const planId = RAZORPAY_PLAN_IDS[plan];
    const now = new Date().toISOString();
    const config = getPlanConfig(plan);

    // Mock mode (no real Razorpay Plan configured yet): simulate an
    // immediately-active subscription so the rest of the app — quota resets,
    // plan badges, pricing page state — is testable before real Razorpay
    // Plans exist. Matches the existing api/payments/route.ts convention.
    if (!isRazorpayConfigured || !planId) {
      const razorpaySubscriptionId = `sub_mock_${Date.now()}`;
      const periodEnd = new Date(Date.now() + 30 * 24 * 3600000).toISOString();
      const subDoc = {
        userId: auth.payload.userId,
        plan,
        razorpaySubscriptionId,
        razorpayPlanId: planId ?? "plan_mock",
        status: "active" as const,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        pendingPlanChange: null as 'plus' | 'premium' | null,
        gracePeriodEndsAt: null as string | null,
        createdAt: now,
        updatedAt: now,
        lastWebhookEventId: null as string | null,
      };
      const result = await db.collection("subscriptions").insertOne(subDoc);
      await db.collection("users").updateOne(
        { _id: new ObjectId(auth.payload.userId) },
        { $set: { plan, subscriptionId: result.insertedId.toString(), planExpiresAt: periodEnd } }
      );
      await sendSubscriptionWelcomeEmail(auth.payload.userId, plan, config.price).catch((err) =>
        console.error("[Subscription Welcome Email Failed]", err)
      );

      return NextResponse.json(
        {
          mock: true,
          subscriptionId: razorpaySubscriptionId,
          subscription: { ...subDoc, _id: result.insertedId.toString(), id: result.insertedId.toString() },
        },
        { status: 201 }
      );
    }

    // Real mode: create the subscription via Razorpay; the frontend opens
    // Razorpay Checkout with `subscription_id` (not `order_id`). The user
    // doc/quotas are NOT updated here — that happens on the
    // subscription.activated webhook once payment actually succeeds.
    const razorpaySub = await razorpayRequest<{ id: string; status: string }>("/subscriptions", {
      method: "POST",
      body: {
        plan_id: planId,
        customer_notify: 1,
        total_count: 12,
        notes: { userId: auth.payload.userId, plan },
      },
    });

    const subDoc = {
      userId: auth.payload.userId,
      plan,
      razorpaySubscriptionId: razorpaySub.id,
      razorpayPlanId: planId,
      status: "created" as const,
      currentPeriodStart: now,
      currentPeriodEnd: now,
      cancelAtPeriodEnd: false,
      pendingPlanChange: null as 'plus' | 'premium' | null,
      gracePeriodEndsAt: null as string | null,
      createdAt: now,
      updatedAt: now,
      lastWebhookEventId: null as string | null,
    };
    const result = await db.collection("subscriptions").insertOne(subDoc);

    return NextResponse.json(
      {
        mock: false,
        subscriptionId: razorpaySub.id,
        key: RAZORPAY_KEY_ID,
        subscription: { ...subDoc, _id: result.insertedId.toString(), id: result.insertedId.toString() },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Subscriptions POST Error]", err);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

// PATCH /api/subscriptions — cancel, or change plan (applied at cycle end —
// "now" proration is Phase 5, per blueprint §21)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { action, newPlan, razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json();
    const db = await getDb();

    // Verifies the signature Razorpay Checkout hands the client after a real
    // subscription payment, before trusting that "success" claim — a
    // forged/tampered client callback must not be able to fake activation.
    // The actual plan flip still only ever happens via the
    // subscription.activated/charged webhook; this only confirms the
    // checkout response itself wasn't spoofed, so the frontend can show an
    // accurate confirmation instead of blindly trusting its own callback.
    if (action === "verify_checkout") {
      if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
        return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
      }
      const sub = await db.collection("subscriptions").findOne({
        userId: auth.payload.userId,
        razorpaySubscriptionId: razorpay_subscription_id,
      });
      if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

      const valid = verifySubscriptionCheckoutSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature);
      if (!valid) {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
      }

      await db.collection("subscriptions").updateOne(
        { _id: sub._id },
        { $set: { updatedAt: new Date().toISOString() } }
      );

      return NextResponse.json({ verified: true, status: sub.status });
    }

    const sub = await db.collection("subscriptions").findOne({
      userId: auth.payload.userId,
      status: { $in: ["created", "active", "past_due"] },
    });
    if (!sub) return NextResponse.json({ error: "No active subscription found" }, { status: 404 });

    const isMockSub = typeof sub.razorpaySubscriptionId === "string" && sub.razorpaySubscriptionId.startsWith("sub_mock_");

    if (action === "cancel") {
      if (isRazorpayConfigured && !isMockSub) {
        await razorpayRequest(`/subscriptions/${sub.razorpaySubscriptionId}/cancel`, {
          method: "POST",
          body: { cancel_at_cycle_end: 1 },
        }).catch((err) => console.error("[Razorpay Cancel Error]", err));
      }
      await db.collection("subscriptions").updateOne(
        { _id: sub._id },
        { $set: { cancelAtPeriodEnd: true, updatedAt: new Date().toISOString() } }
      );
      await sendPlanCancelledEmail(auth.payload.userId, sub.plan).catch((err) =>
        console.error("[Plan Cancelled Email Failed]", err)
      );
      return NextResponse.json({ ok: true, message: "Subscription will cancel at the end of the current billing period." });
    }

    if (action === "change_plan") {
      if (!isPaidTier(newPlan)) {
        return NextResponse.json({ error: "newPlan must be 'plus' or 'premium'" }, { status: 400 });
      }
      if (newPlan === sub.plan) {
        return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
      }

      if (isRazorpayConfigured && !isMockSub) {
        const newPlanId = RAZORPAY_PLAN_IDS[newPlan as PlanTier & ('plus' | 'premium')];
        await razorpayRequest(`/subscriptions/${sub.razorpaySubscriptionId}`, {
          method: "PATCH",
          body: { plan_id: newPlanId, schedule_change_at: "cycle_end" },
        }).catch((err) => console.error("[Razorpay Plan Change Error]", err));
      }

      await db.collection("subscriptions").updateOne(
        { _id: sub._id },
        { $set: { pendingPlanChange: newPlan, updatedAt: new Date().toISOString() } }
      );

      // Mock mode has no real billing cycle to wait for — apply immediately
      // so the change is actually testable without a webhook firing.
      if (isMockSub) {
        await db.collection("users").updateOne(
          { _id: new ObjectId(auth.payload.userId) },
          { $set: { plan: newPlan } }
        );
        await db.collection("subscriptions").updateOne(
          { _id: sub._id },
          { $set: { plan: newPlan, pendingPlanChange: null } }
        );
      }

      return NextResponse.json({
        ok: true,
        message: isMockSub
          ? `Plan changed to ${newPlan} (mock mode — applied immediately).`
          : `Plan change to ${newPlan} scheduled for the end of your current billing period.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Subscriptions PATCH Error]", err);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
