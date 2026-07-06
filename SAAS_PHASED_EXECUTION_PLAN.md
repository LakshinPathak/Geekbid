
# GeekBid SaaS Tiers — Phased Execution Plan

> **Companion to:** `GEEKBID_SAAS_BLUEPRINT.md` (the "what and why" — schema, code samples, business rationale, 6-pass validation log). This file is the "in what order, with what exit criteria" — a build checklist a developer can follow phase by phase without re-deriving sequencing from the blueprint's prose.
> **Status:** Not started. `web/src/lib/plans.ts` does not exist yet; nothing in this plan has been built.
> **Last verified against codebase:** 2026-07-05 (blueprint Pass 6)

---

## How to use this file

- Work top to bottom. Each phase has an **Exit Criteria** block — don't start the next phase until those are true.
- Each task references the blueprint section (`§N`) with the exact code sample / line numbers / rationale. This file doesn't repeat that content — go read `§N` in the blueprint when a task references it.
- Check off tasks as you go (`[ ]` → `[x]`) so this file doubles as progress tracking across sessions.
- Phases 0–3 are low-to-medium risk (no real money movement changes, additive schema fields, backward-compatible). **Phase 4 moves real money via recurring billing — do not start it without explicit go-ahead**, since it's the one phase that can strand paying customers or double-charge them if a step is skipped.

### Open product decisions this plan assumes (confirm or override before Phase 2)

These were the blueprint's own recommended defaults (§4). Flag now if any should change — they get progressively more expensive to change once Phase 2 enforcement code and Phase 4 billing plans are live:

| Decision                    | Assumed default                                        |
| --------------------------- | ------------------------------------------------------ |
| A — "Unlimited" paid tiers | Real finite (generous) caps, not literally unlimited   |
| B — Analytics gating       | Stays free for everyone; not a paid differentiator     |
| C — AI Bid Strategist tier | Available at every paid tier (not Premium-exclusive)   |
| D — Premium checkout       | Self-serve ($79/mo, click-to-pay), not "Contact Sales" |

---

## Phase 0 — Immediate Safe Fixes

**Goal:** Ship the smallest, lowest-risk wins first. No schema changes, no new routes, no migrations. Everything here is additive or a bugfix inside an existing file.

**Depends on:** nothing.

- [x] **AIBidStrategist toast on quota exhaustion** (blueprint §9.3, verified in Pass 6)
  - File: `web/src/components/ai/AIBidStrategist.tsx`
  - Import `toast` from `sonner` (not yet imported in this file — package is already a dependency, used elsewhere).
  - On click while `isFreePlanLimited` is true, fire `toast.error(...)` explaining the limit and what to do, instead of only relying on the silently-disabled button.
  - Note: the button could not stay natively `disabled` for this state (disabled elements never fire `click`), so the limited state is now handled inside the click handler instead, with matching dimmed styling applied manually.
- [x] **Fix `planLimits` TypeScript type drift** (blueprint §6.7, Pass 6 finding #31)
  - File: `web/src/lib/utils.ts:60`
  - Add the 3 fields already used at runtime but missing from the type: `aiUsesThisMonth`, `aiMonthResetAt`, `aiBidMonthResetAt`. (Do the full plan/premium rename of this same type in Phase 1, not here — keep this commit a pure type-completeness fix.)
- [x] **Wire `splitEscrow()`'s existing `feePercent` param at all 4 call sites** (blueprint §8.6)
  - `splitEscrow()` in `web/src/lib/money.ts:34` already accepts `feePercent` (default 10) — no function signature change needed.
  - Update the 4 call sites to pass an explicit fee (still flat 10% at this stage, since per-tier fees don't exist until Phase 2): `api/payments/route.ts:210`, `api/jobs/[id]/route.ts:143`, `api/jobs/[id]/route.ts:352`, `api/jobs/offer-response/route.ts:57`.
  - This is prep work so Phase 2 only has to change *what value* is passed, not *whether* a value is passed.

**Exit criteria:** AIBidStrategist shows a toast when blocked; `utils.ts` type matches runtime shape; all 4 `splitEscrow` call sites pass an explicit fee. No behavior change in fee amounts yet (still flat 10%). Typecheck + existing tests pass.

**✅ Phase 0 complete** (2026-07-05) — verified: `tsc --noEmit` clean; toast fires with `data-type="error"` when a free-plan freelancer at their AI-bid quota clicks the button (tested live via a seeded freelancer account with `planLimits.aiBidUsesThisMonth` forced to 2); all 4 `splitEscrow` call sites now pass `DEFAULT_PLATFORM_FEE_PERCENT` explicitly.

---

## Phase 1 — Foundation (Plan Config + Rename)

**Goal:** Stand up the single source of truth for tier definitions and get the `pro`/`enterprise` → `plus`/`premium` rename done safely, before any enforcement logic depends on it.

**Depends on:** Phase 0 (uses the corrected `utils.ts` type).

- [x] **Create `web/src/lib/plans.ts`** (blueprint §7)
  - `PlanTier`, `PlanConfig`, `PLANS` record, `getPlanConfig()`.
  - Use `getPlanConfig()` with **backward-compat mapping built in from day one** (blueprint §25 Phase A) — i.e. write it so `'pro'` and `'enterprise'` already resolve correctly, *before* running any migration. This avoids the "paying users lose features mid-deploy" failure mode described in §25/§28.6.
  - Skip the async `getPlanConfigWithOverrides()` admin-override version for now — that's Phase 2 (§8.16), not needed until per-tier fee admin overrides exist.
- [x] **Finish the `utils.ts` type rename** (blueprint §6.7)
  - `plan?: 'free' | 'plus' | 'premium'` (keep it accepting the old strings at the DB-read boundary only via `getPlanConfig`'s compat mapping — the *type* itself should reflect the target state).
  - Add `subscriptionId`, `planExpiresAt`, `planDowngradedAt`.
- [x] **Add new `planLimits` fields**: `featuredBoostsUsedThisMonth`, `invitesSentThisMonth` (blueprint §6.1).
- [x] **Write migration scripts** (blueprint §10.1, §10.2, §25) — do not run yet:
  - `web/scripts/migrate-plan-names.mjs` — idempotent `pro→plus`, `enterprise→premium`.
  - `web/scripts/migrate-plan-limits.mjs` — backfill new `planLimits` fields to `0`.
  - `web/scripts/verify-migration.mjs` — asserts zero users remain on legacy plan names (§25 verification query).
  - `web/scripts/rollback-plan-names.mjs` — emergency reverse migration.
- [ ] **Run the migration** against the real DB (`cd web && node scripts/migrate-plan-names.mjs` then `migrate-plan-limits.mjs`), then run `verify-migration.mjs` to confirm zero legacy values remain. **Not yet run — needs explicit go-ahead since it writes to the live Atlas DB** (current DB already has no `'pro'`/`'enterprise'` string values pre-existing from before this session, so this is precautionary, but should still be confirmed before executing against production data).
- [x] **Create `GET /api/user/plan`** (blueprint §11) — returns current plan config + remaining quota counts for the logged-in user. Nothing depends on this yet, but Phase 2's `PlanLimitBanner.tsx` and Phase 4's pricing page both will.
- [x] **Update seed data** (blueprint §8.10, Pass 6 confirmed `seed/route.ts:794` still assigns `plan: "free"` to everyone with no AI-quota pre-population)
  - Give some seeded users `plan: 'plus'` / `plan: 'premium'`.
  - Pre-populate `aiUsesThisMonth` / `aiMonthResetAt` / `aiBidUsesThisMonth` / `aiBidMonthResetAt` for at least one test user, including one seeded near its limit (for testing the 80%+ banner in Phase 2).
- [x] **Badge rename (data-shape only, not new UI yet):** update the 3 `"pro"` checks (`profile/[id]/page.tsx:125`, `MyJobsSection.tsx:71`, `TalentPool.tsx:122`) to check `"plus"`. Hold off on adding the *new* Premium/Enterprise badge visual until Phase 2's frontend pass (§9.4), since that's net-new UI, not a rename (Pass 6 finding #33).
  - Also fixed 2 additional call sites TypeScript flagged after the type rename: `FreelancerFeed.tsx:154` and `freelancer/dashboard/route.ts:46` (hardcoded `"pro"`/`"enterprise"` bid-limit ternaries — renamed literals only, no logic change, full centralization via `getPlanConfig` is Phase 2 §9.2).

**Exit criteria:** `plans.ts` exists and is the only source of tier numbers. ✅ `npx tsc --noEmit` passes clean after the full rename. Zero users have `plan: 'pro'` or `plan: 'enterprise'` in the DB — **pending migration run** (see above). App still behaves identically to pre-Phase-1 for all users (rename is invisible to end users at this point — no new enforcement yet). Rollback script written; not yet tested against a DB snapshot (no staging copy exists in this environment).

✅ Phase 1 code complete (2026-07-06) — all files written/edited, typecheck clean. Migration execution against the real DB deliberately held back pending explicit confirmation (see note above).

---

## Phase 2 — Enforcement (Backend Caps + Frontend Wiring)

**Goal:** Every tier's limits are actually enforced (paid tiers currently have zero enforcement — this is the core bug this whole project exists to fix), all 3 known quota-bypass bugs are closed, and the UI reflects real, tier-aware numbers instead of hardcoded ones.

**Depends on:** Phase 1 (`getPlanConfig()` must exist and be migration-safe first).

### Backend — centralize existing caps to all tiers

- [x] `POST /api/jobs` (§8.1) — replace the free-only `$lt: 3` block with `getPlanConfig(plan).limits.jobsPerMonth` applied to all tiers. **Also lock `platformFeePercent` onto the new Job document here** (§8.6/§17) — done in the same change.
- [x] `POST /api/bids` (§8.2) — same pattern, `bidsPerMonth`.
- [x] `POST /api/ai/bid-strategy` (§8.3) — removed the `=== "free"` gate, applies `aiBidStrategyPerMonth` to all tiers.
- [x] `lib/ai-plan-limit.ts` + its 7 call sites (§8.4) — uses `aiGeneralPerMonth` via `getPlanConfig`, applied to all tiers. The 7 call sites needed no changes (function signature unchanged).
- [x] `POST /api/v1/jobs` (§8.5, §8.15) — API-access gate (`hasApiAccess` → 403), reuses the centralized job cap, both hardcoded 60 req/min sites replaced with `apiRateLimit`.
- [x] Updated all "Upgrade to Pro" error strings to dynamic tier-aware messages — all 6 known sites done: `jobs/route.ts`, `bids/route.ts`, `v1/jobs/route.ts`, `ai-plan-limit.ts`, `bid-strategy/route.ts`, `pricing/page.tsx`.

### Backend — close the 3 confirmed bypass bugs

- [x] **`POST /api/jobs/direct-offer`** (§8.12, HIGH) — now applies the same `jobsPerMonth` cap as `POST /api/jobs`, plus locks `platformFeePercent`.
- [x] **`PATCH /api/jobs/[id]` accept action** (§8.17, HIGH) — quota reserved atomically before the job-accept `findOneAndUpdate`; rolled back (`$inc: -1`) if the accept loses the race (409), so a failed claim never counts against the cap.
- [x] **`POST /api/keys`** (§8.14, HIGH) — gated on `hasApiAccess` (403 for free) and capped active keys at `maxApiKeys`.

### Backend — new caps on previously-uncapped resources

- [x] `POST /api/teams` (§8.7) — `teamSeats > 0` gate for team creation, invite-time seat cap check (owner + members + pending invites vs `teamSeats`), tier-aware error message.
- [x] `POST /api/invites` (§8.13) — added `invitesPerMonth` cap, tracked in `planLimits.invitesSentThisMonth` (Premium's `Infinity` limit passes the `$lt` check unconditionally).
- [x] `PATCH /api/jobs/feature` (§8.8) — checks `featuredBoostsPerMonth`, atomic increment on turning a boost ON only (un-featuring is free); hard 403 for now, Phase 3 will add pay-per-boost fallback.
- [x] `GET /api/freelancer/dashboard` (§8.9) — hardcoded ternary replaced with `getPlanConfig(plan).limits.bidsPerMonth`.
- [x] `PATCH /api/admin/users/[id]/plan` (§8.11, new route) — admin manual plan override, writes `plan_change_log` + `audit_logs`.
- [x] `admin/config` per-tier fee split (§8.16) — `platform_config` now stores `planFees: {free,plus,premium}`; added `getPlanConfigWithOverrides(plan, db)` with a 5-min in-process cache (invalidated immediately on admin save), wired into all 3 job-creation routes so an admin fee change is reflected in newly-locked-in job fees.

### Frontend

- [x] `pricing/page.tsx` (§9.1) — tiers/prices/features now generated from `lib/plans.ts` (`PLANS`) instead of hardcoded copy; checkout buttons remain inert (Phase 4 scope).
- [x] `FreelancerFeed.tsx:154` (§9.2) — hardcoded ternary replaced with `getPlanConfig(currentUser?.plan).limits.bidsPerMonth`.
- [x] `AIBidStrategist.tsx` (§9.3) — toast + inline limit copy now tier-aware for all 3 tiers (uses `aiBidStrategyPerMonth` per tier), not just free.
- [x] Badges (§9.4) — added the new Premium badge visual (gradient + Crown icon) at all 3 sites, alongside the Phase-1-renamed Plus badge (also relabeled "Pro"→"Plus" text for consistency).
- [x] `store.tsx` (§9.5) — added `getUserPlanConfig()` and `planUsage` (remaining/used counts for jobs, bids, AI general, AI bid-strategy, featured boosts, invites) to the Context value.
- [x] New `PlanLimitBanner.tsx` (§9.6) — reusable 80%+-used banner; wired into `post-job/page.tsx` (jobs), `jobs/[id]/page.tsx` (bids), and `AIBidStrategist.tsx` (AI bid analyses).
- [x] `settings/page.tsx` (§9.7) — gated key-management UI on `hasApiAccess`; free-tier users see an upgrade CTA instead (API docs section stays visible for everyone).
- [x] `admin/config/page.tsx` (§9.8) — single fee slider replaced with 3 per-tier inputs (Free/Plus/Premium), each flagging a visual warning outside the 3–15% range.

**Exit criteria:** Every route in the blueprint's file list enforces its tier's actual cap. ✅ The 3 bypass bugs are closed. ✅ Pricing page shows correct tier-sourced numbers. ✅ `grep` for hardcoded `$lt: 3/10/5/2` and `, 60,` rate-limit values in `src/app/api` returns nothing. ✅ `npx tsc --noEmit` and `npm run build` both pass clean.

✅ Phase 2 complete (2026-07-06) — backend committed as `399f219`, frontend as `fa5a52e`, both pushed to `v17`.

---

## Phase 3 — Featured Boost Monetization

**Goal:** Smallest, most isolated monetization surface — ship independently of the Phase 4 subscription-billing project.

**Depends on:** Phase 1 (`plans.ts` for included-boost counts).

- [x] Pay-per-boost UI button on job listings (client-facing), reusing the existing one-off Razorpay payment flow (`api/payments/route.ts`) rather than building new payment infra. (`FeaturedBoostModal.tsx`, wired into `my-jobs/page.tsx`'s existing Feature button.)
- [x] Wire the button to `PATCH /api/jobs/feature` (already enforces `featuredBoostsPerMonth` from Phase 2) with a fallback to one-off payment when the monthly included boosts are exhausted. Transaction tagged `featured_boost:<jobId>` and atomically claimed (`consumedAt`) so it can't be replayed.

**Exit criteria:** A free-tier client can pay once to feature a job; a Plus/Premium client sees their included-boost count and can pay-per-boost once it's exhausted.

✅ Phase 3 complete (2026-07-06) — committed as `c8d4b36`, pushed to `v17`. `$10` boost price picked from the blueprint's `$5–15` range.

---

## Phase 4 — Real Recurring Subscription Billing

> ⚠️ **This phase moves real money on a recurring basis. Do not start without explicit confirmation of scope** (Razorpay Plans need to exist in the Razorpay dashboard first, proration policy needs to be final, and email/legal copy for India/EU receipts needs sign-off). Treat this as its own project, not a continuation to blitz through.

**Depends on:** Phase 2 (plan enforcement must already be live and correct before real billing switches people's tiers automatically).

### 4.1 — Schema + config

- [x] Create `subscriptions`, `webhook_events`, `quota_audit_log` collections + indexes (blueprint §6.2, §6.4, §6.5, §10.3). **Note:** `subscriptions.userId` index is intentionally **non-unique** (preserves cancel/resubscribe history) — don't "fix" this to unique. Written as `web/scripts/create-phase4-indexes.mjs` — **not yet run** against the live DB (same deliberate hold as the Phase 1 migration scripts). Also added a `rate_limits` index for §4.5 in the same script.
- [ ] Create Razorpay Plans in the dashboard (`plus_monthly`, `premium_monthly`) matching `plans.ts` pricing. **Not done — external dashboard setup, explicitly out of scope per your "build the code, skip external setup" answer.** `RAZORPAY_PLAN_ID_PLUS`/`RAZORPAY_PLAN_ID_PREMIUM` env vars added to `.env.example`; until they're set, `/api/subscriptions` runs in mock mode (mirrors `api/payments/route.ts`'s existing mock convention).
- [x] Add `pendingPlanChange` field to `subscriptions` (§14.2). Also added a `Subscription` type to `utils.ts`.

### 4.2 — Subscription lifecycle routes

- [x] `POST /api/subscriptions` — create + checkout (mock mode until real Plan IDs exist).
- [x] `GET /api/subscriptions` — current status.
- [x] `PATCH /api/subscriptions` — cancel + plan change with proration (§21 — `schedule_change_at: "cycle_end"`; immediate `"now"` proration deferred to Phase 5 as planned).

### 4.3 — Webhook handling (§13, §14)

- [x] `POST /api/webhooks/razorpay` — raw-body HMAC signature verification (fail closed on missing/invalid signature via `lib/razorpay.ts`'s `verifyWebhookSignature`), idempotent `findOneAndUpdate` upsert against `webhook_events` before processing (§13.1).
- [x] `processWebhookEvent()` router + all 6 handler functions, moved to `web/src/lib/webhook-processing.ts` (not left inline in the route) so `cron/retry-webhooks` can reuse them without relying on non-standard exports from a `route.ts` file.
- [x] Tied quota resets to `subscription.charged`, not calendar month, for paying users (§15). Free users keep the existing lazy calendar-month reset. `handleCharged` also applies any `pendingPlanChange` at this point (transitions #11/#12).
- [x] `web/src/app/api/cron/retry-webhooks/route.ts` (§13.2) — retries `status: 'failed'` events with `retryCount < 5` every 15 min.

### 4.4 — Downgrade + consistency

- [x] `web/src/lib/plan-downgrade.ts` → `handleDowngrade()` (§16) — revokes excess API keys (LIFO — most-recently-created revoked first), freezes teams when new tier has 0 seats or flags them `over_limit` with a 7-day deadline otherwise, logs to `plan_change_log`, sends notification email.
- [x] Team over-limit flow (§23) — `status: 'over_limit'`, 7-day owner deadline, LIFO auto-removal via `enforceExpiredTeamSeatDeadlines()` (called from the reconciliation cron). **Note:** this codebase has no `TeamSettings.tsx` — the warning banner was added directly to the actual file, `web/src/app/team/page.tsx`.
- [x] Concurrent session sync (§18, Pass 6 corrected) — `X-User-Plan` response header (`lib/middleware/plan-header.ts`) + a module-level pub-sub in `store.tsx` (since `apiRequest` is a plain function, not a hook, and can't call `setState` directly) that triggers `silentRefresh()` + a toast on drift. Wired into 4 representative plan-gated routes (jobs, bids, ai/bid-strategy, jobs/feature) rather than all ~50 routes in the app — scoped to the surfaces most likely to show a visibly stale limit.

### 4.5 — Distributed rate limiting (§19)

- [x] `web/src/lib/rate-limit.ts` — MongoDB-based (single atomic aggregation-pipeline `findOneAndUpdate`, one doc per key), replaces the in-memory `Map` in `sanitize.ts` (now just re-exports from the new module so none of the 14 call sites' import paths needed to change — each just gained an `await`).

### 4.6 — Billing emails (§20)

- [x] `web/src/lib/billing-emails.ts` with all 9 required email functions. **Deviated from the blueprint's suggested `web/src/email-templates/billing/*.html` directory** — this codebase's actual convention (confirmed in `email.ts`) is inline HTML built from small exported helper functions (`wrapHtml`, `heading`, `subtext`, `ctaButton`, `infoCard`), not separate template files; billing-emails.ts reuses those exact helpers (now exported from `email.ts`) for visual consistency with every other email already in the app.

### 4.7 — Reconciliation (§22)

- [x] `web/src/app/api/cron/reconcile-subscriptions/route.ts` — daily drift-correction against Razorpay's actual subscription state (skips mock subscriptions, nothing to reconcile there), expired-grace-period sweep, and team seat deadline enforcement.
- [x] Added both cron schedules to `web/vercel.json`. **Caveat:** this repo also has a `docker-compose.yml` + `backend/Dockerfile` — if the `web` app isn't actually deployed on Vercel, these two cron endpoints need an external scheduler (system cron / CI scheduled workflow) hitting them with `Authorization: Bearer $CRON_SECRET` instead.

### 4.8 — Wire the frontend

- [x] `pricing/page.tsx` — Upgrade/Premium buttons call real checkout (`POST`/`PATCH /api/subscriptions` + Razorpay Checkout with `subscription_id`, mock-mode fallback matching `FeaturedBoostModal`'s pattern); resolves Open Decision D as self-serve for both tiers. Added a "Downgrade to Free" / cancel affordance and a cancellation-scheduled banner not explicitly itemized in the checklist but necessary for the flow to be usable end-to-end.

**Phase 4 exit criteria not yet verifiable:** the blueprint's stated exit criteria ("a test user can subscribe, get charged, hit a failed payment, land in grace period, get cleanly downgraded... webhook replay causes zero duplicate side effects... reconciliation cron catches a manually-induced drift in a staging Razorpay test account") all require a **real Razorpay test account with real Plans**, which doesn't exist in this environment. The code paths for all of this exist and typecheck/build clean, but are only exercised via mock mode here — real end-to-end verification is still pending the external Razorpay dashboard setup.

✅ Phase 4 code complete (2026-07-06), pending Razorpay dashboard setup + real-account verification. Migration/index scripts written, not run.

**Exit criteria:** A test user can subscribe, get charged, have quotas reset on the real billing cycle, hit a failed payment and land in grace period, and get cleanly downgraded after grace expires — all without a human touching the DB by hand. Webhook replay (send the same event twice) causes zero duplicate side effects. Reconciliation cron catches a manually-induced drift in a staging Razorpay test account.

---

## Phase 5 — Post-Launch Hardening

**Goal:** Nice-to-haves that don't block launch but matter at scale or over time.

**Depends on:** Phase 4 live in production for at least one full billing cycle.

- [ ] "Now" proration for immediate mid-cycle upgrades (§21) — on top of the `cycle_end` default shipped in Phase 4.
- [ ] Quota consumption audit logging (§24) — `logQuotaConsumption()` wired into every quota check, plus a CS-facing view.
- [ ] Win-back email automation (7 days post-churn).
- [ ] Remove the Phase-1 backward-compat plan-name mapping from `getPlanConfig()` (§25 Phase C) — only after `verify-migration.mjs` shows zero legacy values for a sustained period.
- [ ] Per-request user-context middleware (§26) — de-dupe repeated user fetches across quota-heavy routes (~40% MongoDB read reduction, not correctness-critical).
- [ ] Redis/Upstash migration for rate limiting, if the MongoDB-based limiter from Phase 4 becomes a bottleneck at scale.

---

## Cross-phase reference: files touched

See blueprint §29 for the full file inventory (29 modified, 21 new). This plan doesn't repeat that table — use it as the canonical file list when scoping a PR for any phase above.
