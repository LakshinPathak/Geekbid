# GeekBid — Reverse-Auction Freelance Marketplace

> **The world's first reverse-auction platform for tech talent.**  
> Clients post jobs. Prices decay over time. Freelancers bid the price **down**. Best value wins.

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

## Features

### For Clients
- Post jobs in 3 steps with a **live price decay preview**
- Set adaptive pricing — demand slows the decay automatically (more bidders = slower drop)
- View a **bid comparison matrix** — score, price, and skills side by side
- **Escrow payments** via Razorpay — funds held until you release them
- Accept bids directly from the feed or the job detail page
- Real-time notifications when new bids arrive

### For Freelancers
- **Live feed** with single, double, and triple column views
- **Match scoring** — each job shows your skill match percentage
- **Smart counter-bid assistant** — suggested aggressive / competitive / market-rate prices
- **Interactive price slider** — drag to your bid price, see hourly rate in real time
- **30-minute bid cooldown** shown as a depleting SVG ring timer
- Price trajectory indicators (Dropping Fast / Steady Decline / Holding Steady)
- GeekScore reputation system that grows with successful jobs

### Auction Experience
- Live price ticker with 30-second delta (↓ -$0.42 in last 30s)
- 5-stage urgency countdown (calm → yellow → orange → red → shaking)
- Ember particle effects on hot jobs (5+ bidders)
- Real-time bid toast notifications
- Forward price projection chart (what happens if 0 vs +3 more bids)
- Animated bid activity feed

---

## Pages

| # | Page | Route | Who sees it |
|---|------|-------|-------------|
| — | Landing | `/` | Everyone |
| 1 | Login / Register | `/login` | Everyone |
| 2 | Job Feed | `/feed` | Logged-in users |
| 3 | Job Detail | `/jobs/[id]` | Logged-in users |
| 4 | Post Job | `/post-job` | Clients only |
| 5 | My Jobs | `/my-jobs` | Logged-in users |
| 6 | Inbox | `/inbox` | Logged-in users |
| 7 | Payments | `/payments` | Logged-in users |
| 8 | Earnings | `/earnings` | Freelancers |
| 9 | Notifications | `/notifications` | Logged-in users |
| 10 | Profile | `/profile` | Logged-in users |
| 11 | Admin Dashboard | `/admin` | Admins only |
| 12 | Settings | `/settings` | Logged-in users |
| 13 | Pricing | `/pricing` | Everyone |
| 14 | Team | `/team` | Clients |
| 15 | Assessments | `/assessments` | Freelancers |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Space Grotesk + Inter fonts |
| **UI Components** | Radix UI, Lucide Icons, Sonner toasts |
| **Auth** | JWT (jose), bcrypt (12 rounds), Google OAuth 2.0 |
| **Database** | MongoDB Atlas (native driver) |
| **Payments** | Razorpay (escrow, orders, webhook verification) |
| **Real-time** | Socket.IO (bid decay broadcast + chat) |
| **Backend** | Express.js, 7 Node.js microservices |
| **Deployment** | Docker + Docker Compose |

---

## Architecture

```
GeekBid/
├── web/                        ← Next.js app (port 3000)
│   ├── src/app/                  App Router — 15 pages
│   ├── src/app/api/              REST API routes (auth, jobs, bids, payments, chat …)
│   ├── src/components/           Navbar, mobile bottom nav, job cards, modals
│   └── src/lib/                  Auth helpers, MongoDB client, pricing engine, store
│
├── backend/                    ← Node.js microservices
│   ├── services/gateway/         API Gateway (port 3000)
│   ├── services/auth-service/    JWT, Google OAuth (port 3001)
│   ├── services/job-service/     Job CRUD, search (port 3003)
│   ├── services/bidding-service/ Counter-bids, Socket.IO price decay (port 3004)
│   ├── services/payment-service/ Razorpay escrow (port 3005)
│   ├── services/notification-service/ (port 3006)
│   ├── services/chat-service/    Rooms, messages, Socket.IO (port 3007)
│   └── common/                   Shared auth middleware, rate limiting, DB
│
└── docker-compose.yml          ← Runs everything with one command
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

demandMultiplier: 0 bids → 1.0×  |  1-2 bids → 0.85×  |  3-4 bids → 0.7×  |  5+ bids → 0.55×
```

More competition = slower decay = more time for quality bids.

---

## Quick Start (Local Dev — Recommended)

### Prerequisites

- **Node.js** 18 or higher — [nodejs.org](https://nodejs.org)
- **MongoDB Atlas** free account — [cloud.mongodb.com](https://cloud.mongodb.com) (or use the connection string from your team)
- **Git**

### 1. Clone the repo

```bash
git clone https://github.com/LakshinPathak/Geekbid.git
cd Geekbid
git checkout v5
```

### 2. Set up environment variables

```bash
cd web
cp .env.example .env.local    # if .env.example exists, otherwise create .env.local
```

Create `web/.env.local` with the following content:

```env
# Required
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/geekbid?retryWrites=true&w=majority
NEXTAUTH_SECRET=any-random-string-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# Optional — needed only for Google Login
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# Optional — needed only for payments
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

> **Important:** `NEXTAUTH_URL` must be exactly `http://localhost:3000` — no trailing slash.

### 3. Install dependencies

```bash
# From the /web directory
npm install
```

### 4. Start the development server

```bash
npm run dev
# → App running at http://localhost:3000
```

> The dev script is pinned to port 3000 (`next dev --port 3000`). If port 3000 is already in use, you'll get a clear error — free the port before starting.

### 5. Seed the database

The first time (or to reset to fresh test data):

```bash
curl -X POST http://localhost:3000/api/seed
```

You'll get back a list of seeded records and test credentials.

### 6. Log in with a test account

| Role | Email | Password |
|------|-------|----------|
| Client | `maya@startup.io` | `password123` |
| Client | `derek@fintech.co` | `password123` |
| Client | `sarah@edtech.dev` | `password123` |
| Freelancer | `arjun@devmail.io` | `password123` |
| Freelancer | `priya@secmail.io` | `password123` |
| Freelancer | `leo@geekhub.dev` | `password123` |
| Admin | `admin@geekbid.io` | `admin123` |

---

## Docker Setup (Runs Everything)

If you want to run the full stack — MongoDB + backend microservices + web — in one command:

### Prerequisites

- **Docker** and **Docker Compose** — [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)

### Start everything

```bash
# From the repo root
docker-compose up
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3002 |
| Backend gateway | http://localhost:3000 |
| MongoDB | localhost:27017 |

> **Note on Docker ports:** The backend gateway occupies port 3000, so the web app is served on port **3002** in Docker. For Google OAuth with Docker, add `http://localhost:3002/api/auth/google/callback` to your Google Cloud Console authorized redirect URIs.

### Stop everything

```bash
docker-compose down          # stop containers
docker-compose down -v       # stop + wipe database
```

### Environment variables in Docker

Create a `.env` file in the repo root (next to `docker-compose.yml`):

```env
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret
```

Docker Compose will pick these up automatically.

---

## Google OAuth Setup

To enable "Continue with Google" login:

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add **Authorized JavaScript Origins:**
   - `http://localhost:3000` (local dev)
   - `http://localhost:3002` (Docker)
4. Add **Authorized Redirect URIs:**
   - `http://localhost:3000/api/auth/google/callback` (local dev)
   - `http://localhost:3002/api/auth/google/callback` (Docker)
5. Copy the **Client ID** and **Client Secret** into your `.env.local`

---

## API Reference

All endpoints are Next.js API routes under `/api/`. Authenticated routes require an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Auth | Body / Params |
|--------|----------|------|---------------|
| POST | `/api/auth` | No | `{action:"register", name, email, password, role}` or `{action:"login", email, password}` |
| GET | `/api/auth/me` | Bearer | — |
| POST | `/api/auth/refresh` | Cookie | — (uses `gb_refresh_token` cookie) |
| POST | `/api/auth/logout` | Bearer | — |
| GET | `/api/auth/google` | No | `?role=freelancer\|client` |
| GET | `/api/auth/google/callback` | No | Handled by Google redirect |

### Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | No | List all open jobs |
| POST | `/api/jobs` | Bearer (client) | Create a job |
| GET | `/api/jobs/[id]` | No | Get a single job |
| GET | `/api/jobs/recommended` | Bearer | Personalized recommendations |
| GET | `/api/jobs/pricing-hint?skills=React` | No | Market rate hint for given skills |
| PATCH | `/api/jobs/feature` | Bearer (client) | Toggle featured status |

### Bids

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/bids` | No | List all bids |
| GET | `/api/bids?jobId=xxx` | No | Bids for a specific job |
| POST | `/api/bids` | Bearer (freelancer) | Place a counter-bid — 30min cooldown enforced |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Bearer | List all users |
| GET | `/api/user` | Bearer | Get your own profile |
| PATCH | `/api/user` | Bearer | Update your profile |
| POST | `/api/user/verify-github` | Bearer | Link GitHub account |

### Chat

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/chat/rooms` | Bearer | List your chat rooms |
| POST | `/api/chat/rooms` | Bearer | `{jobId, participantIds[]}` |
| GET | `/api/chat/messages?roomId=xxx` | Bearer | Get messages in a room |
| POST | `/api/chat/messages` | Bearer | `{roomId, text}` — send a message |

### Payments & Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay order create, verify, config |
| GET | `/api/transactions` | Bearer | List your transactions |
| POST | `/api/transactions` | Bearer (client) | Release escrow payment |

### Other

| Endpoint | Description |
|----------|-------------|
| `GET /api/notifications` | List your notifications |
| `PATCH /api/notifications` | Mark as read |
| `GET /api/milestones?jobId=xxx` | List milestones |
| `GET /api/disputes` | List disputes |
| `GET/POST /api/keys` | Manage API keys |
| `GET /api/v1/jobs` | Public API (requires `X-API-Key` header) |
| `POST /api/seed` | Reset database with fresh test data |

---

## Environment Variables Reference

### `web/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | JWT signing secret — any random 32+ char string |
| `NEXTAUTH_URL` | Yes | Must be `http://localhost:3000` for local dev |
| `GOOGLE_CLIENT_ID` | No | Google OAuth — enables "Continue with Google" |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RAZORPAY_KEY_ID` | No | Razorpay test key — app works without this (mock mode) |
| `RAZORPAY_KEY_SECRET` | No | Razorpay test secret |

> **Port rule:** `NEXTAUTH_URL` must always match the port the server is actually running on. `npm run dev` is pinned to port 3000. If you change ports, update this variable to match.

### `backend/.env` (microservices)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | `geekbid-dev-secret` | Must match web's `NEXTAUTH_SECRET` if both services share users |
| `RAZORPAY_KEY_ID` | No | `rzp_test_placeholder` | Payment processing |
| `RAZORPAY_KEY_SECRET` | No | `secret_placeholder` | |
| `GATEWAY_PORT` | No | `3000` | |
| `AUTH_PORT` | No | `3001` | |
| `JOB_PORT` | No | `3003` | |
| `BIDDING_PORT` | No | `3004` | |
| `PAYMENT_PORT` | No | `3005` | |
| `NOTIFICATION_PORT` | No | `3006` | |
| `CHAT_PORT` | No | `3007` | |

---

## Security

- **JWT access tokens** expire in 15 minutes; **refresh tokens** last 7 days with automatic rotation
- **Refresh token theft detection** — compromised token revokes the entire session family
- **bcrypt** password hashing (12 salt rounds)
- **HttpOnly cookies** for refresh tokens — JavaScript cannot read them
- **Helmet** security headers on all backend services
- **Rate limiting:** 100 requests/15min (API), 10 requests/15min (auth endpoints)
- **NoSQL injection prevention** — strips `$` operator keys from all inputs
- **XSS prevention** — strips HTML tags from string inputs
- **CORS** configured per environment
- **Google OAuth credentials** excluded from git via `.gitignore` pattern `client_secret*.json`

---

## Troubleshooting

### "token_exchange_failed" on Google Login
The most common cause is a port mismatch. Make sure:
- `NEXTAUTH_URL` in `.env.local` matches the port your server is actually running on
- Run the server with `npm run dev` (pinned to port 3000) — never with `--port 3100` or other ports
- Google Cloud Console has `http://localhost:3000/api/auth/google/callback` in Authorized Redirect URIs

### Port 3000 already in use
```bash
# Find and kill the process on port 3000
lsof -ti:3000 | xargs kill -9
# Then start normally
npm run dev
```

### MongoDB connection errors
- Check your `MONGODB_URI` includes the database name: `.../geekbid?retryWrites=...`
- Whitelist your IP in MongoDB Atlas: Network Access → Add IP Address → Add Current IP
- Test the connection: `mongosh "your-connection-string"`

### Empty feed after login
The database might be empty. Seed it:
```bash
curl -X POST http://localhost:3000/api/seed
```

### Build errors after pulling latest
```bash
cd web
rm -rf .next node_modules
npm install
npm run build
```

---

## Branch History

| Branch | Description |
|--------|-------------|
| `main` | Stable base |
| `v2` | Full platform with dark+green design system |
| `v3` | 13 zero-dependency features |
| `v4` | Live auction UX, feed differentiation, Docker |
| `v5` | Design audit fixes, mobile responsiveness, port pinning ← **latest** |

---

## License

Private — All rights reserved © GeekBid
