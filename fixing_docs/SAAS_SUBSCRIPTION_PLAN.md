# GeekBid — SaaS Subscription Tiers: Free / Plus / Premium

Status: **DRAFT FOR REVIEW** — no code has been changed yet. Everything below is a proposal;
sections marked **OPEN DECISION** need your call before implementation starts.

## 1. Why this doc exists

You want GeekBid run as a proper SaaS with three subscription tiers — **Free, Plus, Premium**
— each with different pricing and different unlocked capabilities. The immediate trigger was
the AI Bid Strategist silently disabling itself once the free quota (2 uses/month) is hit,
with no explanation to the user of *why* or *what to do about it*.

This plan is based on a full read of the codebase's existing monetization code (not guesses),
covers the tier/pricing design itself, and includes a phased engineering plan for how to wire
it up for real. Two research passes and one technical-design pass went into this.

## 2. What already exists today (audit findings)

This matters because a fair amount of scaffolding is already half-built:

- **A 3-tier system already exists in the type system**: `User.plan?: 'free' | 'pro' | 'enterprise'`
  (`web/src/lib/utils.ts:60`). We'd rename `pro`→`plus`, `enterprise`→`premium` rather than
  build from scratch.
- **A `/pricing` page already exists** (`web/src/app/pricing/page.tsx`) with a hardcoded
  3-tier comparison table — Free ($0), Pro ($29/mo), Enterprise ($99/mo) — bullet lists of
  features, and a "MOST POPULAR" tag. **The Upgrade/Contact Sales buttons have no click
  handler at all.** Clicking them does nothing. This page is effectively a mockup.
- **A working one-off Razorpay payment flow exists** (`web/src/app/api/payments/route.ts`,
  `web/src/app/payments/page.tsx`) — but it's for funding job escrow, a single purchase.
  **There is no recurring subscription billing anywhere in the codebase.** No webhook
  endpoint, no `/api/subscriptions` route. This is the biggest real gap between "what the
  pricing page promises" and "what actually happens when you click upgrade."
- **Existing plan-gated limits** (free tier only — paid tiers are currently just "unlimited,"
  unenforced):
  - Job posts: 3/month (`web/src/app/api/jobs/route.ts`)
  - Bids placed: 10/month (`web/src/app/api/bids/route.ts`)
  - General AI features (6 of the 8 AI routes — chat-assist, evaluate-bids,
    generate-description, quality-check, pricing-advisor, smart-search): 5/month
    (`web/src/lib/ai-plan-limit.ts`)
  - AI Bid Strategist specifically: 2/month, its own separate stricter cap
    (`web/src/app/api/ai/bid-strategy/route.ts`)
- **The frontend already displays** paid-tier numbers (50 bids/month for "pro", 200 for
  "enterprise" — `web/src/components/feed/FreelancerFeed.tsx:154`) that **the backend does
  not actually enforce** — pro/enterprise users get truly unlimited bids today. This is a
  real bug independent of the rebrand: the displayed number is decorative.
- **The advertised per-tier platform fee (10%/7%/5%) is not wired up** — `splitEscrow()`
  (`web/src/lib/money.ts`) always charges the flat 10% regardless of the payer's plan.
- **A ready-to-use paid feature nobody's using yet**: `Job.featured` field + a working
  `PATCH /api/jobs/feature` endpoint that already makes the feed sort featured jobs first
  (`web/src/app/api/jobs/route.ts:44`) — but there's no payment/plan gate on it and no UI
  button anywhere calls it. This is a "free win" for a premium feature.
- **Team/multi-seat accounts already exist** (`web/src/app/api/teams/route.ts`,
  `web/src/app/team/page.tsx`) — any user can create a team and invite unlimited members
  today, no seat cap.
- **`sonner` toasts are already used elsewhere** (e.g. `FreelancerFeed.tsx`), so the AI Bid
  Strategist notification fix (§4) reuses an existing, established UI pattern — nothing new
  to introduce.

## 3. Proposed tier structure

Everything numeric below is a **starting proposal**, not a final answer — you know your
market/unit economics, I don't. Treat the numbers as placeholders to edit directly in this
file.

| | **Free** | **Plus** | **Premium** |
|---|---|---|---|
| **Price** | $0 | **$19/mo** *(was $29 on today's mock pricing page — proposing lower to widen the funnel; adjust freely)* | **$79/mo** *(was $99)* |
| **Job posts/month** (clients) | 3 | 50 *(not literally infinite — see Open Decision A)* | 500 (effectively unlimited) |
| **Bids/month** (freelancers) | 10 | 100 | 500 (effectively unlimited) |
| **General AI actions/month** (chat-assist, evaluate-bids, generate-description, quality-check, pricing-advisor, smart-search) | 5 | 50 | 200 |
| **AI Bid Strategist uses/month** | 2 | 15 | 60 |
| **Platform fee** (on escrow funding) | 10% | 7% | 5% |
| **Featured job boosts included/month** | 0 (pay-per-boost only, see §5) | 2 included | 5 included |
| **Team seats** | 1 (no team) | 3 | 10 |
| **Analytics** (SpendAnalytics, MarketIntel, CompetitorAnalysis, JobHealthMatrix) | Full access *(kept free for everyone — see Open Decision B)* | Full access | Full access + priority "pricing insight" recommendations |
| **API access** (`/api/v1/jobs`) | Not available | Available | Available, higher rate limit |
| **Support** | Community/email | Priority email | Priority email + dedicated |
| **Badge** | none | "Plus" badge | "Premium" badge |

### Open Decision A — how "unlimited" should really work
The current code's "pro/enterprise = fully unlimited" is actually an *enforcement gap*, not
a deliberate design (the frontend already shows finite numbers for these tiers that the
backend just doesn't check). I'm proposing **real, generous, but finite caps** for Plus/Premium
instead of true infinity, purely as abuse protection (nothing stops someone from scripting
10,000 job posts against an "unlimited" free-of-rate-limit tier otherwise). If you'd rather
truly promise "unlimited" as a selling point, that's a one-line config change (see §6) — just
flagging that "unlimited" and "very high cap" read identically to a real user but very
differently to your infra costs.

### Open Decision B — should analytics be a paid differentiator?
Right now every analytics component (spend analytics, market intel, competitor analysis,
job health) is open to all users regardless of plan. Common SaaS pattern: keep basic stats
free, put deeper/predictive insights behind a paywall. I've defaulted to **not** taking
anything away from free users (safer for retention/trust — nobody likes losing a feature they
already had), and instead making Plus/Premium's value be *more quota + lower fees + featured
placement* rather than *analytics you can no longer see*. If you want analytics itself to be
a tier lever, tell me which specific panel to lock and I'll fold it in.

### Open Decision C — is AI Bid Strategist a Plus feature or Premium-exclusive?
Your original message said "for this you need premium tier" specifically. The table above
treats it as unlocked-more-at-every-paid-tier (Plus: 15/mo, Premium: 60/mo). If you instead
want AI Bid Strategist to be a **Premium-only** feature (Plus users still capped at, say, 5/mo
same as a token taste), that's an easy change to the cap table — just tell me and I'll adjust
the toast copy in §4 to say "Upgrade to Premium" instead of "Upgrade to a paid plan."

### Open Decision D — Premium: self-serve or "Contact Sales"?
Today's mock pricing page has Enterprise as a "Contact Sales" tier (no self-checkout). If
Premium is meant to be self-serve like Plus (pay $79/mo, click a button, done), the checkout
flow in §5 covers both identically. If Premium should stay a sales-assisted tier (custom
pricing, negotiated), that changes the `/pricing` page's Premium button to a contact form
instead of a checkout — cheap either way, just needs a decision.

## 4. Immediate fix: AI Bid Strategist limit-reached notification

This is small, isolated, and safe to ship on its own before any of the bigger billing work —
happy to do this one right now if you want, independent of the rest of the plan.

**Today**: `web/src/components/ai/AIBidStrategist.tsx` disables the button once the free quota
is hit and shows a small inline "(Free limit reached)" label. Because the button is
HTML-`disabled`, clicking it does *nothing* — no toast, no explanation fires.

**Proposed fix**:
- Stop disabling the button via the HTML `disabled` attribute for the quota-reached case
  (keep disabling only while `loading`).
- On click, check the quota-reached condition first: if hit, fire a `sonner` toast (the same
  library/pattern already used in `FreelancerFeed.tsx`) instead of running the analysis:
  > **"AI limit reached"** — "Only 2 free AI suggestions are available. Upgrade to a paid
  > plan for more." *(copy adjusts automatically once Open Decision C is answered)*
- Keep the existing inline "(Free limit reached)" label too — the toast is the *active*
  explanation on click, the label is the *passive* always-visible cue. Both together is good
  UX.
- Same toast pattern can be reused for the other 6 general-AI routes' quota-exceeded
  responses as a follow-up consistency pass, once this one is proven out.

## 5. Featured job boosts (an already-half-built feature to finish)

`Job.featured` + `PATCH /api/jobs/feature` already work and the feed already ranks featured
jobs first — there's just no gate and no button. Two ways to monetize it, can do both:

1. **Included perk**: Plus/Premium clients get N free boosts/month (2 and 5 respectively per
   §3's table), tracked with the same atomic counter pattern already used for job/bid limits.
2. **Pay-per-boost**: any client (including Free tier) can pay a one-off fee (e.g. $5–15/boost
   — your call) to feature a single job, reusing the *existing* one-off Razorpay payment flow
   (not the new subscription system — this is a single purchase, simpler and lower-risk to
   ship first).

Recommend shipping pay-per-boost first (smallest, most isolated change, no dependency on the
bigger subscription-billing work) and the included-perk version once real subscriptions exist.

## 6. Engineering implementation plan (phased)

Full technical detail (exact files, migration script design, webhook security, state
machine for failed renewals, etc.) is captured below; this section is the executive summary.

**Phase 0 — ship now, no schema/billing dependency, very low risk:**
- AI Bid Strategist toast fix (§4)
- Fix `planLimits` type definition to match what's actually stored in Mongo (currently the
  TypeScript type is missing 3 fields the runtime code already reads/writes — pure type-safety
  fix, zero behavior change)
- Wire the per-tier platform fee into `splitEscrow()` (function already accepts the parameter,
  just isn't being passed one — one-line-ish fix)

**Phase 1 — the rename + a single source of truth for limits:**
- Create one new config file (`web/src/lib/plans.ts`) holding every tier's numbers (job cap,
  bid cap, AI caps, fee %, seat cap) — today these are scattered as magic numbers across 6+
  files. This turns every future "just change the number" request into a one-file edit.
- Rename `'pro'→'plus'`, `'enterprise'→'premium'` across ~12 confirmed call sites (full list
  below in the technical appendix)
- One-time Mongo migration script to convert existing users' `plan` field, run *before*
  deploying the renamed code

**Phase 2 — make paid-tier limits real:**
- Replace "anything non-free = fully unlimited" with real tier-aware caps at every
  enforcement point (jobs, bids, both AI quotas), so the numbers shown to users are the
  numbers actually enforced
- Team seat caps by tier

**Phase 3 — featured-job pay-per-boost (§5 option 2):**
- Smallest monetization win, reuses existing payment infra, no dependency on Phase 4/5

**Phase 4/5 — real recurring billing (the big one, scope as its own follow-up project):**
- New `subscriptions` Mongo collection + `/api/subscriptions` routes (create/cancel) using
  Razorpay's **Subscriptions API** (a distinct product from the one-off Orders API already
  integrated)
- New `POST /api/webhooks/razorpay` endpoint — signature-verified, idempotent, handles
  renewal/failure/cancellation events and flips `User.plan` accordingly
- Grace-period logic for failed renewal payments (a few days before downgrading to Free)
- Wire the `/pricing` page's dead Upgrade buttons to actually open Razorpay checkout
- This phase is meaningfully bigger than everything else combined (new state machine, new
  security-sensitive webhook surface, and the app currently has zero scheduled-job/cron
  infrastructure, which the grace-period expiry check needs) — recommend treating it as its
  own dedicated project once tiers/pricing/limits above are finalized and Phases 0–3 have
  shipped.

### Full technical appendix (file-level detail)

<details>
<summary>Click to expand — exact files, migration script design, webhook security notes</summary>

**Rename call sites** (all read/write `user.plan === "pro"/"enterprise"` literals):
`web/src/lib/utils.ts:60`, `web/src/lib/ai-plan-limit.ts:20`,
`web/src/app/api/ai/bid-strategy/route.ts:37,70`, `web/src/app/api/jobs/route.ts:106-127`,
`web/src/app/api/v1/jobs/route.ts:135-158`, `web/src/app/api/bids/route.ts:92-113`,
`web/src/components/feed/FreelancerFeed.tsx:154`,
`web/src/app/api/freelancer/dashboard/route.ts:45-48`,
`web/src/components/feed/TalentPool.tsx:122`, `web/src/components/feed/MyJobsSection.tsx:71`,
`web/src/app/profile/[id]/page.tsx:123`, `web/src/app/pricing/page.tsx:6-57`,
`web/src/app/api/seed/route.ts:794` (needs updating for new `planLimits` shape, not a string
rename).

**Migration script** (`scripts/migrate-plan-names.mjs`, run manually, not a Next.js route):
```js
await db.collection('users').updateMany({ plan: 'pro' }, { $set: { plan: 'plus' } });
await db.collection('users').updateMany({ plan: 'enterprise' }, { $set: { plan: 'premium' } });
```
Idempotent by construction; print before/after counts. Must run *before* the renamed code
deploys (old DB values falling through to no matching branch should fail open/generous, not
lock users out — confirm this is the desired failure mode during cutover).

**New `subscriptions` collection shape:**
```
{ _id, userId, plan: 'plus'|'premium', razorpaySubscriptionId, razorpayPlanId,
  status: 'created'|'active'|'past_due'|'halted'|'cancelled'|'completed',
  currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, gracePeriodEndsAt?,
  createdAt, updatedAt, lastWebhookEventId? }
```

**Webhook security essentials** (`POST /api/webhooks/razorpay`):
- Verify `X-Razorpay-Signature` via HMAC-SHA256 over the **raw** request body (must read via
  `req.text()` before JSON parsing — reserializing parsed JSON can produce byte-different
  output and silently break signature verification, a common real-world Razorpay bug).
- Reject any missing/invalid signature with 400, fail closed — this endpoint is unauthenticated
  by design (Razorpay calls it directly, no user session), so the signature is the *only*
  trust boundary.
- Store each webhook event's id and no-op on redelivery (Razorpay retries webhooks) —
  same idempotency principle already used for `razorpayPaymentId` in the existing one-off
  payment flow.
- `.env.example` already declares `RAZORPAY_WEBHOOK_SECRET` even though no webhook endpoint
  exists yet — this was clearly anticipated and never finished.

**Grace-period state machine on renewal failure:**
1. First `payment.failed` webhook → `status: 'past_due'`, `gracePeriodEndsAt = now + 3–7 days`
   (pick a number), keep paid access during grace period, send a "payment failed, please
   update billing" email.
2. Retry succeeds (`subscription.charged` while `past_due`) → back to `active`.
3. `subscription.halted` webhook, or grace period passes with no successful charge →
   downgrade `User.plan` to `'free'`, send a "you've been downgraded" email.
4. No cron infra exists today — the "grace period passed, no webhook ever arrived" case needs
   either a real scheduled job (Vercel Cron / GitHub Action, depending on deploy target) or a
   lazy check-on-next-login fallback (cheaper to ship, less correct for inactive users).

**Risks to keep in mind throughout:**
- The in-memory rate limiter (`web/src/lib/sanitize.ts`) does not share state across server
  instances — fine for its current best-effort abuse throttling, but must not become the thing
  any plan-limit correctness logic depends on. The atomic Mongo `findOneAndUpdate` pattern
  already used for job/bid/AI caps is what's actually load-bearing, and that pattern should
  be reused for every new cap in this plan.
- No admin UI exists today to manually override a user's plan (useful for support/comping
  during rollout/testing) — worth adding a small admin-only control as part of the billing
  phase even though not explicitly requested.

</details>

## 7. What I need from you

Please review §3's pricing/limits table and the four **Open Decisions** (A–D), and either
edit this file directly or just tell me your answers/adjustments in chat. Once that's settled
I can start on Phase 0 (which needs no decisions at all — safe to do immediately if you want)
and then Phase 1 once the tier names/numbers are locked.
