# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**  
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

![CI/CD](https://github.com/LakshinPathak/Geekbid/actions/workflows/ci.yml/badge.svg)

**Current version: v10** — Admin panel · Cloudinary image CDN · Gemini AI features · Full security hardening

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

```bash
curl -X POST http://localhost:3000/api/seed
```

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
| POST | `/api/auth` | No | `{action:"register"|"login", ...}` |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/refresh` | Cookie | Silent token refresh |
| POST | `/api/auth/logout` | Bearer | Clears refresh cookie |
| GET | `/api/auth/google` | No | `?role=freelancer|client` |
| GET | `/api/auth/google/callback` | No | OAuth redirect handler |

### Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | No | `?category=` filter |
| POST | `/api/jobs` | Client | Plan limit enforced (free: 3/month) |
| GET | `/api/jobs/[id]` | No | Single job |
| PATCH | `/api/jobs/[id]` | Bearer | `action`: accept / accept_best / cancel / complete |
| GET | `/api/jobs/recommended` | Freelancer | Top 10 skill-matched open jobs |
| GET | `/api/jobs/pricing-hint` | No | `?skills=` — market rate data |
| POST | `/api/jobs/direct-offer` | Client | Fixed-price offer to freelancer |
| PATCH | `/api/jobs/offer-response` | Freelancer | Accept or decline direct offer |

### Bids

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bids` | No | `?jobId=` filter |
| POST | `/api/bids` | Freelancer | 30-min cooldown; plan limit enforced |
| GET | `/api/bids/my` | Freelancer | Own bid history with job details |

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
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay order, verify, webhook |
| GET | `/api/transactions` | Bearer | Own transactions |
| PATCH | `/api/transactions` | Client | Release or dispute escrow |
| GET | `/api/disputes` | Bearer | Own disputes |
| PATCH | `/api/disputes` | Admin | Resolve dispute |

### Chat & Notifications

| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/chat/rooms` | Chat rooms |
| `GET/POST /api/chat/messages` | Messages in a room |
| `GET/PATCH /api/notifications` | Notifications list + mark read |
| `GET /api/notifications/count` | `{unread: N}` for badge |

### Image Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload/sign` | Bearer | Cloudinary signed upload params |
| DELETE | `/api/upload/delete` | Bearer | Delete image (ownership-verified) |

### AI Routes

All require `Authorization: Bearer <token>`. Gemini key is server-side only.

| Endpoint | Description |
|----------|-------------|
| `POST /api/ai/bid-strategy` | `{jobId}` → optimal bid, win%, timing, risks |
| `POST /api/ai/evaluate-bids` | `{job, bids[]}` → value scores, recommended bid |
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

---

## Security

See [`web/SECURITY_AUDIT.md`](web/SECURITY_AUDIT.md) for the full audit report.

Summary of protections in place:

| Layer | Protection |
|-------|-----------|
| Auth | JWT (jose), bcrypt 12 rounds, HttpOnly refresh cookies |
| Rate limiting | 10 login attempts / 5 admin-key attempts per IP per 15 min |
| Input sanitization | `sanitizeString`, `sanitizeObjectId`, `sanitizeSearchRegex` on all user input |
| NoSQL injection | `$`-prefix keys stripped; all inputs forced to primitive types before DB queries |
| ReDoS | `sanitizeSearchRegex()` escapes all regex metacharacters before `$regex` use |
| IDOR | All mutations check ownership (clientId/freelancerId === userId from JWT) |
| ObjectId | All `new ObjectId()` calls guarded by `sanitizeObjectId()` — returns 400 not 500 |
| Admin panel | Requires admin role JWT + separate `ADMIN_SECRET_KEY` (2FA) |
| Secrets | `NEXTAUTH_SECRET` throws at startup if missing — no hardcoded fallbacks |

---

## Troubleshooting

**Empty feed after login**
```bash
curl -X POST http://localhost:3000/api/seed
```

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
| `v10` / `main` / `master` | **Latest** — Admin panel, security hardening, Cloudinary CDN, Gemini AI |
| `v9` | Role-based feeds, landing page animations, CRUD fixes |
| `v7` | Royal Dark design system, horizontal carousels |
| `v5` | Mobile responsiveness, port pinning |
| `v4` | Live auction UX, feed differentiation, Docker |

---

## License

Private — All rights reserved © GeekBid
