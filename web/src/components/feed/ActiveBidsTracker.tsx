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
 <h2 className="text-xs font-semibold text-[#a8997e] uppercase tracking-wider">
 My Active Bids
 </h2>
 <span className="text-[11px] text-[#a8997e] font-medium">{bids.length} pending</span>
 </div>

 <div className="glass-panel rounded-[3px] overflow-hidden divide-y divide-[rgba(201,168,76,0.15)]">
 {bids.map(bid => {
 const statusConfig =
 bid.status === "winning" ? {
 icon: TrendingUp,
 label: "Winning",
 color: "text-[#4caf7d]",
 bg: "bg-[#2e7d52]/12",
 border: "border-[#2e7d52]/22",
 } :
 bid.status === "outbid" ? {
 icon: TrendingDown,
 label: "Outbid",
 color: "text-[#e57373]",
 bg: "bg-[#c0392b]/12",
 border: "border-[#c0392b]/22",
 } : {
 icon: Minus,
 label: "Pending",
 color: "text-[#c9a84c]",
 bg: "bg-[#c9a84c]/12",
 border: "border-[#c9a84c]/22",
 };

 const cooldownMins = bid.cooldownEndsAt
 ? Math.max(0, (new Date(bid.cooldownEndsAt).getTime() - Date.now()) / 60000)
 : 0;

 return (
 <Link key={bid.jobId} href={`/jobs/${bid.jobId}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#111625] transition-colors group">
 {/* Status icon */}
 <div className={`w-7 h-7 rounded-[3px] ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center shrink-0`}>
 <statusConfig.icon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
 </div>

 {/* Job title + status */}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-normal text-[#f0e8d4] truncate group-hover:text-[#c9a84c] transition-colors">
 {bid.jobTitle}
 </p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className={`text-[10px] font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
 <span className="text-[10px] text-[#a8997e]">·</span>
 <span className="text-[10px] text-[#a8997e] font-medium">Rank #{bid.rank}</span>
 {cooldownMins > 0 && (
 <>
 <span className="text-[10px] text-[#a8997e]">·</span>
 <span className="flex items-center gap-0.5 text-[10px] text-[#c9a84c] font-semibold">
 <Clock className="h-2.5 w-2.5" />
 {Math.ceil(cooldownMins)}m cooldown
 </span>
 </>
 )}
 </div>
 </div>

 {/* Prices */}
 <div className="text-right shrink-0">
 <p className="font-heading text-sm font-normal text-[#f0e8d4]">{formatMoney(bid.myPrice)}</p>
 {bid.currentPrice !== bid.myPrice && (
 <p className="text-[10px] text-[#a8997e] font-medium">mkt {formatMoney(bid.currentPrice)}</p>
 )}
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
