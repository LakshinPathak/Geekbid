"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentPrice, getHoursToFloor, formatHoursToFloor, formatMoney, type Job } from "@/lib/utils";
import { getEffectiveDecayRate } from "@/lib/pricing";
import { getCompetitionBadge, getPriceTrajectory } from "./feed-helpers";
import { Clock, Users, ChevronRight, Zap, User } from "lucide-react";
import { usePointerFine, useTilt3D } from "@/components/landing/hooks";

interface FreelancerJobCardProps {
 job: Job;
 now: Date;
 mySkills?: string[];
 clientName?: string;
 clientRating?: number;
 clientReviewCount?: number;
 hasMyBid?: boolean;
 myBidRank?: number;
 onQuickBid?: (jobId: string) => void;
}

export default function FreelancerJobCard({
 job,
 now,
 mySkills = [],
 clientName,
 clientRating,
 clientReviewCount,
 hasMyBid = false,
 myBidRank,
 onQuickBid,
}: FreelancerJobCardProps) {
 const cardRef = useRef<HTMLDivElement>(null);
 const isPointerFine = usePointerFine();
 useTilt3D(cardRef, isPointerFine);
 const router = useRouter();

 const jobId = job.id ?? job._id ?? "";
 const current = getCurrentPrice(job, now);
 const hoursLeft = getHoursToFloor(job, now);
 const bidCount = job.bidCount ?? 0;
 const comp = getCompetitionBadge(bidCount);

 // Match score
 const matchedSkills = job.skillsRequired.filter(s => mySkills.includes(s));
 const missingSkills = job.skillsRequired.filter(s => !mySkills.includes(s));
 const matchScore = job.skillsRequired.length > 0
 ? Math.round((matchedSkills.length / job.skillsRequired.length) * 100) : 0;

 // Match badge color
 const matchColor = matchScore >= 75
 ? "bg-[#4d7245]/12 text-[#4d7245] border-[rgba(75,63,143,0.22)]"
 : matchScore >= 50
 ? "bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border-[rgba(75,63,143,0.22)]"
 : "bg-[#f4f2ee] text-[#46424e] border-[rgba(75,63,143,0.15)]";

 // Effective hourly
 const elapsedHrs = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
 const effectiveRate = getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? bidCount, elapsedHrs);
 const hourlyRate = job.estimatedHours && job.estimatedHours > 0 ? Math.round(current / job.estimatedHours) : null;

 // Price trajectory
 const trajectory = getPriceTrajectory(effectiveRate);

 // Decay bar
 const priceRange = job.startingPrice - job.minimumPrice;
 const decayPct = priceRange > 0 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

 const handleQuickBid = (e: React.MouseEvent) => {
 e.stopPropagation();
 if (onQuickBid) onQuickBid(jobId);
 };

 return (
 <div
 ref={cardRef}
 onClick={() => router.push(`/jobs/${jobId}`)}
 className="glass-panel feed-glass-card feed-tilt-card feed-card-border-rotate p-5 transition-all duration-200 h-full flex flex-col gap-4 relative cursor-pointer group"
 >
 {job.status === "open" && (
 <span className="absolute top-3 left-3 h-2 w-2 rounded-full bg-[#4d7245] animate-pulse z-10" title="Price actively decaying" aria-hidden="true" />
 )}

 {/* ── Header: badges + title ─────────────────────────────────────── */}
 <div>
 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex flex-wrap gap-1.5">
 {/* Match % badge */}
 <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${matchColor}`}>
 {matchScore}% Match
 </span>
 {/* Competition badge */}
 <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${comp.color} ${comp.bg} ${comp.border}`}>
 {comp.label}
 </span>
 {hasMyBid && myBidRank && myBidRank > 0 && (
 <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
 myBidRank === 1 ? "bg-[#4b3f8f]/20 text-[#4b3f8f] border-[#4b3f8f]/40" :
 myBidRank === 2 ? "bg-[#c0c0c0]/15 text-[#3d3a45] border-[#c0c0c0]/30" :
 myBidRank === 3 ? "bg-[#cd7f32]/15 text-[#a08a3c] border-[#cd7f32]/30" :
 "bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border-[rgba(75,63,143,0.22)]"
 }`}>
 {myBidRank === 1 ? "🥇" : myBidRank === 2 ? "🥈" : myBidRank === 3 ? "🥉" : ""} Rank #{myBidRank}
 </span>
 )}
 {hasMyBid && (!myBidRank || myBidRank === 0) && (
 <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.15)]">
 Bid Placed
 </span>
 )}
 </div>
 <ChevronRight className="h-4 w-4 text-[#46424e] group-hover:text-[#4b3f8f] transition-colors shrink-0 mt-0.5" />
 </div>

 <h3 className="font-heading text-[15px] font-normal text-[#3d3a45] leading-snug group-hover:text-[#4b3f8f] transition-colors line-clamp-2">
 {job.title}
 </h3>

 {/* Skill checklist */}
 <div className="flex flex-wrap gap-1.5 mt-2">
 {matchedSkills.slice(0, 3).map(s => (
 <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] bg-[#4d7245]/12 text-[#4d7245] border border-[#4d7245]/22">
 ✓ {s}
 </span>
 ))}
 {missingSkills.slice(0, 2).map(s => (
 <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.15)]">
 ✗ {s}
 </span>
 ))}
 </div>
 </div>

 {/* ── Price + Effective Hourly ────────────────────────────────────── */}
 <div>
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <span className="text-[11px] text-[#46424e] font-medium uppercase tracking-wider">Current Price</span>
 <p className="font-heading text-2xl font-normal text-[#3d3a45]">{formatMoney(current)}</p>
 </div>
 {hourlyRate && (
 <div className="text-right">
 <span className="text-[11px] text-[#46424e] font-medium uppercase tracking-wider">Effective/hr</span>
 <p className="font-heading text-lg font-normal text-[#46424e]">${hourlyRate}/hr</p>
 </div>
 )}
 </div>

 {/* Price trajectory */}
 <div className="flex items-center gap-1.5 text-xs mb-2">
 <span className={trajectory.color}>{trajectory.icon}</span>
 <span className="text-[#46424e] font-medium">{trajectory.label}</span>
 <span className="text-[#46424e]">· {formatMoney(job.decayRatePerHour)}/hr decay</span>
 </div>

 {/* Decay bar */}
 <div className="space-y-1">
 <div className="h-0.5 w-full bg-[#f0edfa]">
 <div
 className="h-full bg-[#4b3f8f] transition-all duration-500"
 style={{ width: `${decayPct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#46424e] font-medium">
 <span>Floor {formatMoney(job.minimumPrice)}</span>
 {hoursLeft > 0 && <span className="text-[#4b3f8f] font-semibold">⏱ {formatHoursToFloor(hoursLeft)} to floor</span>}
 <span>Start {formatMoney(job.startingPrice)}</span>
 </div>
 </div>
 </div>

 {/* ── Client info ─────────────────────────────────────────────────── */}
 {clientName && (
 <div className="flex items-center gap-2">
 <User className="h-3 w-3 text-[#46424e] shrink-0" />
 <span className="text-[10px] text-[#46424e] uppercase tracking-wider font-semibold shrink-0">Posted by</span>
 <div className="w-5 h-5 rounded-full bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border border-[rgba(75,63,143,0.22)] flex items-center justify-center text-[9px] font-bold shrink-0">
 {clientName[0]}
 </div>
 <span className="text-xs text-[#46424e] truncate">{clientName}</span>
 {clientRating && (
 <span className="text-[11px] text-[#4b3f8f] font-semibold shrink-0">⭐ {clientRating.toFixed(1)}{clientReviewCount ? ` (${clientReviewCount})` : ""}</span>
 )}
 </div>
 )}

 {/* ── Footer: stats + CTA ─────────────────────────────────────────── */}
 <div className="mt-auto pt-3 border-t border-[rgba(75,63,143,0.15)]">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 text-[11px] text-[#46424e] font-medium">
 {job.estimatedHours && (
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3 text-[#46424e]" />{job.estimatedHours}h
 </span>
 )}
 <span className="flex items-center gap-1">
 <Users className="h-3 w-3 text-[#46424e]" />{bidCount} bid{bidCount !== 1 ? "s" : ""}
 </span>
 {hoursLeft > 0 && (
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3 text-[#46424e]" />{formatHoursToFloor(hoursLeft)} left
 </span>
 )}
 </div>

 {!hasMyBid ? (
 <button
 onClick={handleQuickBid}
 className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
 >
 <Zap className="h-3 w-3" />
 Counter →
 </button>
 ) : (
 <button
 onClick={e => { e.stopPropagation(); router.push(`/jobs/${jobId}`); }}
 className="btn-glass text-[11px] py-1.5 px-3 flex items-center gap-1"
 >
 View Details →
 </button>
 )}
 </div>
 </div>
 </div>
 );
}
