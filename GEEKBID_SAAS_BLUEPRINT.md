# GeekBid — SaaS Subscription Blueprint (Unified)

> **Status:** PLAN ONLY — no code changes yet
> **Validated:** 4-pass codebase audit (3 original + 1 independent) — 3 errors fixed, 11 gaps addressed (4 HIGH), 36+ claims verified ✅
> **Scope:** Complete business strategy + technical implementation plan for Free/Plus/Premium tiers
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

**Part C — Quality & Risk**
13. [Validation Log](#13-validation-log)
14. [Known Risks & Design Decisions](#14-known-risks)
15. [Summary of All Files Touched](#15-summary)

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

### 6.4 TypeScript Type Fixes (`web/src/lib/utils.ts`)

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

### 8.7 `POST /api/teams` — Team Creation & Seat Enforcement

**File:** `web/src/app/api/teams/route.ts`
**Current:** Any user can create a team. No seat cap.
**Changes:**
1. Check `getPlanConfig(plan).limits.teamSeats > 0` — Free (0 seats) → `403`
2. Invite gate: `team.memberIds.length + 1 >= teamSeats` → `403`
3. Tier-aware error: `"Plus plan supports up to 3 team members. Upgrade to Premium for 10."`

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
Replace hardcoded `>= 2` / `=== "free"` gate → tier-aware limits for ALL tiers. Remove `disabled` for quota case. Fire `toast.error()` on click when exhausted.

### 9.4 `profile/[id]/page.tsx`, `MyJobsSection.tsx`, `TalentPool.tsx` — Plan Badges
Update `"pro"` checks to `"plus"` / `"premium"` with corresponding badge styling.

### 9.5 `store.tsx` — State Management
Update TypeScript interfaces. Add `getUserPlanConfig()` helper. Expose remaining quota counts.

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

# Part C — Quality & Risk

## 13. Validation Log

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

### Verified Correct (✅ 36+ claims)

| Area | Count | Notes |
|------|-------|-------|
| Hardcoded limit values | 8/8 | All line numbers confirmed |
| splitEscrow call sites | 4/4 | All file paths confirmed |
| AI routes using quota check | 7/7 | Including added summarize-reviews |
| Badge checks | 3/3 | profile:123, MyJobs:71, TalentPool:122 |
| Routes with no plan gate needed | 12/12 | chat, disputes, email-logs, milestones, notifications, reviews, transactions, referrals, assessments, auth, pricing engine, email |
| Security checks | 2/2 | PATCH /api/user excludes `plan`; admin route requires `ADMIN_SECRET_KEY` |

---

## 14. Known Risks & Design Decisions

### 14.1 Quota Counters Never Decrement
**Problem:** Deleted bids/jobs don't restore quota. A user at 10/10 who deletes 5 still shows 10/10.
**Decision:** Intentional MVP simplification. Monthly reset is the ceiling. Decrementing introduces race conditions and abuse vectors (create-delete loops).

### 14.2 AI Prompt Exposes Plan Tier
**File:** `api/ai/evaluate-bids/route.ts` (line 115) — sends `"Plan: plus"` to Gemini. Could bias AI recommendation by subscription level.
**Decision:** Keep for now — useful signal. Strip if bias becomes a concern.

### 14.3 Admin Fee Override vs Plan Config
Global `platformFeePercent` conflicts with per-tier fees. Resolution: `getPlanConfig()` checks admin DB overrides first → falls back to code defaults (10/7/5).

### 14.4 `teamSeats: 0` for Free Tier
Free users **cannot** create teams at all. If solo team creation is desired, set back to `1` and gate only invites.

### 14.5 In-Memory Rate Limiter
`web/src/lib/sanitize.ts` rate limiter does not share state across instances. The atomic Mongo `findOneAndUpdate` pattern is what's actually load-bearing for plan limits. Rate limiter is best-effort abuse throttling only.

### 14.6 Failure Mode During Cutover
Migration (§10.1) must run *before* deploying renamed code. Old DB values (`"pro"`) falling through `getPlanConfig()` will hit the fallback (`PLANS.free`), which is fail-open/generous rather than locking users out.

---

## 15. Summary of All Files Touched

### Modified (27 existing files):

| File | Phase | Change |
|------|-------|--------|
| `web/src/lib/utils.ts` | 1 | Type definitions |
| `web/src/lib/money.ts` | 0 | Accept plan param for fee % |
| `web/src/lib/ai-plan-limit.ts` | 2 | Tier-aware caps |
| `web/src/app/api/jobs/route.ts` | 2 | Centralized caps |
| `web/src/app/api/bids/route.ts` | 2 | Centralized caps |
| `web/src/app/api/ai/bid-strategy/route.ts` | 2 | Tier-aware caps |
| `web/src/app/api/v1/jobs/route.ts` | 2 | API gate + caps + tier rate limit |
| `web/src/app/api/payments/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/[id]/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/[id]/route.ts` | 2 | Bid quota enforcement on accept (§8.17) |
| `web/src/app/api/jobs/offer-response/route.ts` | 0 | Pass plan to splitEscrow |
| `web/src/app/api/jobs/direct-offer/route.ts` | 2 | Job quota enforcement |
| `web/src/app/api/freelancer/dashboard/route.ts` | 2 | Use getPlanConfig |
| `web/src/app/api/teams/route.ts` | 2 | Seat cap enforcement |
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
| `web/src/lib/store.tsx` | 1 | Type updates |

### New files (9):

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
