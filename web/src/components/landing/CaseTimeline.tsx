"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useInView, useReducedMotion } from "./hooks";
import { CASE_STUDY } from "./data";

const DRAW_MS = 1600;
const STEP_COUNT = CASE_STUDY.steps.length;

/** One continuous rail draws top to bottom; each node's fill/label is
 *  gated to the draw reaching its position along the rail rather than
 *  independently timed — a single value sampled at 5 points, so the
 *  motion mirrors the case's real causality instead of five separate
 *  fade-ins. Status badge flips the instant the rail finishes. */
export default function CaseTimeline() {
  const section = useInView(0.15);
  const reducedMotion = useReducedMotion();
  const [litCount, setLitCount] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!section.inView) return;

    if (reducedMotion) {
      setLitCount(STEP_COUNT);
      return;
    }

    setLitCount(0);
    for (let i = 0; i < STEP_COUNT; i++) {
      const delayMs = (i / (STEP_COUNT - 1)) * DRAW_MS;
      const t = setTimeout(() => setLitCount((n) => Math.max(n, i + 1)), delayMs);
      timeoutsRef.current.push(t);
    }

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [section.inView, reducedMotion, replayKey]);

  const closed = litCount >= STEP_COUNT;
  const railPct = reducedMotion ? 100 : (litCount / STEP_COUNT) * 100;

  return (
    <section ref={section.ref} className="py-10 sm:py-14 border-t border-[rgba(91,33,182,0.22)] bg-white">
      <div className="mx-auto max-w-[820px] px-5 sm:px-8">
        <div
          className="text-center mb-10"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="landing-label text-[#5b21b6] mb-3">One real auction, start to finish</p>
          <h2 className="landing-h2 text-3xl sm:text-5xl text-[#17171f]">
            From posted to hired
          </h2>
        </div>

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
            <div className="flex items-center gap-3">
              <span
                className="landing-label px-3 py-1.5 rounded-full transition-colors duration-500"
                style={{
                  color: closed ? "#4d7245" : "#a08a3c",
                  backgroundColor: closed ? "#e9f2e6" : "#f3edda",
                }}
              >
                {closed ? "Closed · Hired" : "In progress"}
              </span>
              <button
                onClick={() => setReplayKey((k) => k + 1)}
                className="landing-label border border-[rgba(91,33,182,0.35)] text-[#46424e] px-3 py-1.5 rounded-full hover:text-[#17171f] hover:border-[#17171f] transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Replay
              </button>
            </div>
          </div>

          <div className="relative pl-8">
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
                  <div key={`${replayKey}-${step.label}`} className="relative flex gap-4">
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
    </section>
  );
}
