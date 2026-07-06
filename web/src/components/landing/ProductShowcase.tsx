"use client";

import { Code, Users } from "lucide-react";
import { useInView } from "./hooks";
import { JOB_ROWS } from "./data";

const SHOWCASE_STATS = [
  { label: "Open Jobs", value: "12", sub: "+3 today", color: "text-emerald-400" },
  { label: "Total Value", value: "$24.8K", sub: "Across all jobs", color: "text-[#f0e8d4]" },
  { label: "Avg Decay", value: "$23/hr", sub: "Price reduction", color: "text-[#c9a84c]" },
  { label: "Active Bids", value: "34", sub: "7 new today", color: "text-amber-400" },
];

function MockupFrame() {
  return (
    <div className="relative rounded-[6px] border border-[rgba(201,168,76,0.15)] bg-[#050810] overflow-hidden animate-subtle-float">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[rgba(201,168,76,0.15)]">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <div className="h-3 w-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-[#0d1120]/[0.04] border border-[rgba(201,168,76,0.15)] rounded-[3px] px-4 py-1 text-xs text-[#a8997e] font-mono">geekbid.com/feed</div>
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-5 sm:p-8 relative">
        <div className="landing-fake-cursor" aria-hidden="true" />
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {SHOWCASE_STATS.map((s) => (
            <div key={s.label} className="rounded-[6px] bg-[#111625] border border-[rgba(201,168,76,0.15)] p-4">
              <p className="text-[11px] text-[#a8997e] uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-xl sm:text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-[#a8997e] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Job rows */}
        <div className="rounded-[6px] border border-[rgba(201,168,76,0.15)] overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-[rgba(201,168,76,0.15)] text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">
            <span>Project</span>
            <span className="hidden sm:flex items-center justify-end">Bids</span>
            <span className="text-right">Time Left</span>
            <span className="text-right">Price</span>
          </div>
          {JOB_ROWS.map((job, i) => (
            <div key={job.title} className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 ${i < JOB_ROWS.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-[#111625]/[0.02] transition-colors`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-[3px] bg-[rgba(201,168,76,0.08)] flex items-center justify-center text-[#a8997e] shrink-0">
                  <Code className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#f0e8d4] truncate">{job.title}</p>
                  <div className="flex gap-1.5 mt-0.5">
                    {job.skills.map((s) => <span key={s} className="text-[11px] text-[#a8997e] bg-[rgba(201,168,76,0.06)] px-1.5 py-0.5 rounded-[3px]">{s}</span>)}
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-right">
                <Users className="h-3 w-3 text-[#a8997e]" />
                <span className="text-xs text-[#a8997e]">{job.bids}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#a8997e] font-mono">{job.time}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#f0e8d4]">{job.price}</p>
                <p className="text-[11px] text-emerald-400/90">{"↓"} {job.decay}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  const productSection = useInView(0.1);

  return (
    <section ref={productSection.ref} className="relative py-16 sm:py-24 bg-[#050810]">
      <div className="mx-auto max-w-[1400px] px-5">
        <div className="text-center mb-12" style={{ opacity: productSection.inView ? 1 : 0, transform: productSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
            Your auction feed.<br /><em className="text-[#c9a84c] not-italic">Reimagined.</em>
          </h2>
        </div>

        {/* Browser mockup */}
        <div className="relative" style={{ opacity: productSection.inView ? 1 : 0, transform: productSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 150ms, transform 0.7s ease 150ms" }}>
          <div className="absolute -inset-1 /[0.06] rounded-[6px]" />
          <MockupFrame />
        </div>
      </div>
    </section>
  );
}
