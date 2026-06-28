"use client";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

interface ActiveBid {
  jobId: string;
  jobTitle: string;
  myPrice: number;
  currentPrice: number;
  rank: number;
  status: "winning" | "outbid" | "pending";
  cooldownEndsAt?: string;
}

interface ActiveBidsTrackerProps {
  bids: ActiveBid[];
}

export default function ActiveBidsTracker({ bids }: ActiveBidsTrackerProps) {
  if (bids.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-[#0F1924] uppercase tracking-wider">
          My Active Bids
        </h2>
        <span className="text-[11px] text-[#253444] font-medium">{bids.length} pending</span>
      </div>

      <div className="glass-panel rounded-xl border border-[#BEB5A5] overflow-hidden divide-y divide-[#BEB5A5]">
        {bids.map(bid => {
          const statusConfig =
            bid.status === "winning" ? {
              icon: TrendingUp,
              label: "Winning",
              color: "text-[#7A5218]",
              bg: "bg-[rgba(122,82,24,0.12)]",
              border: "border-[#7A5218]/30",
            } :
            bid.status === "outbid" ? {
              icon: TrendingDown,
              label: "Outbid",
              color: "text-red-700",
              bg: "bg-red-100",
              border: "border-red-400/40",
            } : {
              icon: Minus,
              label: "Pending",
              color: "text-[#7A5218]",
              bg: "bg-[rgba(122,82,24,0.10)]",
              border: "border-[#7A5218]/30",
            };

          const cooldownMins = bid.cooldownEndsAt
            ? Math.max(0, (new Date(bid.cooldownEndsAt).getTime() - Date.now()) / 60000)
            : 0;

          return (
            <Link key={bid.jobId} href={`/jobs/${bid.jobId}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#D8D0C0] transition-colors group">
              {/* Status icon */}
              <div className={`w-7 h-7 rounded-lg ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center shrink-0`}>
                <statusConfig.icon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
              </div>

              {/* Job title + status */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0F1924] truncate group-hover:text-[#7A5218] transition-colors">
                  {bid.jobTitle}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
                  <span className="text-[10px] text-[#3D4E5C]">·</span>
                  <span className="text-[10px] text-[#253444] font-medium">Rank #{bid.rank}</span>
                  {cooldownMins > 0 && (
                    <>
                      <span className="text-[10px] text-[#3D4E5C]">·</span>
                      <span className="flex items-center gap-0.5 text-[10px] text-[#7A5218] font-semibold">
                        <Clock className="h-2.5 w-2.5" />
                        {Math.ceil(cooldownMins)}m cooldown
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Prices */}
              <div className="text-right shrink-0">
                <p className="font-heading text-sm font-bold text-[#0F1924]">{formatMoney(bid.myPrice)}</p>
                {bid.currentPrice !== bid.myPrice && (
                  <p className="text-[10px] text-[#253444] font-medium">mkt {formatMoney(bid.currentPrice)}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
