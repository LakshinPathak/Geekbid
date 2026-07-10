"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Code } from "lucide-react";
import PriceDecayDemo from "./PriceDecayDemo";
import { usePointerFine, useMousePosition } from "./hooks";

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

const HEADLINE_LINE_1 = "Hire engineers";
const HEADLINE_LINE_2 = "at the right price";

export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useMousePosition(sectionRef, { x: "--mx", y: "--my" }, isPointerFine);

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
            className="absolute rounded-full bg-[#4b3f8f] animate-ember"
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
        style={{ backgroundImage: "radial-gradient(circle, rgba(75,63,143,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      {/* Scan-line — subtle CRT sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hero-scan-line" />
      </div>
      {/* Ambient glows with breathing animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#4b3f8f]/[0.06] rounded-full blur-[160px] pointer-events-none animate-breathe" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-[#4b3f8f]/[0.04] rounded-full blur-[130px] pointer-events-none animate-breathe" style={{ animationDelay: "2s", animationDuration: "12s" }} />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#9c8fd8]/[0.04] rounded-full blur-[110px] pointer-events-none animate-breathe" style={{ animationDelay: "4s", animationDuration: "8s" }} />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(75,63,143,0.3)] to-transparent pointer-events-none" />

      <div className="relative w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left: Copy — staggered entrance */}
        <div className="text-center lg:text-left">
          {/* Badge */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0ms" }}>
            <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#4b3f8f] border border-[rgba(75,63,143,0.22)] px-3 py-1.5 rounded-full mb-6 font-sans cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4b3f8f] animate-pulse inline-block" />
              Live · Reverse Auction Platform
            </div>
          </div>

          <h1 className="landing-header-glow text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-normal leading-[1.18] mb-5">
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
            <span className="block">
              <em className="landing-gradient-shimmer not-italic">
                {HEADLINE_LINE_2}
              </em>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#6f6a7d] leading-[1.75] mb-6 max-w-lg font-sans mx-auto lg:mx-0 animate-fade-in-up" style={{ animationDelay: "450ms" }}>
            The reverse-auction pricing engine for tech talent. Post a job, watch the price decay to true market rate, hire at your sweet spot — free to start, and paid plans that cut your platform fee to as low as 5%.
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
              <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>
                <button className="group btn-ghost text-base px-10 py-4 rounded-full">
                  <Code className="h-4 w-4" /> See Pricing
                </button>
              </a>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-6">
            {TRUST_BADGES.map((b, i) => (
              <div key={b.text} className="flex items-center gap-1.5 text-sm text-[#6f6a7d] animate-fade-in-up" style={{ animationDelay: `${850 + i * 80}ms` }}>
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Price Decay Demo */}
        <div className="animate-fade-in-right flex justify-center" style={{ animationDelay: "500ms" }}>
          <div className="w-full max-w-sm">
            <PriceDecayDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
