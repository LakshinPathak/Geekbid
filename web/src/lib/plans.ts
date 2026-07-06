export type PlanTier = 'free' | 'plus' | 'premium';

// One-off pay-per-boost price (blueprint §5: "$5-15/boost") — reuses the
// existing one-off Razorpay payment flow rather than new payment infra.
export const FEATURED_BOOST_PRICE_USD = 10;

export interface PlanConfig {
  name: string;
  price: number;
  limits: {
    jobsPerMonth: number;
    bidsPerMonth: number;
    aiGeneralPerMonth: number;
    aiBidStrategyPerMonth: number;
    featuredBoostsPerMonth: number;
    teamSeats: number;
    invitesPerMonth: number;
    maxApiKeys: number;
  };
  platformFeePercent: number;
  hasApiAccess: boolean;
  apiRateLimit: number;
  badge: string | null;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free', price: 0,
    limits: {
      jobsPerMonth: 3, bidsPerMonth: 10,
      aiGeneralPerMonth: 5, aiBidStrategyPerMonth: 2,
      featuredBoostsPerMonth: 0, teamSeats: 0,
      invitesPerMonth: 5, maxApiKeys: 0,
    },
    platformFeePercent: 10,
    hasApiAccess: false, apiRateLimit: 0,
    badge: null,
  },
  plus: {
    name: 'Plus', price: 19,
    limits: {
      jobsPerMonth: 50, bidsPerMonth: 100,
      aiGeneralPerMonth: 50, aiBidStrategyPerMonth: 15,
      featuredBoostsPerMonth: 2, teamSeats: 3,
      invitesPerMonth: 25, maxApiKeys: 2,
    },
    platformFeePercent: 7,
    hasApiAccess: true, apiRateLimit: 100,
    badge: 'Plus',
  },
  premium: {
    name: 'Premium', price: 79,
    limits: {
      jobsPerMonth: 500, bidsPerMonth: 500,
      aiGeneralPerMonth: 200, aiBidStrategyPerMonth: 60,
      featuredBoostsPerMonth: 5, teamSeats: 10,
      invitesPerMonth: Infinity, maxApiKeys: 10,
    },
    platformFeePercent: 5,
    hasApiAccess: true, apiRateLimit: 500,
    badge: 'Premium',
  },
};

// Backward-compat mapping for legacy plan names during the migration window
// (blueprint §25) — without this, any user still holding the old 'pro'/'enterprise'
// value in the DB would silently fall through to the Free tier mid-deploy.
export function getPlanConfig(plan?: string): PlanConfig {
  if (plan === 'pro') return PLANS.plus;
  if (plan === 'enterprise') return PLANS.premium;
  if (plan && plan in PLANS) return PLANS[plan as PlanTier];
  return PLANS.free;
}

function resolveTier(plan?: string): PlanTier {
  if (plan === 'pro') return 'plus';
  if (plan === 'enterprise') return 'premium';
  if (plan && plan in PLANS) return plan as PlanTier;
  return 'free';
}

interface FeeOverrideCache {
  fees: Partial<Record<PlanTier, number>>;
  expiresAt: number;
}

let feeOverrideCache: FeeOverrideCache | null = null;
const FEE_OVERRIDE_CACHE_MS = 5 * 60 * 1000;

// Admin-config-aware variant of getPlanConfig() — checks the platform_config
// collection for a per-tier platformFeePercent override (set via
// PATCH /api/admin/config) before falling back to the hardcoded PLANS value.
// Cached in-process for 5 minutes so every job/bid write doesn't hit the DB
// twice just to read a fee percentage that rarely changes.
export async function getPlanConfigWithOverrides(
  plan: string | undefined,
  db: { collection: (name: string) => { findOne: (query: unknown) => Promise<unknown> } }
): Promise<PlanConfig> {
  const tier = resolveTier(plan);
  const base = PLANS[tier];

  if (!feeOverrideCache || feeOverrideCache.expiresAt < Date.now()) {
    const configDoc = (await db.collection("platform_config").findOne({ key: "platform_config" })) as
      | { planFees?: Partial<Record<PlanTier, number>> }
      | null;
    feeOverrideCache = {
      fees: configDoc?.planFees ?? {},
      expiresAt: Date.now() + FEE_OVERRIDE_CACHE_MS,
    };
  }

  const feeOverride = feeOverrideCache.fees[tier];
  if (feeOverride === undefined) return base;
  return { ...base, platformFeePercent: feeOverride };
}

// Called by PATCH /api/admin/config right after a planFees write so the next
// getPlanConfigWithOverrides() call doesn't serve a stale cached fee for up
// to 5 minutes.
export function invalidatePlanFeeCache(): void {
  feeOverrideCache = null;
}
