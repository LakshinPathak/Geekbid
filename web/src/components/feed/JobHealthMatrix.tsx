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
 <h2 className="text-xs font-semibold text-[#a8997e] uppercase tracking-wider">
 My Jobs — Health Matrix
 </h2>
 <span className="text-[11px] text-[#6b5f45]">{jobs.length} active</span>
 </div>

 <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
 {jobs.map(job => {
 const jobId = job.id ?? job._id ?? "";
 const current = getCurrentPrice(job, now);
 const health = getJobHealth(job, now);
 const bidCount = job.bidCount ?? 0;

 const borderColor =
 health.label === "Urgent" ? "border-[#c0392b]/35" :
 health.label === "Needs Attention" ? "border-[#c9a84c]/35" :
 health.label === "Healthy" ? "border-[#2e7d52]/35" :
 "border-[rgba(201,168,76,0.15)]";

 const action =
 health.label === "Urgent" ? { label: "Boost", cls: "bg-[#c0392b]/12 text-[#e57373] border-[#c0392b]/22" } :
 health.label === "Needs Attention" ? { label: "Review", cls: "bg-[#c9a84c]/12 text-[#c9a84c] border-[#c9a84c]/22" } :
 bidCount > 0 ? { label: "Accept", cls: "bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border-[rgba(201,168,76,0.22)]" } :
 { label: "View →", cls: "bg-[#111625] text-[#a8997e] border-[rgba(201,168,76,0.15)]" };

 return (
 <Link key={jobId} href={`/jobs/${jobId}`} className="shrink-0 w-[140px] group">
 <div className={`glass-panel rounded-[3px] p-3.5 border ${borderColor} transition-all flex flex-col gap-2`}>
 {/* Health dot + label */}
 <div className="flex items-center gap-1.5">
 <span className={`w-2 h-2 rounded-full ${health.dot}`} />
 <span className={`text-[10px] font-semibold uppercase tracking-wider ${health.color}`}>
 {health.label}
 </span>
 </div>

 {/* Title */}
 <p className="text-xs font-normal text-[#f0e8d4] leading-tight line-clamp-2 group-hover:text-[#c9a84c] transition-colors">
 {job.title}
 </p>

 {/* Current price */}
 <p className="font-heading text-base font-normal text-[#f0e8d4]">{formatMoney(current)}</p>

 {/* Bid count */}
 <div className="flex items-center gap-1 text-[10px] text-[#6b5f45]">
 <Users className="h-3 w-3" />
 <span>{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
 </div>

 {/* Action */}
 <button
 onClick={e => {
 e.preventDefault();
 if (action.label === "Accept" && bidCount > 0 && onAccept) onAccept(jobId);
 }}
 className={`text-[10px] font-semibold py-1.5 px-2 rounded-[3px] border transition-colors ${action.cls}`}
 >
 [{action.label}]
 </button>
 </div>
 </Link>
 );
 })}

 {/* Post new job CTA */}
 <Link href="/post-job" className="shrink-0 w-[140px]">
 <div className="glass-panel rounded-[3px] p-3.5 border border-dashed border-[rgba(201,168,76,0.15)] hover:border-[#c9a84c]/40 transition-all flex flex-col items-center justify-center gap-2 h-full min-h-[140px]">
 <div className="w-8 h-8 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] flex items-center justify-center">
 <span className="text-[#c9a84c] text-lg leading-none">+</span>
 </div>
 <span className="text-[11px] text-[#a8997e] text-center">Post New Job</span>
 </div>
 </Link>
 </div>
 </div>
 );
}
