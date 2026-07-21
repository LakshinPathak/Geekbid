# GeekBid

**The market sets the rate. Automatically, live, in public.**

*Pitch memo — deep technical version. Bracketed items (`[…]`) are placeholders only the
team can fill in (traction numbers, funding ask, market-size figures that need a current
citation) — everything outside brackets is either a mechanic implemented and running in
this repository today, or an explicitly labeled roadmap item.*

---

## 0. One-liner

GeekBid is a reverse-auction marketplace for technical freelance work: clients post a job
with a starting price that **decays automatically over time**, freelancers race to accept
the falling price or counter-bid it down further, and the whole price history — every bid,
every tick — is visible to every participant in real time. It replaces the blind
proposal-pile model (Upwork, Fiverr, Freelancer.com) with a live, continuous
price-discovery mechanism, and replaces the vetting-gate model (Toptal, Braintrust) with an
algorithmic, verifiable reputation signal (GeekScore) instead of a manual interview funnel.

---

## 1. The Problem, Precisely

Every incumbent freelance platform has the same structural defect: **price discovery
happens once, privately, and both sides negotiate blind.**

- A client posts a job with no real signal for what it should cost. They either overpay
  (anchor too high, freelancers happily take it) or underpay (anchor too low, get ghosted
  by anyone competent).
- A freelancer submits a proposal into a black box. They don't know what else was bid, how
  many competitors there are, or whether the client is even still looking.
- Neither side has continuous information. The "price" is whatever got negotiated in a
  single private DM thread, not a market-cleared number.

This isn't a UX problem solvable by a better proposal inbox. It's a **market design**
problem: there is no mechanism forcing price convergence, so both sides operate on stale
priors and the platform captures none of the efficiency gain a real market would generate.

**Why now:** the freelance/contractor labor market for software specifically has scaled
past the point where manual vetting (Toptal's model: interview funnel, ~3% acceptance
rate) can serve volume, while the low-trust, high-volume side of the market (Upwork/Fiverr)
has scaled proposal *volume* without ever fixing proposal *quality* or price
*discovery*. `[cite current freelance-platform GMV and YoY growth from a primary source
before using this in an actual deck — do not use unverified figures in an investor
conversation]`.

---

## 2. The Insight

Auction theory already solved this class of problem — just not applied to labor
marketplaces at the individual-gig level. A **Dutch auction** (descending price, first
acceptor wins) has three properties that map exactly onto freelance hiring's failure
modes:

1. **Price discovery is continuous, not one-shot.** The clearing price is whatever moment
   a freelancer decides the current price is good enough to accept or beat — not a
   negotiated compromise between two anchoring biases.
2. **Time pressure is structural, not artificial.** Every hour a client waits, the price
   they'll eventually pay drops — so clients aren't incentivized to sit on proposals for
   weeks, and freelancers aren't incentivized to lowball immediately (they can wait and see
   if the price falls to them without bidding at all).
3. **Information is symmetric by construction.** Because the descending price is public
   and every counter-bid is visible to every other bidder, neither side can exploit a
   private information advantage the way a DM-based negotiation allows.

GeekBid's actual product bet is narrow and falsifiable: **for a large class of scoped
technical work, a transparent decaying-price mechanism converges to a fairer clearing price
faster than a private proposal negotiation does** — and that convergence is worth more to
both sides than whatever "vetting theater" Toptal-style platforms charge a premium for.

---

## 3. Product Walkthrough

### 3.1 Posting a job (client)

The client sets exactly three numbers:

| Parameter | Example | Constraint |
|---|---|---|
| Starting price | $1,200 | Upper bound of the auction |
| Floor price | $400 | Hard lower bound — **never** crossed, by construction (see §4.1) |
| Decay rate | $30/hr | Slope of the descending price line |

An AI Pricing Advisor (Gemini 2.0 Flash, server-side) suggests all three from the job's
title/skills/category if the client has no priors — this matters because the entire
mechanic depends on the starting parameters being roughly sane; garbage-in-garbage-out on
the price band would undermine the whole pitch.

### 3.2 The price, live

```
Fixed mode:     currentPrice = max(startingPrice − decayRate × elapsedHours, floor)

Adaptive mode:  effectiveRate = decayRate × demandMultiplier(uniqueBidderCount)
                currentPrice  = max(startingPrice − effectiveRate × elapsedHours, floor)

                demandMultiplier: 0 bids → 1.0× | 1–2 → 0.85× | 3–4 → 0.7× | 5+ → 0.55×
```

The adaptive mode is the more interesting mechanism design point: **decay rate is itself a
function of revealed demand**, computed off `uniqueBidderCount` specifically (not raw bid
count) to resist a single freelancer inflating apparent demand by bidding repeatedly on
their own job. This is a direct anti-gaming measure baked into the pricing formula itself,
not bolted on as a moderation rule afterward.

### 3.3 Bidding (freelancer)

Three actions, each a real API call against the live price at the moment of the request
(never a client-cached value — see §4.1 for why that matters):

- **Accept** — locks in the job at the exact current price, atomically
- **Counter-bid** — any value in `[floor, currentPrice)`, immediately visible to every
  other viewer of the job, updates the job's `lowestCounterBid` demand signal
- **QuickBid** — one-click shortcut, `max(floor, currentPrice × 0.98)` — floor-clamped so
  the one-click path can never itself violate the client's stated minimum

A 30-minute per-freelancer-per-job cooldown between bids exists as a rate limiter on the
mechanism itself, distinct from API abuse rate limiting (§4.3) — it stops one freelancer
from mechanically ratcheting the price down against themselves faster than the market
would organically converge.

### 3.4 Client's decision + AI-assisted evaluation

The client isn't obligated to take the lowest bid. An AI Bid Evaluator re-fetches every
live bid and bidder profile **server-side** (a deliberate trust boundary — it never scores
off client-submitted data, precisely so a malicious client can't feed it a fabricated bid
history to justify overpaying a favored bidder) and produces a composite value score:
price, skill-match percentage, GeekScore, and commitment signals (bid recency, message
quality).

### 3.5 Settlement: escrow-first, not invoice-after

The moment a bid is accepted, payment is captured into escrow via Razorpay — computed in
**integer cents** end-to-end (`platformFee + netAmount === gross` is an invariant enforced
by construction, not by rounding after the fact — chained floating-point math like
`458 * 0.1 === 45.800000000000004` never reaches the ledger). Funds release in full on
completion or per-milestone for staged engagements. The freelancer is never working against
an unsecured promise.

---

## 4. Technical Architecture & Why It's Defensible

A YC technical partner's first question about any marketplace is "what stops this from
being cloned in a weekend." The honest answer for the *UI* is "nothing" — the defensibility
is in the parts that are hard to get right under concurrent load, not the parts that are
easy to screenshot.

### 4.1 Concurrency correctness on every money-adjacent write

Every state transition that touches money or a scarce resource is an atomic
`findOneAndUpdate` with a guard filter, not a read-then-write:

```ts
// Job acceptance — two clients racing to accept the same bid cannot both win
db.collection("jobs").findOneAndUpdate(
  { _id: jobId, status: "open" },            // guard: only succeeds once
  { $set: { status: "accepted", ... } }
);

// Free-plan quota enforcement — concurrent requests cannot jointly exceed the cap
db.collection("users").findOneAndUpdate(
  { _id: userId, "planLimits.bidsPlacedThisMonth": { $lt: 10 } },
  { $inc: { "planLimits.bidsPlacedThisMonth": 1 } }
);

// Milestone escrow release — cannot double-release the same milestone
db.collection("milestones").findOneAndUpdate(
  { _id: milestoneId, escrowReleased: { $ne: true } },
  { $set: { escrowReleased: true } }
);
```

This pattern is applied uniformly across job acceptance, direct-offer accept/decline, bid
and job-post quota enforcement, AI usage quota (both the shared 5/month cap and Bid
Strategist's own stricter 2/month cap), and milestone partial-release — every place two
concurrent requests could otherwise both "win" a resource that should only be grantable
once. This class of bug (TOCTOU race in a marketplace's accept-a-bid path) is exactly the
kind of defect that doesn't show up in a demo and does show up the first time you have real
concurrent traffic — it was found and fixed across the codebase's audit history (`V15_FIXES.md`,
`geekbid_bid_acceptance_and_system_audit.md`).

### 4.2 Auth architecture: stateless JWT with a server-verified reputation layer

- Access/refresh JWT pair (`jose`, HS256), 15-minute access token expiry, 7-day refresh,
  refresh tokens rotated and stored server-side (DB-backed, not purely stateless) so a
  compromised refresh token can be revoked.
- **Dual-role accounts** (shipped v16): `User.roles: Role[]` alongside a single *active*
  `role` baked into the JWT at sign time. Adding a second role to an existing account
  requires proof of ownership — the account's own password for the password path, a fresh
  Google re-auth for OAuth — closing what would otherwise be an account-takeover vector
  (anyone could "claim" a role on a stranger's account just by knowing their email).
  Switching which role is active mints a fresh token pair rather than mutating a DB flag
  underneath a live session, because every one of the ~30 backend authorization checks
  trusts `payload.role` from the token, not a live DB read.
- OAuth CSRF protection via a signed state nonce validated against an httpOnly cookie, and
  token handoff via a **one-time exchange code** (60-second TTL) rather than putting an
  access token in a redirect URL, where it would land in browser history and server access
  logs.

### 4.3 Defense in depth on the parts that touch money or trust

- Every mutating write path validates ownership (`clientId`/`freelancerId === userId` from
  the verified JWT, not from a client-supplied field) — closes IDOR by construction, not by
  convention.
- NoSQL injection resistance: every user input is forced to a primitive type before
  reaching a Mongo query (`$`-prefixed keys stripped), so `{"$gt": ""}`-style operator
  injection in a login field is a type error, not a query.
- ReDoS resistance: `sanitizeSearchRegex()` escapes every regex metacharacter before any
  user-supplied string reaches a `$regex` filter.
- Payment integrity: Razorpay capture amounts are re-fetched from Razorpay server-side at
  verification time and never trusted from the client payload; verification is idempotent
  on `razorpayPaymentId` so a replayed payload can't mint a second escrow transaction.
- Rate limiting on every AI route (10/min/user), auth endpoints (10 login attempts / 5
  admin-key attempts per IP per 15 min), token refresh (20/15min/IP), and the public v1 API
  (60/min/key) — currently an in-memory limiter, a known, explicitly documented scaling
  limit (see §6).

### 4.4 The pricing/reputation engine as a standalone algorithmic asset

`web/src/lib/pricing.ts` (decay + adaptive demand curve) and the GeekScore tiering system
(`Newbie → Script Kiddie → Code Monkey → Senior Geek → 10x Engineer`, 0–1000, `+50` per
passed skill assessment) are the two pieces of actual proprietary mechanism design in the
product — everything else (auth, escrow, chat, admin CRUD) is well-understood
infrastructure any competent team can build in a quarter. The pricing curve and its
demand-responsiveness is the part worth iterating on and defending, because it's the part
that directly determines whether the marketplace's core promise (fair, fast price
convergence) actually holds up against adversarial behavior (bid-shilling, sniping,
collusion) at scale.

---

## 5. Market

`[This section needs current, sourced numbers before it goes in front of investors —
placeholder structure only below.]`

- **TAM** — global freelance/contract technical-talent spend: `[cite a current
  Statista/industry report figure]`
- **SAM** — spend currently flowing through platform intermediaries (Upwork, Fiverr,
  Toptal, Freelancer.com combined GMV) rather than direct/agency: `[cite]`
- **SOM** — initial wedge: scoped, well-defined technical tasks (bug fixes, small feature
  builds, audits, one-off scripts) where a decaying price mechanism converges fast, versus
  open-ended long-term engagements where it's a worse fit and Toptal-style vetting still
  wins. `[size this wedge explicitly — it's a testable, narrower claim than "the whole
  freelance market," and a sharper one for a seed pitch]`

---

## 6. What's Built vs. What's Roadmap (say this plainly, it's a credibility signal)

**Built and running today:** the full core loop end-to-end — job posting with live fixed
and adaptive decay, counter-bidding with per-job cooldown and rank visibility, QuickBid,
Direct Hire (GeekScore-gated) and Invite-to-Bid, Razorpay escrow with integer-cent fee
splitting and milestone partial release, GeekScore + skill assessments, an 8-route Gemini
AI layer scoped to specific decision points, dual-role accounts, a 7-section admin
back-office (users/jobs/transactions/disputes/audit-log/config), and a security posture
covering the OWASP-adjacent basics (IDOR, NoSQL injection, ReDoS, CSRF on OAuth, payment
replay, rate limiting).

**Known current limitations, stated plainly:**
- The rate limiter and OAuth exchange-code store are in-memory (`Map`-based) — correct for
  a single instance, and explicitly documented as needing a shared store (Redis or
  equivalent) before a multi-instance/serverless horizontal-scale deployment.
- "Unlimited" on paid plan tiers today means the free-tier cap check is skipped, not that a
  real, enforced, billed tier exists yet — see `SAAS_SUBSCRIPTION_PLAN.md` for the
  scoped-but-unshipped redesign (real recurring billing via Razorpay Subscriptions, tier
  names Free/Plus/Premium, per-tier enforced caps and platform fees).
- Single-region MongoDB Atlas deployment; no read-replica/multi-region strategy yet — not
  needed at current scale, would be the first infra investment after real usage growth.
- No mobile app — web-responsive only today.

**Immediate roadmap (scoped, not yet built):**
- Real subscription billing (`SAAS_SUBSCRIPTION_PLAN.md` + `SAAS_CRUD_IMPLEMENTATION.md`)
- Paid "featured job" boost (backend field and feed-ranking already exist; payment gating
  does not)
- A proper charting library for the price-trajectory visualization (currently hand-rolled
  SVG) once analytics depth becomes a priority (`UI_ENHANCEMENT_PLAN.md`)

---

## 7. Business Model & Unit Economics

Two combinable revenue levers, both already structurally present:

1. **Take rate on escrow volume** — a platform fee on every job's funded amount (10% today,
   flat; a tiered 10%/7%/5% by subscription plan is advertised on the pricing page but not
   yet wired to the actual fee calculation — see roadmap).
2. **Usage-based subscription** — job-post caps, bid caps, and AI-analysis caps by tier,
   today enforced only against the free tier.

Worked example at today's flat 10% take rate: a $1,000 job clears through the platform,
GeekBid keeps $100, freelancer nets $900. At the proposed tiered model, a Pro-plan client's
same $1,000 job would net GeekBid $70 instead of $100 but the plan's own subscription
revenue offsets that — the actual blended take rate per client is a function of their job
volume and plan tier, which is exactly the lever the `SAAS_SUBSCRIPTION_PLAN.md` redesign
is built to tune. `[Model actual blended take rate and LTV/CAC against real cohort data
once there is any — do not present a hypothetical unit-economics table as if it's
observed data.]`

---

## 8. Competitive Landscape (technical framing)

| | Upwork/Fiverr | Toptal/Braintrust | **GeekBid** |
|---|---|---|---|
| Price-setting mechanism | None — freelancer guesses, negotiates in DM | None — fixed rate card | **Algorithmic descending-price auction, demand-adaptive** |
| Trust mechanism | Star ratings (gameable, low signal density) | Manual interview funnel (~3% acceptance, doesn't scale, expensive) | **GeekScore: a single computed number from verified skill assessments + delivery history, cheap to compute, hard to fake without actually passing assessments** |
| Best-bid selection | Manual — client reads every proposal | N/A — no competitive bidding | **Server-side AI scoring on a composite of price/skill/reputation, resistant to client-side data tampering by design** |
| Settlement | Varies, often invoice-after or milestone escrow bolted on later | Managed engagement, no escrow mechanic exposed to competition | **Escrow-first, integer-cent exact, atomic on every state transition** |
| Concurrency correctness under load | Unknown (closed source) | Unknown (closed source) | **Explicitly audited — every money/scarce-resource write is a guarded atomic update, with a public audit trail of races found and fixed** |

The moat isn't "we built escrow" (anyone can integrate Razorpay/Stripe) — it's that the
**pricing mechanism itself is the product**, and correctly implementing a live, publicly
visible, race-condition-free descending auction under concurrent bidding is a materially
harder engineering problem than a CRUD proposal board, which is exactly why no incumbent
has shipped it.

---

## 9. The Ask

`[Standard YC-memo close — fill in with actual current numbers before using: funding
amount being raised, use of funds (engineering headcount, initial GTM wedge into a
specific vertical of scoped technical work, infra investment to move off the in-memory
rate limiter/exchange-code store ahead of any real launch), and team background.]`

---

## Appendix: Full Technical Reference

For the complete API surface (~70 routes), page map, environment setup, Docker/Vercel
deployment instructions, and CI/CD pipeline, see [`README.md`](README.md). For the
security audit history, see [`V15_FIXES.md`](V15_FIXES.md) and
[`geekbid_bid_acceptance_and_system_audit.md`](geekbid_bid_acceptance_and_system_audit.md).
For the researched-but-unshipped subscription-billing redesign, see
[`SAAS_SUBSCRIPTION_PLAN.md`](SAAS_SUBSCRIPTION_PLAN.md).
