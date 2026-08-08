"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Clock, Percent } from "lucide-react";
import { useInView, useReducedMotion } from "./hooks";

/* Closing section: the hook (badge + headline) and one shared pair of
 * CTA buttons — all on one continuous background rather than a
 * separate full-bleed dark band, so it reads as one section, not two. */
export default function CTA() {
  const payoff = useInView(0.3);
  const headline = useInView(0.5);
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  return (
    <section ref={sectionRef} className="relative grid-bg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Same flanking-ring motif as the Trust section right above —
            a deliberate echo between the two, and it fills the wide
            gutters either side of the centered headline on large
            screens instead of leaving them flat. */}
        <div className="absolute top-1/2 -left-[220px] -translate-y-1/2 h-[440px] w-[440px] rounded-full border border-[rgba(91,33,182,0.1)]" />
        <div className="absolute top-1/2 -left-[220px] -translate-y-1/2 h-[320px] w-[320px] rounded-full border border-[rgba(91,33,182,0.08)]" />
        <div className="absolute top-1/2 -right-[220px] -translate-y-1/2 h-[440px] w-[440px] rounded-full border border-[rgba(91,33,182,0.1)]" />
        <div className="absolute top-1/2 -right-[220px] -translate-y-1/2 h-[320px] w-[320px] rounded-full border border-[rgba(91,33,182,0.08)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.4)] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.2)] to-transparent" />
      </div>

      {/* Two closing stats sitting in the ring space, each reusing a
          claim already established elsewhere on the page (Compare's
          table) rather than inventing new numbers — reinforces the
          decision right at the conversion moment instead of just
          filling space for its own sake. */}
      <div
        className="hidden 2xl:flex absolute left-8 top-1/2 -translate-y-1/2 z-10 w-[196px] flex-col items-start gap-2.5 bg-white border border-[rgba(91,33,182,0.14)] rounded-2xl p-4 text-left shadow-[0_16px_36px_-20px_rgba(91,33,182,0.28)] transition-transform duration-300 hover:-translate-y-1"
        style={{
          opacity: payoff.inView ? 1 : 0,
          transform: payoff.inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease 200ms, transform 0.7s ease 200ms",
        }}
      >
        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-[#5b21b6]/10 text-[#5b21b6] ring-1 ring-[rgba(91,33,182,0.16)]">
          <Clock className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-[#17171f] leading-snug">Hours, not weeks</p>
        <p className="text-xs text-[#46424e] leading-relaxed">Time to hire, start to finish — not the industry&apos;s 2-6 week average.</p>
      </div>
      <div
        className="hidden 2xl:flex absolute right-8 top-1/2 -translate-y-1/2 z-10 w-[196px] flex-col items-start gap-2.5 bg-white border border-[rgba(91,33,182,0.14)] rounded-2xl p-4 text-left shadow-[0_16px_36px_-20px_rgba(91,33,182,0.28)] transition-transform duration-300 hover:-translate-y-1"
        style={{
          opacity: payoff.inView ? 1 : 0,
          transform: payoff.inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease 320ms, transform 0.7s ease 320ms",
        }}
      >
        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-[#5b21b6]/10 text-[#5b21b6] ring-1 ring-[rgba(91,33,182,0.16)]">
          <Percent className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-[#17171f] leading-snug">Fees as low as 5%</p>
        <p className="text-xs text-[#46424e] leading-relaxed">Not the old way&apos;s 15-20%+ commission on every hire.</p>
      </div>

      <div className="relative z-10 pt-14 sm:pt-20 pb-14 sm:pb-20">
        <div ref={payoff.ref} className="mx-auto max-w-6xl px-5 text-center relative z-10">
          <div className="inline-flex items-center gap-2 landing-eyebrow text-[#5b21b6] border border-[rgba(91,33,182,0.22)] px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b21b6] animate-pulse inline-block" />
            Join 2,400+ freelancers on GeekBid
          </div>
          <h2
            ref={headline.ref}
            className="landing-header-glow landing-display text-4xl sm:text-5xl md:text-6xl 2xl:text-7xl text-[#17171f]"
          >
            Ready to hire<br />
            <span className="relative inline-block">
              <svg
                className="absolute -inset-x-[8%] -inset-y-[10%] w-[116%] h-[120%] -z-10"
                viewBox="0 0 220 60"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M8 40 Q 55 20, 110 34 T 212 26"
                  fill="none"
                  stroke="rgba(196,181,253,0.65)"
                  strokeWidth="26"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 300,
                    strokeDashoffset: reducedMotion || headline.inView ? 0 : 300,
                    transition: reducedMotion ? "none" : "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s",
                  }}
                />
              </svg>
              <em className="relative text-[#5b21b6] not-italic">smarter?</em>
            </span>
          </h2>
          <p className="landing-subhead text-base sm:text-lg text-[#46424e] mt-6 max-w-lg mx-auto">
            Join thousands of companies using reverse auctions to find the best freelance talent at the right price.
          </p>
        </div>

        <div className="mx-auto max-w-6xl px-5 text-center relative z-10 mt-10">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login?tab=register&role=client">
              <button className="group btn-primary text-base px-12 py-4 rounded-full">
                Get Started Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/login?tab=register&role=freelancer">
              <button className="btn-ghost text-base px-12 py-4 rounded-full">
                Apply as Freelancer <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
          <p className="text-xs text-[#46424e] mt-6 opacity-60">No credit card required · Free to post · 10% success fee only</p>
        </div>
      </div>
    </section>
  );
}
