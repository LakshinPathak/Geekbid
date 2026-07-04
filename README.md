# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

![CI/CD](https://github.com/LakshinPathak/Geekbid/actions/workflows/ci.yml/badge.svg)

**Current version: v16** — Premium visual overhaul of the landing page and both feed
dashboards, dual-role accounts (one login can be both a client and a freelancer), an
OAuth sign-in bug fix, and a round of bug fixes found via live testing. See
[What's in v16](#whats-in-v16).

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [What's in v16](#whats-in-v16)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Core Domain Model](#core-domain-model)
6. [Features](#features)
7. [Frontend Page Map](#frontend-page-map)
8. [API Reference (full)](#api-reference-full)
9. [Quick Start](#quick-start)
10. [Docker](#docker)
11. [Microservice Backend (experimental)](#microservice-backend-experimental)
12. [Environment Variables](#environment-variables)
13. [Security](#security)
14. [Troubleshooting](#troubleshooting)
15. [Version History](#version-history)
16. [License](#license)

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

### Planning docs (not yet implemented)

Two larger initiatives were researched and scoped but intentionally left as review-first
plans rather than shipped code: [`SAAS_SUBSCRIPTION_PLAN.md`](SAAS_SUBSCRIPTION_PLAN.md) +
[`SAAS_CRUD_IMPLEMENTATION.md`](SAAS_CRUD_IMPLEMENTATION.md) (a proposed Free/Plus/Premium
subscription-tier redesign with full schema/route-level implementation detail) and the
UI-library research above. Both need a decision before any of it lands in code.

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
│   │   ├── pricing/ , settings/           Plan comparison (mock) / account settings
│   │   ├── admin/                         7-section back office (see Features → Admin Panel)
│   │   └── api/                           ~70 REST route files — see API Reference
│   ├── src/components/
│   │   ├── landing/                       ~15 landing-page section components + hooks
│   │   ├── feed/                          17 client/freelancer dashboard components
│   │   ├── ai/                            AIBidStrategist widget
│   │   └── admin/                         AdminKeyGate, AdminSidebar
│   └── src/lib/
│       ├── auth.ts                        JWT (jose) + bcrypt + Google OAuth + dual-role logic
│       ├── store.tsx                       App-wide React Context — all client-side state/actions
│       ├── pricing.ts                     Price-decay + adaptive-pricing engine
│       ├── money.ts                        Integer-cent escrow-fee split math
│       ├── sanitize.ts                     Input sanitization + in-memory rate limiting
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
├── SAAS_SUBSCRIPTION_PLAN.md            Proposed Free/Plus/Premium tier design (plan only)
├── SAAS_CRUD_IMPLEMENTATION.md          Schema/route-level detail for the above (plan only)
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
| **Styling** | Tailwind CSS v4, "Royal Dark" design system — `#080b14` bg, `#c9a84c` gold, `#f0e8d4` ivory, Georgia serif + Inter sans |
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

### Plans (Free / Pro / Enterprise — today's implementation)

| | Free | Pro | Enterprise |
|---|---|---|---|
| Job posts/month | 3 | unlimited* | unlimited* |
| Bids/month | 10 | unlimited* | unlimited* |
| AI features/month | 5 (2 for Bid Strategist) | unlimited* | unlimited* |

\* "Unlimited" for paid tiers is currently enforced only on the free-tier check being
skipped — see `SAAS_SUBSCRIPTION_PLAN.md` for the proposed real Free/Plus/Premium
redesign with actual finite caps and billing.

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
- Free plan: 5 general AI analyses/month, 2 for Bid Strategist specifically; graceful degradation when Gemini is unavailable

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
| `/pricing` | Auth | Free/Pro/Enterprise comparison (mock — see [Plans](#plans-free--pro--enterprise-todays-implementation)) |
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
| POST | `/api/jobs` | Client | Create a job; free-plan cap (3/month) enforced atomically |
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
| POST | `/api/bids` | Freelancer | 30-min per-job cooldown; free-plan cap (10/month) atomic; as of v16, floor/ceiling enforced server-side |
| GET | `/api/bids/my` | Freelancer | Own bid history with job details |

### Public API (v1 — API-key auth)

For third-party integrations. Requires `X-API-Key` (generated via `/api/keys`), not a JWT.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/jobs` | `?status=&category=&page=&limit=` — paginated job list |
| POST | `/api/v1/jobs` | Create a job — same category whitelist + free-plan cap as the internal API |

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

All require Bearer auth, rate-limited 10/min per user, quota-capped on the free plan (Bid
Strategist has its own stricter cap). Gemini key is server-side only.

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
| `GET/PATCH /api/admin/config` | Platform config read/write |
| `GET /api/admin/config/env-status` | Env var presence check |
| `POST /api/admin/verify-key` | Verify admin panel key (rate-limited 5/15min) |
| `GET/DELETE /api/email-logs` | Email send log — admin sees all, user sees own |

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
| `RAZORPAY_KEY_ID` | No | Payments (mock mode if absent) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | No | For a future Razorpay webhook endpoint — not yet wired to any route (see `SAAS_CRUD_IMPLEMENTATION.md`) |
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

Summary of protections in place:

| Layer | Protection |
|-------|-----------|
| Auth | JWT (jose), bcrypt 12 rounds, HttpOnly refresh cookies, dual-role password ownership check |
| OAuth | CSRF `state` nonce validated on Google login callback; tokens handed off via one-time exchange code, never a URL query string |
| Rate limiting | 10 login attempts / 5 admin-key attempts per IP per 15 min; 10/min per user on every AI route; 20/15min per IP on token refresh + switch-role; 60/min per key on the public v1 API |
| Input sanitization | `sanitizeString`, `sanitizeObjectId`, `sanitizeSearchRegex` on all user input |
| NoSQL injection | `$`-prefix keys stripped; all inputs forced to primitive types before DB queries |
| ReDoS | `sanitizeSearchRegex()` escapes all regex metacharacters before `$regex` use |
| IDOR | All mutations check ownership (clientId/freelancerId === userId from JWT) |
| Chat authorization | `/api/chat/rooms` and `/api/chat/messages` require the caller to be a participant |
| Escrow integrity | Job acceptance, escrow release/dispute, and milestone partial-release all use atomic, state-guarded updates |
| Quota integrity | Free-plan AI, job, and bid caps are all atomic `findOneAndUpdate` checks |
| Bid floor/ceiling | Enforced server-side in `POST /api/bids` as of v16, not just client-side |
| Payment verification | Payment amounts are verified against Razorpay's captured amount server-side |
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
| `v16` | **Latest** (also `main`/`master`) — landing page + feed dashboard visual redesign, dual-role accounts (`roles[]` + `/api/auth/switch-role`), OAuth role-mismatch fix, and bug fixes (QuickBid floor violation, Counter-Bid-at-floor UI, feed duplicate-key crash, job detail layout) |
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
