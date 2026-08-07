# v15 — audit-driven race-condition, rate-limiting & reliability fixes over v14

v15 **is v14** plus fixes for every High/Medium finding from the full codebase audit
that could be safely made and verified in-repo (`tsc --noEmit`, `eslint`, and a full
`next build` all pass). **No feature or architecture changes.**

Full audit findings (including what's confirmed solid, not just what's broken) are
summarized below; three Medium items are called out as explicitly deferred, with why.

---

## 1. Atomic AI quota — closes a quota-bypass race

**Problem:** both `checkAndConsumeAiQuota()` (used by 7 of 8 AI routes) and the
separate counter in `POST /api/ai/bid-strategy` read the current month's usage count,
compared it to the free-plan limit, and only *then* wrote the incremented value back —
two round-trips with no atomic guard. Two concurrent requests (double-click, retried
request, or a script) could both read "under the cap" before either write landed,
granting more free-tier AI calls than the limit allows.

**Fix:** both now use a single atomic `findOneAndUpdate` with a `$lt`-guarded filter,
the same pattern already used correctly by `/api/jobs` and `/api/bids` for their
monthly caps — the check and the increment happen as one indivisible database
operation, so a concurrent request either can't match the filter (quota exhausted) or
increments correctly, with no window in between. Each quota now tracks its own reset
timestamp (`planLimits.aiMonthResetAt` / `aiBidMonthResetAt`) instead of overloading the
`planLimits.monthResetAt` field the job/bid quotas already use independently, so
resetting one quota can never skip or double-fire another's reset.

- `web/src/lib/ai-plan-limit.ts`
- `web/src/app/api/ai/bid-strategy/route.ts`

## 2. Atomic milestone escrow release — closes a double-release race

**Problem:** `PATCH /api/milestones` (`action: "approve"`) checked
`!milestone.escrowReleased` against a read taken at the top of the request, then later
read-computed-wrote the transaction's `releasedAmount`. Two concurrent "approve" calls
for the *same* milestone (double-click, retried request) could both pass the check
before either write landed, releasing that milestone's escrow share twice.

**Fix:** the milestone now atomically claims its own release right first
(`findOneAndUpdate` with an `escrowReleased: { $ne: true }` guard) before touching the
transaction; the transaction update is additionally compare-and-swapped on the exact
`releasedAmount` it read, so two *different* milestones on the same job releasing
concurrently can't stomp each other's update either.

- `web/src/app/api/milestones/route.ts`

## 3. Rate limiting on previously-unthrottled routes

**Problem:** `checkRateLimit` (already in `sanitize.ts`) was only wired into login and
admin-key-verify. All 8 AI routes (each calls an external Gemini API — cost, not just
load), `POST /api/auth/refresh`, and the public `X-API-Key`-authenticated
`/api/v1/jobs` had no throttling at all.

**Fix:** added per-user throttling (10 req/min) to all 8 AI routes, per-IP throttling
(20 req/15min) to `auth/refresh`, and per-API-key throttling (60 req/min) to both
`GET` and `POST /api/v1/jobs`.

**Bonus fix found while in this file:** `POST /api/v1/jobs` had the same
check-then-write race as items 1–2 above on its `jobsPostedThisMonth` cap — a plain
`updateOne($inc)` with no guard, unlike the internal `/api/jobs` route which already
used the atomic pattern. Brought in line with it.

- `web/src/app/api/ai/{bid-strategy,chat-assist,evaluate-bids,generate-description,pricing-advisor,quality-check,smart-search,summarize-reviews}/route.ts`
- `web/src/app/api/auth/refresh/route.ts`
- `web/src/app/api/v1/jobs/route.ts`

## 4. Token refresh no longer drops concurrent requests

**Problem:** `store.tsx`'s `silentRefresh()` used a boolean ref to prevent overlapping
refresh calls — but a second caller arriving mid-refresh got `null` back *immediately*
instead of the token the in-flight call was about to fetch. Since most call sites do
`if (!token) return;`, any fetch racing the ~15-minute refresh window silently no-op'd.

**Fix:** the in-flight refresh is now stored as a shared promise; concurrent callers
`await` the same promise and get the real token once it resolves, instead of `null`.

- `web/src/lib/store.tsx`

## 5. Removed a data-fetch waterfall

**Problem:** `loadAllData()` awaited `fetchJobs()` then `fetchBids()` sequentially
before even starting the `Promise.all` batch of the other 9 fetches — two avoidable
round-trips on every page load.

**Fix:** both now join the same `Promise.all` as everything else.

- `web/src/lib/store.tsx`

## 6. `web/.env.example` now documents every required variable

**Problem:** it listed only Mongo/NextAuth/Google/Razorpay vars. Missing entirely:
Cloudinary (5 vars), Gemini/`AI_MODEL`, `ADMIN_SECRET_KEY`, `RESEND_API_KEY`,
`NEXT_PUBLIC_RAZORPAY_KEY_ID` — all of which `web/Dockerfile`'s `ARG` list and
`.github/workflows/ci.yml`'s `build` job already require. A dev following just this
file would hit silent Cloudinary/AI/email failures or an unset admin key.

**Fix:** regenerated to match the Dockerfile ARG list exactly, with a comment noting
the two must stay in sync.

- `web/.env.example`

## 7. Root-level `error.tsx` / `loading.tsx`

**Problem:** zero `error.tsx`/`loading.tsx`/`not-found.tsx` existed anywhere under
`web/src/app` — any uncaught render error fell through to Next's default unstyled
error screen, and there was no shared loading fallback.

**Fix:** added a branded `error.tsx` (retry + go-home, matches the existing
glass-panel/gold-accent design language) and a minimal `loading.tsx` spinner at the
app root.

- `web/src/app/error.tsx` (new)
- `web/src/app/loading.tsx` (new)

---

## What the audit confirmed was already solid (no action needed)

- **Instant Hire race condition** (fixed pre-v15): `jobs/[id]/route.ts`'s accept /
  accept_best both correctly use `findOneAndUpdate` with a `status: "open"` guard — the
  exact pattern items 1–3 above needed to be brought up to.
- **Payment verification**: HMAC signature check, real payments cross-verified against
  the Razorpay API for order match + captured status, mock payments hard-blocked in
  production, idempotent on `razorpayPaymentId`.
- **OAuth flow**: proper CSRF nonce cookie + one-time 60s exchange code, token never
  sits in a redirect URL.
- **Admin key**: the client-side `AdminKeyGate` is UI-only; the actual privileged
  action (creating a new admin user) is separately gated server-side against
  `ADMIN_SECRET_KEY`.
- **Seed route**: safe re-seeding, correctly access-gated, and creates the real
  MongoDB indexes the app's queries need — the "missing indexes" concern didn't hold up.
- **Email system**: `email.ts` has a proper shared-layout helper set; the "duplicated
  HTML templates" debt note didn't hold up either.
- **`backend/` Express services**: confirmed genuinely unused by the running app and
  correctly documented as an intentional (not accidentally dead) scaffold.
- All 13 features in `FEATURE_BUILD_LIST` verified wired end-to-end against source.

## Explicitly deferred (not in v15) — and why

- **Real staging/production deploy steps.** `.github/workflows/ci.yml`'s
  `deploy-staging`/`deploy-production` jobs are still `echo` placeholders. Needs a
  hosting-target decision (Railway/Render/Fly/other) and repo secrets access neither of
  which is a code change.
- **Splitting the landing page (`web/src/app/page.tsx`, 998 lines) into a server shell
  + client islands.** The page's animations (scroll-triggered fades, the testimonial
  carousel, the live price-decay demo) are intertwined enough that a safe split needs
  visual verification in a real browser. This environment has no browser/screenshot
  tool — only `tsc`, `eslint`, and `next build` — which can confirm the split compiles
  but not that it *looks and behaves* right. Rewriting the highest-traffic page in the
  app on build-success-alone felt like the wrong risk/verification tradeoff, so it was
  left as documented debt rather than attempted blind.
- **Rotating `ADMIN_SECRET_KEY`.** An infra/env action in the deployment host, not a
  code change — nothing in the repo to do here.

---

## Files changed vs v14
```
web/src/lib/ai-plan-limit.ts                         atomic quota + own reset field
web/src/lib/store.tsx                                shared refresh promise; parallel loadAllData
web/.env.example                                      full var list matching Dockerfile ARGs
web/src/app/error.tsx                                 (new)
web/src/app/loading.tsx                               (new)
web/src/app/api/milestones/route.ts                   atomic escrow-release guard
web/src/app/api/v1/jobs/route.ts                       rate limit + atomic job-quota fix
web/src/app/api/auth/refresh/route.ts                 rate limit
web/src/app/api/ai/bid-strategy/route.ts              atomic quota + rate limit
web/src/app/api/ai/chat-assist/route.ts               rate limit
web/src/app/api/ai/evaluate-bids/route.ts             rate limit
web/src/app/api/ai/generate-description/route.ts      rate limit
web/src/app/api/ai/pricing-advisor/route.ts           rate limit
web/src/app/api/ai/quality-check/route.ts             rate limit
web/src/app/api/ai/smart-search/route.ts              rate limit
web/src/app/api/ai/summarize-reviews/route.ts          rate limit
```

## Recommended next (not in v15)
- Deploy-stage implementation once a hosting target is chosen.
- Landing-page server/client split, done with an actual browser available for
  before/after visual verification.
- Rotate `ADMIN_SECRET_KEY` in the deployment environment.
- Move in-memory rate-limiting / OAuth exchange codes to Redis before running >1
  instance (carried over from the v14 notes — still true).
