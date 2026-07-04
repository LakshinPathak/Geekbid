# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**  
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

![CI/CD](https://github.com/LakshinPathak/Geekbid/actions/workflows/ci.yml/badge.svg)

**Current version: v16** — Premium visual overhaul of the landing page and both feed dashboards, dual-role accounts (one login can be both a client and a freelancer), an OAuth sign-in bug fix, and a round of bug fixes found via live testing (job detail layout, QuickBid floor violation, a feed duplicate-key crash). See [What's in v16](#whats-in-v16) below.

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

## What's in v15

A full audit (security, bugs, architecture, feature-completeness, CI/CD) with every
verifiable High/Medium finding fixed — **no feature or architecture changes**. Full
detail: [`V15_FIXES.md`](V15_FIXES.md).

| Area | Fix |
|------|-----|
| **AI quota race** | `checkAndConsumeAiQuota` and `bid-strategy`'s own counter now use one atomic `findOneAndUpdate` instead of read-then-write — closes a race that let concurrent requests exceed the free-plan AI cap |
| **Milestone escrow race** | `PATCH /api/milestones` (`approve`) now atomically claims the milestone's release right before touching the transaction — closes a race that could double-release the same milestone's escrow |
| **Rate limiting** | Added to all 8 `/api/ai/*` routes (per-user), `/api/auth/refresh` (per-IP), and the public `/api/v1/jobs` (per-API-key) — previously only login and admin-key-verify were throttled |
| **Token refresh race** | `store.tsx`'s `silentRefresh()` now shares its in-flight promise instead of returning `null` to any request that raced the refresh window |
| **Data-fetch waterfall** | `loadAllData()` no longer awaits `fetchJobs()`/`fetchBids()` sequentially before the parallel batch |
| **`.env.example` drift** | Regenerated to match every var `web/Dockerfile` and CI actually require (was missing Cloudinary, Gemini, admin key, Resend) |
| **No error boundary** | Added `web/src/app/error.tsx` + `loading.tsx` — previously zero existed anywhere in the app |

## What's in v14

Correctness & reliability hardening of the live Next.js app — **no feature or architecture changes**. (The microservice-migration experiment lives on the separate `v13_with_microservice_half_code` branch.) Full detail: [`V14_FIXES.md`](V14_FIXES.md).

| Area | Fix |
|------|-----|
| **Money math (correctness)** | New `web/src/lib/money.ts` computes every escrow split in **integer cents**, guaranteeing `platformFee + netAmount === gross`. Wired into job accept / accept-best, direct-offer acceptance, Razorpay verify, and milestone partial release (exact fully-released check — the old `>= gross - 0.01` fudge is gone). Chained float math like `458 * 0.1 === 45.800000000000004` no longer reaches the ledger |
| **Cross-tab auth sync** | `store.tsx` now listens for `storage` events — logging in/out in one tab updates every open tab instead of leaving them stale |
| **Mongo connection singleton** | `getDb()` caches the connect *promise* on `globalThis` (not just the resolved Db), so concurrent cold starts / HMR reloads reuse one client instead of churning connections; a failed connect isn't cached |
| **No error leaks** | `POST /api/seed` no longer returns raw `details: String(err)` to the client; `team/page.tsx` no longer swallows load errors in an empty `catch {}` |

## What's in v12

A verification pass over all 22 issues from the v11 audit (21 confirmed fixed) plus 8 new findings, all fixed. Full write-up: [`geekbid_review_2026-07-02.md`](geekbid_review_2026-07-02.md). Highlights:

| Area | Fix |
|------|-----|
| **Admin key exposure (critical)** | The admin panel config page rendered the real `ADMIN_SECRET_KEY` value in a client component — it shipped in the JS bundle. Now masked; rotate the key in your deployment |
| **Payment replay** | `PATCH /api/payments` is now idempotent on `razorpayPaymentId` — replaying a verified payment payload can no longer mint duplicate escrow transactions |
| **Direct-offer race** | Offer accept/decline now claims `offerStatus: "pending"` atomically (`findOneAndUpdate`, 409 on lost race); escrow is created only after a successful claim |
| **API auth gaps** | `GET /api/bids` and `GET /api/milestones` now require authentication (they leaked bid messages and milestone financials to anonymous callers); milestone `start` now requires the assigned freelancer |
| **AI quota** | `summarize-reviews` was the last AI route without a usage cap — now on the shared quota |
| **Mock payments** | Mock payment verification (client-trusted amounts) is now rejected outright when `NODE_ENV === "production"` |

## What's in v11

A full audit of the bid → accept → escrow → chat pipeline, plus a system-wide pass over auth, payments, and AI routes. Full write-up: [`geekbid_bid_acceptance_and_system_audit.md`](geekbid_bid_acceptance_and_system_audit.md). Highlights:

| Area | Fix |
|------|-----|
| **Job ownership (critical)** | `PATCH /api/jobs/[id]` (`cancel`/`complete`) now checks `job.clientId === userId` — previously any client could cancel or force-complete *another* client's job and force-release their escrow |
| **Escrow integrity** | Job acceptance (`accept`, `accept_best`) and escrow `release`/`dispute` are now atomic (`findOneAndUpdate` with a state-guard filter) instead of read-then-write, closing double-transaction and dispute-override races |
| **Payments** | Payment amounts are now verified against Razorpay's actual captured amount server-side, not trusted from the client |
| **Chat authorization** | `/api/chat/rooms` and `/api/chat/messages` now require the caller to be a participant — previously any authenticated user could join or write into any conversation |
| **OAuth security** | Google login now validates a CSRF `state` nonce and hands off tokens via a one-time exchange code instead of putting them in the redirect URL |
| **Seed endpoint** | `/api/seed` now requires an authenticated admin, not just an environment flag |
| **Public API (v1)** | API-key lookup is now O(1) (indexed hash) instead of bcrypt-scanning every key; `/api/v1/jobs` enforces the same category/plan-limit rules as the internal API |
| **Escrow/payout completeness** | The job-completion route the frontend actually calls now releases escrow (it previously didn't); milestone approval now does a real partial escrow release; referral credits now actually accrue |
| **Notifications** | Losing bidders and clients whose direct offer was declined now get an in-app notification, not just an email that can silently fail |
| **Plan limits & AI quotas** | Free-plan job/bid caps are now atomic (unracable); all AI routes now share a rate limit, not just bid-strategy |
| **Bid evaluator** | `POST /api/ai/evaluate-bids` now takes `{jobId}` and re-fetches bids/freelancers server-side instead of trusting client-submitted data |

## What's in v10

| Area | Change |
|------|--------|
| **Admin Panel** | Full back-office: Dashboard, Users, Jobs, Transactions, Disputes, Audit Logs, Config. 2FA key gate, all data from MongoDB |
| **Security** | NoSQL injection, ReDoS, brute-force, IDOR, null-deref — 16 vulnerabilities patched. `sanitize.ts` utility library |
| **Cloudinary CDN** | All avatars via Cloudinary — `CldImage` with face-detect crop, WebP auto-format |
| **AvatarUploader** | `CldUploadWidget` with crop-to-square, change + remove photo |
| **Gemini AI** | Bid Strategist, Bid Evaluator, Description Generator, Pricing Advisor — all gated server-side |

## What's in v9

| Area | Change |
|------|--------|
| **Role-based feed** | `/feed` auto-routes: clients → Procurement Terminal, freelancers → Mission Control |
| **Procurement Terminal** | SpendAnalytics, MyJobsSection carousel, MarketIntel, TalentPool |
| **Mission Control** | FreelancerStats, RecommendedCarousel, ActiveBidsTracker, advanced filters |
| **Landing page** | Staggered hero entrance, price decay card glow + particle sparks, testimonials carousel |

---

## Features

### For Clients
- Post jobs in 3 steps with live price decay preview and adaptive pricing toggle
- Procurement Terminal — scrollable carousel of your active jobs with per-job bid panels
- Spend Analytics — budget posted, average bid, decay rate, savings from price drop
- Accept Best Bid — one click awards the job to the lowest bidder, creates escrow, fires emails
- Invite to Bid — invite specific freelancers from the Talent Pool
- Direct Hire — send a fixed-price offer to any freelancer with GeekScore > 500
- Market Intelligence — average starting prices, decay rates, time-to-first-bid by category
- Escrow payments — funds held until you release or mark complete

### For Freelancers
- Mission Control — KPI bar (matches, bids used, win rate, earning potential)
- Recommended carousel — top 5 skill-matched open jobs
- Active Bids Tracker — live rank, current price, cooldown timer
- Smart filters — search, category, budget range, competition, $/hr floor, multi-skill picker
- Sort modes — Best Match, Price low/high, Newest, Fewest Bids, Skill Match %
- Quick Bid — 2% below current price in one click
- GeekScore — reputation that grows with successful jobs and ratings

### AI Features
- **Bid Strategist** — 7-signal analysis (price, decay rate, demand multiplier, bid distribution, time remaining, competition, freelancer fit). Returns suggested bid, win probability, timing, risks, and 2 alternatives
- **Bid Evaluator** — client-side bid ranking by value score (price + skill match + GeekScore + commitment)
- **Description Generator** — type a title, click Generate, get a 200-word professional description
- **Pricing Advisor** — recommends starting price, floor, and hourly decay rate based on category + skills
- Free plan: 2 AI analyses per month; graceful degradation when Gemini unavailable

### Admin Panel
- 2FA key gate — requires admin JWT + separate `ADMIN_SECRET_KEY`
- Dashboard — live MongoDB KPIs: users, open jobs, disputes, GMV, held escrow
- Users — full CRUD, soft-delete with reason, GeekScore override
- Jobs — full CRUD, status override, featured toggle, remove with reason
- Transactions — paginated table, Release Escrow and Refund with reason modal, CSV export
- Disputes — 4 resolution types: refund client, pay freelancer, split 50/50, dismiss
- Audit Logs — append-only log of every admin action
- Config — platformFeePercent, decayRate, maintenanceMode, AI toggle, env var status grid

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Royal Dark design system, Georgia serif + Inter sans |
| **UI Components** | Radix UI primitives, Lucide icons, Sonner toasts |
| **State** | React Context + useCallback (no external state library) |
| **Auth** | JWT (jose), bcrypt 12 rounds, Google OAuth 2.0, HttpOnly refresh cookies |
| **Database** | MongoDB Atlas (native driver, no ORM) |
| **Image CDN** | Cloudinary — `next-cloudinary` (`CldImage`, `CldUploadWidget`) |
| **AI** | Google Gemini 2.0 Flash via `@google/generative-ai` |
| **Payments** | Razorpay escrow (order → verify → release flow) |
| **Email** | Resend (Nodemailer) — transactional emails for all key events |
| **Real-time** | Socket.IO — bid decay broadcast + chat |
| **Backend** | Express.js microservices (gateway, auth, jobs, bidding, payments, notifications, chat) |
| **CI/CD** | GitHub Actions — lint, typecheck, build, Docker, deploy |

---

## Architecture

```
GeekBid/
├── web/                          ← Next.js 16 app (port 3000)
│   ├── src/app/                    16 pages + ~50 API routes
│   │   ├── admin/                  Admin panel (7 sections)
│   │   └── api/                    REST API routes
│   ├── src/components/
│   │   ├── admin/                  AdminKeyGate, AdminSidebar
│   │   └── feed/                   12 role-split feed components
│   └── src/lib/
│       ├── auth.ts                 JWT helpers + authenticateRequest
│       ├── sanitize.ts             Input sanitization + rate limiting
│       ├── mongodb.ts              Atlas connection singleton
│       ├── store.tsx               App-wide context + store actions
│       ├── ai.ts                   Gemini SDK wrapper
│       ├── cloudinary.ts           Cloudinary server config
│       └── email.ts                Transactional emails
│
├── backend/                      ← Express microservices
│   ├── services/gateway/           Port 3000 — reverse proxy
│   ├── services/auth-service/      Port 3001
│   ├── services/job-service/       Port 3003
│   ├── services/bidding-service/   Port 3004 (Socket.IO)
│   ├── services/payment-service/   Port 3005
│   ├── services/notification-service/ Port 3006
│   └── services/chat-service/      Port 3007 (Socket.IO)
│
├── docs/                         ← Project documentation
├── prompts/                      ← AI generation prompts
├── docker-compose.yml
└── README.md
```

### Price Decay Formula

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
NEXTAUTH_SECRET=<at-least-32-char-random-string>
NEXTAUTH_URL=http://localhost:3000
ADMIN_SECRET_KEY=<your-admin-panel-password>

# Cloudinary (image CDN)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
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
RESEND_API_KEY=re_your_key
```

### 3. Install & run

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. Seed the database

`/api/seed` requires an authenticated admin (as of v11 — it used to be gated only by an env flag, with no auth check at all). The one exception is a completely empty local database: since registration can't create an admin account directly (`role` is restricted to `freelancer`/`client`), the very first seed on a fresh, non-production database is allowed without auth so it can create the seeded `admin@geekbid.io` account. Every seed after that requires that admin's token.

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

In production, `/api/seed` is disabled outright unless `ALLOW_SEED=true` is set — and even then still requires an admin token once any user exists.

### 5. Test accounts

| Role | Email | Password |
|------|-------|----------|
| Client | `maya@startup.io` | `password123` |
| Client | `derek@fintech.co` | `password123` |
| Freelancer | `arjun@devmail.io` | `password123` |
| Freelancer | `priya@secmail.io` | `password123` |
| Admin | `admin@geekbid.io` | `admin123` |

> **Admin panel:** Log in as admin → navigate to `/admin` → enter `ADMIN_SECRET_KEY` value when prompted

---

## Docker

```bash
# From repo root — starts web, backend services, and MongoDB
docker-compose up
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3002 |
| Gateway | http://localhost:3000 |
| MongoDB | localhost:27017 |

---

## API Reference

All routes live under `/api/`. Protected routes require `Authorization: Bearer <access_token>`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth` | No | `{action:"register"|"login", ...}` — `register` only allows `role: freelancer|client`. Registering with an email that already has an account **adds** the requested role to it (password must match) instead of erroring, if that role isn't already on the account |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/refresh` | Cookie | Silent token refresh |
| POST | `/api/auth/logout` | Bearer | Clears refresh cookie |
| POST | `/api/auth/switch-role` | Bearer | `{role}` — flips the active role for an account holding more than one, mints a fresh token pair for it. `403` if the account doesn't have that role |
| GET | `/api/auth/google` | No | `?role=freelancer|client` — sets a CSRF state cookie before redirecting to Google |
| GET | `/api/auth/google/callback` | No | Validates the CSRF state, then redirects with a one-time `?google_exchange=` code (never the token itself) |
| POST | `/api/auth/google/exchange` | No | `{code}` → `{accessToken, user, expiresIn, roleAdded}` — redeems the one-time code from the callback; single-use, 60s TTL. `roleAdded` is `true` if this sign-in just added a new role to an existing account rather than switching to one already held |

### Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | Optional | `?category=` filter. Invite-only jobs are hidden unless you're the client, an invited freelancer, or admin — pass a token to see your own |
| POST | `/api/jobs` | Client | Plan limit enforced atomically (free: 3/month) |
| GET | `/api/jobs/[id]` | No | Single job |
| PATCH | `/api/jobs/[id]` | Bearer | `action`: `accept` / `accept_best` / `cancel` / `complete`. `accept`/`accept_best` are atomic — return `409` if the job was already accepted by another request. `cancel`/`complete` verify `job.clientId === userId` |
| GET | `/api/jobs/recommended` | Freelancer | Top 10 skill-matched open jobs |
| GET | `/api/jobs/pricing-hint` | No | `?skills=` — market rate data |
| POST | `/api/jobs/direct-offer` | Client | Fixed-price offer to freelancer |
| PATCH | `/api/jobs/offer-response` | Freelancer | Accept or decline direct offer — atomic as of v12, returns `409` if the offer was already responded to; declining also creates an in-app notification for the client |

### Bids

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bids` | Bearer | `?jobId=` filter — protected as of v12 (bids include freelancer IDs and private messages) |
| POST | `/api/bids` | Freelancer | Rejects bids on jobs that aren't `open`; 30-min cooldown; plan limit enforced atomically |
| GET | `/api/bids/my` | Freelancer | Own bid history with job details (batched job lookup) |

### Public API (v1 — API key auth)

For third-party integrations. Requires an `X-API-Key` header (generated via `/api/keys`), not a JWT.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | `?status=&category=&page=&limit=` — paginated job list |
| POST | `/api/v1/jobs` | Create a job. Enforces the same category whitelist and free-plan job cap as the internal API |

### Freelancer Dashboard

| Endpoint | Description |
|----------|-------------|
| `GET /api/freelancer/dashboard` | KPIs: matched jobs, bids, win rate, earning potential |
| `GET /api/freelancer/bid-tracker` | Active bids with rank, price, cooldown |
| `GET /api/freelancer/earnings` | Transaction history + totals |
| `GET /api/freelancer/match-radar` | Skill gap analysis |
| `GET /api/freelancer/price-alerts` | Jobs nearing floor price |

### Client Dashboard

| Endpoint | Description |
|----------|-------------|
| `GET /api/client/dashboard` | KPIs: jobs, budget, savings, avg bid |
| `GET /api/client/market-intel` | `?category=` — avg prices, top skills, time-to-bid |
| `GET /api/client/spend-analytics` | Spend breakdown by category |
| `GET /api/client/job-health` | Health matrix for open jobs |

### Payments & Disputes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay order, verify. `PATCH` re-fetches the captured amount from Razorpay server-side, is idempotent on `razorpayPaymentId`, and rejects mock orders in production |
| GET | `/api/transactions` | Bearer | Own transactions |
| PATCH | `/api/transactions` | Client | Release or dispute escrow — both are atomic and only succeed if the transaction is currently `held` |
| GET | `/api/disputes` | Bearer | Own disputes |
| PATCH | `/api/disputes` | Admin | Resolve dispute |

### Milestones & Referrals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/milestones` | Bearer | `?jobId=` — list milestones for a job (protected as of v12) |
| POST | `/api/milestones` | Client | Create milestones for a job |
| PATCH | `/api/milestones` | Bearer | `action`: `start` / `submit` (assigned freelancer) / `approve` (client) — approving does a real partial escrow release matching the milestone's amount |
| GET | `/api/referrals` | Bearer | Referral code + stats. Credits now actually accrue when a referred freelancer completes their first job |

### Chat & Notifications

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/chat/rooms` | Chat rooms — creating one now requires you to be one of the two participants, and both participants must be associated with the job |
| `GET/POST /api/chat/messages` | Messages in a room — posting now requires you to be a participant of that room |
| `GET/PATCH /api/notifications` | Notifications list + mark read |
| `GET /api/notifications/count` | `{unread: N}` for badge |

### Image Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload/sign` | Bearer | Cloudinary signed upload params, restricted to image formats. Not used by the actual avatar upload flow, which uses an unsigned Cloudinary preset directly from the browser |
| DELETE | `/api/upload/delete` | Bearer | Delete image (ownership-verified) |

### AI Routes

All require `Authorization: Bearer <token>` and every route is quota-capped on the free plan (bid-strategy has its own, stricter cap). Gemini key is server-side only.

| Endpoint | Description |
|----------|-------------|
| `POST /api/ai/bid-strategy` | `{jobId}` → optimal bid, win%, timing, risks |
| `POST /api/ai/evaluate-bids` | `{jobId}` → value scores, recommended bid. Re-fetches bids/freelancer profiles server-side rather than trusting client-submitted data |
| `POST /api/ai/generate-description` | `{title, category, skills}` → job description |
| `POST /api/ai/pricing-advisor` | `{title, category, skills}` → starting price, floor, decay |
| `POST /api/ai/summarize-reviews` | `{reviews[]}` → summary + strengths + improvements |
| `POST /api/ai/smart-search` | `{query}` → parsed filters |
| `POST /api/ai/chat-assist` | `{command, jobContext}` → drafted message |
| `POST /api/ai/quality-check` | `{content}` → trustScore, flags, action |

### Admin Routes (admin role + `ADMIN_SECRET_KEY` required)

| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/stats` | Dashboard KPIs |
| `GET/PATCH /api/admin/users` | List users, create admin user |
| `GET/PATCH/DELETE /api/admin/users/[id]` | User detail + update + soft-delete |
| `GET /api/admin/jobs` | List jobs with filters |
| `PATCH/DELETE /api/admin/jobs/[id]` | Update job, remove with reason |
| `GET/PATCH /api/admin/transactions` | List transactions, release/refund |
| `GET/PATCH /api/admin/disputes` | List disputes, resolve |
| `GET /api/admin/logs` | Audit log |
| `GET/PATCH /api/admin/config` | Platform config read/write |
| `GET /api/admin/config/env-status` | Env var presence check |
| `POST /api/admin/verify-key` | Verify admin panel key (rate-limited: 5/15min) |

### Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/seed` | Admin* | Wipes and reseeds all collections. *No auth required only on a completely empty, non-production database — see [Seed the database](#4-seed-the-database) |
| GET | `/api/users` | Bearer | List users. Non-admin callers no longer receive `email` in the response |
| POST/DELETE | `/api/keys` | Bearer | Generate/revoke a personal API key for `/api/v1/*` routes |

---

## Environment Variables

### `web/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (32+ chars, use `openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` for local dev |
| `ADMIN_SECRET_KEY` | Yes | Admin panel 2FA key |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret — server only |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Yes | Upload preset name |
| `GEMINI_API_KEY` | Yes | Google Gemini API key — server only |
| `AI_MODEL` | No | Gemini model ID (default: `gemini-2.0-flash`) |
| `GOOGLE_CLIENT_ID` | No | Enables Google Login |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `RAZORPAY_KEY_ID` | No | Payments (mock mode if absent) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No | Same value as `RAZORPAY_KEY_ID`, exposed to the browser for Razorpay Checkout |
| `RESEND_API_KEY` | No | Transactional email |
| `ALLOW_SEED` | No | Set to `true` to allow `/api/seed` in production. Never a substitute for admin auth — see [Seed the database](#4-seed-the-database) |

---

## Security

Four audit reports:
- [`web/SECURITY_AUDIT.md`](web/SECURITY_AUDIT.md) — NoSQL injection, ReDoS, brute-force, IDOR sweep (v10)
- [`geekbid_bid_acceptance_and_system_audit.md`](geekbid_bid_acceptance_and_system_audit.md) — job acceptance, escrow, chat, OAuth, and payment-integrity sweep (v11)
- [`geekbid_review_2026-07-02.md`](geekbid_review_2026-07-02.md) — verification of all v11 fixes + admin-key exposure, payment replay, offer race, and API auth gaps (v12)
- [`V15_FIXES.md`](V15_FIXES.md) — full security/bug/architecture/feature/CI-CD audit; atomic quota & escrow races closed, rate limiting extended (v15)

Summary of protections in place:

| Layer | Protection |
|-------|-----------|
| Auth | JWT (jose), bcrypt 12 rounds, HttpOnly refresh cookies |
| OAuth | CSRF `state` nonce validated on Google login callback; tokens handed off via one-time exchange code, never a URL query string |
| Rate limiting | 10 login attempts / 5 admin-key attempts per IP per 15 min; 10/min per user on every AI route; 20/15min per IP on token refresh; 60/min per key on the public v1 API |
| Input sanitization | `sanitizeString`, `sanitizeObjectId`, `sanitizeSearchRegex` on all user input |
| NoSQL injection | `$`-prefix keys stripped; all inputs forced to primitive types before DB queries |
| ReDoS | `sanitizeSearchRegex()` escapes all regex metacharacters before `$regex` use |
| IDOR | All mutations check ownership (clientId/freelancerId === userId from JWT), including job cancel/complete |
| Chat authorization | `/api/chat/rooms` and `/api/chat/messages` require the caller to be a participant |
| Escrow integrity | Job acceptance, escrow release/dispute, and milestone partial-release all use atomic, state-guarded updates — no read-then-write races |
| Quota integrity | Free-plan AI, job, and bid caps are all atomic `findOneAndUpdate` checks — no read-then-write races |
| Payment verification | Payment amounts are verified against Razorpay's captured amount server-side, never trusted from the client |
| ObjectId | All `new ObjectId()` calls guarded by `sanitizeObjectId()` — returns 400 not 500 |
| Admin panel | Requires admin role JWT + separate `ADMIN_SECRET_KEY` (2FA); `/api/seed` requires admin auth too |
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

---

## Branch History

| Branch | Description |
|--------|-------------|
| `v16` | **Latest** — landing page + feed dashboard visual redesign, dual-role accounts (`roles[]` + `/api/auth/switch-role`), OAuth role-mismatch fix, and bug fixes (QuickBid floor violation, Counter-Bid-at-floor UI, feed duplicate-key crash, job detail layout) |
| `v15` | Audit-driven fixes over v14: atomic AI-quota/milestone-escrow checks, rate limiting on AI/refresh/v1 routes, token-refresh race fix, `.env.example` brought in sync, root error/loading boundaries |
| `v14` | Correctness/reliability fixes over v12: exact integer-cent money math, cross-tab auth sync, hardened Mongo singleton, no error leaks |
| `v13_with_microservice_half_code` | Experiment — partial wiring of the Next.js frontend to the Express microservices via a gateway/BFF (reference only, not the recommended path) |
| `v12` / `main` / `master` | Admin-key exposure fix, payment replay protection, direct-offer race fix, API auth gaps closed |
| `v11` | Job/escrow/chat/OAuth security hardening, payment verification, referral & milestone payout fixes |
| `v10` | Admin panel, initial security hardening, Cloudinary CDN, Gemini AI |
| `v9` | Role-based feeds, landing page animations, CRUD fixes |
| `v7` | Royal Dark design system, horizontal carousels |
| `v5` | Mobile responsiveness, port pinning |
| `v4` | Live auction UX, feed differentiation, Docker |

---

## License

Private — All rights reserved © GeekBid
