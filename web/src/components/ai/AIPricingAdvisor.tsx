"use client";
import { useState } from "react";
import { DollarSign, Loader2, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/store";

type PricingResult = {
  recommendedStartingPrice: number;
  recommendedFloorPrice: number;
  marketRate: number;
  rationale: string;
  pricingStrategy: string;
  expectedBids: number;
  tips: string[];
};

type RecentJob = { title: string; startingPrice: number; minimumPrice: number; bidCount?: number };

type Props = {
  title: string;
  skills: string[];
  category?: string;
  estimatedHours?: number;
  recentJobs?: RecentJob[];
  onApply?: (startingPrice: number, floorPrice: number) => void;
};

const STRATEGY_COLOR: Record<string, string> = {
  aggressive: "text-[#e57373]",
  balanced: "text-[#c9a84c]",
  premium: "text-[#4caf7d]",
};

export default function AIPricingAdvisor({ title, skills, category, estimatedHours, recentJobs, onApply }: Props) {
  const { auth } = useApp();
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!title || title.trim().length < 5) return null;

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/pricing-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ title, skills, category, estimatedHours, recentJobs }),
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
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(201,168,76,0.06)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#c9a84c]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          AI Pricing Advisor
        </span>
        {result && (open ? <ChevronUp className="h-3.5 w-3.5 text-[#a8997e]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#a8997e]" />)}
      </button>

      {error && <div className="px-4 pb-3 text-xs text-[#e57373]">{error}</div>}

      {result && open && (
        <div className="border-t border-[rgba(201,168,76,0.12)] px-4 py-4 space-y-4">
          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[9px] text-[#a8997e] uppercase tracking-wider mb-1">Starting Price</p>
              <p className="font-heading text-lg text-[#c9a84c]">${result.recommendedStartingPrice.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-[#a8997e] uppercase tracking-wider mb-1">Floor Price</p>
              <p className="font-heading text-lg text-[#f0e8d4]">${result.recommendedFloorPrice.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-[#a8997e] uppercase tracking-wider mb-1">Market Rate</p>
              <p className="font-heading text-lg text-[#a8997e]">${result.marketRate.toLocaleString()}</p>
            </div>
          </div>

          {/* Strategy + Expected bids */}
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold capitalize ${STRATEGY_COLOR[result.pricingStrategy] ?? "text-[#c9a84c]"}`}>
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
              {result.pricingStrategy} strategy
            </span>
            <span className="text-[#a8997e]">~{result.expectedBids} bids expected</span>
          </div>

          {/* Rationale */}
          <p className="text-xs text-[#a8997e] leading-relaxed">{result.rationale}</p>

          {/* Tips */}
          {result.tips.length > 0 && (
            <ul className="space-y-1">
              {result.tips.map((t, i) => (
                <li key={i} className="text-xs text-[#f0e8d4] flex items-start gap-1.5">
                  <span className="text-[#c9a84c] mt-0.5">•</span>{t}
                </li>
              ))}
            </ul>
          )}

          {/* Apply */}
          {onApply && (
            <button
              onClick={() => onApply(result.recommendedStartingPrice, result.recommendedFloorPrice)}
              className="w-full py-2 rounded-[3px] text-sm font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors"
            >
              Apply These Prices
            </button>
          )}

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
