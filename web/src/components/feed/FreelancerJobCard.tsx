"use client";
import Link from "next/link";
import { getCurrentPrice, getHoursToFloor, formatHoursToFloor, formatMoney, type Job } from "@/lib/utils";
import { getEffectiveDecayRate } from "@/lib/pricing";
import { getCompetitionBadge, getPriceTrajectory } from "./feed-helpers";
import { Clock, Users, ChevronRight, Zap, User } from "lucide-react";

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
  const jobId      = job.id ?? job._id ?? "";
  const current    = getCurrentPrice(job, now);
  const hoursLeft  = getHoursToFloor(job, now);
  const bidCount   = job.bidCount ?? 0;
  const comp       = getCompetitionBadge(bidCount);

  // Match score
  const matchedSkills  = job.skillsRequired.filter(s => mySkills.includes(s));
  const missingSkills  = job.skillsRequired.filter(s => !mySkills.includes(s));
  const matchScore     = job.skillsRequired.length > 0
    ? Math.round((matchedSkills.length / job.skillsRequired.length) * 100) : 0;

  // Match badge color
  const matchColor = matchScore >= 75 ? "bg-[#7A5218] text-white border-0"
    : matchScore >= 50 ? "bg-[#7A5218] text-white border-0"
    : "text-[#253444] bg-[#D8D0C0] border-[#BEB5A5]";

  // Effective hourly
  const elapsedHrs = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
  const effectiveRate = getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? bidCount, elapsedHrs);
  const hourlyRate = job.estimatedHours && job.estimatedHours > 0 ? Math.round(current / job.estimatedHours) : null;

  // Price trajectory
  const trajectory = getPriceTrajectory(effectiveRate);

  // Decay bar
  const priceRange = job.startingPrice - job.minimumPrice;
  const decayPct   = priceRange > 0 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

  const handleQuickBid = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onQuickBid) onQuickBid(jobId);
  };

  return (
    <Link href={`/jobs/${jobId}`} className="block group">
      <div className="glass-panel rounded-2xl p-5 border border-[#BEB5A5] hover:border-[#C8923D] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(15,25,36,0.14)] h-full flex flex-col gap-4">

        {/* ── Header: badges + title ─────────────────────────────────────── */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              {/* Match % badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${matchColor}`}>
                {matchScore}% Match
              </span>
              {/* Competition badge */}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1B2D3E] text-white border-0">
                {comp.label}
              </span>
              {hasMyBid && myBidRank && myBidRank > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#7A5218] text-white border-0">
                  Rank #{myBidRank}
                </span>
              )}
              {hasMyBid && (!myBidRank || myBidRank === 0) && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-[#253444] bg-[#D8D0C0] border-[#BEB5A5]">
                  Bid Placed
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-[#253444] group-hover:text-[#7A5218] transition-colors shrink-0 mt-0.5" />
          </div>

          <h3 className="font-serif text-[15px] font-semibold text-[#0F1924] leading-snug group-hover:text-[#7A5218] transition-colors line-clamp-2">
            {job.title}
          </h3>

          {/* Skill checklist */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {matchedSkills.slice(0, 3).map(s => (
              <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] bg-[#7A5218] text-white border-0">
                ✓ {s}
              </span>
            ))}
            {missingSkills.slice(0, 2).map(s => (
              <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] bg-[#D8D0C0] text-[#253444] border border-[#BEB5A5]">
                ✗ {s}
              </span>
            ))}
          </div>
        </div>

        {/* ── Price + Effective Hourly ────────────────────────────────────── */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[11px] text-[#253444] font-medium uppercase tracking-wider">Current Price</span>
              <p className="font-heading text-2xl font-bold text-[#0F1924]">{formatMoney(current)}</p>
            </div>
            {hourlyRate && (
              <div className="text-right">
                <span className="text-[11px] text-[#253444] font-medium uppercase tracking-wider">Effective/hr</span>
                <p className="font-heading text-lg font-semibold text-[#253444]">${hourlyRate}/hr</p>
              </div>
            )}
          </div>

          {/* Price trajectory */}
          <div className="flex items-center gap-1.5 text-xs mb-2">
            <span className={trajectory.color}>{trajectory.icon}</span>
            <span className="text-[#253444] font-medium">{trajectory.label}</span>
            <span className="text-[#253444]">· {formatMoney(job.decayRatePerHour)}/hr decay</span>
          </div>

          {/* Decay bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#D8D0C0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#C8923D] transition-all duration-500"
                style={{ width: `${decayPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#253444] font-medium">
              <span>Floor {formatMoney(job.minimumPrice)}</span>
              {hoursLeft > 0 && <span className="text-[#7A5218] font-semibold">⏱ {formatHoursToFloor(hoursLeft)} to floor</span>}
              <span>Start {formatMoney(job.startingPrice)}</span>
            </div>
          </div>
        </div>

        {/* ── Client info ─────────────────────────────────────────────────── */}
        {clientName && (
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-[#253444] shrink-0" />
            <span className="text-[10px] text-[#253444] uppercase tracking-wider font-semibold shrink-0">Posted by</span>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
              {clientName[0]}
            </div>
            <span className="text-xs text-[#253444] truncate">{clientName}</span>
            {clientRating && (
              <span className="text-[11px] text-[#7A5218] font-semibold shrink-0">⭐ {clientRating.toFixed(1)}{clientReviewCount ? ` (${clientReviewCount})` : ""}</span>
            )}
          </div>
        )}

        {/* ── Footer: stats + CTA ─────────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-[#BEB5A5]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-[#253444] font-medium">
              {job.estimatedHours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{job.estimatedHours}h
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{bidCount} bid{bidCount !== 1 ? "s" : ""}
              </span>
              {hoursLeft > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{formatHoursToFloor(hoursLeft)} left
                </span>
              )}
            </div>

            {!hasMyBid ? (
              <button
                onClick={handleQuickBid}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0F1924] text-white border-0 hover:bg-[#253444] transition-colors"
              >
                <Zap className="h-3 w-3" />
                Counter →
              </button>
            ) : (
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#D8D0C0] text-[#0F1924] border border-[#BEB5A5] hover:bg-[#BEB5A5] transition-colors">
                View Details →
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
