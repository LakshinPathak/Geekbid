# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**  
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

![CI/CD](https://github.com/LakshinPathak/Geekbid/actions/workflows/ci.yml/badge.svg)

**Current version: v11** — Critical security & payment-integrity hardening across job acceptance, escrow, chat, and auth

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
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
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
├── web/                          ← Next.js 15 app (port 3000)
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
cp .env.local.example .env.local   # or create manually
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
| POST | `/api/auth` | No | `{action:"register"|"login", ...}` — `register` only allows `role: freelancer|client` |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/refresh` | Cookie | Silent token refresh |
| POST | `/api/auth/logout` | Bearer | Clears refresh cookie |
| GET | `/api/auth/google` | No | `?role=freelancer|client` — sets a CSRF state cookie before redirecting to Google |
| GET | `/api/auth/google/callback` | No | Validates the CSRF state, then redirects with a one-time `?google_exchange=` code (never the token itself) |
| POST | `/api/auth/google/exchange` | No | `{code}` → `{accessToken, user, expiresIn}` — redeems the one-time code from the callback; single-use, 60s TTL |

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
| PATCH | `/api/jobs/offer-response` | Freelancer | Accept or decline direct offer; declining now also creates an in-app notification for the client |

### Bids

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bids` | No | `?jobId=` filter |
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
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay order, verify. `PATCH` re-fetches the captured amount from Razorpay server-side rather than trusting the client |
| GET | `/api/transactions` | Bearer | Own transactions |
| PATCH | `/api/transactions` | Client | Release or dispute escrow — both are atomic and only succeed if the transaction is currently `held` |
| GET | `/api/disputes` | Bearer | Own disputes |
| PATCH | `/api/disputes` | Admin | Resolve dispute |

### Milestones & Referrals

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/milestones` | No | `?jobId=` — list milestones for a job |
| POST | `/api/milestones` | Client | Create milestones for a job |
| PATCH | `/api/milestones` | Bearer | `action`: `start` / `submit` (freelancer) / `approve` (client) — approving now does a real partial escrow release matching the milestone's amount |
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

All require `Authorization: Bearer <token>` and share one free-plan rate limit (bid-strategy has its own, stricter one). Gemini key is server-side only.

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
| `RESEND_API_KEY` | No | Transactional email |
| `ALLOW_SEED` | No | Set to `true` to allow `/api/seed` in production. Never a substitute for admin auth — see [Seed the database](#4-seed-the-database) |

---

## Security

Two audit reports:
- [`web/SECURITY_AUDIT.md`](web/SECURITY_AUDIT.md) — NoSQL injection, ReDoS, brute-force, IDOR sweep (v10)
- [`geekbid_bid_acceptance_and_system_audit.md`](geekbid_bid_acceptance_and_system_audit.md) — job acceptance, escrow, chat, OAuth, and payment-integrity sweep (v11)

Summary of protections in place:

| Layer | Protection |
|-------|-----------|
| Auth | JWT (jose), bcrypt 12 rounds, HttpOnly refresh cookies |
| OAuth | CSRF `state` nonce validated on Google login callback; tokens handed off via one-time exchange code, never a URL query string |
| Rate limiting | 10 login attempts / 5 admin-key attempts per IP per 15 min; shared quota across all AI routes |
| Input sanitization | `sanitizeString`, `sanitizeObjectId`, `sanitizeSearchRegex` on all user input |
| NoSQL injection | `$`-prefix keys stripped; all inputs forced to primitive types before DB queries |
| ReDoS | `sanitizeSearchRegex()` escapes all regex metacharacters before `$regex` use |
| IDOR | All mutations check ownership (clientId/freelancerId === userId from JWT), including job cancel/complete |
| Chat authorization | `/api/chat/rooms` and `/api/chat/messages` require the caller to be a participant |
| Escrow integrity | Job acceptance and escrow release/dispute use atomic, state-guarded updates — no read-then-write races |
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
| `v11` / `main` / `master` | **Latest** — Job/escrow/chat/OAuth security hardening, payment verification, referral & milestone payout fixes |
| `v10` | Admin panel, initial security hardening, Cloudinary CDN, Gemini AI |
| `v9` | Role-based feeds, landing page animations, CRUD fixes |
| `v7` | Royal Dark design system, horizontal carousels |
| `v5` | Mobile responsiveness, port pinning |
| `v4` | Live auction UX, feed differentiation, Docker |

---

## License

Private — All rights reserved © GeekBid
