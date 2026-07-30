"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, useCountUp } from "./hooks";

const TICK_COUNT = 27;
const SURVIVOR_INDEX = 13; // center tick
const COLLAPSE_DELAY_MS = 1100; // roughly when the "140" count-up settles

/** "140 bids this week. 1 decision was yours." A row of thin ticks
 *  (the raw bid volume) collapses down to the one tick that mattered —
 *  a rendered filter step, paired with a synchronized count-up, rather
 *  than an abstract funnel graphic. */
export default function AuthorityStream() {
  const section = useInView(0.2);
  const reducedMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const [rippled, setRippled] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bidCount = useCountUp(140, 1100, 0, section.inView);

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (!section.inView) return;

    if (reducedMotion) {
      setCollapsed(true);
      setRippled(true);
      return;
    }

    setCollapsed(false);
    setRippled(false);

    const t1 = setTimeout(() => setCollapsed(true), COLLAPSE_DELAY_MS);
    const t2 = setTimeout(() => setRippled(true), COLLAPSE_DELAY_MS + 300);
    timeoutsRef.current.push(t1, t2);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [section.inView, reducedMotion]);

  return (
    <section ref={section.ref} className="py-16 sm:py-24 border-t border-[rgba(91,33,182,0.22)] bg-white">
      <div className="mx-auto max-w-[700px] px-5 sm:px-8 text-center">
        <div
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <div className="flex items-baseline justify-center gap-2.5 flex-wrap">
            <span className="font-mono-il text-5xl sm:text-6xl text-[#17171f]">{bidCount}</span>
            <span className="text-base sm:text-lg text-[#46424e]">bids this week.</span>
          </div>

          <div className="relative h-16 flex items-end justify-center gap-[3px] mt-10 mb-6">
            {Array.from({ length: TICK_COUNT }).map((_, i) => {
              const isSurvivor = i === SURVIVOR_INDEX;
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{
                    height: isSurvivor ? 44 : 24,
                    backgroundColor: isSurvivor ? "#5b21b6" : "rgba(91,33,182,0.28)",
                    opacity: collapsed ? (isSurvivor ? 1 : 0.14) : 0.55,
                    transform: collapsed
                      ? isSurvivor
                        ? "scaleY(1)"
                        : "scaleY(0.45)"
                      : "scaleY(1)",
                    transformOrigin: "bottom",
                    transition: reducedMotion
                      ? "none"
                      : `opacity 0.6s ease ${Math.abs(i - SURVIVOR_INDEX) * 12}ms, transform 0.6s cubic-bezier(0.2,0.78,0.2,1) ${Math.abs(i - SURVIVOR_INDEX) * 12}ms, background-color 0.6s ease`,
                  }}
                />
              );
            })}
            {rippled && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-10 w-10 rounded-full landing-dock-ripple pointer-events-none"
                style={{ border: "1.5px solid #5b21b6" }}
              />
            )}
          </div>

          <p
            className="text-base sm:text-lg text-[#46424e]"
            style={{
              opacity: collapsed ? 1 : 0,
              transition: "opacity 0.6s ease 200ms",
            }}
          >
            <span className="font-mono-il text-[#5b21b6]">1</span> decision was yours.
          </p>
        </div>
      </div>
    </section>
  );
}
