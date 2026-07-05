"use client";

import { Zap, Check, X } from "lucide-react";
import { useInView } from "./hooks";
import { COMPARISONS } from "./data";
import SectionDivider from "./SectionDivider";

export default function Comparison() {
  const comparisonSection = useInView(0.08);

  return (
    <section id="compare" ref={comparisonSection.ref} className="relative py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] overflow-hidden">
      {/* Per-section ambient tint (cool blue, distinct from the gold used elsewhere) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[140px] pointer-events-none animate-breathe" aria-hidden="true" />

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <div className="text-center mb-16" style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
          <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">Why GeekBid</p>
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
            Traditional hiring is broken
          </h2>
          <p className="text-base text-[#a8997e] max-w-lg mx-auto mt-5">
            See how GeekBid&apos;s reverse auction model compares to the old way of sourcing engineering talent.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div className="glass-panel overflow-hidden min-w-[500px]" style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 150ms, transform 0.7s ease 150ms" }}>
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-[rgba(201,168,76,0.22)]">
              <div className="p-4 sm:p-5 text-sm font-semibold text-[#a8997e]" />
              <div className="p-4 sm:p-5 text-center border-x border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.06)]">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4 text-[#c9a84c]" />
                  <span className="text-sm font-bold text-[#c9a84c]">GeekBid</span>
                </div>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-semibold text-[#a8997e]">Traditional</span>
              </div>
            </div>

            {/* Rows */}
            {COMPARISONS.map((c, i) => (
              <div key={c.feature} className={`grid grid-cols-[1fr_1fr_1fr] hover:bg-[rgba(201,168,76,0.04)] transition-colors ${i < COMPARISONS.length - 1 ? "border-b border-[rgba(201,168,76,0.22)]" : ""}`} style={{ opacity: comparisonSection.inView ? 1 : 0, transform: comparisonSection.inView ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.5s ease ${300 + i * 60}ms, transform 0.5s ease ${300 + i * 60}ms` }}>
                <div className="p-4 sm:p-5 text-sm sm:text-base font-medium text-[#a8997e]">{c.feature}</div>
                <div className="p-4 sm:p-5 text-center border-x border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.03)]">
                  <div className="flex items-start justify-center gap-2">
                    <Check className="h-4 w-4 text-[#c9a84c] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-[#c9a84c] font-medium">{c.geekbid}</span>
                  </div>
                </div>
                <div className="p-4 sm:p-5 text-center">
                  <div className="flex items-start justify-center gap-2">
                    <X className="h-4 w-4 text-[#a8997e] shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base text-[#a8997e]">{c.traditional}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionDivider variant="diagonal" fill="#080b14" />
    </section>
  );
}
