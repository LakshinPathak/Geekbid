"use client";

import { useInView } from "./hooks";

const LINES = ["Friday, 5:04pm.", "Three jobs hired.", "Zero emails sent."];

/** A quiet, dark interlude before the final CTA. Three lines reveal as
 *  sequential log lines — a timestamped trace of the system having
 *  worked, not a headline — so the flatness of the delivery is doing
 *  the rhetorical work instead of scale or count-up theatrics. */
export default function PayoffBand() {
  const section = useInView(0.3);

  return (
    <section ref={section.ref} className="py-24 sm:py-32 bg-[#1b1523]">
      <div className="mx-auto max-w-[600px] px-5 sm:px-8 text-center">
        <div className="flex flex-col items-center gap-3.5">
          {LINES.map((line, i) => (
            <div
              key={line}
              className="flex items-center gap-3"
              style={{
                opacity: section.inView ? 1 : 0,
                transform: section.inView ? "translateY(0)" : "translateY(8px)",
                transition: `opacity 0.7s ease ${i * 0.4}s, transform 0.7s ease ${i * 0.4}s`,
              }}
            >
              <span className="h-1 w-1 rounded-full bg-[#a78bfa] shrink-0" aria-hidden="true" />
              <span
                className={
                  i === 0
                    ? "font-mono-il text-sm text-[#7d729a]"
                    : "text-xl sm:text-2xl font-medium text-[#f3effa]"
                }
              >
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
