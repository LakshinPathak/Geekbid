"use client";

import Comparison from "./Comparison";
import PricingSection from "./PricingSection";

/** Merges the "why us" comparison table and the pricing cards into one
 *  scroll beat — they were two consecutive sections making the same
 *  "here's the offer" case twice. */
export default function WhyGeekBidSection() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] overflow-hidden">
      <Comparison />
      <div className="mt-20 sm:mt-28">
        <PricingSection />
      </div>
    </section>
  );
}
