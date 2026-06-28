"use client";
import Link from "next/link";
import { getCurrentPrice, getHoursToFloor, formatHoursToFloor, formatMoney, type Job } from "@/lib/utils";
import { getJobHealth, getCompetitionBadge } from "./feed-helpers";
import { Clock, CheckCircle, Users, TrendingDown, ChevronRight } from "lucide-react";


// ── Demand badge ──────────────────────────────────────────────────────────────
function getDemandBadge(bidCount: number) {
  if (bidCount === 0) return { label: "No Bids",   color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    };
  if (bidCount <= 2)  return { label: "Interested", color: "text-[#C8923D]",  bg: "bg-[rgba(200,146,61,0.10)]",  border: "border-[#C8923D]/30"  };
  if (bidCount <= 4)  return { label: "In Demand",  color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
  return                     { label: "Hot",        color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" };
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
  const jobId      = job.id ?? job._id ?? "";
  const current    = getCurrentPrice(job, now);
  const savings    = Math.max(0, job.startingPrice - current);
  const hoursLeft  = getHoursToFloor(job, now);
  const health     = getJobHealth(job, now);
  const demand     = getDemandBadge(job.bidCount ?? 0);
  const bidCount   = job.bidCount ?? 0;

  // Decay progress bar (0 = floor, 1 = starting)
  const priceRange = job.startingPrice - job.minimumPrice;
  const decayPct   = priceRange > 0 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

  const handleAcceptBest = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAcceptBest && bidCount > 0) onAcceptBest(jobId);
  };

  return (
    <Link href={`/jobs/${jobId}`} className="block group">
      <div className="glass-panel rounded-2xl p-5 border border-[#E4DDD0] hover:border-[#C8923D]/40 transition-all duration-200 hover:shadow-[var(--shadow-md)] h-full flex flex-col gap-4">

        {/* ── Header: badges + title ─────────────────────────────────────── */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              {/* Health badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                health.label === "Urgent"          ? "text-red-400 bg-red-500/10 border-red-500/20" :
                health.label === "Needs Attention" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
                health.label === "Healthy"         ? "text-[#C8923D] bg-[rgba(200,146,61,0.10)] border-[#C8923D]/30" :
                                                    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                {health.label}
              </span>
              {/* Demand badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${demand.color} ${demand.bg} ${demand.border}`}>
                {demand.label}
              </span>
              {isOwn && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border text-purple-400 bg-purple-500/10 border-purple-500/20">
                  My Job
                </span>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-[#7B8694] group-hover:text-[#C8923D] transition-colors shrink-0 mt-0.5" />
          </div>

          <h3 className="font-heading text-[15px] font-semibold text-[#182739] leading-snug group-hover:text-[#C8923D] transition-colors line-clamp-2">
            {job.title}
          </h3>

          {/* Skills */}
          <div className="flex flex-wrap gap-1 mt-2">
            {job.skillsRequired.slice(0, 3).map(s => (
              <span key={s} className="px-2 py-0.5 rounded-md text-[11px] bg-[#F5F2EA] text-[#3D4E5C] border border-[#E4DDD0]">{s}</span>
            ))}
            {job.skillsRequired.length > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-[#F5F2EA] text-[#7B8694] border border-[#E4DDD0]">+{job.skillsRequired.length - 3}</span>
            )}
          </div>
        </div>

        {/* ── Price + Savings ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[11px] text-[#7B8694] uppercase tracking-wider">Current Price</span>
              <p className="font-heading text-2xl font-bold text-[#182739]">{formatMoney(current)}</p>
            </div>
            {savings > 0 && (
              <div className="text-right">
                <span className="text-[11px] text-[#7B8694] uppercase tracking-wider">Savings</span>
                <p className="font-heading text-lg font-semibold text-[#C8923D]">-{formatMoney(savings)}</p>
              </div>
            )}
          </div>

          {/* Decay bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-[#F5F2EA] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-[#C8923D] transition-all duration-500"
                style={{ width: `${decayPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#7B8694]">
              <span>Floor {formatMoney(job.minimumPrice)}</span>
              <span>Start {formatMoney(job.startingPrice)}</span>
            </div>
          </div>
        </div>

        {/* ── Top Bidders Preview ─────────────────────────────────────────── */}
        {topBidders.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-[#7B8694] uppercase tracking-wider font-semibold">Top Bidders</p>
            {topBidders.slice(0, 2).map((b, i) => (
              <div key={b.freelancerId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-[#C8923D]/20 text-[#C8923D]" : "bg-[#F5F2EA] text-[#3D4E5C]"}`}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-[#3D4E5C]">{b.name}</span>
                  <span className="text-[10px] text-[#7B8694]">GS {b.geekScore}</span>
                </div>
                <span className="font-heading text-sm font-semibold text-[#182739]">{formatMoney(b.price)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            <Users className="h-3.5 w-3.5 text-[#7B8694]" />
            <span className="text-xs text-[#7B8694]">No bids yet — be the first</span>
          </div>
        )}

        {/* ── Footer: stats + CTA ─────────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-[#E4DDD0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px] text-[#7B8694]">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{bidCount} bid{bidCount !== 1 ? "s" : ""}
              </span>
              {job.estimatedHours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{job.estimatedHours}h
                </span>
              )}
              {hoursLeft > 0 && (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />{formatHoursToFloor(hoursLeft)} left
                </span>
              )}
            </div>

            {isOwn && bidCount > 0 && onAcceptBest ? (
              <button
                onClick={handleAcceptBest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[rgba(200,146,61,0.10)] text-[#C8923D] border border-[#C8923D]/40 hover:bg-[rgba(200,146,61,0.10)] transition-colors"
              >
                <CheckCircle className="h-3 w-3" />
                Accept Best
              </button>
            ) : (
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F5F2EA] text-[#3D4E5C] border border-[#E4DDD0] hover:border-[#C8923D]/30 hover:text-[#C8923D] transition-colors">
                View Bids →
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
