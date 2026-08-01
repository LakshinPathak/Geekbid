"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Code } from "lucide-react";
import PriceDecayDemo from "./PriceDecayDemo";
import { usePointerFine, useMousePosition, useInView, useReducedMotion } from "./hooks";

/* Fixed, hand-authored particle positions — deterministic (never
   Math.random() during render) so there's no SSR/hydration mismatch. */
const PARTICLES = [
  { left: "6%", delay: "0s", duration: "7s", size: 3 },
  { left: "14%", delay: "1.2s", duration: "8.5s", size: 2 },
  { left: "23%", delay: "2.4s", duration: "6.5s", size: 4 },
  { left: "34%", delay: "0.6s", duration: "9s", size: 2 },
  { left: "45%", delay: "3.1s", duration: "7.5s", size: 3 },
  { left: "58%", delay: "1.8s", duration: "8s", size: 2 },
  { left: "67%", delay: "0.3s", duration: "6.8s", size: 3 },
  { left: "76%", delay: "2.9s", duration: "9.5s", size: 2 },
  { left: "84%", delay: "1.4s", duration: "7.2s", size: 4 },
  { left: "92%", delay: "0.9s", duration: "8.2s", size: 2 },
];

const TRUST_BADGES = [
  { icon: "🔒", text: "Escrow Protected" },
  { icon: "⚡", text: "< 4hr Match Time" },
  { icon: "🛡️", text: "Dispute Resolution" },
  { icon: "✨", text: "No Upfront Fees" },
];

const HEADLINE_LINE_1 = "Hire freelancers";
const HEADLINE_LINE_2 = "at the right price";

/* Signature load moment: line 2 of the headline ticks through a few
   decaying price values — the same mechanic the rest of the page
   demonstrates — before settling into the real words. Skips straight
   to the settled text under prefers-reduced-motion. */
const HEADLINE_TICKS = ["$4,200", "$3,150", "$2,050", "$980"];

const MECH_STEPS = [
  { label: "Posted", value: "$2,400 ceiling" },
  { label: "Decaying", value: "−$25 every hour" },
  { label: "Locked in", value: "$1,400 by a freelancer" },
];

/* Live activity ticker — folded in from the old standalone SocialProof
   section (was its own full-width <section>; now a sub-block under the
   CTA/demo area so the page is one section shorter). */
const TICKER_ITEMS = [
  { icon: "⚡", text: "AI Chatbot · $2,450 → accepted in 6h" },
  { icon: "🔒", text: "Kubernetes Hardening · $1,100 · escrow released" },
  { icon: "🔥", text: "DeFi Audit · $2,200 · 8 bids competing" },
  { icon: "🎨", text: "Logo Design · $650 · 5 bids competing" },
  { icon: "✍️", text: "Blog Content · $480 · matched in 3h 20m" },
  { icon: "🎬", text: "Explainer Video · $1,500 · hired at $900" },
  { icon: "⚡", text: "AI Chatbot · $2,450 → accepted in 6h" },
  { icon: "🔒", text: "Kubernetes Hardening · $1,100 · escrow released" },
  { icon: "🔥", text: "DeFi Audit · $2,200 · 8 bids competing" },
  { icon: "🎨", text: "Logo Design · $650 · 5 bids competing" },
  { icon: "✍️", text: "Blog Content · $480 · matched in 3h 20m" },
  { icon: "🎬", text: "Explainer Video · $1,500 · hired at $900" },
];

export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useMousePosition(sectionRef, { x: "--mx", y: "--my" }, isPointerFine);
  const reducedMotion = useReducedMotion();
  const ticker = useInView(0.4);
  // The marquee had no pause mechanism at all — add both mouse and touch,
  // since onMouseEnter/onMouseLeave never fire on touch. A short delay after
  // release avoids resuming mid-swipe.
  const [tickerPaused, setTickerPaused] = useState(false);
  const tickerResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function pauseTicker() {
    if (tickerResumeTimeoutRef.current) clearTimeout(tickerResumeTimeoutRef.current);
    setTickerPaused(true);
  }
  function resumeTickerSoon() {
    tickerResumeTimeoutRef.current = setTimeout(() => setTickerPaused(false), 600);
  }

  // -1 = settled on the real headline text; 0..n = still cycling through
  // HEADLINE_TICKS. Starts ticking immediately on mount so it's finished
  // well before the rest of the staggered entrance below it.
  const [tickPhase, setTickPhase] = useState(reducedMotion ? -1 : 0);
  useEffect(() => {
    if (reducedMotion) { setTickPhase(-1); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= HEADLINE_TICKS.length) {
        clearInterval(id);
        setTickPhase(-1);
      } else {
        setTickPhase(i);
      }
    }, 130);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[85vh] flex items-center justify-center px-6 lg:px-8 pt-12 pb-12 overflow-hidden"
    >
      {/* Animated gradient mesh + grain overlay (new) */}
      <div className="landing-mesh-bg" aria-hidden="true" />
      <div className="landing-grain-overlay" aria-hidden="true" />
      <div className="landing-mouse-glow" aria-hidden="true" />

      {/* Floating ambient particles (new — reuses existing animate-ember) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#5b21b6] animate-ember"
            style={{
              left: p.left,
              bottom: "10%",
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Animated subtle dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none animate-hero-grid"
        style={{ backgroundImage: "radial-gradient(circle, rgba(91,33,182,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      {/* Scan-line — subtle CRT sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hero-scan-line" />
      </div>
      {/* Ambient glows with breathing animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#5b21b6]/[0.06] rounded-full blur-[160px] pointer-events-none animate-breathe" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#5b21b6]/[0.04] rounded-full blur-[130px] pointer-events-none animate-breathe" style={{ animationDelay: "2s", animationDuration: "12s" }} />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#7c3aed]/[0.04] rounded-full blur-[110px] pointer-events-none animate-breathe" style={{ animationDelay: "4s", animationDuration: "8s" }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.3)] to-transparent pointer-events-none" />

      {/* Single flex child of the section (was implicitly true when the
          grid div was the only sibling here) — wrapping it keeps the
          folded-in ticker stacked below the grid instead of becoming a
          second row-direction flex item next to it. */}
      <div className="relative w-full max-w-[1400px] mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: Copy — staggered entrance */}
        <div className="text-center lg:text-left">
          {/* Badge */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
            <div className="inline-flex items-center gap-2 landing-eyebrow text-[#5b21b6] border border-[rgba(91,33,182,0.22)] px-3 py-1.5 rounded-full mb-6 cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5b21b6] animate-pulse inline-block" />
              Live · Reverse Auction Platform
            </div>
          </div>

          <h1 className="landing-header-glow landing-display text-4xl sm:text-5xl md:text-6xl 2xl:text-7xl mb-5">
            <span className="block">
              {HEADLINE_LINE_1.split(" ").map((word, i) => (
                <span
                  key={word}
                  className="landing-word-reveal animate-fade-in-up mr-3"
                  style={{ animationDelay: `${150 + i * 60}ms` }}
                >
                  {word}
                </span>
              ))}
            </span>
            <span className="block animate-fade-in-up" style={{ animationDelay: "270ms" }}>
              <em
                key={tickPhase}
                className={`landing-emphasis not-italic landing-price-tick inline-block ${tickPhase >= 0 ? "font-mono-il tabular-nums" : ""}`}
              >
                {tickPhase >= 0 ? HEADLINE_TICKS[tickPhase] : HEADLINE_LINE_2}
              </em>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#46424e] leading-[1.75] mb-6 max-w-lg mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: "450ms" }}>
            The reverse-auction pricing engine for freelance talent. Post a job, watch the price decay to true market rate, hire at your sweet spot — free to start, and paid plans that cut your platform fee to as low as 5%.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-0 justify-center lg:justify-start">
            <div className="animate-fade-in-up" style={{ animationDelay: "600ms" }}>
              <Link href="/login?tab=register&role=client">
                <button className="group btn-primary text-base px-10 py-4 rounded-full">
                  Start Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Link>
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: "750ms" }}>
              <Link href="/pricing">
                <button className="group btn-ghost text-base px-10 py-4 rounded-full">
                  <Code className="h-4 w-4" /> See Pricing
                </button>
              </Link>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-6">
            {TRUST_BADGES.map((b, i) => (
              <div key={b.text} className="flex items-center gap-1.5 text-sm text-[#46424e] animate-fade-in-up" style={{ animationDelay: `${850 + i * 80}ms` }}>
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Inline mechanism teaser — same low-commitment "expand for
              proof" affordance as the formula/case-study toggles further
              down the page, surfaced here so a skeptical first-time
              visitor gets the gist without leaving the fold. */}
          <details className="landing-mech-toggle group mt-8 max-w-md mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: "950ms" }}>
            <summary className="landing-formula-toggle list-none">
              <span className="landing-formula-toggle-inner landing-label text-[#46424e] group-hover:text-[#5b21b6] transition-colors">
                ◈ Why does the price fall? ◈
              </span>
            </summary>
            <div className="mt-9 px-1">
              <div className="relative h-3">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-[rgba(91,33,182,0.28)]" aria-hidden="true" />
                <span className="landing-mech-dot absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#5b21b6]" style={{ left: 0 }} aria-hidden="true" />
                <div className="relative grid grid-cols-3">
                  {MECH_STEPS.map((s) => (
                    <div key={s.label} className="flex justify-center">
                      <span className="h-3 w-3 rounded-full border-2 border-[#5b21b6] bg-[#fbfaf7]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {MECH_STEPS.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="landing-label text-[#5b21b6]">{s.label}</p>
                    <p className="text-[11px] text-[#46424e] mt-1 leading-snug">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </div>

        {/* Right: Live Price Decay Demo */}
        <div className="animate-fade-in-right flex justify-center" style={{ animationDelay: "500ms" }}>
          <div className="w-full max-w-md">
            <PriceDecayDemo />
          </div>
        </div>
      </div>

      {/* Live activity ticker (folded in from SocialProof) — one restrained
          scroll reveal, no new motion vocabulary. Reduced motion drops the
          marquee scroll and shows the first row as a static strip. */}
      <div
        ref={ticker.ref}
        className="relative w-full mt-12 md:mt-14 border-y border-[rgba(91,33,182,0.15)] bg-[#fbfaf7] py-3 overflow-hidden"
        style={{
          opacity: ticker.inView ? 1 : 0,
          transform: ticker.inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Left gradient fade mask */}
        <div className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none z-10" style={{ background: "linear-gradient(to right, #fbfaf7, transparent)" }} />
        {/* Center glow highlight — items brighten as they pass center */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 100% at 50% 50%, rgba(91,33,182,0.06) 0%, transparent 70%)", zIndex: 5 }} />
        {/* Right gradient fade mask */}
        <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none z-10" style={{ background: "linear-gradient(to left, #fbfaf7, transparent)" }} />
        <div
          className={`flex items-center gap-12 whitespace-nowrap ${reducedMotion ? "" : "animate-marquee"}`}
          style={{ animationPlayState: tickerPaused ? "paused" : "running" }}
          onMouseEnter={pauseTicker}
          onMouseLeave={() => setTickerPaused(false)}
          onTouchStart={pauseTicker}
          onTouchEnd={resumeTickerSoon}
        >
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-[11px] text-[#46424e] shrink-0">
              <span>{item.icon}</span>
              <span>{item.text}</span>
              {i % 6 !== 5 && <span className="text-[rgba(91,33,182,0.3)] ml-4">·</span>}
            </span>
          ))}
        </div>
      </div>
      </div>
    </section>
  );
}
