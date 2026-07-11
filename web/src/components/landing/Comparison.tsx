"use client";

import { Zap, Check, X } from "lucide-react";
import { useInView } from "./hooks";
import { COMPARISONS, FEATURES } from "./data";

/** Nested content only (no <section> of its own) — rendered inside
 *  WhyGeekBidSection alongside PricingSection so "why us" and "what
 *  it costs" share one scroll beat instead of two. */
export default function Comparison() {
  const comparisonSection = useInView(0.08);

  return (
    <div ref={comparisonSection.ref} className="relative">
      {/* Per-section ambient tint (cool blue, distinct from the gold used elsewhere) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#4b3f8f]/[0.04] rounded-full blur-[140px] pointer-events-none animate-breathe" aria-hidden="true" />

      <div id="compare" className="relative mx-auto max-w-5xl px-5 sm:px-8 scroll-mt-20">
        <div className="text-center mb-12" style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
          <h2 className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#3d3a45]">
            Why <span className="text-[#4b3f8f]">GeekBid</span>, not the old way
          </h2>
          <p className="landing-subhead text-base text-[#6f6a7d] max-w-lg mx-auto mt-5">
            Everything built into the platform, and how it stacks up against the old way of sourcing engineering talent.
          </p>
        </div>

        {/* Platform features — icon strip (folded in from the old standalone Features section) */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 mb-14"
          style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(16px)", transition: "opacity 0.6s ease 80ms, transform 0.6s ease 80ms" }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className={`flex items-center gap-2 pl-2.5 pr-4 py-2 rounded-full border ${f.iconBorder} ${f.iconBg}`}>
              <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              <span className="text-xs font-medium text-[#3d3a45] whitespace-nowrap">{f.title}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="glass-panel overflow-hidden min-w-[500px]" style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 150ms, transform 0.7s ease 150ms" }}>
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-[rgba(75,63,143,0.22)]">
              <div className="p-4 sm:p-5 text-sm font-semibold text-[#6f6a7d]" />
              <div className="p-4 sm:p-5 text-center border-x border-[rgba(75,63,143,0.22)] bg-[rgba(75,63,143,0.06)]">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-[#4b3f8f]" />
                  <span className="text-sm font-bold text-[#4b3f8f]">GeekBid</span>
                </div>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-semibold text-[#6f6a7d]">Traditional</span>
              </div>
            </div>

            {/* Rows */}
            {COMPARISONS.map((c, i) => (
              <div key={c.feature} className={`grid grid-cols-[1fr_1fr_1fr] hover:bg-[rgba(75,63,143,0.04)] transition-colors ${i < COMPARISONS.length - 1 ? "border-b border-[rgba(75,63,143,0.22)]" : ""}`} style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.5s ease ${300 + i * 60}ms, transform 0.5s ease ${300 + i * 60}ms` }}>
                <div className="p-4 sm:p-5 text-sm sm:text-base font-medium text-[#6f6a7d]">{c.feature}</div>
                <div className="p-4 sm:p-5 text-center border-x border-[rgba(75,63,143,0.22)] bg-[rgba(75,63,143,0.03)]">
                  <div className="flex items-start justify-center gap-2">
                    <Check className="h-4 w-4 text-[#4b3f8f] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-[#4b3f8f] font-medium">{c.geekbid}</span>
                  </div>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <div className="flex items-start justify-center gap-2">
                    <X className="h-4 w-4 text-[#6f6a7d] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-[#6f6a7d]">{c.traditional}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
