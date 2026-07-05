"use client";

import { useState } from "react";
import {
  ChevronDown, TrendingDown, Shield, BarChart3, CreditCard, Zap, Layers, Mail,
  type LucideIcon,
} from "lucide-react";
import { useInView } from "./hooks";
import { FAQS } from "./data";

/* Per-question icon + accent — colors reused verbatim from FEATURES in
   data.ts (emerald/blue/gold/cyan/amber/purple already exist in the
   design system), never invented here. */
const FAQ_META: { icon: LucideIcon; bg: string; color: string; border: string }[] = [
  { icon: TrendingDown, bg: "bg-emerald-500/10", color: "text-emerald-400", border: "border-emerald-500/20" },
  { icon: Shield, bg: "bg-blue-500/10", color: "text-blue-400", border: "border-blue-500/20" },
  { icon: BarChart3, bg: "bg-[rgba(201,168,76,0.12)]", color: "text-[#c9a84c]", border: "border-[rgba(201,168,76,0.28)]" },
  { icon: CreditCard, bg: "bg-cyan-500/10", color: "text-cyan-400", border: "border-cyan-500/20" },
  { icon: Zap, bg: "bg-amber-500/10", color: "text-amber-400", border: "border-amber-500/20" },
  { icon: Layers, bg: "bg-purple-500/10", color: "text-purple-400", border: "border-purple-500/20" },
];

export default function FAQ() {
  const faqSection = useInView(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" ref={faqSection.ref} className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative overflow-hidden">
      {/* Ambient background — purple orb (existing) + a second gold orb for depth, both reusing animate-breathe */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none animate-breathe" aria-hidden="true" />
      <div className="absolute top-10 -left-20 w-[350px] h-[350px] bg-[#c9a84c]/[0.04] rounded-full blur-[110px] pointer-events-none animate-breathe" style={{ animationDelay: "3s", animationDuration: "11s" }} aria-hidden="true" />
      {/* Subtle dot-grid texture — same recipe as Hero's, just for premium consistency */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ backgroundImage: "radial-gradient(circle, rgba(201,168,76,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <div
          className="text-center mb-14"
          style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}
        >
          <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">FAQ</p>
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
            Frequently asked questions
          </h2>
          <p className="text-base text-[#a8997e] max-w-lg mx-auto mt-5">
            Everything you need to know about pricing, escrow, and how the reverse auction actually works.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            const meta = FAQ_META[i % FAQ_META.length];
            return (
              <div
                key={item.question}
                className={`faq-border-wrap ${isOpen ? "faq-glow-border" : ""}`}
                style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(16px)", transition: `opacity 0.5s ease ${150 + i * 60}ms, transform 0.5s ease ${150 + i * 60}ms` }}
              >
                <div className={`faq-item landing-glass-card ${isOpen ? "active" : ""}`}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="faq-number shrink-0 w-6 text-center" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div
                      className={`faq-icon-badge h-10 w-10 rounded-[6px] border ${meta.bg} ${meta.border} flex items-center justify-center shrink-0 ${faqSection.inView ? "landing-icon-pop" : ""}`}
                      style={{ animationDelay: `${150 + i * 80}ms` }}
                    >
                      <meta.icon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <span className="flex-1 text-sm sm:text-base font-medium text-[#f0e8d4]">{item.question}</span>
                    <ChevronDown className="faq-chevron h-4 w-4 text-[#c9a84c] shrink-0" />
                  </button>
                  <div className="faq-answer px-5">
                    <p className="pb-5 pl-0 sm:pl-[92px] text-sm sm:text-base text-[#a8997e] leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom micro-CTA */}
        <div
          className="faq-cta text-center mt-12"
          style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(16px)", transition: `opacity 0.6s ease ${150 + FAQS.length * 60 + 100}ms, transform 0.6s ease ${150 + FAQS.length * 60 + 100}ms` }}
        >
          <p className="text-sm text-[#a8997e] mb-4">Still have questions?</p>
          <a href="mailto:support@geekbid.io" className="btn-ghost text-sm px-6 py-3 rounded-[3px] inline-flex">
            <Mail className="h-4 w-4" /> Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
