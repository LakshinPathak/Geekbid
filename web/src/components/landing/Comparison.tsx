"use client";

import { Zap, Check, X } from "lucide-react";
import { useInView } from "./hooks";
import { COMPARISONS } from "./data";

/** The "why us" comparison table — lives on its own dedicated /compare
 *  page (linked from Nav), same as Pricing and FAQ, rather than as an
 *  in-page landing section. No <section> of its own since the page
 *  shell around it owns that. */
export default function Comparison() {
  const comparisonSection = useInView(0.08);

  return (
    <div ref={comparisonSection.ref} className="relative">
      {/* Per-section ambient tint (cool blue, distinct from the gold used elsewhere) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#5b21b6]/[0.04] rounded-full blur-[140px] pointer-events-none animate-breathe" aria-hidden="true" />

      <div id="compare" className="relative mx-auto max-w-6xl px-5 sm:px-8 scroll-mt-20">
        <div className="text-center mb-12" style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
          <h2 className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#17171f]">
            Why <span className="text-[#5b21b6]">GeekBid</span>, not the old way
          </h2>
          <p className="landing-subhead text-base text-[#46424e] max-w-lg mx-auto mt-5">
            Everything built into the platform, and how it stacks up against the old way of sourcing freelance talent.
          </p>
        </div>

        {/* Below ~550px the table's min-w-[500px] no longer fits and this
            scrolls horizontally — the fade mask + caption make that
            swipeable-ness visible instead of the table just looking cut
            off with only a thin native scrollbar as the only clue. */}
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-2 w-10 pointer-events-none z-10 sm:hidden" style={{ background: "linear-gradient(to left, #ffffff, transparent)" }} />
          <div className="overflow-x-auto">
          <div className="glass-panel overflow-hidden min-w-[500px]" style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 150ms, transform 0.7s ease 150ms" }}>
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-[rgba(91,33,182,0.22)]">
              <div className="p-4 sm:p-5 text-sm font-semibold text-[#46424e]" />
              <div className="p-4 sm:p-5 text-center border-x border-[rgba(91,33,182,0.22)] bg-[rgba(91,33,182,0.06)]">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-[#5b21b6]" />
                  <span className="text-sm font-bold text-[#5b21b6]">GeekBid</span>
                </div>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-semibold text-[#46424e]">Traditional</span>
              </div>
            </div>

            {/* Rows */}
            {COMPARISONS.map((c, i) => (
              <div key={c.feature} className={`grid grid-cols-[1fr_1fr_1fr] hover:bg-[rgba(91,33,182,0.04)] transition-colors ${i < COMPARISONS.length - 1 ? "border-b border-[rgba(91,33,182,0.22)]" : ""}`} style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.5s ease ${300 + i * 60}ms, transform 0.5s ease ${300 + i * 60}ms` }}>
                <div className="p-4 sm:p-5 text-sm sm:text-base font-medium text-[#46424e]">{c.feature}</div>
                <div className="p-4 sm:p-5 text-center border-x border-[rgba(91,33,182,0.22)] bg-[rgba(91,33,182,0.03)]">
                  <div className="flex items-start justify-center gap-2">
                    <Check className="h-4 w-4 text-[#5b21b6] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-[#5b21b6] font-medium">{c.geekbid}</span>
                  </div>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <div className="flex items-start justify-center gap-2">
                    <X className="h-4 w-4 text-[#46424e] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-[#46424e]">{c.traditional}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
        <p className="sm:hidden text-center text-xs text-[#46424e]/70 mt-3">Swipe to see the Traditional column →</p>
      </div>
    </div>
  );
}
