export type PlanTier = 'free' | 'plus' | 'premium';

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
