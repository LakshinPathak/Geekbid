
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

- [ ] `POST /api/jobs` (§8.1) — replace the free-only `$lt: 3` block with `getPlanConfig(plan).limits.jobsPerMonth` applied to all tiers. **Also lock `platformFeePercent` onto the new Job document here** (§8.6/§17) — do this in the same change since both touch job creation.
- [ ] `POST /api/bids` (§8.2) — same pattern, `bidsPerMonth`.
- [ ] `POST /api/ai/bid-strategy` (§8.3) — remove the `=== "free"` gate, apply `aiBidStrategyPerMonth` to all tiers.
- [ ] `lib/ai-plan-limit.ts` + its 7 call sites (§8.4) — accept a `plan` param, use `aiGeneralPerMonth`, apply to all tiers.
- [ ] `POST /api/v1/jobs` (§8.5, §8.15) — API-access gate (`hasApiAccess` → 403 for free), reuse the centralized job cap, replace both hardcoded 60 req/min sites (GET line ~57, POST line ~107) with `apiRateLimit`.
- [ ] Update all "Upgrade to Pro" error strings to dynamic tier-aware messages — 6 known sites (§8.1 note): `jobs/route.ts`, `bids/route.ts`, `v1/jobs/route.ts`, `ai-plan-limit.ts`, `bid-strategy/route.ts`, `pricing/page.tsx`.

### Backend — close the 3 confirmed bypass bugs

- [ ] **`POST /api/jobs/direct-offer`** (§8.12, HIGH) — apply the same `jobsPerMonth` cap as `POST /api/jobs`. Confirmed in Pass 6: this route builds and inserts a job with zero reference to `plan`/`planLimits` anywhere in the file.
- [ ] **`PATCH /api/jobs/[id]` accept action** (§8.17, HIGH) — the `insertOne` at line 343 must atomically check-and-increment `planLimits.bidsPlacedThisMonth` before inserting, same as `POST /api/bids`. Confirmed in Pass 6 exactly as described — this is a real, currently-exploitable quota bypass.
- [ ] **`POST /api/keys`** (§8.14, HIGH) — gate on `hasApiAccess` (403 for free, confirmed today anyone can generate unlimited keys) and cap active keys at `maxApiKeys`.

### Backend — new caps on previously-uncapped resources

- [ ] `POST /api/teams` (§8.7) — `teamSeats > 0` gate for team creation, invite-time seat cap check, tier-aware error message.
- [ ] `POST /api/invites` (§8.13) — add `invitesPerMonth` cap, track in `planLimits.invitesSentThisMonth`.
- [ ] `PATCH /api/jobs/feature` (§8.8) — check `featuredBoostsPerMonth`, atomic increment, hand off to Phase 3 pay-per-boost when exhausted.
- [ ] `GET /api/freelancer/dashboard` (§8.9) — replace the hardcoded ternary at line 46 with `getPlanConfig(plan).limits.bidsPerMonth`.
- [ ] `PATCH /api/admin/users/[id]/plan` (§8.11, new route) — admin manual plan override, writes `plan_change_log`.
- [ ] `admin/config` per-tier fee split (§8.16) — restructure `api/admin/config/route.ts` (currently a single flat `platformFeePercent: 10` at line 22) into per-tier storage; `getPlanConfig()` checks admin DB overrides first (this is where `getPlanConfigWithOverrides()` from §7 gets wired in).

### Frontend

- [ ] `pricing/page.tsx` (§9.1) — rename tiers, update prices, leave checkout wiring for Phase 4 (buttons can stay disabled with correct copy until then).
- [ ] `FreelancerFeed.tsx:154` (§9.2) — replace the exact hardcoded ternary (`plan === "pro" ? 50 : plan === "enterprise" ? 200 : 10`, confirmed unchanged in Pass 6) with `getPlanConfig(...).limits.bidsPerMonth`.
- [ ] `AIBidStrategist.tsx` (§9.3) — extend the Phase 0 toast fix to be tier-aware for all tiers, not just free.
- [ ] Badges (§9.4) — add the **new** Premium/Enterprise badge visual (confirmed in Pass 6 this doesn't exist yet — it's not a rename, it's new UI) alongside the already-renamed `"plus"` check from Phase 1.
- [ ] `store.tsx` (§9.5) — add `getUserPlanConfig()` helper, expose remaining quota counts. Remember: this is **React Context + `useState`**, not Zustand (Pass 6 correction) — build accordingly.
- [ ] New `PlanLimitBanner.tsx` (§9.6) — reusable 80%+-used banner, wire into job posting, bid placement, AI features.
- [ ] `settings/page.tsx` (§9.7) — gate on `hasApiAccess`; show upgrade CTA instead of key-management UI for free users.
- [ ] `admin/config/page.tsx` (§9.8) — replace the single fee slider with 3 per-tier inputs; warn if any fee is outside 3–15%.

**Exit criteria:** Every route in the blueprint's file list enforces its tier's actual cap (verifiable by hitting each endpoint as a free/plus/premium seeded user up to and past the limit). The 3 bypass bugs are closed and covered by a manual test each. Pricing page shows correct numbers. No route still reads a hardcoded `3`/`10`/`5`/`2`/`60` limit — grep for these to confirm before moving on.

---

## Phase 3 — Featured Boost Monetization

**Goal:** Smallest, most isolated monetization surface — ship independently of the Phase 4 subscription-billing project.

**Depends on:** Phase 1 (`plans.ts` for included-boost counts).

- [ ] Pay-per-boost UI button on job listings (client-facing), reusing the existing one-off Razorpay payment flow (`api/payments/route.ts`) rather than building new payment infra.
- [ ] Wire the button to `PATCH /api/jobs/feature` (already enforces `featuredBoostsPerMonth` from Phase 2) with a fallback to one-off payment when the monthly included boosts are exhausted.

**Exit criteria:** A free-tier client can pay once to feature a job; a Plus/Premium client sees their included-boost count and can pay-per-boost once it's exhausted.

---

## Phase 4 — Real Recurring Subscription Billing

> ⚠️ **This phase moves real money on a recurring basis. Do not start without explicit confirmation of scope** (Razorpay Plans need to exist in the Razorpay dashboard first, proration policy needs to be final, and email/legal copy for India/EU receipts needs sign-off). Treat this as its own project, not a continuation to blitz through.

**Depends on:** Phase 2 (plan enforcement must already be live and correct before real billing switches people's tiers automatically).

### 4.1 — Schema + config

- [ ] Create `subscriptions`, `webhook_events`, `quota_audit_log` collections + indexes (blueprint §6.2, §6.4, §6.5, §10.3). **Note:** `subscriptions.userId` index is intentionally **non-unique** (preserves cancel/resubscribe history) — don't "fix" this to unique.
- [ ] Create Razorpay Plans in the dashboard (`plus_monthly`, `premium_monthly`) matching `plans.ts` pricing.
- [ ] Add `pendingPlanChange` field to `subscriptions` (§14.2).

### 4.2 — Subscription lifecycle routes

- [ ] `POST /api/subscriptions` — create + checkout.
- [ ] `GET /api/subscriptions` — current status.
- [ ] `PATCH /api/subscriptions` — cancel + plan change with proration (§21 — start with `schedule_change_at: "cycle_end"`, immediate `"now"` proration deferred to Phase 5).

### 4.3 — Webhook handling (§13, §14)

- [ ] `POST /api/webhooks/razorpay` — raw-body HMAC signature verification (fail closed on missing/invalid signature), idempotent `findOneAndUpdate` upsert against `webhook_events` before processing (§13.1).
- [ ] `processWebhookEvent()` router + all handler functions for the 12 state transitions in §14.1 (`handleActivated`, `handleCharged`, `handleHalted`, `handleCancelled`, `handlePaymentFailed`, `handlePaymentCaptured`).
- [ ] Tie quota resets to `subscription.charged`, not calendar month, for paying users (§15). Free users keep the existing lazy calendar-month reset.
- [ ] `web/src/app/api/cron/retry-webhooks/route.ts` (§13.2) — retries `status: 'failed'` events with `retryCount < 5` every 15 min.

### 4.4 — Downgrade + consistency

- [ ] `web/src/lib/plan-downgrade.ts` → `handleDowngrade()` (§16) — revokes excess API keys (LIFO), freezes/flags teams over the new seat limit, logs to `plan_change_log`, sends notification email.
- [ ] Team over-limit flow (§23) — `status: 'over_limit'`, 7-day owner deadline, LIFO auto-removal if the deadline passes, `TeamSettings.tsx` warning banner.
- [ ] Concurrent session sync (§18, Pass 6 corrected) — `X-User-Plan` response header + **Context-based** (not Zustand) refresh logic inside `store.tsx`'s `apiRequest`.

### 4.5 — Distributed rate limiting (§19)

- [ ] `web/src/lib/rate-limit.ts` — MongoDB-based, replaces the in-memory `Map` in `sanitize.ts` that doesn't share state across instances.

### 4.6 — Billing emails (§20)

- [ ] `web/src/lib/billing-emails.ts` + 9 templates under `web/src/email-templates/billing/`. Reuse existing email infra rather than building a new sender.

### 4.7 — Reconciliation (§22)

- [ ] `web/src/app/api/cron/reconcile-subscriptions/route.ts` — daily drift-correction against Razorpay's actual subscription state, plus expired-grace-period sweep.
- [ ] Add both cron schedules to `vercel.json` (`reconcile-subscriptions` daily 3am UTC, `retry-webhooks` every 15 min).

### 4.8 — Wire the frontend

- [ ] `pricing/page.tsx` — connect Upgrade/Contact Sales buttons to real checkout (resolves the Open Decision D above — self-serve for both tiers per default assumption).

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
