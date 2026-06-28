"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Star, X, TrendingDown } from "lucide-react";
import Link from "next/link";

interface VictoryData {
  jobId: string;
  jobTitle: string;
  finalPrice: number;
  startingPrice: number;
  freelancerName: string;
  freelancerScore?: number;
  clientName: string;
}

interface Props {
  data: VictoryData;
  onClose: () => void;
}

const CONFETTI_COLORS = ["#C8923D", "#3B3BD4", "#FF6B35", "#E0A33E", "#2F7D54", "#E4DDD0"];

function ConfettiParticle({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = `${(index * 37 + 5) % 95}%`;
  const delay = `${(index * 0.15) % 2}s`;
  const size = index % 3 === 0 ? 8 : index % 3 === 1 ? 6 : 10;

  return (
    <div
      className="confetti fixed pointer-events-none"
      style={{
        left,
        top: "-20px",
        width: `${size}px`,
        height: `${size}px`,
        background: color,
        borderRadius: index % 2 === 0 ? "50%" : "2px",
        animationDelay: delay,
        animationDuration: `${2.5 + (index % 5) * 0.3}s`,
      }}
    />
  );
}

export default function AuctionVictoryModal({ data, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const savings = Math.max(0, data.startingPrice - data.finalPrice);
  const savingsPct = data.startingPrice > 0 ? Math.round((savings / data.startingPrice) * 100) : 0;

  useEffect(() => {
    setMounted(true);
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  return (
    <div className="victory-overlay fixed inset-0 z-[500] flex items-center justify-center px-4">
      {/* Confetti */}
      {Array.from({ length: 20 }).map((_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}

      {/* Modal */}
      <div className="glass-panel-lg p-8 w-full max-w-lg relative animate-scale-in scanline">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg text-[#4A5568] hover:text-[#0F1924] hover:bg-[#D8D0C0] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Success badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full mb-4 animate-pulse-glow"
            style={{
              background: "rgba(200,146,61,0.15)",
              border: "2px solid rgba(200,146,61,0.50)",
            }}
          >
            <CheckCircle2 className="h-10 w-10 text-[#C8923D]" />
          </div>
          <h2 className="text-2xl font-bold text-[#0F1924] font-heading">Match Found!</h2>
          <p className="text-[#253444] text-sm mt-1">Your auction has a winner</p>
        </div>

        {/* Job title */}
        <div className="text-center mb-6">
          <p className="text-xs text-[#4A5568] uppercase tracking-wider font-semibold mb-1">Project</p>
          <p className="text-[#0F1924] font-medium font-heading">{data.jobTitle}</p>
        </div>

        {/* Match card: client ↔ freelancer */}
        <div className="glass-panel-sm p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="h-10 w-10 rounded-full bg-[rgba(200,146,61,0.10)] border-2 border-[#BEB5A5] flex items-center justify-center text-sm font-bold text-[#7A5218] mx-auto mb-1">
                {data.clientName.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs text-[#0F1924] font-medium">{data.clientName}</p>
              <p className="text-[10px] text-[#4A5568]">Client</p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-[#C8923D] text-xs font-bold tracking-wider">↔ MATCHED</div>
              <div className="h-px w-16 bg-gradient-to-r from-[#3B3BD4]/30 via-[#C8923D]/50 to-[#C8923D]/30" />
            </div>

            <div className="flex-1 text-center">
              <div className="h-10 w-10 rounded-full bg-[rgba(200,146,61,0.10)] border-2 border-[#C8923D]/40 flex items-center justify-center text-sm font-bold text-[#C8923D] mx-auto mb-1">
                {data.freelancerName.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs text-[#0F1924] font-medium">{data.freelancerName}</p>
              {data.freelancerScore !== undefined && (
                <p className="text-[10px] text-[#C8923D]">GS {data.freelancerScore}</p>
              )}
            </div>
          </div>
        </div>

        {/* Price display */}
        <div className="glass-panel-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#4A5568] uppercase tracking-wider font-semibold">Final Price</span>
            <span className="text-2xl font-black text-[#C8923D] font-heading terminal-amount">
              ${data.finalPrice.toLocaleString()}
            </span>
          </div>

          {/* Savings bar */}
          {savings > 0 && (
            <>
              <div className="h-2 bg-[#D8D0C0] rounded-full overflow-hidden mb-2">
                <div
                  className="h-2 decay-bar"
                  style={{ width: `${savingsPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4A5568]">Started at ${data.startingPrice.toLocaleString()}</span>
                <span className="flex items-center gap-1 text-[#C8923D] font-semibold">
                  <TrendingDown className="h-3 w-3" />
                  Saved ${savings.toLocaleString()} ({savingsPct}%)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link href={`/jobs/${data.jobId}`} className="flex-1">
            <button className="btn-primary w-full py-3 text-sm rounded-xl">
              View Contract
            </button>
          </Link>
          <Link href="/inbox" className="flex-1">
            <button className="btn-glass w-full py-3 text-sm rounded-xl">
              <MessageSquare className="h-4 w-4" />
              Message
            </button>
          </Link>
        </div>

        <div className="mt-3 text-center">
          <Link href={`/jobs/${data.jobId}`}>
            <button className="text-xs text-[#4A5568] hover:text-[#C8923D] transition-colors flex items-center gap-1 mx-auto">
              <Star className="h-3 w-3" /> Leave a Review
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
