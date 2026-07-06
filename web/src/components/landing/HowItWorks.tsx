"use client";

import { Fragment, useRef } from "react";
import { useTilt3D, usePointerFine } from "./hooks";
import { STEPS, type Step } from "./data";

function StepCard({ step, idx, inView }: { step: Step; idx: number; inView: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useTilt3D(cardRef, isPointerFine);

  return (
    <div
      ref={cardRef}
      className="group glass-card landing-glass-card landing-tilt-card hover:border-[rgba(201,168,76,0.35)] transition-all duration-300 relative overflow-hidden"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${200 + idx * 80}ms, transform 0.6s ease ${200 + idx * 80}ms` }}
    >
      <span className="absolute top-3 right-3 text-[10px] font-bold font-mono text-[#c9a84c] border border-[rgba(201,168,76,0.28)] bg-[rgba(201,168,76,0.06)] px-1.5 py-0.5 rounded-[2px] tracking-wider">{step.num}</span>
      <div className="relative z-10">
        <div
          className={`h-10 w-10 rounded-[6px] border ${step.accent} flex items-center justify-center mb-5 ${inView ? "landing-icon-pop" : ""}`}
          style={{ animationDelay: `${200 + idx * 80}ms` }}
        >
          <step.icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-serif font-normal text-[#f0e8d4] mb-2">{step.title}</h3>
        <p className="text-sm sm:text-base text-[#a8997e] leading-relaxed">{step.desc}</p>
      </div>
    </div>
  );
}

/** Nested content only (no <section>/id of its own) — rendered inside
 *  PriceDecayShowcase's section so the live-mechanism demo and the
 *  4-step explanation share one scroll beat instead of two. */
export default function HowItWorks({ inView }: { inView: boolean }) {
  return (
    <div className="mt-20 sm:mt-28">
      <div className="text-center mb-10 sm:mb-14" style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
        <h3 className="landing-header-glow text-2xl sm:text-4xl font-serif font-normal text-[#f0e8d4] leading-tight max-w-3xl mx-auto text-balance">
          From posting to payment in <span className="text-[#c9a84c]">four</span> simple steps
        </h3>
        <p className="text-base text-[#a8997e] max-w-xl mx-auto mt-4">
          Traditional hiring is slow, expensive, and opaque. GeekBid&apos;s algorithmic pricing finds the true market rate automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr] gap-4 lg:gap-0 items-start">
        {STEPS.map((s, idx) => (
          <Fragment key={s.num}>
            <StepCard step={s} idx={idx} inView={inView} />
            {idx < STEPS.length - 1 && (
              <div className="hidden lg:flex items-center justify-center mt-8 relative">
                <div className="w-full border-t border-dashed border-[rgba(201,168,76,0.28)]" />
                <div
                  className="landing-connector-dot absolute h-1.5 w-1.5 rounded-full bg-[#c9a84c]"
                  style={{ animationDelay: `${idx * 0.4}s` }}
                  aria-hidden="true"
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* Price decay formula callout — collapsed by default to save vertical space */}
      <details className="mt-10 glass-panel p-5 sm:p-6 text-center scanline group">
        <summary className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] cursor-pointer list-none hover:text-[#c9a84c] transition-colors">
          ◈ View the Price Decay Formula ◈
        </summary>
        <div className="mt-5">
          <p className="text-xl sm:text-2xl md:text-3xl font-mono-il text-[#a8997e] tracking-tight">
            <span className="text-[#c9a84c]">currentPrice</span>
            {" = max("}
            <span className="text-[#f0e8d4]/80">startPrice</span>
            {" − "}
            <span className="text-[#c9a84c]">decayRate</span>
            {" × "}
            <span className="text-[#c9a84c]">hours</span>
            {", "}
            <span className="text-[#f0e8d4]/80">floor</span>
            {")"}
          </p>
          <p className="text-sm text-[#a8997e] mt-3">Prices never go below your configured minimum. You control the speed.</p>
        </div>
      </details>
    </div>
  );
}
