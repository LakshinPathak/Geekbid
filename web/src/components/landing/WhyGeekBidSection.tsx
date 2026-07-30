"use client";

import Comparison from "./Comparison";
import PricingSection from "./PricingSection";

/** Merges the "why us" comparison table and the pricing cards into one
 *  scroll beat — they were two consecutive sections making the same
 *  "here's the offer" case twice. */
export default function WhyGeekBidSection() {
  return (
    <section className="relative py-16 sm:py-20 border-t border-[rgba(91,33,182,0.22)] overflow-hidden">
      <Comparison />
      <div className="mt-14 sm:mt-16">
        <PricingSection />
      </div>
    </section>
  );
}
