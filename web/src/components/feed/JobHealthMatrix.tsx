"use client";
import Link from "next/link";
import { getCurrentPrice, formatMoney, type Job } from "@/lib/utils";
import { getJobHealth } from "./feed-helpers";
import { Users, ChevronRight } from "lucide-react";

interface JobHealthMatrixProps {
  jobs: Job[];
  now: Date;
  onAccept?: (jobId: string) => void;
}

export default function JobHealthMatrix({ jobs, now, onAccept }: JobHealthMatrixProps) {
  if (jobs.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#253444] uppercase tracking-wider">
          My Jobs — Health Matrix
        </h2>
        <span className="text-[11px] text-[#4A5568]">{jobs.length} active</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {jobs.map(job => {
          const jobId   = job.id ?? job._id ?? "";
          const current = getCurrentPrice(job, now);
          const health  = getJobHealth(job, now);
          const bidCount = job.bidCount ?? 0;

          const borderColor =
            health.label === "Urgent"          ? "border-red-500/40"    :
            health.label === "Needs Attention" ? "border-yellow-500/40" :
            health.label === "Healthy"         ? "border-[#C8923D]/40"  :
                                                "border-yellow-500/30";

          const action =
            health.label === "Urgent"          ? { label: "Boost",   cls: "bg-red-500/15 text-[#B02020] border-[rgba(176,32,32,0.30)]" } :
            health.label === "Needs Attention" ? { label: "Review",  cls: "bg-yellow-500/15 text-[#7A5218] border-yellow-500/30" } :
            bidCount > 0                       ? { label: "Accept",  cls: "bg-[rgba(122,82,24,0.12)] text-[#7A5218] border-[#C8923D]/40" } :
                                                 { label: "View →",  cls: "bg-[#D8D0C0] text-[#253444] border-[#BEB5A5]" };

          return (
            <Link key={jobId} href={`/jobs/${jobId}`} className="shrink-0 w-[140px] group">
              <div className={`glass-panel rounded-xl p-3.5 border ${borderColor} hover:shadow-[0_0_16px_rgba(200,146,61,0.06)] transition-all flex flex-col gap-2`}>
                {/* Health dot + label */}
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${health.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${health.color}`}>
                    {health.label}
                  </span>
                </div>

                {/* Title */}
                <p className="text-xs font-semibold text-[#0F1924] leading-tight line-clamp-2 group-hover:text-[#C8923D] transition-colors">
                  {job.title}
                </p>

                {/* Current price */}
                <p className="font-heading text-base font-bold text-[#0F1924]">{formatMoney(current)}</p>

                {/* Bid count */}
                <div className="flex items-center gap-1 text-[10px] text-[#4A5568]">
                  <Users className="h-3 w-3" />
                  <span>{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
                </div>

                {/* Action */}
                <button
                  onClick={e => {
                    e.preventDefault();
                    if (action.label === "Accept" && bidCount > 0 && onAccept) onAccept(jobId);
                  }}
                  className={`text-[10px] font-semibold py-1.5 px-2 rounded-lg border transition-colors ${action.cls}`}
                >
                  [{action.label}]
                </button>
              </div>
            </Link>
          );
        })}

        {/* Post new job CTA */}
        <Link href="/post-job" className="shrink-0 w-[140px]">
          <div className="glass-panel rounded-xl p-3.5 border border-dashed border-[#BEB5A5] hover:border-[#C8923D]/40 transition-all flex flex-col items-center justify-center gap-2 h-full min-h-[140px]">
            <div className="w-8 h-8 rounded-full bg-[rgba(200,146,61,0.10)] border border-[#C8923D]/30 flex items-center justify-center">
              <span className="text-[#C8923D] text-lg leading-none">+</span>
            </div>
            <span className="text-[11px] text-[#4A5568] text-center">Post New Job</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
