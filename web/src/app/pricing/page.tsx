"use client";
import { useApp } from "@/lib/store";
import { Check, Zap, Building2, Crown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { PLANS as PLAN_CONFIG } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: Record<string, string>) => void) => void;
    };
  }
}

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

type SubscriptionInfo = {
  plan: 'plus' | 'premium';
  status: string;
  cancelAtPeriodEnd: boolean;
} | null;

export default function PricingPage() {
  const { currentUser, auth } = useApp();
  const currentPlan = currentUser?.plan ?? "free";
  const [subscription, setSubscription] = useState<SubscriptionInfo>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => console.warn("Razorpay script failed to load (mock mode will work)");
      document.body.appendChild(script);
    } else if (typeof window !== "undefined" && window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  const loadSubscription = useCallback(async () => {
    if (!auth.accessToken) return;
    const res = await fetch("/api/subscriptions", {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.subscription && ["created", "active", "past_due"].includes(data.subscription.status)) {
        setSubscription(data.subscription);
      } else {
        setSubscription(null);
      }
    }
  }, [auth.accessToken]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const startCheckout = useCallback(async (targetPlan: 'plus' | 'premium') => {
    setProcessingPlan(targetPlan);
    try {
      // Already on a different paid plan — this is a plan change, not a new subscription.
      if (subscription) {
        const res = await fetch("/api/subscriptions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
          body: JSON.stringify({ action: "change_plan", newPlan: targetPlan }),
        });
        const data = await res.json();
        if (data.error) { toast.error(data.error); setProcessingPlan(null); return; }
        toast.success(data.message ?? "Plan change requested");
        await loadSubscription();
        setProcessingPlan(null);
        return;
      }

      const orderRes = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const orderData = await orderRes.json();
      if (orderData.error) { toast.error(orderData.error); setProcessingPlan(null); return; }

      if (orderData.mock) {
        toast.success(`You're now on ${targetPlan === "plus" ? "Plus" : "Premium"}!`);
        await loadSubscription();
        setProcessingPlan(null);
        return;
      }

      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Payment provider failed to load. Please refresh and try again.");
        setProcessingPlan(null);
        return;
      }

      const options = {
        key: orderData.key,
        subscription_id: orderData.subscriptionId,
        name: "GeekBid",
        description: `${targetPlan === "plus" ? "Plus" : "Premium"} subscription`,
        prefill: { name: currentUser?.fullName || "", email: currentUser?.email || "" },
        theme: { color: "#c9a84c" },
        handler: async () => {
          toast.success("Subscription created! Activating your plan...");
          await loadSubscription();
          setProcessingPlan(null);
        },
        modal: { ondismiss: () => setProcessingPlan(null) },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("An unexpected error occurred");
      setProcessingPlan(null);
    }
  }, [subscription, auth.accessToken, scriptLoaded, currentUser, loadSubscription]);

  const cancelSubscription = useCallback(async () => {
    setProcessingPlan("cancel");
    const res = await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    if (data.error) toast.error(data.error);
    else { toast.success(data.message ?? "Subscription cancelled"); await loadSubscription(); }
    setProcessingPlan(null);
  }, [auth.accessToken, loadSubscription]);

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
