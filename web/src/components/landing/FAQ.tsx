"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useInView } from "./hooks";
import { FAQS } from "./data";

export default function FAQ() {
  const faqSection = useInView(0.1);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" ref={faqSection.ref} className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none animate-breathe" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
        <div
          className="text-center mb-14"
          style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}
        >
          <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">FAQ</p>
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={item.question}
                className={`faq-item ${isOpen ? "active" : ""}`}
                style={{ opacity: faqSection.inView ? 1 : 0, transform: faqSection.inView ? "translateY(0)" : "translateY(16px)", transition: `opacity 0.5s ease ${150 + i * 60}ms, transform 0.5s ease ${150 + i * 60}ms` }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-medium text-[#f0e8d4]">{item.question}</span>
                  <ChevronDown className="faq-chevron h-4 w-4 text-[#c9a84c] shrink-0" />
                </button>
                <div className="faq-answer px-5">
                  <p className="pb-4 text-sm sm:text-base text-[#a8997e] leading-relaxed">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
