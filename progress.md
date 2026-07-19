# GeekBid — Fix Progress Tracker

> Tracks completion status of every issue in [`issues.md`](./issues.md) (61 issues), implemented per [`planning.md`](./planning.md).
> **Update this file immediately after each issue is fixed** — status, date, files touched, and any deviation from the planned fix. This is the persistence layer if a session runs out of context/tokens; the next session should read this file first to know what's already done.

**Last updated:** 2026-07-20 (batch 3: ISSUE-6, 36, 38, 41 fixed — pushing to `v19`)

## How to update
1. When you finish an issue, flip its Status to `Done`, fill in Date + Commit/Files + Notes.
2. If you start but don't finish, mark `In Progress` and note where you stopped (exact file/line, what's left).
3. If a fix deviates from `planning.md`'s suggested approach, note why in Notes.
4. Never delete rows — this is the audit trail.

**Status legend:** `Not Started` / `In Progress` / `Done` / `Skipped (reason in Notes)`

---

## Critical

| Issue | Title | Status | Date | Commit/Files | Notes |
|---|---|---|---|---|---|
| ISSUE-1 | Free paid plans when Razorpay/plan IDs missing | Done | 2026-07-20 | `web/src/app/api/subscriptions/route.ts`, `web/.env.example` | Added `NODE_ENV==="production"` fail-closed guard on the mock-subscription branch (matches existing payments mock guard); added `ALLOW_MOCK_BILLING` opt-in env var for staging. |
| ISSUE-2 | Featured boost accepts any verified payment amount | Done | 2026-07-20 | `web/src/app/api/jobs/feature/route.ts`, `web/src/lib/plans.ts` | Claim `findOneAndUpdate` filter now requires `grossAmount >= FEATURED_BOOST_PRICE_INR` and `currency === FEATURED_BOOST_CURRENCY`, not just matching description+verified. |
| ISSUE-3 | Cancel is not atomic | Done | 2026-07-20 | `web/src/app/api/jobs/[id]/cancel/route.ts` | Switched to `findOneAndUpdate({ _id, status: "open" }, ...)`; returns 409 if unmatched (same pattern as accept/complete). |
| ISSUE-4 | Direct Hire offers cannot be accepted/declined in UI | Done | 2026-07-20 | `web/src/app/jobs/[id]/page.tsx` | Added `isDirectOfferForMe` gate; freelancer action panel now renders Accept/Decline wired to `respondToOffer` (already existed in store.tsx, just never called) instead of the auction Accept/Counter form; AI Bid Strategist hidden for direct offers too. |

## High

| Issue | Title | Status | Date | Commit/Files | Notes |
|---|---|---|---|---|---|
| ISSUE-5 | Bid monthly quota consumed on cooldown 429 | Done | 2026-07-20 | `web/src/app/api/bids/route.ts` | Moved the 30-min cooldown check to before the quota-reservation `findOneAndUpdate`, so a 429 never consumes a slot (matches suggested fix: check cooldown before reserving, instead of adding a new refund path). |
| ISSUE-6 | Accept/award mints "held" escrow with no payment | Done (partial — see notes) | 2026-07-20 | `web/src/app/api/jobs/[id]/route.ts`, `web/src/app/api/jobs/offer-response/route.ts`, `web/src/app/api/jobs/[id]/complete/route.ts`, `web/src/app/api/payments/route.ts` | **Scoped fix, not the full planning.md §4 model.** Tagged every escrow-creating transaction with `purpose` (`"job_escrow"` at accept/award/offer-accept vs `"featured_boost"`/`"manual_payment"` from `api/payments`), and added `job.escrowTransactionId` set at accept time. Complete now releases *that exact row* (falls back to `{jobId, purpose:"job_escrow", escrowStatus:"held"}` for legacy rows), so a job's featured-boost payment can never be the row that gets released/refunded instead of the real escrow — this was the concretely reachable bug (boost payment + job both write `held` txs tagged with the same `jobId`). **Deliberately NOT changed:** accept/award still mints a "held" escrow with no real Razorpay capture behind it — there is no product flow today where a client actually pays into job escrow (payments/page.tsx's form has no jobId field; FeaturedBoostModal is the only jobId-carrying caller of `/api/payments`). Making accept require real payment first is a product-behavior change explicitly flagged in planning.md §11 as an open decision, not something to decide unilaterally. |
| ISSUE-7 | Team seat enforcement — wrong `_id` type | Done | 2026-07-20 | `web/src/lib/plan-downgrade.ts` | `enforceExpiredTeamSeatDeadlines` now does `new ObjectId(team.ownerId)` (wrapped in try/catch) instead of comparing a string to `_id` directly, so the owner's real plan/seat count is found instead of always falling back to Free. |
| ISSUE-8 | Month reset for jobs/bids not write-guarded | Not Started | | | |
| ISSUE-9 | Webhook idempotency allows concurrent double-processing | Not Started | | | |
| ISSUE-10 | Per-row "Accept" awards lowest bid, not that row's freelancer | Not Started | | | |
| ISSUE-11 | Plan usage UI stays stale | Not Started | | | |
| ISSUE-12 | Adaptive "time to floor" uses fixed linear decay | Not Started | | | |
| ISSUE-13 | Payments use raw `auth.accessToken` (no refresh) | Not Started | | | |
| ISSUE-35 | Referral `referralCode` NoSQL injection | Done | 2026-07-20 | `web/src/app/api/auth/route.ts` | `referralCode` now passed through `sanitizeString()` (coerces non-strings to `""`) before use in `findOne()`/insert/`$set`; a `{"$ne":null}` payload can no longer reach the query as an operator. |
| ISSUE-36 | Dual-role register re-applies referral | Done | 2026-07-20 | `web/src/app/api/auth/route.ts` | Referral block now skips entirely when `result.roleAdded` (dual-role "add role" registration) or the user already has `referredBy` set — prevents a second `referrals` row / re-crediting the same referrer on an additional role signup. |
| ISSUE-37 | Assessment submit race inflates GeekScore | Done | 2026-07-20 | `web/src/app/api/assessments/route.ts`, `web/scripts/create-fix-indexes.mjs` | Replaced check-then-insert cooldown with an atomic claim against new `assessment_cooldowns` collection (unique index on `{userId, assessmentId}`); duplicate-key error (concurrent race OR still-on-cooldown) → 429, only the winner scores/inserts/credits geekScore. **Needs `node scripts/create-fix-indexes.mjs` run against the target DB before this is fully enforced.** |
| ISSUE-38 | Google login always sends `role=` | Done | 2026-07-20 | `web/src/app/login/page.tsx`, `web/src/app/api/auth/google/route.ts`, `web/src/app/api/auth/google/callback/route.ts`, `web/src/lib/auth.ts` | Added an `intent` (`login`\|`register`) param threaded through the OAuth `state` string; `googleLoginUser` only adds/switches roles for an existing account when `intent==="register"` (signup tab). Login tab now sends `intent=login`, so logging in via Google never mutates an existing user's roles. |
| ISSUE-39 | Team invitee cannot accept invite in UI | Done | 2026-07-20 | `web/src/app/api/teams/route.ts`, `web/src/app/team/page.tsx` | GET now returns `{team: null, pendingInvite: {teamId, teamName}}` when caller isn't a member but has a pending invite; FE shows an "Accept invite" screen instead of always defaulting to "Create a Team". |
| ISSUE-40 | Over-limit team: no remove-member UI/API | Done | 2026-07-20 | `web/src/app/api/teams/route.ts`, `web/src/app/team/page.tsx` | Added `action: "remove_member"` (owner-only, `$pull memberIds` + clear member's `teamId`/`teamRole`, auto-clears `over_limit` if back under cap); FE has a "Remove" button per non-owner member row. |
| ISSUE-41 | Session restore race redirects to `/login` | Done | 2026-07-20 | `web/src/lib/store.tsx` | `mounted` is no longer set synchronously at the top of the hydration effect — it's now set immediately for "no session" / "session still valid" but only *after* `silentRefresh()` settles for an expired saved token. Every page's `if (mounted && !currentUser) router.replace("/login")` guard gets this fix for free without touching any of the 11 pages that use that pattern. |
| ISSUE-42 | Featured Boost charges ₹10 labeled as $10 | Done | 2026-07-20 | `web/src/lib/plans.ts`, `web/src/components/modals/FeaturedBoostModal.tsx`, `web/src/app/api/jobs/feature/route.ts` | Replaced `FEATURED_BOOST_PRICE_USD` (display) + hardcoded `"INR"` currency (charge) with single source of truth `FEATURED_BOOST_PRICE_INR`/`FEATURED_BOOST_CURRENCY`; UI now shows ₹830, matching what's actually charged and what the server enforces (ISSUE-2). Also removed now-dead `config` fetch/state in the modal (its only use was the mismatched currency). |

## Medium

| Issue | Title | Status | Date | Commit/Files | Notes |
|---|---|---|---|---|---|
| ISSUE-14 | Milestones GET has no job authorization | Not Started | | | |
| ISSUE-15 | Invite-only/direct-offer jobs readable by ID without auth | Not Started | | | |
| ISSUE-16 | Payment verification race can mint duplicate txs | Not Started | | | |
| ISSUE-17 | Cron auth fails open if `CRON_SECRET` unset | Not Started | | | |
| ISSUE-18 | Direct-offer price not validated | Not Started | | | |
| ISSUE-19 | Concurrent subscription create can double-subscribe | Not Started | | | |
| ISSUE-20 | Dispute resolve accepts any `status` string | Not Started | | | |
| ISSUE-21 | Complete email uses wrong price field | Not Started | | | |
| ISSUE-22 | Post Job double-submit (wrong `loading` flag) | Not Started | | | |
| ISSUE-23 | Inbox replaces all messages when opening a room | Not Started | | | |
| ISSUE-24 | Earnings "This Month"/chart are random fake numbers | Not Started | | | |
| ISSUE-25 | My Jobs marks non-open jobs as "Completed" | Not Started | | | |
| ISSUE-26 | Freelancer My Jobs omits jobs they only bid on | Not Started | | | |
| ISSUE-27 | Feed role routing: non-clients get Freelancer UI | Not Started | | | |
| ISSUE-28 | Job Accept/Counter lack in-flight guards | Not Started | | | |
| ISSUE-29 | `$` formatting vs INR payments | Not Started | | | |
| ISSUE-43 | Teams GET leaks member emails | Not Started | | | |
| ISSUE-44 | Public profile leaks `googleId` | Not Started | | | |
| ISSUE-45 | Client dashboards load entire `users` collection | Not Started | | | |
| ISSUE-46 | Team accept ignores seat cap/races | Done | 2026-07-20 | `web/src/app/api/teams/route.ts` | Accept now re-checks the owner's *current* plan seat count and claims atomically via `findOneAndUpdate` with `$expr: {$lt: [{$size: "$memberIds"}, allowedMembers]}` — two concurrent accepts (or an accept racing a downgrade) can't both push past the cap; loser gets 409. |
| ISSUE-47 | Chat messages: no size/rate limits | Not Started | | | |
| ISSUE-48 | Freelancer dashboard metrics wrong | Not Started | | | |
| ISSUE-49 | Assessment `timeLimit` not enforced server-side | Not Started | | | |
| ISSUE-50 | Unsigned Cloudinary upload path | Not Started | | | |
| ISSUE-51 | InviteToBidModal: raw token + can invite on direct_offer | Not Started | | | |
| ISSUE-52 | Razorpay script "already in DOM" race → mock verify | Not Started | | | |
| ISSUE-53 | Subscription status `created` treated as live | Not Started | | | |
| ISSUE-54 | Admin pages + `fetchJobs` use raw `accessToken` | Not Started | | | |
| ISSUE-55 | Assessment auto-submit can re-fire after failed submit | Not Started | | | |
| ISSUE-56 | `/post-job` has no client-role gate | Not Started | | | |
| ISSUE-57 | Mobile Inbox badge uses notification unread | Not Started | | | |
| ISSUE-58 | Forgot Password is a dead stub (product gap) | Not Started | | | |
| ISSUE-59 | Delete Account Confirm does nothing (product gap) | Not Started | | | |
| ISSUE-60 | No user-facing dispute creation API/UI (product gap) | Not Started | | | |
| ISSUE-61 | "Split" dispute resolution incomplete (product gap) | Not Started | | | |

## Low

| Issue | Title | Status | Date | Commit/Files | Notes |
|---|---|---|---|---|---|
| ISSUE-30 | Suspended users keep access until access JWT expires | Not Started | | | |
| ISSUE-31 | Feature pay-path uses caller as `clientId` (admin edge case) | Not Started | | | |
| ISSUE-32 | Reconciliation writes local status `"halted"` | Not Started | | | |
| ISSUE-33 | Inbox send can double-fire | Not Started | | | |
| ISSUE-34 | `markAllRead` ignores API failure | Not Started | | | |

---

## Summary

| Severity | Total | Done | Remaining |
|---|---|---|---|
| Critical | 4 | 4 | 0 |
| High | 17 | 11 | 6 |
| Medium | 31 | 1 | 30 |
| Low | 5 | 0 | 5 |
| **Total** | **61** | **16** | **45** |

*(Critical done: ISSUE-1, 2, 3, 4 — all 4. High done: ISSUE-5, 6, 7, 35, 36, 37, 38, 39, 40, 41, 42 — note ISSUE-6 is partial, see its row; remaining High: 8, 9, 10, 11, 12, 13. Medium done: ISSUE-46. 16 issues done total.)*

## Suggested fix order (from `issues.md`)
1. ISSUE-1 · 2. ISSUE-2+42 · 3. ISSUE-3 · 4. ISSUE-35 · 5. ISSUE-37 · 6. ISSUE-4 · 7. ISSUE-5 · 8. ISSUE-7+39-40+46 · 9. ISSUE-6 · 10. ISSUE-36,38,41 · 11. Remaining High → Medium → Low / product gaps (58–61)

## Session log
- **2026-07-20** — Tracker created from `issues.md` + `planning.md`. No fixes applied yet. Next: start at ISSUE-1 per suggested fix order.
- **2026-07-20** — Fixed batch 1 (5 issues, per suggested fix order steps 1-4): ISSUE-1, ISSUE-2, ISSUE-3, ISSUE-35, ISSUE-42. Verified with `tsc --noEmit`, `eslint` (one pre-existing unrelated finding in `FeaturedBoostModal.tsx` line ~44, not touched by this batch), and a full `npm run build` (all routes compiled). No DB-backed integration tests run (would need a live Mongo instance — not set up in this session). Committed and pushed to GitHub: `origin/epic_0.0.1` and cherry-picked onto `origin/v19` (per user instruction: push every 5 issues). Next: ISSUE-37 (assessment race), then ISSUE-4 (Direct Offer UI) per suggested fix order.
- **2026-07-20** — Fixed batch 2 (7 issues): ISSUE-37, ISSUE-4, ISSUE-5, ISSUE-7, ISSUE-39, ISSUE-40, ISSUE-46. Added `web/scripts/create-fix-indexes.mjs` (new script, parallel to `create-phase4-indexes.mjs`) with the `assessment_cooldowns` unique index needed by ISSUE-37 — **must be run against the target DB** (`node scripts/create-fix-indexes.mjs`) for that fix to be fully enforced; until then the app-level atomic-claim logic still works but without the DB-level backstop. Verified with `tsc --noEmit`, `eslint` (all findings pre-existing/unrelated), full `npm run build`. Committing/pushing this batch next (continuing the "push every 5ish issues" cadence). Next up: ISSUE-6 (escrow ledger unification, bigger change — own batch), then ISSUE-36/38/41, then remaining High/Medium/Low per suggested order. User said "continue all other issues" — proceeding through the full list autonomously, batching commits.
- **2026-07-20** — Fixed batch 3 (4 issues): ISSUE-6 (partial/scoped — see its row for exactly what was and wasn't changed), ISSUE-36, ISSUE-38, ISSUE-41. Verified with `tsc --noEmit`, `eslint` (all findings pre-existing), full `npm run build`. **Correction to earlier summary-count math:** ISSUE-2 is Critical, not High (issues.md's own section headers say so) — the batch-1 and batch-2 log entries above miscounted it; the Summary Counts table above this log is now correct (Critical 4/4 done, High 11/17 done). Pushing this batch, then continuing to remaining High issues (8, 9, 10, 11, 12, 13) per task list, then Medium, then Low.
