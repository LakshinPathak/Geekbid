# GeekBid — Product Release Document

**The world's first reverse-auction marketplace for tech talent.**

---

## 1. Executive Summary

GeekBid is a freelance marketplace for software engineers, designers, and technical
specialists that inverts the standard hiring model. Instead of a client posting a job and
waiting for freelancers to submit competing proposals at whatever price they choose,
GeekBid **posts the price first** — a starting price that **automatically decays over
time** — and lets freelancers "catch" the falling price by bidding it down further, or
simply accepting it once it reaches a rate they're willing to work at.

The result is a live, transparent price-discovery mechanism instead of a blind proposal
pile. Clients get market-accurate pricing without haggling. Freelancers get real-time
visibility into demand, competition, and exactly how much room is left to bid. Nobody
guesses at "what's fair" — the market decides, continuously, in public.

This document explains the core novelty, how the mechanics work end-to-end, who it's for,
how it makes money, how it compares to the incumbents, and what ships next.

---

## 2. The Core Novelty: Reverse-Auction Pricing

### What "reverse auction" means here

A traditional (forward) auction starts low and prices go **up** as bidders compete — eBay,
Christie's, Google Ads. GeekBid runs the opposite: prices start **high** and fall
**automatically over time**, and freelancers race to either accept the current falling
price or push it down further themselves with a counter-bid. Whoever the client picks —
usually the best combination of low price, high reputation, and fast turnaround — wins the
job.

This is not simply "reverse-sorted proposals." The price is a **live, ticking number**
that every visitor to the job posting sees moving in real time, governed by a transparent,
client-set formula the freelancer can fully see and reason about before ever placing a bid.

### Why this is genuinely different from every existing freelance platform

| | Upwork / Fiverr / Freelancer.com | Toptal / Braintrust | **GeekBid** |
|---|---|---|---|
| How price is set | Freelancer guesses, client negotiates in DMs | Fixed high-end rate card, no price competition | **Price decays automatically; market finds the number** |
| Client effort | Read 20–50 unstructured proposals | Wait for curated match | **Watch one live number fall, or eyeball the leaderboard of live bids** |
| Price transparency | Opaque — nobody sees competing bids | Opaque — rate-card based | **Every bid on a job is visible to every other bidder** (with a "you haven't bid yet" nudge) |
| Urgency mechanic | None — proposals can sit for weeks | None | **Built-in**: the price is *always* falling, so waiting costs the client money and costs freelancers the chance to win at a higher price |
| Freelancer signal | Star ratings + review text, easy to game | Manual vetting gate | **GeekScore** — a single reputation number driving Direct-Hire eligibility and feed ranking, backed by verified skill assessments |
| Best-value detection | Client reads every proposal manually | N/A | **AI Bid Evaluator** ranks live bids server-side by a value score (price + skill match + reputation + commitment signals) |

The decay mechanic is the product's actual moat: it's a pricing *algorithm*, not a UI
layout choice, and it changes the incentive structure for both sides of the market
simultaneously — something a proposal board fundamentally cannot replicate by just
re-skinning its UI.

---

## 3. How the Mechanics Work

### 3.1 Posting a job (the client side)

A client sets three numbers when posting a job:

- **Starting price** — the opening ask (e.g. $1,200)
- **Floor price** — the absolute minimum they'll accept (e.g. $400) — the price never
  drops below this, guaranteeing the client never gets an unworkable lowball floor
- **Decay rate** — dollars lost per hour (e.g. $30/hr)

From the moment the job goes live, its listed price is computed live by every viewer's
browser from those three numbers plus elapsed time — no polling, no server push required
for the baseline mechanic.

### 3.2 Fixed vs. Adaptive pricing

Two decay modes exist:

**Fixed** — pure linear decay:
```
currentPrice = max(startingPrice − decayRate × elapsedHours, minimumPrice)
```

**Adaptive** (demand-aware) — the decay *slows down* the more bidding interest a job
attracts, so a hot job doesn't crash to the floor just because time passed:
```
effectiveRate = decayRate × demandMultiplier(uniqueBidderCount)
currentPrice  = max(startingPrice − effectiveRate × elapsedHours, minimumPrice)

demandMultiplier:  0 bids → 1.0×  |  1–2 → 0.85×  |  3–4 → 0.7×  |  5+ → 0.55×
```

This is the mechanism that makes the marketplace self-correcting: a job nobody wants
decays fast toward a price someone eventually will take; a job everyone wants stays
expensive for longer, protecting freelancers from a race-to-the-bottom on genuinely
in-demand work.

### 3.3 Bidding (the freelancer side)

A freelancer watching a job can, at any moment:

- **Accept at the current price** — instantly wins the job at whatever the ticking number
  currently reads
- **Counter-bid below the current price** — a bid strictly between the floor and the
  current price, visible to the client and every other bidder immediately, which also
  updates the job's `lowestCounterBid` demand signal
- **QuickBid** — one click, submits 2% below the current price (floor-clamped so it can
  never violate the client's minimum)

Every freelancer's own live rank ("Rank #1", "Rank #2"…) among all bids on that job is
shown to them in real time, along with the min/avg/max of the current bid spread — nobody
bids blind.

A 30-minute per-job cooldown between a single freelancer's own bids exists specifically to
prevent one person from spamming the price down faster than the market itself would settle
it.

### 3.4 Client's decision

The client can accept any freelancer's live bid at any time — not necessarily the lowest
one. GeekBid's **AI Bid Evaluator** helps here: it scores every live bid server-side on a
composite of price, skill match, GeekScore, and commitment signals, so "best value" isn't
just "cheapest."

### 3.5 Closing the loop: escrow, not invoices

Once a bid is accepted, the client's payment is captured immediately into **escrow** (via
Razorpay), computed to the exact cent (`platformFee + netAmount === gross`, no
floating-point drift). Funds sit held until the client releases them on completion, or
per-milestone for larger engagements. This means the freelancer isn't just "awarded a job"
on a promise — the money is already secured the moment the auction closes.

---

## 4. Supporting Systems That Make the Core Loop Trustworthy

A decaying-price auction only works if both sides trust the numbers and the counterparties
in it. GeekBid backs the core mechanic with:

- **GeekScore** — a 0–1000 freelancer reputation score across five named tiers (Newbie →
  Script Kiddie → Code Monkey → Senior Geek → 10x Engineer). Starts at 100 on signup,
  grows `+50` per passed skill assessment, and gates two things directly: Direct-Hire
  eligibility (freelancer must be ≥ 500) and a "best value" highlight for clients
  comparing bids.
- **Skill Assessments** — freelancers prove specific skills, not just claim them; a passed
  assessment adds a verified-skill badge and a GeekScore bump.
- **Escrow-backed acceptance** — see §3.5. No "ghost job" risk once a bid is accepted.
- **Dispute resolution** — a 4-outcome admin arbitration flow (refund client / pay
  freelancer / split 50/50 / dismiss) for the rare escrow disagreement.
- **Direct Hire & Invite to Bid** — clients aren't limited to waiting for the auction to
  resolve; they can fixed-price-offer a specific high-GeekScore freelancer directly, or
  invite specific freelancers from the Talent Pool into a job's bidding.
- **Dual-role accounts** — one login can hold both a client and a freelancer identity
  (added in v16), so a person who occasionally hires *and* occasionally freelances doesn't
  need two separate accounts fighting over the same email.

---

## 5. AI Layer

Every AI feature is scoped to a specific decision point in the core loop, not a generic
chatbot bolted on the side. All run on Google Gemini 2.0 Flash, server-side only:

| Feature | Decision it assists |
|---|---|
| **Bid Strategist** | Freelancer: "what should I actually bid, and when?" — 7-signal analysis (price, decay rate, demand multiplier, bid distribution, time remaining, competition, own skill fit) → recommended bid, win probability, timing, risk notes |
| **Bid Evaluator** | Client: "which live bid is actually the best value?" — re-fetches bids/profiles server-side (never trusts client-submitted scoring data) and ranks by a composite value score |
| **Pricing Advisor** | Client, at posting time: "what starting price / floor / decay rate should I even set?" |
| **Description Generator** | Client: turns a title + skill list into a full job description |
| **Quality Check** | Client: flags a weak draft posting before it goes live |
| **Smart Search** | Freelancer: natural-language query → structured filters |
| **Chat Assist** | Either side: drafts a message for a given negotiation context |
| **Summarize Reviews** | Anyone viewing a profile: turns a review history into a strengths summary |

Every AI route degrades gracefully (the core bidding loop works with zero AI configured)
and is quota-capped on the free plan so it's a real upgrade lever, not an unlimited cost
center.

---

## 6. User Journeys

### Client journey
1. Post a job with a starting price, floor, and decay rate (AI Pricing Advisor suggests
   all three if unsure)
2. Watch the price tick down live; see live bids and rank as they arrive
3. Optionally invite specific freelancers, or Direct-Hire a high-GeekScore one outright
4. Accept the best bid (AI-ranked, or by gut feel) — escrow is created instantly
5. Release escrow (in full, or per milestone) on delivery

### Freelancer journey
1. Browse open jobs, filtered by skill/category/budget/competition, sorted by best match
2. Watch a job's price and decide: accept now, counter-bid, or wait for it to fall further
3. Use AI Bid Strategist if unsure what to bid or when
4. Win the job → GeekScore and earning history grow; get paid from escrow on completion

---

## 7. Business Model

Today's implementation (see `SAAS_SUBSCRIPTION_PLAN.md` for a fuller proposed redesign):

| | Free | Pro | Enterprise |
|---|---|---|---|
| Job posts/month | 3 | Unlimited | Unlimited |
| Bids/month | 10 | Unlimited | Unlimited |
| AI analyses/month | 5 (2 for Bid Strategist) | Unlimited | Unlimited |
| Platform fee on escrow | 10% (advertised tiers of 7%/5% for paid plans not yet wired to the fee calculation) | | |

Revenue has two natural levers already structurally present in the product: a **usage
subscription** (job/bid/AI caps by tier) and a **take rate on transaction volume**
(platform fee on every escrow-funded job) — a dual model similar in shape to Upwork's, but
layered on top of a pricing mechanic neither Upwork nor Toptal has.

---

## 8. Market Positioning

GeekBid is not trying to out-curate Toptal (manual vetting, high rate floor) or
out-scale Fiverr/Upwork (huge undifferentiated proposal volume). It's targeting the
specific failure mode both of those have in common: **nobody involved actually knows what
the fair market price is until after weeks of back-and-forth.** By making the price itself
the live, public, auto-adjusting artifact — rather than a number buried in a private
proposal — GeekBid turns price discovery from a negotiation into a spectator sport both
sides can watch and react to in real time.

---

## 9. What's Next

Two initiatives are scoped and researched but intentionally left as review-first plans,
not yet shipped:

- **Real subscription billing** — `SAAS_SUBSCRIPTION_PLAN.md` +
  `SAAS_CRUD_IMPLEMENTATION.md` propose a genuine Free/Plus/Premium tier redesign
  (recurring Razorpay billing, real enforced caps for paid tiers, per-tier platform fees,
  a paid "featured job" boost) — today's Free/Pro/Enterprise caps are enforced but the
  paid tiers are not yet billed for automatically.
- **Deeper data visualization** — `UI_ENHANCEMENT_PLAN.md` scopes replacing the hand-rolled
  SVG price-trajectory chart with a proper charting library once that becomes a priority.

Both are deliberately gated behind a product decision rather than shipped speculatively —
see each document's "Open Decisions" section.

---

## 10. Technical Foundation (summary)

Next.js 16 (App Router) + React 19 + TypeScript, MongoDB Atlas, JWT auth with dual-role
support, Google Gemini 2.0 Flash for AI, Razorpay escrow, Cloudinary image CDN, Resend
transactional email. Full architecture, complete API reference, and setup instructions
live in [`README.md`](README.md).

---

*GeekBid — the market decides the rate.*
