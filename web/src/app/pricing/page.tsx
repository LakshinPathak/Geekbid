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
    <div className="min-h-screen bg-[#080b14] grid-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gradient">Simple, Transparent Pricing</h1>
          <p className="text-[#a8997e] text-sm mt-2">Choose the plan that fits your needs. Upgrade anytime.</p>
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="max-w-lg mx-auto mb-8 text-center text-sm text-[#c9a84c] bg-[#c9a84c]/10 border border-[rgba(201,168,76,0.3)] rounded-[6px] py-2.5 px-4">
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
                  plan.highlight ? "border-[rgba(201,168,76,0.35)]/60 glow-border" : ""
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {plan.highlight && (
                  <span className="bg-[#c9a84c] text-[#050810] text-[11px] font-bold px-3 py-1 rounded-full self-start mb-4">
                    MOST POPULAR
                  </span>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <plan.icon className={`h-5 w-5 ${plan.highlight ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
                  <h2 className="font-heading text-xl font-bold text-[#f0e8d4]">{plan.name}</h2>
                </div>
                <div className="mb-6">
                  <span className="font-heading text-4xl font-bold text-[#f0e8d4]">{plan.price}</span>
                  <span className="text-[#a8997e] text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#a8997e]">
                      <Check className="h-4 w-4 text-[#c9a84c] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {plan.value === "free" ? (
                  isCurrent ? (
                    <button disabled className="w-full py-3 rounded-[6px] font-semibold text-sm bg-[#111625] text-[#a8997e] cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={cancelSubscription}
                      disabled={processingPlan === "cancel" || subscription?.cancelAtPeriodEnd}
                      className="w-full py-3 rounded-[6px] font-semibold text-sm btn-ghost disabled:opacity-50"
                    >
                      {processingPlan === "cancel" ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                      {subscription?.cancelAtPeriodEnd ? "Cancellation Scheduled" : "Downgrade to Free"}
                    </button>
                  )
                ) : isCurrent ? (
                  <button disabled className="w-full py-3 rounded-[6px] font-semibold text-sm bg-[#111625] text-[#a8997e] cursor-not-allowed">
                    Current Plan
                  </button>
                ) : PLAN_ORDER[plan.value] < PLAN_ORDER[currentPlan] ? (
                  // No prorated downgrade-between-paid-tiers flow exists yet —
                  // only "cancel to Free" (above). Routing this through the
                  // same checkout as an upgrade would create a second paid
                  // subscription instead of actually downgrading, so disable
                  // it here rather than let it silently double-charge.
                  <button disabled title="Cancel to Free first, then re-subscribe to this plan" className="w-full py-3 rounded-[6px] font-semibold text-sm bg-[#111625] text-[#a8997e] cursor-not-allowed">
                    Downgrade unavailable
                  </button>
                ) : (
                  <button
                    onClick={() => startCheckout(plan.value)}
                    disabled={!!processingPlan}
                    className={`w-full py-3 rounded-[6px] font-semibold text-sm transition-all disabled:opacity-50 ${
                      plan.highlight ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
                    {isProcessing ? "Processing..." : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link href="/feed" className="text-[#a8997e] text-sm hover:text-[#c9a84c] transition-colors">
            Back to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
