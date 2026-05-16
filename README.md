# GeekBid — Reverse-Auction Freelance Platform

A full-stack reverse-auction marketplace where clients post jobs and freelancers bid prices **down** — the best value wins.

Built with **Next.js 16** (web) + **Node.js microservices** (backend) + **MongoDB Atlas**.

---

## 🏗️ Architecture

```
GeekBid/
├── web/                  # Next.js 16 — Frontend + API routes
│   ├── src/app/          # App Router pages
│   ├── src/app/api/      # REST API routes
│   ├── src/components/   # UI components (Radix + Tailwind)
│   └── src/lib/          # Auth, DB, utilities
├── backend/              # Node.js microservices
│   ├── services/         # 7 independent services
│   └── common/           # Shared middleware & utilities
└── docs/                 # Production & store readiness docs
```

## ✨ Features

### Web App (Next.js)

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero + feature showcase |
| Login | `/login` | Email/password + Google OAuth |
| Job Feed | `/feed` | Browse all open jobs with live pricing |
| Job Detail | `/jobs/[id]` | View job, place bids, watch price decay |
| Post Job | `/post-job` | Client job creation with floor validation |
| My Jobs | `/my-jobs` | Track posted/accepted jobs |
| Inbox | `/inbox` | Chat rooms & messaging |
| Payments | `/payments` | Razorpay-powered escrow & transactions |
| Earnings | `/earnings` | Freelancer earnings dashboard |
| Notifications | `/notifications` | Read/unread notification center |
| Profile | `/profile` | User profile & role management |
| Admin | `/admin` | Admin dashboard & dispute queue |

### API Routes (Next.js)

- **Auth**: Register, login, Google OAuth, JWT refresh, session management
- **Jobs**: CRUD, search, filtering
- **Bids**: Place, counter, accept bids
- **Payments**: Razorpay order creation & verification
- **Chat**: Room creation, message history
- **Notifications**: List, mark as read
- **Disputes**: Raise & manage disputes

### Backend Microservices (Node.js)

| Service | Port | Stack |
|---------|------|-------|
| API Gateway | `:3000` | Express, routing |
| Auth Service | `:3001` | Express, JWT, bcrypt |
| Job Service | `:3003` | Express, MongoDB |
| Bidding Service | `:3004` | Express, Socket.IO |
| Payment Service | `:3005` | Express, Razorpay |
| Notification Service | `:3006` | Express, MongoDB |
| Chat Service | `:3007` | Express, Socket.IO |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB Atlas** account ([cloud.mongodb.com](https://cloud.mongodb.com))
- **Razorpay** test keys ([dashboard.razorpay.com](https://dashboard.razorpay.com/app/keys))
- **Google OAuth** credentials (optional — [console.cloud.google.com](https://console.cloud.google.com/apis/credentials))

### 1. Clone & Install

```bash
git clone https://github.com/LakshinPathak/Geekbid.git
cd Geekbid
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: MONGODB_URI, JWT_SECRET, RAZORPAY keys

# Web
cp web/.env.example web/.env.local
# Fill in: MONGODB_URI, NEXTAUTH_SECRET, Google OAuth, RAZORPAY keys
```

### 3. Start Backend Services

```bash
cd backend
npm install
npm start          # Starts all 7 services concurrently
```

### 4. Start Web App

```bash
cd web
npm install
npm run dev        # → http://localhost:3000
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI Components | Radix UI, Lucide Icons, Sonner (toasts) |
| Auth | JWT (jose), bcrypt, Google OAuth 2.0 |
| Database | MongoDB Atlas (native driver) |
| Payments | Razorpay (test mode) |
| Real-time | Socket.IO (bidding + chat) |
| Backend | Express.js, Helmet, CORS, Rate Limiting |

---

## 🧪 Testing

```bash
# Unit & integration tests
npm test

# Type checking
cd web && npx tsc --noEmit

# Test coverage
npm test -- --coverage
```

---

## 📁 Environment Variables

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay test key secret |
| `RAZORPAY_WEBHOOK_SECRET` | ❌ | Razorpay webhook verification |
| `GATEWAY_PORT` | ❌ | Default: `3000` |
| `AUTH_PORT` | ❌ | Default: `3001` |
| `JOB_PORT` | ❌ | Default: `3003` |
| `BIDDING_PORT` | ❌ | Default: `3004` |
| `PAYMENT_PORT` | ❌ | Default: `3005` |
| `NOTIFICATION_PORT` | ❌ | Default: `3006` |
| `CHAT_PORT` | ❌ | Default: `3007` |

### `web/.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | ✅ | Secret for NextAuth sessions |
| `NEXTAUTH_URL` | ✅ | App URL (default: `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret |
| `RAZORPAY_KEY_ID` | ❌ | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | ❌ | Razorpay test key secret |

---

## 🔒 Security

- JWT-based authentication with access + refresh tokens
- bcrypt password hashing (12 rounds)
- Helmet security headers on all backend services
- Rate limiting on API endpoints
- CORS protection
- Input validation middleware
- HTTP-only secure cookies for sessions

---

## 📄 License

Private — All rights reserved.
