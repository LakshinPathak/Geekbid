"use client";

import { useInView, useCountUp, useReducedMotion } from "./hooks";
import { CATEGORIES, type Category } from "./data";

const SPARK_W = 64;
const SPARK_H = 20;
const ROW_STAGGER_S = 0.07;

/** Tiny 7-point trend line, normalized into a `SPARK_W`x`SPARK_H`
 *  viewBox. Draws itself via stroke-dashoffset in sync with the
 *  column's count-up (same `inView` gate, same stagger), rather than
 *  animating independently — a small readout next to the number, not
 *  decoration. */
function Sparkline({ points, inView, delay, reducedMotion }: { points: number[]; inView: boolean; delay: number; reducedMotion: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * SPARK_W;
      const y = SPARK_H - ((p - min) / range) * SPARK_H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const drawn = reducedMotion || inView;
  const lastX = (points.length - 1) / (points.length - 1) * SPARK_W;
  const lastY = SPARK_H - ((points[points.length - 1] - min) / range) * SPARK_H;

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="overflow-visible" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="#5b21b6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        style={{
          strokeDasharray: 100,
          strokeDashoffset: drawn ? 0 : 100,
          opacity: 0.55,
          transition: reducedMotion ? "none" : `stroke-dashoffset 0.7s cubic-bezier(0.2,0.78,0.2,1) ${delay}s`,
        }}
      />
      {/* Live-pulse dot on the latest point — a small continuous
          "still ticking" cue, echoing the always-live feel of the
          auction cards on the other side of this split (their price
          ticks/flashes on an interval; this readout is a rolling
          aggregate, so it gets a quiet ambient pulse instead of a
          literal tick). Appears once the line has finished drawing. */}
      <circle
        cx={lastX}
        cy={lastY}
        r="2"
        fill="#5b21b6"
        className={reducedMotion ? undefined : "landing-spark-pulse"}
        style={{
          opacity: drawn ? 1 : 0,
          transition: `opacity 0.3s ease ${delay + 0.7}s`,
          animationDelay: reducedMotion ? undefined : `${delay + 0.7}s`,
        }}
      />
    </svg>
  );
}

/** One category card. Metrics count up on reveal (reuses useCountUp,
 *  the same hook Hero's stats use) and the price-drop % grows a thin
 *  proportional fill bar in lockstep, paired with a small sparkline
 *  tracing the week's trend on the same draw-progress timing — a
 *  small nod to the site's numbers-carry-the-story convention (mono
 *  figures everywhere else). */
function CategoryCard({ cat, index, inView, reducedMotion }: { cat: Category; index: number; inView: boolean; reducedMotion: boolean }) {
  const rowDelay = index * ROW_STAGGER_S;
  const count = useCountUp(cat.count, 900, 0, inView);
  const drop = useCountUp(cat.avgDrop, 900, 0, inView);

  return (
    <div
      className="group bg-white border border-[rgba(91,33,182,0.22)] rounded-2xl px-6 py-5 hover:shadow-[0_16px_30px_-14px_rgba(91,33,182,0.2)] transition-shadow duration-300"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${index * 0.07}s, transform 0.6s ease ${index * 0.07}s, box-shadow 0.3s ease`,
      }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className="h-11 w-11 rounded-xl bg-[#f4f2ee] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:rotate-[12deg] group-hover:scale-110">
          <cat.icon className="h-[18px] w-[18px] text-[#5b21b6]" />
        </div>
        <div>
          <div className="text-[15px] font-medium text-[#17171f]">{cat.name}</div>
          <div className="text-xs text-[#46424e]">{count} live auctions</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(91,33,182,0.14)]">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className="font-mono-il text-lg text-[#17171f]">{drop}</span>
              <span className="font-mono-il text-xs text-[#46424e]">%</span>
            </div>
            <Sparkline points={cat.trend} inView={inView} delay={rowDelay} reducedMotion={reducedMotion} />
          </div>
          <div className="text-[10px] text-[#46424e] mb-1.5">avg price drop</div>
          <div className="h-1 bg-[#f4f2ee] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5b21b6] rounded-full transition-[width] duration-[900ms] ease-out"
              style={{ width: inView ? `${cat.avgDrop}%` : "0%" }}
            />
          </div>
        </div>
        <div>
          <div className="font-mono-il text-lg text-[#17171f]">{cat.timeToHire}</div>
          <div className="text-[10px] text-[#46424e]">median time-to-hire</div>
        </div>
      </div>
    </div>
  );
}

/** "Talent for every kind of work" — category grid enriched with a
 *  per-category readout (live auctions, avg price drop, time-to-hire).
 *  No live backend counts exist for this yet, so values are
 *  representative static data (same treatment as AUCTIONS/TESTIMONIALS
 *  in data.ts). */
export default function Categories() {
  const section = useInView(0.15);
  const reducedMotion = useReducedMotion();

  return (
    <section ref={section.ref} className="@container py-16 sm:py-24 lg:py-20 lg:bg-white lg:border-l lg:border-[rgba(91,33,182,0.14)]">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:pl-6">
        <div
          className="text-center mb-12"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="landing-label text-[#5b21b6] mb-3">Categories</p>
          <h2 className="landing-h2 text-3xl sm:text-5xl text-[#17171f]">
            Talent for every kind of work
          </h2>
        </div>

        <div className="grid grid-cols-1 @[420px]:grid-cols-2 @[760px]:grid-cols-3 gap-4">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.name} cat={cat} index={i} inView={section.inView} reducedMotion={reducedMotion} />
          ))}
        </div>
      </div>
    </section>
  );
}
