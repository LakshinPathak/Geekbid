"use client";
import Link from "next/link";
import { getCurrentPrice, getHoursToFloor, formatHoursToFloor, formatMoney, type Job } from "@/lib/utils";
import { getJobHealth, getCompetitionBadge } from "./feed-helpers";
import { Clock, CheckCircle, Users, TrendingDown, ChevronRight } from "lucide-react";


// ── Demand badge ──────────────────────────────────────────────────────────────
function getDemandBadge(bidCount: number) {
 if (bidCount === 0) return { label: "No Bids", color: "text-[#e57373]", bg: "bg-[#c0392b]/12", border: "border-[#c0392b]/22" };
 if (bidCount <= 2) return { label: "Interested", color: "text-[#4caf7d]", bg: "bg-[#2e7d52]/12", border: "border-[#2e7d52]/22" };
 if (bidCount <= 4) return { label: "In Demand", color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/12", border: "border-[#c9a84c]/22" };
 return { label: "Hot", color: "text-[#e57373]", bg: "bg-[#c0392b]/12", border: "border-[#c0392b]/22" };
}

export interface TopBidder {
 name: string;
 geekScore: number;
 price: number;
 freelancerId: string;
}

interface ClientJobCardProps {
 job: Job;
 now: Date;
 topBidders?: TopBidder[];
 isOwn?: boolean;
 onAcceptBest?: (jobId: string) => void;
}

export default function ClientJobCard({ job, now, topBidders = [], isOwn = false, onAcceptBest }: ClientJobCardProps) {
 const jobId = job.id ?? job._id ?? "";
 const current = getCurrentPrice(job, now);
 const savings = Math.max(0, job.startingPrice - current);
 const hoursLeft = getHoursToFloor(job, now);
 const health = getJobHealth(job, now);
 const demand = getDemandBadge(job.bidCount ?? 0);
 const bidCount = job.bidCount ?? 0;

 // Decay progress bar (0 = floor, 1 = starting)
 const priceRange = job.startingPrice - job.minimumPrice;
 const decayPct = priceRange > 0 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

 const handleAcceptBest = (e: React.MouseEvent) => {
 e.preventDefault();
 if (onAcceptBest && bidCount > 0) onAcceptBest(jobId);
 };

 return (
 <Link href={`/jobs/${jobId}`} className="block group">
 <div className="glass-panel p-5 transition-all duration-200 h-full flex flex-col gap-4">

 {/* ── Header: badges + title ─────────────────────────────────────── */}
 <div>
 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex flex-wrap gap-1.5">
 {/* Health badge */}
 <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${
 health.label === "Urgent" ? "text-[#e57373] bg-[#c0392b]/12 border-[#c0392b]/22" :
 health.label === "Needs Attention" ? "text-[#c9a84c] bg-[#c9a84c]/12 border-[#c9a84c]/22" :
 health.label === "Healthy" ? "text-[#4caf7d] bg-[#2e7d52]/12 border-[#2e7d52]/22" :
 "text-[#c9a84c] bg-[#c9a84c]/12 border-[#c9a84c]/22"
 }`}>
 <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
 {health.label}
 </span>
 {/* Demand badge */}
 <span className={`px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${demand.color} ${demand.bg} ${demand.border}`}>
 {demand.label}
 </span>
 {isOwn && (
 <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]">
 My Job
 </span>
 )}
 </div>
 <ChevronRight className="h-4 w-4 text-[#6b5f45] group-hover:text-[#c9a84c] transition-colors shrink-0 mt-0.5" />
 </div>

 <h3 className="font-heading text-[15px] font-normal text-[#f0e8d4] leading-snug group-hover:text-[#c9a84c] transition-colors line-clamp-2">
 {job.title}
 </h3>

 {/* Skills */}
 <div className="flex flex-wrap gap-1.5 mt-2">
 {job.skillsRequired.slice(0, 3).map(s => (
 <span key={s} className="px-2 py-0.5 rounded-[3px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]">{s}</span>
 ))}
 {job.skillsRequired.length > 3 && (
 <span className="px-2 py-0.5 rounded-[3px] text-[11px] bg-[#111625] text-[#6b5f45] border border-[rgba(201,168,76,0.15)]">+{job.skillsRequired.length - 3}</span>
 )}
 </div>
 </div>

 {/* ── Price + Savings ─────────────────────────────────────────────── */}
 <div>
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <span className="text-[11px] text-[#6b5f45] font-medium uppercase tracking-wider">Current Price</span>
 <p className="font-heading text-2xl font-normal text-[#f0e8d4]">{formatMoney(current)}</p>
 </div>
 {savings > 0 && (
 <div className="text-right">
 <span className="text-[11px] text-[#6b5f45] font-medium uppercase tracking-wider">Savings</span>
 <p className="font-heading text-lg font-normal text-[#c9a84c]">-{formatMoney(savings)}</p>
 </div>
 )}
 </div>

 {/* Decay bar */}
 <div className="space-y-1">
 <div className="h-1.5 w-full bg-[#111625] rounded-full overflow-hidden border border-[rgba(201,168,76,0.15)]">
 <div
 className="h-full rounded-full from-[#c0392b] via-[#c9a84c] to-[#c9a84c] transition-all duration-500"
 style={{ width: `${decayPct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#6b5f45] font-medium">
 <span>Floor {formatMoney(job.minimumPrice)}</span>
 {hoursLeft > 0 && <span className="text-[#c9a84c] font-semibold">⏱ {formatHoursToFloor(hoursLeft)} to floor</span>}
 <span>Start {formatMoney(job.startingPrice)}</span>
 </div>
 </div>
 </div>

 {/* ── Top Bidders Preview ─────────────────────────────────────────── */}
 {topBidders.length > 0 ? (
 <div className="space-y-2">
 <p className="text-[10px] text-[#6b5f45] uppercase tracking-wider font-semibold">Top Bidders</p>
 {topBidders.slice(0, 2).map((b, i) => (
 <div key={b.freelancerId} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className={`w-5 h-5 rounded-[3px] flex items-center justify-center text-[10px] font-bold ${
 i === 0
 ? "bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border border-[rgba(201,168,76,0.22)]"
 : "bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]"
 }`}>
 {i + 1}
 </span>
 <span className="text-xs text-[#a8997e]">{b.name}</span>
 <span className="text-[10px] text-[#6b5f45]">GS {b.geekScore}</span>
 </div>
 <span className="font-heading text-sm font-normal text-[#f0e8d4]">{formatMoney(b.price)}</span>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex items-center gap-2 py-2">
 <Users className="h-3.5 w-3.5 text-[#6b5f45]" />
 <span className="text-xs text-[#6b5f45]">No bids yet — be the first</span>
 </div>
 )}

 {/* ── Footer: stats + CTA ─────────────────────────────────────────── */}
 <div className="mt-auto pt-3 border-t border-[rgba(201,168,76,0.15)]">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 text-[11px] text-[#a8997e] font-medium">
 <span className="flex items-center gap-1">
 <Users className="h-3 w-3 text-[#6b5f45]" />{bidCount} bid{bidCount !== 1 ? "s" : ""}
 </span>
 {job.estimatedHours && (
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3 text-[#6b5f45]" />{job.estimatedHours}h
 </span>
 )}
 {hoursLeft > 0 && (
 <span className="flex items-center gap-1">
 <TrendingDown className="h-3 w-3 text-[#6b5f45]" />{formatHoursToFloor(hoursLeft)} left
 </span>
 )}
 </div>

 {isOwn && bidCount > 0 && onAcceptBest ? (
 <button
 onClick={handleAcceptBest}
 className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
 >
 <CheckCircle className="h-3 w-3" />
 Accept Best
 </button>
 ) : (
 <button className="btn-glass text-[11px] py-1.5 px-3 flex items-center gap-1">
 View Bids →
 </button>
 )}
 </div>
 </div>
 </div>
 </Link>
 );
}
