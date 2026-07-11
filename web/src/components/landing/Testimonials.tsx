"use client";

import { useEffect, useRef, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";
import { useInView, useSlotDigits } from "./hooks";
import { TESTIMONIALS, STATS } from "./data";

/* Slot-machine rolling digits — same treatment the standalone Stats
   section used before it was folded into this trust strip. */
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

function DecimalSlotNumber({ value, enabled }: { value: number; enabled: boolean }) {
  // value*10 animated as an integer (e.g. 1.2 -> 0..12), then re-split
  // with a decimal point — the count-then-divide trick for the one
  // stat that isn't a whole number ($1.2M).
  const digits = useSlotDigits(value * 10, 2000, enabled);
  const asString = digits.join("");
  const whole = asString.slice(0, -1) || "0";
  const decimal = asString.slice(-1);
  return <>{whole}.{decimal}</>;
}

// Labels for the trust strip — same STATS values/order as the old
// standalone Stats section, with two labels reworded to read better
// alongside testimonials ("Total Paid Out" vs "Total Volume").
const TRUST_STRIP_LABELS = ["Active Freelancers", "Total Paid Out", "Client Satisfaction", "Avg Match Time"];

export default function Testimonials() {
  const testimonialsSection = useInView(0.1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselPausedRef = useRef(false);
  const [activeDot, setActiveDot] = useState(0);
  const lastDotRef = useRef(0);

  const slot0 = useSlotDigits(STATS[0].value, 1800, testimonialsSection.inView);
  const slot2 = useSlotDigits(STATS[2].value, 1800, testimonialsSection.inView);
  const slot3 = useSlotDigits(STATS[3].value, 1400, testimonialsSection.inView);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (carouselPausedRef.current) return;
      const mid = el.scrollWidth / 2;
      if (!mid) return;
      el.scrollLeft += 1;
      if (el.scrollLeft >= mid) el.scrollLeft -= mid;
      const newDot = Math.floor((el.scrollLeft / mid) * TESTIMONIALS.length) % TESTIMONIALS.length;
      if (newDot !== lastDotRef.current) { lastDotRef.current = newDot; setActiveDot(newDot); }
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="testimonials" ref={testimonialsSection.ref} className="py-24 sm:py-32 border-t border-[rgba(75,63,143,0.22)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#4b3f8f]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-8 left-8 text-[200px] font-serif text-[rgba(75,63,143,0.03)] leading-none select-none hidden lg:block">&ldquo;</div>
        <div className="absolute bottom-8 right-8 text-[200px] font-serif text-[rgba(75,63,143,0.03)] leading-none select-none hidden lg:block rotate-180">&ldquo;</div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 relative z-10">
        <div className="text-center mb-16">
          <h2 className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#3d3a45]">
            Loved by engineers<br className="hidden sm:block" /> and clients alike
          </h2>
          <p className="landing-subhead text-base text-[#6f6a7d] max-w-md mx-auto mt-4">Real results from real people using GeekBid to hire and get hired.</p>
        </div>

        {/* Auto-scrolling carousel */}
        <div className="relative -mx-5">
          {/* Left fade mask */}
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #fbfaf7, transparent)" }} />
          {/* Right fade mask */}
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #fbfaf7, transparent)" }} />

          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 px-5"
            style={{ opacity: testimonialsSection.inView ? 1 : 0, transform: testimonialsSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}
            onMouseEnter={() => { carouselPausedRef.current = true; }}
            onMouseLeave={() => { carouselPausedRef.current = false; }}
          >
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                className="landing-testimonial-border group relative rounded-2xl p-px overflow-hidden flex-shrink-0"
                style={{ minWidth: "340px", maxWidth: "400px" }}
              >
                {/* inner card */}
                <div className="rounded-2xl bg-[#ffffff] p-6 sm:p-7 h-full flex flex-col relative overflow-hidden group-hover:bg-[#f4f2ee] transition-colors duration-300">
                  {/* decorative quote */}
                  <span className="absolute top-4 right-5 text-6xl font-serif text-[rgba(75,63,143,0.08)] leading-none select-none group-hover:text-[rgba(75,63,143,0.14)] transition-colors duration-300">&rdquo;</span>

                  {/* Top row: role tag + stars */}
                  <div className="flex items-center justify-between mb-5">
                    <span className={`landing-label px-2.5 py-1 rounded-full border ${t.tagBg}`}>{t.tag}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-[#4b3f8f] text-[#4b3f8f]" />
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-[#3d3a45] text-base leading-relaxed flex-1 mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  {/* Result pill */}
                  <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${t.accent} mb-5 self-start`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t.saved}
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-[rgba(75,63,143,0.15)] via-[rgba(75,63,143,0.06)] to-transparent mb-5" />

                  {/* Attribution */}
                  <div className="flex items-center gap-3">
                    {/* Avatar photo */}
                    <div className="relative shrink-0">
                      <CloudinaryAvatar
                        avatarUrl={t.photo}
                        avatarInitial={t.avatar}
                        size="lg"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#4d7245] border-2 border-[#ffffff]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#3d3a45]">{t.name}</p>
                      <p className="text-[11px] text-[#6f6a7d] mt-0.5">{t.title} · <span className={t.accent}>{t.company}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              aria-label={`Testimonial ${i + 1}`}
              onClick={() => { if (carouselRef.current) { const mid = carouselRef.current.scrollWidth / 2; carouselRef.current.scrollLeft = (mid / TESTIMONIALS.length) * i; } }}
              className="rounded-full transition-all duration-300"
              style={{ width: activeDot === i ? 20 : 6, height: 6, background: activeDot === i ? "#4b3f8f" : "rgba(168,153,126,0.35)" }}
            />
          ))}
        </div>

        {/* Bottom trust strip — animated slot-machine digits (folded in from the old standalone Stats section) */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {STATS.map((s, i) => (
            <div key={s.label} className="text-center">
              <p className="text-xl landing-num text-[#4b3f8f] tabular-nums">
                {s.prefix}
                {i === 0 && <SlotNumber digits={slot0} />}
                {i === 1 && <DecimalSlotNumber value={STATS[1].value} enabled={testimonialsSection.inView} />}
                {i === 2 && <SlotNumber digits={slot2} />}
                {i === 3 && <SlotNumber digits={slot3} />}
                {s.suffix}
              </p>
              <p className="landing-label text-[#6f6a7d] mt-0.5">{TRUST_STRIP_LABELS[i]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
