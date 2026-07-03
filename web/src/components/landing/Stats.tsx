"use client";

import { useInView, useSlotDigits } from "./hooks";
import { STATS } from "./data";

function SlotNumber({ digits }: { digits: number[] }) {
  return (
    <>
      {digits.map((d, i) => (
        <span key={i} className="landing-slot-digit">
          <span
            className="landing-slot-track"
            style={{ transform: `translateY(-${d}em)` }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </span>
      ))}
    </>
  );
}

export default function Stats() {
  const statsSection = useInView(0.1);

  // STATS[1] is the "$1.2M" decimal stat — animated the same way the
  // original page.tsx did (count 0->12 as an integer, then divide by 10
  // for one decimal place), kept as plain useCountUp since a decimal
  // point isn't a rolling digit. The other three are integers and get
  // the new slot-machine digit treatment.
  const slot0 = useSlotDigits(STATS[0].value, 1800, statsSection.inView);
  const slot2 = useSlotDigits(STATS[2].value, 1800, statsSection.inView);
  const slot3 = useSlotDigits(STATS[3].value, 1400, statsSection.inView);

  return (
    <section ref={statsSection.ref} className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[#050810] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#c9a84c]/[0.04] rounded-full blur-[100px] pointer-events-none animate-breathe" />
      <div className="mx-auto max-w-5xl px-5 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {STATS.map((s, i) => (
            <div key={s.label} className="text-center group">
              <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto mb-4 opacity-60" />
              <p className="text-5xl sm:text-6xl font-serif font-normal text-[#c9a84c] tabular-nums group-hover:scale-105 transition-transform duration-300">
                {s.prefix}
                {i === 0 && <SlotNumber digits={slot0} />}
                {i === 1 && <StatFallbackCount value={STATS[1].value} enabled={statsSection.inView} />}
                {i === 2 && <SlotNumber digits={slot2} />}
                {i === 3 && <SlotNumber digits={slot3} />}
                {s.suffix}
              </p>
              <p className="text-sm font-sans text-[#a8997e] mt-2 uppercase tracking-[0.08em]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatFallbackCount({ value, enabled }: { value: number; enabled: boolean }) {
  // value*10 animated as an integer (e.g. 1.2 -> 0..12), then re-split with
  // a decimal point — matches the original page.tsx's count-then-divide
  // trick for the one stat that isn't a whole number.
  const digits = useSlotDigits(value * 10, 2000, enabled);
  const asString = digits.join("");
  const whole = asString.slice(0, -1) || "0";
  const decimal = asString.slice(-1);
  return <>{whole}.{decimal}</>;
}
