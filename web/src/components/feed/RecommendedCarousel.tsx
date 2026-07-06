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

// Renders as a responsive grid, not a scroll carousel — the set is always
// capped at 5 ("Top 5 matches"), so on any screen wide enough to show them
// all at once a horizontal-scroll track just left dead space on the right
// with scroll arrows that had nothing left to scroll to. A grid fills the
// row evenly regardless of how many of the 5 slots are actually present.
export default function RecommendedCarousel({ jobs, now, mySkills = [], onQuickBid }: RecommendedCarouselProps) {
  if (jobs.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-sans tracking-[0.14em] uppercase text-[#a8997e] flex items-center gap-2">
          <span className="w-3 h-px bg-[#c9a84c] inline-block" />
          Recommended For You
        </h2>
        <span className="text-[11px] text-[#a8997e]">Top {Math.min(jobs.length, 5)} matches</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {jobs.slice(0, 5).map(job => {
          const jobId = job.id ?? job._id ?? "";
          const current = getCurrentPrice(job, now);
          const bidCount = job.bidCount ?? 0;
          const comp = getCompetitionBadge(bidCount);

          const matchedSkills = job.skillsRequired.filter(s => mySkills.includes(s));
          const matchScore = job.skillsRequired.length > 0
            ? Math.round((matchedSkills.length / job.skillsRequired.length) * 100) : 0;

          const elapsedHrs = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
          const effectiveRate = getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? bidCount, elapsedHrs);
          const trajectory = getPriceTrajectory(effectiveRate);
          const hourlyRate = job.estimatedHours && job.estimatedHours > 0
            ? Math.round(current / job.estimatedHours) : null;

          const isHighMatch = matchScore >= 75;
          const isMidMatch = matchScore >= 50;
          const isNew = elapsedHrs < 24;

          // Decay progress
          const priceRange = job.startingPrice - job.minimumPrice;
          const decayPct = priceRange > 0 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

          return (
            <Link
              key={jobId}
              href={`/jobs/${jobId}`}
              className="group"
            >
              <div className="card feed-glass-card h-full flex flex-col gap-3 p-4 hover:border-[rgba(201,168,76,0.40)] transition-colors duration-200 relative">
                {isNew && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 px-1.5 rounded-[3px] bg-[#c9a84c] text-[#050810] text-[9px] font-bold flex items-center justify-center feed-badge-pop z-10">
                    NEW
                  </span>
                )}

                {/* Row 1: match badge + comp label */}
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-[2px] font-sans ${
                    isHighMatch
                      ? "bg-[#c9a84c] text-[#050810]"
                      : isMidMatch
                      ? "bg-[rgba(201,168,76,0.15)] text-[#c9a84c] border border-[rgba(201,168,76,0.35)]"
                      : "bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]"
                  }`}>
                    {matchScore}% Match
                  </span>
                  <span className={`text-[9px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-[2px] font-sans ${comp.color} ${comp.bg} border ${comp.border}`}>
                    {comp.label}
                  </span>
                </div>

                {/* Row 2: title */}
                <p className="text-sm font-serif font-normal text-[#f0e8d4] leading-snug line-clamp-2 group-hover:text-[#c9a84c] transition-colors">
                  {job.title}
                </p>

                {/* Row 3: price + hourly */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-serif font-normal text-[#f0e8d4] tabular-nums">
                    {formatMoney(current)}
                  </span>
                  {hourlyRate && (
                    <span className="text-xs text-[#c9a84c] font-sans">${hourlyRate}/hr</span>
                  )}
                </div>

                {/* Row 4: flat progress bar */}
                <div className="h-0.5 bg-[#1a1f30]">
                  <div className="h-0.5 bg-[#c9a84c]" style={{ width: `${decayPct}%` }} />
                </div>

                {/* Row 5: trajectory */}
                <div className="flex items-center gap-1.5 text-[11px] font-sans">
                  <span className={trajectory.color}>{trajectory.icon}</span>
                  <span className="text-[#a8997e]">{trajectory.label}</span>
                  <span className="text-[#a8997e] ml-auto">{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
                </div>

                {/* QuickBid */}
                <button
                  onClick={e => {
                    e.preventDefault();
                    if (onQuickBid) onQuickBid(jobId);
                  }}
                  className="mt-auto btn-primary w-full justify-center text-[11px] tracking-[0.06em] uppercase py-2 rounded-[3px]"
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
