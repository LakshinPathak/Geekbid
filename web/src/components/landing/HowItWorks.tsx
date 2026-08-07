"use client";

import { Fragment, useRef } from "react";
import { useTilt3D, usePointerFine, useReducedMotion, useInView } from "./hooks";
import { STEPS, type Step } from "./data";
import CaseTimeline from "./CaseTimeline";

// Per-step icon hover class, keyed by step number — each icon animates
// in a way tied to its own meaning instead of one generic pop shared by
// all four: the target pings (acquiring), the trend arrow dips further
// (still dropping), the check draws itself in (confirming), the lock
// presses shut (securing).
const ICON_HOVER_CLASS: Record<string, string> = {
  "01": "step-icon-ping-parent",
  "02": "transition-transform duration-300 group-hover:translate-x-[3px] group-hover:translate-y-[3px] group-hover:-rotate-6",
  "03": "step-icon-draw",
  "04": "step-icon-press",
};

function StepCard({
  step,
  revealed,
  delayMs,
}: {
  step: Step;
  revealed: boolean;
  delayMs: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useTilt3D(cardRef, isPointerFine);
  const iconHoverClass = ICON_HOVER_CLASS[step.num] ?? "";

  return (
    <div
      ref={cardRef}
      className="group glass-card landing-glass-card landing-tilt-card landing-step-card hover:border-[rgba(91,33,182,0.35)] transition-[border-color,box-shadow] duration-300 relative overflow-hidden h-full"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s cubic-bezier(0.2,0.78,0.2,1) ${delayMs}ms, transform 0.6s cubic-bezier(0.2,0.78,0.2,1) ${delayMs}ms`,
      }}
    >
      <span className="absolute top-3 right-3 text-[10px] font-bold font-mono text-[#5b21b6] border border-[rgba(91,33,182,0.28)] bg-[rgba(91,33,182,0.06)] px-1.5 py-0.5 rounded-full tracking-wider">{step.num}</span>
      <div className="relative z-10">
        <div
          className={`relative h-12 w-12 rounded-xl border ${step.accent} flex items-center justify-center mb-5 ${iconHoverClass === "step-icon-ping-parent" ? "" : iconHoverClass}`}
        >
          {iconHoverClass === "step-icon-ping-parent" && (
            <span className="step-icon-ping-ring" aria-hidden="true" />
          )}
          <step.icon className="h-6 w-6" />
        </div>
        <h3 className="landing-card-title text-lg text-[#17171f] mb-2">{step.title}</h3>
        <p className="text-sm sm:text-base text-[#46424e] leading-relaxed">{step.desc}</p>
      </div>
    </div>
  );
}

// Fixed cascade, not scroll-scrubbed — a card/connector reveal tied 1:1 to
// scroll position gets stuck mid-fade the instant the user stops scrolling
// (exactly what happened with the previous implementation: pause partway
// down the section and the last card+connector would just sit there
// half-faded until scrolling resumed, reading as broken rather than
// designed). A one-shot useInView trigger plus a fixed per-track delay
// always finishes the cascade once it starts, regardless of scroll speed
// or whether the user stops scrolling entirely.
const TRACK_DELAY_MS = 130;

/** Nested content only (no <section>/id of its own) — rendered inside
 *  PriceDecayShowcase's section so the live-mechanism demo and the
 *  4-step explanation share one scroll beat instead of two. */
export default function HowItWorks({ inView }: { inView: boolean }) {
  const grid = useInView(0.2);
  const reducedMotion = useReducedMotion();
  const revealed = reducedMotion || grid.inView;

  return (
    <div>
      <div className="text-center mb-10 sm:mb-14" style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
        <h3 className="landing-header-glow landing-h3 text-2xl sm:text-4xl text-[#17171f] max-w-3xl mx-auto text-balance">
          From posting to payment in <span className="text-[#5b21b6]">four</span> simple steps
        </h3>
        <p className="landing-subhead text-base text-[#46424e] max-w-xl mx-auto mt-4">
          Traditional hiring is slow, expensive, and opaque. GeekBid&apos;s algorithmic pricing finds the true market rate automatically.
        </p>
      </div>

      <div ref={grid.ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_40px_1fr_40px_1fr_40px_1fr] gap-5 lg:gap-0 items-stretch">
        {STEPS.map((s, idx) => {
          const cardDelay = reducedMotion ? 0 : idx * 2 * TRACK_DELAY_MS;
          const connectorDelay = reducedMotion ? 0 : (idx * 2 + 1) * TRACK_DELAY_MS;
          return (
            <Fragment key={s.num}>
              <StepCard step={s} revealed={revealed} delayMs={cardDelay} />
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:flex items-center justify-center mt-8 relative self-start">
                  <div className="w-full border-t border-dashed border-[rgba(91,33,182,0.28)]" />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-[#5b21b6]"
                    style={{
                      width: revealed ? "100%" : "0%",
                      transition: reducedMotion ? "none" : `width 0.5s cubic-bezier(0.2,0.78,0.2,1) ${connectorDelay}ms`,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 ${revealed && !reducedMotion ? "landing-connector-travel" : ""}`}
                    style={
                      revealed && !reducedMotion
                        ? { animationDelay: `${connectorDelay}ms` }
                        : { left: "0%", opacity: 0 }
                    }
                    aria-hidden="true"
                  >
                    {/* Nested so the pulse keyframe's own `transform: scale(...)`
                        doesn't clobber the outer element's centering translate —
                        CSS animations replace inline transforms outright rather
                        than composing with them. */}
                    <span className="landing-connector-dot block h-full w-full rounded-full bg-[#5b21b6]" />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* One real case, start to finish — demoted from its own top-level
          section (was a fourth re-demonstration of the same decay/bid
          mechanic MarketTerminal already shows live above) into concrete
          proof, shown directly rather than gated behind a click. */}
      <div
        className="mt-16 sm:mt-20"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.6s ease 600ms, transform 0.6s ease 600ms",
        }}
      >
        <p className="landing-label text-[#5b21b6] text-center mb-5">A Real Case, Start to Finish</p>
        <CaseTimeline />
      </div>
    </div>
  );
}
