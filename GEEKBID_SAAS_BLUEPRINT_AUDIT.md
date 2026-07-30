# Audit Report: GEEKBID_SAAS_BLUEPRINT.md

**Method:** Every claim below was checked against the actual source tree at
`/home/lakshinpathak/Downloads/Geekbid-14/web` — exact `grep -n` / file reads, not a
re-read of the blueprint's own prose. No code was changed; this is a read-only
verification pass.

**Bottom line:** The blueprint's own factual claims (limit values, line numbers, file
paths, call sites) are **accurate almost everywhere checked** — 8/8 hardcoded limits,
4/4 splitEscrow sites, 7/7 AI routes, all 26 modified files exist, all 9 new files are
genuinely new. However, its own "3-pass audit, 36+ claims verified" **missed one real,
meaningful enforcement gap** (see §1 finding F-1), and has two smaller documentation
inconsistencies (F-2, F-3) plus one framing issue (F-4).

---

## 1. New findings this audit surfaced (not caught by the blueprint's own 3 passes)

### F-1 — 🔴 HIGH — Job *acceptance* bypasses the bid quota entirely (real gap, unflagged)

The blueprint's §8.2 covers `POST /api/bids` (the counter-bid path) and §13's "12/12
no-gate-needed" table doesn't mention this at all. But there is a **second, separate**
path that inserts a bid document with zero quota check:

**File:** `web/src/app/api/jobs/[id]/route.ts`, the default "ACCEPT" action (lines 241–349)

```
242: if (auth.payload.role !== "freelancer") { ... }   // ← only check in the whole block
...
343: await db.collection("bids").insertOne({
344:   jobId: id,
345:   freelancerId: auth.payload.userId,
346:   bidType: "accept",
347:   bidPrice: finalPrice,
348:   createdAt: acceptedAt,
349: });
```

No read of `planLimits.bidsPlacedThisMonth`, no increment, no cap — anywhere in this
handler. **Effect:** a free-tier freelancer who has exhausted their 10-bids/month quota
via `POST /api/bids` can still call `PATCH /api/jobs/[id]` (accept-at-current-price) an
unlimited number of times and instantly win jobs, completely bypassing the quota the rest
of the plan is built around. This is arguably a bigger hole than the ones the blueprint
did catch (§8.12 direct-offer, §8.13 invites, §8.14 keys) since *accepting* is the winning
action, not just a proposal.

**Verdict:** the blueprint's job/bid quota-enforcement work (§8.1, §8.2, and the Phase 2
plan) is **incomplete** until this path is also gated. Recommend adding it as §8.17.

### F-2 — 🟡 LOW — Migration scripts have no execution home

§10 proposes `scripts/migrate-plan-names.mjs`, `scripts/migrate-plan-limits.mjs`,
`scripts/create-indexes.mjs`. **No `scripts/` directory exists anywhere in the repo**
(root or `web/`), and **there is no root-level `package.json`** — so there's no Node
project for these to run in (no `mongodb` driver dependency declared, no `.env` loading
mechanism specified, no documented `node scripts/x.mjs` invocation path). The blueprint
should specify where these live (likely `web/scripts/`, reusing `web`'s existing
dependencies and `.env.local`) and how they're actually invoked.

### F-3 — 🟡 LOW — §8.16 omits a file its own §15 summary correctly includes

§8.16 ("Admin Config `platformFeePercent` — Conflict Resolution") names only
`web/src/app/admin/config/page.tsx` as "the file" to change. But
`web/src/app/api/admin/config/route.ts` has the identical problem — line 22 hardcodes
`platformFeePercent: 10` as the single global default, and its PATCH `allowed` whitelist
(line 39: `["platformFeePercent", "defaultDecayRate", "maintenanceMode",
"registrationOpen", "aiEnabled"]`) would need restructuring for per-tier fields too. §15's
own summary table *does* separately list this backend route (for the right reason) — so
this is a section-level omission, not a plan-level one, but a reader implementing strictly
from §8.16 in isolation would update only the UI slider and miss the persistence layer
entirely.

### F-4 — 🟢 Framing nit — §9.7 undersells what `settings/page.tsx` actually is

§9.7 describes adding "an API Key Access Gate" to `settings/page.tsx` as if it's one
section of a broader settings page. In reality, `web/src/app/settings/page.tsx` is
**already entirely dedicated to API-key CRUD** (create/list/revoke against
`/api/keys`) — there is no other settings content on that page today. The claim itself
(no plan-gating exists there yet) is accurate; the description of *what kind of page*
it's changing is what's misleading.

---

## 2. Pass/Fail Table — All Requested Categories

### 2.1 — 8 hardcoded limit line numbers

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `api/jobs/route.ts:107-127` — `$lt: 3` | ✅ PASS | L107 `if (plan === "free")`, L120 `$lt: 3`, L127 error message — exact |
| 2 | `api/bids/route.ts:93-113` — `$lt: 10` | ✅ PASS | L93 `if (plan === "free")`, L106 `$lt: 10`, L113 error message — exact |
| 3 | `api/ai/bid-strategy/route.ts:38` — `FREE_PLAN_AI_BID_MONTHLY_LIMIT = 2` | ✅ PASS | L38 exact |
| 4 | `lib/ai-plan-limit.ts:8` — `FREE_PLAN_AI_MONTHLY_LIMIT = 5` | ✅ PASS | L8 exact |
| 5 | `api/v1/jobs/route.ts:136-158` — `$lt: 3` (duplicated) | ✅ PASS | L136 `if (plan === "free")`, L150 `$lt: 3`, L158 error — exact |
| 6 | `api/freelancer/dashboard/route.ts:46` — ternary chain | ✅ PASS | L46 exact: `plan === "pro" ? 50 : plan === "enterprise" ? 200 : 10` |
| 7 | `components/feed/FreelancerFeed.tsx:154` — same ternary | ✅ PASS | L154 exact match |
| 8 | `lib/money.ts:34` — `splitEscrow` flat 10% | ✅ PASS | L34 is the function signature; `feePercent` already an optional param defaulting to `DEFAULT_PLATFORM_FEE_PERCENT = 10` (L13) |

**8/8 confirmed accurate.**

### 2.2 — 4 splitEscrow call sites

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | `api/payments/route.ts:210` | ✅ PASS | Exact |
| 2 | `api/jobs/[id]/route.ts:143` | ✅ PASS | Exact |
| 3 | `api/jobs/[id]/route.ts:352` | ✅ PASS | Exact |
| 4 | `api/jobs/offer-response/route.ts:57` | ✅ PASS | Exact |

**4/4 confirmed — and a repo-wide grep for `splitEscrow(` confirms these are the *only*
4 call sites; nothing missed.**

### 2.3 — 7 AI routes (general quota via `ai-plan-limit.ts`)

| Route | Verdict |
|---|---|
| chat-assist | ✅ calls `checkAndConsumeAiQuota` |
| evaluate-bids | ✅ calls `checkAndConsumeAiQuota` |
| generate-description | ✅ calls `checkAndConsumeAiQuota` |
| quality-check | ✅ calls `checkAndConsumeAiQuota` |
| pricing-advisor | ✅ calls `checkAndConsumeAiQuota` |
| smart-search | ✅ calls `checkAndConsumeAiQuota` |
| summarize-reviews | ✅ calls `checkAndConsumeAiQuota` |

**7/7 confirmed.** `bid-strategy` (the 8th AI route) correctly excluded from this group —
it has its own separate, stricter cap, exactly as the blueprint describes.

### 2.4 — 16 backend route changes (§8.1–§8.16)

| § | Claim | Verdict | Evidence |
|---|---|---|---|
| 8.1 | `jobs/route.ts` — free capped, paid unlimited (bug) | ✅ PASS | Confirmed no `else` branch for non-free plans |
| 8.2 | `bids/route.ts` — same pattern | ✅ PASS | Confirmed |
| 8.3 | `bid-strategy/route.ts` — free-only gate | ✅ PASS | L37 `if (user.plan === "free" \|\| !user.plan)` |
| 8.4 | `ai-plan-limit.ts` — hardcoded 5, free-only | ✅ PASS | Confirmed |
| 8.5 | `v1/jobs/route.ts` — API-access gate + job cap + rate limit | ✅ PASS | All three sub-claims confirmed |
| 8.6 | `splitEscrow()` fee wiring | ✅ PASS | See §2.2 |
| 8.7 | `teams/route.ts` — no plan/seat check at all | ✅ PASS | Zero matches for plan/role/seat-cap logic anywhere in file |
| 8.8 | `jobs/feature/route.ts` — no payment/plan gate | ✅ PASS | Only check is admin-or-owner (L29), no plan logic |
| 8.9 | `freelancer/dashboard/route.ts` — hardcoded ternary | ✅ PASS | Same as §2.1 #6 |
| 8.10 | `seed/route.ts` — all seed users `plan: "free"` | ✅ PASS | L794 confirmed, no plus/premium seed users exist |
| 8.11 | New admin plan-override route (doesn't exist yet) | ✅ PASS (correctly proposed as new) | `api/admin/users/[id]/plan/route.ts` confirmed absent |
| 8.12 | `direct-offer/route.ts` — bypasses job quota entirely | ✅ PASS, and important | Zero plan-related matches; confirmed real `insertOne` into `jobs` at L55 with `type: "direct_offer"`, no quota check |
| 8.13 | `invites/route.ts` — no invite cap | ✅ PASS | Zero plan-related matches |
| 8.14 | `keys/route.ts` — unlimited API keys for anyone | ✅ PASS | Zero plan-related matches |
| 8.15 | `v1/jobs` flat 60 req/min at "line 57" | ⚠️ PASS but incomplete | L57 confirmed exact, **but the identical hardcoded check also exists at L107** (the POST handler) — blueprint only cites one of the two occurrences that would need changing |
| 8.16 | Admin global fee vs. per-tier conflict | ⚠️ PASS but incomplete | See F-3 above — omits the backend route file from its own per-section detail |

**14/16 clean pass, 2/16 pass-with-incomplete-detail (8.15, 8.16) — no outright wrong
claims in this section.**

### 2.5 — 9 frontend components (§9.1–§9.9)

| § | Claim | Verdict | Evidence |
|---|---|---|---|
| 9.1 | `pricing/page.tsx` — hardcoded pro/enterprise, $29/$99, dead buttons | ✅ PASS | `value: "pro"`, `"$29"`, `value: "enterprise"`, `"$99"` all confirmed; button block has no `onClick` at all |
| 9.2 | `FreelancerFeed.tsx:154` ternary | ✅ PASS | Same as §2.1 #7 |
| 9.3 | `AIBidStrategist.tsx` — hardcoded gate, still needs toast fix | ✅ PASS | Confirmed current code is still `disabled={loading \|\| isFreePlanLimited}`, no toast — accurately described as unfixed |
| 9.4 | Badge checks in `profile/[id]/page.tsx`, `MyJobsSection.tsx`, `TalentPool.tsx` | ✅ PASS | Lines 123/71/122 all exact, all `.plan === "pro"` |
| 9.5 | `store.tsx` has no `getUserPlanConfig()`/quota exposure yet | ✅ PASS | Zero matches — genuinely proposed as new |
| 9.6 | `components/ui/PlanLimitBanner.tsx` doesn't exist yet | ✅ PASS | `components/ui/` exists with 19 other primitives, no such file |
| 9.7 | `settings/page.tsx` needs an API-key access gate | ✅ PASS, framing nit | See F-4 — claim is accurate, description undersells that the page *is* the API-key feature, not a section of one |
| 9.8 | `admin/config/page.tsx` — single fee slider | ✅ PASS | Confirmed (same evidence as 8.16) |
| 9.9 | `PATCH /api/user` excludes `plan` from `allowedFields` | ✅ PASS | `allowedFields` = `[fullName, bio, skills, company, availability, hourlyRateMin, hourlyRateMax, avatarUrl, avatarPublicId]` — no `plan` |

**9/9 pass, one framing nit (9.7), no factual errors.**

### 2.6 — 26 modified files (§15)

**26/26 exist at the exact paths listed.** No missing files, no path mismatches. (Full
per-file table produced during this audit — every row confirmed via direct file-existence
check; omitted here for brevity since 100% passed with no exceptions worth tabulating
individually beyond what's already covered in §2.1–§2.5 above for the files with specific
claims attached.)

### 2.7 — 9 new files (§15)

**9/9 confirmed genuinely new** — none of the 6 proposed new source files
(`plans.ts`, `PlanLimitBanner.tsx`, `user/plan/route.ts`, `admin/users/[id]/plan/route.ts`,
`subscriptions/route.ts`, `webhooks/razorpay/route.ts`) or 3 proposed scripts already
exist anywhere in the repo. See **F-2** for the one real gap among these (the scripts have
no clear place to live/run from).

### 2.8 — Missing routes / overlooked enforcement gaps / uncovered CRUD operations

This was the open-ended part of the ask. Full sweep of every `insertOne`/`insertMany` into
`jobs` and `bids` collections repo-wide:

| Collection | Insert site | Quota-gated? | Covered by blueprint? |
|---|---|---|---|
| `jobs` | `api/jobs/route.ts` | ✅ Yes | ✅ §8.1 |
| `jobs` | `api/v1/jobs/route.ts` | ✅ Yes | ✅ §8.5 |
| `jobs` | `api/jobs/direct-offer/route.ts` | ❌ No | ✅ §8.12 (blueprint caught this one) |
| `jobs` | `api/seed/route.ts` | N/A (seed data) | N/A |
| `bids` | `api/bids/route.ts` | ✅ Yes | ✅ §8.2 |
| `bids` | **`api/jobs/[id]/route.ts` (accept action, L343)** | ❌ **No** | ❌ **Not covered anywhere — see F-1** |

`milestones` (`POST /api/milestones`, no plan check) was double-checked against the
blueprint's "no gate needed" classification — this holds up: milestones are scoped to a
job the client already paid the job-post quota for, and unlimited milestones-per-job isn't
a meaningful abuse vector the way job/bid/AI spam is. Not a miss.

No other metered-resource creation path (chat rooms, reviews, disputes, referrals,
assessments, transactions) was found to need plan-gating that isn't already correctly
classified as "no gate needed" in the blueprint's §13 table.

---

## 3. Summary

| Category | Result |
|---|---|
| 8 hardcoded limit line numbers | **8/8 accurate** |
| 4 splitEscrow call sites | **4/4 accurate, confirmed exhaustive** |
| 7 AI routes | **7/7 accurate** |
| 16 backend route claims (§8.1–8.16) | **14/16 clean, 2/16 incomplete detail (not wrong)** |
| 9 frontend components (§9.1–9.9) | **9/9 accurate, 1 framing nit** |
| 26 modified files | **26/26 exist** |
| 9 new files | **9/9 genuinely new** |
| Overlooked enforcement gaps | **1 real miss found (F-1, HIGH), 3 minor documentation issues (F-2, F-3, F-4)** |

The blueprint is factually well-grounded — essentially every specific, checkable claim
about the *current* codebase (line numbers, file paths, hardcoded values) held up under
direct verification. The one substantive gap (F-1: job acceptance bypassing the bid quota)
is worth folding in as §8.17 before this plan is treated as complete, since it undermines
the core premise that Phase 2 makes bid-quota enforcement airtight across all tiers.

*Independently audited via direct source verification and two parallel research passes;
no code was modified as part of this audit.*
