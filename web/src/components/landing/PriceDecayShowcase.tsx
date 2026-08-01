"use client";

import { useInView } from "./hooks";
import HowItWorks from "./HowItWorks";

/** Continues directly off Hero rather than opening a new chapter — the
 *  live price-decay proof (the Hero demo card, now drag-scrubbable) and
 *  the "why does it fall" pitch (Hero's inline mechanism teaser) already
 *  happened up there, so this isn't a second headline + a second live
 *  ticking price card restating the same point. It's the concrete
 *  4-step mechanics of that same story, flowing straight out of Hero's
 *  activity ticker with no section-color break, no repeated hero card. */
export default function PriceDecayShowcase() {
  const section = useInView(0.15);

  return (
    <section
      id="how-it-works"
      ref={section.ref}
      className="relative pt-4 sm:pt-6 pb-16 sm:pb-24 overflow-hidden scroll-mt-20 bg-[#fbfaf7]"
    >
      <div className="relative mx-auto max-w-[1600px] px-5 sm:px-8">
        <HowItWorks inView={section.inView} />
      </div>
    </section>
  );
}
