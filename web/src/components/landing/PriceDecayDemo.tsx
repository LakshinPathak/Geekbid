"use client";

import { useEffect, useRef, useState } from "react";

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

/* ─── Live price decay demo (moved verbatim, plus a new price-tick-
   synced glow orb layered behind the card). Freezes to a representative
   static frame under prefers-reduced-motion instead of running the
   interval loop — same pattern as PriceDecayShowcase's MarketTerminal. */
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
      setElapsed((prev) => {
        const next = prev + 1;
        const newPrice = Math.max(2400 - DECAY * next, MIN);
        setPrice(newPrice);
        setFlashCount((n) => n + 1);
        tickRef.current += 1;
        if (tickRef.current % 3 === 0) {
          const ids = [sparkIdRef.current++, sparkIdRef.current++];
          setSparks((p) => [...p, ...ids.map((sid) => ({ id: sid, x: (Math.random() - 0.5) * 60 }))]);
          setTimeout(() => setSparks((p) => p.filter((s) => !ids.includes(s.id))), 1400);
        }
        if (newPrice <= MIN) {
          clearInterval(id);
          return prev;
        }
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(201,168,76,0.22)]">
          <div>
            <p className="text-[9px] font-sans uppercase tracking-[0.12em] text-[#a8997e]">Live Price Decay</p>
            <p className="text-xs text-[#a8997e] mt-0.5 font-sans">AI Chatbot Development</p>
          </div>
          <span className="text-[9px] font-bold tracking-[0.09em] uppercase font-sans px-2 py-1 rounded-[2px] bg-[#c9a84c] text-[#050810] animate-live-breathe">LIVE</span>
        </div>

        {/* Price */}
        <div className="px-4 py-4 relative">
          {/* Sparkle particles */}
          {sparks.map((s) => (
            <div
              key={s.id}
              className="absolute animate-spark pointer-events-none"
              style={{ left: `calc(40% + ${s.x}px)`, bottom: "65%", width: 3, height: 3, borderRadius: "50%", background: "#c9a84c", zIndex: 20 }}
            />
          ))}
          <div className="flex items-baseline gap-2 mb-3">
            <span key={flashCount} className="text-4xl sm:text-5xl font-serif font-normal tabular-nums animate-price-tick" style={{ display: "inline-block" }}>
              ${price.toLocaleString()}
            </span>
            <span className="text-sm text-[#c9a84c] font-sans">↘ -${DECAY}/hr</span>
          </div>

          {/* Progress bar: flat 2px track per Royal spec */}
          <div className="h-0.5 bg-[#1a1f30] mb-1.5">
            <div
              className="h-0.5 transition-all duration-150 ease-linear progress-shimmer"
              style={{ width: `${100 - pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-sans text-[#a8997e]">
            <span>Floor: ${MIN.toLocaleString()}</span>
            <span>Start: $2,400</span>
          </div>

          {/* Mini stat cards */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: "Bids", value: "7" },
              { label: "Watching", value: "23" },
              { label: "Left", value: `${Math.max(64 - elapsed, 0)}h` },
            ].map((s) => (
              <div key={s.label} className="rounded-[3px] border border-[rgba(201,168,76,0.22)] py-2 text-center bg-[#050810]">
                <p className="text-sm font-serif font-normal text-[#f0e8d4]">{s.value}</p>
                <p className="text-[9px] font-sans uppercase tracking-[0.09em] text-[#a8997e] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Accept button */}
        <div className="px-4 pb-4 border-t border-[rgba(201,168,76,0.22)] pt-3">
          <button className="btn-primary w-full justify-center text-[11px] tracking-[0.07em] uppercase py-2.5 rounded-[3px]">
            Accept at ${price.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}
