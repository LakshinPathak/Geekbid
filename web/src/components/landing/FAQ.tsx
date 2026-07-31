"use client";

import { Plus } from "lucide-react";
import { useInView } from "./hooks";
import { FAQS } from "./data";

/** Native <details>/<summary> accordion — same primitive already used
 *  for the Price Decay Formula toggle in HowItWorks.tsx, extended to a
 *  repeated list. No JS open/close state needed; the browser owns it. */
export default function FAQ() {
  const section = useInView(0.15);

  return (
    <section
      id="faq"
      ref={section.ref}
      className="py-16 sm:py-24 border-t border-[rgba(91,33,182,0.22)] bg-white scroll-mt-20"
    >
      <div className="mx-auto max-w-[760px] px-5 sm:px-8">
        <div
          className="text-center mb-12"
          style={{
            opacity: section.inView ? 1 : 0,
            transform: section.inView ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.7s ease, transform 0.7s ease",
          }}
        >
          <p className="landing-label text-[#5b21b6] mb-3">FAQ</p>
          <h2 className="landing-h2 text-3xl sm:text-5xl text-[#17171f]">
            Questions, answered
          </h2>
        </div>

        <div>
          {FAQS.map((faq, i) => (
            <details
              key={faq.q}
              className="group border-b border-[rgba(91,33,182,0.22)] py-5"
              style={{
                opacity: section.inView ? 1 : 0,
                transform: section.inView ? "translateY(0)" : "translateY(14px)",
                transition: `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`,
              }}
            >
              <summary className="list-none flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-[15px] font-medium text-[#17171f]">{faq.q}</span>
                <Plus className="h-[18px] w-[18px] text-[#5b21b6] shrink-0 transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.78,0.2,1)] motion-reduce:transition-none">
                <div className="overflow-hidden">
                  <p className="text-sm leading-relaxed text-[#46424e] mt-3.5 max-w-[620px]">
                    {faq.a}
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
