"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "./hooks";

interface BidDrop {
  x: number;
  handle: string;
  price: number;
  spawnMs: number;
}

const CEILING = 2800;
const ACCEPTED = 1150;
// Fixed px, not %, so the drop/dock rows stay clear of the ceiling line
// (44px) and the accepted line (304px) regardless of stage height.
const SPAWN_TOP = "64px";
const DOCK_TOP = "205px";
const CAUGHT_DELAY_MS = 500;

/* x = horizontal spread (%), spawnMs = stagger offset before this bid
   docks. All bids dock at the same fixed row near the floor line — the
   mechanic is a literal "ceiling row -> floor row" fall, not a
   price-height mapping; only the last (lowest) bid is the accepted one. */
const BIDS: BidDrop[] = [
  { x: 14, handle: "sarah_dev", price: 2150, spawnMs: 200 },
  { x: 38, handle: "marcus_k", price: 1780, spawnMs: 900 },
  { x: 64, handle: "alex_codes", price: 1420, spawnMs: 1600 },
  { x: 86, handle: "dev_priya", price: ACCEPTED, spawnMs: 2300 },
];

const DOCK_DELAY_MS = 900;
const RIPPLE_LIFETIME_MS = 600;

/* Ambient background dots — pure decoration, no state. Fixed
   positions/durations so they're deterministic across renders. */
const AMBIENT_DOTS = [
  { x: 8, y: 30, dur: 8, op: 0.07 },
  { x: 24, y: 62, dur: 11, op: 0.05 },
  { x: 47, y: 20, dur: 9.5, op: 0.08 },
  { x: 71, y: 55, dur: 10, op: 0.06 },
  { x: 91, y: 34, dur: 12, op: 0.05 },
];

/** "Ceiling to floor" kinetic stage — dramatizes the reverse-auction
 *  price decay mechanic itself (bids falling from the posted ceiling
 *  to the accepted floor) before HowItWorks explains it in words.
 *  Replayable via the Replay control; freezes to the fully-docked end
 *  state under prefers-reduced-motion instead of running the drop. */
export default function CeilingToFloor() {
  const section = useInView(0.2);
  const reducedMotion = useReducedMotion();
  const [played, setPlayed] = useState(false);
  const [docked, setDocked] = useState<boolean[]>(() => BIDS.map(() => false));
  const [caught, setCaught] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [ripples, setRipples] = useState<{ id: number; index: number }[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rippleIdRef = useRef(0);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!section.inView) return;

    if (reducedMotion) {
      setPlayed(true);
      setDocked(BIDS.map(() => true));
      setCaught(true);
      setRipples([]);
      return;
    }

    setPlayed(true);
    setDocked(BIDS.map(() => false));
    setCaught(false);
    setRipples([]);

    BIDS.forEach((bid, i) => {
      const t = setTimeout(() => {
        setDocked((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        const rippleId = rippleIdRef.current++;
        setRipples((prev) => [...prev, { id: rippleId, index: i }]);
        const rippleTimer = setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== rippleId));
        }, RIPPLE_LIFETIME_MS);
        timeoutsRef.current.push(rippleTimer);

        if (i === BIDS.length - 1) {
          const caughtTimer = setTimeout(() => setCaught(true), CAUGHT_DELAY_MS);
          timeoutsRef.current.push(caughtTimer);
        }
      }, bid.spawnMs + DOCK_DELAY_MS);
      timeoutsRef.current.push(t);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [section.inView, reducedMotion, replayKey]);

  return (
    <section
      ref={section.ref}
      className="relative py-16 sm:py-20 overflow-hidden bg-white border-t border-[rgba(91,33,182,0.22)]"
    >
      <div className="relative mx-auto max-w-[1000px] px-5 sm:px-8 text-center">
        <p
          className="landing-label text-[#5b21b6]"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          Ceiling to floor
        </p>
        <h2
          className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#17171f] mt-3 text-balance"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 80ms, transform 0.6s ease 80ms",
          }}
        >
          The price you post is never the price you pay
        </h2>
        <p
          className="landing-subhead text-base sm:text-lg text-[#46424e] mt-5 max-w-lg mx-auto"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 150ms, transform 0.6s ease 150ms",
          }}
        >
          Every bid has to beat the one before it. Watch a real job fall from
          ceiling to accepted price.
        </p>
      </div>

      <div
        className="relative mx-auto max-w-[1000px] px-5 sm:px-8 mt-11"
        style={{
          opacity: section.inView ? 1 : 0,
          transform: section.inView ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.7s ease 220ms, transform 0.7s ease 220ms",
        }}
      >
        {/* Desktop/tablet: the physical "fall" choreography. The 4 cards'
            fixed pixel/percent geometry only works at this width — below
            `sm` they'd collide, so mobile gets its own stacked layout
            below instead of a shrunk copy of this one. */}
        <div
          className="hidden sm:block relative h-[400px] bg-[#fbfaf7] border border-[rgba(91,33,182,0.22)] rounded-[18px] overflow-hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(75,63,143,0.05) 0 1px, transparent 1px 32px)",
          }}
        >
          <div className="absolute left-6 top-7 landing-label text-[#46424e]">
            Posted · ${CEILING.toLocaleString()} ceiling
          </div>
          <div className="absolute left-0 right-0 top-11 h-[1.5px] bg-[#d8d3e6]" />

          {/* Ambient traffic — suggests other bidding happening off-stage,
              independent of the replay cycle. */}
          {AMBIENT_DOTS.map((dot, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-[#5b21b6] landing-ambient-dot pointer-events-none"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                zIndex: 0,
                ["--ambient-dur" as string]: `${dot.dur}s`,
                ["--ambient-op" as string]: dot.op,
              }}
            />
          ))}

          {ripples.map((r) => (
            <div
              key={r.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full landing-dock-ripple pointer-events-none"
              style={{
                left: `${BIDS[r.index].x}%`,
                top: DOCK_TOP,
                border: "1.5px solid #5b21b6",
                zIndex: 5,
              }}
            />
          ))}

          {BIDS.map((bid, i) => {
            const isDocked = docked[i];
            const isAccepted = i === BIDS.length - 1;
            const visible = played;

            return (
              <div
                key={`${replayKey}-${bid.handle}`}
                className="absolute -translate-x-1/2 max-w-[170px] rounded-lg px-3.5 py-2.5 bg-white"
                style={{
                  left: `${bid.x}%`,
                  top: isDocked ? DOCK_TOP : SPAWN_TOP,
                  opacity: visible ? 1 : 0,
                  borderWidth: "1px 1px 1px 3px",
                  borderStyle: "solid",
                  borderColor: `rgba(91,33,182,0.22) rgba(91,33,182,0.22) rgba(91,33,182,0.22) ${
                    isDocked ? "#5b21b6" : "#c14d3a"
                  }`,
                  boxShadow: "0 10px 22px -14px rgba(91,33,182,0.25)",
                  transition: reducedMotion
                    ? "none"
                    : "top 0.9s cubic-bezier(0.2,0.9,0.3,1), opacity 0.4s ease, border-color 0.4s ease",
                }}
              >
                <div
                  className="landing-label mb-0.5"
                  style={{ fontSize: "9px", color: isDocked ? "#5b21b6" : "#c14d3a" }}
                >
                  {isAccepted && isDocked ? "Accepted" : "Bid"}
                </div>
                <div className="text-[13px] font-medium text-[#17171f]">
                  {isAccepted && isDocked
                    ? `${bid.handle} at $${bid.price.toLocaleString()}`
                    : `${bid.handle} bid $${bid.price.toLocaleString()}`}
                </div>
              </div>
            );
          })}

          <div className="absolute left-0 right-0 bottom-[96px] h-0.5 bg-[#5b21b6]" />
          <div className="absolute left-6 bottom-[106px] text-[15px] font-medium text-[#5b21b6]">
            Accepted · ${ACCEPTED.toLocaleString()}
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-[26px] landing-label text-[#5b21b6]"
            style={{ opacity: caught ? 1 : 0, transition: "opacity 0.8s ease" }}
          >
            Caught · fair price in 6 hours
          </div>
          <button
            onClick={() => setReplayKey((k) => k + 1)}
            className="absolute right-4 bottom-3.5 landing-label border border-[rgba(91,33,182,0.35)] text-[#46424e] px-3.5 py-1.5 rounded-full hover:text-[#17171f] hover:border-[#17171f] transition-colors"
          >
            Replay
          </button>
        </div>

        {/* Mobile: same data/state as the desktop stage, rendered as a
            stacked list instead of an absolutely-positioned fall — 4
            side-by-side cards can't fit a phone width without shrinking
            past readable, so this trades the physical spectacle for a
            clean, legible sequence at this size. */}
        <div className="sm:hidden bg-[#fbfaf7] border border-[rgba(91,33,182,0.22)] rounded-[18px] p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[rgba(91,33,182,0.22)]">
            <span className="landing-label text-[#46424e]">Posted · ceiling</span>
            <span className="text-sm font-medium text-[#17171f]">
              ${CEILING.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {BIDS.map((bid, i) => {
              const isDocked = docked[i];
              const isAccepted = i === BIDS.length - 1;
              const visible = played;
              const isRippling = ripples.some((r) => r.index === i);

              return (
                <div
                  key={`m-${replayKey}-${bid.handle}`}
                  className="flex items-center justify-between rounded-lg px-3.5 py-2.5 bg-white"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateY(0)" : "translateY(-8px)",
                    borderWidth: "1px 1px 1px 3px",
                    borderStyle: "solid",
                    borderColor: `rgba(91,33,182,0.22) rgba(91,33,182,0.22) rgba(91,33,182,0.22) ${
                      isDocked ? "#5b21b6" : "#c14d3a"
                    }`,
                    boxShadow: isRippling ? "0 0 0 3px rgba(91,33,182,0.16)" : "0 0 0 0 rgba(91,33,182,0)",
                    transition: reducedMotion
                      ? "none"
                      : `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s, border-color 0.4s ease, box-shadow 0.5s ease`,
                  }}
                >
                  <span className="text-[13px] font-medium text-[#17171f]">
                    {bid.handle}
                  </span>
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: isAccepted && isDocked ? "#5b21b6" : "#46424e" }}
                  >
                    ${bid.price.toLocaleString()}
                    {isAccepted && isDocked && (
                      <span className="landing-label ml-2 text-[9px] text-[#5b21b6]">
                        Accepted
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-[#5b21b6]">
            <span className="text-[15px] font-medium text-[#5b21b6]">Accepted</span>
            <span className="text-[15px] font-medium text-[#5b21b6]">
              ${ACCEPTED.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span
              className="landing-label text-[#5b21b6]"
              style={{ opacity: caught ? 1 : 0, transition: "opacity 0.8s ease" }}
            >
              Caught · fair price in 6 hours
            </span>
            <button
              onClick={() => setReplayKey((k) => k + 1)}
              className="landing-label border border-[rgba(91,33,182,0.35)] text-[#46424e] px-3.5 py-1.5 rounded-full hover:text-[#17171f] hover:border-[#17171f] transition-colors shrink-0"
            >
              Replay
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
