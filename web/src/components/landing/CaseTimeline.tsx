"use client";

import { useEffect, useState } from "react";
import { useInView, useReducedMotion } from "./hooks";
import { CASE_STUDY } from "./data";

const DRAW_MS = 1600;
const HOLD_MS = 2600; // pause on the finished "Closed · Hired" state before replaying
const FADE_MS = 300;
const STEP_COUNT = CASE_STUDY.steps.length;

/** One continuous rail draws top to bottom; each node's fill/label is
 *  gated to the draw reaching its position along the rail rather than
 *  independently timed — a single value sampled at 5 points, so the
 *  motion mirrors the case's real causality instead of five separate
 *  fade-ins. Status badge flips the instant the rail finishes.
 *
 *  Auto-plays and loops continuously (no Replay button): draws once,
 *  holds on the finished state long enough to read it, fades out, and
 *  redraws from the top — always live, never waiting on a click.
 *
 *  Nested content only (no <section>/id of its own, no header) —
 *  rendered directly inside HowItWorks as concrete proof, alongside
 *  the 4-step breakdown, rather than being a fourth top-level section
 *  re-demonstrating the same mechanic that MarketTerminal above
 *  already dramatizes live. */
export default function CaseTimeline() {
  const section = useInView(0.15);
  const reducedMotion = useReducedMotion();
  const [litCount, setLitCount] = useState(0);
  const [resetFading, setResetFading] = useState(false);

  useEffect(() => {
    if (!section.inView) return;

    if (reducedMotion) {
      setLitCount(STEP_COUNT);
      setResetFading(false);
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const stepGap = DRAW_MS / (STEP_COUNT - 1);

    async function loop() {
      while (!cancelled) {
        setResetFading(false);
        setLitCount(0);
        for (let i = 0; i < STEP_COUNT; i++) {
          if (i > 0) {
            await sleep(stepGap);
            if (cancelled) return;
          }
          setLitCount(i + 1);
        }
        await sleep(HOLD_MS);
        if (cancelled) return;
        setResetFading(true);
        await sleep(FADE_MS);
        if (cancelled) return;
      }
    }
    loop();

    return () => { cancelled = true; };
  }, [section.inView, reducedMotion]);

  const closed = litCount >= STEP_COUNT;
  const railPct = reducedMotion ? 100 : (litCount / STEP_COUNT) * 100;

  return (
    <div ref={section.ref} className="mx-auto max-w-[820px]">
        <div
          className="bg-[#fbfaf7] border border-[rgba(91,33,182,0.22)] rounded-[18px] p-6 sm:p-8"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease 150ms, transform 0.7s ease 150ms",
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <div>
              <div className="text-[15px] font-medium text-[#17171f]">{CASE_STUDY.title}</div>
              <div className="text-xs text-[#46424e] mt-0.5">
                {CASE_STUDY.category} &middot; ${CASE_STUDY.ceiling.toLocaleString()} &rarr; $
                {CASE_STUDY.accepted.toLocaleString()}
              </div>
            </div>
            <span
              className="landing-label px-3 py-1.5 rounded-full transition-colors duration-500"
              style={{
                color: closed ? "#4d7245" : "#a08a3c",
                backgroundColor: closed ? "#e9f2e6" : "#f3edda",
                opacity: resetFading ? 0 : 1,
                transition: `background-color 0.5s, color 0.5s, opacity ${FADE_MS}ms ease`,
              }}
            >
              {closed ? "Closed · Hired" : "In progress"}
            </span>
          </div>

          <div
            className="relative pl-8"
            style={{ opacity: resetFading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
          >
            {/* Track (static) + progress rail (draws downward) */}
            <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-[rgba(91,33,182,0.16)]" />
            <div
              className="absolute left-[7px] top-1.5 w-px bg-[#5b21b6]"
              style={{
                height: `calc((100% - 12px) * ${railPct / 100})`,
                transition: reducedMotion ? "none" : `height ${DRAW_MS}ms linear`,
              }}
            />

            <div className="flex flex-col gap-7">
              {CASE_STUDY.steps.map((step, i) => {
                const lit = i < litCount;
                return (
                  <div key={step.label} className="relative flex gap-4">
                    <span
                      className="absolute -left-8 top-0.5 h-[15px] w-[15px] rounded-full border-2 transition-colors duration-300"
                      style={{
                        backgroundColor: lit ? "#5b21b6" : "#fbfaf7",
                        borderColor: lit ? "#5b21b6" : "rgba(91,33,182,0.3)",
                      }}
                    />
                    <div
                      style={{
                        opacity: lit ? 1 : 0.35,
                        transition: "opacity 0.4s ease",
                      }}
                    >
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[13px] font-medium text-[#17171f]">
                          {step.label}
                        </span>
                        <span className="font-mono-il text-[11px] text-[#46424e]">
                          {step.time}
                        </span>
                        <span className="font-mono-il text-[11px] text-[#5b21b6]">
                          {step.elapsed}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#46424e] mt-1">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
    </div>
  );
}
