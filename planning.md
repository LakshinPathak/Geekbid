# GeekBid — Fix Plan (`issues.md` → implementation)

> **Source of truth for bugs:** [`issues.md`](./issues.md) (**61 issues**, 2026-07-17; second pass = ISSUE-35–61)  
> **Scope:** `web/` (Next.js API + MongoDB + frontend store/pages)  
> **Goal:** One planning doc covering **database fields**, **indexes**, **CRUD APIs**, **libs**, **frontend**, **env**, and **rollout order** for every issue.

---

## 1. Executive summary

| Track | What changes |
|---|---|
| **A — Money & billing hard gates** | Mock subscriptions fail-closed; featured boost amount **+ currency** (ISSUE-2, 42); escrow single-ledger |
| **B — Atomic job / bid / webhook races** | Cancel, quota reset, bid cooldown refund, webhook claim |
| **C — AuthZ / PII / injection** | Milestones, invite-only jobs, cron secret, suspended JWT, referral NoSQL (35), profile/teams leaks (43–45) |
| **D — Teams / subscriptions** | Owner ObjectId; seat CAS; accept/remove CRUD; unique active sub; halt status |
| **E — Frontend product bugs** | Direct Offer, Accept-best, plan refresh, tokens, inbox, earnings, My Jobs, session restore, Google login role |
| **F — Assessments / referrals / uploads** | GeekScore race, timeLimit, double referral, signed Cloudinary |
| **G — Product gaps (README)** | Forgot password, delete account, dispute create, split resolution |

**Out of scope for this plan:** microservice `backend/` services, landing-page visuals, new product features beyond fixing listed issues.

---

## 2. Collections & fields inventory (current → target)

### 2.1 `users`

| Field | Type (current) | Used by issues | Change? |
|---|---|---|---|
| `_id` | ObjectId | All auth | No |
| `plan` | `"free" \| "plus" \| "premium"` | ISSUE-1, 7, 11 | Write only after paid activation (ISSUE-1) |
| `subscriptionId` | string | ISSUE-1, 19 | Same |
| `planExpiresAt` | ISO string | ISSUE-1 | Same |
| `planLimits.jobsPostedThisMonth` | number | ISSUE-8 | Reset must be conditional |
| `planLimits.bidsPlacedThisMonth` | number | ISSUE-5, 8 | Refund on cooldown; conditional reset |
| `planLimits.featuredBoostsThisMonth` | number (if present) | ISSUE-8 | Conditional reset |
| `planLimits.monthResetAt` | ISO string | ISSUE-8 | Guarded compare-and-set |
| `suspended` / `deleted` | bool | ISSUE-30, **59** | Read in `authenticateRequest`; self-serve delete sets `deleted: true` |
| `teamId` / `teamRole` | string | ISSUE-7, **40** | Unset on seat prune / remove_member |
| `referralCode` | string | ISSUE-35 | Queried only as sanitized string |
| `referredBy` | string | ISSUE-36 | Set once; block re-apply |
| `referralCredits` | number | ISSUE-36 | Only via `creditReferralOnFirstJobCompletion` |
| `geekScore` | number | ISSUE-37, 49 | `$inc` only after unique assessment claim |
| `verifiedSkills` | string[] | ISSUE-37 | `$addToSet` after claim |
| `googleId` | string | ISSUE-44 | **Never** return on public profile |
| `email` | string | ISSUE-43 | Not in team member list projection |
| `password` | hash | ISSUE-45, 58 | Never bulk-load; reset via token flow |
| `avatarPublicId` | string | ISSUE-50 | Set only after signed upload |
| `ai*` quota fields | (via `ai-plan-limit`) | Reference pattern for ISSUE-8 | No change — **copy this pattern** |

**New optional user fields:** none required for escrow. Password reset uses separate collection (§13.2).

---

### 2.2 `jobs`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `_id` | ObjectId | All job CRUD | No |
| `status` | `"open" \| "accepted" \| "cancelled" \| "completed" \| …` | ISSUE-3, 4, 6, 25 | Cancel filter must include `status: "open"` |
| `cancelledAt` | ISO string | ISSUE-3 | Set only on successful atomic cancel |
| `clientId` | string (user id) | ISSUE-15, 31 | AuthZ |
| `acceptedBy` | string | ISSUE-6, 14, 26 | AuthZ / My Jobs |
| `finalPrice` | number | ISSUE-6, 21 | Prefer over `acceptedPrice` in complete email |
| `acceptedPrice` | (legacy / unused?) | ISSUE-21 | Stop reading; use `finalPrice` |
| `startingPrice` / `minimumPrice` / `decayRatePerHour` | number | ISSUE-12 | ETA must use adaptive helpers |
| `platformFeePercent` | number | ISSUE-6 | Already locked at create — keep |
| `type` | `"auction" \| "direct_offer"` | ISSUE-4, 15, 18 | UI branch + GET auth |
| `visibility` | e.g. `"public" \| "invite_only"` | ISSUE-15 | Restrict GET |
| `offeredTo` | string | ISSUE-4, 15 | AuthZ + UI |
| `offerStatus` | `"pending" \| "accepted" \| "declined"` | ISSUE-4 | Already atomic on respond |
| `featured` / `featuredAt` | bool / ISO | ISSUE-2, 31 | Only after amount-valid claim |
| `invitedFreelancerIds` (if exists) | string[] | ISSUE-15 | Include in GET allowlist |

**Optional new job fields (ISSUE-6 — pick one model in §4):**

| New field | Purpose |
|---|---|
| `escrowTransactionId` | Pointer to the single funded `transactions` doc |
| `escrowStatus` on job | Mirror: `unfunded \| held \| released \| refunded \| disputed` (optional denorm) |

---

### 2.3 `transactions` (escrow + boost payments)

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `_id` | ObjectId | ISSUE-2, 6, 16 | No |
| `jobId` | string | ISSUE-6, 16 | One **job escrow** row per job (enforced) |
| `clientId` | string | ISSUE-2, 31 | Boost claim: match **job.clientId**, not admin caller |
| `freelancerId` | string | ISSUE-6 | Set on accept/link; empty until award is OK for funded-only model |
| `grossAmount` | number | ISSUE-2, 6 | **Must** match boost price / job price rules |
| `platformFee` / `netAmount` | number | ISSUE-6 | Keep `splitEscrow` |
| `currency` | string (`INR` / `USD`) | ISSUE-2, 29 | Enforce on boost; drive UI format |
| `escrowStatus` | `"held" \| "released" \| "refunded" \| "disputed" \| …` | ISSUE-6, 20 | Don’t mint `held` without payment |
| `verified` | bool | ISSUE-2, 16 | Keep |
| `razorpayOrderId` / `razorpayPaymentId` / `razorpaySignature` | string | ISSUE-16 | Unique index on `razorpayPaymentId` |
| `description` | string | ISSUE-2 | Prefer server-set purpose; don’t trust alone |
| `consumedAt` | ISO string | ISSUE-2 | Keep for boost one-shot claim |
| `mock` | bool | ISSUE-1, 2 | Keep |
| `createdAt` / `releasedAt` | ISO | ISSUE-24 | Aggregate for real earnings chart |
| `paymentMethod` | string | — | Keep |

**New / hardened fields (recommended):**

| Field | Values | Why |
|---|---|---|
| `purpose` | `"job_escrow" \| "featured_boost" \| "subscription"` | Stop overloading `description` (ISSUE-2) |
| `purposeRef` | e.g. `jobId` or `featured_boost:<jobId>` | Bind payment to resource at **order create** |
| `funded` | bool | True only after Razorpay verify / webhook |
| `source` | `"razorpay" \| "system_placeholder"` | Distinguish fake accept-ledger rows during migration |

**Indexes to add** (extend `web/scripts/create-phase4-indexes.mjs` or new `create-fix-indexes.mjs`):

```js
// ISSUE-16
db.transactions.createIndex(
  { razorpayPaymentId: 1 },
  { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: "string", $gt: "" } } }
);

// ISSUE-6 — at most one job escrow row per job (after purpose exists)
db.transactions.createIndex(
  { jobId: 1, purpose: 1 },
  { unique: true, partialFilterExpression: { purpose: "job_escrow", jobId: { $gt: "" } } }
);

// ISSUE-2 — boost lookups
db.transactions.createIndex({ purpose: 1, purposeRef: 1, clientId: 1, consumedAt: 1 });
```

---

### 2.4 `bids`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `jobId` | string | ISSUE-5, 10, 26 | No schema change |
| `freelancerId` | string | ISSUE-5, 10, 26 | My Jobs include bid jobs |
| `bidType` | `"counter" \| "accept"` | ISSUE-10 | Optional: accept specific bid |
| `bidPrice` | number | ISSUE-10 | — |
| `createdAt` | ISO | ISSUE-5 cooldown | Check **before** quota reserve |

**Optional API/DB for ISSUE-10:** support `action: "accept_bid"` with `bidId` / `freelancerId` — awards that bid’s `freelancerId` + `bidPrice`, not global min.

**Index (optional):** `{ jobId: 1, freelancerId: 1, createdAt: -1 }` for cooldown queries.

---

### 2.5 `subscriptions`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `userId` | string | ISSUE-1, 19 | Partial unique active index |
| `plan` | plus/premium | ISSUE-1 | Don’t write on mock in prod |
| `razorpaySubscriptionId` | string (unique already) | ISSUE-1 | Mock ids only if allowed |
| `razorpayPlanId` | string | ISSUE-1 | Must be real plan id in prod |
| `status` | `created \| active \| past_due \| cancelled \| completed \| halted?` | ISSUE-19, 32 | Normalize `halted` → `cancelled` |
| `pendingPlanChange` | plus/premium/null | — | Keep |
| `gracePeriodEndsAt` | ISO/null | cron | Keep |
| `currentPeriodStart` / `End` | ISO | ISSUE-1 | Keep |
| `mock` | bool (add if missing) | ISSUE-1 | Mark mock subs explicitly |

**Index to add (ISSUE-19):**

```js
db.subscriptions.createIndex(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["created", "active", "past_due"] },
    },
  }
);
```

> Note: existing non-unique `{ userId: 1 }` remains for history; partial unique covers “one live sub”. Clean duplicate live rows before creating index.

---

### 2.6 `webhook_events`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `eventId` | string (unique) | ISSUE-9 | Keep |
| `status` | `received \| processing \| processed \| failed` | ISSUE-9 | **Add `processing` claim** |
| `payload` | object | ISSUE-9 | Keep |
| `processedAt` / `errorMessage` / `retryCount` | — | ISSUE-9 | Keep |
| `createdAt` | ISO (TTL exists) | — | Keep |

**Claim transition (ISSUE-9):**

1. Upsert insert → `received`  
2. `findOneAndUpdate({ eventId, status: { $in: ["received","failed"] } }, { $set: { status: "processing" } })`  
3. Process → `processed` or `failed`

---

### 2.7 `teams`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `ownerId` | **string** (user id hex) | ISSUE-7 | Lookup must use `new ObjectId(ownerId)` |
| `memberIds` | string[] | ISSUE-7 | LIFO prune after correct plan |
| `status` | `active \| over_limit \| frozen` | ISSUE-7 | Keep |
| `seatDeadline` | ISO | ISSUE-7 | Keep |

**No schema change** — code fix only. Optionally store `ownerId` consistently as string everywhere (already is).

---

### 2.8 `milestones`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `jobId` | string | ISSUE-14 | AuthZ via parent job |
| `amount` / `title` / `status` / `order` | — | ISSUE-14 | Leak today — gate GET |

No new fields.

---

### 2.9 `disputes`

| Field | Type | Used by issues | Change? |
|---|---|---|---|
| `status` | string | ISSUE-20 | Allowlist: `open \| resolved \| …` |
| `resolutionType` | e.g. refund/pay | ISSUE-20 | Required when resolving |
| linked `jobId` / transaction | — | ISSUE-20 | Escrow move only on allowlisted resolve |

---

### 2.10 Env / config (not Mongo, but required)

| Variable | Issues | Rule |
|---|---|---|
| `RAZORPAY_KEY_ID` / `SECRET` | 1, 2 | Placeholder ⇒ not configured |
| `RAZORPAY_PLAN_ID_PLUS` / `PREMIUM` | 1 | Required for real subscribe |
| `ALLOW_MOCK_BILLING` | 1 | Explicit opt-in for mock subs (dev only) |
| `NODE_ENV` | 1 | Production fail-closed |
| `CRON_SECRET` | 17 | **Required**; reject if unset |
| `FEATURED_BOOST_PRICE_USD` (code const in `plans.ts`) | 2 | Enforce vs `grossAmount` (+ currency policy) |

---

## 3. CRUD / API change matrix

Legend: **C**reate **R**ead **U**pdate **D**elete · ★ = behavior change

| Method | Route | CRUD | Issues | What to change |
|---|---|---|---|---|
| `POST` | `/api/subscriptions` | C | **1, 19** | Fail if `!ALLOW_MOCK_BILLING` and (`!isRazorpayConfigured` \|\| `!planId`); never `$set users.plan` in mock unless allowed; handle duplicate-key on partial unique |
| `GET` | `/api/subscriptions` | R | 19, 32 | Treat `halted` as cancelled for UI if any remain |
| `PATCH` | `/api/subscriptions` | U | 1, 19 | Same mock guard on verify/change-plan paths |
| `POST` | `/api/payments` (create order) | C | **2, 6, 16, 29** | Server-set `notes`/`purpose`/`purposeRef`; for boost force amount = `FEATURED_BOOST_PRICE_*`; for job escrow force amount from job; ignore client amount when purpose is fixed |
| `PATCH` | `/api/payments` (verify) | C/U | **2, 6, 16** | Write `purpose`, `currency`, `funded: true`; unique `razorpayPaymentId`; don’t create second job escrow |
| `PATCH` | `/api/jobs/feature` | U | **2, 31** | Claim filter: `purpose: "featured_boost"`, `purposeRef: jobId`, `grossAmount` ≥ price, `currency` match, `clientId: job.clientId` (or admin override explicit) |
| `PATCH` | `/api/jobs/[id]/cancel` | U | **3** | `findOneAndUpdate({ _id, status: "open" }, …)`; 409 if null |
| `GET` | `/api/jobs/[id]` | R | **15** | If `invite_only` / `direct_offer`, require auth + (client \| offeredTo \| invited \| admin) |
| `PATCH` | `/api/jobs/[id]` | U | **6, 10** | Stop inserting unverified `held` escrow on accept / `accept_best`; optional new `accept_bid`; link/update funded tx (`freelancerId`, `escrowStatus`) |
| `PATCH` | `/api/jobs/offer-response` | U | **4, 6** | Same escrow rule as accept; API already OK for UI wiring |
| `POST` | `/api/jobs/direct-offer` | C | **18, 8** | Validate `price` finite & > 0 (& ≥ floor rules); conditional month reset |
| `POST` | `/api/jobs` | C | **8** | Conditional `planLimits` month reset (AI pattern) |
| `POST` | `/api/bids` | C | **5, 8** | Cooldown **before** quota reserve **or** refund on 429; conditional reset |
| `GET` | `/api/bids` / `/api/bids/my` | R | 26 | Used by My Jobs expansion (frontend may call existing) |
| `PATCH` | `/api/jobs/[id]/complete` | U | **6, 21** | Release **the** funded escrow (`purpose: job_escrow`, correct `freelancerId`); email uses `job.finalPrice` |
| `GET` | `/api/milestones` | R | **14** | Load job; allow only client / acceptedBy / admin |
| `POST`/`PATCH` | `/api/milestones` | C/U | 14 | Keep existing auth; align with GET |
| `PATCH` | `/api/disputes` | U | **20** | Allowlist `status`; require `resolutionType` when → `resolved` |
| `POST` | `/api/webhooks/razorpay` | C/U | **9** | Claim `processing` before `processWebhookEvent` |
| `GET` | `/api/cron/reconcile-subscriptions` | U | **7, 17, 32** | Require non-empty `CRON_SECRET`; map halted→cancelled; relies on fixed `enforceExpiredTeamSeatDeadlines` |
| `GET` | `/api/cron/retry-webhooks` | U | **9, 17** | Same CRON_SECRET gate; only process `failed` after claim |
| `GET`/`PATCH` | `/api/transactions` | R/U | 6, 24 | Prefer filtering `purpose` / `funded` for earnings |
| `GET` | `/api/freelancer/earnings` | R | 24 | Return monthly series from real `releasedAt` if adding chart data |
| `GET`/`POST`/`PATCH` | `/api/teams` | CRUD | 7 | Ensure `ownerId` stored as string; any owner lookups use ObjectId |
| Auth routes | `/api/auth/*` | — | **30** | Prefer fix in `authenticateRequest` (covers all protected CRUD) |

**APIs with no required change** (frontend-only issues): most of feed/landing; store wiring for ISSUE-4, 10–13, 22–29, 33–34.

---

## 4. ISSUE-6 escrow model (decision + migration)

### 4.1 Target lifecycle (recommended)

```
[Client pays] POST/PATCH /api/payments
    → transactions { purpose: "job_escrow", jobId, verified: true, funded: true, escrowStatus: "held", freelancerId: "" }

[Award] PATCH /api/jobs/[id] accept | accept_best | accept_bid
    OR PATCH /api/jobs/offer-response accepted
    → jobs { status: "accepted", acceptedBy, finalPrice, escrowTransactionId }
    → transactions.updateOne({ _id, purpose: "job_escrow" }, { $set: { freelancerId, grossAmount? locked, … } })
    → DO NOT insertOne a second held row

[Complete] PATCH /api/jobs/[id]/complete
    → transactions { escrowStatus: "released", releasedAt }
    → require funded + matching freelancerId

[Dispute resolve] PATCH /api/disputes
    → released / refunded from disputed state (existing money move, allowlisted status)
```

### 4.2 Migration for existing data

1. Find jobs with `status ∈ {accepted, completed}` and **two** `held` txs → keep Razorpay-verified row; mark system placeholder with `source: "system_placeholder"`, `escrowStatus: "void"` (new allowlisted status) or delete in non-prod.  
2. Jobs with only placeholder held (never paid) → product decision:  
   - **A (strict):** block complete until payment;  
   - **B (compat):** treat placeholder as legacy held until N days.  
   **Plan default: A for new awards; B only for rows created before deploy flag `ESCROW_LEGACY_PLACEHOLDERS=true`.**

### 4.3 CRUD touch list for ISSUE-6

| File | Change |
|---|---|
| `api/payments/route.ts` | purpose, unique payment id, no duplicate job escrow |
| `api/jobs/[id]/route.ts` | remove `insertOne` held on accept; link funded tx |
| `api/jobs/offer-response/route.ts` | same |
| `api/jobs/[id]/complete/route.ts` | update by `escrowTransactionId` or `{ jobId, purpose: "job_escrow", funded: true }` |
| `api/disputes/route.ts` | same targeting |
| `api/reviews/route.ts` | already requires `released` — unchanged if single ledger |
| `lib/webhook-processing.ts` | if payment.captured also funds escrow, keep idempotent |
| `scripts/create-*-indexes.mjs` | unique indexes §2.3 |
| Seed `api/seed/route.ts` | seed txs with `purpose` / `funded` |

---

## 5. Shared libs to change

| Lib | Issues | Change |
|---|---|---|
| `lib/razorpay.ts` | 1 | Export helper `assertBillingConfigured()` / `canUseMockBilling()` |
| `lib/plans.ts` | 2, 29 | Export boost price + currency constant used by payments + feature |
| `lib/plan-downgrade.ts` | **7** | `new ObjectId(team.ownerId)` with try/catch |
| `lib/ai-plan-limit.ts` | 8 | **Reference implementation** — extract shared `resetPlanLimitsIfStale(userId, observedResetAt)` used by jobs/bids/feature/direct-offer |
| `lib/auth.ts` | **30** | In `authenticateRequest`, after JWT: load user flags `suspended`/`deleted` (cache lightly or projection-only query) |
| `lib/webhook-processing.ts` | 9, 32 | Expect claim already `processing`; map halt→cancelled consistently |
| `lib/money.ts` / `lib/utils.ts` | 12, 21, 29 | Adaptive ETA helper; `formatMoney(amount, currency)`; prefer `finalPrice` |
| `lib/store.tsx` | 4, 10–13, 23, 34 | Wire `respondToOffer`; accept_bid or label fix; `refreshCurrentUser` after mutations; merge chat by room; markAllRead error handling; getValidToken everywhere |

---

## 6. Frontend / UI change matrix

| Surface | Issues | Change |
|---|---|---|
| `jobs/[id]/page.tsx` | **4, 10, 12, 28** | Direct Offer Accept/Decline → `respondToOffer`; hide auction CTAs when `type === "direct_offer"`; Accept-best labeling or per-bid API; disable in-flight; adaptive ETA |
| `components/feed/*` (DirectHire, FreelancerFeed, ClientFeed) | 4, 10, 13 | Offer actions; token refresh; Accept Best wording |
| `post-job/page.tsx` | **22, 11** | Local `submitting`; refresh plan after success |
| `payments/page.tsx` | **13, 29** | `getValidToken()` in handler; show INR/USD correctly |
| `pricing/page.tsx` + `useSubscriptionCheckout.ts` | 1 | Surface mock-disabled / config errors from API |
| `inbox/page.tsx` | **23, 33** | Merge messages; `sending` guard |
| `earnings/page.tsx` | **24** | Real monthly aggregation or remove fake chart |
| `my-jobs/page.tsx` | **25, 26** | Status badge map; include bid-on jobs (+ pending offers) |
| `feed/page.tsx` | **27** | Explicit `freelancer` / `admin` branches |
| `PlanLimitBanner` + AI components | **11** | Refresh usage after consume |
| Admin disputes UI | **20** | Only allowlisted statuses + resolutionType |

---

## 7. Per-issue solution sheets (DB + CRUD)

### ISSUE-1 — Mock subscriptions
- **DB:** `subscriptions` insert only if mock allowed; `users.plan` / `subscriptionId` / `planExpiresAt` unchanged shape.  
- **CRUD:** `POST`/`PATCH /api/subscriptions` — gate.  
- **Env:** `ALLOW_MOCK_BILLING`.  

### ISSUE-2 — Featured boost amount
- **DB:** `transactions.purpose`, `purposeRef`, enforce `grossAmount`, `currency`, `consumedAt`.  
- **CRUD:** `POST`/`PATCH /api/payments`, `PATCH /api/jobs/feature`.  

### ISSUE-3 — Atomic cancel
- **DB:** `jobs.status`, `jobs.cancelledAt` — write only if filter matches `open`.  
- **CRUD:** `PATCH /api/jobs/[id]/cancel`.  

### ISSUE-4 — Direct Offer UI
- **DB:** none (uses `jobs.type`, `offeredTo`, `offerStatus`).  
- **CRUD:** existing `PATCH /api/jobs/offer-response` — wire FE only.  

### ISSUE-5 — Bid quota + cooldown
- **DB:** `users.planLimits.bidsPlacedThisMonth` — refund `$inc: -1` on cooldown fail.  
- **CRUD:** `POST /api/bids`.  

### ISSUE-6 — Escrow ledger
- **DB:** §2.3 + §4; `jobs.escrowTransactionId` optional.  
- **CRUD:** payments, jobs accept, offer-response, complete, disputes.  

### ISSUE-7 — Team owner ObjectId
- **DB:** `teams.ownerId` (string) — lookup fix only.  
- **CRUD:** cron reconcile → `enforceExpiredTeamSeatDeadlines`; audit `teams` route owner reads.  

### ISSUE-8 — Conditional month reset
- **DB:** `users.planLimits.*` — compare-and-set on `monthResetAt`.  
- **CRUD:** `POST /api/jobs`, `POST /api/bids`, `POST /api/jobs/direct-offer`, `PATCH /api/jobs/feature`.  
- **Lib:** shared helper from `ai-plan-limit` pattern.  

### ISSUE-9 — Webhook claim
- **DB:** `webhook_events.status` ∈ `{received, processing, processed, failed}`.  
- **CRUD:** `POST /api/webhooks/razorpay`, `GET /api/cron/retry-webhooks`.  

### ISSUE-10 — Accept specific bid vs best
- **DB:** `bids` read; `jobs.acceptedBy` / `finalPrice` set from chosen bid.  
- **CRUD:** extend `PATCH /api/jobs/[id]` with `action: "accept_bid", bidId` **or** FE-only label if product keeps always-best.  

### ISSUE-11 — Stale plan UI
- **DB:** none.  
- **CRUD:** optional response headers already (`withPlanHeader`) — FE refresh after mutations.  

### ISSUE-12 — Adaptive ETA
- **DB:** none (job pricing fields already present).  
- **Lib/FE:** `getHoursToFloor` / new `getAdaptiveHoursToFloor`.  

### ISSUE-13 — Token refresh on payments
- **DB:** none.  
- **FE:** `getValidToken()`.  

### ISSUE-14 — Milestones AuthZ
- **DB:** read `jobs` for `clientId`/`acceptedBy`.  
- **CRUD:** `GET /api/milestones`.  

### ISSUE-15 — Private job GET
- **DB:** `jobs.visibility`, `type`, `offeredTo`, invites.  
- **CRUD:** `GET /api/jobs/[id]`.  

### ISSUE-16 — Unique payment id
- **DB:** unique index `transactions.razorpayPaymentId`.  
- **CRUD:** `PATCH /api/payments` catch duplicate key → return existing.  

### ISSUE-17 — CRON_SECRET required
- **DB:** none.  
- **CRUD:** both cron routes.  

### ISSUE-18 — Direct-offer price validation
- **DB:** `jobs.startingPrice` etc. must be finite.  
- **CRUD:** `POST /api/jobs/direct-offer`.  

### ISSUE-19 — Double subscribe
- **DB:** partial unique index on active statuses.  
- **CRUD:** `POST /api/subscriptions`.  

### ISSUE-20 — Dispute status allowlist
- **DB:** `disputes.status`, `resolutionType`; `transactions.escrowStatus`.  
- **CRUD:** `PATCH /api/disputes`.  

### ISSUE-21 — Complete email price
- **DB:** read `jobs.finalPrice`.  
- **CRUD:** `PATCH /api/jobs/[id]/complete`.  

### ISSUE-22–29, 33–34 — FE
- See §6; minimal/no DB. ISSUE-29 may set display currency from `transactions.currency` / env default `INR`.  

### ISSUE-30 — Suspended mid-session
- **DB:** read `users.suspended`, `users.deleted`.  
- **CRUD:** all authenticated routes via `authenticateRequest`.  

### ISSUE-31 — Admin boost clientId
- **DB:** claim `clientId: job.clientId`.  
- **CRUD:** `PATCH /api/jobs/feature`.  

### ISSUE-32 — halted → cancelled
- **DB:** `subscriptions.status`.  
- **CRUD:** reconcile cron + webhook processing.  

---

## 8. Implementation phases

### Phase 0 — Prep (½ day)
- [ ] Add `ALLOW_MOCK_BILLING` to `.env.example` / docs  
- [ ] Extend index script (`create-fix-indexes.mjs`) with §2.3 / §2.5 indexes  
- [ ] Data cleanup query for duplicate active subscriptions + duplicate job txs  
- [ ] Decide ISSUE-6 migration mode (A/B) and ISSUE-10 product choice (API vs label)

### Phase 1 — Critical money & races (ISSUE-1, 2, 3, 5, 7, 9, 17)
- [ ] Subscriptions fail-closed  
- [ ] Payments purpose + boost amount + feature claim  
- [ ] Atomic cancel  
- [ ] Bid cooldown/quota order  
- [ ] Team ObjectId  
- [ ] Webhook `processing` claim  
- [ ] Cron secret required  

### Phase 2 — Escrow unification (ISSUE-6, 16, 21) + AuthZ (14, 15, 20, 30)
- [ ] Stop minting placeholder held on accept  
- [ ] Link funded tx; complete/dispute target funded row  
- [ ] Unique `razorpayPaymentId`  
- [ ] Milestones GET + private job GET  
- [ ] Dispute allowlist  
- [ ] Suspended check in auth  

### Phase 3 — Quotas & billing edge cases (ISSUE-8, 18, 19, 31, 32)
- [ ] Shared conditional month reset  
- [ ] Direct-offer price validation  
- [ ] Partial unique subscription index  
- [ ] Admin feature clientId  
- [ ] halted mapping  

### Phase 4 — Frontend product fixes (ISSUE-4, 10–13, 22–29, 33–34, 38, 41–42, 51–57)
- [ ] Direct Offer Accept/Decline  
- [ ] Accept UX / accept_bid  
- [ ] Plan refresh, tokens (incl. admin/fetchJobs/invite), double-submit, inbox merge, earnings, My Jobs, feed roles, currency, markAllRead  
- [ ] Google login role intent; session `authReady`; FeaturedBoost amount/currency; Razorpay script ready; subscription `created` resume  
- [ ] Team accept/remove UI; post-job role gate; mobile inbox badge; assessment FE latch  

### Phase 5 — Second-pass security & teams/assessments (ISSUE-35–37, 39–40, 43–50)
- [ ] Referral sanitize + unique referredUserId  
- [ ] Assessment unique index + timeLimit / attempt token  
- [ ] Teams GET projection, seat CAS, remove_member, pending-invite GET  
- [ ] Public profile strip googleId; dashboard scoped user queries  
- [ ] Chat rate/size limits; signed Cloudinary; freelancer dashboard metrics  

### Phase 6 — Product gaps (ISSUE-58–61)
- [ ] Forgot/reset password  
- [ ] Self-serve delete account  
- [ ] Dispute create + split resolution  

### Phase 7 — Verify
- [ ] Re-run scenarios from `CRUD_INTERACTION_TEST_PLAN.md` for cancel/accept, boost, subscribe, dispute, complete  
- [ ] Concurrent tests: double cancel/accept, double webhook, double verify payment, double subscribe, double assessment, double team accept, referral `$ne`  
- [ ] Update `issues.md` checkboxes / close list  

---

## 9. File checklist (implementation map)

### API routes
- [ ] `web/src/app/api/subscriptions/route.ts`
- [ ] `web/src/app/api/payments/route.ts`
- [ ] `web/src/app/api/jobs/feature/route.ts`
- [ ] `web/src/app/api/jobs/[id]/cancel/route.ts`
- [ ] `web/src/app/api/jobs/[id]/route.ts`
- [ ] `web/src/app/api/jobs/[id]/complete/route.ts`
- [ ] `web/src/app/api/jobs/offer-response/route.ts`
- [ ] `web/src/app/api/jobs/direct-offer/route.ts`
- [ ] `web/src/app/api/jobs/route.ts`
- [ ] `web/src/app/api/bids/route.ts`
- [ ] `web/src/app/api/milestones/route.ts`
- [ ] `web/src/app/api/disputes/route.ts` (+ **POST create**, split)
- [ ] `web/src/app/api/webhooks/razorpay/route.ts`
- [ ] `web/src/app/api/cron/reconcile-subscriptions/route.ts`
- [ ] `web/src/app/api/cron/retry-webhooks/route.ts`
- [ ] `web/src/app/api/auth/route.ts` (**35, 36**)
- [ ] `web/src/app/api/auth/google/*` (**38**)
- [ ] `web/src/app/api/auth/forgot/route.ts` + `reset/route.ts` (**58** — new)
- [ ] `web/src/app/api/user/route.ts` or delete endpoint (**59**)
- [ ] `web/src/app/api/assessments/route.ts` (**37, 49**)
- [ ] `web/src/app/api/teams/route.ts` (**39, 40, 43, 46**)
- [ ] `web/src/app/api/users/[id]/route.ts` (**44**)
- [ ] `web/src/app/api/client/activity-feed/route.ts` + `job-health/route.ts` (**45**)
- [ ] `web/src/app/api/chat/messages/route.ts` (**47**)
- [ ] `web/src/app/api/freelancer/dashboard/route.ts` (**48**)
- [ ] `web/src/app/api/upload/sign/route.ts` (**50**)
- [ ] `web/src/app/api/invites/route.ts` (**51**)

### Libs
- [ ] `web/src/lib/auth.ts`
- [ ] `web/src/lib/plan-downgrade.ts`
- [ ] `web/src/lib/ai-plan-limit.ts` (+ extract shared reset helper)
- [ ] `web/src/lib/razorpay.ts` / `plans.ts` / `money.ts` / `utils.ts` / `sanitize.ts`
- [ ] `web/src/lib/webhook-processing.ts`
- [ ] `web/src/lib/referrals.ts`
- [ ] `web/src/lib/store.tsx`
- [ ] `web/src/lib/useSubscriptionCheckout.ts`

### Scripts / seed
- [ ] `web/scripts/create-phase4-indexes.mjs` or new `create-fix-indexes.mjs` (+ referrals, assessment_results, password_reset_tokens)
- [ ] `web/src/app/api/seed/route.ts` (purpose/funded fields)

### Frontend
- [ ] `web/src/app/jobs/[id]/page.tsx`
- [ ] `web/src/app/post-job/page.tsx`
- [ ] `web/src/app/payments/page.tsx`
- [ ] `web/src/app/inbox/page.tsx`
- [ ] `web/src/app/earnings/page.tsx`
- [ ] `web/src/app/my-jobs/page.tsx`
- [ ] `web/src/app/feed/page.tsx`
- [ ] `web/src/app/login/page.tsx` (**38, 58**)
- [ ] `web/src/app/team/page.tsx` (**39, 40**)
- [ ] `web/src/app/profile/page.tsx` (**59**)
- [ ] `web/src/app/assessments/page.tsx` (**55**)
- [ ] `web/src/app/admin/*` (**54**)
- [ ] `web/src/components/feed/*` / `FeaturedBoostModal.tsx` / `AvatarUploader.tsx` / `mobile-bottom-nav.tsx`
- [ ] `web/src/components/PlanLimitBanner.tsx` / AI widgets

---

## 10. Test plan (DB-aware)

| Test | Assert |
|---|---|
| Subscribe without plan IDs in prod | 503/400; **no** `users.plan` write |
| Boost with amount &lt; price / wrong currency | feature claim 400; `consumedAt` unset |
| FeaturedBoost UI amount | order amount matches labeled currency (not ₹10 for $10) |
| Parallel accept + cancel | one 200 cancel **or** accept; never cancelled-after-accepted |
| Bid during cooldown | 429; `bidsPlacedThisMonth` unchanged |
| Two webhooks same `eventId` | one `processed`; side effects once |
| Seat deadline Plus team | members pruned to Plus seats (owner found) |
| Accept job | **one** `purpose: job_escrow` tx; complete releases that row |
| Dual payment verify | second returns existing; unique index holds |
| Milestone GET as stranger | 403 |
| Invite-only job GET anonymous | 401/403 |
| Cron without secret | 401 |
| Direct offer UI | Accept/Decline persist `offerStatus` |
| Earnings | chart matches sum of `released` by month |
| Register with `referralCode: {$ne:null}` | 400 / ignored; no arbitrary referrer |
| Dual-role + same referral code | no second `referrals` row |
| Parallel assessment pass | one result; geekScore +50 once |
| Google login (no signup intent) | roles unchanged |
| Team invitee Accept | `memberIds` gains user; seats respected |
| Remove member | `memberIds` + `users.teamId` cleared |
| Public profile | no `googleId` / email |
| Teams GET | no member emails |
| Chat 10k char message | 400 |
| Unsigned upload | disabled; signed path works |
| Forgot → reset | password hash changed; token one-shot |
| Delete account | `deleted: true`; login blocked |
| POST dispute as party | doc created `open`; stranger 403 |
| Resolve split | escrow partially released/refunded |

---

## 11. Open decisions (block Phase 0)

1. **ISSUE-6:** Strict “must pay before complete” vs legacy placeholders?  
2. **ISSUE-10:** New `accept_bid` API vs rename UI to “Accept best bid”?  
3. **ISSUE-2 / 42 currency:** Convert USD→INR at order time, or reprice boost in INR (`FEATURED_BOOST_PRICE_INR`)? **Default recommendation: store boost price in INR paise as source of truth for Razorpay.**  
4. **ISSUE-30:** Extra DB read per request — acceptable vs short denylist cache?  
5. **ISSUE-49:** Trust client `startedAt` + grace, or new `assessment_attempts` with server `startedAt`?  
6. **ISSUE-58–61:** Build full product gaps in this epic, or split to a follow-up epic?

---

## 12. Traceability (ISSUE-1–34)

| issues.md | Phase | Primary DB | Primary CRUD |
|---|---|---|---|
| 1 | 1 | `subscriptions`, `users` | `POST/PATCH /api/subscriptions` |
| 2 | 1 | `transactions` | `payments`, `jobs/feature` |
| 3 | 1 | `jobs` | `jobs/[id]/cancel` |
| 4 | 4 | `jobs` (read) | `jobs/offer-response` (FE) |
| 5 | 1 | `users.planLimits` | `POST /api/bids` |
| 6 | 2 | `transactions`, `jobs` | accept / payments / complete |
| 7 | 1 | `teams`, `users` | cron + `plan-downgrade` |
| 8 | 3 | `users.planLimits` | jobs/bids/feature/direct-offer |
| 9 | 1 | `webhook_events` | webhooks + retry cron |
| 10 | 4 | `bids`, `jobs` | `PATCH /api/jobs/[id]` ± FE |
| 11–13 | 4 | — | FE + store |
| 14–15 | 2 | `milestones`, `jobs` | GET milestones / jobs/[id] |
| 16 | 2 | `transactions` index | `PATCH /api/payments` |
| 17 | 1 | — | cron routes |
| 18–19 | 3 | `jobs` / `subscriptions` | direct-offer / subscriptions |
| 20–21 | 2 | `disputes`, `jobs`, `transactions` | disputes / complete |
| 22–29, 33–34 | 4 | mostly — | FE |
| 30 | 2 | `users` | `authenticateRequest` |
| 31–32 | 3 | `transactions` / `subscriptions` | feature / reconcile |

---

## 13. Second-pass solutions (ISSUE-35–61) — DB fields + CRUD

### 13.1 New / extended collections

#### `referrals` (ISSUE-35, 36)

| Field | Type | Notes |
|---|---|---|
| `referrerUserId` | string | ObjectId hex of referrer |
| `referredUserId` | string | **unique** — one referral row per referred user |
| `referralCode` | string | Primitive string only (sanitized) |
| `status` | `signed_up \| credited` | Credit path already CAS on status |
| `creditAmount` | number | Set on credit |
| `createdAt` / `completedAt` | ISO | |

**Indexes:**

```js
db.referrals.createIndex({ referredUserId: 1 }, { unique: true });
db.referrals.createIndex({ referrerUserId: 1, status: 1 });
db.users.createIndex({ referralCode: 1 }, { unique: true, sparse: true });
```

**CRUD:**
- `POST /api/auth` (register) — sanitize `referralCode`; skip insert if `referredBy` exists or `roleAdded`; catch duplicate key.
- `lib/referrals.ts` — keep status CAS (already good).
- `GET /api/referrals` — unchanged if already scoped to caller.

---

#### `assessment_results` (+ optional `assessment_attempts`) (ISSUE-37, 49)

| Field | Type | Notes |
|---|---|---|
| `userId` | string | |
| `assessmentId` | string | |
| `skill` / `score` / `passed` / `answers` | — | existing |
| `startedAt` / `completedAt` | ISO | ISSUE-49: prefer server start |

**Optional new `assessment_attempts`:**

| Field | Notes |
|---|---|
| `userId`, `assessmentId` | |
| `startedAt` | **server** ISO at `POST /api/assessments/start` |
| `expiresAt` | `startedAt + timeLimit` |
| `token` | random; required on submit |

**Indexes:**

```js
// One successful (or any) attempt window — choose product rule:
db.assessment_results.createIndex(
  { userId: 1, assessmentId: 1 },
  { unique: true } // or partial unique on last 30d via app logic + insert claim
);
```

**CRUD:**
- `POST /api/assessments` (submit) — try `insertOne`; on duplicate key → 429; only then `$inc geekScore` / `$addToSet verifiedSkills`.
- Enforce `Date.now() - startedAt <= timeLimitMs + grace` (or attempt token expiry).
- Optional: `POST /api/assessments/start` creates attempt row.

**Users fields touched:** `geekScore`, `verifiedSkills`.

---

#### `teams` (ISSUE-39, 40, 43, 46)

| Field | Change |
|---|---|
| `ownerId` | string — lookup with `ObjectId` (ISSUE-7) |
| `memberIds` | string[] — `$push` only under seat predicate; `$pull` on remove |
| `invites[]` | `{ email, status, invitedAt, token? }` — status `pending\|accepted\|revoked` |
| `status` | `active\|over_limit\|frozen` |
| `seatDeadline` | ISO |

**CRUD:**

| Action | Method/route | DB writes |
|---|---|---|
| Get my team **or pending invite** | `GET /api/teams` | Read `teams` where member/owner **OR** `invites.email === me` + `status: pending`. Return `{ team, pendingInvite }` shape. |
| Invite | existing `action: "invite"` | Push invite; seat check at invite time |
| Accept | existing `action: "accept"` | **CAS:** `findOneAndUpdate` with `memberIds` length + pending invites &lt; `plan.teamSeats`; `$push memberIds`; `$set invites.$.status: accepted`; `$set users.teamId` |
| **Remove member (NEW)** | `action: "remove_member", userId` | Owner-only; `$pull memberIds`; `$unset` member `teamId`/`teamRole`; if under seat cap clear `over_limit` |
| Member list projection | GET | `fullName, avatarUrl, geekScore, role` only — **no email, googleId, password** |

---

#### `users` public projection (ISSUE-44, 45)

**Strip on `GET /api/users/[id]`:** `password`, `email`, `refreshToken`, `googleId`, `referredBy`, `referralCredits`, plan billing internals as needed.

**Client dashboards:** never `users.find({})`. Always:

```js
find(
  { _id: { $in: ids.map(ObjectId) } },
  { projection: { fullName: 1, geekScore: 1, avatarUrl: 1 } }
)
```

**CRUD:** `GET /api/client/activity-feed`, `GET /api/client/job-health`, `GET /api/users/[id]`.

---

#### `chat_messages` (ISSUE-47)

| Field | Rule |
|---|---|
| `text` | max length e.g. 5000 after trim |
| `roomId`, `senderId`, `createdAt` | existing |

**CRUD:** `POST /api/chat/messages` — validate length; `checkRateLimit(\`chat:${userId}\`)`.

No schema migration required.

---

#### `transactions` boost currency (ISSUE-42 + 2)

| Field | Rule |
|---|---|
| `grossAmount` | Must equal server boost price in **order currency** |
| `currency` | `INR` (recommended) or explicit convert |
| `purpose` / `purposeRef` | `featured_boost` / `jobId` |

**CRUD:** `POST /api/payments` (FeaturedBoostModal must send matching amount); `PATCH /api/jobs/feature` claim checks amount+currency.

**Config:** add `FEATURED_BOOST_PRICE_INR` (or convert at runtime); stop sending raw `FEATURED_BOOST_PRICE_USD` with `currency: "INR"`.

---

#### `subscriptions` FE path (ISSUE-53)

**DB:** no new fields. Status `created` means unpaid checkout in progress.

**CRUD:** FE should not call `change_plan` when status is `created`; resume Razorpay with existing `razorpaySubscriptionId`. Optional API: `POST /api/subscriptions/resume`.

---

#### `password_reset_tokens` (ISSUE-58 — new collection)

| Field | Type |
|---|---|
| `userId` | string |
| `tokenHash` | string (store hash, not raw) |
| `expiresAt` | Date (TTL index) |
| `usedAt` | ISO/null |

```js
db.password_reset_tokens.createIndex({ tokenHash: 1 }, { unique: true });
db.password_reset_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**CRUD (new):**
- `POST /api/auth/forgot` `{ email }` — always 200; if user exists insert token + email link.
- `POST /api/auth/reset` `{ token, newPassword }` — validate; `$set users.password`; mark token used; revoke `refresh_tokens`.

---

#### Self-delete (ISSUE-59)

**DB `users`:** `$set: { deleted: true, deletedAt, email: anonymized? }` (product choice); clear `refresh_tokens` for user.

**CRUD:** `DELETE /api/user` or `POST /api/user/delete` (auth required); then logout. Login/google already block `deleted` (ensure ISSUE-30 covers mid-session).

---

#### `disputes` create + split (ISSUE-60, 61)

| Field | Notes |
|---|---|
| `jobId` | required |
| `openedBy` | user id |
| `reason` / `status` | `open` on create |
| `resolutionType` | `refund_client \| pay_freelancer \| split` |
| `splitClientAmount` / `splitFreelancerAmount` | required when split; cents-safe via `money.ts` |

**Indexes:**

```js
db.disputes.createIndex(
  { jobId: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);
```

**CRUD:**
- **NEW** `POST /api/disputes` — auth; caller is `job.clientId` or `job.acceptedBy`; job in `accepted|completed|disputed`; create `open`; optionally set linked tx `escrowStatus: "disputed"`.
- `PATCH /api/disputes` (admin) — allowlist status; on `resolved` + `split`: two ledger updates or one tx with split fields; update `grossAmount` release/refund atomically.

---

### 13.2 Per-issue DB + CRUD sheets (35–61)

| Issue | DB fields / indexes | CRUD / code |
|---|---|---|
| **35** | Query `users.referralCode` as string only | `POST /api/auth` — `sanitizeString`; reject non-string |
| **36** | Unique `referrals.referredUserId`; `users.referredBy` once | Skip referral block if `roleAdded` or `referredBy` set |
| **37** | Unique `(userId, assessmentId)` on `assessment_results`; `users.geekScore` | `POST /api/assessments` — insert-first claim |
| **38** | `users.roles[]` / active role | Google login: no role param; `googleLoginUser` must not add role on login intent |
| **39** | `teams.invites` | `GET /api/teams` return pending invite; FE `action: "accept"` |
| **40** | `teams.memberIds`, `users.teamId` | **NEW** `action: "remove_member"` |
| **41** | — (session) | Store `authReady`; pages wait before `/login` redirect |
| **42** | `transactions.grossAmount`, `currency` | Payments create + Feature claim + FeaturedBoostModal |
| **43** | — projection | `GET /api/teams` member projection |
| **44** | — omit fields | `GET /api/users/[id]` |
| **45** | — scoped find | `activity-feed`, `job-health` |
| **46** | `memberIds` length vs plan seats | Accept `findOneAndUpdate` with seat predicate |
| **47** | `chat_messages.text` max | `POST /api/chat/messages` + rate limit |
| **48** | read `jobs.acceptedBy`, `planLimits` | `GET /api/freelancer/dashboard` |
| **49** | `timeLimit`; optional `assessment_attempts` | Submit rejects overtime |
| **50** | `users.avatarPublicId` | FE uses `/api/upload/sign`; disable unsigned preset |
| **51** | `jobs.type` | `POST /api/invites` reject `direct_offer`; FE filter + `getValidToken` |
| **52** | — | FE: wait for `window.Razorpay`; never mock-verify real orders |
| **53** | `subscriptions.status=created` | FE resume checkout; don’t `change_plan` |
| **54** | — | Admin + `fetchJobs` → `getValidToken` |
| **55** | — | Assessments page latch |
| **56** | — | `post-job` role redirect |
| **57** | optional `chat_rooms.unread` | Nav uses chat unread API/field |
| **58** | `password_reset_tokens` | `POST /api/auth/forgot`, `/reset` |
| **59** | `users.deleted` | `DELETE /api/user` + FE Confirm |
| **60** | `disputes` insert | `POST /api/disputes` |
| **61** | `disputes.resolutionType=split`; `transactions` | `PATCH /api/disputes` split money move |

---

### 13.3 Index script additions (append to `create-fix-indexes.mjs`)

```js
// Referrals
await db.collection("referrals").createIndex({ referredUserId: 1 }, { unique: true });
await db.collection("users").createIndex(
  { referralCode: 1 },
  { unique: true, sparse: true }
);

// Assessments
await db.collection("assessment_results").createIndex(
  { userId: 1, assessmentId: 1 },
  { unique: true }
);

// Disputes — one open per job
await db.collection("disputes").createIndex(
  { jobId: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

// Password reset
await db.collection("password_reset_tokens").createIndex({ tokenHash: 1 }, { unique: true });
await db.collection("password_reset_tokens").createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);
```

Clean duplicate `referrals` / `assessment_results` / open `disputes` **before** creating unique indexes.

---

### 13.4 Traceability (ISSUE-35–61)

| issues.md | Phase | Primary DB | Primary CRUD |
|---|---|---|---|
| 35–36 | 5 | `referrals`, `users` | `POST /api/auth` |
| 37, 49, 55 | 5 / 4 | `assessment_results`, `users` | `POST /api/assessments` (+ FE) |
| 38, 41 | 4 | `users.roles` / session | Google auth + store |
| 39–40, 46, 43 | 5 | `teams`, `users` | `GET/PATCH /api/teams` |
| 42 | 1 / 4 | `transactions` | payments + feature + modal |
| 44–45 | 5 | `users` projection | users/[id], client dashboards |
| 47 | 5 | `chat_messages` | `POST /api/chat/messages` |
| 48 | 5 | `jobs`, `bids`, `users` | `GET /api/freelancer/dashboard` |
| 50 | 5 | `users.avatarPublicId` | upload/sign + AvatarUploader |
| 51 | 4 | `jobs.type` | invites + InviteToBidModal |
| 52–54, 56–57 | 4 | — | FE / store / admin |
| 53 | 4 | `subscriptions` | checkout hook |
| 58 | 6 | `password_reset_tokens` | auth forgot/reset |
| 59 | 6 | `users.deleted` | `DELETE /api/user` |
| 60–61 | 6 | `disputes`, `transactions` | `POST/PATCH /api/disputes` |

---

*End of plan. Implement in phase order; do not ship Phase 4 UI polish before Phase 1–2 money/race fixes. Phase 5 security (referral injection, assessment race, PII) can run in parallel with Phase 4 after Phase 1.*
