"use client";
import Link from "next/link";
import { Crown, Zap, Building2, ArrowUpRight, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { useSubscriptionCheckout } from "@/lib/useSubscriptionCheckout";

const TIER_ICON = { free: Zap, plus: Crown, premium: Building2 } as const;

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const isUnlimited = !Number.isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, limit > 0 ? (used / limit) * 100 : 100);
  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between text-[10px] text-[#46424e] mb-1">
        <span>{label}</span>
        <span>{isUnlimited ? `${used} used` : `${used}/${limit}`}</span>
      </div>
      <div className="h-1 rounded-full bg-[#f4f2ee] overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-[#96543f]" : "bg-[#4b3f8f]"}`}
          style={{ width: isUnlimited ? "8%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Compact subscription status card for the feed dashboards. Deliberately
// Upgrade-only — downgrading/cancelling stays a /pricing-page-only action so
// this widget can't be mistaken for a one-click "quit" button.
export default function SubscriptionWidget() {
  const { getUserPlanConfig, planUsage } = useApp();
  const { processingPlan, startCheckout } = useSubscriptionCheckout();
  const config = getUserPlanConfig();
  const tier = (Object.keys(TIER_ICON) as Array<keyof typeof TIER_ICON>).find(
    (t) => t === (config.name.toLowerCase() as keyof typeof TIER_ICON)
  ) ?? "free";
  const Icon = TIER_ICON[tier];
  const nextTier: 'plus' | 'premium' | null = tier === "free" ? "plus" : tier === "plus" ? "premium" : null;

  return (
    <div className="glass-panel-sm rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex items-center gap-3 shrink-0">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${tier === "free" ? "bg-[#f4f2ee]" : "bg-[#4b3f8f]/12"}`}>
          <Icon className={`h-4 w-4 ${tier === "free" ? "text-[#46424e]" : "text-[#4b3f8f]"}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#3d3a45]">{config.name} plan</p>
          <p className="text-[11px] text-[#46424e]">
            ${config.price}{config.price > 0 ? "/mo" : ""} · {config.platformFeePercent}% platform fee
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5 overflow-x-auto">
        <UsageBar label="Jobs" used={planUsage.jobsPostedThisMonth} limit={config.limits.jobsPerMonth} />
        <UsageBar label="Bids" used={planUsage.bidsPlacedThisMonth} limit={config.limits.bidsPerMonth} />
        <UsageBar label="AI" used={planUsage.aiUsesThisMonth} limit={config.limits.aiGeneralPerMonth} />
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link href="/pricing" className="text-[11px] text-[#46424e] hover:text-[#3d3a45] transition-colors whitespace-nowrap">
          Manage subscription
        </Link>
        {nextTier && (
          <button
            onClick={() => startCheckout(nextTier)}
            disabled={!!processingPlan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#4b3f8f] text-[#ffffff] text-xs font-semibold hover:bg-[#3d3373] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {processingPlan === nextTier ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
            Upgrade to {nextTier === "plus" ? "Plus" : "Premium"}
          </button>
        )}
      </div>
    </div>
  );
}
