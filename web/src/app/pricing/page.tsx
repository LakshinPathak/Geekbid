"use client";
import { useApp } from "@/lib/store";
import { Check, Zap, Building2, Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { PLANS as PLAN_CONFIG } from "@/lib/plans";
import { useSubscriptionCheckout } from "@/lib/useSubscriptionCheckout";

const DISPLAY_PLANS = [
  {
    name: PLAN_CONFIG.free.name,
    price: `$${PLAN_CONFIG.free.price}`,
    period: "forever",
    icon: Zap,
    features: [
      `${PLAN_CONFIG.free.limits.jobsPerMonth} job posts/month`,
      `${PLAN_CONFIG.free.limits.bidsPerMonth} bids/month`,
      "Basic profile",
      "Standard search ranking",
      `${PLAN_CONFIG.free.platformFeePercent}% platform fee`,
    ],
    cta: "Current Plan",
    highlight: false,
    value: "free" as const,
  },
  {
    name: PLAN_CONFIG.plus.name,
    price: `$${PLAN_CONFIG.plus.price}`,
    period: "/month",
    icon: Crown,
    features: [
      `${PLAN_CONFIG.plus.limits.jobsPerMonth} job posts/month`,
      `${PLAN_CONFIG.plus.limits.bidsPerMonth} bids/month`,
      "Priority in search",
      "Featured profile badge",
      `${PLAN_CONFIG.plus.limits.featuredBoostsPerMonth} featured boosts/month`,
      `${PLAN_CONFIG.plus.platformFeePercent}% platform fee`,
      "API access",
      "Advanced analytics",
    ],
    cta: "Upgrade to Plus",
    highlight: true,
    value: "plus" as const,
  },
  {
    name: PLAN_CONFIG.premium.name,
    price: `$${PLAN_CONFIG.premium.price}`,
    period: "/month",
    icon: Building2,
    features: [
      `Everything in ${PLAN_CONFIG.plus.name}`,
      `Team seats (up to ${PLAN_CONFIG.premium.limits.teamSeats})`,
      `${PLAN_CONFIG.premium.apiRateLimit} req/min API access`,
      "Dedicated support",
      `${PLAN_CONFIG.premium.platformFeePercent}% platform fee`,
      "Custom integrations",
    ],
    // Self-serve for both paid tiers (blueprint Open Decision D, resolved
    // per the Phase 4.8 checklist's default assumption) — not a "talk to a
    // human" flow.
    cta: "Upgrade to Premium",
    highlight: false,
    value: "premium" as const,
  },
];

const PLAN_ORDER: Record<string, number> = { free: 0, plus: 1, premium: 2 };

export default function PricingPage() {
  const { currentUser } = useApp();
  const currentPlan = currentUser?.plan ?? "free";
  const { subscription, processingPlan, startCheckout, cancelSubscription } = useSubscriptionCheckout();

  return (
    <div className="min-h-screen bg-[#fbfaf7] grid-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gradient">Simple, Transparent Pricing</h1>
          <p className="text-[#6f6a7d] text-sm mt-2">Choose the plan that fits your needs. Upgrade anytime.</p>
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="max-w-lg mx-auto mb-8 text-center text-sm text-[#4b3f8f] bg-[#4b3f8f]/10 border border-[rgba(75,63,143,0.3)] rounded-2xl py-2.5 px-4">
            Your {subscription.plan} plan is cancelled and will end at the close of the current billing period.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DISPLAY_PLANS.map((plan, idx) => {
            const isCurrent = currentPlan === plan.value;
            const isProcessing = processingPlan === plan.value;
            return (
              <div
                key={plan.value}
                className={`glass-panel p-6 flex flex-col animate-fade-in-up ${
                  plan.highlight ? "border-[rgba(75,63,143,0.35)]/60 glow-border" : ""
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {plan.highlight && (
                  <span className="bg-[#4b3f8f] text-[#ffffff] text-[11px] font-bold px-3 py-1 rounded-full self-start mb-4">
                    MOST POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <plan.icon className={`h-5 w-5 ${plan.highlight ? "text-[#4b3f8f]" : "text-[#6f6a7d]"}`} />
                  <h2 className="font-heading text-xl font-bold text-[#3d3a45]">{plan.name}</h2>
                </div>
                <div className="mb-6">
                  <span className="font-heading text-4xl font-bold text-[#3d3a45]">{plan.price}</span>
                  <span className="text-[#6f6a7d] text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#6f6a7d]">
                      <Check className="h-4 w-4 text-[#4b3f8f] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {plan.value === "free" ? (
                  isCurrent ? (
                    <button disabled className="w-full py-3 rounded-full font-semibold text-sm bg-[#f4f2ee] text-[#6f6a7d] cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={cancelSubscription}
                      disabled={processingPlan === "cancel" || subscription?.cancelAtPeriodEnd}
                      className="w-full py-3 rounded-full font-semibold text-sm btn-ghost disabled:opacity-50"
                    >
                      {processingPlan === "cancel" ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                      {subscription?.cancelAtPeriodEnd ? "Cancellation Scheduled" : "Downgrade to Free"}
                    </button>
                  )
                ) : isCurrent ? (
                  <button disabled className="w-full py-3 rounded-full font-semibold text-sm bg-[#f4f2ee] text-[#6f6a7d] cursor-not-allowed">
                    Current Plan
                  </button>
                ) : PLAN_ORDER[plan.value] < PLAN_ORDER[currentPlan] && !subscription ? (
                  // startCheckout() already handles downgrading correctly via
                  // PATCH /api/subscriptions {action:"change_plan"} whenever a
                  // tracked `subscription` record exists (schedules the change
                  // at cycle-end for a real Razorpay sub, applies immediately
                  // in mock mode) — so only block the one case that's actually
                  // broken: currentUser.plan was set without ever creating a
                  // subscription record (e.g. an admin plan override), where
                  // there's nothing for change_plan to act on and the button
                  // would otherwise fall through to a brand-new paid checkout.
                  <button disabled title="Cancel to Free first, then re-subscribe to this plan" className="w-full py-3 rounded-full font-semibold text-sm bg-[#f4f2ee] text-[#6f6a7d] cursor-not-allowed">
                    Downgrade unavailable
                  </button>
                ) : (
                  <button
                    onClick={() => startCheckout(plan.value)}
                    disabled={!!processingPlan}
                    className={`w-full py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-50 ${
                      plan.highlight ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                    {isProcessing
                      ? "Processing..."
                      : PLAN_ORDER[plan.value] < PLAN_ORDER[currentPlan]
                        ? `Downgrade to ${plan.name}`
                        : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link href="/feed" className="text-[#6f6a7d] text-sm hover:text-[#4b3f8f] transition-colors">
            Back to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
