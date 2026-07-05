"use client";

import { useEffect, useRef, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";
import { useInView } from "./hooks";
import { TESTIMONIALS } from "./data";

const TRUST_STRIP = [
  { val: "2,400+", label: "Active Freelancers" },
  { val: "94%", label: "Client Satisfaction" },
  { val: "$1.2M+", label: "Total Paid Out" },
  { val: "< 4hr", label: "Avg Match Time" },
];

export default function Testimonials() {
  const testimonialsSection = useInView(0.1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselPausedRef = useRef(false);
  const [activeDot, setActiveDot] = useState(0);
  const lastDotRef = useRef(0);

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
    <section id="testimonials" ref={testimonialsSection.ref} className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#c9a84c]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-8 left-8 text-[200px] font-serif text-[rgba(201,168,76,0.03)] leading-none select-none hidden lg:block">&ldquo;</div>
        <div className="absolute bottom-8 right-8 text-[200px] font-serif text-[rgba(201,168,76,0.03)] leading-none select-none hidden lg:block rotate-180">&ldquo;</div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 relative z-10">
        <div className="text-center mb-16">
          <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">What people say</p>
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
            Loved by engineers<br className="hidden sm:block" /> and clients alike
          </h2>
          <p className="text-base text-[#a8997e] max-w-md mx-auto mt-4">Real results from real people using GeekBid to hire and get hired.</p>
        </div>

        {/* Auto-scrolling carousel */}
        <div className="relative -mx-5">
          {/* Left fade mask */}
          <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #080b14, transparent)" }} />
          {/* Right fade mask */}
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #080b14, transparent)" }} />

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
                className="landing-testimonial-border group relative rounded-[8px] p-px overflow-hidden flex-shrink-0"
                style={{ minWidth: "340px", maxWidth: "400px" }}
              >
                {/* inner card */}
                <div className="rounded-[7px] bg-[#0a0d18] p-6 sm:p-7 h-full flex flex-col relative overflow-hidden group-hover:bg-[#0d1020] transition-colors duration-300">
                  {/* decorative quote */}
                  <span className="absolute top-4 right-5 text-6xl font-serif text-[rgba(201,168,76,0.08)] leading-none select-none group-hover:text-[rgba(201,168,76,0.14)] transition-colors duration-300">&rdquo;</span>

                  {/* Top row: role tag + stars */}
                  <div className="flex items-center justify-between mb-5">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-[3px] border ${t.tagBg}`}>{t.tag}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-[#c9a84c] text-[#c9a84c]" />
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="font-serif font-normal text-[#f0e8d4] text-base leading-relaxed flex-1 mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  {/* Result pill */}
                  <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${t.accent} mb-5 self-start`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t.saved}
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-[rgba(201,168,76,0.15)] via-[rgba(201,168,76,0.06)] to-transparent mb-5" />

                  {/* Attribution */}
                  <div className="flex items-center gap-3">
                    {/* Avatar photo */}
                    <div className="relative shrink-0">
                      <CloudinaryAvatar
                        avatarUrl={t.photo}
                        avatarInitial={t.avatar}
                        size="lg"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0a0d18]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#f0e8d4]">{t.name}</p>
                      <p className="text-[11px] text-[#a8997e] mt-0.5">{t.title} · <span className={t.accent}>{t.company}</span></p>
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
              style={{ width: activeDot === i ? 20 : 6, height: 6, background: activeDot === i ? "#c9a84c" : "rgba(168,153,126,0.35)" }}
            />
          ))}
        </div>

        {/* Bottom trust strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TRUST_STRIP.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-serif text-[#c9a84c]">{s.val}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#a8997e] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
