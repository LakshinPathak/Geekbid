"use client";
import { useApp } from "@/lib/store";
import { Check, Zap, Building2, Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { PLANS as PLAN_CONFIG } from "@/lib/plans";
import { useSubscriptionCheckout } from "@/lib/useSubscriptionCheckout";
import ReferencePageShell from "@/components/ReferencePageShell";
import { useInView } from "@/components/landing/hooks";

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
  const header = useInView(0.3);
  const cards = useInView(0.15);

  return (
    <ReferencePageShell>
      <div className="relative">
        {/* Ambient wash — same soft breathing glow Compare and FAQ use,
            so all three reference pages share one visual signature
            instead of Pricing being the flat one of the three. */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#5b21b6]/[0.04] rounded-full blur-[140px] pointer-events-none animate-breathe" aria-hidden="true" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
          <div
            ref={header.ref}
            className="text-center mb-12"
            style={{
              opacity: header.inView ? 1 : 0,
              transform: header.inView ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.7s ease, transform 0.7s ease",
            }}
          >
            <p className="landing-label text-[#5b21b6] mb-3">Pricing</p>
            <h1 className="landing-header-glow landing-h2 text-3xl sm:text-4xl text-[#17171f]">Simple, transparent pricing</h1>
            <p className="landing-subhead text-[#46424e] text-sm sm:text-base mt-3">Choose the plan that fits your needs. Upgrade anytime.</p>
          </div>

          {subscription?.cancelAtPeriodEnd && (
            <div className="max-w-lg mx-auto mb-8 text-center text-sm text-[#5b21b6] bg-[#5b21b6]/10 border border-[rgba(91,33,182,0.3)] rounded-2xl py-2.5 px-4">
              Your {subscription.plan} plan is cancelled and will end at the close of the current billing period.
            </div>
          )}

          <div ref={cards.ref} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-start">
          {DISPLAY_PLANS.map((plan, idx) => {
            const isCurrent = currentPlan === plan.value;
            const isProcessing = processingPlan === plan.value;
            return (
              <div
                key={plan.value}
                className={`glass-panel p-6 flex flex-col transition-[transform,box-shadow,opacity] duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(91,33,182,0.25)] ${
                  plan.highlight ? "md:-translate-y-3 border-[rgba(91,33,182,0.35)]/60" : ""
                }`}
                style={{
                  opacity: cards.inView ? 1 : 0,
                  transform: cards.inView
                    ? plan.highlight ? "translateY(-12px)" : "translateY(0)"
                    : "translateY(28px)",
                  transitionDelay: cards.inView ? `${idx * 100}ms` : "0ms",
                  boxShadow: plan.highlight ? "0 0 60px rgba(91,33,182,0.12)" : undefined,
                }}
              >
                {plan.highlight && (
                  <span className="landing-label inline-flex items-center gap-1.5 bg-[#5b21b6] text-[#ffffff] px-3 py-1 rounded-full self-start mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                    Most Popular
                  </span>
                )}
                <div className="flex items-center gap-2.5 mb-4">
                  <span className={`flex items-center justify-center h-9 w-9 rounded-full ${plan.highlight ? "bg-[#5b21b6] text-white" : "bg-[#f4f2ee] text-[#46424e]"}`}>
                    <plan.icon className="h-4 w-4" />
                  </span>
                  <h2 className="landing-card-title text-xl text-[#17171f]">{plan.name}</h2>
                </div>
                <div className="mb-6">
                  <span className="landing-num text-4xl text-[#17171f]">{plan.price}</span>
                  <span className="text-[#46424e] text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#46424e]">
                      <Check className="h-4 w-4 text-[#5b21b6] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                {plan.value === "free" ? (
                  isCurrent ? (
                    <button disabled className="w-full py-3 rounded-full font-semibold text-sm bg-[#f4f2ee] text-[#46424e] cursor-not-allowed">
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
                  <button disabled className="w-full py-3 rounded-full font-semibold text-sm bg-[#f4f2ee] text-[#46424e] cursor-not-allowed">
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
                  <button disabled title="Cancel to Free first, then re-subscribe to this plan" className="w-full py-3 rounded-full font-semibold text-sm bg-[#f4f2ee] text-[#46424e] cursor-not-allowed">
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
            <Link href="/feed" className="text-[#46424e] text-sm hover:text-[#5b21b6] transition-colors">
              Back to Feed
            </Link>
          </div>
        </div>
      </div>
    </ReferencePageShell>
  );
}
