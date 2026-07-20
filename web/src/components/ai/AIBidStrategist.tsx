"use client";
import { useState } from "react";
import { Zap, Loader2, TrendingUp, Clock, Target, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { getPlanConfig } from "@/lib/plans";
import PlanLimitBanner from "@/components/PlanLimitBanner";

type StrategyResult = {
  recommendedBid: number;
  confidence: "high" | "medium" | "low";
  rationale: string;
  timing: string;
  winProbability: number;
  tips: string[];
};

type Props = {
  job: {
    _id?: string; id?: string; title: string; description?: string;
    skillsRequired: string[]; startingPrice: number; minimumPrice: number;
    estimatedHours?: number; category?: string;
  };
  currentPrice: number;
  competitorBids: Array<{ bidPrice: number }>;
  onApplyBid?: (amount: number) => void;
};

const CONFIDENCE_COLOR = {
  high: "text-[#4d7245]",
  medium: "text-[#4b3f8f]",
  low: "text-[#96543f]",
};

export default function AIBidStrategist({ job, currentPrice, competitorBids, onApplyBid }: Props) {
  const { currentUser, getValidToken, refreshCurrentUser } = useApp();
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!currentUser || currentUser.role !== "freelancer") return null;

  // Every tier has a monthly cap now, not just free — Plus/Premium just have
  // much higher ceilings.
  const planConfig = getPlanConfig(currentUser.plan);
  const aiBidLimit = planConfig.limits.aiBidStrategyPerMonth;
  const isPlanLimited = (currentUser.planLimits?.aiBidUsesThisMonth ?? 0) >= aiBidLimit;

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const res = await fetch("/api/ai/bid-strategy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          job,
          currentPrice,
          mySkills: currentUser?.skills ?? [],
          myGeekScore: currentUser?.geekScore ?? 0,
          competitorBids,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
      } else {
        setResult(data);
        setOpen(true);
        // Consumes the monthly aiBidStrategyPerMonth quota server-side —
        // refresh so isPlanLimited (read straight off currentUser.planLimits)
        // reflects it immediately instead of only after next login.
        refreshCurrentUser();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    if (isPlanLimited) {
      toast.error(`${planConfig.name} plan AI limit reached`, {
        description: `You've used all ${aiBidLimit} AI Bid Strategist calls this month.${planConfig.name === "Premium" ? "" : " Upgrade for more."}`,
      });
      return;
    }
    if (result) setOpen(o => !o);
    else analyze();
  }

  return (
    <div className="rounded-2xl border border-[rgba(75,63,143,0.22)] bg-[#ffffff] overflow-hidden">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(75,63,143,0.06)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isPlanLimited ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#4b3f8f]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          AI Bid Strategist
          {isPlanLimited && (
            <span className="text-[10px] font-normal text-[#6f6a7d] ml-1">({planConfig.name} limit reached)</span>
          )}
        </span>
        {result && (open ? <ChevronUp className="h-4 w-4 text-[#6f6a7d]" /> : <ChevronDown className="h-4 w-4 text-[#6f6a7d]" />)}
      </button>

      {error && (
        <div className="px-4 pb-3 text-xs text-[#96543f]">{error}</div>
      )}

      <div className="px-4 pb-3">
        <PlanLimitBanner
          used={currentUser.planLimits?.aiBidUsesThisMonth ?? 0}
          limit={aiBidLimit}
          label="AI bid analyses"
          planName={planConfig.name}
        />
      </div>

      {result && open && (
        <div className="border-t border-[rgba(75,63,143,0.12)] px-4 py-4 space-y-4">
          {/* Recommended bid */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider">Recommended Bid</p>
              <p className="font-heading text-2xl text-[#4b3f8f]">${result.recommendedBid.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider">Win Probability</p>
              <p className={`font-heading text-xl ${CONFIDENCE_COLOR[result.confidence]}`}>
                {result.winProbability}%
              </p>
            </div>
          </div>

          {/* Rationale */}
          <p className="text-xs text-[#6f6a7d] leading-relaxed">{result.rationale}</p>

          {/* Timing */}
          <div className="flex items-center gap-2 text-xs text-[#3d3a45]">
            <Clock className="h-3.5 w-3.5 text-[#4b3f8f] shrink-0" />
            <span>{result.timing}</span>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider">Tips</p>
              {result.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#3d3a45]">
                  <Target className="h-3.5 w-3.5 text-[#4b3f8f] shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Apply button */}
          {onApplyBid && (
            <button
              onClick={() => onApplyBid(result.recommendedBid)}
              className="w-full py-2 rounded-full text-sm font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Apply ${result.recommendedBid.toLocaleString()}
            </button>
          )}

          {/* Re-analyze */}
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full py-1.5 rounded-full text-xs text-[#6f6a7d] border border-[rgba(75,63,143,0.22)] hover:border-[#4b3f8f] transition-colors"
          >
            {loading ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>
      )}
    </div>
  );
}
