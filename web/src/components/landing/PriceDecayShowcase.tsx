"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useInView, useReducedMotion } from "./hooks";
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
  "alex_codes bid $2,910 on Mobile App Redesign",
  "New job posted · Terraform Infra Audit · $3,600 start",
  "8 bids in the last hour · GraphQL API Gateway",
  "Accepted at floor $1,450 · Legacy Data Migration",
];

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
    <div className="relative rounded-2xl border border-[rgba(91,33,182,0.28)] bg-[#ffffff]/80 backdrop-blur-sm overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[rgba(91,33,182,0.22)]">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[#5b21b6] animate-live-breathe inline-block" />
          <span className="landing-label text-[#5b21b6] text-[11px]">Live Market</span>
        </div>
        <span className="landing-label text-[#46424e] text-[11px] font-mono-il tracking-normal normal-case">GB-AUCTION//01</span>
      </div>

      <div className="px-6 sm:px-9 py-9 sm:py-12">
        <p className="landing-label text-[#46424e] mb-3 font-mono-il">Kubernetes Migration</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            key={tick}
            className="font-mono-il text-5xl sm:text-6xl md:text-7xl 2xl:text-[5.5rem] leading-none tabular-nums text-[#16a34a] landing-price-tick"
            style={{ letterSpacing: "-0.02em" }}
          >
            ${price.toLocaleString()}
          </span>
          <span className="text-base sm:text-lg text-[#5b21b6] font-mono-il">↘ −${DECAY_PER_TICK}/tick</span>
        </div>

        {/* Decay bar */}
        <div className="h-1.5 bg-[#f2ecfc] mt-8 rounded-full overflow-hidden">
          <div className="h-1.5 landing-decay-bar-fill rounded-full transition-all duration-300 ease-linear" style={{ width: `${100 - pct}%` }} />
        </div>
        <div className="flex justify-between landing-label text-[#46424e] mt-3 font-mono-il tracking-normal normal-case">
          <span>Floor ${FLOOR_PRICE.toLocaleString()}</span>
          <span>Start ${START_PRICE.toLocaleString()}</span>
        </div>
      </div>

      {/* Activity log — terminal order-book feel */}
      <div className="border-t border-[rgba(91,33,182,0.22)] bg-[#ffffff] px-6 sm:px-9 py-5 sm:py-6 min-h-[180px]">
        <p className="landing-label text-[#46424e]/70 mb-4 font-mono-il">Activity</p>
        <div className="flex flex-col gap-3">
          {log.length === 0 && (
            <p className="text-sm text-[#46424e]/50 font-mono-il">Waiting for the next tick…</p>
          )}
          {log.map((entry, i) => (
            <p
              key={entry.id}
              className="text-[13px] sm:text-sm text-[#46424e] font-mono-il truncate landing-log-line leading-relaxed"
              style={{ opacity: 1 - i * 0.22 }}
            >
              <span className="text-[#5b21b6] mr-2">›</span>{entry.text}
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
      className="relative py-16 sm:py-24 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 70% 60% at 25% 15%, rgba(91,33,182,0.14) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 85%, rgba(91,33,182,0.09) 0%, transparent 55%), #fbfaf7",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.35)] to-transparent" />

      <div className="relative mx-auto max-w-[1400px] px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <div
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <h2 className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#17171f] text-balance">
            The price is never fixed. It&apos;s falling right now.
          </h2>
          <p className="landing-subhead text-base sm:text-lg text-[#46424e] mt-5 max-w-md">
            Every job on GeekBid starts high and decays automatically — hour by hour — until a freelancer accepts or the client awards the lowest bid. No haggling. No back-and-forth emails. Just the market finding its real number, live.
          </p>
          <Link href="#how-it-works" className="inline-flex mt-8">
            <button className="group btn-ghost text-sm px-7 py-3.5 rounded-full">
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
