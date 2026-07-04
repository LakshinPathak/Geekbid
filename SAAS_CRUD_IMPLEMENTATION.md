# GeekBid — SaaS CRUD Implementation Plan

> **Status:** PLAN ONLY — no code changes yet  
> **Companion to:** `SAAS_SUBSCRIPTION_PLAN.md` (tier design & billing architecture)  
> **Scope:** Every database schema change, CRUD operation modification, backend enforcement point, and frontend wiring required to make Free/Plus/Premium tiers real.  
> **Validated:** 3-pass codebase audit completed — 3 errors fixed, 10 gaps addressed, 36+ claims verified ✅

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [Central Plan Config (New File)](#2-central-plan-config)
3. [Backend CRUD Changes — By Route](#3-backend-crud-changes)
4. [Frontend Changes — By Component](#4-frontend-changes)
5. [Migration Scripts](#5-migration-scripts)
6. [New API Routes Required](#6-new-api-routes)
7. [Dependency Map & Execution Order](#7-dependency-map)
8. [Validation Log](#8-validation-log)
9. [Known Risks & Design Decisions](#9-known-risks)

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
| `planLimits.invitesSentThisMonth` | `number` | Track monthly invitations sent (for invite cap enforcement, see §3.14) |
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
- `{ userId: 1 }` — **non-unique** (user may have old cancelled + new active docs; query with `{ userId, status: { $in: ['active', 'created', 'past_due'] } }` to find current)
- `{ razorpaySubscriptionId: 1 }` — unique, webhook lookups
- `{ status: 1, gracePeriodEndsAt: 1 }` — cron/lazy-check for expired grace periods

> **⚠️ Design Decision:** The `userId` index is intentionally **non-unique** to preserve subscription history across cancellation/resubscription cycles. Option B (unique + upsert) was rejected because it destroys audit trail data.

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
  invitesSentThisMonth?: number;
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
    invitesPerMonth: number;  // monthly freelancer invite cap
    maxApiKeys: number;       // max active API keys (0 = no access)
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
| `lib/ai-plan-limit.ts:8` | `FREE_PLAN_AI_MONTHLY_LIMIT = 5` | `getPlanConfig(plan).limits.aiGeneralPerMonth` |
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

> **⚠️ Note:** All error messages currently say `"Upgrade to Pro"` — these must also be updated to dynamic tier-aware messages (e.g., `"Upgrade to Plus"` or `"Upgrade to Premium"` depending on the user's current tier). This applies to error strings in `jobs/route.ts:127`, `bids/route.ts:113`, `v1/jobs/route.ts:158`, `ai-plan-limit.ts:53`, `bid-strategy/route.ts:70`, and `pricing/page.tsx:36`.

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

**Affected AI routes (all call `checkAndConsumeAiQuota` — 7 total):**
- `api/ai/chat-assist/route.ts`
- `api/ai/evaluate-bids/route.ts`
- `api/ai/generate-description/route.ts`
- `api/ai/quality-check/route.ts`
- `api/ai/pricing-advisor/route.ts`
- `api/ai/smart-search/route.ts`
- `api/ai/summarize-reviews/route.ts`

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
**Change:** Keep the existing function signature unchanged (it already accepts `feePercent`). Callers resolve the fee from the plan config:

```typescript
// money.ts — NO CHANGES NEEDED (already accepts feePercent param)
export function splitEscrow(gross: number, feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT) { ... }

// At each call site — resolve fee from plan before calling:
const feePercent = getPlanConfig(client.plan).platformFeePercent;
const escrow = splitEscrow(grossAmount, feePercent);
```

> This preserves backward compatibility — `money.ts` stays a pure math utility with no plan-awareness coupling.

**All `splitEscrow()` call sites that need updating:**

| File | Line | Context |
|------|------|---------|
| `api/payments/route.ts` | 210 | Escrow funding — needs client's plan |
| `api/jobs/[id]/route.ts` | 143 | `accept_best` action — needs client's plan |
| `api/jobs/[id]/route.ts` | 352 | Freelancer accept — needs client's plan |
| `api/jobs/offer-response/route.ts` | 57 | Direct offer accept — needs client's plan |

Each call site already has the `job.clientId` available. Add a quick lookup: `const client = await db.collection("users").findOne(...)` → pass `client.plan` to `splitEscrow`.

### 3.7 `POST /api/teams` — Team Creation & Seat Enforcement

**File:** `web/src/app/api/teams/route.ts`  
**Current:** Any user can create a team. No seat cap on invites.  
**Changes:**

1. **Team creation gate:** Check `getPlanConfig(plan).limits.teamSeats > 0` before allowing creation. Free users (0 seats) → `403 "Team workspaces require Plus or Premium plan"`
2. **Invite gate (PATCH action=invite):** Count `team.memberIds.length + 1` (owner). If >= `getPlanConfig(plan).limits.teamSeats` → `403 "Team seat limit reached"`
3. **Tier-aware error:** `"Plus plan supports up to 3 team members. Upgrade to Premium for 10."`

> **⚠️ Note:** This section supersedes the original §3.7 and the later §3.13 (which were duplicates found across validation passes). The logic is now unified here.

### 3.8 `PATCH /api/jobs/feature` — Featured Boost

**File:** `web/src/app/api/jobs/feature/route.ts`  
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
**Current (line 794):** Sets all users to `plan: "free"` with current `planLimits` shape. Does NOT include AI quota fields (`aiUsesThisMonth`, `aiBidUsesThisMonth`, etc.) — those are lazily created at runtime.  
**Changes:**

1. Update plan values to use new tier names
2. Give some seed users `plan: 'plus'` and `plan: 'premium'` for testing
3. Add the new `planLimits` fields (`featuredBoostsUsedThisMonth: 0`, `invitesSentThisMonth: 0`)
4. **Pre-populate all AI quota fields** for test coverage: `aiUsesThisMonth: 0`, `aiMonthResetAt: now`, `aiBidUsesThisMonth: 0`, `aiBidMonthResetAt: now`
5. Give at least one seed user a near-limit count (e.g., `aiUsesThisMonth: 4` on a free user) to test limit-approaching UX

> **Why:** Lazy init works in production, but during QA the AI limit enforcement paths won't trigger without pre-populated quota fields. Pre-populating ensures test coverage of limit-approaching and limit-hit UI states.

### 3.11 Admin Routes — Plan Management

**Directory:** `web/src/app/api/admin/`  
**Current:** No plan management capability.  
**New route needed:** `PATCH /api/admin/users/[id]/plan`

```typescript
// Admin manually overrides a user's plan (for support/comping)
// Body: { plan: 'free' | 'plus' | 'premium' }
// Writes to plan_change_log with reason: 'admin_override'
```

### 3.12 `POST /api/jobs/direct-offer` — Direct Offer Job Quota ⚠️ HIGH

**File:** `web/src/app/api/jobs/direct-offer/route.ts`  
**Current:** Creates a `type: "direct_offer"` job with no plan check. Inserts directly into `jobs` collection without incrementing `planLimits.jobsPostedThisMonth`. A free user can bypass the 3-job/month cap entirely via direct offers.  
**Changes:**

1. Apply same `getPlanConfig(plan).limits.jobsPerMonth` enforcement as `POST /api/jobs`
2. Atomic `findOneAndUpdate` to increment `planLimits.jobsPostedThisMonth`
3. Month-reset check (same logic as jobs route)
4. Direct offers count toward the same job quota as auction posts

### 3.13 ~~`POST /api/teams` — Team Creation Plan Gate~~ → Merged into §3.7

> This section was originally added in validation Pass 3 as a separate finding. It has been **merged into §3.7** above to eliminate duplication. The enforcement logic is the same.

### 3.14 `POST /api/invites` — Freelancer Invite Limits

**File:** `web/src/app/api/invites/route.ts`  
**Current:** Clients can send unlimited invitations to freelancers regardless of tier.  
**Changes:**

1. Consider adding `invitesPerMonth` to plan config (Free: 5, Plus: 25, Premium: unlimited)
2. Track in `planLimits.invitesSentThisMonth` (new field)
3. Atomic increment + cap check on `POST /api/invites`

> **Note:** This is a MEDIUM priority. Invites aren't currently listed as a tier differentiator in `SAAS_SUBSCRIPTION_PLAN.md` but should be considered to prevent spam invitations by free users.

### 3.15 `POST /api/keys` — API Key Generation Plan Gate ⚠️ HIGH

**File:** `web/src/app/api/keys/route.ts`  
**Current:** Any authenticated user can generate unlimited API keys.  
**Per SAAS_SUBSCRIPTION_PLAN:** API access is a Premium-tier feature.  
**Changes:**

1. Check `getPlanConfig(plan).hasApiAccess` before allowing key creation
2. Free users → 403: `"API access requires Plus or Premium plan"`
3. Cap total active keys per tier: `getPlanConfig(plan).limits.maxApiKeys` (Free: 0, Plus: 2, Premium: 10)
4. Frontend: Update `settings/page.tsx` to show upgrade CTA instead of key creation form for free users (see §4.9)

### 3.16 `v1/jobs` Rate Limit — Tier-Aware Throttling

**File:** `web/src/app/api/v1/jobs/route.ts` (line 57)  
**Current:** `checkRateLimit('v1:${userId}', 60, 60 * 1000)` — flat 60 req/min for everyone.  
**Changes:**

1. Replace `60` with `getPlanConfig(plan).limits.apiRatePerMinute`
2. Suggested values: Free: 0 (blocked), Plus: 100/min, Premium: 500/min
3. This requires fetching the user before rate limiting (currently rate-limits before user lookup — reorder needed)

### 3.17 Admin Config `platformFeePercent` — Conflict Resolution

**File:** `web/src/app/admin/config/page.tsx` (line 11, 21, 69)  
**Current:** Admin can set a global `platformFeePercent` (default 10%).  
**Problem:** With per-tier fees (10%/7%/5%), the global override conflicts.  
**Changes:**

1. Deprecate the single `platformFeePercent` slider
2. Replace with per-tier fee inputs: Free Fee %, Plus Fee %, Premium Fee %
3. `getPlanConfig()` should check admin config overrides first, then fall back to code defaults
4. The API route `PATCH /api/admin/config` needs updated validation for the new shape

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

**Current:** Disables button silently when quota hit. The `isFreePlanLimited` check (line 41-44) hardcodes `>= 2` and only checks `=== "free"` — meaning Plus/Premium users never see limits even though they have finite caps.  
**Changes:**

1. Replace the hardcoded `>= 2` with `getPlanConfig(currentUser.plan).limits.aiBidStrategyPerMonth`
2. Remove the `=== "free"` gate — check limits for ALL tiers
3. Remove `disabled` for quota case (keep for `loading` only)
4. On click when quota exhausted → fire `toast.error("AI limit reached", { description: "..." })`
5. Update inline label from "(Free limit reached)" to dynamic tier-aware message
6. Import and use `getPlanConfig` for limit display

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

### 4.9 `settings/page.tsx` — API Key Access Gate

**File:** `web/src/app/settings/page.tsx`  
**Current:** Shows API key creation form for all authenticated users.  
**Changes:**

1. Check `getPlanConfig(currentUser?.plan).hasApiAccess` on mount
2. If `false` → replace the key creation form with an upgrade CTA card:
   - "API Access requires Plus or Premium plan"
   - Button: "View Plans" → link to `/pricing`
3. If `true` → show existing form + add note showing remaining key slots: `"${activeKeys} / ${maxApiKeys} keys used"`
4. Display current plan badge in the header

### 4.10 `admin/config/page.tsx` — Per-Tier Fee Config

**File:** `web/src/app/admin/config/page.tsx`  
**Current:** Single `platformFeePercent` slider (global 10%).  
**Changes:**

1. Replace single slider with 3 inputs: "Free Tier Fee %", "Plus Tier Fee %", "Premium Tier Fee %"
2. Pre-populate from `getPlanConfig` defaults (10%, 7%, 5%)
3. Admin overrides persist to the `platform_config` collection
4. `getPlanConfig()` checks admin config overrides first, then falls back to code defaults
5. Show a warning if any tier fee is set above 15% or below 3%

### 4.11 `evaluate-bids` AI Prompt — Plan Label Update

**File:** `web/src/app/api/ai/evaluate-bids/route.ts` (lines 92, 115)  
**Current:** Passes `freelancer.plan` to Gemini prompt as `"Plan: ${b.freelancer.plan ?? 'free'}"`  
**Change:** No code change needed — after the rename migration, this will automatically show "plus"/"premium" instead of "pro"/"enterprise". Documenting here for awareness only.

### 4.12 `PATCH /api/user` — Security Note

**File:** `web/src/app/api/user/route.ts` (line 51-61)  
**Current:** `allowedFields` whitelist correctly **excludes** `plan`. This prevents client-side plan escalation via profile PATCH.  
**Change:** No change needed — this is correct behavior. **Do NOT add `plan` to `allowedFields`**. Plan changes must go through admin override (§3.11) or webhook (§6).

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
  { $set: {
    'planLimits.featuredBoostsUsedThisMonth': 0,
    'planLimits.invitesSentThisMonth': 0,
  } }
);
```

### 5.3 Create Indexes for New Collections

```javascript
// subscriptions — userId is NON-UNIQUE (preserves history across cancel/resubscribe cycles)
await db.collection('subscriptions').createIndex({ userId: 1 });
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
├── Add team seat enforcement to /api/teams (§3.7)
├── Add direct-offer job quota enforcement (§3.12) ⚠️ HIGH
├── Add invite cap enforcement to /api/invites (§3.14)
├── Add API key plan gate to /api/keys (§3.15) ⚠️ HIGH
├── Add tier-aware rate limiting to /api/v1 (§3.16)
├── Add featured boost enforcement
├── Add admin plan override route
├── Deprecate admin global fee → per-tier fees (§3.17)
├── Update FreelancerFeed.tsx, pricing/page.tsx, badges
├── Update settings/page.tsx with plan gate (§4.9)
├── Update admin/config for per-tier fees (§4.10)
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
| `web/src/app/api/v1/jobs/route.ts` | 2 | API access gate + caps + tier rate limit |
| `web/src/app/api/payments/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/[id]/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/offer-response/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/direct-offer/route.ts` | 2 | Job quota enforcement (§3.12) |
| `web/src/app/api/freelancer/dashboard/route.ts` | 2 | Use getPlanConfig |
| `web/src/app/api/teams/route.ts` | 2 | Seat cap enforcement (§3.7) |
| `web/src/app/api/invites/route.ts` | 2 | Invite cap enforcement (§3.14) |
| `web/src/app/api/keys/route.ts` | 2 | Plan gate for API access (§3.15) |
| `web/src/app/api/seed/route.ts` | 1 | New tier names + AI quota fields |
| `web/src/app/api/admin/config/route.ts` | 2 | Per-tier fee support (§3.17) |
| `web/src/app/pricing/page.tsx` | 2 | Renamed tiers + wiring |
| `web/src/app/settings/page.tsx` | 2 | Plan gate + upgrade CTA (§4.9) |
| `web/src/app/admin/config/page.tsx` | 2 | Per-tier fee inputs (§4.10) |
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

---

## 8. Validation Log

> Three-pass codebase audit performed against all 25 API route directories, 13 lib files, all frontend components, admin pages, and state management.

### Pass 1+2 Findings (Fixed)

| # | Type | Finding | Resolution |
|---|------|---------|------------|
| 1 | ❌ Error | Missing AI route `summarize-reviews` in §3.4 | Added as 7th route |
| 2 | ❌ Error | `splitEscrow` refactor broke signature (changed `feePercent` to `PlanTier`) | Kept original param, callers resolve fee from config |
| 3 | ❌ Error | Feature route path wrong (`jobs/route.ts` vs `jobs/feature/route.ts`) | Fixed file path in §3.8 |
| 4 | ⚠️ Gap | "Upgrade to Pro" error strings not listed as rename targets | Added note in §3.1 covering all 6 files |
| 5 | ⚠️ Gap | Seed data missing AI quota fields for testing | Expanded §3.10 with pre-population steps |
| 6 | ⚠️ Gap | `AIBidStrategist.tsx` hardcoded `>= 2` and `=== "free"` gate | Fixed in §4.3 |
| 7 | ⚠️ Gap | `subscriptions.userId` index was marked `unique` | Changed to non-unique in §1.2 and §5.3 |

### Pass 3 Findings (Fixed)

| # | Type | Finding | Severity | Resolution |
|---|------|---------|----------|------------|
| 8 | ⚠️ Gap | Direct offers (`/api/jobs/direct-offer`) bypass job quota entirely | 🔴 HIGH | Added §3.12 |
| 9 | ⚠️ Gap | Teams route has no plan gate (anyone can create) | 🔴 HIGH | Merged into §3.7, §3.13 redirects there |
| 10 | ⚠️ Gap | Unlimited freelancer invites for all tiers | 🟡 MEDIUM | Added §3.14 |
| 11 | ⚠️ Gap | API keys available to free users (should be Plus+) | 🔴 HIGH | Added §3.15 |
| 12 | ⚠️ Gap | API rate limit is flat 60/min for everyone | 🟡 MEDIUM | Added §3.16 |
| 13 | ⚠️ Gap | Admin global `platformFeePercent` conflicts with per-tier fees | 🟡 MEDIUM | Added §3.17 |

### Verified Correct (✅ 36+ claims)

| Area | Count | Notes |
|------|-------|-------|
| Hardcoded limit values (§2) | 8/8 | All line numbers and values confirmed |
| splitEscrow call sites (§3.6) | 4/4 | All file paths and line numbers confirmed |
| AI routes using quota check (§3.4) | 7/7 | All confirmed (including added summarize-reviews) |
| Badge checks (§4.4-4.6) | 3/3 | profile:123, MyJobs:71, TalentPool:122 |
| Routes with no plan gate needed | 12/12 | chat, disputes, email-logs, milestones, notifications, reviews, transactions, referrals, assessments, auth, pricing engine, email |
| Security checks | 2/2 | `PATCH /api/user` correctly excludes `plan` from allowedFields; admin route requires `ADMIN_SECRET_KEY` |

---

## 9. Known Risks & Design Decisions

### 9.1 Quota Counters Never Decrement

**Problem:** When a bid is deleted or rejected, `planLimits.bidsPlacedThisMonth` is never decremented. A user who posts 10 bids (free cap) then deletes 5 still shows 10/10 used. Same applies to jobs.

**Impact:** Users may permanently hit limits even after cleaning up their activity.

**Decision:** This is an intentional simplification for MVP. Decrementing quotas introduces race conditions and potential abuse vectors (create-delete loops to circumvent limits). The monthly reset at `monthResetAt` provides a natural ceiling.

**Future:** If user complaints are significant, add opt-in decrement for `DELETE /api/bids` with a separate `$inc: { 'planLimits.bidsPlacedThisMonth': -1 }` call, protected by a minimum of 0.

### 9.2 AI Prompt Exposes Plan Tier

**File:** `api/ai/evaluate-bids/route.ts` (line 115)  
**Context:** The AI bid evaluator sends `"Plan: plus"` / `"Plan: premium"` to Gemini as part of freelancer context. This means the AI's recommendation could be biased by the freelancer's subscription level.

**Decision:** Keep for now — it provides useful signal (paid users are more invested). If bias becomes a concern, strip `plan` from the AI prompt context.

### 9.3 Admin Fee Override vs Plan Config

**Current conflict:** Admin config has a global `platformFeePercent` and the new plan system has per-tier fees. The resolution (§3.17) replaces the global with per-tier inputs. During the transition, `getPlanConfig()` should:
1. Check if admin overrides exist in DB
2. If yes, use admin values
3. If no, use code defaults from `plans.ts`

This means a cold start with no admin config uses the hardcoded 10/7/5 split.

### 9.4 `teamSeats: 0` for Free Tier

The free tier `teamSeats` was changed from `1` to `0`. This means free users **cannot** create teams at all (not even a solo team). If solo team creation is desired for free users, set back to `1` and gate only the invite action.

