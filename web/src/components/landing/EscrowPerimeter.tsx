"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useInView, useReducedMotion, useCountUp } from "./hooks";

type Phase = "idle" | "held" | "released";

const STATIONS = [
  { key: "payment", label: "Your payment", x: 10 },
  { key: "escrow", label: "Escrow", x: 50 },
  { key: "payout", label: "Freelancer payout", x: 90 },
] as const;

const TRAVEL_TO_ESCROW_MS = 900;
const RELEASE_DELAY_MS = 800;

// Merged in from the former standalone AuthorityStream section (the
// "140 bids this week, 1 decision was yours" stat strip). Rendered
// here as a thin resolved readout rather than a re-run of its old
// timed tick-collapse-and-ripple sequence, so it doesn't compete with
// the token/perimeter interaction below for motion budget.
const TICK_COUNT = 27;
const SURVIVOR_INDEX = 13; // center tick

/** Payment -> Escrow -> Payout, but state-gated rather than a one-shot
 *  flythrough: the token travels in and visibly stops inside the
 *  escrow boundary and stays there — stillness is the point — until
 *  the user clicks Approve. Money literally cannot cross the boundary
 *  until that event fires, mirroring how escrow actually works.
 *
 *  Also carries a compact stat strip (bid volume collapsing to "1
 *  decision was yours") merged in from the former standalone
 *  AuthorityStream section — a thin bar inside this one continuous
 *  band, not a second competing panel. */
export default function EscrowPerimeter() {
  const section = useInView(0.2);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [releasing, setReleasing] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bidCount = useCountUp(140, 1100, 0, section.inView);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!section.inView) return;

    if (reducedMotion) {
      setPhase("held");
      setReleasing(false);
      return;
    }

    setPhase("idle");
    setReleasing(false);
    const t = setTimeout(() => setPhase("held"), TRAVEL_TO_ESCROW_MS);
    timeoutsRef.current.push(t);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [section.inView, reducedMotion, replayKey]);

  const handleApprove = () => {
    if (phase !== "held" || releasing) return;
    if (reducedMotion) {
      setPhase("released");
      return;
    }
    setReleasing(true);
    const t = setTimeout(() => {
      setPhase("released");
      setReleasing(false);
    }, RELEASE_DELAY_MS);
    timeoutsRef.current.push(t);
  };

  const tokenX = phase === "idle" ? 10 : phase === "held" ? 50 : 90;

  return (
    <section ref={section.ref} className="py-16 sm:py-24 border-t border-[rgba(91,33,182,0.22)] bg-[#fbfaf7]">
      <div className="mx-auto max-w-[820px] px-5 sm:px-8 text-center">
        <p
          className="landing-label text-[#5b21b6]"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          Trust
        </p>
        <h2
          className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#17171f] mt-3 text-balance"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 80ms, transform 0.6s ease 80ms",
          }}
        >
          Your money never leaves escrow until you approve
        </h2>

        {/* Stat strip merged from AuthorityStream: volume context ("140
            bids this week") resolving to the one decision that mattered
            — framing the diagram below as what happens once that
            decision is made. */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-10"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s ease 140ms, transform 0.7s ease 140ms",
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-mono-il text-3xl sm:text-4xl text-[#17171f]">{bidCount}</span>
            <span className="text-sm text-[#46424e]">bids this week</span>
          </div>

          <div className="relative h-7 flex items-end gap-[2.5px]" aria-hidden="true">
            {Array.from({ length: TICK_COUNT }).map((_, i) => {
              const isSurvivor = i === SURVIVOR_INDEX;
              return (
                <div
                  key={i}
                  className="w-[2.5px] rounded-full"
                  style={{
                    height: isSurvivor ? 26 : 13,
                    backgroundColor: isSurvivor ? "#5b21b6" : "rgba(91,33,182,0.24)",
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-mono-il text-[#5b21b6]">1</span>
            <span className="text-sm text-[#46424e]">decision was yours</span>
          </div>
        </div>

        <div
          className="relative mt-16 mb-6"
          style={{
            opacity: section.inView ? 1 : 0,
            transition: "opacity 0.7s ease 200ms",
          }}
        >
          {/* Connecting rail */}
          <div className="absolute left-[10%] right-[10%] top-6 h-px bg-[rgba(91,33,182,0.18)]" />

          {/* Travelling token */}
          <div
            className="absolute top-6 -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#5b21b6] flex items-center justify-center z-10"
            style={{
              left: `${tokenX}%`,
              transition: reducedMotion ? "none" : "left 0.9s cubic-bezier(0.2,0.78,0.2,1)",
            }}
          >
            <span className="font-mono-il text-[10px] text-white">$</span>
          </div>

          <div className="flex items-start justify-between">
            {STATIONS.map((s) => {
              const isEscrow = s.key === "escrow";
              const held = isEscrow && phase === "held";
              return (
                <div key={s.key} className="flex flex-col items-center" style={{ width: "33%" }}>
                  <div className="h-6" />
                  <div
                    className="relative mt-6 rounded-xl px-4 py-3 bg-white transition-all duration-500"
                    style={{
                      borderWidth: isEscrow ? "1.5px" : "1px",
                      borderStyle: isEscrow ? "solid" : "solid",
                      borderColor: isEscrow ? "rgba(91,33,182,0.22)" : "rgba(91,33,182,0.22)",
                      boxShadow: held ? "inset 0 0 0 1px rgba(91,33,182,0.12)" : "none",
                    }}
                  >
                    {/* Drawn perimeter: a closed rect that traces itself
                        the instant the token enters and halts inside —
                        a state-gated boundary (like a firewall diagram),
                        not a static border. Stays fully drawn/frozen
                        while held, releases (fades) once approved. */}
                    {isEscrow && (
                      <svg
                        className="absolute inset-0 pointer-events-none"
                        width="100%"
                        height="100%"
                        viewBox="0 0 100 60"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        <rect
                          x="1.5"
                          y="1.5"
                          width="97"
                          height="57"
                          rx="10"
                          fill="none"
                          stroke="#5b21b6"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                          pathLength={100}
                          style={{
                            strokeDasharray: 100,
                            strokeDashoffset: held || phase === "released" ? 0 : 100,
                            opacity: phase === "released" ? 0 : 1,
                            transition: reducedMotion
                              ? "none"
                              : "stroke-dashoffset 0.6s cubic-bezier(0.2,0.78,0.2,1), opacity 0.5s ease 0.1s",
                          }}
                        />
                      </svg>
                    )}
                    <span className="relative text-[13px] font-medium text-[#17171f]">{s.label}</span>
                  </div>
                  {isEscrow && (
                    <span
                      className="landing-label mt-2"
                      style={{ color: held ? "#5b21b6" : "#b3aec0" }}
                    >
                      {phase === "released" ? "Released" : held ? "Held" : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            onClick={handleApprove}
            disabled={phase !== "held" || releasing}
            className="btn-primary text-sm px-6 py-3 rounded-full inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Approve &amp; release
          </button>
          <button
            onClick={() => setReplayKey((k) => k + 1)}
            className="btn-ghost text-sm px-6 py-3 rounded-full inline-flex items-center gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay
          </button>
        </div>
      </div>
    </section>
  );
}
