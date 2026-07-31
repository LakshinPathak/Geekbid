"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useInView, useReducedMotion } from "./hooks";
import { AUCTIONS, type Auction } from "./data";

interface AuctionState extends Auction {
  current: number;
  flash: boolean;
}

const TICK_MS = 1800;
const FLASH_MS = 350;

function initialState(a: Auction, reducedMotion: boolean): AuctionState {
  return {
    ...a,
    current: reducedMotion ? Math.round((a.start + a.floor) / 2) : a.start,
    flash: false,
  };
}

/* Steps an auction's price down one tick, resetting to a fresh cycle
   (randomized bidders/time) once it reaches its floor — same decay
   shape as MarketTerminal in PriceDecayShowcase.tsx, just applied to
   an array of independent auctions instead of one. */
function decay(a: AuctionState): AuctionState {
  const range = a.start - a.floor;
  const step = Math.max(4, Math.round(range * 0.045));
  const next = a.current - step;

  if (next <= a.floor + step) {
    return {
      ...a,
      current: a.start,
      bidders: Math.max(2, Math.round(Math.random() * 3) + 2),
      secondsLeft: 3000 + Math.round(Math.random() * 6000),
      flash: false,
    };
  }

  return {
    ...a,
    current: next,
    bidders: Math.random() > 0.6 ? a.bidders + 1 : a.bidders,
    flash: true,
  };
}

function formatTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function AuctionCard({ auction, delay }: { auction: AuctionState; delay: number }) {
  const pct = Math.max(
    4,
    Math.min(100, Math.round(((auction.current - auction.floor) / (auction.start - auction.floor)) * 100))
  );

  return (
    <div
      className="bg-[#fbfaf7] border border-[rgba(91,33,182,0.22)] rounded-2xl p-5 sm:p-6 hover:shadow-[0_16px_30px_-14px_rgba(91,33,182,0.2)] hover:border-[rgba(91,33,182,0.4)] transition-all duration-300"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="landing-label text-[#46424e] bg-[#f4f2ee] px-2.5 py-1 rounded-full">
          {auction.category}
        </span>
        <span className="text-[11px] text-[#b3aec0]">{formatTime(auction.secondsLeft)}</span>
      </div>
      <div className="text-[15px] font-medium mb-4 min-h-[40px] text-[#17171f]">
        {auction.title}
      </div>
      <div className="flex items-baseline gap-2.5 mb-2.5">
        <span
          className="font-mono-il text-2xl sm:text-3xl font-medium transition-[color,transform] duration-[400ms] ease-out inline-block"
          style={{
            color: auction.flash ? "#c14d3a" : "#17171f",
            transform: auction.flash ? "scale(1.05)" : "scale(1)",
          }}
        >
          ${auction.current.toLocaleString()}
        </span>
        <span className="font-mono-il text-[13px] text-[#b3aec0] line-through">
          ${auction.start.toLocaleString()}
        </span>
      </div>
      <div className="h-[5px] bg-[#f4f2ee] rounded-full overflow-hidden mb-3.5">
        <div
          className="h-full bg-[#5b21b6] rounded-full transition-[width] duration-[1200ms] ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-[#46424e]">{auction.bidders} freelancers bidding</div>
    </div>
  );
}

/** "Right now on GeekBid" — a grid of independently live-decaying
 *  auctions, dramatizing the same reverse-auction mechanic as
 *  MarketTerminal but as breadth (3 jobs at once) rather than depth
 *  (one job in detail). Freezes to a representative mid-decay frame
 *  under prefers-reduced-motion instead of running the interval. */
export default function LiveAuctions() {
  const section = useInView(0.15);
  const reducedMotion = useReducedMotion();
  const [auctions, setAuctions] = useState<AuctionState[]>(() =>
    AUCTIONS.map((a) => initialState(a, false))
  );

  useEffect(() => {
    if (reducedMotion) {
      setAuctions(AUCTIONS.map((a) => initialState(a, true)));
      return;
    }
    const id = setInterval(() => {
      setAuctions((prev) => prev.map(decay));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const flashed = auctions.some((a) => a.flash);
    if (!flashed) return;
    const t = setTimeout(() => {
      setAuctions((prev) => prev.map((a) => (a.flash ? { ...a, flash: false } : a)));
    }, FLASH_MS);
    return () => clearTimeout(t);
  }, [auctions, reducedMotion]);

  return (
    <section
      ref={section.ref}
      className="@container py-16 sm:py-24 lg:py-20 border-t border-[rgba(91,33,182,0.22)] bg-white"
    >
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:pr-6">
        <div
          className="flex items-end justify-between mb-11 flex-wrap gap-4"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div>
            <p className="landing-label text-[#5b21b6] mb-3 inline-flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[#5b21b6] inline-block ${
                  reducedMotion ? "" : "animate-live-breathe"
                }`}
                aria-hidden="true"
              />
              Right now on GeekBid
            </p>
            <h2 className="landing-h2 text-3xl sm:text-5xl text-[#17171f]">
              Live auctions dropping
            </h2>
          </div>
          <Link
            href="/feed"
            className="text-sm font-medium text-[#5b21b6] hover:text-[#3d3373] transition-colors inline-flex items-center gap-1.5"
          >
            Browse all auctions
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 @[420px]:grid-cols-2 @[860px]:grid-cols-3 gap-5">
          {auctions.map((auction, i) => (
            <div
              key={auction.id}
              style={{
                opacity: section.inView ? 1 : 0,
                transform: section.inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s`,
              }}
            >
              <AuctionCard auction={auction} delay={i * 80} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
