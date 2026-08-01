"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { useInView, useReducedMotion, useCountUp } from "./hooks";

type Phase = "idle" | "held" | "released";

const STATIONS = [
  { key: "payment", label: "Your payment", x: 10 },
  { key: "escrow", label: "Escrow", x: 50 },
  { key: "payout", label: "Freelancer payout", x: 90 },
] as const;

const TRAVEL_MS = 900;
const DEPART_MS = 500; // pause at payment before each cycle departs
const HOLD_ESCROW_MS = 2200; // the meaningful pause — stillness is still the point
const HOLD_PAYOUT_MS = 900; // brief pause once released, before resetting
const FADE_MS = 300;

// Merged in from the former standalone AuthorityStream section (the
// "140 bids this week, 1 decision was yours" stat strip). Rendered
// here as a thin resolved readout rather than a re-run of its old
// timed tick-collapse-and-ripple sequence, so it doesn't compete with
// the token/perimeter interaction below for motion budget.
const TICK_COUNT = 27;
const SURVIVOR_INDEX = 13; // center tick

/** Payment -> Escrow -> Payout, auto-playing and looping continuously —
 *  always live, never waiting on a click. The meaningful part isn't
 *  gone: the token still visibly stops and holds inside the escrow
 *  boundary for a real beat before continuing on its own, so "your
 *  money sits still and protected here" is still the thing being
 *  demonstrated — it just resolves automatically instead of pausing
 *  forever on a button. At the end of each cycle the token fades out
 *  at payout and back in at payment (a cut, never a reverse-direction
 *  slide) so the motion always reads left-to-right, matching the
 *  payment flow itself.
 *
 *  Also carries a compact stat strip (bid volume collapsing to "1
 *  decision was yours") merged in from the former standalone
 *  AuthorityStream section — a thin bar inside this one continuous
 *  band, not a second competing panel. */
export default function EscrowPerimeter() {
  const section = useInView(0.2);
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [tokenFaded, setTokenFaded] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const bidCount = useCountUp(140, 1100, 0, section.inView);

  useEffect(() => {
    if (!section.inView) return;

    if (reducedMotion) {
      setPhase("held");
      setTokenFaded(false);
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    async function loop() {
      while (!cancelled) {
        setPhase("idle");
        await sleep(30);
        if (cancelled) return;
        setTokenFaded(false);
        await sleep(DEPART_MS);
        if (cancelled) return;

        setPhase("held"); // travels to escrow, perimeter draws, holds
        await sleep(TRAVEL_MS + HOLD_ESCROW_MS);
        if (cancelled) return;

        setPhase("released"); // travels to payout, perimeter fades
        await sleep(TRAVEL_MS + HOLD_PAYOUT_MS);
        if (cancelled) return;

        setTokenFaded(true); // fade out at payout — never slides backward
        await sleep(FADE_MS);
        if (cancelled) return;
        setCycleKey((k) => k + 1); // fresh token, reborn at payment while invisible
      }
    }
    loop();

    return () => { cancelled = true; };
  }, [section.inView, reducedMotion]);

  const tokenX = phase === "idle" ? 10 : phase === "held" ? 50 : 90;
  const held = phase === "held";

  return (
    <section id="trust" ref={section.ref} className="grid-bg relative py-16 sm:py-24 overflow-hidden scroll-mt-20">
      {/* This was the one section on the page with no background texture
          at all — a flat, empty rectangle that only got more noticeably
          empty as the container widened for large screens. Two large
          "perimeter" rings flanking the content (mostly cropped off-
          canvas, very low opacity) plus the shared dot-grid give it the
          same atmosphere every other section already has, without a
          center glow blob — keeps the "calm, no pulsing light" read the
          Trust theme wants, just no longer literally bare. */}
      <div
        className="absolute top-1/2 -left-[220px] -translate-y-1/2 h-[440px] w-[440px] rounded-full border border-[rgba(91,33,182,0.1)]"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 -left-[220px] -translate-y-1/2 h-[320px] w-[320px] rounded-full border border-[rgba(91,33,182,0.08)]"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 -right-[220px] -translate-y-1/2 h-[440px] w-[440px] rounded-full border border-[rgba(91,33,182,0.1)]"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 -right-[220px] -translate-y-1/2 h-[320px] w-[320px] rounded-full border border-[rgba(91,33,182,0.08)]"
        aria-hidden="true"
      />
      {/* Two supporting trust claims sitting in the ring space itself —
          only where there's genuinely enough room not to crowd the
          centered 1100px column (2xl and up), and each says something
          the headline/diagram doesn't already: what backs the "money
          never leaves escrow" claim, and how it's actually secured. */}
      <div
        className="hidden 2xl:flex absolute left-8 top-1/2 -translate-y-1/2 w-[196px] flex-col items-start gap-2.5 bg-white border border-[rgba(91,33,182,0.14)] rounded-2xl p-4 text-left shadow-[0_16px_36px_-20px_rgba(91,33,182,0.28)] transition-transform duration-300 hover:-translate-y-1"
        style={{
          opacity: section.inView ? 1 : 0,
          transform: section.inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease 200ms, transform 0.7s ease 200ms",
        }}
      >
        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-[#5b21b6]/10 text-[#5b21b6] ring-1 ring-[rgba(91,33,182,0.16)]">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-[#17171f] leading-snug">Every dollar escrow-backed</p>
        <p className="text-xs text-[#46424e] leading-relaxed">Funds are held by GeekBid, not the freelancer — nothing releases without your sign-off.</p>
      </div>
      <div
        className="hidden 2xl:flex absolute right-8 top-1/2 -translate-y-1/2 w-[196px] flex-col items-start gap-2.5 bg-white border border-[rgba(91,33,182,0.14)] rounded-2xl p-4 text-left shadow-[0_16px_36px_-20px_rgba(91,33,182,0.28)] transition-transform duration-300 hover:-translate-y-1"
        style={{
          opacity: section.inView ? 1 : 0,
          transform: section.inView ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.7s ease 320ms, transform 0.7s ease 320ms",
        }}
      >
        <span className="flex items-center justify-center h-9 w-9 rounded-full bg-[#5b21b6]/10 text-[#5b21b6] ring-1 ring-[rgba(91,33,182,0.16)]">
          <Lock className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-[#17171f] leading-snug">Bank-grade encryption</p>
        <p className="text-xs text-[#46424e] leading-relaxed">256-bit, end-to-end — the same standard payment processors use.</p>
      </div>
      {/* Gradient hairline instead of a flat border — matches Hero's and
          PriceDecayShowcase's top rule. */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.3)] to-transparent" aria-hidden="true" />
      {/* Widened from the original 820px, which left a very noticeable
          empty margin per side from laptop widths up — the diagram below
          is percentage-positioned (10%–90%) so it fills whatever column
          width it's given, and the headline/stat-strip stay short enough
          not to need a narrower reading column of their own. */}
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8 text-center">
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
          className="relative mt-16"
          style={{
            opacity: section.inView ? 1 : 0,
            transition: "opacity 0.7s ease 200ms",
          }}
        >
          {/* Connecting rail — a trailing fill grows behind the token as
              it travels (same "energy filling a path" language as the
              Hero demo card's decay bar), instead of a flat static line.
              Thicker + glowing rather than a flat 1px line — a plainer
              hairline read as too quiet against the more energetic token. */}
          <div className="absolute left-[10%] right-[10%] top-6 h-px bg-[rgba(91,33,182,0.18)]" />
          <div
            className="absolute top-6 h-[3px] -translate-y-1/2 rounded-full landing-decay-bar-fill"
            style={{
              left: "10%",
              width: `${tokenX - 10}%`,
              opacity: tokenFaded ? 0 : 1,
              boxShadow: "0 0 10px 1px rgba(91,33,182,0.35)",
              transition: reducedMotion
                ? "none"
                : `width ${TRAVEL_MS}ms cubic-bezier(0.2,0.78,0.2,1), opacity ${FADE_MS}ms ease`,
            }}
          />

          {/* Travelling token — remounted (fresh key) once per cycle so
              the reset from payout back to payment is a hard cut behind
              an opacity fade, never a right-to-left slide. A blurred
              halo rides behind it (separate layer, so the pulse's own
              transform never clobbers the token's left-position
              transition) and brightens on arrival at each station. */}
          <div
            key={cycleKey}
            className="absolute top-6 left-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 z-10"
            style={{
              left: `${tokenX}%`,
              opacity: tokenFaded ? 0 : 1,
              transition: reducedMotion ? "none" : `left ${TRAVEL_MS}ms cubic-bezier(0.2,0.78,0.2,1), opacity ${FADE_MS}ms ease`,
            }}
          >
            <div
              className="absolute inset-0 -m-2 rounded-full"
              style={{
                boxShadow: held
                  ? "0 0 0 10px rgba(91,33,182,0.16), 0 0 24px 6px rgba(91,33,182,0.45)"
                  : "0 0 16px 3px rgba(91,33,182,0.35)",
                transition: reducedMotion ? "none" : "box-shadow 0.4s ease",
              }}
            />
            <div className="relative h-6 w-6 rounded-full bg-[#5b21b6] flex items-center justify-center">
              <span className="font-mono-il text-[10px] text-white">$</span>
            </div>
          </div>

          {/* Payout burst — a one-shot ring of particles thrown from the
              payout station the instant the token releases, gone before
              the next cycle even starts (600ms, well inside the 900ms
              hold at payout). Angles are fixed, not randomized, so the
              burst is identical and deterministic every cycle. */}
          {!reducedMotion && phase === "released" && !tokenFaded && (
            <div className="absolute top-6 left-[90%]" aria-hidden="true">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <span
                  key={`${cycleKey}-${angle}`}
                  className="landing-escrow-particle absolute top-0 left-0 h-1.5 w-1.5 rounded-full bg-[#16a34a]"
                  style={{ ["--angle" as string]: `${angle}deg` }}
                />
              ))}
            </div>
          )}

          <div className="flex items-start justify-between">
            {STATIONS.map((s) => {
              const isEscrow = s.key === "escrow";
              const isPayout = s.key === "payout";
              const stationHeld = isEscrow && phase === "held";
              const justReleased = isPayout && phase === "released" && !tokenFaded;
              return (
                <div key={s.key} className="flex flex-col items-center" style={{ width: "33%" }}>
                  <div className="h-6" />
                  <div
                    className={`relative mt-6 rounded-xl px-4 py-3 bg-white transition-all duration-500 ${
                      (stationHeld || justReleased) && !reducedMotion ? "landing-station-impact" : ""
                    }`}
                    style={{
                      borderWidth: isEscrow ? "1.5px" : "1px",
                      borderStyle: "solid",
                      borderColor: "rgba(91,33,182,0.22)",
                      boxShadow: stationHeld
                        ? "inset 0 0 0 1px rgba(91,33,182,0.12), 0 0 20px 2px rgba(91,33,182,0.2)"
                        : justReleased
                          ? "0 0 0 6px rgba(22,163,74,0.18), 0 0 24px 4px rgba(22,163,74,0.3)"
                          : "none",
                    }}
                  >
                    {/* Drawn perimeter: a closed rect that traces itself
                        the instant the token enters and halts inside —
                        a state-gated boundary (like a firewall diagram),
                        not a static border. Stays fully drawn/frozen
                        while held, releases (fades) once released. */}
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
                            strokeDashoffset: phase === "held" || phase === "released" ? 0 : 100,
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
                      className="landing-label mt-2 transition-colors duration-300"
                      style={{ color: stationHeld ? "#5b21b6" : phase === "released" ? "#b3aec0" : "#b3aec0" }}
                    >
                      {phase === "released" ? "Released" : stationHeld ? "Held" : "—"}
                    </span>
                  )}
                  {isPayout && (
                    <span
                      className="landing-label mt-2 transition-colors duration-300"
                      style={{ color: justReleased ? "#16a34a" : "transparent" }}
                    >
                      Released
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
