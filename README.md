# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

![CI/CD](https://github.com/LakshinPathak/Geekbid/actions/workflows/ci.yml/badge.svg)

**Current version: v18** — A full sitewide visual retheme: "Royal Dark"
(navy/gold) → "Pastel Indigo" (cream/indigo), color and shape only, zero
backend/CRUD changes. See [What's in v18](#whats-in-v18).

**v17** — Real Free/Plus/Premium SaaS tiering: a single source-of-truth
plan config, quota enforcement on every plan-gated resource (not just free), pay-per-boost
featured-job monetization, and full Razorpay recurring subscription billing (code-complete,
pending real Razorpay Plans). Also on `main`/`master` — `v17` was fast-forwarded onto both
after a full API CRUD audit closed 7 real bugs (see [v17 refinements](#v17-refinements-post-phase-4)).
See [What's in v17](#whats-in-v17).

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [What's in v18](#whats-in-v18)
3. [What's in v17](#whats-in-v17)
4. [v17 refinements (post-Phase-4)](#v17-refinements-post-phase-4)
5. [Project Structure](#project-structure)
6. [Tech Stack](#tech-stack)
7. [Core Domain Model](#core-domain-model)
8. [Features](#features)
9. [Frontend Page Map](#frontend-page-map)
10. [API Reference (full)](#api-reference-full)
11. [Quick Start](#quick-start)
12. [Docker](#docker)
13. [Microservice Backend (experimental)](#microservice-backend-experimental)
14. [Deployment (Vercel)](#deployment-vercel)
15. [CI/CD Pipeline](#cicd-pipeline)
16. [Environment Variables](#environment-variables)
17. [Security](#security)
18. [Troubleshooting](#troubleshooting)
19. [Version History](#version-history)
20. [License](#license)

---

## How It Works

Traditional freelance platforms make clients wade through dozens of proposals, guess at fair rates, and negotiate endlessly. GeekBid flips this model.

1. **Client posts a job** — sets a starting price (e.g. $1,200), a floor price ($400), and a decay rate ($30/hour)
2. **Price decays automatically** — the listed price drops every hour until it hits the floor or a freelancer bids
3. **Freelancers bid the price down** — each counter-bid lowers the price further; the client accepts the best offer
4. **Everyone wins** — clients pay fair market rates, freelancers compete on quality not just price

```
$1,200 ────────────────────────────── Starting Price
         \
          \  ← decays at $30/hr
           \
$800        \──── Freelancer A bids $780 ← accepted!
             \
$400 ──────────────────────────────── Floor (never goes lower)
      ↑
   Posted   1h    2h    3h    4h
```

---

## What's in v18

A full sitewide visual retheme — "Royal Dark" (navy background, gold accent,
Fraunces serif, flat/sharp shapes) → "Pastel Indigo" (cream background, deep
indigo accent, sans-only, soft shadows, pill-shaped buttons/badges and
16px-radius cards). Scope was deliberately colors/shape only: every backend
route, CRUD flow, and piece of business logic is untouched.

**Source**: 4 Fable 5 mockup files (freelancer feed, job detail, landing
hero, open jobs/market intel) were analyzed in parallel by 4 sub-agents,
cross-checked for consistency, and distilled into a single token spec —
[`NEW_THEME.md`](./NEW_THEME.md) — including a full old→new hex mapping and
a WCAG contrast audit that caught (and corrected) several mockup color pairs
that would have failed AA at the text sizes they're actually used at.

**Execution**: a 9-phase plan on branch `v18` — `globals.css` foundation
(tokens, shared component classes, shape/shadow scale) → shared chrome (nav,
layout, fonts) → auth + marketing → feed & discovery → job lifecycle → people
& comms → money & account → admin → a final full-tree audit. Every phase was
verified live with Playwright (zero console errors) and committed
separately. Full page-by-page map, current-state CSS/hex audit, and the
9-phase execution plan: [`FRONTEND_PAGES.md`](./FRONTEND_PAGES.md).

**Bugs found along the way** (beyond the recolor itself):
- A `.glass-input` CSS rule picked up the universal pill-radius sweep, which
  is correct for single-line inputs but breaks `<textarea>` elements — a
  99px corner on a tall rectangle clips into an oval and slices off text.
  Affected 10+ textareas sitewide (message composers, dispute/review forms,
  bios, job descriptions). Fixed with a `textarea.glass-input` override.
- 6 plain `.ts` files (not `.tsx`) were silently skipped by the initial
  `*.tsx`-only sweep despite feeding pages already marked complete:
  `feed-helpers.ts` (job-card badge colors), `pricing.ts` (demand-level
  badge), `utils.ts`'s `GEEK_TIERS`, the Razorpay checkout theme color,
  the transactional email HTML templates, and the landing page's
  feature/testimonial data array.
- The `components/ui/*` shadcn primitives (Button, Card, Dialog, Input,
  Select, etc.) were listed as shared dependencies but never actually
  scheduled in any phase — caught in the final audit.
- Several rainbow/off-palette decorative colors (skill-tier badges, the
  GeekScore progress ramp, confetti, chart gradients) that predated this
  retheme were consolidated into the new single-accent-family palette for
  consistency.

---

## What's in v17

A full Free/Plus/Premium SaaS tiering rebuild, executed phase by phase per
[`SAAS_PHASED_EXECUTION_PLAN.md`](SAAS_PHASED_EXECUTION_PLAN.md) (companion to the full
design in [`GEEKBID_SAAS_BLUEPRINT.md`](GEEKBID_SAAS_BLUEPRINT.md)). Five phases, each
independently shippable:

### Phase 0 — Quick fixes
AI Bid Strategist now shows a toast instead of silently disabling itself when a
free-plan user is out of AI-bid uses; `planLimits` TypeScript type brought in sync with
fields already read/written at runtime; `splitEscrow()` wired to an explicit
`DEFAULT_PLATFORM_FEE_PERCENT` constant instead of a bare positional argument.

### Phase 1 — Foundation
`web/src/lib/plans.ts` is now the **single source of truth** for tier numbers —
`PlanTier`, `PlanConfig`, the `PLANS` record, and `getPlanConfig()` with backward-compat
mapping (`'pro'`→`plus`, `'enterprise'`→`premium`) built in from day one so a mid-deploy
rename never drops a paying user back to Free. Migration scripts
(`web/scripts/migrate-plan-names.mjs`, `migrate-plan-limits.mjs`, `verify-migration.mjs`,
`rollback-plan-names.mjs`) ran against the live DB — zero legacy values found, `planLimits`
backfilled on every user missing the new counters. New `GET /api/user/plan` route.

### Phase 2 — Enforcement
Every tier's caps are now actually enforced — previously only the free tier had any quota
checks at all, meaning Plus/Premium were unlimited by omission, not by design. Jobs, bids,
AI (general + Bid Strategist), teams, invites, and featured boosts all now cap correctly
per tier via atomic `findOneAndUpdate` checks. Three confirmed quota-bypass bugs closed:
direct-offer job creation had zero quota reference at all, the job-accept path inserted a
bid record with no quota check, and `POST /api/keys` had no plan gate or key-count cap.
New admin plan-override route (`PATCH /api/admin/users/[id]/plan`) with a
`plan_change_log` audit trail, and per-tier platform fee overrides in `admin/config`.
Frontend: pricing page, badges, and quota banners are now generated from `lib/plans.ts`
instead of hardcoded numbers.

### Phase 3 — Featured boost monetization
A client whose plan-included monthly featured boosts are exhausted (or whose tier has
none, i.e. Free) can pay a one-off $10 fee to feature a job anyway, reusing the existing
Razorpay one-off payment flow — no new payment infrastructure. The payment transaction is
tagged to the exact job and atomically claimed so it can't be replayed onto a different
job or a second boost.

### Phase 4 — Recurring subscription billing
Full Razorpay subscription lifecycle: create/checkout, cancel, and cycle-end plan changes
(`POST`/`GET`/`PATCH /api/subscriptions`); a signature-verified, idempotent webhook
endpoint (`POST /api/webhooks/razorpay`) implementing the full activated → charged →
past_due → halted/cancelled state machine; quota resets tied to the real billing cycle
for paying users instead of the calendar-month lazy-reset free users still use; clean
downgrade handling (LIFO API-key revocation, team seat freeze/over-limit flow with a
7-day owner deadline); a MongoDB-backed distributed rate limiter (replacing the old
in-memory `Map`, which under-counted once there was more than one server instance); 9
billing email templates; and daily reconciliation + 15-minute webhook-retry cron jobs.
**Code-complete and typechecked/built clean, but not yet live** — it needs real Razorpay
Plans created in their dashboard (`RAZORPAY_PLAN_ID_PLUS`/`RAZORPAY_PLAN_ID_PREMIUM`) and
end-to-end verification against a real Razorpay test account before real money should
move through it. Runs in mock mode until then, mirroring the existing one-off payment
flow's own mock-mode convention.

### New Free / Plus / Premium tiers

| | Free | Plus ($19/mo) | Premium ($79/mo) |
|---|---|---|---|
| Job posts/month | 3 | 50 | 500 |
| Bids/month | 10 | 100 | 500 |
| AI features/month | 5 | 50 | 200 |
| AI Bid Strategist/month | 2 | 15 | 60 |
| Featured boosts/month | 0 (pay-per-boost) | 2 | 5 |
| Team seats | 0 | 3 | 10 |
| Invites/month | 5 | 25 | unlimited |
| API access | No | Yes, 100 req/min | Yes, 500 req/min |
| Platform fee | 10% | 7% | 5% |

See [Plans](#plans-free--plus--premium) below for how this is enforced, and
[`SAAS_PHASED_EXECUTION_PLAN.md`](SAAS_PHASED_EXECUTION_PLAN.md) for the full phase-by-phase
checklist with what's done vs. pending.

---

## v17 refinements (post-Phase-4)

A round of hardening and polish on top of the Phase 0-4 SaaS work above, plus a full CRUD
audit of the entire API surface — done after Phase 4 shipped, before `v17` was fast-forwarded
onto `main`/`master`.

### Feed subscription widget + hardened checkout
A compact, upgrade-only subscription card (`components/feed/SubscriptionWidget.tsx`) now
lives directly on both feed dashboards instead of sending users to a separate page for
everything — downgrade/cancel intentionally stay on `/pricing` only, kept as deliberately
separate, less-frequent actions. The underlying Razorpay checkout is now properly
signature-verified end-to-end: `verifySubscriptionCheckoutSignature()`
(`lib/razorpay.ts`) checks the HMAC before a client-side "success" callback is ever trusted,
via a new `verify_checkout` action on `PATCH /api/subscriptions`. Also fixed a real bug where
`/pricing` and `FeaturedBoostModal` read a possibly-stale `accessToken` directly instead of
the store's auto-refreshing `getValidToken()`, causing "Access token expired or invalid"
errors, and a second bug where a successful plan upgrade updated the DB but not the cached
frontend user object until the next unrelated token refresh.

### Sitewide typography overhaul
Replaced the generic `Inter` (body) + bare `Georgia, Times New Roman, serif` (headings)
pairing — which read as an unconfigured default rather than a chosen identity — with
`Plus Jakarta Sans` + `Fraunces` (both self-hosted via `next/font/google`), applied
consistently across every page. Root-caused a genuinely subtle bug during this: CSS custom
properties only inherit **downward** (parent → child), so having `next/font`'s `variable`
classes on `<body>` while Tailwind's compiled `@theme` block resolves them on `<html>` (an
*ancestor* of body) meant the fonts silently never applied anywhere — fixed by moving the
`variable` classNames onto `<html>` in `layout.tsx`.

### Layout consistency
Ten pages (`notifications`, `profile`, `earnings`, `settings`, `payments`, `team`,
`assessments`, `my-jobs`, `post-job`, `profile/[id]`) were widened from various narrower
`max-w-*` values to match the feed page's `max-w-[1600px]`, and the navbar's inner container
(previously `max-w-7xl`) was widened to match, fixing a visible edge-to-edge misalignment on
wide screens. Two horizontal-scroll carousels with dead-space bugs
(`RecommendedCarousel`, `MyJobsSection`) were converted to responsive CSS grids. Deliberately
left narrower where that's correct UX: the inbox chat thread, the pricing 3-card grid, the
active quiz-taking view, and the create-team form.

### Landing page redesign
The reverse-auction price-decay mechanic — the whole product's hook — now gets its own
full-bleed, committed-color "live market terminal" section (`PriceDecayShowcase.tsx`): a
giant ticking price plus a scrolling bid-activity log, instead of a small widget tucked in
the hero corner. The repeated tiny-uppercase-tracked "eyebrow" label that sat above nearly
every section (a well-known generic-AI-landing-page tell) was removed sitewide in favor of
stronger, section-specific headline treatments. The page was also consolidated from ~9
scroll sections down to 5 — merging the "how it works" steps into the price-decay section,
deleting a redundant dashboard-mockup section, merging the comparison table and pricing
cards into one "why us + what it costs" section, and folding a trimmed FAQ into the final
CTA — cutting total page height by roughly 40% with no loss of content.

### Bug fixes
`AuctionVictoryModal`'s "View Contract"/"Message"/"Leave a Review" buttons appeared dead
because they were `<Link>`s to the exact route already open (a Next.js same-route
navigation is a no-op, so the modal never dismissed) — fixed with an explicit `onClick`
close handler. `CloudinaryAvatar` now falls back to the initials avatar if an external photo
URL (e.g. a Google account photo) fails to load, instead of rendering blank.

### Full API CRUD audit
Every one of the ~80 API route files was exercised end-to-end (real HTTP requests against a
running dev server, cross-checked against actual MongoDB writes, success **and** failure
paths) and 7 real bugs were found and fixed:

| Bug | Fix |
|---|---|
| **`GET /api/bids` leaked every bid on the platform** | Checked authentication only, not authorization — any logged-in freelancer could dump competitors' private bid prices/messages platform-wide. Scoped to bids the caller placed, or bids on jobs the caller posted (admin unrestricted) |
| **`GET /api/disputes` only visible to whoever raised it** | The other party on the transaction — who the dispute was raised *against* — had no way to ever see or respond to it. Now visible to both parties |
| **`POST /api/invites` had no job-ownership check** | Any authenticated client could invite freelancers to bid on a job that belonged to a *different* client. Added a 403 guard |
| **`POST /api/invites` had no open-status check** | Could invite a freelancer onto a cancelled/completed job. Added a 400 guard, matching the equivalent check already enforced on regular bids |
| **`admin/jobs` listing sorted by a field that doesn't exist** | Job documents only ever have `postedAt`, never `createdAt` — the "most recent jobs" admin view wasn't actually ordered by recency at all |
| **Malformed assessment IDs crashed to a bare 500** | Missing `ObjectId.isValid()` guard on both `GET` and `POST /api/assessments` — now a clean `400` |
| **Every transactional email showed a generic placeholder name** | `payments`, `transactions`, `milestones`, and `disputes` routes all looked up `user.name`, a field that doesn't exist on the schema (it's `fullName`) — payment/escrow/milestone/dispute emails never showed the real recipient name, always fell back to "Client"/"Freelancer"/"User" |

**Flagged, not fixed** (shared infrastructure, needs a deliberate call rather than a drive-by
edit): `getClientIp()` in `lib/sanitize.ts` trusts a client-supplied `X-Forwarded-For` header
unconditionally, so the login/refresh/switch-role rate limiters can be bypassed by spoofing
the header — the correct fix depends on the actual deployment's proxy topology (trusted
reverse proxy or not).

### Full-app live browser testing (14 more bugs)

Where the CRUD audit above exercised the API surface directly, this pass actually drove the
app in a real browser (Playwright) against a running dev server, logged in as real seeded
client/freelancer/admin accounts, clicking through every page and interactive element —
result documented row-by-row in [`CRUD_INTERACTION_TEST_PLAN.md`](./CRUD_INTERACTION_TEST_PLAN.md),
a 185-row MECE checklist covering both roles plus the full admin panel. Every fix below was
re-verified against the real database, not just a passing HTTP status.

| Bug | Fix |
|---|---|
| **`loadAllData()` 403'd on every client/admin page load** | Called the freelancer-only `/api/jobs/recommended` endpoint unconditionally for any logged-in user. Gated to `currentUser?.role === "freelancer"` |
| **Talent Pool's "Message" action 403'd on the exact case it exists for** | `POST /api/chat/rooms` required the target freelancer to already be associated with the job — but the client's own "message a freelancer about any of my jobs" picker offers jobs they haven't bid on yet. The job's own client is now exempt from that check (same trust level as Invite/Direct-Offer) |
| **Victory modal showed the wrong freelancer name after a client accepted a bid** | Re-derived the winner by re-sorting local `bids` state instead of using the backend's authoritative response — disagreed with the DB on a price tie. Reproduced live (modal said one freelancer, DB recorded another). `acceptJob` now returns the server's `freelancerId` directly |
| **Victory modal showed the wrong final price** | Used the job's live decaying market price instead of the actual awarded bid price — two independent numbers for a client `accept_best`. Reproduced live ($400 shown, $650 actually awarded). Now uses the server's authoritative `finalPrice` |
| **GitHub username silently discarded by profile "Save Changes"** | Missing from the `PATCH /api/user` field whitelist — confirmed via direct DB query the field was never persisted, despite the UI showing it as saved. Added to the whitelist, with `githubVerified` reset to `false` when the handle actually changes |
| **Clicking a notification never navigated anywhere** | Despite carrying a `jobId`. Now routes to `/jobs/{jobId}` on click |
| **Suspended users could still log in** | No `suspended` check in `loginUser`/`googleLoginUser` despite the admin UI claiming otherwise. Reproduced live (suspended a test account, login still succeeded), fixed, re-verified both directions (suspend blocks, restore un-blocks) |
| **Maintenance Mode had no effect** | Toggling it on and saving didn't block a single login. Reproduced live, fixed — non-admin logins now blocked with a 503 while admins retain access so the flag can always be turned back off |
| **Pricing page could fire a real downgrade disguised as an "Upgrade"** | A Premium user saw an active "Upgrade to Plus" button — clicking it would checkout a *lower* tier while already paying for a higher one (no prorated-downgrade path exists). Disabled for any tier below the user's current plan |
| **Soft-deleted users stayed fully visible/actionable in the admin Users list** | No "Deleted" indicator, all actions still live. `GET /api/admin/users` now excludes `deleted:true` by default |
| **Deleted users could still log in** | Same gap as the suspended-login bug, just never checked for `deleted`. Fixed in both login paths |
| **Admin Jobs page showed "NaNd ago" for every job** | Read `job.createdAt`, a field that doesn't exist on job documents (they use `postedAt`) — the same field-name mistake from the CRUD audit above, missed here including in the local TypeScript type |
| **Dispute resolution never moved any money** | Resolving a dispute as "Refund Client" or "Pay Freelancer" only updated the dispute record's cosmetic status — the linked escrow transaction stayed `held`. Reproduced live twice (before and after the fix, confirmed via direct DB query each time). The single most severe bug found across all testing this session |
| **`POST /api/disputes` doesn't exist at all** | Confirms the dispute-raising gap is a missing backend capability, not just a missing UI button — no path anywhere lets a user actually create a dispute |

**Flagged, not fixed** (real feature gaps, not quick wiring fixes — scoping decisions rather
than bugs): Forgot Password (dead stub, no reset flow exists), Delete Account (dead stub, no
`DELETE` endpoint exists), Edit Job (links to a blank creation form, no edit-mode support
anywhere), `accept_best` awarding the platform's lowest bid regardless of which bid row a
client clicks Accept on (reproduced live — needs a product decision on what per-row "Accept"
should mean), dispute creation (no backend route exists, per the bug above), and "Split
50/50" dispute resolution (no partial-payout mechanism exists anywhere in the app — a
transaction has exactly one recipient).

### Full-codebase code review (19 more bugs)

A systematic, file-by-file review of the whole codebase (partitioned across auth/security,
jobs/bids/pricing, payments/financial, AI/chat/misc APIs, and frontend), with the
highest-risk fixes re-verified live against a running dev server and the real database:

| Bug | Fix |
|---|---|
| **Mock payment flow always failed signature verification** | Signature check ran before the `isMock` branch and computed a real HMAC, which can never equal the literal `"mock_signature"` every mock caller sends — with Razorpay env vars unset, every payment and Featured Boost purchase failed. Mock orders now skip signature verification entirely |
| **Direct-offer jobs could be stolen by any freelancer** | Created with `status:"open"` and no `visibility` field, so they leaked into the public feed and could be accepted by anyone through the general accept flow before the intended recipient responded. Now `visibility:"invite_only"` and explicitly rejected by both the accept endpoint and bid placement |
| **Reviews could be forged against an unrelated stranger** | `revieweeId` was never cross-checked against the transaction's actual counterparty — any user with a completed job could tank a stranger's rating. Now must equal the other party on the same transaction |
| **GitHub "verification" proved nothing** | Only checked the username existed via GitHub's public API, then set `githubVerified:true` — anyone could claim any GitHub username. Replaced with a two-step proof-of-ownership challenge (add a one-time code to the GitHub bio, then confirm) |
| **Settings/Team/Assessments pages silently 401'd on long-idle tabs** | Read the access token straight from `localStorage` instead of the store's auto-refreshing `getValidToken()`. Now goes through the same refresh path as every other authenticated action |
| **Mock subscription cancellation never actually took effect** | Set `cancelAtPeriodEnd:true` but left `status:"active"` — mock subs have no webhook to flip it later, and the reconciliation cron explicitly skips them. Now applies the downgrade immediately for mock subs |
| **Milestone `start`/`submit` had no status guard** | Unlike `approve`, which was already atomically guarded — a freelancer could revert an approved/paid milestone back to `in_progress`, or double-submit. All three transitions are now atomically CAS-guarded on the required prior status |
| **Racy job-completion status transition** | Both completion endpoints did a bare `findOne` + unconditional `updateOne` — two concurrent complete requests could both pass the check and both fire duplicate summary emails. Now atomically claimed via `findOneAndUpdate` |
| **Team invite-accept had no existing-team guard** | Unlike team creation — a user already in Team A could accept an invite to Team B, leaving Team A's member list stale |
| **`POST /api/notifications` had no rate limit** | The one write endpoint in the app a caller could loop to spam their own notifications unboundedly. Capped at 20/minute |
| **Admin-secret-key check in `admin/users` had no rate limit** | Unlike the identical check in `admin/verify-key` — brute-forceable path to minting new admin accounts. Now rate-limited the same way |
| **TOCTOU on bid placement vs. job acceptance** | Job's "open" status was only checked once, several async round trips before the bid was actually inserted — a job could be accepted mid-request, leaving a stray bid on a closed job. Now re-checked immediately before insert |
| **Dead `in_progress` job-status branch** | `job.status` is never actually set to `"in_progress"` anywhere (only `milestone.status` is) — removed the unreachable check |
| **Timing side-channel on secret comparisons** | Admin-key and payment-signature checks used plain `===`. Now use `crypto.timingSafeEqual` via a shared `constantTimeEqual()` helper |
| **Unvalidated `disputeId` crashed to a bare 500** | Missing `ObjectId.isValid()` guard, unlike the sibling `transactions` route — now a clean 400 |
| **Admin role edit could desync from the dual-role `roles[]` array** | Setting `role` didn't touch `roles`, so `switch-role` could refuse to switch back into the role an admin just set. Now unions the new role into the existing array |
| **`require("mongodb")` inconsistency in chat messages** | One handler used `require()` instead of the codebase's `await import()`/static-import convention — a landmine if the route ever moves to the Edge runtime |
| **AI routes had no separation between instructions and user input** | Chat/description/quality-check/search/review-summary prompts concatenated user text directly alongside the app's own instructions. Added a `systemInstruction` channel (Gemini's dedicated, higher-weighted instruction slot) and explicitly labeled all user input as untrusted |
| **Assessments auto-submit effect had an incomplete dependency array** | Worked today only because the countdown timer forces a re-render every second, masking the missing deps — fixed to be correct regardless of timer implementation |

### Landing page polish

Removed the FAQ section (and its now-dead `FAQ.tsx` component/data) per product decision.
Fixed two background-color mismatches where a section explicitly overrode the page's
standard `#080b14` base with a different shade (`#050810` on the logo marquee strip,
`#060402` on the price-decay showcase section), both verified live via computed styles.

---

## What's in v16

Three threads: a premium visual redesign of the landing page and both feed dashboards,
a new dual-role account feature, and a batch of bug fixes found by actually clicking
through the app after the redesign (screenshots + live Playwright verification, not just
`tsc`/lint).

### Dual-role accounts + OAuth sign-in fix

Previously an account was locked to a single role forever — registering (password or
Google) with an email that already had an account always failed or, for Google sign-in,
silently logged you into your *original* role with zero warning, even if you'd deliberately
picked the other one.

| Change | Detail |
|---|---|
| **`User.roles: Role[]`** | New array alongside the existing `role` (the *active* role). Registering — by password or Google — with an email that already has an account now **adds** the newly-requested role instead of erroring or silently ignoring it, when it isn't already one of the account's roles |
| **Ownership check on the password path** | Adding a role to an existing password account requires that account's correct password — otherwise anyone could bolt a role onto a stranger's account just by knowing their email |
| **`POST /api/auth/switch-role`** | Flips which role is active for an account holding more than one, and mints a fresh token pair for it (the JWT bakes `role` in at sign time, so this can't be a bare DB update) |
| **Navbar role switcher** | Shows a "Switch to {role}" item once an account holds more than one role |
| **Fixed a related crash risk** | Password login against a Google-only account (`password: null`) now returns a clean error instead of throwing inside bcrypt's `compareSync` |

Full research trail (JWT/auth internals, every one of the 30+ backend role checks and
17+ frontend role branches touched by this) is in [`oauthfix_plan.md`](oauthfix_plan.md).

### Landing page & feed dashboard redesign

- Landing page (`web/src/app/page.tsx`, split from a 998-line monolith into ~15 focused
  components under `web/src/components/landing/`): gradient-mesh hero, 3D tilt product
  cards, glassmorphism panels, scroll progress bar, slot-machine stat counters, FAQ
  accordion. A "magnetic button" hover effect was built, then removed after it produced a
  janky rubber-band wobble in testing — plain buttons instead.
- Both feed dashboards (17 files under `web/src/components/feed/`) — glass-panel cards
  with tilt/glow effects, animated KPI count-up counters, skeleton loading states, empty
  states, a sliding tab indicator, GeekScore rings, medal rank badges, an advanced-filter
  drawer, and header ambient effects.
- Modal exit animations (`DirectHireModal`, `InviteToBidModal`, `MessageFreelancerModal`)
  — a real closing transition instead of an instant vanish, using new CSS keyframes and an
  `isClosing` state flag (no new dependency).
- All of it is CSS + `useRef`-driven (custom properties written imperatively, never React
  state, for 60fps) rather than a new animation library — see
  [`UI_ENHANCEMENT_PLAN.md`](UI_ENHANCEMENT_PLAN.md) for the bklit/motion.dev/Anime.js
  research behind that call (verdict: add a charting library only if real charts are
  needed later; skip the animation libraries, the hand-rolled approach already covers it).

### Bug fixes

| Bug | Fix |
|---|---|
| **QuickBid could violate the price floor** | `handleQuickBid` computed 2% below the *current* decayed price with no floor clamp — on a job already at/near its floor this asked for a price below `minimumPrice` and got rejected. Now clamps to the floor client-side, **and** `POST /api/bids` now enforces the same floor/ceiling server-side (previously unenforced there at all — a direct API call could place a bid below the client's floor) |
| **Counter-Bid panel looked broken at the floor price** | Once a job decays to its floor, `current === minimumPrice`, collapsing the Aggressive/Competitive suggestions, slider, and position bar to one meaningless point. Now shows a plain explanatory message and keeps just the price input live (a counter-bid at the floor is still a distinct action from Accept) |
| **`$` overlapping the counter-bid input** | A plain CSS rule's specificity was beating the Tailwind padding utility — forced with `pl-8!` |
| **Feed filter dropdowns didn't close** | Skills/Sort dropdowns on the freelancer feed had no outside-click or Escape handling at all |
| **Job detail page too narrow** | Container widened (`max-w-6xl` → `max-w-[1600px]`) to use the available width instead of leaving large dead margins on wide screens |
| **Duplicate-key React crash on the feed** | `ActiveBidsTracker`'s client-side fallback mapped every individual bid to a row without deduplicating by job — two bids on the same job (e.g. after using AI Bid Strategist's "Apply" suggestion) produced two rows sharing one React key. Now dedupes to one row per job, matching the server route's existing behavior |
| **`admin_verified` not cleared on logout** | A different client logging into the same browser tab could inherit the previous session's admin-panel gate bypass |

### Planning docs (superseded / partially implemented)

[`SAAS_SUBSCRIPTION_PLAN.md`](SAAS_SUBSCRIPTION_PLAN.md) and
[`SAAS_CRUD_IMPLEMENTATION.md`](SAAS_CRUD_IMPLEMENTATION.md) were the original v16-era
proposal for a Free/Plus/Premium redesign — kept for historical reference, but **superseded**
by [`GEEKBID_SAAS_BLUEPRINT.md`](GEEKBID_SAAS_BLUEPRINT.md) (the re-verified, corrected
design) and [`SAAS_PHASED_EXECUTION_PLAN.md`](SAAS_PHASED_EXECUTION_PLAN.md) (the phase-by-
phase execution checklist), which is what v17 actually implements — see
[What's in v17](#whats-in-v17). The UI-library research above remains undecided.

---

## Project Structure

GeekBid is a monorepo with **two independent backends** for the same domain model: the
Next.js app's own `src/app/api` routes (what actually runs in production/dev today) and a
parallel Express microservice stack (`backend/`, an architecture experiment — see
[Microservice Backend](#microservice-backend-experimental)).

```
Geekbid/
├── web/                                ← Next.js 16 app (the real app — port 3000)
│   ├── src/app/
│   │   ├── page.tsx                       Landing page (composes web/src/components/landing/*)
│   │   ├── login/                         Login + register (password & Google OAuth)
│   │   ├── feed/                          Role router → ClientFeed or FreelancerFeed
│   │   ├── jobs/[id]/                     Job detail — bids, counter-bid, AI strategist, escrow
│   │   ├── post-job/                      3-step job posting wizard (client)
│   │   ├── my-jobs/                       Client's posted jobs / freelancer's active bids
│   │   ├── profile/ , profile/[id]/       Own profile edit / public profile view
│   │   ├── inbox/ , notifications/        Chat + notifications
│   │   ├── payments/ , earnings/          Razorpay escrow checkout / freelancer earnings
│   │   ├── team/ , assessments/           Team seats / skill assessments
│   │   ├── pricing/ , settings/           Real Free/Plus/Premium checkout (v17) / account settings
│   │   ├── admin/                         7-section back office (see Features → Admin Panel)
│   │   └── api/                           ~80 REST route files — see API Reference
│   ├── src/components/
│   │   ├── landing/                       ~15 landing-page section components + hooks
│   │   ├── feed/                          17 client/freelancer dashboard components
│   │   ├── ai/                            AIBidStrategist widget
│   │   ├── modals/                        FeaturedBoostModal (v17), AuctionVictoryModal
│   │   ├── PlanLimitBanner.tsx             Reusable 80%+-quota-used banner (v17)
│   │   └── admin/                         AdminKeyGate, AdminSidebar
│   └── src/lib/
│       ├── auth.ts                        JWT (jose) + bcrypt + Google OAuth + dual-role logic
│       ├── store.tsx                       App-wide React Context — all client-side state/actions
│       ├── plans.ts                       Free/Plus/Premium tier config — single source of truth (v17)
│       ├── razorpay.ts                    Shared Razorpay REST helper + webhook signature verify (v17)
│       ├── rate-limit.ts                  MongoDB-backed distributed rate limiter (v17)
│       ├── plan-downgrade.ts              handleDowngrade() — API key/team cleanup on downgrade (v17)
│       ├── webhook-processing.ts          Razorpay subscription webhook state machine (v17)
│       ├── billing-emails.ts              9 subscription/billing email templates (v17)
│       ├── middleware/plan-header.ts      X-User-Plan header for cross-tab plan sync (v17)
│       ├── pricing.ts                     Price-decay + adaptive-pricing engine
│       ├── money.ts                        Integer-cent escrow-fee split math
│       ├── sanitize.ts                     Input sanitization (rate limiting moved to rate-limit.ts in v17)
│       ├── mongodb.ts                      Atlas connection singleton
│       ├── ai.ts                           Gemini SDK wrapper
│       ├── email.ts                        Resend transactional emails (20+ templates)
│       └── oauth-state.ts                  OAuth CSRF nonce + one-time exchange codes
│
├── backend/                            ← Express microservices (experimental, not the live app)
│   ├── services/gateway/                  Port 3000 — reverse proxy to the other 6
│   ├── services/auth-service/             Port 3001
│   ├── services/job-service/              Port 3003
│   ├── services/bidding-service/          Port 3004 (Socket.IO)
│   ├── services/payment-service/          Port 3005
│   ├── services/notification-service/     Port 3006
│   ├── services/chat-service/             Port 3007 (Socket.IO)
│   ├── common/                            Shared JWT/DB helpers across services
│   └── scripts/dev.js                     Boots all 7 services together
│
├── docker-compose.yml                  Web + backend + MongoDB, one command
├── GEEKBID_SAAS_BLUEPRINT.md            v17 SaaS tiering design — full schema/route detail
├── SAAS_PHASED_EXECUTION_PLAN.md        v17 phase-by-phase checklist (0-4), what's done vs pending
├── SAAS_SUBSCRIPTION_PLAN.md            Superseded by the two docs above — kept for history
├── SAAS_CRUD_IMPLEMENTATION.md          Superseded by the two docs above — kept for history
├── UI_ENHANCEMENT_PLAN.md               bklit/motion.dev/Anime.js research (plan only)
├── oauthfix_plan.md                     Dual-role/OAuth-fix research trail
├── V14_FIXES.md , V15_FIXES.md          Prior audit write-ups
├── geekbid_*.md                         Earlier security/bid-acceptance audit reports
└── README.md                            This file
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, "Pastel Indigo" design system — `#fbfaf7` cream bg, `#4b3f8f` indigo accent, `#3d3a45` text, Plus Jakarta Sans + IBM Plex Mono (v18 — see [What's in v18](#whats-in-v18); was "Royal Dark" navy/gold/Fraunces) |
| **UI Components** | Radix UI primitives, Lucide icons, Sonner toasts |
| **State** | React Context + `useCallback` (`web/src/lib/store.tsx`) — no external state library |
| **Auth** | JWT (`jose`), bcrypt (12 rounds), Google OAuth 2.0, HttpOnly refresh cookies, dual-role accounts |
| **Database** | MongoDB Atlas (native driver, no ORM) |
| **Image CDN** | Cloudinary — `next-cloudinary` (`CldImage`, `CldUploadWidget`), face-detect crop, WebP auto-format |
| **AI** | Google Gemini 2.0 Flash via `@google/generative-ai` — 8 gated routes |
| **Payments** | Razorpay escrow (order → verify → release) |
| **Email** | Resend (Nodemailer) — transactional emails for every key event |
| **Real-time** | Socket.IO — used by the microservice backend variant (bid decay broadcast + chat) |
| **Backend (experimental)** | Express.js microservices — gateway, auth, jobs, bidding, payments, notifications, chat |
| **CI/CD** | GitHub Actions — lint, typecheck, build, Docker |

---

## Core Domain Model

### Users & Roles

`User.role: 'client' | 'freelancer' | 'admin'` is the **active** role a session operates
as. As of v16, `User.roles: Role[]` tracks every role an account has ever been granted —
one email can hold both a client and a freelancer identity (see
[What's in v16](#whats-in-v16)). `admin` can never be self-granted through registration or
OAuth — only set directly in MongoDB or via another admin's `PATCH /api/admin/users/[id]`.

### Pricing Engine (`web/src/lib/pricing.ts`)

**Fixed pricing:**
```
currentPrice = max(startingPrice − decayRate × elapsedHours, minimumPrice)
```

**Adaptive pricing** (demand-aware — more bids = slower decay):
```
effectiveRate = decayRate × demandMultiplier(bidderCount)
currentPrice  = max(startingPrice − effectiveRate × elapsedHours, minimumPrice)

demandMultiplier:  0 bids → 1.0×  |  1-2 → 0.85×  |  3-4 → 0.7×  |  5+ → 0.55×
```

### GeekScore

Freelancer reputation, `0–1000`, five tiers (Newbie → 10x Engineer). Starts at `100` on
signup, `+50` per passed skill assessment, otherwise only admin-adjustable. Gates Direct
Hire (requires the target freelancer's GeekScore ≥ 500) and a "best value" bid highlight
for clients.

### Escrow & Money (`web/src/lib/money.ts`)

Every fee split is computed in **integer cents** (`splitEscrow(gross, feePercent)`),
guaranteeing `platformFee + netAmount === gross` — no floating-point drift reaching the
ledger. Funded via Razorpay (order → signature-verified capture → `transactions` doc with
`escrowStatus: "held"`), released in full on job completion or partially per approved
milestone.

### Plans (Free / Plus / Premium)

Single source of truth: `web/src/lib/plans.ts`. Every tier's caps are enforced with atomic
`findOneAndUpdate` checks on the resource being consumed — not just the free tier.

| | Free | Plus ($19/mo) | Premium ($79/mo) |
|---|---|---|---|
| Job posts/month | 3 | 50 | 500 |
| Bids/month | 10 | 100 | 500 |
| AI features/month | 5 | 50 | 200 |
| AI Bid Strategist/month | 2 | 15 | 60 |
| Featured boosts/month | 0 (pay-per-boost, $10) | 2 | 5 |
| Team seats | 0 | 3 | 10 |
| Invites/month | 5 | 25 | unlimited |
| API access | No | Yes, 100 req/min | Yes, 500 req/min |
| Platform fee | 10% | 7% | 5% (admin-overridable per tier) |

`getPlanConfig()` still accepts the legacy `'pro'`/`'enterprise'` values (mapped to
`plus`/`premium`) as a migration-safety net — `verify-migration.mjs` confirms zero users
actually hold a legacy value, but the mapping stays until Phase 5 removes it for good.
Recurring billing (subscribe → charge → grace period → downgrade) is code-complete as of
v17 but not yet live — see [What's in v17](#whats-in-v17).

---

## Features

### For Clients
- Post jobs in 3 steps with live price decay preview and adaptive pricing toggle
- Procurement Terminal — scrollable carousel of your active jobs with per-job bid panels
- Spend Analytics — budget posted, average bid, decay rate, savings from price drop
- Accept Best Bid — one click awards the job to the lowest bidder, creates escrow, fires emails
- Invite to Bid — invite specific freelancers from the Talent Pool
- Direct Hire — send a fixed-price offer to any freelancer with GeekScore ≥ 500
- Market Intelligence — average starting prices, decay rates, time-to-first-bid by category
- Escrow payments — funds held until you release or mark complete

### For Freelancers
- Mission Control — KPI bar (matches, bids used, win rate, earning potential)
- Recommended carousel — top skill-matched open jobs
- Active Bids Tracker — live rank, current price, cooldown timer
- Smart filters — search, category, budget range, competition, $/hr floor, multi-skill picker
- Sort modes — Best Match, Price low/high, Newest, Fewest Bids, Skill Match %
- Quick Bid — 2% below current price in one click, floor-clamped as of v16
- GeekScore — reputation that grows with successful jobs, ratings, and passed assessments

### AI Features (Google Gemini 2.0 Flash)
- **Bid Strategist** — 7-signal analysis (price, decay rate, demand multiplier, bid distribution, time remaining, competition, freelancer fit). Recommended bid, win probability, timing, risks
- **Bid Evaluator** — server-side bid ranking by value score (price + skill match + GeekScore + commitment), re-fetches data rather than trusting client input
- **Description Generator** — title + skills → a professional job description
- **Pricing Advisor** — recommends starting price, floor, and hourly decay rate
- **Quality Check** — reviews a draft posting before publishing
- **Smart Search** — natural-language query → structured filters
- **Chat Assist** — drafts a message for a given context
- **Summarize Reviews** — turns a freelancer's reviews into a strengths summary
- Tier-capped as of v17 — 5/50/200 general AI analyses per month (Free/Plus/Premium), 2/15/60 for Bid Strategist specifically; graceful degradation when Gemini is unavailable

### Admin Panel
- 2FA key gate — requires admin JWT + separate `ADMIN_SECRET_KEY`
- Dashboard — live MongoDB KPIs: users, open jobs, disputes, GMV, held escrow
- Users — full CRUD, soft-delete with reason, GeekScore/role override
- Jobs — full CRUD, status override, featured toggle, remove with reason
- Transactions — paginated table, Release Escrow and Refund with reason modal, CSV export
- Disputes — 4 resolution types: refund client, pay freelancer, split 50/50, dismiss
- Audit Logs — append-only log of every admin action
- Config — platform fee %, decay rate, maintenance mode, AI toggle, env var status grid

---

## Frontend Page Map

| Route | Who | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Login + register (role toggle, password or Google OAuth) |
| `/feed` | Auth | Router → `ClientFeed` (Procurement Terminal) or `FreelancerFeed` (Mission Control) by active role |
| `/jobs/[id]` | Auth | Job detail — price analytics, live bids, counter-bid, AI Bid Strategist, milestones |
| `/post-job` | Client | 3-step job posting wizard with live decay preview |
| `/my-jobs` | Auth | Client's posted jobs list, or freelancer's active-bid list |
| `/profile` | Auth | Edit own profile (skills, rate, availability, GitHub verification for freelancers) |
| `/profile/[id]` | Auth | View another user's public profile; Direct-Hire/Invite/Message actions if applicable |
| `/inbox` | Auth | Chat rooms tied to a job |
| `/notifications` | Auth | Notification list, mark read |
| `/payments` | Auth | Razorpay checkout UI + transaction history |
| `/earnings` | Freelancer | Transaction history + totals |
| `/team` | Auth | Create/join a team, invite members |
| `/assessments` | Freelancer | Skill assessments — pass one for `+50` GeekScore and a verified-skill badge |
| `/pricing` | Auth | Free/Plus/Premium comparison + real self-serve checkout (v17 — see [Plans](#plans-free--plus--premium)) |
| `/settings` | Auth | Account settings |
| `/admin` | Admin | Dashboard KPIs |
| `/admin/users` , `/admin/jobs` , `/admin/transactions` , `/admin/disputes` , `/admin/logs` , `/admin/config` | Admin | Back-office CRUD — see [Admin Panel](#admin-panel) |

---

## API Reference (full)

All routes live under `/api/`. "Bearer" means `Authorization: Bearer <access_token>` is
required. Every route file lives at `web/src/app/api/<path>/route.ts`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth` | No | `{action:"register"\|"login", name?, email, password, role?}`. `register` only allows `role: freelancer\|client`; if the email already has an account, adds the requested role to it instead of erroring (password must match) |
| GET | `/api/auth/me` | Bearer | Current user profile, read fresh from the DB |
| POST | `/api/auth/refresh` | Cookie | Silent token refresh (rate-limited 20/15min per IP) |
| POST | `/api/auth/logout` | Bearer | Revokes the refresh token, clears the cookie |
| POST | `/api/auth/switch-role` | Bearer | `{role}` — switches the active role for an account holding more than one, mints a fresh token pair |
| GET | `/api/auth/google` | No | `?role=freelancer\|client` — sets a CSRF state cookie, redirects to Google |
| GET | `/api/auth/google/callback` | No | Validates CSRF state, exchanges code, redirects with a one-time `?google_exchange=` code |
| POST | `/api/auth/google/exchange` | No | `{code}` → `{accessToken, user, expiresIn, roleAdded}` — single-use, 60s TTL |

### Jobs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | Optional | `?category=` — invite-only jobs hidden unless you're the client, an invited freelancer, or admin |
| POST | `/api/jobs` | Client | Create a job; tier-aware quota (v17: 3/50/500 per month by plan) enforced atomically, platform fee locked in at creation |
| GET | `/api/jobs/[id]` | No | Single job |
| PATCH | `/api/jobs/[id]` | Bearer | `action`: `accept` (freelancer) / `accept_best` (client, atomic, `409` on lost race) |
| PATCH | `/api/jobs/[id]/cancel` | Client (own job) or admin | Cancel an open job |
| PATCH | `/api/jobs/[id]/complete` | Client (own job) or admin | Mark complete, releases escrow, credits any pending referral |
| GET | `/api/jobs/recommended` | Freelancer | Skill-matched open jobs |
| GET | `/api/jobs/pricing-hint` | No | `?skills=` — market rate data for the post-job wizard |
| POST | `/api/jobs/direct-offer` | Client | Fixed-price offer; target freelancer must have GeekScore ≥ 500 |
| PATCH | `/api/jobs/offer-response` | Freelancer | Accept/decline a direct offer, atomic |
| PATCH | `/api/jobs/feature` | Client (own job) or admin | Toggle a job's `featured` flag (feed sorts featured jobs first) |

### Bids

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/bids` | Bearer | `?jobId=` — bids include freelancer IDs and private messages |
| POST | `/api/bids` | Freelancer | 30-min per-job cooldown; tier-aware quota (v17: 10/100/500 per month by plan) atomic; floor/ceiling enforced server-side |
| GET | `/api/bids/my` | Freelancer | Own bid history with job details |

### Public API (v1 — API-key auth)

For third-party integrations. Requires `X-API-Key` (generated via `/api/keys`), not a JWT.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/jobs` | `?status=&category=&page=&limit=` — paginated job list |
| POST | `/api/v1/jobs` | Create a job — same category whitelist + tier-aware quota as the internal API; requires `hasApiAccess` (Plus/Premium only) |

### Freelancer Dashboard

| Endpoint | Description |
|---|---|
| `GET /api/freelancer/dashboard` | KPIs: matched jobs, bids, win rate, earning potential |
| `GET /api/freelancer/bid-tracker` | Active bids with rank, price, cooldown (server dedupes to one row per job) |
| `GET /api/freelancer/earnings` | Transaction history + totals |
| `GET /api/freelancer/match-radar` | Skill gap analysis |
| `GET /api/freelancer/price-alerts` | Jobs nearing floor price |

### Client Dashboard

| Endpoint | Description |
|---|---|
| `GET /api/client/dashboard` | KPIs: jobs, budget, savings, avg bid |
| `GET /api/client/market-intel` | `?category=` — avg prices, top skills, time-to-bid |
| `GET /api/client/spend-analytics` | Spend breakdown by category |
| `GET /api/client/job-health` | Health matrix for open jobs |
| `GET /api/client/activity-feed` | Recent activity on the client's jobs |

### Payments, Transactions & Disputes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay order create/verify. `PATCH` re-fetches the captured amount from Razorpay, idempotent on `razorpayPaymentId`, rejects mock orders in production |
| GET | `/api/transactions` | Bearer | Own transactions (admin sees all) |
| PATCH | `/api/transactions` | Client or admin | Release or dispute escrow — atomic, only if currently `held` |
| GET | `/api/disputes` | Bearer | Own disputes (admin sees all) |
| PATCH | `/api/disputes` | Admin | Resolve — refund / pay / split / dismiss |

### Milestones, Reviews, Referrals & Assessments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/milestones` | Bearer | `?jobId=` — list milestones |
| POST | `/api/milestones` | Client | Create milestones for a job |
| PATCH | `/api/milestones` | Bearer | `action`: `start`/`submit` (assigned freelancer) / `approve` (client) — approving does a real partial escrow release |
| GET/POST | `/api/reviews` | Optional / Bearer | `?userId=` or `?jobId=` to read; POST to leave a review after job completion |
| GET | `/api/referrals` | Bearer | Referral code + stats; credits accrue when a referred freelancer completes their first job |
| GET/POST | `/api/assessments` | Optional / Bearer | List assessments (`?results=true` for own results) / submit answers — pass to gain `+50` GeekScore |

### Teams, Invites & API Keys

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/POST/PATCH | `/api/teams` | Bearer | Get own team / create one (one per owner) / `{action:"invite"\|"accept"}` |
| GET/POST/PATCH | `/api/invites` | Bearer | Client's sent invites or freelancer's received invites; respond to one |
| GET/POST/DELETE | `/api/keys` | Bearer | List (masked) / generate / revoke a personal API key for `/api/v1/*` |

### Chat & Notifications

| Endpoint | Description |
|---|---|
| `GET/POST /api/chat/rooms` | Chat rooms — creating one requires being one of the two participants, both tied to the job |
| `GET/POST /api/chat/messages` | Messages in a room — posting requires being a participant |
| `GET/PATCH /api/notifications` | Notifications list + mark read |
| `GET /api/notifications/count` | `{unread: N}` for the navbar badge |

### User Profile & Uploads

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/PATCH | `/api/user` | Bearer | Get/update the authenticated user's own profile |
| GET | `/api/users` | Bearer | List users (non-admin callers don't receive `email`) |
| GET | `/api/users/[id]` | No | Public profile — excludes email/password |
| POST | `/api/user/verify-github` | Bearer | Verifies a GitHub username, sets `githubVerified` + `githubData` |
| POST | `/api/upload/sign` | Bearer | Cloudinary signed-upload params (image formats only) |
| DELETE | `/api/upload/delete` | Bearer | Delete an image (ownership-verified) |

### AI Routes

All require Bearer auth, rate-limited 10/min per user, quota-capped per tier as of v17 (Bid
Strategist has its own separate, stricter cap). Gemini key is server-side only.

| Endpoint | Description |
|---|---|
| `POST /api/ai/bid-strategy` | `{jobId}` → optimal bid, win %, timing, risks |
| `POST /api/ai/evaluate-bids` | `{jobId}` → value scores, recommended bid — re-fetches server-side |
| `POST /api/ai/generate-description` | `{title, category, skills}` → job description |
| `POST /api/ai/pricing-advisor` | `{title, category, skills}` → starting price, floor, decay |
| `POST /api/ai/quality-check` | `{content}` → trustScore, flags, action |
| `POST /api/ai/smart-search` | `{query}` → parsed filters |
| `POST /api/ai/chat-assist` | `{command, jobContext}` → drafted message |
| `POST /api/ai/summarize-reviews` | `{reviews[]}` → summary + strengths + improvements |

### Admin Routes (admin role + `ADMIN_SECRET_KEY` required)

| Endpoint | Description |
|---|---|
| `GET /api/admin/stats` | Dashboard KPIs |
| `GET/POST /api/admin/users` | List users / create an admin user |
| `GET/PATCH/DELETE /api/admin/users/[id]` | User detail, update (incl. `role`), soft-delete |
| `GET /api/admin/jobs` | List jobs with filters |
| `PATCH/DELETE /api/admin/jobs/[id]` | Update job, remove with reason |
| `GET/PATCH /api/admin/transactions` | List transactions, release/refund |
| `GET/PATCH /api/admin/disputes` | List disputes, resolve |
| `GET /api/admin/logs` | Audit log |
| `GET/PATCH /api/admin/config` | Platform config read/write, incl. v17 per-tier `planFees` overrides |
| `GET /api/admin/config/env-status` | Env var presence check |
| `PATCH /api/admin/users/[id]/plan` | v17 — manual plan override, logs to `plan_change_log` |
| `POST /api/admin/verify-key` | Verify admin panel key (rate-limited 5/15min) |
| `GET/DELETE /api/email-logs` | Email send log — admin sees all, user sees own |

### Plans & Billing (v17)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/user/plan` | Bearer | Current plan config + remaining quota counts for every capped resource |
| GET/POST/PATCH | `/api/subscriptions` | Bearer | Current status / create + Razorpay checkout / cancel or change plan (mock mode until real Razorpay Plans exist) |
| POST | `/api/webhooks/razorpay` | Signature | Subscription lifecycle webhook — HMAC-verified, idempotent |
| GET | `/api/cron/reconcile-subscriptions` | `Bearer $CRON_SECRET` | Daily — corrects DB/Razorpay drift, sweeps expired grace periods + team seat deadlines |
| GET | `/api/cron/retry-webhooks` | `Bearer $CRON_SECRET` | Every 15 min — retries `webhook_events` stuck in `failed` |

### Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/seed` | Admin* | Wipes and reseeds all collections. *No auth required only on a completely empty, non-production database — see [Seed the database](#4-seed-the-database) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Git

### 1. Clone

```bash
git clone https://github.com/LakshinPathak/Geekbid.git
cd Geekbid
```

### 2. Environment variables

```bash
cd web
cp .env.example .env.local   # then fill in the values below
```

`web/.env.local`:

```env
# Required
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.wpsakax.mongodb.net/geekbid?retryWrites=true&w=majority
NEXTAUTH_SECRET=<at-least-32-char-random-string>   # generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
ADMIN_SECRET_KEY=<your-admin-panel-password>

# Cloudinary (image CDN)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=geekbid_unsigned

# AI
GEMINI_API_KEY=your-gemini-key
AI_MODEL=gemini-2.0-flash

# Optional
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_PLAN_ID_PLUS=plan_your_plus_id       # v17 — subscriptions run in mock mode without these
RAZORPAY_PLAN_ID_PREMIUM=plan_your_premium_id
CRON_SECRET=any-random-string                 # v17 — required by /api/cron/*
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
RESEND_API_KEY=re_your_key
```

### 3. Install & run

```bash
npm install
npm run dev
# → http://localhost:3000
```

Other scripts (`web/package.json`):

```bash
npm run build   # production build (next build)
npm run start   # run the production build (next start --port 3000)
npm run lint    # eslint
```

### 4. Seed the database

`/api/seed` requires an authenticated admin — the one exception is a completely empty
local database: since registration can't create an admin account directly (`role` is
restricted to `freelancer`/`client`), the very first seed on a fresh, non-production
database is allowed without auth so it can create the seeded `admin@geekbid.io` account.
Every seed after that requires that admin's token.

```bash
# First time on a fresh database — no auth needed, this is what creates admin@geekbid.io
curl -X POST http://localhost:3000/api/seed

# Any time after that, log in as the seeded admin and re-seed with its token
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","email":"admin@geekbid.io","password":"admin123"}'
# → copy "accessToken" from the response

curl -X POST http://localhost:3000/api/seed \
  -H "Authorization: Bearer <accessToken>"
```

In production, `/api/seed` is disabled outright unless `ALLOW_SEED=true` is set — and even
then still requires an admin token once any user exists.

### 5. Test accounts

| Role | Email | Password |
|------|-------|----------|
| Client | `maya@startup.io` | `password123` |
| Client | `derek@fintech.co` | `password123` |
| Freelancer | `arjun@devmail.io` | `password123` |
| Freelancer | `priya@secmail.io` | `password123` |
| Admin | `admin@geekbid.io` | `admin123` |

> **Admin panel:** Log in as admin → navigate to `/admin` → enter the `ADMIN_SECRET_KEY` value when prompted

### 6. Useful one-off commands

```bash
# Quick type-check without a full build
cd web && npx tsc --noEmit

# Kill whatever's on 3000 and restart dev
lsof -ti:3000 | xargs kill -9 && npm run dev

# Clean rebuild after a pull
cd web && rm -rf .next node_modules && npm install && npm run dev
```

---

## Docker

```bash
# From repo root — starts web, backend microservices, and MongoDB
docker-compose up          # foreground
docker-compose up -d       # background
docker-compose down        # stop everything
docker-compose down -v     # stop + wipe the MongoDB volume
```

| Service | URL | Notes |
|---------|-----|-------|
| Web app | http://localhost:3002 | Next.js — port 3002 because the backend gateway owns 3000 in this compose file |
| Backend gateway | http://localhost:3000 | Reverse proxy to the 6 microservices |
| MongoDB | localhost:27017 | Local instance, seeded from an empty volume |

Every env var the web container needs is declared as both a build `arg` (baked in at
`next build` time) and a runtime `environment` var (needed by server-side route handlers)
in `docker-compose.yml` — see the file's comments if you add a new one, since missing it
from either spot causes a silent failure rather than an obvious error.

If you use Google OAuth with Docker, add both redirect URIs to Google Cloud Console →
Credentials → Authorized redirect URIs:
```
http://localhost:3002/api/auth/google/callback   (Docker)
http://localhost:3000/api/auth/google/callback   (npm run dev)
```

---

## Microservice Backend (experimental)

`backend/` is an architecture experiment — the same domain model (auth, jobs, bidding,
payments, notifications, chat) reimplemented as 7 separate Express services behind a
gateway, with Socket.IO for live bid/chat updates. **It is not the app that's live or that
this README's Quick Start sets up** — the Next.js app under `web/` owns all product
functionality today. Full detail on the partial-wiring attempt lives on the
`v13_with_microservice_half_code` branch.

```bash
cd backend
npm install
npm run start          # boots all 7 services together via scripts/dev.js

# Or run one service in isolation:
npm run start:gateway
npm run start:auth
npm run start:jobs
npm run start:bidding
npm run start:payments
npm run start:notifications
npm run start:chat
```

| Service | Port |
|---|---|
| Gateway | 3000 |
| Auth | 3001 |
| Jobs | 3003 |
| Bidding (Socket.IO) | 3004 |
| Payments | 3005 |
| Notifications | 3006 |
| Chat (Socket.IO) | 3007 |

---

## Deployment (Vercel)

The live app is `web/` — a standard Next.js project living in a subdirectory of this
monorepo. Vercel is the recommended host: connecting its GitHub App means every push to
`main`/`master` auto-deploys to production and every pull request gets its own preview
URL, with no custom deploy scripting or GitHub Actions secrets required for deployment
itself (see [CI/CD Pipeline](#cicd-pipeline) below for why that workflow file has no
deploy job).

**One-time setup:**

1. Go to [vercel.com/new](https://vercel.com/new) and import the `LakshinPathak/Geekbid` GitHub repo (installs Vercel's GitHub App the first time — this is the "necessary GitHub-side" step; it can't be scripted from the repo itself, it's a one-time OAuth grant through Vercel's UI).
2. In the import screen, set **Root Directory** to `web` (this is a monorepo — the Next.js app isn't at the repo root). Vercel auto-detects the framework and build/output settings correctly once the root is set.
3. Add every variable from [Environment Variables](#environment-variables) under Project Settings → Environment Variables, for both **Production** and **Preview**. Two need real (not localhost) values once deployed:
   - `NEXTAUTH_URL` → your production domain, e.g. `https://geekbid.vercel.app`
   - If using Google login, add the deployed callback URL to Google Cloud Console → Credentials → Authorized redirect URIs: `https://<your-domain>/api/auth/google/callback`
4. Click Deploy. From then on:
   - Push to `main`/`master` → production deploy
   - Open a PR → preview deploy with its own URL, posted as a PR comment

No Vercel API token or project ID needs to live in this repo or in GitHub Actions
secrets — the GitHub App integration handles the connection entirely on Vercel's side.

---

## CI/CD Pipeline

`.github/workflows/ci.yml` runs on every push to `main`/`master`/`v*` and every PR
targeting `main`/`master`. It's a quality gate that runs independently of the Vercel
deploy above — Vercel does its own build/deploy on push regardless of whether this
workflow passes, so treat a red check here as "don't merge this," not "the site is down."

| Job | What it checks |
|---|---|
| **Code Quality** | `npm run lint` (currently non-blocking — see the file's comment on the pre-existing lint backlog) and `npx tsc --noEmit` |
| **Build** | A real `next build` against placeholder env values, to catch build-time regressions (missing imports, broken routes, etc.) before they reach Vercel |
| **Backend Check** | `node --check` syntax validation on every experimental microservice's entry file |
| **Docker Build** | Builds both the `web` and `backend` Docker images (main/master only) — a sanity check that Docker-based self-hosting stays possible, not part of the actual deploy path |

To require these checks before merging (branch protection), go to the repo's Settings →
Branches → Add rule for `main`, and require the `Code Quality` / `Build` / `Docker Build`
status checks to pass. Not enabled by default today — direct pushes to `main` are still
allowed.

---

## Environment Variables

### `web/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (32+ chars, use `openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` for local dev |
| `ADMIN_SECRET_KEY` | Yes | Admin panel 2FA key |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret — server only |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Yes | Upload preset name |
| `GEMINI_API_KEY` | Yes | Google Gemini API key — server only |
| `AI_MODEL` | No | Gemini model ID (default: `gemini-2.0-flash`) |
| `GOOGLE_CLIENT_ID` | No | Enables Google Login |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `RAZORPAY_KEY_ID` | No | Payments + subscriptions (mock mode if absent) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | No | v17 — verifies `POST /api/webhooks/razorpay`'s HMAC signature; that route fails closed (rejects) if unset |
| `RAZORPAY_PLAN_ID_PLUS` / `RAZORPAY_PLAN_ID_PREMIUM` | No | v17 — real Razorpay Plan IDs for recurring billing; `/api/subscriptions` runs in mock mode until both are set |
| `CRON_SECRET` | No | v17 — bearer secret required by `/api/cron/reconcile-subscriptions` and `/api/cron/retry-webhooks` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No | Same value as `RAZORPAY_KEY_ID`, exposed to the browser for Razorpay Checkout |
| `RESEND_API_KEY` | No | Transactional email |
| `ALLOW_SEED` | No | Set to `true` to allow `/api/seed` in production. Never a substitute for admin auth |

This list must stay in sync with the `ARG`s declared in `web/Dockerfile` and
`docker-compose.yml`'s `web` service — `next build` imports every route module, so a
missing var here can mean a silent Cloudinary/AI/email failure or an unset admin key that
only surfaces at runtime instead of at setup time.

---

## Security

Audit reports, oldest to newest:
- [`web/SECURITY_AUDIT.md`](web/SECURITY_AUDIT.md) — NoSQL injection, ReDoS, brute-force, IDOR sweep (v10)
- [`geekbid_bid_acceptance_and_system_audit.md`](geekbid_bid_acceptance_and_system_audit.md) — job acceptance, escrow, chat, OAuth, payment-integrity sweep (v11)
- [`geekbid_review_2026-07-02.md`](geekbid_review_2026-07-02.md) — verification of all v11 fixes + admin-key exposure, payment replay, offer race, API auth gaps (v12)
- [`V15_FIXES.md`](V15_FIXES.md) — atomic quota & escrow races closed, rate limiting extended (v15)
- [`oauthfix_plan.md`](oauthfix_plan.md) — dual-role/OAuth research + fix (v16)
- [`GEEKBID_SAAS_BLUEPRINT.md`](GEEKBID_SAAS_BLUEPRINT.md) — SaaS tiering design, incl. webhook idempotency, quota-bypass closure, migration rollback strategy (v17)
- Full API CRUD audit (v17 refinement) — every route exercised end-to-end, 7 bugs closed: a bid-list authorization leak, a one-sided dispute-visibility bug, two missing invite guards (ownership + open-status), a recency-sort bug, a crash-to-500 on malformed IDs, and a broken-recipient-name bug across 4 transactional-email call sites. See [v17 refinements](#v17-refinements-post-phase-4)
- Full-app live browser testing (v17 refinement) — 14 more bugs closed, including two account-standing bypasses (suspended and soft-deleted users could both still log in, neither was ever checked), an authorization gap on Talent Pool messaging, and dispute resolution silently never releasing or refunding the actual escrowed funds despite reporting "resolved." See [`CRUD_INTERACTION_TEST_PLAN.md`](./CRUD_INTERACTION_TEST_PLAN.md)

Summary of protections in place:

| Layer | Protection |
|-------|-----------|
| Auth | JWT (jose), bcrypt 12 rounds, HttpOnly refresh cookies, dual-role password ownership check |
| OAuth | CSRF `state` nonce validated on Google login callback; tokens handed off via one-time exchange code, never a URL query string |
| Rate limiting | 10 login attempts / 5 admin-key attempts per IP per 15 min; 10/min per user on every AI route; 20/15min per IP on token refresh + switch-role; tier-aware per key on the public v1 API. v17: MongoDB-backed (`lib/rate-limit.ts`), not in-memory, so the limit holds across multiple server instances |
| Input sanitization | `sanitizeString`, `sanitizeObjectId`, `sanitizeSearchRegex` on all user input |
| NoSQL injection | `$`-prefix keys stripped; all inputs forced to primitive types before DB queries |
| ReDoS | `sanitizeSearchRegex()` escapes all regex metacharacters before `$regex` use |
| IDOR | All mutations check ownership (clientId/freelancerId === userId from JWT) |
| Chat authorization | `/api/chat/rooms` and `/api/chat/messages` require the caller to be a participant |
| Escrow integrity | Job acceptance, escrow release/dispute, and milestone partial-release all use atomic, state-guarded updates |
| Quota integrity | v17: every tier's job/bid/AI/team/invite/API-key/featured-boost caps are atomic `findOneAndUpdate` checks, not just free's |
| Bid floor/ceiling | Enforced server-side in `POST /api/bids`, not just client-side |
| Payment verification | Payment amounts verified against Razorpay's captured amount server-side; v17 subscription webhooks are HMAC-signature-verified (fail closed) and idempotent per event id |
| ObjectId | All `new ObjectId()` calls guarded by `sanitizeObjectId()` — returns 400 not 500 |
| Admin panel | Requires admin role JWT + separate `ADMIN_SECRET_KEY` (2FA) |
| Secrets | `NEXTAUTH_SECRET` throws at startup if missing — no hardcoded fallbacks |

---

## Troubleshooting

**Empty feed after login** — see [Seed the database](#4-seed-the-database) above; if the database already has users, you'll need an admin token, not just a bare `curl`.

**Port 3000 in use**
```bash
lsof -ti:3000 | xargs kill -9 && npm run dev
```

**Build errors after pull**
```bash
cd web && rm -rf .next node_modules && npm install && npm run dev
```

**Stale auth after secret change** — clear cookies and localStorage, then log in again.

**"Encountered two children with the same key" on the feed** — fixed in v16; if you see it again on a fork/older checkout, see the duplicate-key fix under [What's in v16](#whats-in-v16).

---

## Version History

| Branch/tag | Description |
|--------|-------------|
| `v18` | **Latest** — full sitewide visual retheme, "Royal Dark" (navy/gold) → "Pastel Indigo" (cream/indigo), color/shape only, zero backend or CRUD changes. Sourced from 4 Fable 5 mockups distilled into a token spec with a WCAG contrast audit, executed in 9 phases across every page (client/freelancer/admin) with live Playwright verification per phase. Found and fixed a `.glass-input` bug that pill-radius'd textareas into text-clipping ovals, 6 plain `.ts` files a `*.tsx`-only sweep had skipped, and the shadcn `components/ui/*` primitives never being scheduled in any phase (see [What's in v18](#whats-in-v18), [`NEW_THEME.md`](./NEW_THEME.md), [`FRONTEND_PAGES.md`](./FRONTEND_PAGES.md)) |
| `v17` | **Latest — also `main`/`master`** — real Free/Plus/Premium SaaS tiering (`lib/plans.ts` source of truth, tier enforcement on every plan-gated resource, 3 quota-bypass bugs closed, admin plan overrides + per-tier fee config, pay-per-boost featured-job monetization, full Razorpay recurring subscription billing code), plus a post-Phase-4 refinement round: sitewide typography overhaul, layout consistency fixes, a redesigned/consolidated landing page, a full API CRUD audit closing 7 bugs, and a full-app live browser testing pass (185-row MECE checklist, both roles + admin) closing 14 more, most notably dispute resolution silently never moving any escrowed money (see [What's in v17](#whats-in-v17), [v17 refinements](#v17-refinements-post-phase-4), and [`CRUD_INTERACTION_TEST_PLAN.md`](./CRUD_INTERACTION_TEST_PLAN.md)) |
| `v16` | Landing page + feed dashboard visual redesign, dual-role accounts (`roles[]` + `/api/auth/switch-role`), OAuth role-mismatch fix, and bug fixes (QuickBid floor violation, Counter-Bid-at-floor UI, feed duplicate-key crash, job detail layout) |
| `v15` | Audit-driven fixes over v14: atomic AI-quota/milestone-escrow checks, rate limiting on AI/refresh/v1 routes, token-refresh race fix, `.env.example` brought in sync, root error/loading boundaries |
| `v14` | Correctness/reliability fixes over v12: exact integer-cent money math, cross-tab auth sync, hardened Mongo singleton, no error leaks |
| `v13_with_microservice_half_code` | Experiment — partial wiring of the Next.js frontend to the Express microservices via a gateway/BFF (reference only) |
| `v12` | Admin-key exposure fix, payment replay protection, direct-offer race fix, API auth gaps closed |
| `v11` | Job/escrow/chat/OAuth security hardening, payment verification, referral & milestone payout fixes |
| `v10` | Admin panel, initial security hardening, Cloudinary CDN, Gemini AI |
| `v9` | Role-based feeds, landing page animations, CRUD fixes |
| `v7` | Royal Dark design system, horizontal carousels |
| `v5` | Mobile responsiveness, port pinning |
| `v4` | Live auction UX, feed differentiation, Docker |

---

## License

Private — All rights reserved © GeekBid
