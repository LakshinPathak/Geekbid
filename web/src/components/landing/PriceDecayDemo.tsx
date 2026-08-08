"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./hooks";

const START = 2400;
const MIN = 800;
const DECAY = 25;

const LOG_POOL = [
  "dev_amelia bid $1,850 on this job",
  "3 more freelancers started watching",
  "priya_ml bid $1,720",
  "Price crossed $1,500",
  "8 bids total so far",
];

/* ─── Live price decay demo — the page's one live-ticking price card
   (PriceDecayShowcase's MarketTerminal, which duplicated this exact
   widget one scroll down, was cut — its terminal header, terracotta
   price treatment, gradient decay bar, and activity feed live here
   instead, on the one card that matters). Freezes to a representative
   static frame under prefers-reduced-motion instead of running the
   interval loop. Loops back to the start price once it hits the floor
   rather than stopping dead — a visitor who lingers on the page
   shouldn't see the "live" demo go permanently stale.

   Deliberately no 3D tilt here — the card stays flat/static; the drag
   interaction below is the card's one interactive gesture.

   The decay bar doubles as a scrubber: dragging it pauses the auto-tick
   and previews any price along the curve (price, "Left" stat, and the
   Accept button all update live), resuming auto-decay from wherever you
   release it — turns the passive demo into a hands-on proof. */
export default function PriceDecayDemo() {
  const reducedMotion = useReducedMotion();

  const [price, setPrice] = useState(START);
  const [elapsed, setElapsed] = useState(0);
  const [flashCount, setFlashCount] = useState(0);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number }>>([]);
  const [scrubbing, setScrubbing] = useState(false);
  const [log, setLog] = useState<{ id: number; text: string }[]>(
    reducedMotion ? [{ id: 0, text: LOG_POOL[0] }] : []
  );
  const sparkIdRef = useRef(0);
  const tickRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const poolIdxRef = useRef(0);

  useEffect(() => {
    if (reducedMotion || scrubbing) return;
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
        const newPrice = START - DECAY * next;
        if (newPrice <= MIN) {
          setPrice(START);
          return 0;
        }
        setPrice(newPrice);
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [reducedMotion, scrubbing]);

  useEffect(() => {
    if (reducedMotion || scrubbing) return;
    const id = setInterval(() => {
      const text = LOG_POOL[poolIdxRef.current % LOG_POOL.length];
      poolIdxRef.current += 1;
      const entry = { id: logIdRef.current++, text };
      setLog((prev) => [entry, ...prev].slice(0, 2));
    }, 2400);
    return () => clearInterval(id);
  }, [reducedMotion, scrubbing]);

  function scrubToClientX(clientX: number) {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const newPrice = Math.round(START - ratio * (START - MIN));
    setPrice(newPrice);
    setElapsed(Math.round((START - newPrice) / DECAY));
  }
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    setFlashCount((n) => n + 1);
    scrubToClientX(e.clientX);
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!scrubbing) return;
    scrubToClientX(e.clientX);
  }
  function handlePointerUp() {
    setScrubbing(false);
    setFlashCount((n) => n + 1);
  }

  const pct = ((START - price) / (START - MIN)) * 100;

  return (
    <div className="relative">
      <div className="card relative">
        {/* Header — terminal-style: pulsing "live" dot + label on the
            left, a mono reference tag on the right. */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[rgba(91,33,182,0.22)]">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#5b21b6] animate-live-breathe inline-block" />
            <span className="landing-label text-[#5b21b6] text-[11px]">Live Market</span>
          </div>
          <span className="landing-label text-[#46424e] text-[11px] font-mono-il tracking-normal normal-case">GB-CHATBOT//01</span>
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
          <p className="landing-label text-[#46424e] mb-3 font-mono-il">AI Chatbot Development</p>
          <div className="flex items-baseline gap-3 flex-wrap mb-4">
            <span
              key={flashCount}
              className="font-mono-il text-5xl sm:text-6xl leading-none tabular-nums text-[#c14d3a] landing-price-tick"
              style={{ letterSpacing: "-0.02em" }}
            >
              ${price.toLocaleString()}
            </span>
            <span className="text-sm text-[#5b21b6] font-mono-il">↘ -${DECAY}/hr</span>
          </div>

          {/* Decay bar doubles as a scrubber — a real 24px touch target
              around the visible gradient track, with a thumb that only
              shows up once you've noticed it's draggable (mid-interaction
              or on hover), so it doesn't visually compete with the price. */}
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="group/scrub relative h-6 -my-2.5 flex items-center cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="h-1.5 w-full bg-[#f2ecfc] rounded-full overflow-hidden">
              <div
                className={`h-1.5 landing-decay-bar-fill rounded-full ${scrubbing ? "" : "transition-[width] duration-150 ease-linear"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className={`absolute top-1/2 h-3.5 w-3.5 rounded-full bg-[#ffffff] border-2 border-[#5b21b6] shadow-[0_1px_4px_rgba(91,33,182,0.35)] transition-opacity duration-150 ${scrubbing ? "opacity-100 scale-110" : "opacity-0 group-hover/scrub:opacity-100"}`}
              style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
              aria-hidden="true"
            />
          </div>
          <div className="flex justify-between landing-label text-[#46424e] mb-2 font-mono-il tracking-normal normal-case">
            <span>Start ${START.toLocaleString()}</span>
            <span>Floor ${MIN.toLocaleString()}</span>
          </div>
          <p className="text-center text-[10px] text-[#46424e]/60 -mt-1 mb-1">↔ Drag to preview any price</p>

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

          {/* Activity — compact, job-scoped feed (MarketTerminal's wider
              4-line version condensed to fit this narrower card). */}
          <div className="mt-4 pt-4 border-t border-[rgba(91,33,182,0.14)] min-h-[46px]">
            <p className="landing-label text-[#46424e]/70 mb-2 font-mono-il">Activity</p>
            <div className="flex flex-col gap-1.5">
              {log.length === 0 && (
                <p className="text-xs text-[#46424e]/50 font-mono-il">Waiting for the next bid…</p>
              )}
              {log.map((entry, i) => (
                <p
                  key={entry.id}
                  className="text-xs text-[#46424e] font-mono-il truncate landing-log-line"
                  style={{ opacity: 1 - i * 0.35 }}
                >
                  <span className="text-[#5b21b6] mr-1.5">›</span>{entry.text}
                </p>
              ))}
            </div>
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
