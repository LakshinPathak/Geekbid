# GeekBid — Code Review & Bug Verification Report
**Date:** 2026-07-02 · **Branch:** v11 · **Scope note:** Mobile (`src/`) was removed from the repo in a prior commit, so the mobile layer is out of scope. Review was performed token-efficiently: full reads of every file tied to the 22 tracked bugs, plus grep-based sweeps (XSS, hardcoded secrets, rate limits, auth coverage) across the rest.

---

## 1. BUG TRACKER — Status Update

**21 of 22 issues FIXED. 1 PARTIALLY FIXED. Both regression checks (F1, F2) hold.**

| # | Bug | Status | Evidence |
|---|-----|--------|----------|
| C1 | IDOR on PATCH cancel/complete | ✅ FIXED | `jobs/[id]/route.ts:65,88` — `job.clientId !== auth.payload.userId → 403` in both branches |
| H1 | Race on job acceptance | ✅ FIXED | Both `accept` (line 319–339) and `accept_best` (134–141) use `findOneAndUpdate({..., status: "open"})`, return 409 on lost race |
| H2 | Escrow state machine unguarded | ✅ FIXED | `transactions/route.ts:84–99,144–153` — release & dispute both use atomic `findOneAndUpdate({escrowStatus: "held"})`, 409 otherwise; ownership checks added |
| H3 | Client-trusted payment amount | ✅ FIXED | `payments/route.ts:141–180` — fetches payment from Razorpay API, cross-checks `order_id` and captured status, uses Razorpay's amount |
| H4 | Chat APIs no participant authz | ✅ FIXED | Rooms POST: caller must be participant + all participants job-associated. Messages GET/POST: `participantIds: userId` in room lookup |
| H5 | OAuth no CSRF state | ✅ FIXED | Random nonce in httpOnly cookie (`lib/oauth-state`), `state = nonce.role`, callback rejects mismatch |
| H6 | Token in redirect URL | ✅ FIXED | `google/callback/route.ts:95–104` — one-time exchange code (15-min TTL) instead of token/user JSON in query string |
| H7 | Unauthenticated `/api/seed` | ✅ FIXED | Admin JWT required unless dev-mode + zero-user bootstrap; prod additionally gated on `ALLOW_SEED` |
| H8 | O(n) bcrypt API-key auth | ✅ FIXED | SHA-256 `keyHash` indexed lookup; bcrypt loop only as legacy fallback with opportunistic backfill |
| H9 | v1 POST bypasses business rules | ✅ FIXED | Category whitelist, free-plan 3-jobs/month cap, all pricing-engine fields (`pricingMode`, `bidCount`, `priceHistory`…) populated |
| M1 | Bid on non-open job | ✅ FIXED | `bids/route.ts:55–63` — server-side `status !== "open" → 400` |
| M2 | Losing bidders not notified | ✅ FIXED | `jobs/[id]/route.ts:216–235` — `job_awarded_other` notifications to all other bidders |
| M3 | Declined offers email-only | ✅ FIXED | `offer-response/route.ts:137–150` — `offer_declined` in-app notification inserted |
| M4 | Milestone approve never releases escrow | ✅ FIXED | `milestones/route.ts:124–157` — partial release with `releasedAmount` accumulator, flips to `released` when fully paid out |
| M5 | Referral credits dead code | ✅ FIXED | `lib/referrals.ts` — `creditReferralOnFirstJobCompletion` (atomic `signed_up→credited`, +$25), called from job completion |
| M6 | `/api/users` leaks emails | ✅ FIXED | Non-admin projection excludes `email` and `googleId` |
| M7 | AI routes no usage cap | 🟡 PARTIAL | 6 routes use shared `checkAndConsumeAiQuota`; `bid-strategy` has its own cap; **`summarize-reviews` has NO quota** — auth only |
| M8 | evaluate-bids trusts client data | ✅ FIXED | Re-fetches job, bids, freelancer profiles from DB by `jobId`; client-ownership check added |
| M9 | invite_only not enforced | ✅ FIXED | `jobs/route.ts:27–35` — feed excludes invite_only unless caller is client or invited |
| M10 | Plan-limit read-then-increment race | ✅ FIXED | Both jobs & bids use atomic `findOneAndUpdate` with `$lt` cap condition + `$inc` |
| L1 | Upload sign no validation | ✅ FIXED | Folder whitelist + `allowed_formats: jpg,jpeg,png,webp,gif` baked into signature |
| L2 | bids/my N+1 | ✅ FIXED | Single `$in` batch query + Map join |
| F1 | Accept path missing return | ✅ STILL FIXED | Unconditional `return NextResponse.json(...)` at line 447 |
| F2 | Notification field names | ✅ STILL FIXED | All insertion sites use `isRead`/`body`/`title` |

---

## 2. NEW BUGS DISCOVERED

| # | Sev | File | Finding | Fix |
|---|-----|------|---------|-----|
| N1 | 🔴 CRITICAL | `web/src/app/admin/config/page.tsx:226` | **Admin 2FA key `lakshin123` hardcoded in a client component** — `{ label: "Admin Key", value: "lakshin123 (masked)" }`. Server-side check correctly uses `process.env.ADMIN_SECRET_KEY`, but the real key value ships in the JS bundle, defeating the gate entirely. | Replace with a static literal like `"••••••••"`; never render the actual key. Rotate `ADMIN_SECRET_KEY`. |
| N2 | 🟠 HIGH | `web/src/app/api/jobs/offer-response/route.ts:27–58` | **Race on direct-offer accept** — `offerStatus === "pending"` is checked via `findOne` then a separate `updateOne`; escrow transaction is inserted *before* the job update. Two concurrent accepts (double-click) both pass the check → duplicate escrow transactions. Same pattern H1 had. | `findOneAndUpdate({_id, offerStatus: "pending", type: "direct_offer", offeredTo: userId}, {$set: ...})`, insert escrow only if it succeeded. |
| N3 | 🟠 HIGH | `web/src/app/api/payments/route.ts:182–207` | **No idempotency on payment verification** — replaying the same valid `razorpay_payment_id` + signature creates a new `escrowStatus: "held"` transaction each time. One real ₹X payment can mint N escrow ledger entries. | Unique index on `razorpayPaymentId`, or `findOne` before insert → 409 on duplicate. |
| N4 | 🟡 MEDIUM | `web/src/app/api/milestones/route.ts:101–102` | Milestone `action: "start"` has **no authorization check** — any authenticated user can flip any milestone to `in_progress` (submit/approve are properly guarded). | Require `job.acceptedBy === userId` for `start`. |
| N5 | 🟡 MEDIUM | `web/src/app/api/milestones/route.ts:8–30` | `GET /api/milestones?jobId=` is **fully unauthenticated** — leaks milestone titles, descriptions, and amounts for any job to anonymous callers. | Add `authenticateRequest`; restrict to job parties (or at least authenticated users). |
| N6 | 🟡 MEDIUM | `web/src/app/api/bids/route.ts:8–26` | `GET /api/bids` is public and, when called **without** `jobId`, dumps the 200 most recent bids platform-wide including freelancer IDs and private bid `message` text. | Require `jobId`; project out `message` for non-parties, or require auth. |
| N7 | 🟢 LOW | repo root | `client_secret_2_1066441897149-….json` **still on disk** — but it IS in `.gitignore` (line 51), is NOT git-tracked, and does not appear anywhere in git history. Local-hygiene issue only, not a repo leak. | Delete the file locally; the OAuth secret belongs in `.env` only. Rotate if it was ever shared. |
| N8 | 🟢 LOW | `web/src/app/api/payments/route.ts:139–143` | In mock mode (`order_mock_` prefix) the client-supplied `amount` is still trusted. Safe in production only because forging the HMAC requires the real secret; if `RAZORPAY_KEY_SECRET` is ever the placeholder in a reachable deployment, payments are forgeable. | Refuse mock verification when `NODE_ENV === "production"`. |

---

## 3. FEATURE COMPLETENESS MATRIX

All 13 features have their API routes and pages present. Deep-dive verification was done on the ones tied to tracked bugs; the rest verified by route existence + wiring.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| F1 | Reviews & Ratings | ✅ Complete | `api/reviews/` present; AI summarize-reviews exists (but uncapped — M7) |
| F2 | Categories & Tags | ✅ Complete | Category whitelist enforced in both internal and v1 job creation |
| F3 | Smart Job Matching | ✅ Complete | `api/jobs/recommended/` + feed carousel |
| F4 | GitHub Verification | ✅ Complete | `api/user/verify-github` present |
| F5 | Referral System | ✅ Complete | Full lifecycle now works incl. credit accrual (M5 fix) |
| F6 | Tiered Plans | ✅ Complete | Atomic caps on jobs (3/mo) and bids (10/mo) for free plan |
| F7 | Featured Listings | ✅ Complete | `api/jobs/feature/`; feed sorts `featured: -1` first |
| F8 | Instant Hire | ⚠️ Has Issues | Works end-to-end (escrow, chat room, notifications) but has the N2 accept race |
| F9 | Milestone Payments | ⚠️ Has Issues | Partial escrow release implemented (M4 fix) but N4/N5 auth gaps |
| F10 | Team Accounts | ✅ Complete | `api/teams/` + `team/page.tsx` |
| F11 | Public API | ✅ Complete | Hashed key auth, plan limits, envelope responses, pagination |
| F12 | Skill Assessments | ✅ Complete | `api/assessments/` + `assessments/page.tsx` |
| F13 | Statistical Pricing | ✅ Complete | `api/jobs/pricing-hint/` + adaptive engine in `lib/pricing.ts` |

**Overall: 11/13 complete, 2/13 complete-with-issues, 0 not started.**

---

## 4. CODE REVIEW SWEEP RESULTS

- **XSS:** No `dangerouslySetInnerHTML` anywhere in `web/src`. ✅
- **Hardcoded secrets:** None in TS/JS source except N1 (admin key in config page). All services use `process.env`. ✅
- **NoSQL injection:** `sanitizeObjectId`/`sanitizeString` used in transactions; `String()` coercion on adminKey; ObjectId try/catch fallbacks throughout. ✅
- **Auth coverage:** Every route verified in this pass calls `authenticateRequest` except the intentionally-public job GET and the gaps flagged in N5/N6.
- **Error handling:** Consistent try/catch + generic client-facing errors + `console.error` server-side; fire-and-forget emails all have `.catch`. ✅

### Architecture debt (unchanged, non-blocking)
| File | Lines | Recommendation |
|------|-------|----------------|
| `web/src/lib/store.tsx` | 1,302 | Split into per-domain slices (auth, jobs, bids, chat, notifications) |
| `web/src/app/page.tsx` | 998 | Extract landing sections (Hero, HowItWorks, Pricing, Testimonials, Footer) |
| `web/src/lib/email.ts` | 686 | Extract shared HTML layout/template helper; each sender becomes ~10 lines |
| `jobs/[id]/route.ts` | 455 | Post-acceptance side-effects (chat room, notifications, emails) are duplicated between `accept` and `accept_best` — extract a `runPostAcceptance()` helper (would also serve offer-response) |

---

## 5. SCORES

| Layer | Score /10 | Notes |
|-------|-----------|-------|
| Web Frontend | 8 | Clean patterns; store.tsx/landing decomposition pending |
| Backend (Express microservices) | 7 | Not exercised by web app (web talks to Mongo directly); keep or remove to avoid drift |
| Security | 8.5 | 21/22 tracked issues fixed; N1 (admin key in bundle) is the one critical regression-class finding |
| Feature Completeness | 9.5 | 13/13 implemented; 2 with auth/race blemishes |
| **Overall** | **8.5** | Dramatic improvement over the July 1 audit |

---

## 6. PRIORITY ACTION ITEMS — ✅ ALL APPLIED (2026-07-02, same session)

| Rank | Item | Sev | Status |
|------|------|-----|--------|
| 1 | N1 — removed `lakshin123` from admin config page (now `••••••••`) | 🔴 | ✅ Fixed — **still rotate `ADMIN_SECRET_KEY`** since it shipped in earlier bundles |
| 2 | N3 — idempotency check on `razorpayPaymentId` before transaction insert | 🟠 | ✅ Fixed (replay returns the existing transaction) |
| 3 | N2 — atomic `findOneAndUpdate({offerStatus: "pending"})` on offer response; escrow created only after successful claim; 409 on lost race | 🟠 | ✅ Fixed |
| 4 | N4 — milestone `start` now requires `job.acceptedBy === userId` | 🟡 | ✅ Fixed |
| 5 | N5 — milestones GET now requires authentication (store fetcher sends token) | 🟡 | ✅ Fixed |
| 6 | N6 — bids GET now requires authentication (store fetcher sends token; `message` kept since client UI displays it) | 🟡 | ✅ Fixed |
| 7 | M7 — `checkAndConsumeAiQuota` added to `summarize-reviews` | 🟡 | ✅ Fixed |
| 8 | N7 — local `client_secret_*.json` deleted (was never git-tracked) | 🟢 | ✅ Fixed |
| 9 | N8 — mock payment verification rejected when `NODE_ENV === "production"` | 🟢 | ✅ Fixed |
| 10 | Extract shared post-acceptance helper (3 duplicated blocks) | 🟢 | ⏳ Deferred (refactor, non-security) |

`tsc --noEmit` passes after all fixes.

**Remaining manual step:** rotate `ADMIN_SECRET_KEY` in the deployment environment — the old value was exposed in previously shipped client bundles.
