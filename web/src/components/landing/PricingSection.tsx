"use client";

import Link from "next/link";
import { Check, Zap, Crown, Building2, ArrowRight } from "lucide-react";
import { PLANS } from "@/lib/plans";

// Landing-page pricing — numbers come straight from lib/plans.ts (the single
// source of truth for tiers) so this section can never drift from what the
// backend actually enforces.
const TIERS = [
  {
    config: PLANS.free,
    period: "forever",
    icon: Zap,
    tagline: "Everything you need to try the reverse auction.",
    features: [
      `${PLANS.free.limits.jobsPerMonth} job posts / month`,
      `${PLANS.free.limits.bidsPerMonth} bids / month`,
      `${PLANS.free.limits.aiGeneralPerMonth} AI analyses / month`,
      "Escrow-protected payments",
      `${PLANS.free.platformFeePercent}% platform fee`,
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    config: PLANS.plus,
    period: "/month",
    icon: Crown,
    tagline: "For serious clients and full-time freelancers.",
    features: [
      `${PLANS.plus.limits.jobsPerMonth} job posts / month`,
      `${PLANS.plus.limits.bidsPerMonth} bids / month`,
      `${PLANS.plus.limits.aiGeneralPerMonth} AI analyses + ${PLANS.plus.limits.aiBidStrategyPerMonth} Bid Strategist runs`,
      `${PLANS.plus.limits.featuredBoostsPerMonth} featured boosts + ${PLANS.plus.limits.teamSeats} team seats`,
      `API access (${PLANS.plus.apiRateLimit} req/min)`,
      `${PLANS.plus.platformFeePercent}% platform fee`,
    ],
    cta: "Upgrade to Plus",
    highlight: true,
  },
  {
    config: PLANS.premium,
    period: "/month",
    icon: Building2,
    tagline: "For agencies and teams that hire at scale.",
    features: [
      `${PLANS.premium.limits.jobsPerMonth} job posts / month`,
      `${PLANS.premium.limits.bidsPerMonth} bids / month`,
      `${PLANS.premium.limits.aiGeneralPerMonth} AI analyses + ${PLANS.premium.limits.aiBidStrategyPerMonth} Bid Strategist runs`,
      `${PLANS.premium.limits.featuredBoostsPerMonth} boosts + ${PLANS.premium.limits.teamSeats} team seats + unlimited invites`,
      `API access (${PLANS.premium.apiRateLimit} req/min) + dedicated support`,
      `${PLANS.premium.platformFeePercent}% platform fee`,
    ],
    cta: "Go Premium",
    highlight: false,
  },
];

/** Nested content only (no <section> of its own) — rendered inside
 *  WhyGeekBidSection alongside Comparison. */
export default function PricingSection() {
  return (
    <div id="pricing" className="relative px-6 lg:px-8 overflow-hidden scroll-mt-20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#5b21b6]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-12">
          <h2 className="landing-h2 text-3xl sm:text-5xl text-[#17171f]">
            Start free. <span className="text-[#5b21b6]">Scale when you win.</span>
          </h2>
          <p className="landing-subhead text-[#46424e] text-base sm:text-lg mt-3 max-w-xl mx-auto">
            Every plan includes the full reverse-auction engine, escrow protection, and AI tools.
            Paid tiers raise your limits and cut your platform fee — from 10% down to 5%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.config.name}
              className={`relative rounded-2xl p-8 sm:p-9 flex flex-col border transition-transform duration-300 hover:-translate-y-1 ${
                tier.highlight
                  ? "bg-[#ffffff] border-[#5b21b6]/45 shadow-[0_0_60px_rgba(91,33,182,0.12)]"
                  : "bg-[#ffffff] border-[rgba(91,33,182,0.16)]"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5b21b6] text-[#ffffff] landing-label px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <div className="flex items-center gap-2 mb-4">
                <tier.icon className={`h-4 w-4 ${tier.highlight ? "text-[#5b21b6]" : "text-[#46424e]"}`} />
                <h3 className="landing-card-title text-lg text-[#17171f]">{tier.config.name}</h3>
              </div>
              <div className="mb-3">
                <span className="landing-num text-[2.75rem] text-[#17171f]">${tier.config.price}</span>
                <span className="text-[#46424e] text-sm ml-1.5">{tier.period}</span>
              </div>
              <p className="text-[#46424e] text-xs mb-7">{tier.tagline}</p>
              <ul className="space-y-3 mb-9 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#46424e]">
                    <Check className="h-3.5 w-3.5 text-[#5b21b6] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.config.price === 0 ? "/login" : "/pricing"}
                className={`w-full py-3 rounded-full font-semibold text-sm text-center transition-all flex items-center justify-center gap-2 ${
                  tier.highlight
                    ? "bg-[#5b21b6] text-[#ffffff] hover:bg-[#7c3aed]"
                    : "border border-[rgba(91,33,182,0.3)] text-[#17171f] hover:border-[#5b21b6] hover:bg-[#5b21b6]/5"
                }`}
              >
                {tier.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[#46424e]/70 text-xs mt-8">
          No featured boosts on Free? Feature any job for a one-off $10. Upgrade, downgrade, or cancel anytime — your data is never deleted.
        </p>
      </div>
    </div>
  );
}
