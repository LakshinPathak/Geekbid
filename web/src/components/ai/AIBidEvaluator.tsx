"use client";
import { useState } from "react";
import { Brain, Loader2, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/store";

type Evaluation = {
  bidId: string;
  score: number;
  verdict: "hire" | "consider" | "pass";
  pros: string[];
  cons: string[];
};

type EvalResult = {
  bestBidId: string;
  summary: string;
  evaluations: Evaluation[];
  recommendationReason: string;
};

type Bid = {
  _id?: string; id?: string;
  freelancerId: string; bidPrice: number; message?: string; createdAt?: string;
};

type Freelancer = {
  id?: string; _id?: string; fullName?: string; geekScore?: number;
  averageRating?: number; totalReviews?: number; skills?: string[]; plan?: string;
};

type Props = {
  jobId: string;
  bids: Bid[];
  freelancers: Freelancer[];
  onAcceptBid?: (bid: Bid) => void;
};

const VERDICT_CONFIG = {
  hire: { label: "Hire", cls: "text-[#4caf7d] bg-[rgba(76,175,61,0.12)] border-[rgba(76,175,61,0.3)]", icon: CheckCircle },
  consider: { label: "Consider", cls: "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]", icon: AlertCircle },
  pass: { label: "Pass", cls: "text-[#e57373] bg-[rgba(192,57,43,0.12)] border-[rgba(192,57,43,0.3)]", icon: XCircle },
};

export default function AIBidEvaluator({ jobId, bids, freelancers, onAcceptBid }: Props) {
  const { auth } = useApp();
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (bids.length === 0) return null;

  async function evaluate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/evaluate-bids", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Evaluation failed");
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
        onClick={() => result ? setOpen(o => !o) : evaluate()}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(201,168,76,0.06)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#c9a84c]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          AI Bid Evaluator
          <span className="text-[10px] font-normal text-[#a8997e]">({bids.length} bids)</span>
        </span>
        {result && (open ? <ChevronUp className="h-4 w-4 text-[#a8997e]" /> : <ChevronDown className="h-4 w-4 text-[#a8997e]" />)}
      </button>

      {error && <div className="px-4 pb-3 text-xs text-[#e57373]">{error}</div>}

      {result && open && (
        <div className="border-t border-[rgba(201,168,76,0.12)] px-4 py-4 space-y-4">
          <p className="text-xs text-[#a8997e] leading-relaxed">{result.summary}</p>

          <div className="space-y-3">
            {result.evaluations.map((ev) => {
              const bid = bids.find(b => (b.id ?? b._id) === ev.bidId);
              if (!bid) return null;
              const freelancer = freelancers.find(f => (f.id ?? f._id) === bid.freelancerId);
              const cfg = VERDICT_CONFIG[ev.verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.consider;
              const Icon = cfg.icon;
              const isBest = ev.bidId === result.bestBidId;

              return (
                <div
                  key={ev.bidId}
                  className={`rounded-[4px] border p-3 ${isBest ? "border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.06)]" : "border-[rgba(201,168,76,0.12)] bg-[#080b14]"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isBest && <span className="text-[9px] font-bold text-[#c9a84c] uppercase tracking-wider bg-[rgba(201,168,76,0.12)] px-1.5 py-0.5 rounded-[2px]">Best</span>}
                      <span className="text-sm font-semibold text-[#f0e8d4]">
                        {freelancer?.fullName ?? "Freelancer"}
                      </span>
                      <span className="text-sm text-[#c9a84c]">${bid.bidPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#a8997e]">{ev.score}/100</span>
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {ev.pros.length > 0 && (
                    <div className="space-y-0.5 mb-1.5">
                      {ev.pros.map((p, i) => (
                        <p key={i} className="text-[10px] text-[#4caf7d] flex items-start gap-1">
                          <span className="mt-0.5">+</span>{p}
                        </p>
                      ))}
                    </div>
                  )}
                  {ev.cons.map((c, i) => (
                    <p key={i} className="text-[10px] text-[#e57373] flex items-start gap-1">
                      <span className="mt-0.5">-</span>{c}
                    </p>
                  ))}

                  {isBest && onAcceptBid && (
                    <button
                      onClick={() => onAcceptBid(bid)}
                      className="mt-2 w-full py-1.5 rounded-[3px] text-xs font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors"
                    >
                      Accept This Bid
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-[#a8997e] italic">{result.recommendationReason}</p>

          <button
            onClick={evaluate}
            disabled={loading}
            className="w-full py-1.5 rounded-[3px] text-xs text-[#a8997e] border border-[rgba(201,168,76,0.22)] hover:border-[#c9a84c] transition-colors"
          >
            {loading ? "Evaluating..." : "Re-evaluate"}
          </button>
        </div>
      )}
    </div>
  );
}
