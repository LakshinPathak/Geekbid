"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Flame } from "lucide-react";
import Link from "next/link";
import { useInView, useReducedMotion } from "./hooks";
import { AUCTIONS, CATEGORIES, type Auction } from "./data";

// Category name -> its chip icon, so each card can wear the same glyph as
// its filter chip instead of a bare text pill — one visual language for
// "what kind of job is this" across the whole section.
const CATEGORY_ICON = new Map(CATEGORIES.map((c) => [c.name, c.icon]));

// Below this % of its original range, an auction reads as "closing soon" —
// a small warm flag on top of the plain countdown, using the same
// terracotta the price-drop flash already uses for urgency.
const CLOSING_SOON_PCT = 25;

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

function AuctionCard({ auction, delay, isHottest }: { auction: AuctionState; delay: number; isHottest: boolean }) {
  const pct = Math.max(
    4,
    Math.min(100, Math.round(((auction.current - auction.floor) / (auction.start - auction.floor)) * 100))
  );
  const CatIcon = CATEGORY_ICON.get(auction.category);
  const closingSoon = pct <= CLOSING_SOON_PCT;

  return (
    // The hover lift/shadow/border-brighten was implying these cards were
    // clickable without actually being links — since the data behind them
    // is illustrative (no real per-job page exists), route to /feed, the
    // same destination "Browse all auctions" above already points to.
    <Link
      href="/feed"
      className={`block bg-[#fbfaf7] border rounded-2xl p-5 sm:p-6 hover:shadow-[0_16px_30px_-14px_rgba(91,33,182,0.2)] hover:border-[rgba(91,33,182,0.4)] transition-all duration-300 ${
        isHottest ? "border-[rgba(91,33,182,0.4)] shadow-[0_16px_32px_-18px_rgba(91,33,182,0.35)]" : "border-[rgba(91,33,182,0.22)]"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3.5">
        {isHottest ? (
          <span className="landing-label text-white bg-[#5b21b6] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
            <Flame className="h-3 w-3" />
            Most Bids · {auction.category}
          </span>
        ) : (
          <span className="landing-label text-[#46424e] bg-[#f4f2ee] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
            {CatIcon && <CatIcon className="h-3 w-3" />}
            {auction.category}
          </span>
        )}
        {closingSoon ? (
          <span className="text-[11px] font-medium text-[#c14d3a] inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {formatTime(auction.secondsLeft)}
          </span>
        ) : (
          <span className="text-[11px] text-[#b3aec0]">{formatTime(auction.secondsLeft)}</span>
        )}
      </div>
      <div className="text-[15px] font-medium mb-4 min-h-[40px] text-[#17171f]">
        {auction.title}
      </div>
      <div className="flex items-baseline gap-2.5 mb-2.5">
        <span className="relative inline-flex items-baseline">
          <ChevronDown
            className="h-4 w-4 absolute -left-[18px] top-1/2 text-[#c14d3a] transition-[opacity,transform] duration-300 ease-out"
            style={{
              opacity: auction.flash ? 1 : 0,
              transform: auction.flash ? "translateY(-50%)" : "translateY(-70%)",
            }}
            aria-hidden="true"
          />
          <span
            className="font-mono-il text-2xl sm:text-3xl font-medium transition-[color,transform] duration-[400ms] ease-out inline-block"
            style={{
              color: auction.flash ? "#c14d3a" : "#17171f",
              transform: auction.flash ? "scale(1.05)" : "scale(1)",
            }}
          >
            ${auction.current.toLocaleString()}
          </span>
        </span>
        <span className="font-mono-il text-[13px] text-[#b3aec0] line-through">
          ${auction.start.toLocaleString()}
        </span>
      </div>
      <div className="h-[5px] bg-[#f4f2ee] rounded-full overflow-hidden mb-3.5">
        <div
          className="landing-decay-bar-fill h-full rounded-full transition-[width] duration-[1200ms] ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-[#46424e]">{auction.bidders} freelancers bidding</div>
    </Link>
  );
}

/** "Right now on GeekBid" — a grid of independently live-decaying
 *  auctions, dramatizing the same reverse-auction mechanic as
 *  MarketTerminal but as breadth (many jobs at once) rather than depth
 *  (one job in detail). Freezes to a representative mid-decay frame
 *  under prefers-reduced-motion instead of running the interval.
 *
 *  Absorbs the former standalone Categories section: category chips
 *  filter this same grid instead of rendering a second, parallel
 *  "grid of numbers in cards" a few pixels below — breadth (browse by
 *  category) and depth (watch it decay live) are one interaction. */
export default function LiveAuctions() {
  const section = useInView(0.15);
  const reducedMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
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

  const filtered = useMemo(
    () => (activeCategory ? auctions.filter((a) => a.category === activeCategory) : auctions),
    [auctions, activeCategory]
  );
  const activeCategoryData = CATEGORIES.find((c) => c.name === activeCategory);
  // The card with the most live bidders gets called out — a distinction
  // that shifts on its own as the simulated bidding plays out, instead
  // of a static "featured" flag on one card forever.
  const hottestId = useMemo(
    () => (filtered.length ? filtered.reduce((a, b) => (b.bidders > a.bidders ? b : a)).id : null),
    [filtered]
  );

  return (
    <section
      id="live"
      ref={section.ref}
      className="relative py-16 sm:py-24 bg-white scroll-mt-20 overflow-hidden"
    >
      {/* Soft top wash — bridges the cream-to-white seam with a blob
          instead of an instant color flip, and gives this section (the
          plainest on the page — no ambient glow at all previously) a
          touch of the same atmosphere as its neighbors. */}
      <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#5b21b6]/[0.035] rounded-full blur-[140px] pointer-events-none animate-breathe" aria-hidden="true" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.3)] to-transparent" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1600px] px-5 sm:px-8">
        <div
          className="flex items-end justify-between mb-8 flex-wrap gap-4"
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

        {/* Category chips — breadth (browse by category, with its own
            live count/decay stats) filters the same depth grid below
            instead of duplicating it in a second parallel section. */}
        <div
          className="flex flex-wrap gap-2 mb-6"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 80ms, transform 0.7s ease 80ms",
          }}
        >
          <button
            onClick={() => setActiveCategory(null)}
            className="landing-label px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-full border transition-colors"
            style={{
              color: activeCategory === null ? "#ffffff" : "#46424e",
              backgroundColor: activeCategory === null ? "#5b21b6" : "transparent",
              borderColor: activeCategory === null ? "#5b21b6" : "rgba(91,33,182,0.28)",
            }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(active ? null : cat.name)}
                className="landing-label px-3.5 py-2 min-h-[44px] rounded-full border transition-colors inline-flex items-center gap-1.5"
                style={{
                  color: active ? "#ffffff" : "#46424e",
                  backgroundColor: active ? "#5b21b6" : "transparent",
                  borderColor: active ? "#5b21b6" : "rgba(91,33,182,0.28)",
                }}
              >
                <cat.icon className="h-3 w-3" />
                {cat.name}
                <span style={{ opacity: 0.65 }}>{cat.count}</span>
              </button>
            );
          })}
        </div>

        {activeCategoryData && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 mb-8 text-sm text-[#46424e]">
            <span>
              <span className="font-mono-il text-[#5b21b6]">{activeCategoryData.avgDrop}%</span> avg price drop
            </span>
            <span>
              <span className="font-mono-il text-[#5b21b6]">{activeCategoryData.timeToHire}</span> median time-to-hire
            </span>
          </div>
        )}

        {/* Exactly 3 cards now — a straight jump from 1 column to 3 (no
            2-column middle step) so 3 items never leave an awkward
            leftover single card in its own row at intermediate widths. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {filtered.map((auction, i) => (
            <div
              key={auction.id}
              style={{
                opacity: section.inView ? 1 : 0,
                transform: section.inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.6s ease ${i * 0.08}s, transform 0.6s ease ${i * 0.08}s`,
              }}
            >
              <AuctionCard auction={auction} delay={i * 80} isHottest={auction.id === hottestId} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
