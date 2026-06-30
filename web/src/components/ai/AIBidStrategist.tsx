"use client";
import { useState } from "react";
import { Zap, Loader2, TrendingUp, Clock, Target, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/store";

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
  high: "text-[#4caf7d]",
  medium: "text-[#c9a84c]",
  low: "text-[#e57373]",
};

export default function AIBidStrategist({ job, currentPrice, competitorBids, onApplyBid }: Props) {
  const { currentUser } = useApp();
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!currentUser || currentUser.role !== "freelancer") return null;

  const isFreePlanLimited =
    !currentUser.plan || currentUser.plan === "free"
      ? (currentUser.planLimits?.aiBidUsesThisMonth ?? 0) >= 2
      : false;

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/bid-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[6px] border border-[rgba(201,168,76,0.22)] bg-[#0d1120] overflow-hidden">
      <button
        onClick={() => result ? setOpen(o => !o) : analyze()}
        disabled={loading || isFreePlanLimited}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(201,168,76,0.06)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#c9a84c]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          AI Bid Strategist
          {isFreePlanLimited && (
            <span className="text-[10px] font-normal text-[#a8997e] ml-1">(Free limit reached)</span>
          )}
        </span>
        {result && (open ? <ChevronUp className="h-4 w-4 text-[#a8997e]" /> : <ChevronDown className="h-4 w-4 text-[#a8997e]" />)}
      </button>

      {error && (
        <div className="px-4 pb-3 text-xs text-[#e57373]">{error}</div>
      )}

      {result && open && (
        <div className="border-t border-[rgba(201,168,76,0.12)] px-4 py-4 space-y-4">
          {/* Recommended bid */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Recommended Bid</p>
              <p className="font-heading text-2xl text-[#c9a84c]">${result.recommendedBid.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Win Probability</p>
              <p className={`font-heading text-xl ${CONFIDENCE_COLOR[result.confidence]}`}>
                {result.winProbability}%
              </p>
            </div>
          </div>

          {/* Rationale */}
          <p className="text-xs text-[#a8997e] leading-relaxed">{result.rationale}</p>

          {/* Timing */}
          <div className="flex items-center gap-2 text-xs text-[#f0e8d4]">
            <Clock className="h-3.5 w-3.5 text-[#c9a84c] shrink-0" />
            <span>{result.timing}</span>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Tips</p>
              {result.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#f0e8d4]">
                  <Target className="h-3.5 w-3.5 text-[#c9a84c] shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Apply button */}
          {onApplyBid && (
            <button
              onClick={() => onApplyBid(result.recommendedBid)}
              className="w-full py-2 rounded-[3px] text-sm font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Apply ${result.recommendedBid.toLocaleString()}
            </button>
          )}

          {/* Re-analyze */}
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full py-1.5 rounded-[3px] text-xs text-[#a8997e] border border-[rgba(201,168,76,0.22)] hover:border-[#c9a84c] transition-colors"
          >
            {loading ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>
      )}
    </div>
  );
}
