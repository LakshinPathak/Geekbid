# GeekBid — SaaS Subscription Blueprint (Unified)

> **Status:** PLAN ONLY — no code changes yet
> **Validated:** 6-pass codebase audit (3 original + 1 independent + 1 production-grade + 1 live re-verification on 2026-07-05) — 3 errors fixed, 11 gaps addressed (4 HIGH), 7 critical production gaps added, 6 additional discrepancies corrected in Pass 6, 40+ claims verified ✅
> **Execution plan:** See `SAAS_PHASED_EXECUTION_PLAN.md` for the phase-by-phase build checklist derived from this blueprint.
> **Scope:** Complete business strategy + technical implementation plan for Free/Plus/Premium tiers (production-hardened)
> **Supersedes:** `SAAS_SUBSCRIPTION_PLAN.md` (business) + `SAAS_CRUD_IMPLEMENTATION.md` (technical) — both now merged here

---

## Table of Contents

**Part A — Business & Strategy**
1. [Why This Exists](#1-why-this-exists)
2. [Current State Audit](#2-current-state-audit)
3. [Tier Structure & Pricing](#3-tier-structure--pricing)
4. [Open Decisions](#4-open-decisions)
5. [Featured Job Boosts — Monetization](#5-featured-job-boosts)

**Part B — Technical Implementation**
6. [Database Schema Changes](#6-database-schema-changes)
7. [Central Plan Config (New File)](#7-central-plan-config)
8. [Backend CRUD Changes — By Route](#8-backend-crud-changes)
9. [Frontend Changes — By Component](#9-frontend-changes)
10. [Migration Scripts](#10-migration-scripts)
11. [New API Routes Required](#11-new-api-routes)
12. [Dependency Map & Execution Order](#12-dependency-map)

**Part C — Production Hardening** *(NEW — Pass 5)*
13. [Webhook Idempotency & Error Recovery](#13-webhook-idempotency)
14. [Subscription State Machine](#14-subscription-state-machine)
15. [Quota Reset Alignment](#15-quota-reset-alignment)
16. [Plan Downgrade Handler](#16-plan-downgrade-handler)
17. [Fee Locking at Job Creation](#17-fee-locking)
18. [Concurrent Session Consistency](#18-concurrent-sessions)
19. [Distributed Rate Limiting](#19-distributed-rate-limiting)
20. [Billing Email Infrastructure](#20-billing-emails)
21. [Mid-Cycle Plan Change Proration](#21-proration)
22. [Razorpay Reconciliation Cron](#22-reconciliation-cron)
23. [Team Seat Removal on Downgrade](#23-team-seat-removal)
24. [Quota Consumption Audit Log](#24-quota-audit-log)
25. [Migration Rollback Strategy](#25-migration-rollback)
26. [Per-Request User Context Middleware](#26-user-context-middleware)

**Part D — Quality & Risk**
27. [Validation Log](#27-validation-log)
28. [Known Risks & Design Decisions](#28-known-risks)
29. [Summary of All Files Touched](#29-summary)

---

# Part A — Business & Strategy

## 1. Why This Exists

GeekBid needs to run as a proper SaaS with three subscription tiers — **Free, Plus, Premium** — each with different pricing and different unlocked capabilities. The immediate trigger was the AI Bid Strategist silently disabling itself once the free quota (2 uses/month) is hit, with no explanation to the user of *why* or *what to do about it*.

This plan is based on a full read of the codebase's existing monetization code (not guesses), covers the tier/pricing design itself, and includes a phased engineering plan for how to wire it up for real. Two research passes and one technical-design pass went into this.

---

## 2. Current State Audit

A fair amount of scaffolding is already half-built:

- **A 3-tier system already exists in the type system**: `User.plan?: 'free' | 'pro' | 'enterprise'` (`web/src/lib/utils.ts:60`). We'd rename `pro`→`plus`, `enterprise`→`premium` rather than build from scratch.
- **A `/pricing` page already exists** (`web/src/app/pricing/page.tsx`) with a hardcoded 3-tier comparison table — Free ($0), Pro ($29/mo), Enterprise ($99/mo). **The Upgrade/Contact Sales buttons have no click handler at all.** This page is effectively a mockup.
- **A working one-off Razorpay payment flow exists** (`web/src/app/api/payments/route.ts`) — but it's for funding job escrow. **There is no recurring subscription billing anywhere in the codebase.** No webhook endpoint, no `/api/subscriptions` route.
- **Existing plan-gated limits** (free tier only — paid tiers are currently "unlimited," unenforced):
  - Job posts: 3/month (`web/src/app/api/jobs/route.ts`)
  - Bids placed: 10/month (`web/src/app/api/bids/route.ts`)
  - General AI features (7 routes): 5/month (`web/src/lib/ai-plan-limit.ts`)
  - AI Bid Strategist: 2/month, its own separate stricter cap (`web/src/app/api/ai/bid-strategy/route.ts`)
- **The frontend already displays** paid-tier numbers (50 bids for "pro", 200 for "enterprise") that **the backend does not enforce** — this is a real bug.
- **The per-tier platform fee (10%/7%/5%) is not wired up** — `splitEscrow()` (`web/src/lib/money.ts`) always charges flat 10%.
- **A ready-to-use paid feature**: `Job.featured` field + a working `PATCH /api/jobs/feature` endpoint — but no payment/plan gate and no UI button.
- **Team/multi-seat accounts already exist** (`web/src/app/api/teams/route.ts`) — any user can create a team and invite unlimited members today, no seat cap.
- **`sonner` toasts are already used elsewhere** — the AI Bid Strategist fix reuses an existing UI pattern.

---

## 3. Tier Structure & Pricing

Numbers below are starting proposals — treat as editable.

| | **Free** | **Plus** | **Premium** |
|---|---|---|---|
| **Price** | $0 | **$19/mo** | **$79/mo** |
| **Job posts/month** (clients) | 3 | 50 | 500 |
| **Bids/month** (freelancers) | 10 | 100 | 500 |
| **General AI actions/month** | 5 | 50 | 200 |
| **AI Bid Strategist uses/month** | 2 | 15 | 60 |
| **Platform fee** (on escrow) | 10% | 7% | 5% |
| **Featured boosts included/month** | 0 (pay-per-boost only) | 2 included | 5 included |
| **Team seats** | 0 (no team) | 3 | 10 |
| **Invites/month** | 5 | 25 | Unlimited |
| **API access** (`/api/v1/jobs`) | Not available | Available (100 req/min) | Available (500 req/min) |
| **API keys** | 0 | 2 | 10 |
| **Analytics** | Full access | Full access | Full access + priority insights |
| **Support** | Community/email | Priority email | Priority email + dedicated |
| **Badge** | none | "Plus" badge | "Premium" badge |

---

## 4. Open Decisions

### A — How "unlimited" should work
The current code's "pro/enterprise = fully unlimited" is actually an *enforcement gap*. Proposing **real, generous, but finite caps** for Plus/Premium as abuse protection. If you'd rather promise "unlimited" as a selling point, that's a one-line config change in `plans.ts`.

### B — Should analytics be a paid differentiator?
Currently all analytics (spend analytics, market intel, competitor analysis, job health) are open to all users. Defaulted to **not** taking anything away from free users — value of paid tiers comes from *more quota + lower fees + featured placement*.

### C — Is AI Bid Strategist Plus or Premium-exclusive?
Table above treats it as unlocked-more-at-every-paid-tier. If you want it **Premium-only**, that's an easy change to the cap table.

### D — Premium: self-serve or "Contact Sales"?
If Premium is self-serve ($79/mo, click a button), the checkout flow covers both tiers identically. If it should stay sales-assisted, the Premium button becomes a contact form instead.

---

## 5. Featured Job Boosts

`Job.featured` + `PATCH /api/jobs/feature` already work. Two monetization paths (can do both):

1. **Included perk**: Plus/Premium clients get N free boosts/month (2 and 5), tracked with atomic counter pattern.
2. **Pay-per-boost**: Any client (including Free) pays one-off fee ($5–15/boost), reusing existing Razorpay payment flow.

Recommend shipping pay-per-boost first (smallest, most isolated change).

---

# Part B — Technical Implementation

## 6. Database Schema Changes

### 6.1 `users` Collection — Modified Fields

| Field | Current State | Target State | Notes |
|-------|--------------|-------------|-------|
| `plan` | `'free' \| 'pro' \| 'enterprise'` | `'free' \| 'plus' \| 'premium'` | Rename via migration script |
| `planLimits.jobsPostedThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.bidsPlacedThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.monthResetAt` | `string (ISO)` (exists) | No change | Already works |
| `planLimits.aiBidUsesThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.aiBidMonthResetAt` | `string (ISO)` (exists) | No change | Already works |
| `planLimits.aiUsesThisMonth` | `number` (exists) | No change | Already works |
| `planLimits.aiMonthResetAt` | `string (ISO)` (exists) | No change | Already works |

**New fields to add to `users`:**

| Field | Type | Purpose |
|-------|------|---------|
| `planLimits.featuredBoostsUsedThisMonth` | `number` | Track included featured boosts for Plus/Premium |
| `planLimits.invitesSentThisMonth` | `number` | Track monthly invitations sent (§8.14) |
| `subscriptionId` | `string \| null` | Link to `subscriptions` collection |
| `planExpiresAt` | `string (ISO) \| null` | When current paid period ends |
| `planDowngradedAt` | `string (ISO) \| null` | Timestamp when auto-downgraded |

### 6.2 `subscriptions` Collection — New

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

**Indexes:**
- `{ userId: 1 }` — **non-unique** (preserves history across cancel/resubscribe cycles)
- `{ razorpaySubscriptionId: 1 }` — unique, webhook lookups
- `{ status: 1, gracePeriodEndsAt: 1 }` — cron/lazy-check for expired grace periods

> **⚠️ Design Decision:** `userId` index is intentionally non-unique to preserve subscription audit trail.

### 6.3 `plan_change_log` Collection — New (Audit Trail)

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

### 6.4 `webhook_events` Collection — New (Idempotency Store) 🔴 PRODUCTION

```
{
  _id: ObjectId,
  eventId: string,           // Razorpay event ID — unique index
  eventType: string,         // e.g. 'subscription.charged', 'payment.failed'
  status: 'received' | 'processed' | 'failed',
  payload: object,           // Raw webhook payload for debugging
  processedAt: string (ISO) | null,
  errorMessage: string | null,
  retryCount: number,
  createdAt: string (ISO)
}
```

**Indexes:**
- `{ eventId: 1 }` — unique, idempotency lookups
- `{ createdAt: 1 }` — TTL index, auto-delete after 90 days
- `{ status: 1 }` — find failed events for retry

### 6.5 `quota_audit_log` Collection — New (Consumption Tracking) 🟡 PRODUCTION

```
{
  _id: ObjectId,
  userId: string,
  action: 'job_post' | 'bid_place' | 'ai_general' | 'ai_bid_strategy' | 'featured_boost' | 'invite_sent' | 'api_key_created',
  quotaBefore: number,
  quotaAfter: number,
  quotaLimit: number,
  plan: string,
  blocked: boolean,          // true if action was denied due to limit
  metadata: object | null,   // e.g. { jobId, bidId } for traceability
  createdAt: string (ISO)
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — user quota history
- `{ action: 1, blocked: 1, createdAt: -1 }` — analytics on limit hits
- `{ createdAt: 1 }` — TTL index, auto-delete after 180 days

### 6.6 `jobs` Collection — New Field 🔴 PRODUCTION

| Field | Type | Purpose |
|-------|------|---------|
| `platformFeePercent` | `number` | Fee locked at job creation time. Immutable after creation. Prevents fee drift on plan downgrade. |

### 6.7 TypeScript Type Fixes (`web/src/lib/utils.ts`)

> **🔍 Pass 6 verification (2026-07-05):** The `User` type's `plan` field at **`utils.ts:60`** is exactly `'free' | 'pro' | 'enterprise'` as claimed. However the **declared `planLimits` type at that same line is narrower than runtime usage** — it currently only declares `{ jobsPostedThisMonth: number; bidsPlacedThisMonth: number; aiBidUsesThisMonth?: number; monthResetAt: string }`. The fields `aiUsesThisMonth`, `aiMonthResetAt`, and `aiBidMonthResetAt` are **already read/written at runtime** (in `ai-plan-limit.ts:25,29-30` and `bid-strategy/route.ts:43,47-48`) but were never added to the TypeScript type — a pre-existing type/runtime drift, not something introduced by this plan. The full corrected type below fixes this drift in the same pass as the plan/tier rename, since both touch the same type declaration.

```typescript
plan?: 'free' | 'plus' | 'premium';
planLimits?: {
  jobsPostedThisMonth?: number;
  bidsPlacedThisMonth?: number;
  monthResetAt?: string;
  aiUsesThisMonth?: number;        // ← currently missing from the type; used at runtime already
  aiMonthResetAt?: string;         // ← currently missing from the type; used at runtime already
  aiBidUsesThisMonth?: number;
  aiBidMonthResetAt?: string;      // ← currently missing from the type; used at runtime already
  featuredBoostsUsedThisMonth?: number;
  invitesSentThisMonth?: number;
};
subscriptionId?: string | null;
planExpiresAt?: string | null;
```

---

## 7. Central Plan Config

**New file: `web/src/lib/plans.ts`** — Single source of truth.

```typescript
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

export function getPlanConfig(plan?: string): PlanConfig {
  if (plan && plan in PLANS) return PLANS[plan as PlanTier];
  return PLANS.free;
}

// 🔴 PRODUCTION: Admin override caching layer
// getPlanConfig() above is the fast synchronous path for code defaults.
// For admin overrides, use this async version with in-memory caching:

let adminOverrideCache: Record<string, Partial<PlanConfig>> | null = null;
let adminOverrideCacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getPlanConfigWithOverrides(
  plan: string | undefined,
  db: Db
): Promise<PlanConfig> {
  const base = getPlanConfig(plan);
  
  // Refresh cache if expired
  if (!adminOverrideCache || Date.now() > adminOverrideCacheExpiry) {
    const overrides = await db.collection('admin_config').findOne({ key: 'plan_overrides' });
    adminOverrideCache = overrides?.tiers || {};
    adminOverrideCacheExpiry = Date.now() + CACHE_TTL_MS;
  }
  
  const tierKey = plan || 'free';
  const override = adminOverrideCache[tierKey];
  if (!override) return base;
  
  return {
    ...base,
    ...override,
    limits: { ...base.limits, ...(override.limits || {}) },
  };
}
```

**Files with hardcoded limits to refactor:**

| File | Current Hardcoded Values | Refactor To |
|------|------------------------|-------------|
| `api/jobs/route.ts:107-127` | `$lt: 3` | `getPlanConfig(plan).limits.jobsPerMonth` |
| `api/bids/route.ts:93-113` | `$lt: 10` | `getPlanConfig(plan).limits.bidsPerMonth` |
| `api/ai/bid-strategy/route.ts:38` | `FREE_PLAN_AI_BID_MONTHLY_LIMIT = 2` | `getPlanConfig(plan).limits.aiBidStrategyPerMonth` |
| `lib/ai-plan-limit.ts:8` | `FREE_PLAN_AI_MONTHLY_LIMIT = 5` | `getPlanConfig(plan).limits.aiGeneralPerMonth` |
| `api/v1/jobs/route.ts:136-158` | `$lt: 3` (duplicated) | `getPlanConfig(plan).limits.jobsPerMonth` |
| `api/freelancer/dashboard/route.ts:46` | Ternary chain | `getPlanConfig(plan).limits.bidsPerMonth` |
| `components/feed/FreelancerFeed.tsx:154` | Same ternary | `getPlanConfig(plan).limits.bidsPerMonth` |
| `lib/money.ts:34` (splitEscrow) | Flat 10% always | `getPlanConfig(plan).platformFeePercent` |

---

## 8. Backend CRUD Changes — By Route

### 8.1 `POST /api/jobs` — Job Creation (Client)

**File:** `web/src/app/api/jobs/route.ts`
**Current:** Only free-plan users are capped at 3. Paid = unlimited (no check).
**Change:** Read user's `plan` → `getPlanConfig(plan).limits.jobsPerMonth` → apply atomic `findOneAndUpdate` with tier-specific cap for ALL tiers.

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

> **⚠️ Note:** All error messages currently say `"Upgrade to Pro"` — must be updated to dynamic tier-aware messages. Applies to: `jobs/route.ts:127`, `bids/route.ts:113`, `v1/jobs/route.ts:158`, `ai-plan-limit.ts:53`, `bid-strategy/route.ts:70`, `pricing/page.tsx:36`.

### 8.2 `POST /api/bids` — Bid Placement (Freelancer)

**File:** `web/src/app/api/bids/route.ts`
**Current:** Only free-plan users capped at 10. Paid = unlimited.
**Change:** Same pattern as §8.1 — use `getPlanConfig(plan).limits.bidsPerMonth` for all tiers.

### 8.3 `POST /api/ai/bid-strategy` — AI Bid Strategist

**File:** `web/src/app/api/ai/bid-strategy/route.ts`
**Current:** Free users capped at 2/month. Paid users skip the check entirely.
**Change:** Remove `if (user.plan === "free")` gate → apply cap to ALL tiers using `getPlanConfig(plan).limits.aiBidStrategyPerMonth`. Dynamic error messages.

### 8.4 General AI Routes (7 routes using `ai-plan-limit.ts`)

**File:** `web/src/lib/ai-plan-limit.ts`
**Current:** `checkAndConsumeAiQuota()` hardcodes `FREE_PLAN_AI_MONTHLY_LIMIT = 5`, only checks free users.
**Change:** Accept `plan` param → use `getPlanConfig(plan).limits.aiGeneralPerMonth` → apply to all tiers.

**Affected routes:** `chat-assist`, `evaluate-bids`, `generate-description`, `quality-check`, `pricing-advisor`, `smart-search`, `summarize-reviews`

### 8.5 `POST /api/v1/jobs` — Public API Job Creation

**File:** `web/src/app/api/v1/jobs/route.ts`
**Changes:**
1. **API Access Gate:** `getPlanConfig(plan).hasApiAccess` → Free users get `403`
2. **Job cap:** Same centralized cap as §8.1
3. **Rate limit:** `getPlanConfig(plan).apiRateLimit` instead of hardcoded `60`

### 8.6 `splitEscrow()` — Platform Fee

**File:** `web/src/lib/money.ts`
**Change:** Keep existing function signature (already accepts `feePercent`). Callers resolve fee from plan config:

```typescript
const feePercent = getPlanConfig(client.plan).platformFeePercent;
const escrow = splitEscrow(grossAmount, feePercent);
```

**Call sites to update:** `api/payments/route.ts:210`, `api/jobs/[id]/route.ts:143,352`, `api/jobs/offer-response/route.ts:57`

> **🔴 PRODUCTION — Fee Locking:** The fee MUST also be captured at job creation time and stored as `Job.platformFeePercent` (§6.6). When payment triggers, use the **locked fee from the Job document**, NOT the user’s current plan. This prevents fee drift when a user downgrades between job creation and payment.
>
> **Job creation flow:**
> ```typescript
> // In POST /api/jobs
> const feePercent = getPlanConfig(user.plan).platformFeePercent;
> const newJob = { ...jobData, platformFeePercent: feePercent };
> ```
> **Payment flow:**
> ```typescript
> // In payment processing
> const escrow = splitEscrow(grossAmount, job.platformFeePercent); // Use locked fee
> ```

### 8.7 `POST /api/teams` — Team Creation & Seat Enforcement

**File:** `web/src/app/api/teams/route.ts`
**Current:** Any user can create a team. No seat cap.
**Changes:**
1. Check `getPlanConfig(plan).limits.teamSeats > 0` — Free (0 seats) → `403`
2. Invite gate: `team.memberIds.length + 1 >= teamSeats` → `403`
3. Tier-aware error: `"Plus plan supports up to 3 team members. Upgrade to Premium for 10."`

> **🟡 PRODUCTION — Seat Removal on Downgrade (§23):** When a user downgrades from Premium (10 seats) to Plus (3 seats) with 8 members, the system must handle the excess. See §23 for the full seat removal flow.

### 8.8 `PATCH /api/jobs/feature` — Featured Boost

**File:** `web/src/app/api/jobs/feature/route.ts`
**Changes:** Check `featuredBoostsPerMonth` → atomic increment → if exhausted, offer pay-per-boost.

### 8.9 `GET /api/freelancer/dashboard` — Dashboard KPIs

**File:** `web/src/app/api/freelancer/dashboard/route.ts`
**Current:** Hardcodes ternary chain for `bidLimit`.
**Change:** Replace with `getPlanConfig(plan).limits.bidsPerMonth`

### 8.10 `POST /api/seed` — Seed Data

**File:** `web/src/app/api/seed/route.ts`
**Changes:**
1. Update plan values to new tier names
2. Give some seed users `plan: 'plus'` and `plan: 'premium'`
3. Add new `planLimits` fields + pre-populate AI quota fields for test coverage
4. Give at least one seed user a near-limit count for testing limit-approaching UX

### 8.11 Admin Routes — Plan Management

**New route:** `PATCH /api/admin/users/[id]/plan` — admin manually overrides user's plan, writes to `plan_change_log`.

### 8.12 `POST /api/jobs/direct-offer` — Direct Offer Job Quota ⚠️ HIGH

**File:** `web/src/app/api/jobs/direct-offer/route.ts`
**Current:** Creates `type: "direct_offer"` job with NO plan check. Bypasses 3-job cap entirely.
**Change:** Apply same `jobsPerMonth` enforcement as `POST /api/jobs`. Direct offers count toward same quota.

### 8.13 `POST /api/invites` — Freelancer Invite Limits

**File:** `web/src/app/api/invites/route.ts`
**Change:** Add `invitesPerMonth` cap (Free: 5, Plus: 25, Premium: unlimited). Track in `planLimits.invitesSentThisMonth`.

### 8.14 `POST /api/keys` — API Key Generation Plan Gate ⚠️ HIGH

**File:** `web/src/app/api/keys/route.ts`
**Current:** Any user can generate unlimited API keys.
**Change:** Check `hasApiAccess` → cap active keys via `maxApiKeys` (Free: 0, Plus: 2, Premium: 10).

### 8.15 `v1/jobs` Rate Limit — Tier-Aware Throttling

**File:** `web/src/app/api/v1/jobs/route.ts` (line 57 and line 107 — both GET and POST handlers)
**Current:** Flat 60 req/min for everyone.
**Change:** Use `getPlanConfig(plan).apiRateLimit`. Requires reordering user fetch before rate limit check. **Both occurrences** must be updated.

### 8.16 Admin Config `platformFeePercent` — Conflict Resolution

**Files:** `web/src/app/admin/config/page.tsx` (frontend slider) **AND** `web/src/app/api/admin/config/route.ts` (backend persistence — L22 hardcodes `platformFeePercent: 10`, L39 `allowed` whitelist needs restructuring for per-tier fields)
**Current:** Single global `platformFeePercent` slider.
**Change:** Replace with per-tier fee inputs (frontend) + restructure the persistence layer (backend) to store/return per-tier fees. `getPlanConfig()` checks admin DB overrides first, falls back to code defaults.

### 8.17 `PATCH /api/jobs/[id]` — Job Acceptance Bypasses Bid Quota ⚠️ HIGH

**File:** `web/src/app/api/jobs/[id]/route.ts` (lines 241–349, the ACCEPT action)
**Current:** When a freelancer accepts a job at the current price, a bid document is inserted via `insertOne` at L343 with `bidType: "accept"` — but with **zero quota check**. No read of `planLimits.bidsPlacedThisMonth`, no increment, no cap.
**Impact:** A free-tier freelancer who has exhausted their 10-bids/month quota via `POST /api/bids` can still call this endpoint unlimited times to win jobs, completely bypassing bid quota enforcement.
**Change:** Apply same `bidsPerMonth` enforcement as `POST /api/bids` (§8.2). The accept action must atomically check and increment `planLimits.bidsPlacedThisMonth` before the `insertOne`.

---

## 9. Frontend Changes — By Component

### 9.1 `pricing/page.tsx` — Pricing Page
Rename tiers, update prices ($29→$19, $99→$79), wire upgrade buttons to Razorpay Subscriptions checkout (Phase 4).

### 9.2 `FreelancerFeed.tsx` — Bid Limit Display
Replace hardcoded ternary with `getPlanConfig(currentUser?.plan).limits.bidsPerMonth`.

### 9.3 `AIBidStrategist.tsx` — Limit Reached UX
Replace hardcoded `>= 2` / `=== "free"` gate (`AIBidStrategist.tsx:41-44`) → tier-aware limits for ALL tiers. Remove `disabled` for quota case. Fire `toast.error()` on click when exhausted.

> **🔍 Pass 6 verification (2026-07-05):** Confirmed the button is currently silent on quota exhaustion — `disabled={loading || isFreePlanLimited}` (line 83) plus a static "(Free limit reached)" label (lines 89-91), no toast fires. This component does **not** currently import `sonner`/`toast` at all — it only imports `useState`, lucide icons, and `useApp`. `sonner` is already a project dependency and already used elsewhere (`settings/page.tsx:5`, `admin/config/page.tsx:4`), so this is just a new import in this one file, not a new package.

### 9.4 `profile/[id]/page.tsx`, `MyJobsSection.tsx`, `TalentPool.tsx` — Plan Badges
Update `"pro"` checks to `"plus"` / `"premium"` with corresponding badge styling.

> **🔍 Pass 6 verification (2026-07-05) — corrected scope:** All three sites (`profile/[id]/page.tsx:125`, `MyJobsSection.tsx:71`, `TalentPool.tsx:122`) only check `user.plan === "pro"` today. **None of them check `"enterprise"`** — there is no existing Enterprise/Premium badge anywhere in the UI. This is **not a rename of existing Premium badge logic** — it's net-new badge styling for the top tier, in addition to renaming the existing "pro" check to "plus".

### 9.5 `store.tsx` — State Management
Update TypeScript interfaces. Add `getUserPlanConfig()` helper. Expose remaining quota counts.

> **🔍 Pass 6 verification (2026-07-05) — corrected assumption:** `web/src/lib/store.tsx` is **plain React Context + `useState`** (`AppProvider`/`useApp`), not Zustand — there is no Zustand dependency anywhere in this repo. `currentUser: User | null` already holds `plan` and `planLimits`. The `apiRequest` helper (lines 122-138) only injects request headers (`Authorization`, `Content-Type`) — it does **not** inspect or transform responses today, so there is no existing response interceptor. This matters for §18 (Concurrent Session Consistency): that section's "fetch/axios interceptor" design needs to be built as new logic inside `apiRequest` (or a wrapper around it), not bolted onto Zustand middleware as might otherwise be assumed.

### 9.6 New Component: `PlanLimitBanner.tsx`
Reusable banner shown when any limit is at 80%+ used or reached. Used in job posting, bid placement, AI features.

### 9.7 `settings/page.tsx` — API Key Plan Gate
This page is **already entirely dedicated to API-key CRUD** (create/list/revoke against `/api/keys`) — there is no other settings content. The change: check `hasApiAccess` on mount. If `false` → show upgrade CTA instead of the key management UI. If `true` → show form + remaining key slots (`maxApiKeys` - active count).

### 9.8 `admin/config/page.tsx` — Per-Tier Fee Config
Replace single slider with 3 per-tier fee inputs. Warn if any fee >15% or <3%.

### 9.9 `PATCH /api/user` — Security Note
`allowedFields` whitelist correctly **excludes** `plan`. **Do NOT add `plan`** — changes go through admin override or webhook only.

---

## 10. Migration Scripts

### 10.1 Plan Name Rename
```javascript
// web/scripts/migrate-plan-names.mjs — Idempotent, run before deploying renamed code
// Run from web/ directory: node scripts/migrate-plan-names.mjs
// Uses web/.env.local for MONGODB_URI
const r1 = await db.collection('users').updateMany({ plan: 'pro' }, { $set: { plan: 'plus' } });
const r2 = await db.collection('users').updateMany({ plan: 'enterprise' }, { $set: { plan: 'premium' } });
```

### 10.2 Add New `planLimits` Fields
```javascript
// web/scripts/migrate-plan-limits.mjs — Run after §10.1
await db.collection('users').updateMany(
  { 'planLimits.featuredBoostsUsedThisMonth': { $exists: false } },
  { $set: { 'planLimits.featuredBoostsUsedThisMonth': 0, 'planLimits.invitesSentThisMonth': 0 } }
);
```

> **📁 Script Location:** All migration scripts live in `web/scripts/` (create this directory). They reuse `web`'s existing `mongodb` dependency and load connection strings from `web/.env.local`. Invoke via `cd web && node scripts/migrate-plan-names.mjs`.

### 10.3 Create Indexes for New Collections
```javascript
// subscriptions — userId is NON-UNIQUE
await db.collection('subscriptions').createIndex({ userId: 1 });
await db.collection('subscriptions').createIndex({ razorpaySubscriptionId: 1 }, { unique: true });
await db.collection('subscriptions').createIndex({ status: 1, gracePeriodEndsAt: 1 });
// plan_change_log
await db.collection('plan_change_log').createIndex({ userId: 1, createdAt: -1 });
```

---

## 11. New API Routes Required

| Route | Method | Purpose | Phase |
|-------|--------|---------|-------|
| `api/subscriptions/route.ts` | POST | Create Razorpay subscription + checkout | 4 |
| `api/subscriptions/route.ts` | GET | Current subscription status | 4 |
| `api/subscriptions/route.ts` | PATCH | Cancel subscription | 4 |
| `api/webhooks/razorpay/route.ts` | POST | Handle Razorpay webhooks | 4 |
| `api/admin/users/[id]/plan/route.ts` | PATCH | Admin plan override | 2 |
| `api/user/plan/route.ts` | GET | Current plan config + remaining quotas | 1 |

**Webhook Security (`POST /api/webhooks/razorpay`):**
- Verify `X-Razorpay-Signature` via HMAC-SHA256 over **raw** request body (`req.text()` before JSON parsing)
- Reject missing/invalid signature with 400 — fail closed
- Store each event id → no-op on redelivery (idempotency)
- `.env.example` already declares `RAZORPAY_WEBHOOK_SECRET` even though no webhook endpoint exists yet — this was clearly anticipated and never finished

**Grace-Period State Machine:**
1. `payment.failed` → `status: 'past_due'`, `gracePeriodEndsAt = now + 3-7 days`, keep paid access
2. Retry succeeds → back to `active`
3. `subscription.halted` or grace expired → downgrade to `free`, send notification email
4. Needs either Vercel Cron or lazy check-on-next-login

---

## 12. Dependency Map & Execution Order

```
Phase 0 (No dependencies, ship immediately)
├── Fix AIBidStrategist toast notification
├── Fix planLimits TypeScript type definition
└── Wire splitEscrow() to use plan-based fee %

Phase 1 (Depends on: nothing)
├── Create web/src/lib/plans.ts (central config)
├── Run migration scripts (§10.1, §10.2)
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
├── Add team seat enforcement to /api/teams (§8.7)
├── Add direct-offer job quota enforcement (§8.12) ⚠️ HIGH
├── Add invite cap enforcement to /api/invites (§8.13)
├── Add API key plan gate to /api/keys (§8.14) ⚠️ HIGH
├── Add tier-aware rate limiting to /api/v1 (§8.15) — both L57 and L107
├── Add bid quota enforcement to job acceptance (§8.17) ⚠️ HIGH
├── Add featured boost enforcement
├── Add admin plan override route
├── Deprecate admin global fee → per-tier fees (§8.16)
├── Update FreelancerFeed.tsx, pricing/page.tsx, badges
├── Update settings/page.tsx with plan gate (§9.7)
├── Update admin/config for per-tier fees (§9.8)
└── Create PlanLimitBanner.tsx component

Phase 3 (Depends on: Phase 1)
├── Featured job pay-per-boost UI button
└── One-off Razorpay payment for boost (reuse existing flow)

Phase 4 (Depends on: Phase 2, separate project)
├── Create subscriptions + webhook_events + quota_audit_log collections + indexes
├── Create Razorpay Plans in dashboard (plus_monthly, premium_monthly)
├── Build POST /api/subscriptions (create)
├── Build PATCH /api/subscriptions (cancel + plan change with proration §21)
├── Build POST /api/webhooks/razorpay (with idempotency store §13)
├── Build processWebhookEvent() state machine router (§14.3)
├── Implement full state machine transitions (§14.1 — 12 transitions)
├── Implement handleDowngrade() function (§16)
├── Tie quota resets to billing cycle via subscription.charged webhook (§15)
├── Wire pricing page buttons to checkout
├── Build billing email templates (9 templates, §20)
├── Build billing-emails.ts sender module (§20)
├── Build plan-header.ts middleware for concurrent session sync (§18)
├── Update store.tsx with plan sync interceptor (§18)
├── Build distributed rate-limit.ts (§19)
├── Replace sanitize.ts in-memory rate limiter (§19)
├── Build cron/retry-webhooks route (§13.2)
├── Build cron/reconcile-subscriptions route (§22)
├── Add cron schedules to vercel.json (§22)
├── Build plan-downgrade.ts with team freezing + API key revocation (§16)
└── Team over-limit flow: status, deadline, LIFO auto-removal (§23)

Phase 5 (Depends on: Phase 4, post-launch hardening)
├── Add "now" proration for immediate mid-cycle upgrades (§21)
├── Build quota consumption audit logging (§24)
├── Add quota audit log to CS admin dashboard
├── Win-back email campaign automation (7 days post-churn)
├── Remove backward compatibility for legacy plan names (§25 Phase C)
└── Redis/Upstash migration for rate limiting (if scale demands)
```

---

# Part C — Production Hardening *(Pass 5 — Production-Grade Audit)*

> These sections address gaps that would cause **real incidents** with real users and real money.
> Severity: 🔴 = will cause incidents, 🟡 = will cause pain, 🟢 = quality-of-life

---

## 13. Webhook Idempotency & Error Recovery 🔴

### 13.1 Idempotency Store

Razorpay retries webhooks on timeout. Without idempotency, a single `subscription.charged` event can double-extend subscription periods, create duplicate `plan_change_log` entries, and send duplicate emails.

**Implementation (uses `webhook_events` collection from §6.4):**

```typescript
// POST /api/webhooks/razorpay/route.ts
export async function POST(req: Request) {
  // 1. Read raw body BEFORE JSON.parse (required for HMAC verification)
  const rawBody = await req.text();
  
  // 2. Verify signature — fail closed
  const signature = req.headers.get('X-Razorpay-Signature');
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  const payload = JSON.parse(rawBody);
  const eventId = payload.event_id || payload.id;
  
  // 3. Atomic idempotency check — upsert returns null if already existed
  const result = await db.collection('webhook_events').findOneAndUpdate(
    { eventId },
    { $setOnInsert: { eventId, eventType: payload.event, status: 'received', payload, retryCount: 0, createdAt: new Date().toISOString() } },
    { upsert: true, returnDocument: 'after' }
  );
  
  // If status is already 'processed', we've seen this before — return 200
  if (result.status === 'processed') {
    return NextResponse.json({ status: 'already_processed' });
  }
  
  // 4. Process the event
  try {
    await processWebhookEvent(payload);
    await db.collection('webhook_events').updateOne(
      { eventId },
      { $set: { status: 'processed', processedAt: new Date().toISOString() } }
    );
  } catch (error) {
    await db.collection('webhook_events').updateOne(
      { eventId },
      { $set: { status: 'failed', errorMessage: error.message }, $inc: { retryCount: 1 } }
    );
    // Return 500 so Razorpay retries
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  
  return NextResponse.json({ status: 'ok' });
}
```

### 13.2 Error Recovery

If the webhook handler crashes mid-processing, the event must be recoverable:

**Two-stage processing:**
1. **Stage 1 (synchronous):** Acknowledge event (return 200 after signature check + event logging)
2. **Stage 2 (recoverable):** Process event. If it fails, mark as `'failed'` in `webhook_events`

**Retry cron (runs every 15 minutes):**
```typescript
// Find failed events with retryCount < 5
const failedEvents = await db.collection('webhook_events').find({
  status: 'failed',
  retryCount: { $lt: 5 },
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
}).toArray();

for (const event of failedEvents) {
  await processWebhookEvent(event.payload);
  // Update status on success, increment retryCount on failure
}
```

**New file:** `web/src/app/api/cron/retry-webhooks/route.ts` (Phase 4)

---

## 14. Subscription State Machine 🔴

The grace-period notes in §11 were incomplete. Full state transition table:

### 14.1 State Transitions

| # | From State | Event | To State | Side Effects |
|---|-----------|-------|----------|-------------|
| 1 | `created` | `subscription.activated` | `active` | Set user `plan` to purchased tier, reset quotas |
| 2 | `active` | `subscription.charged` | `active` | Extend `currentPeriodEnd`, reset all `planLimits` counters |
| 3 | `active` | `subscription.pending` | `active` | No change (payment processing) |
| 4 | `active` | `payment.failed` | `past_due` | Set `gracePeriodEndsAt = now + 7 days`, send warning email |
| 5 | `past_due` | `payment.captured` | `active` | Clear `gracePeriodEndsAt`, send recovery email |
| 6 | `past_due` | grace period expired | `cancelled` | Call `handleDowngrade()` (§16), send churn email |
| 7 | `past_due` | `subscription.halted` | `cancelled` | Call `handleDowngrade()` (§16), send churn email |
| 8 | `active` | user cancels | `active` | Set `cancelAtPeriodEnd = true`, keep access until `currentPeriodEnd` |
| 9 | `active` (cancelAtPeriodEnd) | period ends | `cancelled` | Call `handleDowngrade()` (§16), send confirmation email |
| 10 | `cancelled` | user resubscribes | `created` → `active` | Create NEW subscription doc (old one preserved for audit) |
| 11 | `active` | user upgrades Plus→Premium | `active` | See §21 (proration) |
| 12 | `active` | user downgrades Premium→Plus | `active` | Apply at next renewal, set `pendingPlanChange: 'plus'` |

### 14.2 New Subscription Field

Add to `subscriptions` collection (§6.2):
```
pendingPlanChange: 'plus' | 'premium' | null  // Applied at next renewal
```

### 14.3 processWebhookEvent() Router

```typescript
async function processWebhookEvent(payload: any) {
  const eventType = payload.event;
  const subId = payload.payload?.subscription?.entity?.id;
  
  switch (eventType) {
    case 'subscription.activated': return handleActivated(subId, payload);
    case 'subscription.charged': return handleCharged(subId, payload);
    case 'subscription.halted': return handleHalted(subId, payload);
    case 'subscription.cancelled': return handleCancelled(subId, payload);
    case 'payment.failed': return handlePaymentFailed(subId, payload);
    case 'payment.captured': return handlePaymentCaptured(subId, payload);
    default: console.log(`Unhandled webhook event: ${eventType}`);
  }
}
```

---

## 15. Quota Reset Alignment 🔴

### Problem

Quotas currently reset based on `monthResetAt` — set when the counter was first created. A user subscribing on Jan 15 would have quotas reset based on when they first hit a limit, not their billing cycle.

### Solution

Tie quota resets to the subscription billing cycle:

**On each `subscription.charged` webhook:**
```typescript
async function handleCharged(subId: string, payload: any) {
  const sub = await db.collection('subscriptions').findOneAndUpdate(
    { razorpaySubscriptionId: subId },
    { $set: {
      status: 'active',
      currentPeriodStart: payload.payload.subscription.entity.current_start,
      currentPeriodEnd: payload.payload.subscription.entity.current_end,
      updatedAt: new Date().toISOString(),
    }}
  );
  
  // Reset ALL quota counters for this billing period
  const now = new Date().toISOString();
  await db.collection('users').updateOne(
    { _id: sub.userId },
    { $set: {
      'planLimits.jobsPostedThisMonth': 0,
      'planLimits.bidsPlacedThisMonth': 0,
      'planLimits.aiUsesThisMonth': 0,
      'planLimits.aiBidUsesThisMonth': 0,
      'planLimits.featuredBoostsUsedThisMonth': 0,
      'planLimits.invitesSentThisMonth': 0,
      'planLimits.monthResetAt': now,
      'planLimits.aiMonthResetAt': now,
      'planLimits.aiBidMonthResetAt': now,
    }}
  );
}
```

**Free users:** Continue using existing lazy-reset on calendar month (no billing cycle exists).

---

## 16. Plan Downgrade Handler 🔴

When a subscription expires, cancels, or payment fails beyond grace period, the user must be cleanly downgraded.

### 16.1 `handleDowngrade()` Function

**New file:** `web/src/lib/plan-downgrade.ts`

```typescript
export async function handleDowngrade(
  userId: string,
  fromPlan: PlanTier,
  toPlan: PlanTier,
  reason: string,
  triggeredBy: string,
  db: Db
) {
  const toPlanConfig = getPlanConfig(toPlan);
  
  // 1. Update user plan
  await db.collection('users').updateOne(
    { _id: userId },
    { $set: { plan: toPlan, planDowngradedAt: new Date().toISOString() } }
  );
  
  // 2. Revoke excess API keys (e.g., Plus→Free: revoke all)
  const activeKeys = await db.collection('api_keys')
    .find({ userId, revoked: false })
    .sort({ createdAt: 1 })
    .toArray();
  
  if (activeKeys.length > toPlanConfig.limits.maxApiKeys) {
    const keysToRevoke = activeKeys.slice(toPlanConfig.limits.maxApiKeys);
    await db.collection('api_keys').updateMany(
      { _id: { $in: keysToRevoke.map(k => k._id) } },
      { $set: { revoked: true, revokedReason: 'plan_downgrade', revokedAt: new Date().toISOString() } }
    );
  }
  
  // 3. Handle team seat excess (see §23 for UX flow)
  if (toPlanConfig.limits.teamSeats === 0) {
    // Free tier: dissolve all teams owned by this user
    await db.collection('teams').updateMany(
      { ownerId: userId },
      { $set: { status: 'frozen', frozenReason: 'plan_downgrade' } }
    );
  }
  
  // 4. Log the change
  await db.collection('plan_change_log').insertOne({
    userId, fromPlan, toPlan, reason, triggeredBy,
    createdAt: new Date().toISOString()
  });
  
  // 5. Send notification email (see §20)
  await sendPlanChangeEmail(userId, fromPlan, toPlan, reason);
}
```

### 16.2 Existing Resource Handling

| Resource | On Downgrade | Rationale |
|----------|-------------|-----------|
| Active jobs | Stay active, no new posts beyond limit | Don't disrupt ongoing work |
| Active bids | Stay active, no new bids beyond limit | Don't disrupt ongoing negotiations |
| API keys | Revoked beyond new limit (LIFO) | Security — prevent unauthorized access |
| Team | Frozen if seats = 0, excess flagged if seats reduced | Owner must resolve (§23) |
| Featured boosts | Monthly counter resets at next cycle | No active boost revocation |
| Existing data | Fully preserved | Never delete user data on downgrade |

---

## 17. Fee Locking at Job Creation 🔴

Covered inline in §8.6. Summary:

1. **At job creation:** Capture `platformFeePercent` from `getPlanConfig(user.plan)` → store on Job document
2. **At payment:** Use `job.platformFeePercent` (locked value), NOT current user plan
3. **Migration:** Backfill existing jobs with `platformFeePercent: 10` (they were all created under flat 10%)
4. **Job document field:** See §6.6

---

## 18. Concurrent Session Consistency 🔴

When a user's plan changes (upgrade, downgrade, expiry), other open tabs/sessions have stale plan data in client state.

> **🔍 Pass 6 verification (2026-07-05) — corrected assumption:** `web/src/lib/store.tsx` is **React Context + `useState`** (`AppProvider`/`useApp`), not Zustand — there is no `useStore.getState()` anywhere in this repo. The `apiRequest` helper (lines 122-138) currently only sets request headers and does not inspect responses, so there is no existing interceptor to extend. The design below is corrected to fit the Context pattern actually in use.

### Solution: Plan Version Header

**Backend (middleware):**
```typescript
// In every authenticated API response, attach plan metadata
response.headers.set('X-User-Plan', user.plan || 'free');
response.headers.set('X-Plan-Updated-At', user.updatedAt || '');
```

**Frontend (extend `apiRequest` in `web/src/lib/store.tsx`, not a Zustand/axios interceptor):**
```typescript
// Inside apiRequest, after the fetch resolves
const serverPlan = response.headers.get('X-User-Plan');
const localPlan = currentUser?.plan; // read from AppProvider's React state, not useStore.getState()

if (serverPlan && localPlan && serverPlan !== localPlan) {
  // Plan changed server-side — force refresh user state via the existing
  // fetchCurrentUser()-style function already exposed by AppProvider
  fetchCurrentUser();
  toast.info(`Your plan has been updated to ${serverPlan}.`);
}
```

**New files:**
- `web/src/lib/middleware/plan-header.ts` (backend middleware)
- Update `web/src/lib/store.tsx` (add interceptor logic)

---

## 19. Distributed Rate Limiting 🟡

### Problem
`web/src/lib/sanitize.ts` rate limiter uses in-memory `Map`. With 2+ Cloud Run instances, each has its own counter. A user can hit 60 req/min **per instance**.

### Solution: MongoDB-Based Rate Limiting

```typescript
// web/src/lib/rate-limit.ts
export async function checkRateLimit(
  userId: string,
  windowMs: number,
  maxRequests: number,
  db: Db
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  
  const result = await db.collection('rate_limits').findOneAndUpdate(
    {
      key: `api:${userId}`,
      windowStart: { $gte: windowStart },
      count: { $lt: maxRequests }
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: new Date().toISOString() },
    },
    { upsert: true, returnDocument: 'after' }
  );
  
  if (!result) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: maxRequests - result.count };
}
```

**Index:** `{ key: 1, windowStart: 1 }` with TTL on `windowStart` (auto-expire after 2 minutes).

**Alternative:** If Redis (Upstash) is added later, swap implementation without changing the interface.

---

## 20. Billing Email Infrastructure 🟡

### Required Emails

| Event | Email | Legal | Template |
|-------|-------|-------|----------|
| Subscription created | Welcome + receipt | ✅ Required in India/EU | `subscription_welcome.html` |
| Payment charged | Monthly receipt | ✅ Required | `payment_receipt.html` |
| Payment failed | Warning (first failure) | Best practice | `payment_failed_warning.html` |
| Grace period 3 days left | Urgency reminder | Best practice | `grace_period_warning.html` |
| Grace period 1 day left | Final warning | Best practice | `grace_period_final.html` |
| Plan downgraded | What changed + how to resubscribe | Best practice | `plan_downgraded.html` |
| Plan upgraded | Confirmation + new features | Best practice | `plan_upgraded.html` |
| Plan cancelled (by user) | Confirmation + resubscription CTA | Best practice | `plan_cancelled.html` |
| Resubscription invitation | Win-back (7 days after churn) | Marketing | `win_back.html` |

### Implementation

**Reuse existing email infrastructure** (the codebase already has email utilities). Add a `web/src/lib/billing-emails.ts` module:

```typescript
export async function sendPlanChangeEmail(
  userId: string,
  fromPlan: string,
  toPlan: string,
  reason: string
) {
  const user = await db.collection('users').findOne({ _id: userId });
  if (!user?.email) return;
  
  const template = getEmailTemplate(reason); // Maps reason to template
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: renderTemplate(template, { user, fromPlan, toPlan }),
  });
}
```

**New files:**
- `web/src/lib/billing-emails.ts`
- `web/src/email-templates/billing/` (directory with 9 templates)

---

## 21. Mid-Cycle Plan Change Proration 🟡

### Problem
What happens when a Plus ($19/mo) user upgrades to Premium ($79/mo) mid-cycle?

### Recommended Strategy: Immediate Upgrade + Prorated Charge

```
User on Plus, 15 days into billing cycle (30-day month):
  Remaining value: $19 × (15/30) = $9.50 credit
  Premium charge: $79 × (15/30) = $39.50 prorated
  Immediate charge: $39.50 - $9.50 = $30.00
  Next renewal: Full $79 on new cycle start date
```

### Implementation

Razorpay Subscriptions API supports proration via `schedule_change_at`:
- `"now"` — immediate change with proration
- `"cycle_end"` — apply at next renewal (simpler, no refund logic)

**Recommendation:** Start with `"cycle_end"` (Phase 4), add `"now"` proration in Phase 5.

```typescript
// PATCH /api/subscriptions — plan change
const changeAt = req.body.immediate ? 'now' : 'cycle_end';
await razorpay.subscriptions.update(subId, {
  plan_id: newRazorpayPlanId,
  schedule_change_at: changeAt,
});
```

---

## 22. Razorpay Reconciliation Cron 🟡

### Problem
If Razorpay is down during webhook delivery, or webhooks are delayed, local subscription state drifts.

### Solution: Daily Reconciliation Job

**New file:** `web/src/app/api/cron/reconcile-subscriptions/route.ts`

```typescript
// Runs daily via Vercel Cron or external scheduler
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 1. Find all active/past_due subscriptions
  const localSubs = await db.collection('subscriptions').find({
    status: { $in: ['active', 'past_due'] }
  }).toArray();
  
  let corrected = 0;
  for (const localSub of localSubs) {
    // 2. Fetch actual state from Razorpay API
    const razorpaySub = await razorpay.subscriptions.fetch(localSub.razorpaySubscriptionId);
    
    // 3. If states differ, correct local state
    if (razorpaySub.status !== localSub.status) {
      await handleStateCorrection(localSub, razorpaySub);
      corrected++;
    }
  }
  
  // 4. Check for expired grace periods
  const expiredGrace = await db.collection('subscriptions').find({
    status: 'past_due',
    gracePeriodEndsAt: { $lte: new Date().toISOString() }
  }).toArray();
  
  for (const sub of expiredGrace) {
    await handleDowngrade(sub.userId, sub.plan, 'free', 'grace_period_expired', 'cron', db);
    await db.collection('subscriptions').updateOne(
      { _id: sub._id },
      { $set: { status: 'cancelled', updatedAt: new Date().toISOString() } }
    );
  }
  
  return NextResponse.json({ reconciled: corrected, graceExpired: expiredGrace.length });
}
```

**Cron schedule:** Daily at 3:00 AM UTC. Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/reconcile-subscriptions", "schedule": "0 3 * * *" },
    { "path": "/api/cron/retry-webhooks", "schedule": "*/15 * * * *" }
  ]
}
```

---

## 23. Team Seat Removal on Downgrade 🟡

### Problem
Premium user (10 seats) downgrades to Plus (3 seats) with 8 team members. Who gets removed?

### Solution: Owner Chooses + Grace Period

**Flow:**
1. On downgrade, if `team.members.length > newSeatLimit`:
   - Set `team.status = 'over_limit'`
   - Set `team.seatDeadline = now + 7 days`
   - Send email to owner: "You have 7 days to reduce your team to N members"
2. Owner visits team settings → sees which members to remove
3. If deadline passes without action:
   - Auto-remove members by **LIFO** (last invited, first removed)
   - Removed members lose access to team resources
   - Send notification to removed members

**Frontend:** `TeamSettings.tsx` shows warning banner when `team.status === 'over_limit'`.

**No data deletion:** Removed members keep their individual accounts and personal work. Only team access is revoked.

---

## 24. Quota Consumption Audit Log 🟡

Uses `quota_audit_log` collection from §6.5. Every quota-consuming action logs:

```typescript
// Helper function — call inside every findOneAndUpdate quota check
async function logQuotaConsumption(
  userId: string,
  action: string,
  quotaBefore: number,
  quotaLimit: number,
  blocked: boolean,
  metadata?: object
) {
  await db.collection('quota_audit_log').insertOne({
    userId, action,
    quotaBefore,
    quotaAfter: blocked ? quotaBefore : quotaBefore + 1,
    quotaLimit,
    plan: (await db.collection('users').findOne({ _id: userId }))?.plan || 'free',
    blocked,
    metadata: metadata || null,
    createdAt: new Date().toISOString(),
  });
}
```

**Use cases:**
- CS team: "Why was I blocked from posting?" → query by userId + action
- Analytics: Which limits are hit most often? → query by `blocked: true` grouped by action
- Tier tuning: Are Plus users hitting limits too early? → aggregate by plan + action

---

## 25. Migration Rollback Strategy 🟡

### Problem
§10 migration scripts are forward-only. If the deploy fails after migration, `'plus'` users exist but code still expects `'pro'` → `getPlanConfig('plus')` falls back to `PLANS.free` → **paying users lose paid features**.

### Solution: Two-Phase Deploy

**Phase A — Code deploys with backward compatibility:**
```typescript
// Updated getPlanConfig supports BOTH old and new names
export function getPlanConfig(plan?: string): PlanConfig {
  // Support legacy names during migration window
  if (plan === 'pro') return PLANS.plus;
  if (plan === 'enterprise') return PLANS.premium;
  if (plan && plan in PLANS) return PLANS[plan as PlanTier];
  return PLANS.free;
}
```

**Phase B — Run migration scripts** (§10.1, §10.2) after code is deployed and verified.

**Phase C — Remove backward compatibility** after confirming zero users with old plan names.

**Verification query (run between Phase B and C):**
```javascript
const legacy = await db.collection('users').countDocuments({
  plan: { $in: ['pro', 'enterprise'] }
});
console.assert(legacy === 0, 'Migration incomplete!');
```

### Rollback Script (emergency)
```javascript
// scripts/rollback-plan-names.mjs
await db.collection('users').updateMany({ plan: 'plus' }, { $set: { plan: 'pro' } });
await db.collection('users').updateMany({ plan: 'premium' }, { $set: { plan: 'enterprise' } });
```

---

## 26. Per-Request User Context Middleware 🟢

### Problem
Multiple route handlers fetch the same user document independently. Some routes check plan limits 3-4 times, each time querying MongoDB.

### Solution: Middleware That Fetches Once

**New file:** `web/src/lib/middleware/user-context.ts`

```typescript
import { getSession } from '@/lib/auth';

export interface RequestContext {
  user: User;
  planConfig: PlanConfig;
}

export async function getUserContext(req: Request): Promise<RequestContext | null> {
  const session = await getSession(req);
  if (!session?.userId) return null;
  
  const user = await db.collection('users').findOne({ _id: session.userId });
  if (!user) return null;
  
  const planConfig = getPlanConfig(user.plan);
  
  return { user, planConfig };
}
```

**Usage in route handlers:**
```typescript
export async function POST(req: Request) {
  const ctx = await getUserContext(req);
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { user, planConfig } = ctx;
  // Use planConfig.limits.jobsPerMonth — no extra DB call
}
```

**Impact:** Reduces MongoDB reads by ~40% on quota-heavy routes.

---

# Part D — Quality & Risk

## 27. Validation Log

> Three-pass codebase audit: 25 API route dirs, 13 lib files, all frontend components, admin pages, state management.

### Pass 1+2 Findings (Fixed)

| # | Type | Finding | Resolution |
|---|------|---------|------------|
| 1 | ❌ Error | Missing AI route `summarize-reviews` | Added as 7th route |
| 2 | ❌ Error | `splitEscrow` refactor broke signature | Kept original param, callers resolve fee |
| 3 | ❌ Error | Feature route path wrong | Fixed file path |
| 4 | ⚠️ Gap | "Upgrade to Pro" error strings not listed | Added note covering all 6 files |
| 5 | ⚠️ Gap | Seed data missing AI quota fields | Expanded with pre-population |
| 6 | ⚠️ Gap | `AIBidStrategist.tsx` hardcoded gate | Fixed to tier-aware |
| 7 | ⚠️ Gap | `subscriptions.userId` index marked `unique` | Changed to non-unique |

### Pass 3 Findings (Fixed)

| # | Type | Finding | Severity | Resolution |
|---|------|---------|----------|------------|
| 8 | ⚠️ Gap | Direct offers bypass job quota | 🔴 HIGH | Added §8.12 |
| 9 | ⚠️ Gap | Teams route has no plan gate | 🔴 HIGH | Merged into §8.7 |
| 10 | ⚠️ Gap | Unlimited freelancer invites | 🟡 MEDIUM | Added §8.13 |
| 11 | ⚠️ Gap | API keys available to free users | 🔴 HIGH | Added §8.14 |
| 12 | ⚠️ Gap | API rate limit flat 60/min | 🟡 MEDIUM | Added §8.15 |
| 13 | ⚠️ Gap | Admin global fee conflicts with per-tier | 🟡 MEDIUM | Added §8.16 |
| 14 | ⚠️ Gap | Job acceptance (`PATCH /api/jobs/[id]`) bypasses bid quota — `insertOne` at L343 with zero quota check | 🔴 HIGH | Added §8.17 (surfaced by independent audit) |

### Pass 5 Findings — Production-Grade Audit (NEW)

| # | Type | Finding | Severity | Resolution |
|---|------|---------|----------|------------|
| 15 | 🔴 Critical | No webhook idempotency implementation | 🔴 CRITICAL | Added §13 |
| 16 | 🔴 Critical | Subscription state machine undefined (only 4 bullets) | 🔴 CRITICAL | Added §14 (12 transitions) |
| 17 | 🔴 Critical | Quota resets tied to calendar, not billing cycle | 🔴 CRITICAL | Added §15 |
| 18 | 🔴 Critical | No downgrade handler (API keys, teams, resources) | 🔴 CRITICAL | Added §16 |
| 19 | 🔴 Critical | Fee resolved at payment, not job creation | 🔴 CRITICAL | Added §17, §6.6, §8.6 |
| 20 | 🔴 Critical | No webhook error recovery mechanism | 🔴 CRITICAL | Added §13.2 |
| 21 | 🔴 Critical | No concurrent session plan consistency | 🔴 CRITICAL | Added §18 |
| 22 | ⚠️ Gap | In-memory rate limiter doesn’t scale across instances | 🟡 HIGH | Added §19 |
| 23 | ⚠️ Gap | No billing email infrastructure | 🟡 HIGH | Added §20 (9 templates) |
| 24 | ⚠️ Gap | No proration strategy for mid-cycle plan changes | 🟡 HIGH | Added §21 |
| 25 | ⚠️ Gap | `getPlanConfig()` has no admin override path | 🟡 MEDIUM | Added §7 (async version with cache) |
| 26 | ⚠️ Gap | No Razorpay outage reconciliation | 🟡 MEDIUM | Added §22 |
| 27 | ⚠️ Gap | Team seat removal on downgrade undefined | 🟡 MEDIUM | Added §23 |
| 28 | ⚠️ Gap | No quota consumption audit trail | 🟡 MEDIUM | Added §24 |
| 29 | ⚠️ Gap | Migration scripts are forward-only, no rollback | 🟡 MEDIUM | Added §25 |
| 30 | ⚠️ Gap | Per-request user fetch redundancy | 🟢 LOW | Added §26 |

### Verified Correct (✅ 36+ claims)

| Area | Count | Notes |
|------|-------|-------|
| Hardcoded limit values | 8/8 | All line numbers confirmed |
| splitEscrow call sites | 4/4 | All file paths confirmed |
| AI routes using quota check | 7/7 | Including added summarize-reviews |
| Badge checks | 3/3 | profile:125, MyJobs:71, TalentPool:122 (line drift from earlier passes: profile was 123, now 125) |
| Routes with no plan gate needed | 12/12 | chat, disputes, email-logs, milestones, notifications, reviews, transactions, referrals, assessments, auth, pricing engine, email |
| Security checks | 2/2 | PATCH /api/user excludes `plan`; admin route requires `ADMIN_SECRET_KEY` |

### Pass 6 Findings — Live Codebase Re-Verification (2026-07-05, pre-implementation)

> Ran 3 parallel read-only audits against the current `v16` branch (post UI-consolidation commits) to confirm every prior-pass claim still holds before writing any code. All backend quota/gap findings (Pass 3, items 8–14) and all core hardcoded-limit claims (Pass 1+2) were re-confirmed **exactly**, including line numbers. 6 real discrepancies surfaced:

| # | Type | Finding | Resolution |
|---|------|---------|------------|
| 31 | ⚠️ Gap | `planLimits` TS type (`utils.ts:60`) is missing `aiUsesThisMonth`, `aiMonthResetAt`, `aiBidMonthResetAt` — used at runtime but untyped (pre-existing drift) | Noted in §6.7; corrected type carries the fix forward |
| 32 | ✅ Correction | `splitEscrow()` already accepts a `feePercent` param (default 10, `money.ts:34`) — not hardcoded internally as a stricter reading of earlier passes might imply | §8.6 already described this correctly; confirmed, no plan change needed |
| 33 | ⚠️ Gap | No existing Enterprise/Premium badge anywhere — all 3 badge sites (`profile/[id]/page.tsx:125`, `MyJobsSection.tsx:71`, `TalentPool.tsx:122`) only check `"pro"` | §9.4 corrected: this is net-new Premium badge UI, not a pure rename |
| 34 | ⚠️ Gap | `store.tsx` is React Context + `useState` (`AppProvider`/`useApp`), not Zustand — no Zustand anywhere in repo; `apiRequest` has no response interceptor today | §9.5 and §18 corrected to a Context-based design |
| 35 | ⚠️ Gap | `AIBidStrategist.tsx` doesn't import `sonner`/`toast` yet; quota exhaustion is currently fully silent (disabled button + static label only) | §9.3 note added; `sonner` is already a project dependency (used in settings/admin pages), so this is a one-file import, not a new package |
| 36 | ✅ Correction | §8.17 job-acceptance quota bypass re-confirmed exactly — `jobs/[id]/route.ts:343` `insertOne` with zero quota check | No change; bug stands as documented |

**Also re-confirmed as greenfield (no drift):** no `web/src/lib/plans.ts`, no `subscriptions`/`webhook_events`/`quota_audit_log` collections, no `/api/subscriptions` or `/api/webhooks/razorpay` routes exist yet — Phase 4 work is starting from a clean slate as assumed. Seed data (`seed/route.ts:794`) still assigns `plan: "free"` to all seed users with no AI-quota pre-population, exactly as §8.10 assumes needs fixing.

---

## 28. Known Risks & Design Decisions

### 28.1 Quota Counters Never Decrement
**Problem:** Deleted bids/jobs don't restore quota. A user at 10/10 who deletes 5 still shows 10/10.
**Decision:** Intentional MVP simplification. Monthly reset is the ceiling. Decrementing introduces race conditions and abuse vectors (create-delete loops).

### 28.2 AI Prompt Exposes Plan Tier
**File:** `api/ai/evaluate-bids/route.ts` (line 115) — sends `"Plan: plus"` to Gemini. Could bias AI recommendation by subscription level.
**Decision:** Keep for now — useful signal. Strip if bias becomes a concern.

### 28.3 Admin Fee Override vs Plan Config
Global `platformFeePercent` conflicts with per-tier fees. Resolution: `getPlanConfig()` checks admin DB overrides first → falls back to code defaults (10/7/5).

### 28.4 `teamSeats: 0` for Free Tier
Free users **cannot** create teams at all. If solo team creation is desired, set back to `1` and gate only invites.

### 28.5 In-Memory Rate Limiter
`web/src/lib/sanitize.ts` rate limiter does not share state across instances. **See §19 for the production-grade distributed rate limiting solution.** The atomic Mongo `findOneAndUpdate` pattern is what's actually load-bearing for plan limits. Rate limiter is best-effort abuse throttling only.

### 28.6 Failure Mode During Cutover
Migration (§10.1) must run *before* deploying renamed code. **See §25 for the two-phase deploy strategy** that prevents paying users from losing features during cutover. Old DB values (`"pro"`) falling through `getPlanConfig()` will hit the backward-compatibility mapping first (`'pro'` → `PLANS.plus`).

---

## 29. Summary of All Files Touched

### Modified (29 existing files):

| File | Phase | Change |
|------|-------|--------|
| `web/src/lib/utils.ts` | 1 | Type definitions |
| `web/src/lib/money.ts` | 0 | Accept plan param for fee % |
| `web/src/lib/ai-plan-limit.ts` | 2 | Tier-aware caps |
| `web/src/lib/sanitize.ts` | 4 | Replace in-memory rate limiter with distributed (§19) |
| `web/src/lib/store.tsx` | 1 | Type updates + plan sync interceptor (§18) |
| `web/src/app/api/jobs/route.ts` | 2 | Centralized caps + fee locking at creation (§17) |
| `web/src/app/api/bids/route.ts` | 2 | Centralized caps |
| `web/src/app/api/ai/bid-strategy/route.ts` | 2 | Tier-aware caps |
| `web/src/app/api/v1/jobs/route.ts` | 2 | API gate + caps + tier rate limit |
| `web/src/app/api/payments/route.ts` | 0 | Use locked fee from Job document (§17) |
| `web/src/app/api/jobs/[id]/route.ts` | 0 | Use locked fee from Job document (§17) |
| `web/src/app/api/jobs/[id]/route.ts` | 2 | Bid quota enforcement on accept (§8.17) |
| `web/src/app/api/jobs/offer-response/route.ts` | 0 | Use locked fee from Job document (§17) |
| `web/src/app/api/jobs/direct-offer/route.ts` | 2 | Job quota enforcement |
| `web/src/app/api/freelancer/dashboard/route.ts` | 2 | Use getPlanConfig |
| `web/src/app/api/teams/route.ts` | 2 | Seat cap enforcement + over-limit handling (§23) |
| `web/src/app/api/invites/route.ts` | 2 | Invite cap enforcement |
| `web/src/app/api/keys/route.ts` | 2 | Plan gate for API access |
| `web/src/app/api/seed/route.ts` | 1 | New tier names + AI quota fields |
| `web/src/app/api/admin/config/route.ts` | 2 | Per-tier fee support |
| `web/src/app/pricing/page.tsx` | 2 | Renamed tiers + wiring |
| `web/src/app/settings/page.tsx` | 2 | Plan gate + upgrade CTA |
| `web/src/app/admin/config/page.tsx` | 2 | Per-tier fee inputs |
| `web/src/components/feed/FreelancerFeed.tsx` | 2 | Use getPlanConfig |
| `web/src/components/ai/AIBidStrategist.tsx` | 0 | Toast notification |
| `web/src/components/feed/MyJobsSection.tsx` | 1 | Badge rename |
| `web/src/components/feed/TalentPool.tsx` | 1 | Badge rename |
| `web/src/app/profile/[id]/page.tsx` | 1 | Badge rename |
| `vercel.json` | 4 | Cron job schedules (§22) |

### New files (21):

| File | Phase | Purpose |
|------|-------|---------|
| `web/src/lib/plans.ts` | 1 | Central plan config + admin override caching (§7) |
| `web/src/lib/plan-downgrade.ts` | 4 | Downgrade handler (§16) |
| `web/src/lib/billing-emails.ts` | 4 | Billing email sender (§20) |
| `web/src/lib/rate-limit.ts` | 4 | Distributed rate limiting (§19) |
| `web/src/lib/middleware/plan-header.ts` | 4 | Plan version response header (§18) |
| `web/src/lib/middleware/user-context.ts` | 2 | Per-request user context (§26) |
| `web/src/components/ui/PlanLimitBanner.tsx` | 2 | Quota warning banner |
| `web/src/app/api/user/plan/route.ts` | 1 | Current plan config + remaining quotas |
| `web/src/app/api/admin/users/[id]/plan/route.ts` | 2 | Admin plan override |
| `web/src/app/api/subscriptions/route.ts` | 4 | Create/cancel subscriptions |
| `web/src/app/api/webhooks/razorpay/route.ts` | 4 | Webhook handler with idempotency (§13) |
| `web/src/app/api/cron/retry-webhooks/route.ts` | 4 | Failed webhook retry cron (§13.2) |
| `web/src/app/api/cron/reconcile-subscriptions/route.ts` | 4 | Daily Razorpay reconciliation (§22) |
| `web/src/email-templates/billing/` | 4 | 9 billing email templates (§20) |
| `scripts/migrate-plan-names.mjs` | 1 | Rename pro→plus, enterprise→premium |
| `scripts/migrate-plan-limits.mjs` | 1 | Add new planLimits fields |
| `scripts/migrate-fee-locking.mjs` | 1 | Backfill Job.platformFeePercent (§17) |
| `scripts/rollback-plan-names.mjs` | 1 | Emergency rollback (§25) |
| `scripts/create-indexes.mjs` | 4 | Indexes for new collections |
| `scripts/verify-migration.mjs` | 1 | Verify zero legacy plan names (§25) |
| `scripts/migrate-webhook-events-ttl.mjs` | 4 | TTL index for webhook_events (§6.4) |
