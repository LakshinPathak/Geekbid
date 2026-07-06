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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#c9a84c]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#f0e8d4]">
            Start free. <span className="text-[#c9a84c]">Scale when you win.</span>
          </h2>
          <p className="text-[#a8997e] text-sm mt-3 max-w-xl mx-auto">
            Every plan includes the full reverse-auction engine, escrow protection, and AI tools.
            Paid tiers raise your limits and cut your platform fee — from 10% down to 5%.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.config.name}
              className={`relative rounded-[10px] p-7 flex flex-col border transition-transform duration-300 hover:-translate-y-1 ${
                tier.highlight
                  ? "bg-[#0d1120] border-[#c9a84c]/45 shadow-[0_0_60px_rgba(201,168,76,0.12)]"
                  : "bg-[#0a0d18] border-[rgba(201,168,76,0.16)]"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#c9a84c] text-[#050810] text-[10px] font-bold tracking-widest px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <div className="flex items-center gap-2 mb-3">
                <tier.icon className={`h-4 w-4 ${tier.highlight ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
                <h3 className="font-serif text-lg text-[#f0e8d4]">{tier.config.name}</h3>
              </div>
              <div className="mb-2">
                <span className="font-serif text-4xl text-[#f0e8d4]">${tier.config.price}</span>
                <span className="text-[#a8997e] text-sm ml-1.5">{tier.period}</span>
              </div>
              <p className="text-[#a8997e] text-xs mb-6">{tier.tagline}</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#a8997e]">
                    <Check className="h-3.5 w-3.5 text-[#c9a84c] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.config.price === 0 ? "/login" : "/pricing"}
                className={`w-full py-3 rounded-[6px] font-semibold text-sm text-center transition-all flex items-center justify-center gap-2 ${
                  tier.highlight
                    ? "bg-[#c9a84c] text-[#050810] hover:bg-[#d4b55a]"
                    : "border border-[rgba(201,168,76,0.3)] text-[#f0e8d4] hover:border-[#c9a84c] hover:bg-[#c9a84c]/5"
                }`}
              >
                {tier.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[#a8997e]/70 text-xs mt-8">
          No featured boosts on Free? Feature any job for a one-off $10. Upgrade, downgrade, or cancel anytime — your data is never deleted.
        </p>
      </div>
    </div>
  );
}
