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
 <h2 className="text-xs font-semibold text-[#46424e] uppercase tracking-wider">
 My Active Bids
 </h2>
 <span className="text-[11px] text-[#46424e] font-medium">{bids.length} pending</span>
 </div>

 <div className="glass-panel feed-glass-card rounded-2xl overflow-hidden divide-y divide-[rgba(75,63,143,0.15)]">
 {bids.map(bid => {
 const statusConfig =
 bid.status === "winning" ? {
 icon: TrendingUp,
 label: "Winning",
 color: "text-[#4d7245]",
 bg: "bg-[#4d7245]/12",
 border: "border-[#4d7245]/22",
 } :
 bid.status === "outbid" ? {
 icon: TrendingDown,
 label: "Outbid",
 color: "text-[#96543f]",
 bg: "bg-[#c14d3a]/12",
 border: "border-[#c14d3a]/22",
 } : {
 icon: Minus,
 label: "Pending",
 color: "text-[#4b3f8f]",
 bg: "bg-[#4b3f8f]/12",
 border: "border-[#4b3f8f]/22",
 };

 const cooldownMins = bid.cooldownEndsAt
 ? Math.max(0, (new Date(bid.cooldownEndsAt).getTime() - Date.now()) / 60000)
 : 0;

 return (
 <Link
 key={bid.jobId}
 href={`/jobs/${bid.jobId}`}
 className={`flex items-center gap-4 px-4 py-3.5 hover:bg-[#f4f2ee] transition-colors group ${
 bid.status === "winning" ? "feed-pulse-win" : bid.status === "outbid" ? "feed-shake-outbid" : ""
 }`}
 >
 {/* Status icon */}
 <div className={`w-7 h-7 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center shrink-0`}>
 <statusConfig.icon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
 </div>

 {/* Job title + status */}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-normal text-[#3d3a45] truncate group-hover:text-[#4b3f8f] transition-colors">
 {bid.jobTitle}
 </p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className={`text-[10px] font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
 <span className="text-[10px] text-[#46424e]">·</span>
 <span className={`text-[10px] font-semibold ${
 bid.rank === 1 ? "text-[#4b3f8f]" : bid.rank === 2 ? "text-[#f4f2ee]" : bid.rank === 3 ? "text-[#a08a3c]" : "text-[#46424e] font-medium"
 }`}>
 {bid.rank === 1 ? "🥇 " : bid.rank === 2 ? "🥈 " : bid.rank === 3 ? "🥉 " : ""}Rank #{bid.rank}
 </span>
 {cooldownMins > 0 && (
 <>
 <span className="text-[10px] text-[#46424e]">·</span>
 <span className="flex items-center gap-0.5 text-[10px] text-[#4b3f8f] font-semibold">
 <Clock className="h-2.5 w-2.5" />
 {Math.ceil(cooldownMins)}m cooldown
 </span>
 </>
 )}
 </div>
 </div>

 {/* Prices */}
 <div className="text-right shrink-0">
 <p className="font-heading text-sm font-normal text-[#3d3a45]">{formatMoney(bid.myPrice)}</p>
 {bid.currentPrice !== bid.myPrice && (
 <p className="text-[10px] text-[#46424e] font-medium">mkt {formatMoney(bid.currentPrice)}</p>
 )}
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
