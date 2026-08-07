# GeekBid Web — Full Codebase Code Review

**Date:** 2026-07-24
**Scope:** `web/` (Next.js App Router, TypeScript, MongoDB, Razorpay, Cloudinary, Gemini AI)
**Method:** 6 parallel scoped reviews (read-only) covering the entire `src/` tree — auth/security core, payments/billing, core business API, AI/chat/dashboards/admin API, frontend pages, and shared components/UI.

---

## Executive summary

~211 files / ~33k lines reviewed. No remote-code-execution or full-auth-bypass issues were found — the codebase has clearly been through prior hardening passes (rate limiting, NoSQL sanitization, webhook signature verification, and atomic claim patterns are applied consistently in most places). The issues found here are mostly **narrower gaps that survived those passes**: a few real IDOR/injection primitives in specific routes, a critical "migration scripts write to the wrong database" bug, a subscription-resurrection race condition, and a stale-avatar/state-leak class of frontend bugs.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 9 |
| Medium | 15 |
| Low | ~20 |

### Top issues to fix first

1. **[Critical]** Five migration/index scripts (`scripts/migrate-plan-limits.mjs`, `migrate-plan-names.mjs`, `rollback-plan-names.mjs`, `verify-migration.mjs`, `create-phase4-indexes.mjs`) call `client.db()` instead of `client.db("geekbid")` — they silently operate on the wrong database. Production may be missing indexes these scripts were supposed to create.
2. **[Critical]** `webhook-processing.ts` `handleCharged`/`handlePaymentFailed` don't check subscription status before transitioning it, unlike the sibling handlers — a stale, retried webhook event can resurrect a cancelled subscription back to paid/active.
3. **[High]** `POST /api/upload/sign` — omitting `folder` bypasses both the folder allowlist and the avatar `public_id` scoping, letting any authenticated user get a signed Cloudinary request to overwrite another user's avatar.
4. **[High]** `POST /api/bids` and the shared `idFilter()` helper (`src/lib/mongo-id.ts`) fall back to using a raw, attacker-controlled value as a MongoDB filter when it isn't a valid ObjectId — a genuine NoSQL query-injection primitive reachable from `/api/bids` and `/api/invites`.
5. **[High]** `src/app/api/milestones/route.ts` looks up the escrow transaction to release without filtering on `purpose: "job_escrow"`, and marks `escrowReleased: true` even when no matching transaction is found — money can silently fail to move while the milestone reports as paid.
6. **[High]** `src/lib/store.tsx` `logout()` doesn't clear `milestones`, `referralStats`, `watchedJobIds`, `invites` — a subsequent user on a shared/unreloaded tab can briefly see the previous user's financial/referral data.

---

## 1. Auth, authorization & security infrastructure

*Scope: `src/lib/auth.ts`, `oauth-state.ts`, `rate-limit.ts`, `sanitize.ts`, `src/lib/middleware/**`, `src/app/api/auth/**`, `src/app/api/keys/**`, `src/app/api/admin/verify-key/**`, `src/app/api/upload/sign|delete/**`, `next.config.ts`, `vercel.json`.*

### High

- **`src/app/api/upload/sign/route.ts:23-33`** — The folder allowlist check and the avatar `public_id` override are both gated on `paramsToSign.folder` being truthy. Omitting `folder` entirely bypasses both, so the endpoint will sign **any** `paramsToSign` object — including an arbitrary `public_id` — for any authenticated user.
  **Failure scenario:** A logged-in user calls `POST /api/upload/sign` directly with `{"paramsToSign": {"public_id": "geekbid/avatars/<victim_user_id>", "timestamp": <now>}}` (no `folder`). The server signs it. The attacker posts the signed payload straight to Cloudinary's own API (cloud name/API key are intentionally public). Cloudinary overwrites the existing asset at that `public_id`, replacing another user's avatar. Victim IDs are trivially obtainable via `GET /api/users/[id]`.
  **Fix:** Require `folder` to always be present and always re-validate against `ALLOWED_FOLDERS`; never let `public_id` be client-controlled for any restricted folder, not just avatars.

### Medium

- **`src/app/api/upload/sign/route.ts:23-37`** — Even with a correct `folder` of `geekbid/portfolio`/`geekbid/jobs`, `public_id` is never scoped to the caller (unlike avatars). Any authenticated user who can see/guess another user's portfolio/job image `public_id` can get a valid signature to overwrite it.
  **Fix:** Scope `public_id` server-side for every restricted folder (e.g., prefix with the caller's `userId`).

- **`src/app/api/auth/switch-role/route.ts:50`** — Calls `createTokenPair` without reusing the caller's existing `sessionId` (unlike `refreshAccessToken`), so every role switch mints a new session slot and never revokes the pre-switch refresh token.
  **Failure scenario:** The old refresh token remains valid for up to 7 days and can keep minting access tokens carrying the *pre-switch* role.
  **Fix:** Revoke the prior session before issuing the new one, or thread the existing `sessionId` through.

### Low

- `src/lib/auth.ts:10-11` — `REFRESH_SECRET` is `NEXTAUTH_SECRET + "-refresh"` (string concatenation) rather than an independent secret or HKDF-derived key.
- `next.config.ts:17-29` — Security headers are set (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) but there's no CSP and no HSTS.
- `src/lib/auth.ts:171-184` — Suspended/deleted-user check fails open on any DB error; only logged via `console.error`, no alerting.
- `src/app/api/keys/route.ts:50-52` — `POST /api/keys` only checks `if (!name)`, not that it's a string; a non-string truthy value can throw on `.trim()`.
- `src/app/api/keys/route.ts` — No rate limit on API key generation (unlike nearly every other sensitive endpoint in this scope).
- No `middleware.ts` centralizing auth — every route re-implements `authenticateRequest`. Works today, but no structural backstop if a future route forgets it.

### Verified sound (no issues found)
NoSQL-injection defenses (`sanitizeString`/`sanitizeQuery`/`sanitizeObjectId`) are applied consistently across auth routes. `rate-limit.ts` is a correctly atomic, TTL-indexed limiter. Refresh-token rotation + theft detection, suspend/delete enforcement, Google OAuth CSRF-state, and the one-time OAuth exchange-code handoff are all well-constructed.

---

## 2. Payments, billing & subscriptions

*Scope: `src/lib/razorpay.ts`, `money.ts`, `plans.ts`, `pricing.ts`, `plan-downgrade.ts`, `ai-plan-limit.ts`, `webhook-processing.ts`, `billing-emails.ts`, `useSubscriptionCheckout.ts`, `reset-plan-limits.ts`, `src/app/api/payments|webhooks/razorpay|subscriptions|cron|user/plan/**`, `scripts/*.mjs`.*

### Critical

- **`scripts/migrate-plan-limits.mjs:43`, `migrate-plan-names.mjs:42`, `rollback-plan-names.mjs:42`, `verify-migration.mjs:43`, `create-phase4-indexes.mjs:44`** — call bare `client.db()` instead of `client.db("geekbid")` (the app's real connection, `src/lib/mongodb.ts:18`, hardcodes `"geekbid"`; the connection string has no DB path segment). `create-fix-indexes.mjs`'s own comments document this exact bug already being fixed there — the fix was never propagated to its five siblings.
  **Impact:** Running these against prod silently no-ops or (for `verify-migration.mjs`) reports false "PASS". `create-phase4-indexes.mjs` is what's supposed to create the `webhook_events.eventId` unique index and the `subscriptions` partial-unique index the webhook route's race-prevention logic depends on — production may be missing them.
  **Fix:** Change all five to `client.db("geekbid")`; re-run and verify indexes actually exist in the real DB.

- **`src/lib/webhook-processing.ts:38-107` (`handleCharged`) and `:109-124` (`handlePaymentFailed`)** — Neither checks the subscription's current status before transitioning it, unlike `handleHalted`/`handleCancelled` which explicitly skip `cancelled` subscriptions.
  **Failure scenario:** A `subscription.charged` event fails transiently and is marked `"failed"`; the user cancels in the meantime (processed by a later `subscription.cancelled` event, downgrading to free); the `retry-webhooks` cron later replays the stale `charged` event, which unconditionally sets `status: "active"`, resets quotas, extends the period, and flips the user back to the paid plan — resurrecting a cancelled subscription with no valid payment behind it.
  **Fix:** Guard both handlers the same way `handleHalted`/`handleCancelled` do; consider rejecting stale/out-of-order events by timestamp.

### High

- **`src/app/api/subscriptions/route.ts:252-261` (cancel), `:292-303` (change_plan)** — The Razorpay API call's error is swallowed (`.catch(err => console.error(...))`) and the local DB is updated (`cancelAtPeriodEnd: true` / `pendingPlanChange`) regardless of whether the Razorpay call actually succeeded.
  **Failure scenario:** A failed cancel call still tells the user (and UI) their subscription won't renew while Razorpay keeps charging them; a failed plan-change call still lets the next webhook apply the new (unbilled) plan locally.
  **Fix:** Only write the local flag if the Razorpay call succeeds; surface failures to the client.

### Medium

- **`src/app/api/cron/reconcile-subscriptions/route.ts:41-70,76-87`** — Reads past-due subscriptions with `.find().toArray()` and no atomic claim (unlike the webhook route's `findOneAndUpdate` claim pattern), so two overlapping cron runs can both process the same subscription's downgrade twice.
- **`src/lib/billing-emails.ts:26,125,152,168`** — `idempotencyKey` includes `${Date.now()}`, defeating `trackedSend`'s duplicate-email dedup for welcome/upgrade/downgrade/cancel emails (contrast with the receipt/payment-failed emails, which use stable keys correctly).
- **`src/lib/billing-emails.ts:29,54`** — Hardcodes a `$` currency symbol on amounts that are actually INR (Razorpay on this account only settles in INR) — a real money-mislabeling bug on a legally-required receipt email.
- **`src/app/api/subscriptions/route.ts:126` vs `webhook-processing.ts:24-36`** — `sendSubscriptionWelcomeEmail` is only called in the mock-subscription branch; real (production) subscribers activated via the `subscription.activated` webhook never get the legally-required welcome/receipt email.

### Low

- `scripts/rollback-plan-names.mjs:45-53` — Indiscriminately renames every `'plus'`/`'premium'` user back to `'pro'`/`'enterprise'`, with no way to distinguish migrated users from users who signed up natively under the new names after the migration.
- `src/lib/billing-emails.ts:83` (`sendGracePeriodReminderEmail`) — Defined but never called anywhere; grace-period dunning has no 3-day/1-day reminder before auto-downgrade.

### Verified sound
`money.ts` integer-cents math is correct (`splitEscrow` balances exactly). `payments/route.ts` PATCH does correct signature verification, server-side re-fetch of the actual captured amount, and a DB unique-index backstop. `webhooks/razorpay/route.ts` correctly verifies HMAC on the raw body and atomically claims events before processing. `ai-plan-limit.ts`/`reset-plan-limits.ts` use correct compare-and-swap patterns.

---

## 3. Core business API (jobs, bids, milestones, disputes, teams, invites, referrals, reviews, transactions, users, notifications, assessments, v1/jobs, seed)

### High

- **`src/app/api/bids/route.ts:82-83`** — When `new ObjectId(jobId)` throws, the code falls back to `db.collection("jobs").findOne({ id: jobId })` using the raw, unvalidated request value as the filter.
  **Failure scenario:** `POST /api/bids` with `{"jobId": {"$exists": false}, ...}` matches an arbitrary job (no job document has an `id` field, only `_id`), and the code bids against/mutates that arbitrary job instead of rejecting the request.
  **Fix:** Validate `jobId` as a 24-char hex ObjectId string before use; reject otherwise. Never fall back to a raw filter value.

- **`src/lib/mongo-id.ts:5-10` `idFilter()`** — Returns `{ _id: id }` with the raw input whenever `ObjectId.isValid(id)` is false, which is also true for non-string/object input. Reachable via `src/lib/create-job-invite.ts:41` and `src/app/api/invites/route.ts:69-73,105-110`.
  **Failure scenario:** `POST /api/invites` with `{"jobId": {"$ne": null}, ...}` matches every job in the collection instead of failing "not found", letting a caller attach quota-consumption/duplicate-guard logic to an unrelated job.
  **Fix:** `idFilter` should treat non-string input as invalid outright, not fall through to using it as a raw filter value.

- **`src/app/api/milestones/route.ts:195`** — The escrow-release lookup (`transactions.findOne({ jobId, escrowStatus: "held" })`) has no `purpose: "job_escrow"` filter, unlike the other escrow-touching routes in the codebase, even though a job can have a second unrelated `held` transaction (a `featured_boost` payment tagged with the same `jobId`).
  **Fix:** Filter on `purpose: "job_escrow"`, or resolve via `job.escrowTransactionId`.

- **`src/app/api/milestones/route.ts:189-227`** — `escrowReleased: true` is set unconditionally on approve; the actual money-moving block is silently skipped with no error/log/rollback when no matching `held` transaction is found (e.g., after a dispute flips `escrowStatus` to `disputed`).
  **Fix:** Only set `escrowReleased: true` after the transaction update actually succeeds; reject/log explicitly on failure instead of no-oping.

### Medium

- **`src/app/api/v1/jobs/route.ts:164-174`** — `decayRatePerHour`/`estimatedHours` aren't bounds-checked for the public API-key route (unlike the internal `POST /api/jobs`). A negative decay rate makes the asking price *increase* over time, breaking the pricing invariant the rest of the app assumes.
- **`src/app/api/reviews/route.ts:78-81`** — Same missing-`purpose`-filter problem as milestones: any released transaction tagged with a `jobId` (e.g. an admin-released `manual_payment`) authorizes a review, not necessarily actual job completion.
- **`src/app/api/reviews/route.ts:22-32`** — The `jobId`-only query branch skips `authenticateRequest` entirely, returning reviews for a job (including invite-only jobs) with no auth.
- **`src/lib/email.ts`** (`sendNewReviewEmail`, `sendJobPostedEmail`, `sendMilestoneSubmittedEmail`, etc.), fed by unsanitized input like `reviews/route.ts:73` — user-supplied free text (review comments, job titles, dispute reasons) is interpolated into HTML emails with no escaping, enabling phishing-style links in legitimate transactional emails.
- **`src/app/api/invites/route.ts:105-110`** — Same raw-fallback pattern as the bids finding; impact is bounded by a follow-up ownership check but is still a real injection primitive.

### Low

- `src/app/api/milestones/route.ts:67,128,131` — Unvalidated `new ObjectId(...)` calls throw into a generic 500 instead of a clean 400 on malformed IDs.
- `src/app/api/jobs/[id]/cancel/route.ts:61-68` — Notifies bidders sequentially (`await` in a `for` loop) instead of batching/fire-and-forget, blocking the response on job cancellation.
- `src/app/api/teams/route.ts:53-59` — Loads full `teamJobs`/`teamTransactions` documents just to compute counts/sums; should use `countDocuments`/aggregation.
- `src/app/api/reviews/route.ts:135,141,145,149` — Four redundant `await import("mongodb")` calls duplicate the already-imported top-level `ObjectId`.

### Verified sound
`src/app/api/seed/route.ts` is correctly gated (disabled in prod unless `ALLOW_SEED=true`; requires admin once any user exists). `disputes/route.ts` and `transactions/route.ts` correctly use `sanitizeObjectId`/`sanitizeString` and are not vulnerable to the raw-fallback pattern found elsewhere.

---

## 4. AI features, chat, dashboards & admin API

*Scope: `src/app/api/ai/**`, `chat/**`, `client/**`, `freelancer/**`, `admin/**` (excl. verify-key), `src/lib/ai.ts`, `smart-match.ts`.*

Overall posture here is solid: every admin route enforces `role === "admin"` server-side; dashboard routes scope queries to the JWT's user id, not client input; chat routes verify room membership; all 8 AI endpoints validate input, rate-limit per user, enforce plan quotas, and defend against prompt injection (untrusted-input framing + server-side re-fetch of job/bid/review data). No Critical/High issues found in this scope.

### Medium

- **5 of 8 AI routes** (`chat-assist`, `generate-description`, `pricing-advisor`, `quality-check`, `smart-search`) call `checkAndConsumeAiQuota()` **before** validating the request body, so a validation failure still burns a unit of the user's monthly AI quota. (`bid-strategy`, `evaluate-bids`, `summarize-reviews` correctly defer the charge — this is the pattern to copy.)
- **`src/app/api/client/market-intel/route.ts:19-21`** (and `freelancer/dashboard`, `match-radar`, `price-alerts`) — Fetches every open job platform-wide with no `.limit()`, then does O(jobs × bids) filtering in JS; will degrade linearly with total open-job count, not per-user data size.

### Low

- `src/lib/smart-match.ts:78-81` — Dead/redundant condition in `computeBidHistoryScore` (`job.acceptedBy === freelancerId || (job.status === "completed" && job.acceptedBy === freelancerId)`); the second clause can never change the result. Likely signals an unimplemented "completed vs merely accepted" distinction.
- `src/lib/ai.ts:21-28,30-39` — No `AbortSignal`/timeout on Gemini SDK calls; a stalled provider response has no bounded failure mode.
- `src/app/api/admin/users/[id]/route.ts:85-87` — `revokeRefreshToken` is only called on suspension, not on a role downgrade; a demoted admin's existing access token still passes `requireAdmin()` until it naturally expires (~15 min).

---

## 5. Frontend pages (`src/app/**`, excluding `api/`)

### High

- **`src/app/admin/jobs/page.tsx:149,172-174`** — "Current Price" column is hardcoded to `job.startingPrice`; `getCurrentPrice` isn't even imported. Every job that's been live more than a few minutes shows a stale/wrong price to admins.
- **`src/app/admin/jobs/page.tsx:19,148`** — "Bids" column is derived from the global `bids` array, which for admins is capped to the 200 most-recently-created bids platform-wide and fetched once at login (never refreshed). Older jobs' bid counts silently undercount or show 0.

### Medium

- **`src/app/inbox/page.tsx:190-205`** — `activeRoom!` non-null assertion can throw if `chatRooms` refreshes and no longer contains the selected room, dropping the whole Inbox page into the error boundary.
- **`src/app/jobs/[id]/page.tsx:1131`** — Sidebar hardcodes `"Visibility": "Public"` regardless of the job's actual `visibility` field; invite-only jobs show "Public" in their own detail view.
- **`src/app/jobs/[id]/page.tsx:533-538`** — Per-row "Accept" button in the bid-comparison table has no disabled/loading state, unlike the main Accept button — double-click risk on a job-award action.
- **`src/app/payments/page.tsx:620-625`** — "Confirm Release" button has no disabled guard while the release request is in flight (unlike the adjacent dispute-confirm button, which does).
- **`src/app/admin/users/page.tsx:34,83,290-311`** — `suspendReason` state exists but is never rendered in the Suspend modal and never sent to `updateUser` — feature is half-wired.
- **Broken `<label>`/`<input>` association** across multiple forms (no `htmlFor`/`id` pairing, input not nested in label): `login/page.tsx:340-427`, `post-job/page.tsx:505-687`, `profile/page.tsx:360-450`, `team/page.tsx:157-270`. Clicking labels doesn't focus fields; screen readers won't announce field names.

### Low

- `src/app/admin/users/page.tsx:238-260` — Edit User modal reads form values via `document.getElementById(...).value` instead of controlled state; `parseInt` on an empty field silently yields `NaN` sent to the API.
- Dead code / unused imports across ~12 page files (`jobs/[id]/page.tsx`, `post-job/page.tsx`, `profile/page.tsx`, `profile/[id]/page.tsx`, `my-jobs/page.tsx`, `payments/page.tsx`, `earnings/page.tsx`, `assessments/page.tsx`, `notifications/page.tsx`, `team/page.tsx`, `admin/users/page.tsx`) — unused icon imports, unused state, and two stale `eslint-disable-next-line` comments.

### Notes
No `dangerouslySetInnerHTML` or client-embedded secrets found. `admin/layout.tsx` gates `/admin` client-side, but every `/api/admin/*` route independently enforces the role server-side, so this is a UX guard, not a real bypass.

---

## 6. Shared components & UI library

*Scope: `src/components/**`, `src/lib/store.tsx`, `src/lib/utils.ts`.*

### High

- **`src/lib/store.tsx:917-934` (`logout`)** — Clears most collections but never resets `milestones`, `referralStats`, `watchedJobIds`, or `invites`.
  **Failure scenario:** User A logs out on a shared/unreloaded tab; User B logs in on the same tab without a full page reload. Components rendering `milestones`/`referralStats`/`invites` from context before their own fetch resolves briefly show User A's financial/referral data under User B's session. `watchedJobIds` (client-only, never re-fetched) persists indefinitely across the account switch.
  **Fix:** Also reset these four pieces of state in `logout()`.

### Medium

- **`FreelancerJobCard.tsx:203-209`, `MyJobsSection.tsx:258-264`, `RecommendedCarousel.tsx:116-125`** — A `<button>` performing a distinct action is nested inside a `<Link>` (invalid HTML, ambiguous keyboard/screen-reader focus order, competing click targets).
- **5 hand-rolled modals** (`DirectHireModal`, `MessageFreelancerModal`, `SmartMatchModal`, `InviteToBidModal`, `FeaturedBoostModal`) build their own backdrop/panel instead of using the existing accessible `ui/dialog.tsx` (Radix) — no `role="dialog"`, no focus trap, no Escape-to-close, unpaired form labels. Keyboard users can Tab straight through into the page behind the modal.
- **`TalentPool.tsx` `FreelancerCard`** — Unmemoized `bids.filter(...)` per card on every render; re-renders every 5 seconds due to an unrelated global clock tick even though the `now` prop is unused in this component.
- **`CloudinaryAvatar.tsx:50-56`** — Public-ID parser assumes the URL segment after `/upload/` is always a version string and unconditionally strips it; for URLs without a version segment this strips a real folder segment instead, silently breaking the avatar image.

### Low

- `AvatarUploader.tsx:59-67` — No `clientAllowedFormats`/`resourceType` restriction on the Cloudinary widget, and includes a remote-URL upload source; a user can "upload" a non-image file as an avatar.
- `store.tsx:193-206` / `TalentPool.tsx:27` / `MyJobsSection.tsx:35` — `now` is prop-drilled into components that don't use it, keeping them on an unnecessary 5-second re-render cascade.

### Verified sound
No `dangerouslySetInnerHTML`/XSS found anywhere in this scope. `ui/*` (Radix-based primitives), `navbar.tsx`, `mobile-bottom-nav.tsx`, `admin/*`, `ai/*`, and `landing/*` (correct effect cleanup) had no significant issues.

---

## Suggested fix order

1. Migration-script wrong-database bug + re-verify prod indexes (Critical, §2).
2. Webhook status-guard on `handleCharged`/`handlePaymentFailed` (Critical, §2).
3. `/api/upload/sign` folder/public_id bypass (High, §1).
4. `idFilter` / raw-ObjectId-fallback injection in bids & invites (High, §3).
5. Milestone escrow lookup `purpose` filter + stop silently marking `escrowReleased` on failure (High, §3).
6. `logout()` incomplete state reset (High, §6).
7. Admin "Current Price"/"Bids" staleness (High, §5) — low risk but actively misleads admins auditing the platform.
8. Everything else, roughly in severity order within each section above.

---

## Fix pass — 2026-07-24

All findings above (2 Critical, 9 High, 15 Medium, ~20 Low) were fixed in a second pass, split across the same 6 scoped areas and applied in parallel. 61 files changed. `npx tsc --noEmit` passes clean across the whole project; `npm test` (12 tests, `smart-match.test.ts`) passes.

Notable fix decisions worth knowing about:

- **Auth (§1):** `switch-role` now revokes *all* of the user's existing refresh-token sessions (not just the pre-switch one) since access tokens don't carry a `sessionId` to target individually — this forces re-login on other devices on every role switch, which is an intentionally conservative tradeoff. A CSP was added to `next.config.ts` scoped to the origins the app actually loads (Razorpay Checkout, Cloudinary upload widget, `res.cloudinary.com`), plus HSTS.
- **Payments (§2):** `migrate-plan-names.mjs` now tags migrated documents with `migratedFromLegacyPlan: true`, and `rollback-plan-names.mjs` only reverts documents carrying that marker (previously it would have reverted *any* user on the new plan names, including ones who signed up natively after migration). The grace-period reminder email is now wired into the `reconcile-subscriptions` cron with a `graceRemindersSent` dedup field.
- **Core business API (§3):** The milestone-approve fix goes further than a minimal patch — the whole approve action now rolls back (returns 409) if the escrow transaction can't be released, rather than only skipping the `escrowReleased` flag, since a milestone that says "approved" without payment moving is worse than one that clearly failed. `escapeHtml()` was added to `src/lib/email.ts` and applied across all 21 email templates, not just the ones originally flagged.
- **AI/dashboards (§4):** Gemini calls now pass a 15s `timeout` via the SDK's native `RequestOptions` (no wrapper needed — `@google/generative-ai@0.24.1` supports it directly).
- **Frontend (§5):** Admin "Bids" count now reads `job.bidCount` (already tracked server-side via `$inc`) instead of deriving from the capped client-side `bids` array.
- **Components (§6):** The 5 hand-rolled modals were rebuilt on the existing `ui/dialog.tsx` (Radix) primitives — this was the largest single change in the pass. Logic/API calls were preserved; only the backdrop/panel/focus-trap chrome changed. **This is the one area worth a manual click-through in the browser** (open/close/submit on each of `DirectHireModal`, `MessageFreelancerModal`, `SmartMatchModal`, `InviteToBidModal`, `FeaturedBoostModal`) before shipping — it was verified by careful reading and type-checking, not by running the app.

Not done as part of this pass (deliberately out of scope): actually running the fixed migration scripts against the database, or hitting the real Razorpay API to verify the webhook/cron changes end-to-end. Those need a real staging environment, not a code fix.

---

## Browser verification — 2026-07-24

Ran the app against a real MongoDB Atlas cluster (seeded via `/api/seed`) with Playwright, driving it directly rather than trusting the fix agents' self-reports. This caught one real regression and confirmed the rest of the fixes work end-to-end.

### Regression found and fixed
- **CSP blocked Razorpay's own checkout script.** The new `script-src` in `next.config.ts` allowed `checkout.razorpay.com` but not `cdn.razorpay.com`, which `checkout.razorpay.com/v1/checkout.js` loads at runtime for its risk-detection sub-script. Confirmed via a real CSP violation in the browser console, fixed by adding `https://cdn.razorpay.com` to `script-src`, reloaded and confirmed clean.

### Confirmed working end-to-end
- **§1 Auth:** CSP + HSTS headers present on every response. Login/register `Full Name`/`Email`/`Password` labels correctly associated (accessible names verified via the DOM, not just markup).
- **§3/§6 nested-button fix:** Clicking "Accept Best" on a job card in `MyJobsSection` no longer navigates to the job detail page, and the bid-accept action itself completed successfully (job moved from open → accepted, notification fired).
- **§3 invites route fix:** `InviteToBidModal`'s full submit flow (select job → send invite) completed with no errors, exercising the fixed `idFilter`/ObjectId-validation path.
- **§5 job visibility label:** Created a fresh job with `visibility: invite_only` via the post-job wizard — sidebar correctly shows "Invite Only"; a public job correctly shows "Public" (previously always hardcoded to "Public").
- **§5 post-job / team labels:** `Job Title`, `Estimated Hours`, `Starting Price` (post-job) and `Team name`, `Colleague's email` (team) all resolve to proper accessible names.
- **§3 teams aggregation:** Creating a team showed correct `countDocuments`/aggregation-derived Total Jobs / Active Jobs / Total Spend numbers.
- **§5 admin jobs table:** "Current Price" now shows the live decayed price (e.g. a $1,000 job showing $997 a few minutes later) instead of the hardcoded starting price; "Bids" now shows the authoritative per-job `bidCount` (e.g. correctly showing 2 for a job with 2 real bids) instead of a count derived from a capped, stale client-side array.
- **§5/§3 admin users:** Edit User modal now uses controlled state pre-filled from the selected user; clearing the GeekScore field and saving sends a payload with the key omitted entirely (confirmed via intercepted `fetch` body), not `NaN`. Suspend modal now has a reason textarea; submitting sends `suspendReason` in the request body and the row correctly shows "• Suspended" afterward.
- **§6 all 5 rebuilt modals** (`DirectHireModal`, `MessageFreelancerModal`, `InviteToBidModal`, `SmartMatchModal`, `FeaturedBoostModal`) render as proper `role="dialog"` elements, close on Escape, and have correctly labeled form fields. `MessageFreelancerModal` and `InviteToBidModal` were exercised through full submit flows with no errors. `FeaturedBoostModal` correctly shows ₹ (not the old hardcoded `$`) once the plan's free boost quota is exhausted.
- **§5 inbox crash guard:** Navigating directly to `/inbox?room=<id>` (as happens after sending a message) rendered the thread correctly with no crash.

### Blocked by pre-existing environment gaps (not regressions from this fix pass)
- `/profile` hard-crashes on load because `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` was never set in `.env.local` — this predates this session and blocked verifying the profile-page label fixes and `CloudinaryAvatar`/`AvatarUploader` fixes in a live browser. Worth fixing separately (the component should degrade gracefully instead of crashing the whole page when Cloudinary env vars are absent).
- AI routes, real Razorpay payment capture, and Google OAuth couldn't be exercised — `GEMINI_API_KEY`, `RAZORPAY_KEY_SECRET`, and `GOOGLE_CLIENT_SECRET` are all unset in this environment.
- A pre-existing, unrelated 401 on `GET /api/jobs/pricing-hint` was observed while filling out the post-job form — not one of the reviewed/fixed routes, not investigated further here.

### Test environment note
Used the existing seeded admin account (`admin@geekbid.io`) and re-ran `/api/seed` for fresh data. Added a temporary `ADMIN_SECRET_KEY` to `.env.local` (it was unset, which blocked the in-app admin-key gate entirely) to reach `/admin/*` pages — this is a local-only test credential, not committed anywhere; remove it or replace with a real key before deploying.
