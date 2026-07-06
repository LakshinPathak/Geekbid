"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useInView } from "./hooks";
import HowItWorks from "./HowItWorks";

const START_PRICE = 4200;
const FLOOR_PRICE = 1450;
const DECAY_PER_TICK = 40;
const TICK_MS = 900;

const LOG_POOL = [
  "sarah_dev bid $3,180 on Kubernetes Migration",
  "Job accepted at $1,920 — DeFi Smart Contract Audit",
  "14 freelancers watching · React Native Rebuild",
  "marcus_k bid $2,640 on ML Recommendation Engine",
  "Price crossed $2,000 · Payments Gateway Integration",
  "Escrow released · $1,750 · Kubernetes Migration",
  "priya_codes bid $2,910 on Mobile App Redesign",
  "New job posted · Terraform Infra Audit · $3,600 start",
  "8 bids in the last hour · GraphQL API Gateway",
  "Accepted at floor $1,450 · Legacy Data Migration",
];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Live-ticking price + scrolling activity log — the reverse-auction
 *  mechanic dramatized as the page's own centerpiece, not a corner
 *  widget. Freezes to a representative static frame under
 *  prefers-reduced-motion instead of running the interval loop. */
function MarketTerminal() {
  const reducedMotion = useReducedMotion();
  const [price, setPrice] = useState(START_PRICE);
  const [tick, setTick] = useState(0);
  const [log, setLog] = useState<{ id: number; text: string }[]>(
    reducedMotion ? [{ id: 0, text: LOG_POOL[1] }] : []
  );
  const logIdRef = useRef(0);
  const poolIdxRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setPrice((prev) => {
        const next = prev - DECAY_PER_TICK;
        return next <= FLOOR_PRICE ? START_PRICE : next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      const text = LOG_POOL[poolIdxRef.current % LOG_POOL.length];
      poolIdxRef.current += 1;
      const entry = { id: logIdRef.current++, text };
      setLog((prev) => [entry, ...prev].slice(0, 4));
    }, 2200);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const pct = Math.min(100, Math.max(0, ((START_PRICE - price) / (START_PRICE - FLOOR_PRICE)) * 100));

  return (
    <div className="relative rounded-[10px] border border-[rgba(201,168,76,0.28)] bg-[#050810]/80 backdrop-blur-sm overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[rgba(201,168,76,0.22)]">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9a84c] animate-live-breathe inline-block" />
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#c9a84c]">Live Market</span>
        </div>
        <span className="text-[11px] text-[#a8997e] font-mono-il">GB-AUCTION//01</span>
      </div>

      <div className="px-5 sm:px-8 py-8 sm:py-10">
        <p className="text-[11px] uppercase tracking-[0.1em] text-[#a8997e] mb-2 font-mono-il">Kubernetes Migration</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            key={tick}
            className="font-mono-il text-6xl sm:text-7xl md:text-[5.5rem] leading-none tabular-nums text-[#f0e8d4] animate-price-tick"
            style={{ letterSpacing: "-0.02em" }}
          >
            ${price.toLocaleString()}
          </span>
          <span className="text-base sm:text-lg text-[#c9a84c] font-mono-il">↘ −${DECAY_PER_TICK}/tick</span>
        </div>

        {/* Decay bar */}
        <div className="h-1 bg-[#1a1f30] mt-6 rounded-full overflow-hidden">
          <div className="h-1 progress-shimmer rounded-full transition-all duration-300 ease-linear" style={{ width: `${100 - pct}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-mono-il text-[#a8997e] mt-2">
          <span>Floor ${FLOOR_PRICE.toLocaleString()}</span>
          <span>Start ${START_PRICE.toLocaleString()}</span>
        </div>
      </div>

      {/* Activity log — terminal order-book feel */}
      <div className="border-t border-[rgba(201,168,76,0.22)] bg-[#03050a] px-5 sm:px-8 py-4 min-h-[168px]">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#a8997e]/70 mb-3 font-mono-il">Activity</p>
        <div className="flex flex-col gap-2.5">
          {log.length === 0 && (
            <p className="text-sm text-[#a8997e]/50 font-mono-il">Waiting for the next tick…</p>
          )}
          {log.map((entry, i) => (
            <p
              key={entry.id}
              className="text-[13px] sm:text-sm text-[#a8997e] font-mono-il truncate landing-log-line"
              style={{ opacity: 1 - i * 0.22 }}
            >
              <span className="text-[#c9a84c] mr-2">›</span>{entry.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PriceDecayShowcase() {
  const section = useInView(0.15);

  return (
    <section
      id="how-it-works"
      ref={section.ref}
      className="relative py-24 sm:py-32 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 70% 60% at 25% 15%, rgba(201,168,76,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 85%, rgba(201,168,76,0.09) 0%, transparent 55%), #060402",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.35)] to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <div
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-[1.15] text-balance">
            The price is never fixed. It&apos;s falling right now.
          </h2>
          <p className="text-base sm:text-lg text-[#a8997e] leading-relaxed mt-5 max-w-md">
            Every job on GeekBid starts high and decays automatically — hour by hour — until a freelancer accepts or the client awards the lowest bid. No haggling. No back-and-forth emails. Just the market finding its real number, live.
          </p>
          <Link href="#how-it-works" className="inline-flex mt-8">
            <button className="group btn-ghost text-sm px-7 py-3.5 rounded-[3px]">
              See how decay works
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>

        {/* Live terminal */}
        <div
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease 150ms, transform 0.7s ease 150ms",
          }}
        >
          <MarketTerminal />
        </div>
      </div>

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8">
        <HowItWorks inView={section.inView} />
      </div>
    </section>
  );
}
