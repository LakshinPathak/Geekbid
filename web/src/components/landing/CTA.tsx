"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useInView } from "./hooks";

const PAYOFF_LINES = ["Friday, 5:04pm.", "Three jobs hired.", "Zero emails sent."];

/* Closing section: a quiet log-line lead-in (merged from the former
 * PayoffBand section), then the hook (badge + headline) and one shared
 * pair of CTA buttons — all on one continuous background rather than a
 * separate full-bleed dark band, so it reads as one section, not two. */
export default function CTA() {
  const payoff = useInView(0.3);

  return (
    <section className="border-t border-[rgba(91,33,182,0.22)] relative grid-bg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="landing-cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#5b21b6]/[0.09] rounded-full blur-[160px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.4)] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.2)] to-transparent" />
      </div>

      <div className="relative z-10 pt-14 sm:pt-20 pb-14 sm:pb-20">
        {/* Lead-in: quiet log-line trace — same background as the headline
            below it, not a separate full-bleed band, so this reads as one
            continuous section instead of two stacked blocks. */}
        <div ref={payoff.ref} className="mx-auto max-w-[600px] px-5 sm:px-8 text-center mb-10 sm:mb-14">
          <div className="flex flex-col items-center gap-3">
            {PAYOFF_LINES.map((line, i) => (
              <div
                key={line}
                className="flex items-center gap-3"
                style={{
                  opacity: payoff.inView ? 1 : 0,
                  transform: payoff.inView ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 0.7s ease ${i * 0.4}s, transform 0.7s ease ${i * 0.4}s`,
                }}
              >
                <span className="h-1 w-1 rounded-full bg-[#5b21b6] shrink-0" aria-hidden="true" />
                <span
                  className={
                    i === 0
                      ? "font-mono-il text-sm text-[#6f6a7d]"
                      : "text-xl sm:text-2xl font-medium text-[#17171f]"
                  }
                >
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-5 text-center relative z-10">
          <div className="inline-flex items-center gap-2 landing-eyebrow text-[#5b21b6] border border-[rgba(91,33,182,0.22)] px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5b21b6] animate-pulse inline-block" />
            Join 2,400+ freelancers on GeekBid
          </div>
          <h2 className="landing-header-glow landing-display text-4xl sm:text-5xl md:text-6xl 2xl:text-7xl text-[#17171f]">
            Ready to hire<br /><em className="text-[#5b21b6] not-italic">smarter?</em>
          </h2>
          <p className="landing-subhead text-base sm:text-lg text-[#46424e] mt-6 max-w-lg mx-auto">
            Join thousands of companies using reverse auctions to find the best freelance talent at the right price.
          </p>
        </div>

        <div className="mx-auto max-w-5xl px-5 text-center relative z-10 mt-10">
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
