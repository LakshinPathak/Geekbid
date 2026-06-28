/**
 * GeekBid Adaptive Pricing Engine
 *
 * Isomorphic — runs identically on both client (browser) and server (API route).
 * All functions are pure: same inputs → same output. No side effects.
 *
 * Algorithm:
 * effectiveDecay = baseDecay × demandMultiplier
 * price = max(startingPrice - effectiveDecay × hours + bidBoost, minimumPrice)
 *
 * Demand multiplier uses a continuous log curve (no cliff jumps):
 * multiplier = 1 / (1 + log₂(1 + uniqueBidderCount))
 */

// ── Types ────────────────────────────────────────────────────────

export type PricingInput = {
 startingPrice: number;
 minimumPrice: number;
 decayRatePerHour: number;
 postedAt: string;
 pricingMode?: "fixed" | "adaptive";
 bidCount?: number;
 uniqueBidderCount?: number;
 lastBidAt?: string | null;
 lowestCounterBid?: number | null;
};

// ── Main Price Calculator ────────────────────────────────────────

export function getAdaptivePrice(input: PricingInput, now: Date): number {
 const {
 startingPrice,
 minimumPrice,
 decayRatePerHour,
 postedAt,
 } = input;

 const elapsedMs = Math.max(now.getTime() - new Date(postedAt).getTime(), 0);
 const elapsedHours = elapsedMs / (1000 * 60 * 60);

 // 1. Demand multiplier (continuous curve based on unique bidders)
 const multiplier = getDemandMultiplier(
 input.uniqueBidderCount ?? input.bidCount ?? 0,
 elapsedHours
 );

 // 2. Base price with adaptive decay
 const effectiveDecay = decayRatePerHour * multiplier;
 const basePrice = startingPrice - effectiveDecay * elapsedHours;

 // 3. Bid boost (temporary upward bump from recent activity)
 const boost = getBidBoost(input, now);

 // 4. Counter-bid pull (downward pressure from lowest counter)
 const pull = getCounterPullEffect(basePrice + boost, input, elapsedHours);

 // 5. Clamp: never above starting, never below floor
 const raw = basePrice + boost - pull;
 return Math.max(Math.min(raw, startingPrice), minimumPrice);
}

// ── Demand Multiplier (Continuous Curve) ────────────────────────
//
// Uses inverse log₂: smooth transitions, no cliff jumps.
//
// 0 bidders → 1.00 (normal decay)
// 1 bidder → 0.50
// 2 bidders → 0.39
// 3 bidders → 0.33
// 5 bidders → 0.28
// 10 bidders → 0.22
// 20 bidders → 0.19
//
// Zero-bid acceleration:
// After 24h with 0 bids → ramps from 1.0× to 2.0× over next 48h

export function getDemandMultiplier(
 bidderCount: number,
 hoursSincePost: number
): number {
 // Bidder factor: more unique bidders → lower multiplier → slower decay
 const bidderFactor = 1 / (1 + Math.log2(1 + Math.max(bidderCount, 0)));

 // Time penalty: accelerate decay if zero interest after 24h
 let timePenalty = 1.0;
 if (bidderCount === 0 && hoursSincePost > 24) {
 // Ramps from 1.0 at 24h to 2.0 at 72h, capped at 2.0
 timePenalty = 1 + Math.min((hoursSincePost - 24) / 48, 1.0);
 }

 return bidderFactor * timePenalty;
}

// ── Bid Boost (Temporary Price Recovery) ────────────────────────
//
// When bids arrive, price bumps up slightly to reflect demand.
// Boost fades to zero over 2 hours after the last bid.
//
// Rules:
// - Only triggers with 2+ total bids
// - Capped at 10% of price range
// - Decays linearly over 2 hours

export function getBidBoost(input: PricingInput, now: Date): number {
 const { startingPrice, minimumPrice, bidCount, lastBidAt } = input;
 const totalBids = bidCount ?? 0;

 // Need at least 2 bids for boost to activate
 if (totalBids < 2 || !lastBidAt) return 0;

 const hoursSinceLastBid =
 (now.getTime() - new Date(lastBidAt).getTime()) / (1000 * 60 * 60);

 // Boost fades to zero over 2 hours
 if (hoursSinceLastBid >= 2) return 0;

 const fadeMultiplier = 1 - hoursSinceLastBid / 2;
 const priceRange = startingPrice - minimumPrice;
 const maxBoost = priceRange * 0.1; // cap at 10% of range

 // Scale by bid count (capped at 5 bids for max effect)
 const bidScale = Math.min(totalBids, 5) / 5;
 return maxBoost * bidScale * fadeMultiplier;
}

// ── Counter-Bid Price Pull ──────────────────────────────────────
//
// When a freelancer places a counter below the current price,
// it creates downward pressure toward the midpoint.
//
// Effect fades as price naturally decays past the counter level.

export function getCounterPullEffect(
 currentPrice: number,
 input: PricingInput,
 elapsedHours: number
): number {
 const { lowestCounterBid, minimumPrice } = input;

 if (
 lowestCounterBid === null ||
 lowestCounterBid === undefined ||
 lowestCounterBid >= currentPrice
 ) {
 return 0;
 }

 // Pull toward midpoint between current and lowest counter
 const midpoint = (currentPrice + lowestCounterBid) / 2;
 const pullAmount = currentPrice - midpoint;

 // Effect strengthens over time (takes ~2 hours to fully manifest)
 const pullStrength = Math.min(elapsedHours / 2, 1.0);

 // Never pull below the minimum price
 const effectivePull = pullAmount * pullStrength * 0.5; // dampen to 50% effect
 if (currentPrice - effectivePull < minimumPrice) {
 return Math.max(currentPrice - minimumPrice, 0);
 }

 return effectivePull;
}

// ── Demand Level Label ──────────────────────────────────────────

export type DemandLevel = {
 label: string;
 color: string;
 bgColor: string;
 borderColor: string;
};

export function getDemandLevel(uniqueBidderCount: number): DemandLevel | null {
 if (uniqueBidderCount <= 0) return null;
 if (uniqueBidderCount <= 2)
 return {
 label: "Interested",
 color: "text-blue-400",
 bgColor: "bg-blue-500/10",
 borderColor: "border-blue-500/20",
 };
 if (uniqueBidderCount <= 4)
 return {
 label: "In Demand",
 color: "text-yellow-400",
 bgColor: "bg-yellow-500/10",
 borderColor: "border-yellow-500/20",
 };
 return {
 label: "🔥 Hot",
 color: "text-orange-400",
 bgColor: "bg-orange-500/10",
 borderColor: "border-orange-500/20",
 };
}

// ── Effective Decay Rate (for display) ──────────────────────────

export function getEffectiveDecayRate(
 baseRate: number,
 bidderCount: number,
 hoursSincePost: number
): number {
 return baseRate * getDemandMultiplier(bidderCount, hoursSincePost);
}
