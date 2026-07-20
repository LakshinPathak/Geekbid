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
  aggressive: "text-[#96543f]",
  balanced: "text-[#4b3f8f]",
  premium: "text-[#4d7245]",
};

export default function AIPricingAdvisor({ title, skills, category, estimatedHours, recentJobs, onApply }: Props) {
  const { getValidToken } = useApp();
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!title || title.trim().length < 5) return null;

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const res = await fetch("/api/ai/pricing-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    <div className="rounded-2xl border border-[rgba(75,63,143,0.22)] bg-[#ffffff] overflow-hidden">
      <button
        onClick={() => result ? setOpen(o => !o) : analyze()}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(75,63,143,0.06)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#4b3f8f]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
          AI Pricing Advisor
        </span>
        {result && (open ? <ChevronUp className="h-3.5 w-3.5 text-[#6f6a7d]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#6f6a7d]" />)}
      </button>

      {error && <div className="px-4 pb-3 text-xs text-[#96543f]">{error}</div>}

      {result && open && (
        <div className="border-t border-[rgba(75,63,143,0.12)] px-4 py-4 space-y-4">
          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[9px] text-[#6f6a7d] uppercase tracking-wider mb-1">Starting Price</p>
              <p className="font-heading text-lg text-[#4b3f8f]">${result.recommendedStartingPrice.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-[#6f6a7d] uppercase tracking-wider mb-1">Floor Price</p>
              <p className="font-heading text-lg text-[#3d3a45]">${result.recommendedFloorPrice.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-[#6f6a7d] uppercase tracking-wider mb-1">Market Rate</p>
              <p className="font-heading text-lg text-[#6f6a7d]">${result.marketRate.toLocaleString()}</p>
            </div>
          </div>

          {/* Strategy + Expected bids */}
          <div className="flex items-center justify-between text-xs">
            <span className={`font-semibold capitalize ${STRATEGY_COLOR[result.pricingStrategy] ?? "text-[#4b3f8f]"}`}>
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
              {result.pricingStrategy} strategy
            </span>
            <span className="text-[#6f6a7d]">~{result.expectedBids} bids expected</span>
          </div>

          {/* Rationale */}
          <p className="text-xs text-[#6f6a7d] leading-relaxed">{result.rationale}</p>

          {/* Tips */}
          {result.tips.length > 0 && (
            <ul className="space-y-1">
              {result.tips.map((t, i) => (
                <li key={i} className="text-xs text-[#3d3a45] flex items-start gap-1.5">
                  <span className="text-[#4b3f8f] mt-0.5">•</span>{t}
                </li>
              ))}
            </ul>
          )}

          {/* Apply */}
          {onApply && (
            <button
              onClick={() => onApply(result.recommendedStartingPrice, result.recommendedFloorPrice)}
              className="w-full py-2 rounded-full text-sm font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors"
            >
              Apply These Prices
            </button>
          )}

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
