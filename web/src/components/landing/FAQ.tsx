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

/* Trimmed to the 4 highest-value, non-redundant questions — "What does
   GeekBid cost" duplicates the pricing cards directly above this
   section, and the upgrade/downgrade + ongoing-projects entries are
   niche enough to skip in the compact merged closing section. */
const FAQ_INDICES = [0, 1, 2, 5];

/** Nested content only (no <section> of its own) — rendered inside CTA
 *  so the FAQ and the final call-to-action share one closing beat. */
export default function FAQ() {
  const faqSection = useInView(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = FAQ_INDICES.map((i) => FAQS[i]);

  return (
    <div id="faq" ref={faqSection.ref} className="relative scroll-mt-20">
      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        <div
          className="text-center mb-10"
          style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}
        >
          <h2 className="landing-header-glow text-2xl sm:text-4xl font-serif font-normal text-[#f0e8d4] leading-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((item, i) => {
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
          className="faq-cta text-center mt-10"
          style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(16px)", transition: `opacity 0.6s ease ${150 + faqs.length * 60 + 100}ms, transform 0.6s ease ${150 + faqs.length * 60 + 100}ms` }}
        >
          <p className="text-sm text-[#a8997e] mb-4">Still have questions?</p>
          <a href="mailto:support@geekbid.io" className="btn-ghost text-sm px-6 py-3 rounded-[3px] inline-flex">
            <Mail className="h-4 w-4" /> Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
