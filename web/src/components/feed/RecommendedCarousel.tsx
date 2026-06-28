"use client";
import Link from "next/link";
import { getCurrentPrice, formatMoney, type Job } from "@/lib/utils";
import { getCompetitionBadge, getPriceTrajectory } from "./feed-helpers";
import { getEffectiveDecayRate } from "@/lib/pricing";
import { Zap } from "lucide-react";

interface RecommendedCarouselProps {
 jobs: Job[];
 now: Date;
 mySkills?: string[];
 onQuickBid?: (jobId: string) => void;
}

export default function RecommendedCarousel({ jobs, now, mySkills = [], onQuickBid }: RecommendedCarouselProps) {
 if (jobs.length === 0) return null;

 return (
 <div>
 <div className="flex items-center justify-between mb-5">
 <h2 className="text-base font-semibold text-[#f0e8d4] uppercase tracking-wider flex items-center gap-2">
 <span className="text-base">🎯</span> Recommended For You
 </h2>
 <span className="text-[11px] text-[#a8997e] font-medium">Top {Math.min(jobs.length, 5)} matches</span>
 </div>

 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
 {jobs.slice(0, 5).map(job => {
 const jobId = job.id ?? job._id ?? "";
 const current = getCurrentPrice(job, now);
 const bidCount = job.bidCount ?? 0;
 const comp = getCompetitionBadge(bidCount);

 // Match score
 const matchedSkills = job.skillsRequired.filter(s => mySkills.includes(s));
 const matchScore = job.skillsRequired.length > 0
 ? Math.round((matchedSkills.length / job.skillsRequired.length) * 100) : 0;

 // Effective hourly
 const elapsedHrs = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
 const effectiveRate = getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? bidCount, elapsedHrs);
 const trajectory = getPriceTrajectory(effectiveRate);
 const hourlyRate = job.estimatedHours && job.estimatedHours > 0
 ? Math.round(current / job.estimatedHours) : null;

 const matchColor = matchScore >= 75
 ? "bg-[#c9a84c] text-white border-0"
 : matchScore >= 50
 ? "bg-[#c9a84c] text-white border-0"
 : "text-[#a8997e] border-[rgba(201,168,76,0.22)] bg-[#111625]";

 return (
 <Link key={jobId} href={`/jobs/${jobId}`} className="shrink-0 w-[280px] group">
 <div className="glass-panel rounded-[6px] p-4 border border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)] transition-all h-full flex flex-col gap-3 min-h-[190px]">
 {/* Match badge */}
 <div className="flex items-center justify-between gap-1">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${matchColor}`}>
 {matchScore}% Match
 </span>
 <span className="text-[10px] font-semibold text-[#1B2D3E]">{comp.label}</span>
 </div>

 {/* Title */}
 <p className="text-sm font-semibold text-[#f0e8d4] leading-snug line-clamp-2 group-hover:text-[#c9a84c] transition-colors">
 {job.title}
 </p>

 {/* Price */}
 <p className="font-serif text-lg font-bold text-[#f0e8d4]">{formatMoney(current)}</p>

 {/* Hourly rate */}
 {hourlyRate && (
 <p className="text-xs text-[#a8997e] font-medium">${hourlyRate}/hr effective</p>
 )}

 {/* Trajectory */}
 <div className="flex items-center gap-1 text-[10px]">
 <span className={trajectory.color}>{trajectory.icon}</span>
 <span className="truncate text-[#a8997e] font-medium">{trajectory.label}</span>
 </div>

 {/* Quick bid */}
 <button
 onClick={e => {
 e.preventDefault();
 if (onQuickBid) onQuickBid(jobId);
 }}
 className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-[3px] text-xs font-semibold bg-[#050810] text-white hover:bg-[#111625] transition-colors"
 >
 <Zap className="h-3 w-3" />
 QuickBid
 </button>
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
