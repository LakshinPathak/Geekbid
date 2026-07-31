"use client";

import { useEffect, useRef, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";
import { useInView } from "./hooks";
import { TESTIMONIALS } from "./data";

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
    <section id="testimonials" ref={testimonialsSection.ref} className="py-16 sm:py-24 border-t border-[rgba(91,33,182,0.22)] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#5b21b6]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-8 left-8 text-[200px] font-serif text-[rgba(91,33,182,0.03)] leading-none select-none hidden lg:block">&ldquo;</div>
        <div className="absolute bottom-8 right-8 text-[200px] font-serif text-[rgba(91,33,182,0.03)] leading-none select-none hidden lg:block rotate-180">&ldquo;</div>
      </div>

      <div className="mx-auto max-w-[1400px] px-5 relative z-10">
        <div className="text-center mb-16">
          <h2 className="landing-header-glow landing-h2 text-3xl sm:text-5xl text-[#17171f]">
            Loved by freelancers<br className="hidden sm:block" /> and clients alike
          </h2>
          <p className="landing-subhead text-base text-[#46424e] max-w-md mx-auto mt-4">Real results from real people using GeekBid to hire and get hired.</p>
        </div>

        {/* Auto-scrolling carousel */}
        <div className="relative -mx-5 sm:-mx-8">
          {/* Left fade mask */}
          <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, #fbfaf7, transparent)" }} />
          {/* Right fade mask */}
          <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-24 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, #fbfaf7, transparent)" }} />

          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 px-5 sm:px-8"
            style={{ opacity: testimonialsSection.inView ? 1 : 0, transform: testimonialsSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}
            onMouseEnter={() => { carouselPausedRef.current = true; }}
            onMouseLeave={() => { carouselPausedRef.current = false; }}
          >
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                className="landing-testimonial-border group relative rounded-2xl p-px overflow-hidden flex-shrink-0 transition-transform duration-300 ease-out hover:-translate-y-1"
                style={{ minWidth: "360px", maxWidth: "420px" }}
              >
                {/* inner card */}
                <div className="rounded-2xl bg-[#ffffff] p-6 sm:p-7 h-full flex flex-col relative overflow-hidden group-hover:bg-[#f6f4fa] transition-colors duration-300">
                  {/* decorative quote */}
                  <span className="absolute top-4 right-5 text-6xl font-serif text-[rgba(91,33,182,0.08)] leading-none select-none group-hover:text-[rgba(91,33,182,0.14)] transition-colors duration-300">&rdquo;</span>

                  {/* Top row: role tag + stars */}
                  <div className="flex items-center justify-between mb-5">
                    <span className={`landing-label px-2.5 py-1 rounded-full border ${t.tagBg}`}>{t.tag}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-[#5b21b6] text-[#5b21b6]" />
                      ))}
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-[#17171f] text-base leading-relaxed flex-1 mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  {/* Result pill */}
                  <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${t.accent} mb-5 self-start`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t.saved}
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-[rgba(91,33,182,0.15)] via-[rgba(91,33,182,0.06)] to-transparent mb-5" />

                  {/* Attribution */}
                  <div className="flex items-center gap-3">
                    {/* Avatar photo */}
                    <div className="relative shrink-0">
                      <CloudinaryAvatar
                        avatarUrl={t.photo}
                        avatarInitial={t.avatar}
                        size="lg"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#16a34a] border-2 border-[#ffffff]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#17171f]">{t.name}</p>
                      <p className="text-[11px] text-[#46424e] mt-0.5">{t.title} · <span className={t.accent}>{t.company}</span></p>
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
              style={{ width: activeDot === i ? 20 : 6, height: 6, background: activeDot === i ? "#5b21b6" : "rgba(168,153,126,0.35)" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
