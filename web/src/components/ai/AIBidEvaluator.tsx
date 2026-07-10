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
  hire: { label: "Hire", cls: "text-[#4d7245] bg-[rgba(77,114,69,0.12)] border-[rgba(77,114,69,0.3)]", icon: CheckCircle },
  consider: { label: "Consider", cls: "text-[#4b3f8f] bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]", icon: AlertCircle },
  pass: { label: "Pass", cls: "text-[#96543f] bg-[rgba(193,77,58,0.12)] border-[rgba(193,77,58,0.3)]", icon: XCircle },
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
    <div className="rounded-2xl border border-[rgba(75,63,143,0.22)] bg-[#ffffff] overflow-hidden">
      <button
        onClick={() => result ? setOpen(o => !o) : evaluate()}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(75,63,143,0.06)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#4b3f8f]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          AI Bid Evaluator
          <span className="text-[10px] font-normal text-[#6f6a7d]">({bids.length} bids)</span>
        </span>
        {result && (open ? <ChevronUp className="h-4 w-4 text-[#6f6a7d]" /> : <ChevronDown className="h-4 w-4 text-[#6f6a7d]" />)}
      </button>

      {error && <div className="px-4 pb-3 text-xs text-[#96543f]">{error}</div>}

      {result && open && (
        <div className="border-t border-[rgba(75,63,143,0.12)] px-4 py-4 space-y-4">
          <p className="text-xs text-[#6f6a7d] leading-relaxed">{result.summary}</p>

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
                  className={`rounded-xl border p-3 ${isBest ? "border-[rgba(75,63,143,0.4)] bg-[rgba(75,63,143,0.06)]" : "border-[rgba(75,63,143,0.12)] bg-[#fbfaf7]"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isBest && <span className="text-[9px] font-bold text-[#4b3f8f] uppercase tracking-wider bg-[rgba(75,63,143,0.12)] px-1.5 py-0.5 rounded-full">Best</span>}
                      <span className="text-sm font-semibold text-[#3d3a45]">
                        {freelancer?.fullName ?? "Freelancer"}
                      </span>
                      <span className="text-sm text-[#4b3f8f]">${bid.bidPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#6f6a7d]">{ev.score}/100</span>
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {ev.pros.length > 0 && (
                    <div className="space-y-0.5 mb-1.5">
                      {ev.pros.map((p, i) => (
                        <p key={i} className="text-[10px] text-[#4d7245] flex items-start gap-1">
                          <span className="mt-0.5">+</span>{p}
                        </p>
                      ))}
                    </div>
                  )}
                  {ev.cons.map((c, i) => (
                    <p key={i} className="text-[10px] text-[#96543f] flex items-start gap-1">
                      <span className="mt-0.5">-</span>{c}
                    </p>
                  ))}

                  {isBest && onAcceptBid && (
                    <button
                      onClick={() => onAcceptBid(bid)}
                      className="mt-2 w-full py-1.5 rounded-full text-xs font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors"
                    >
                      Accept This Bid
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-[#6f6a7d] italic">{result.recommendationReason}</p>

          <button
            onClick={evaluate}
            disabled={loading}
            className="w-full py-1.5 rounded-full text-xs text-[#6f6a7d] border border-[rgba(75,63,143,0.22)] hover:border-[#4b3f8f] transition-colors"
          >
            {loading ? "Evaluating..." : "Re-evaluate"}
          </button>
        </div>
      )}
    </div>
  );
}
