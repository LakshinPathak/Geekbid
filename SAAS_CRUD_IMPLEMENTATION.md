# GeekBid — SaaS CRUD Implementation Plan

> **Status:** PLAN ONLY — no code changes yet  
> **Companion to:** `SAAS_SUBSCRIPTION_PLAN.md` (tier design & billing architecture)  
> **Scope:** Every database schema change, CRUD operation modification, backend enforcement point, and frontend wiring required to make Free/Plus/Premium tiers real.

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [Central Plan Config (New File)](#2-central-plan-config)
3. [Backend CRUD Changes — By Route](#3-backend-crud-changes)
4. [Frontend Changes — By Component](#4-frontend-changes)
5. [Migration Scripts](#5-migration-scripts)
6. [New API Routes Required](#6-new-api-routes)
7. [Dependency Map & Execution Order](#7-dependency-map)

---

## 1. Database Schema Changes

### 1.1 `users` Collection — Modified Fields

| Field | Current State | Target State | Notes |
|-------|--------------|-------------|-------|
| `plan` | `'free' \| 'pro' \| 'enterprise'` | `'free' \| 'plus' \| 'premium'` | Rename via migration script |
| `planLimits.jobsPostedThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.bidsPlacedThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.monthResetAt` | `string (ISO)` (exists) | No change | Already works |
| `planLimits.aiBidUsesThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.aiBidMonthResetAt` | `string (ISO)` (exists) | No change | Already works |
| `planLimits.aiUsesThisMonth` | `number` (exists, written by `ai-plan-limit.ts`) | No change | Already works |
| `planLimits.aiMonthResetAt` | `string (ISO)` (exists, written by `ai-plan-limit.ts`) | No change | Already works |

**New fields to add to `users`:**

| Field | Type | Purpose |
|-------|------|---------|
| `planLimits.featuredBoostsUsedThisMonth` | `number` | Track included featured boosts for Plus/Premium |
| `subscriptionId` | `string \| null` | Link to `subscriptions` collection |
| `planExpiresAt` | `string (ISO) \| null` | When current paid period ends (for grace period logic) |
| `planDowngradedAt` | `string (ISO) \| null` | Timestamp when auto-downgraded from paid → free |

### 1.2 `subscriptions` Collection — New

```
{
  _id: ObjectId,
  userId: string,
  plan: 'plus' | 'premium',
  razorpaySubscriptionId: string,
  razorpayPlanId: string,
  status: 'created' | 'active' | 'past_due' | 'halted' | 'cancelled' | 'completed',
  currentPeriodStart: string (ISO),
  currentPeriodEnd: string (ISO),
  cancelAtPeriodEnd: boolean,
  gracePeriodEndsAt: string (ISO) | null,
  createdAt: string (ISO),
  updatedAt: string (ISO),
  lastWebhookEventId: string | null
}
```

**Indexes needed:**
- `{ userId: 1 }` — unique, one active subscription per user
- `{ razorpaySubscriptionId: 1 }` — unique, webhook lookups
- `{ status: 1, gracePeriodEndsAt: 1 }` — cron/lazy-check for expired grace periods

### 1.3 `plan_change_log` Collection — New (Audit Trail)

```
{
  _id: ObjectId,
  userId: string,
  fromPlan: string,
  toPlan: string,
  reason: 'upgrade' | 'downgrade' | 'renewal_failure' | 'cancellation' | 'admin_override',
  triggeredBy: 'user' | 'webhook' | 'cron' | 'admin',
  createdAt: string (ISO)
}
```

### 1.4 TypeScript Type Fixes (`web/src/lib/utils.ts`)

**Current `User` type** (line ~60) has `plan?: string`. Needs:

```typescript
plan?: 'free' | 'plus' | 'premium';
planLimits?: {
  jobsPostedThisMonth?: number;
  bidsPlacedThisMonth?: number;
  monthResetAt?: string;
  aiUsesThisMonth?: number;
  aiMonthResetAt?: string;
  aiBidUsesThisMonth?: number;
  aiBidMonthResetAt?: string;
  featuredBoostsUsedThisMonth?: number;
};
subscriptionId?: string | null;
planExpiresAt?: string | null;
```

---

## 2. Central Plan Config

**New file: `web/src/lib/plans.ts`**

This is the single source of truth. Every route/component reads from here instead of hardcoding magic numbers.

```typescript
export type PlanTier = 'free' | 'plus' | 'premium';

export interface PlanConfig {
  name: string;
  price: number;              // monthly USD
  limits: {
    jobsPerMonth: number;     // client cap
    bidsPerMonth: number;     // freelancer cap
    aiGeneralPerMonth: number;
    aiBidStrategyPerMonth: number;
    featuredBoostsPerMonth: number;
    teamSeats: number;
  };
  platformFeePercent: number; // 10, 7, or 5
  hasApiAccess: boolean;
  apiRateLimit: number;       // requests per minute
  badge: string | null;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free', price: 0,
    limits: {
      jobsPerMonth: 3, bidsPerMonth: 10,
      aiGeneralPerMonth: 5, aiBidStrategyPerMonth: 2,
      featuredBoostsPerMonth: 0, teamSeats: 1,
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
    },
    platformFeePercent: 7,
    hasApiAccess: true, apiRateLimit: 60,
    badge: 'Plus',
  },
  premium: {
    name: 'Premium', price: 79,
    limits: {
      jobsPerMonth: 500, bidsPerMonth: 500,
      aiGeneralPerMonth: 200, aiBidStrategyPerMonth: 60,
      featuredBoostsPerMonth: 5, teamSeats: 10,
    },
    platformFeePercent: 5,
    hasApiAccess: true, apiRateLimit: 120,
    badge: 'Premium',
  },
};

export function getPlanConfig(plan?: string): PlanConfig {
  if (plan && plan in PLANS) return PLANS[plan as PlanTier];
  return PLANS.free;
}
```

**Files that currently hardcode limits (to be refactored):**

| File | Current Hardcoded Values | Refactor To |
|------|------------------------|-------------|
| `api/jobs/route.ts:107-127` | `$lt: 3` (free job cap) | `getPlanConfig(plan).limits.jobsPerMonth` |
| `api/bids/route.ts:93-113` | `$lt: 10` (free bid cap) | `getPlanConfig(plan).limits.bidsPerMonth` |
| `api/ai/bid-strategy/route.ts:38` | `FREE_PLAN_AI_BID_MONTHLY_LIMIT = 2` | `getPlanConfig(plan).limits.aiBidStrategyPerMonth` |
| `lib/ai-plan-limit.ts:20` | `FREE_PLAN_AI_MONTHLY_LIMIT = 5` | `getPlanConfig(plan).limits.aiGeneralPerMonth` |
| `api/v1/jobs/route.ts:136-158` | `$lt: 3` (free job cap, duplicated) | `getPlanConfig(plan).limits.jobsPerMonth` |
| `api/freelancer/dashboard/route.ts:46` | `plan === "pro" ? 50 : plan === "enterprise" ? 200 : 10` | `getPlanConfig(plan).limits.bidsPerMonth` |
| `components/feed/FreelancerFeed.tsx:154` | Same ternary chain | `getPlanConfig(plan).limits.bidsPerMonth` |
| `lib/money.ts:34` (splitEscrow) | Flat 10% always | `getPlanConfig(plan).platformFeePercent` |

---

## 3. Backend CRUD Changes — By Route

### 3.1 `POST /api/jobs` — Job Creation (Client)

**File:** `web/src/app/api/jobs/route.ts`  
**Current:** Only free-plan users are capped at 3. Paid = unlimited (no check).  
**Change:**

1. Read user's `plan` from DB
2. Look up `getPlanConfig(plan).limits.jobsPerMonth`
3. Apply the **same atomic `findOneAndUpdate` pattern** already used for free — but with the tier-specific cap instead of hardcoded `3`
4. Return `403` with tier-specific upgrade message when cap is hit

**Before (simplified):**
```typescript
if (plan === "free") {
  // atomic cap at 3
}
// else: no check at all ← BUG
```

**After:**
```typescript
const config = getPlanConfig(plan);
const cap = config.limits.jobsPerMonth;
// atomic findOneAndUpdate with $lt: cap — works for ALL tiers
```

### 3.2 `POST /api/bids` — Bid Placement (Freelancer)

**File:** `web/src/app/api/bids/route.ts`  
**Current:** Only free-plan users capped at 10. Paid = unlimited.  
**Change:** Same pattern as §3.1 — use `getPlanConfig(plan).limits.bidsPerMonth` for all tiers.

### 3.3 `POST /api/ai/bid-strategy` — AI Bid Strategist

**File:** `web/src/app/api/ai/bid-strategy/route.ts`  
**Current:** Free users capped at 2/month. Paid users skip the check entirely.  
**Change:**

1. Remove the `if (user.plan === "free" || !user.plan)` gate
2. Apply cap to **all** tiers using `getPlanConfig(plan).limits.aiBidStrategyPerMonth`
3. Same atomic `findOneAndUpdate` with `$lt: cap`
4. Error message dynamically says "Upgrade to Plus" or "Upgrade to Premium" based on current tier

### 3.4 General AI Routes (6 routes using `ai-plan-limit.ts`)

**File:** `web/src/lib/ai-plan-limit.ts`  
**Current:** `checkAndConsumeAiQuota()` hardcodes `FREE_PLAN_AI_MONTHLY_LIMIT = 5`, only checks free users.  
**Change:**

1. Accept `plan` parameter (or read it inside the function)
2. Use `getPlanConfig(plan).limits.aiGeneralPerMonth` as the cap
3. Apply to all tiers, not just free

**Affected AI routes (all call `checkAndConsumeAiQuota`):**
- `api/ai/chat-assist/route.ts`
- `api/ai/evaluate-bids/route.ts`
- `api/ai/generate-description/route.ts`
- `api/ai/quality-check/route.ts`
- `api/ai/pricing-advisor/route.ts`
- `api/ai/smart-search/route.ts`

### 3.5 `POST /api/v1/jobs` — Public API Job Creation

**File:** `web/src/app/api/v1/jobs/route.ts`  
**Current:** Duplicates the free-plan cap logic from `/api/jobs`. Paid = no check.  
**Changes:**

1. **API Access Gate:** Before any logic, check `getPlanConfig(plan).hasApiAccess`. Free users → `403 ERR_PLAN_LIMIT: "API access requires Plus or Premium plan"`
2. **Job cap:** Same centralized cap as §3.1
3. **Rate limit:** Use `getPlanConfig(plan).apiRateLimit` instead of hardcoded `60`

### 3.6 `splitEscrow()` — Platform Fee

**File:** `web/src/lib/money.ts`  
**Current:** Always charges 10% regardless of plan.  
**Change:**

```typescript
// Before
export function splitEscrow(gross: number, feePercent = 10) { ... }

// After — callers pass the user's plan
export function splitEscrow(gross: number, plan?: PlanTier) {
  const feePercent = getPlanConfig(plan).platformFeePercent;
  // ... rest unchanged
}
```

**All `splitEscrow()` call sites that need updating:**

| File | Line | Context |
|------|------|---------|
| `api/payments/route.ts` | 210 | Escrow funding — needs client's plan |
| `api/jobs/[id]/route.ts` | 143 | `accept_best` action — needs client's plan |
| `api/jobs/[id]/route.ts` | 352 | Freelancer accept — needs client's plan |
| `api/jobs/offer-response/route.ts` | 57 | Direct offer accept — needs client's plan |

Each call site already has the `job.clientId` available. Add a quick lookup: `const client = await db.collection("users").findOne(...)` → pass `client.plan` to `splitEscrow`.

### 3.7 `POST /api/teams` — Team Creation

**File:** `web/src/app/api/teams/route.ts`  
**Current:** Any user can create a team. No seat cap on invites.  
**Changes:**

1. **Team creation gate:** Free users → `403 "Teams require Plus or Premium plan"` (if teams are a paid feature; or allow 1-person team for free)
2. **Invite gate (PATCH action=invite):** Count `team.memberIds.length + 1` (owner). If >= `getPlanConfig(plan).limits.teamSeats` → `403 "Team seat limit reached"`

### 3.8 `PATCH /api/jobs/feature` — Featured Boost

**File:** `web/src/app/api/jobs/route.ts` (or dedicated feature route)  
**Current:** Endpoint exists but has no plan gate.  
**Changes:**

1. Check `getPlanConfig(plan).limits.featuredBoostsPerMonth`
2. Atomic increment of `planLimits.featuredBoostsUsedThisMonth`
3. If included boosts exhausted → offer pay-per-boost via existing Razorpay one-off flow
4. Free users with 0 included boosts → directly route to pay-per-boost

### 3.9 `GET /api/freelancer/dashboard` — Dashboard KPIs

**File:** `web/src/app/api/freelancer/dashboard/route.ts`  
**Current:** Hardcodes `plan === "pro" ? 50 : plan === "enterprise" ? 200 : 10` for `bidLimit`.  
**Change:** Replace with `getPlanConfig(plan).limits.bidsPerMonth`

### 3.10 `POST /api/seed` — Seed Data

**File:** `web/src/app/api/seed/route.ts`  
**Current (line 794):** Sets all users to `plan: "free"` with current `planLimits` shape.  
**Changes:**

1. Update plan values to use new tier names
2. Give some seed users `plan: 'plus'` and `plan: 'premium'` for testing
3. Add the new `planLimits` fields (`featuredBoostsUsedThisMonth: 0`)

### 3.11 Admin Routes — Plan Management

**Directory:** `web/src/app/api/admin/`  
**Current:** No plan management capability.  
**New route needed:** `PATCH /api/admin/users/[id]/plan`

```typescript
// Admin manually overrides a user's plan (for support/comping)
// Body: { plan: 'free' | 'plus' | 'premium' }
// Writes to plan_change_log with reason: 'admin_override'
```

---

## 4. Frontend Changes — By Component

### 4.1 `pricing/page.tsx` — Pricing Page

**Current:** Static PLANS array with `pro`/`enterprise` names. Buttons do nothing.  
**Changes:**

| Item | Change |
|------|--------|
| Tier names | `Pro` → `Plus`, `Enterprise` → `Premium` |
| Prices | `$29` → `$19`, `$99` → `$79` (per SAAS_SUBSCRIPTION_PLAN.md) |
| Plan values | `"pro"` → `"plus"`, `"enterprise"` → `"premium"` |
| Features list | Update to match `plans.ts` config |
| Upgrade buttons | Wire to Razorpay Subscriptions checkout (Phase 4) |
| Downgrade logic | Show "Downgrade" for users on higher tier viewing lower tier |
| Current plan indicator | Already works — no change needed |

### 4.2 `FreelancerFeed.tsx` — Bid Limit Display

**Current (line 154):** `const bidLimit = currentUser?.plan === "pro" ? 50 : currentUser?.plan === "enterprise" ? 200 : 10;`  
**Change:** Import `getPlanConfig` and use `getPlanConfig(currentUser?.plan).limits.bidsPerMonth`

### 4.3 `AIBidStrategist.tsx` — Limit Reached UX

**Current:** Disables button silently when quota hit.  
**Changes:**

1. Remove `disabled` for quota case (keep for `loading` only)
2. On click when quota exhausted → fire `toast.error("AI limit reached", { description: "..." })`
3. Update inline label from "(Free limit reached)" to dynamic tier-aware message
4. Import and use `getPlanConfig` for limit display

### 4.4 `profile/[id]/page.tsx` — Plan Badge

**Current (line 123):** `{user.plan === "pro" && ...}` → shows "PRO" badge  
**Change:** Check for `"plus"` and `"premium"`, show corresponding badges with different styling

### 4.5 `MyJobsSection.tsx` — Plan Badge

**Current (line 71):** `{user?.plan === "pro" && ...}`  
**Change:** Same as §4.4

### 4.6 `TalentPool.tsx` — Freelancer Badge

**Current (line 122):** `{freelancer.plan === "pro" && ...}`  
**Change:** Same as §4.4

### 4.7 `store.tsx` — State Management

**Current:** Fetches user data including `plan` and `planLimits`.  
**Changes:**

1. Update TypeScript interfaces to match new schema
2. Add helper: `getUserPlanConfig()` that returns the config for the current user's plan
3. Expose remaining quota counts for UI components

### 4.8 New Component: `PlanLimitBanner.tsx`

A reusable banner/toast component that shows when any limit is approaching (80% used) or reached. Used across:
- Job posting form (client)
- Bid placement modal (freelancer)
- AI features (all roles)

---

## 5. Migration Scripts

### 5.1 Plan Name Rename

**File:** `scripts/migrate-plan-names.mjs`  
**Run:** Once, before deploying renamed code

```javascript
// Idempotent — safe to run multiple times
const result1 = await db.collection('users').updateMany(
  { plan: 'pro' },
  { $set: { plan: 'plus' } }
);
const result2 = await db.collection('users').updateMany(
  { plan: 'enterprise' },
  { $set: { plan: 'premium' } }
);
console.log(`Renamed: ${result1.modifiedCount} pro→plus, ${result2.modifiedCount} enterprise→premium`);
```

### 5.2 Add New `planLimits` Fields

**File:** `scripts/migrate-plan-limits.mjs`  
**Run:** After §5.1

```javascript
await db.collection('users').updateMany(
  { 'planLimits.featuredBoostsUsedThisMonth': { $exists: false } },
  { $set: { 'planLimits.featuredBoostsUsedThisMonth': 0 } }
);
```

### 5.3 Create Indexes for New Collections

```javascript
// subscriptions
await db.collection('subscriptions').createIndex({ userId: 1 }, { unique: true });
await db.collection('subscriptions').createIndex({ razorpaySubscriptionId: 1 }, { unique: true });
await db.collection('subscriptions').createIndex({ status: 1, gracePeriodEndsAt: 1 });

// plan_change_log
await db.collection('plan_change_log').createIndex({ userId: 1, createdAt: -1 });
```

---

## 6. New API Routes Required

| Route | Method | Purpose | Phase |
|-------|--------|---------|-------|
| `api/subscriptions/route.ts` | POST | Create Razorpay subscription + redirect to checkout | 4 |
| `api/subscriptions/route.ts` | GET | Get current user's subscription status | 4 |
| `api/subscriptions/route.ts` | PATCH | Cancel subscription (sets `cancelAtPeriodEnd: true`) | 4 |
| `api/webhooks/razorpay/route.ts` | POST | Handle Razorpay subscription webhooks | 4 |
| `api/admin/users/[id]/plan/route.ts` | PATCH | Admin plan override | 2 |
| `api/user/plan/route.ts` | GET | Return current plan config + remaining quotas | 1 |

---

## 7. Dependency Map & Execution Order

```
Phase 0 (No dependencies, ship immediately)
├── Fix AIBidStrategist toast notification
├── Fix planLimits TypeScript type definition
└── Wire splitEscrow() to use plan-based fee %

Phase 1 (Depends on: nothing)
├── Create web/src/lib/plans.ts (central config)
├── Run migration scripts (§5.1, §5.2)
├── Rename all 'pro'→'plus', 'enterprise'→'premium' (12 files)
├── Create GET /api/user/plan route
└── Update seed data

Phase 2 (Depends on: Phase 1)
├── Refactor /api/jobs POST to use getPlanConfig()
├── Refactor /api/bids POST to use getPlanConfig()
├── Refactor ai-plan-limit.ts to be tier-aware
├── Refactor /api/ai/bid-strategy to be tier-aware
├── Refactor /api/v1/jobs to gate on API access + use tier caps
├── Refactor /api/freelancer/dashboard to use getPlanConfig()
├── Add team seat enforcement to /api/teams
├── Add featured boost enforcement
├── Add admin plan override route
├── Update FreelancerFeed.tsx, pricing/page.tsx, badges
└── Create PlanLimitBanner.tsx component

Phase 3 (Depends on: Phase 1)
├── Featured job pay-per-boost UI button
└── One-off Razorpay payment for boost (reuse existing flow)

Phase 4 (Depends on: Phase 2, separate project)
├── Create subscriptions collection + indexes
├── Create Razorpay Plans in dashboard (plus_monthly, premium_monthly)
├── Build POST /api/subscriptions (create)
├── Build PATCH /api/subscriptions (cancel)
├── Build POST /api/webhooks/razorpay
├── Wire pricing page buttons to checkout
├── Grace period state machine
└── Cron/lazy-check for expired grace periods
```

---

## Summary of All Files Touched

### Modified (existing files):

| File | Phase | Change Type |
|------|-------|-------------|
| `web/src/lib/utils.ts` | 1 | Type definitions |
| `web/src/lib/money.ts` | 0 | Accept plan param for fee % |
| `web/src/lib/ai-plan-limit.ts` | 2 | Tier-aware caps |
| `web/src/app/api/jobs/route.ts` | 2 | Centralized caps |
| `web/src/app/api/bids/route.ts` | 2 | Centralized caps |
| `web/src/app/api/ai/bid-strategy/route.ts` | 2 | Tier-aware caps |
| `web/src/app/api/v1/jobs/route.ts` | 2 | API access gate + caps |
| `web/src/app/api/payments/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/[id]/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/offer-response/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/freelancer/dashboard/route.ts` | 2 | Use getPlanConfig |
| `web/src/app/api/teams/route.ts` | 2 | Seat cap enforcement |
| `web/src/app/api/seed/route.ts` | 1 | New tier names + test data |
| `web/src/app/pricing/page.tsx` | 2 | Renamed tiers + wiring |
| `web/src/components/feed/FreelancerFeed.tsx` | 2 | Use getPlanConfig |
| `web/src/components/ai/AIBidStrategist.tsx` | 0 | Toast notification |
| `web/src/components/feed/MyJobsSection.tsx` | 1 | Badge rename |
| `web/src/components/feed/TalentPool.tsx` | 1 | Badge rename |
| `web/src/app/profile/[id]/page.tsx` | 1 | Badge rename |
| `web/src/lib/store.tsx` | 1 | Type updates |

### New files:

| File | Phase |
|------|-------|
| `web/src/lib/plans.ts` | 1 |
| `web/src/components/ui/PlanLimitBanner.tsx` | 2 |
| `web/src/app/api/user/plan/route.ts` | 1 |
| `web/src/app/api/admin/users/[id]/plan/route.ts` | 2 |
| `web/src/app/api/subscriptions/route.ts` | 4 |
| `web/src/app/api/webhooks/razorpay/route.ts` | 4 |
| `scripts/migrate-plan-names.mjs` | 1 |
| `scripts/migrate-plan-limits.mjs` | 1 |
| `scripts/create-indexes.mjs` | 4 |
