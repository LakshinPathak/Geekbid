# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**  
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

**Current version: v9** — Role-based feeds, premium landing page animations, full CRUD pipeline, Royal Dark design system.

---

## What is GeekBid?

Traditional freelance platforms make clients wade through dozens of proposals, guess at fair rates, and negotiate endlessly. GeekBid flips this model entirely.

**Here's how it works:**

1. **Client posts a job** — sets a starting price (e.g. $1,200), a floor price (e.g. $400), and a decay rate (e.g. -$30/hour)
2. **Price decays automatically** — the job price drops every hour until it hits the floor or a freelancer bids
3. **Freelancers bid the price down** — each counter-bid lowers the price further; the client accepts the best offer
4. **Everyone wins** — clients pay fair market rates, freelancers compete on quality not just price

```
$1,200 ──────────────────────────────── Starting Price
         \
          \   ← price decays at $30/hr
           \
$800        \──────── Freelancer A bids $780 ← accepted!
             \
$400 ─────────────────────────────────── Floor (never goes below this)
      ↑
   Posted    1h     2h     3h     4h
```

---

## What's New in v9

| Area | Change |
|------|--------|
| **Role-based feed router** | `/feed` auto-routes: clients → Procurement Terminal, freelancers → Mission Control |
| **Procurement Terminal** | SpendAnalytics, MyJobsSection carousel, MarketIntel, TalentPool panels |
| **Mission Control** | FreelancerStats, RecommendedCarousel, ActiveBidsTracker, full job grid with advanced filters |
| **Landing page animations** | Staggered hero entrance, price decay card glow + particle sparks, scan-line, dot-grid, section scroll-triggers |
| **Testimonials carousel** | Infinite auto-scroll, real randomuser.me photos, gradient fade masks, nav dots |
| **Modals** | DirectHireModal (GeekScore gate), InviteToBidModal, MessageFreelancerModal |
| **CRUD bug fixes** | Client "Accept Best" → award job to lowest bidder; notification count field fixed; bid update ObjectId safety; cancelJob / completeJob store actions added |
| **Invite tracking** | `/api/invites` — GET / POST / PATCH with notification side-effects |
| **Chat** | `/api/chat/rooms` + `/api/chat/messages` fully wired to inbox deep-link |

---

## Features

### For Clients
- Post jobs in 3 steps with a live price decay preview and adaptive pricing toggle
- **Procurement Terminal feed** — scrollable carousel of your active jobs with per-job bid panels
- **Spend Analytics bar** — budget posted, average bid, decay rate, savings from price drop
- **Accept Best Bid** — one click awards the job to the lowest bidder, creates escrow, fires emails
- **Invite to Bid** — invite specific freelancers from the Talent Pool
- **Direct Hire** — send a fixed-price offer directly to any freelancer with GeekScore > 500
- **Market Intelligence** — average starting prices, decay rates, time-to-first-bid in your categories
- **Escrow payments** — funds held until you release or mark complete

### For Freelancers
- **Mission Control feed** — KPI bar (matches, bids used, win rate, earning potential)
- **Recommended carousel** — top 5 skill-matched open jobs
- **Active Bids Tracker** — live rank, current price, cooldown timer
- **Smart filters** — search, category, budget range, competition level, $/hr floor, multi-skill picker
- **Sort modes** — Best Match, Price: Low→High, High→Low, Newest, Fewest Bids, Skill Match %
- **Quick Bid** — 2% below current price in one click
- **GeekScore** — reputation that grows with successful jobs and received ratings

### Auction Engine
- Fixed and adaptive pricing modes (demand slows decay)
- Live price ticker with 30-second delta
- 5-stage urgency countdown and ember particle effects
- 30-minute per-user bid cooldown (anti-freeze)
- Price history log on every job

---

## Pages

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing | Public |
| `/login` | Login / Register | Public |
| `/feed` | Role-based Feed | Logged in |
| `/jobs/[id]` | Job Detail | Logged in |
| `/post-job` | Post a Job | Clients |
| `/my-jobs` | My Jobs | Logged in |
| `/inbox` | Chat Inbox | Logged in |
| `/payments` | Payments | Logged in |
| `/earnings` | Earnings | Freelancers |
| `/notifications` | Notifications | Logged in |
| `/profile` | Profile | Logged in |
| `/admin` | Admin Dashboard | Admins |
| `/settings` | Settings | Logged in |
| `/pricing` | Pricing Plans | Public |
| `/team` | Team Members | Clients |
| `/assessments` | Skill Assessments | Freelancers |

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
| **Payments** | Razorpay escrow (order → verify → release flow) |
| **Email** | Nodemailer — job posted, bid received, accepted, cancelled, completed |
| **Real-time** | Socket.IO (bid decay broadcast + chat) |
| **Backend** | Express.js microservices |

---

## Architecture

```
GeekBid/
├── web/                          ← Next.js 15 app (port 3000)
│   ├── src/app/                    App Router — 16 pages
│   │   └── api/                    45 REST API routes
│   ├── src/components/
│   │   ├── feed/                   12 feed components (role-split)
│   │   │   ├── ClientFeed.tsx        Procurement Terminal
│   │   │   ├── FreelancerFeed.tsx    Mission Control
│   │   │   ├── MyJobsSection.tsx     Client job carousel + bid panels
│   │   │   ├── TalentPool.tsx        Freelancer browse for clients
│   │   │   ├── SpendAnalytics.tsx    Client KPI bar
│   │   │   ├── FreelancerStats.tsx   Freelancer KPI bar
│   │   │   ├── RecommendedCarousel.tsx
│   │   │   ├── ActiveBidsTracker.tsx
│   │   │   ├── MarketIntel.tsx
│   │   │   ├── CompetitorAnalysis.tsx
│   │   │   ├── DirectHireModal.tsx
│   │   │   ├── InviteToBidModal.tsx
│   │   │   └── MessageFreelancerModal.tsx
│   │   └── modals/
│   │       └── AuctionVictoryModal.tsx
│   └── src/lib/
│       ├── store.tsx               App-wide context + all store actions
│       ├── auth.ts                 JWT helpers + authenticateRequest
│       ├── pricing.ts              Adaptive price formula
│       ├── mongodb.ts              Atlas connection singleton
│       └── email.ts                Nodemailer transactional emails
│
├── backend/                      ← Express microservices
│   ├── services/gateway/           Port 3000
│   ├── services/auth-service/      Port 3001
│   ├── services/job-service/       Port 3003
│   ├── services/bidding-service/   Port 3004 (Socket.IO)
│   ├── services/payment-service/   Port 3005
│   ├── services/notification-service/ Port 3006
│   └── services/chat-service/      Port 3007 (Socket.IO)
│
└── docker-compose.yml
```

### Price Decay Formula

**Fixed pricing:**
```
currentPrice = max(startingPrice − decayRate × elapsedHours, minimumPrice)
```

**Adaptive pricing** (demand-aware):
```
effectiveRate = decayRate × demandMultiplier(bidderCount)
currentPrice  = max(startingPrice − effectiveRate × elapsedHours, minimumPrice)

demandMultiplier:  0 bids → 1.0×  |  1-2 → 0.85×  |  3-4 → 0.7×  |  5+ → 0.55×
```

More competition = slower decay = more time for quality bids.

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB Atlas** free account (or use the project connection string)
- **Git**

### 1. Clone & checkout

```bash
git clone https://github.com/LakshinPathak/Geekbid.git
cd Geekbid
git checkout main   # main = v9
```

### 2. Environment variables

```bash
cd web
```

Create `web/.env.local`:

```env
# Required
MONGODB_URI=mongodb+srv://lakshin25:<password>@cluster0.wpsakax.mongodb.net/geekbid?retryWrites=true&w=majority
NEXTAUTH_SECRET=any-random-string-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# Optional — Google Login
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Optional — Payments
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
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

---

## API Reference

All routes live under `/api/`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| POST | `/api/auth` | No | `{action:"register"\|"login", ...}` |
| GET | `/api/auth/me` | Bearer | Current user profile |
| POST | `/api/auth/refresh` | Cookie | Silent token refresh |
| POST | `/api/auth/logout` | Bearer | Clears refresh cookie |
| GET | `/api/auth/google` | No | `?role=freelancer\|client` |
| GET | `/api/auth/google/callback` | No | OAuth redirect handler |

### Jobs

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/jobs` | No | `?category=` filter, sorted by featured then newest |
| POST | `/api/jobs` | Client | Plan limit enforced (free: 3/month) |
| GET | `/api/jobs/[id]` | No | Single job with ObjectId fallback |
| PATCH | `/api/jobs/[id]` | Bearer | `action`: `accept` (freelancer) / `accept_best` (client) / `cancel` / `complete` |
| PATCH | `/api/jobs/[id]/cancel` | Client | Cancels open job, notifies all bidders |
| PATCH | `/api/jobs/[id]/complete` | Client | Marks accepted/in-progress job complete |
| GET | `/api/jobs/recommended` | Freelancer | Top 10 skill-matched open jobs |
| GET | `/api/jobs/pricing-hint` | No | `?skills=React,Node.js` — market rate from historical data |
| POST | `/api/jobs/direct-offer` | Client | Fixed-price offer to freelancer with GeekScore > 500 |
| PATCH | `/api/jobs/offer-response` | Freelancer | `{jobId, response:"accepted"\|"declined"}` |
| PATCH | `/api/jobs/feature` | Client | Toggle featured status |

### Bids

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/bids` | No | `?jobId=` filter |
| POST | `/api/bids` | Freelancer | 30-min cooldown per job; plan limit enforced |
| GET | `/api/bids/my` | Freelancer | Own bid history with joined job details |

### Freelancer Dashboard

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/freelancer/dashboard` | Freelancer | KPIs: matched jobs, bids used, win rate, earning potential |
| GET | `/api/freelancer/bid-tracker` | Freelancer | Active bids with rank, current price, cooldown |
| GET | `/api/freelancer/earnings` | Freelancer | Transaction history + totals |
| GET | `/api/freelancer/match-radar` | Freelancer | Skill gap analysis |
| GET | `/api/freelancer/price-alerts` | Freelancer | Jobs nearing floor price |

### Client Dashboard

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/client/dashboard` | Client | KPIs: jobs, budget, savings, avg bid |
| GET | `/api/client/market-intel` | Client | `?category=` — market avg prices, top skills, time-to-bid |
| GET | `/api/client/activity-feed` | Client | Recent bid activity on own jobs |
| GET | `/api/client/job-health` | Client | Health matrix for open jobs |
| GET | `/api/client/spend-analytics` | Client | Spend breakdown by category |

### Invites

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/invites` | Bearer | Role-filtered: client sees sent, freelancer sees received |
| POST | `/api/invites` | Client | `{freelancerId, jobId}` — creates notification |
| PATCH | `/api/invites` | Freelancer | `{inviteId, response:"accepted"\|"declined"}` |

### Chat

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/chat/rooms` | Bearer | Rooms where user is a participant |
| POST | `/api/chat/rooms` | Bearer | `{jobId, participantIds[]}` — idempotent |
| GET | `/api/chat/messages` | Bearer | `?roomId=` — 500 messages max |
| POST | `/api/chat/messages` | Bearer | `{roomId, text}` |

### Notifications

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/notifications` | Bearer | Last 100, sorted newest first |
| POST | `/api/notifications` | Bearer | Create a notification (internal use) |
| PATCH | `/api/notifications` | Bearer | `{notificationId}` or `{markAll:true}` |
| GET | `/api/notifications/count` | Bearer | `{unread: N}` for navbar badge |

### Payments & Transactions

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay order, verify, webhook |
| GET | `/api/transactions` | Bearer | Own transactions |
| PATCH | `/api/transactions` | Client | Release or dispute escrow |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/users` | List users (logged-in) |
| `GET /api/users/[id]` | Public profile |
| `GET /api/user` | Own full profile |
| `PATCH /api/user` | Update own profile |
| `POST /api/user/verify-github` | Link GitHub handle |
| `GET /api/milestones?jobId=` | Job milestones |
| `GET /api/disputes` | Disputes |
| `GET /api/reviews` | Reviews |
| `GET /api/referrals` | Referral stats |
| `GET /api/teams` | Client teams |
| `GET /api/assessments` | Skill assessments |
| `GET /api/keys` | API key management |
| `GET /api/v1/jobs` | Public API (`X-API-Key` required) |
| `POST /api/email-logs` | Email delivery log |
| `POST /api/seed` | Reset DB with test data |

---

## Environment Variables

### `web/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret (32+ chars) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` | No | Enables Google Login |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `RAZORPAY_KEY_ID` | No | Payments (app works without — mock mode) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |

---

## Docker Setup

```bash
# From repo root
docker-compose up
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3002 |
| Gateway | http://localhost:3000 |
| MongoDB | localhost:27017 |

---

## Troubleshooting

**Empty feed after login** — seed the DB:
```bash
curl -X POST http://localhost:3000/api/seed
```

**"Only freelancers can accept jobs" for clients** — fixed in v9 (use latest main branch).

**Notification badge always 0** — fixed in v9 (`isRead` field query corrected).

**Port 3000 in use:**
```bash
lsof -ti:3000 | xargs kill -9 && npm run dev
```

**Build errors after pull:**
```bash
cd web && rm -rf .next node_modules && npm install && npm run dev
```

---

## Branch History

| Branch | Description |
|--------|-------------|
| `main` | **v9** — Current stable (role-based feeds, animations, CRUD fixes) |
| `v9` | Same as main |
| `v7` | Royal Dark design system, horizontal carousels |
| `v5` | Mobile responsiveness, port pinning |
| `v4` | Live auction UX, feed differentiation, Docker |

---

## License

Private — All rights reserved © GeekBid
