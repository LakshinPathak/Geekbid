# GeekBid — Reverse-Auction Freelance Platform

A full-stack reverse-auction marketplace where clients post jobs and freelancers bid prices **down** — the best value wins.

Built with **Next.js 16** (web) + **Node.js microservices** (backend) + **MongoDB Atlas**.

---

## Design

Dark + electric green (`#00FF88`) design system with Space Grotesk headings and Inter body text.

**Landing Page:**
- Live price decay animation widget
- Comparison table (GeekBid vs Traditional)
- Auto-rotating testimonial carousel
- Dual CTA (Client / Freelancer)

**All 11 app screens** use the same dark theme:
- Surface: `#0A0A0F` (page) / `#12121A` (cards) / `#1A1A24` (elevated)
- Accent: `#00FF88` (electric green) / `#00CC6A` (hover)
- Borders: `#1E1E2A`

---

## Architecture

```
GeekBid/
├── web/                  # Next.js 16 — Frontend + API routes
│   ├── src/app/          # App Router pages (11 screens)
│   ├── src/app/api/      # REST API routes (auth, jobs, bids, payments, chat, etc.)
│   ├── src/components/   # UI components (Radix + Tailwind)
│   └── src/lib/          # Auth, DB, state management, utilities
├── backend/              # Node.js microservices (7 services)
│   ├── services/         # Auth, Jobs, Bidding, Payments, Notifications, Chat, Gateway
│   └── common/           # Shared middleware (auth, validation, rate limiting, DB)
├── src/                  # React Native / Expo mobile app
│   ├── screens/          # 17 mobile screens
│   ├── components/       # Reusable mobile components
│   ├── services/         # API client + Socket.IO
│   └── context/          # App state context
└── docs/                 # Technical docs, screen prompts, production runbook
```

---

## Screens

| # | Page | Route | Description |
|---|------|-------|-------------|
| — | Landing | `/` | Hero with live price decay, features, comparison table, testimonials |
| 1 | Login / Register | `/login` | Split layout, role cards, Google OAuth, password strength |
| 2 | Job Feed | `/feed` | Search, skill filters, sort, 3-column grid with live decay pricing |
| 3 | Job Detail | `/jobs/[id]` | Two-column: details + sticky bid panel, price analytics, bid history |
| 4 | Post Job | `/post-job` | 3-step wizard with live price preview timeline |
| 5 | My Jobs | `/my-jobs` | Tab switcher, role-specific views, status badges |
| 6 | Inbox | `/inbox` | Sidebar room list + chat with green/dark message bubbles |
| 7 | Payments | `/payments` | Razorpay integration, escrow management, transaction table |
| 8 | Earnings | `/earnings` | Overview cards, bar chart mockup, job earnings breakdown |
| 9 | Notifications | `/notifications` | Type-colored icons, filter tabs, unread indicators |
| 10 | Profile | `/profile` | Editable form, skills pills, availability cards, danger zone |
| 11 | Admin Dashboard | `/admin` | Stats, disputes/users/jobs/transactions tabs, resolve form |

---

## Backend Microservices

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | `:3000` | Health check, service map |
| Auth Service | `:3001` | Register, login, JWT refresh, Google OAuth, user CRUD |
| Job Service | `:3003` | Job CRUD, search, filtering, watchlist |
| Bidding Service | `:3004` | Accept, counter-bid, Socket.IO price decay (15s broadcast) |
| Payment Service | `:3005` | Razorpay orders, verification, escrow release, disputes |
| Notification Service | `:3006` | CRUD notifications, mark read/all |
| Chat Service | `:3007` | Chat rooms, messages, Socket.IO real-time delivery |

### Price Decay Formula

```
currentPrice = max(startingPrice - decayRatePerHour × elapsedHours, minimumPrice)
```

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **MongoDB Atlas** account ([cloud.mongodb.com](https://cloud.mongodb.com))
- **Razorpay** test keys ([dashboard.razorpay.com](https://dashboard.razorpay.com/app/keys)) — optional, mock mode works without them
- **Google OAuth** credentials — optional ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))

### 1. Clone & Install

```bash
git clone https://github.com/LakshinPathak/Geekbid.git
cd Geekbid
git checkout v2
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env → set MONGODB_URI, JWT_SECRET

# Web
cp web/.env.example web/.env.local
# Edit web/.env.local → set MONGODB_URI, NEXTAUTH_SECRET
```

### 3. Install Dependencies

```bash
cd backend && npm install
cd ../web && npm install
```

### 4. Start Backend (all 7 services)

```bash
cd backend
npm start
```

### 5. Start Web App

```bash
cd web
npm run dev        # → http://localhost:3000
```

### 6. Seed Database

Open your browser and send a POST to seed the database with test data:

```bash
curl -X POST http://localhost:3000/api/seed
```

### 7. Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Client | `maya@startup.io` | `password123` |
| Client | `derek@fintech.co` | `password123` |
| Freelancer | `arjun@devmail.io` | `password123` |
| Freelancer | `priya@secmail.io` | `password123` |
| Admin | `admin@geekbid.io` | `admin123` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI Components | Radix UI, Lucide Icons, Sonner (toasts) |
| Design | Dark theme, Space Grotesk + Inter fonts, `#00FF88` accent |
| Auth | JWT (`jose` web / `jsonwebtoken` backend), bcrypt (12 rounds), Google OAuth 2.0 |
| Database | MongoDB Atlas (native driver) |
| Payments | Razorpay SDK (test + mock mode) |
| Real-time | Socket.IO (bidding price decay + chat) |
| Backend | Express.js, Helmet, CORS, Rate Limiting, NoSQL injection prevention |
| Mobile | React Native + Expo SDK 54, React Navigation |

---

## API Reference

### Next.js API Routes (Web)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth` | No | Register (`action=register`) or Login (`action=login`) |
| GET | `/api/auth/me` | Bearer | Get current user |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token |
| POST | `/api/auth/logout` | Cookie | Logout |
| GET | `/api/auth/google` | No | Google OAuth redirect |
| GET | `/api/jobs` | No | List all jobs |
| POST | `/api/jobs` | Bearer (client) | Create job |
| GET | `/api/jobs/[id]` | No | Get single job |
| PATCH | `/api/jobs/[id]` | Bearer (freelancer) | Accept job |
| GET | `/api/bids` | No | List bids |
| POST | `/api/bids` | Bearer (freelancer) | Counter-bid |
| GET/POST/PATCH | `/api/payments` | Bearer | Razorpay config / create order / verify |
| GET/PATCH | `/api/transactions` | Bearer | List / release / dispute |
| GET/POST/PATCH | `/api/notifications` | Bearer | List / create / mark read |
| GET/POST | `/api/chat/rooms` | Bearer | List / create rooms |
| GET/POST | `/api/chat/messages` | Bearer | List / send messages |
| GET/PATCH | `/api/disputes` | Bearer | List / resolve disputes |
| POST | `/api/seed` | No | Seed database with test data |

### Backend Microservice Routes

All services follow the pattern `http://localhost:<PORT>/v1/...` — see `docs/TECHNICAL_DOCUMENTATION.md` for the full 60+ endpoint reference.

---

## Environment Variables

### `backend/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | `geekbid-dev-secret-change-in-production` | JWT signing secret |
| `RAZORPAY_KEY_ID` | Yes | `rzp_test_placeholder` | Razorpay key (placeholder = mock mode) |
| `RAZORPAY_KEY_SECRET` | Yes | `secret_placeholder` | Razorpay secret |
| `GATEWAY_PORT` | No | `3000` | Gateway service port |
| `AUTH_PORT` | No | `3001` | Auth service port |
| `JOB_PORT` | No | `3003` | Job service port |
| `BIDDING_PORT` | No | `3004` | Bidding service port |
| `PAYMENT_PORT` | No | `3005` | Payment service port |
| `NOTIFICATION_PORT` | No | `3006` | Notification service port |
| `CHAT_PORT` | No | `3007` | Chat service port |

### `web/.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | — | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | `fallback-secret-not-for-production` | JWT signing secret |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | App base URL |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth secret |
| `RAZORPAY_KEY_ID` | No | `rzp_test_placeholder` | Razorpay key |
| `RAZORPAY_KEY_SECRET` | No | `secret_placeholder` | Razorpay secret |

---

## Security

- JWT access tokens (15 min) + refresh tokens (7 days) with rotation
- Refresh token theft detection (revokes all tokens)
- bcrypt password hashing (12 salt rounds)
- Helmet security headers on all services
- Rate limiting: 100 req/15min (API), 10 req/15min (auth)
- NoSQL injection prevention (strips `$` operators)
- XSS prevention (strips HTML tags)
- Input validation on all endpoints
- HttpOnly secure cookies for refresh tokens
- CORS protection

---

## Testing

```bash
# Unit & integration tests
npm test

# Type checking
cd web && npx tsc --noEmit

# Test coverage
npm test -- --coverage
```

---

## License

Private — All rights reserved.
