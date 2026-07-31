"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./hooks";

/* ─── Live price decay demo (moved verbatim, plus a new price-tick-
   synced glow orb layered behind the card). Freezes to a representative
   static frame under prefers-reduced-motion instead of running the
   interval loop — same pattern as PriceDecayShowcase's MarketTerminal.
   Also loops back to the start price once it hits the floor, same as
   MarketTerminal, rather than stopping dead — a visitor who lingers on
   the page shouldn't see the "live" demo go permanently stale. */
export default function PriceDecayDemo() {
  const reducedMotion = useReducedMotion();
  const [price, setPrice] = useState(2400);
  const [elapsed, setElapsed] = useState(0);
  const [flashCount, setFlashCount] = useState(0);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number }>>([]);
  const sparkIdRef = useRef(0);
  const tickRef = useRef(0);
  const MIN = 800;
  const DECAY = 25;

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setFlashCount((n) => n + 1);
      tickRef.current += 1;
      if (tickRef.current % 3 === 0) {
        const ids = [sparkIdRef.current++, sparkIdRef.current++];
        setSparks((p) => [...p, ...ids.map((sid) => ({ id: sid, x: (Math.random() - 0.5) * 60 }))]);
        setTimeout(() => setSparks((p) => p.filter((s) => !ids.includes(s.id))), 1400);
      }
      setElapsed((prev) => {
        const next = prev + 1;
        const newPrice = 2400 - DECAY * next;
        if (newPrice <= MIN) {
          setPrice(2400);
          return 0;
        }
        setPrice(newPrice);
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [reducedMotion]);

  const pct = ((2400 - price) / (2400 - MIN)) * 100;

  return (
    <div className="relative">
      {/* Price-tick-synced glow orb — restarted every tick via the same
          key-remount trick .animate-price-tick already uses below. */}
      <div key={flashCount} className="landing-glow-orb" aria-hidden="true" />

      <div className="card animate-card-border-glow relative">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[rgba(91,33,182,0.22)]">
          <div>
            <p className="landing-label text-[#46424e]">Live Price Decay</p>
            <p className="text-xs text-[#46424e] mt-1 font-sans">AI Chatbot Development</p>
          </div>
          <span className="landing-label px-2.5 py-1 rounded-full bg-[#5b21b6] text-[#ffffff] animate-live-breathe">LIVE</span>
        </div>

        {/* Price */}
        <div className="px-5 sm:px-6 py-5 sm:py-6 relative">
          {/* Sparkle particles */}
          {sparks.map((s) => (
            <div
              key={s.id}
              className="absolute animate-spark pointer-events-none"
              style={{ left: `calc(40% + ${s.x}px)`, bottom: "65%", width: 3, height: 3, borderRadius: "50%", background: "#5b21b6", zIndex: 20 }}
            />
          ))}
          <div className="flex items-baseline gap-2 mb-4">
            <span key={flashCount} className="text-5xl sm:text-6xl landing-num tabular-nums animate-price-tick" style={{ display: "inline-block" }}>
              ${price.toLocaleString()}
            </span>
            <span className="text-sm text-[#5b21b6] font-sans">↘ -${DECAY}/hr</span>
          </div>

          {/* Progress bar: flat 2px track per Royal spec */}
          <div className="h-0.5 bg-[#f2ecfc] mb-2">
            <div
              className="h-0.5 transition-all duration-150 ease-linear progress-shimmer"
              style={{ width: `${100 - pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-sans text-[#46424e]">
            <span>Floor: ${MIN.toLocaleString()}</span>
            <span>Start: $2,400</span>
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {[
              { label: "Bids", value: "7" },
              { label: "Watching", value: "23" },
              { label: "Left", value: `${Math.max(64 - elapsed, 0)}h` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[rgba(91,33,182,0.22)] py-3 text-center bg-[#ffffff]">
                <p className="text-base landing-num text-[#17171f]">{s.value}</p>
                <p className="landing-label text-[#46424e] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Accept button */}
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[rgba(91,33,182,0.22)] pt-4">
          <button className="btn-primary w-full justify-center landing-label py-3 rounded-full">
            Accept at ${price.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}
