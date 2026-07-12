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
      className="group glass-card landing-glass-card landing-tilt-card landing-step-card hover:border-[rgba(91,33,182,0.35)] transition-all duration-300 relative overflow-hidden h-full"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${200 + idx * 80}ms, transform 0.6s ease ${200 + idx * 80}ms` }}
    >
      <span className="absolute top-3 right-3 text-[10px] font-bold font-mono text-[#5b21b6] border border-[rgba(91,33,182,0.28)] bg-[rgba(91,33,182,0.06)] px-1.5 py-0.5 rounded-full tracking-wider">{step.num}</span>
      <div className="relative z-10">
        <div
          className={`h-12 w-12 rounded-xl border ${step.accent} flex items-center justify-center mb-5 ${inView ? "landing-icon-pop" : ""}`}
          style={{ animationDelay: `${200 + idx * 80}ms` }}
        >
          <step.icon className="h-6 w-6" />
        </div>
        <h3 className="landing-card-title text-lg text-[#17171f] mb-2">{step.title}</h3>
        <p className="text-sm sm:text-base text-[#46424e] leading-relaxed">{step.desc}</p>
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
        <h3 className="landing-header-glow landing-h3 text-2xl sm:text-4xl text-[#17171f] max-w-3xl mx-auto text-balance">
          From posting to payment in <span className="text-[#5b21b6]">four</span> simple steps
        </h3>
        <p className="landing-subhead text-base text-[#46424e] max-w-xl mx-auto mt-4">
          Traditional hiring is slow, expensive, and opaque. GeekBid&apos;s algorithmic pricing finds the true market rate automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_40px_1fr_40px_1fr_40px_1fr] gap-5 lg:gap-0 items-stretch">
        {STEPS.map((s, idx) => (
          <Fragment key={s.num}>
            <StepCard step={s} idx={idx} inView={inView} />
            {idx < STEPS.length - 1 && (
              <div className="hidden lg:flex items-center justify-center mt-8 relative self-start">
                <div className="w-full border-t border-dashed border-[rgba(91,33,182,0.28)]" />
                <div
                  className="landing-connector-dot absolute h-1.5 w-1.5 rounded-full bg-[#5b21b6]"
                  style={{ animationDelay: `${idx * 0.4}s` }}
                  aria-hidden="true"
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* Price decay formula callout — collapsed by default to save vertical space */}
      <details className="mt-16 sm:mt-20 group">
        <summary className="landing-formula-toggle list-none">
          <span className="landing-formula-toggle-inner landing-label text-[#46424e] group-hover:text-[#5b21b6] transition-colors">
            ◈ View the Price Decay Formula ◈
          </span>
        </summary>
        <div className="landing-code-block mt-9 font-mono-il text-sm sm:text-base leading-loose">
          <span className="cm">{"// Price Decay Formula"}</span>
          <br />
          <span className="kw">const</span> <span className="vr">currentPrice</span> = <span className="fn">max</span>(
          <br />
          {"  "}<span className="vr">startPrice</span> - (<span className="vr">decayRate</span> * <span className="vr">hoursElapsed</span>),
          <br />
          {"  "}<span className="vr">floorPrice</span>
          <br />
          );
          <br />
          <br />
          <span className="cm">{"// Example: $2,400 → $800 over 64 hours, -$25/hr, floor $800"}</span>
        </div>
        <p className="text-sm text-[#46424e] mt-4 text-center">Prices never go below your configured minimum. You control the speed.</p>
      </details>
    </div>
  );
}
