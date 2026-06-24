# GeekBid — Technical Documentation

> **Version**: 1.0.0 | **Generated**: 2026-06-24  
> Reverse-auction freelance marketplace where clients post jobs and freelancers bid prices **down**.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Backend Microservices API](#4-backend-microservices-api)
5. [Web App (Next.js) API Routes](#5-web-app-nextjs-api-routes)
6. [Frontend Pages & Components](#6-frontend-pages--components)
7. [Mobile App (React Native)](#7-mobile-app-react-native)
8. [Authentication Flow](#8-authentication-flow)
9. [Real-Time Features](#9-real-time-features)
10. [Security](#10-security)
11. [Environment Variables](#11-environment-variables)
12. [Seed Data](#12-seed-data)

---

## 1. Architecture Overview

GeekBid is a **three-tier** application:

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                    │
│   ┌──────────────┐   ┌───────────────────┐   ┌───────────────┐  │
│   │ Mobile App   │   │  Web App (Next.js) │   │  Admin Panel  │  │
│   │ React Native │   │  Port :3000        │   │  /admin route │  │
│   │ Expo SDK 54  │   │  App Router        │   │               │  │
│   └──────┬───────┘   └────────┬──────────┘   └───────┬───────┘  │
│          │                    │                       │          │
├──────────┼────────────────────┼───────────────────────┼──────────┤
│          │         NEXT.JS API ROUTES                 │          │
│          │    /api/auth, /api/jobs, /api/bids,        │          │
│          │    /api/payments, /api/chat, etc.           │          │
│          │         (MongoDB direct access)             │          │
├──────────┼────────────────────────────────────────────┼──────────┤
│          │         BACKEND MICROSERVICES               │          │
│   ┌──────┴──────────────────────────────────────┐    │          │
│   │ API Gateway (:3000)                          │    │          │
│   │ Auth Service (:3001)                         │    │          │
│   │ Job Service (:3003)                          │    │          │
│   │ Bidding Service (:3004) + Socket.IO          │    │          │
│   │ Payment Service (:3005) + Razorpay           │    │          │
│   │ Notification Service (:3006)                 │    │          │
│   │ Chat Service (:3007) + Socket.IO             │    │          │
│   └──────────────────┬──────────────────────────┘    │          │
├──────────────────────┼───────────────────────────────┼──────────┤
│                      │       DATABASE                 │          │
│               ┌──────┴──────┐                                    │
│               │ MongoDB     │                                    │
│               │ Atlas       │                                    │
│               │ DB: geekbid │                                    │
│               └─────────────┘                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Dual API Surface

| Surface | Used By | DB Access | Auth Method |
|---------|---------|-----------|-------------|
| **Next.js API Routes** (`web/src/app/api/`) | Web app | Direct MongoDB via `jose` JWT | `jose` HS256 tokens + HttpOnly cookie |
| **Backend Microservices** (`backend/services/`) | Mobile app | Direct MongoDB via `jsonwebtoken` | `jsonwebtoken` Bearer tokens |

Both surfaces share the same `geekbid` MongoDB database and collections.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Web Frontend** | Next.js (App Router) | 16.2.3 |
| **Web UI** | React, Radix UI, Tailwind CSS 4, Lucide Icons, Sonner | React 19.2.4 |
| **Mobile App** | React Native + Expo | SDK 54, RN 0.81.5 |
| **Mobile Navigation** | React Navigation (Native Stack + Bottom Tabs) | 7.x |
| **Backend Services** | Express.js | 4.21.2 |
| **Database** | MongoDB Atlas (native driver) | 7.x |
| **Auth (Web)** | `jose` (JWT), `bcryptjs` | jose 6.2.2 |
| **Auth (Backend)** | `jsonwebtoken`, `bcryptjs` | jwt 9.0.3 |
| **Payments** | Razorpay SDK | 2.9.6 |
| **Real-Time** | Socket.IO | 4.8.x |
| **Security** | Helmet, CORS, express-rate-limit | — |

---

## 3. Database Schema

**Database name**: `geekbid`

### 3.1 Collections & Document Shapes

#### `users`
```json
{
  "_id": "ObjectId",
  "fullName": "string",
  "email": "string (unique, lowercase)",
  "password": "string (bcrypt hash, 12 rounds)",
  "role": "client | freelancer | admin",
  "avatarInitial": "string (2 chars, e.g. 'MS')",
  "geekScore": "number (freelancers only, default 100)",
  "skills": ["string"],
  "bio": "string",
  "isVerified": "boolean",
  "company": "string (clients)",
  "availability": "available | part-time | unavailable",
  "hourlyRateMin": "number",
  "hourlyRateMax": "number",
  "githubUsername": "string (optional)",
  "googleId": "string (OAuth users, sparse index)",
  "avatarUrl": "string (OAuth users)",
  "authProvider": "google (OAuth users)",
  "createdAt": "ISO string",
  "updatedAt": "Date"
}
```

#### `jobs`
```json
{
  "_id": "ObjectId",
  "clientId": "string (user ID)",
  "title": "string (5-200 chars)",
  "description": "string (0-5000 chars)",
  "skillsRequired": ["string"],
  "startingPrice": "number",
  "minimumPrice": "number (price floor)",
  "decayRatePerHour": "number ($/hr decay)",
  "estimatedHours": "number",
  "postedAt": "ISO string",
  "deadlineAt": "ISO string",
  "status": "open | accepted | expired | cancelled",
  "visibility": "public | invite_only",
  "acceptedBy": "string (freelancer user ID)",
  "acceptedAt": "ISO string",
  "finalPrice": "number",
  "createdAt": "ISO string",
  "updatedAt": "Date"
}
```

#### `bids`
```json
{
  "_id": "ObjectId",
  "jobId": "string",
  "freelancerId": "string",
  "bidType": "accept | counter",
  "bidPrice": "number",
  "message": "string (counter bids only)",
  "createdAt": "ISO string",
  "updatedAt": "Date"
}
```

#### `transactions`
```json
{
  "_id": "ObjectId",
  "jobId": "string",
  "clientId": "string",
  "freelancerId": "string",
  "grossAmount": "number",
  "platformFee": "number (10% of gross)",
  "netAmount": "number (gross - fee)",
  "escrowStatus": "held | released | disputed",
  "paymentMethod": "razorpay (optional)",
  "razorpayOrderId": "string (optional)",
  "razorpayPaymentId": "string (optional)",
  "razorpaySignature": "string (optional)",
  "currency": "string (default INR)",
  "createdAt": "ISO string",
  "releasedAt": "ISO string (optional)",
  "releasedBy": "string (optional)",
  "verified": "boolean",
  "mock": "boolean"
}
```

#### `disputes`
```json
{
  "_id": "ObjectId",
  "transactionId": "string",
  "raisedBy": "string (user ID)",
  "reason": "string",
  "status": "open | in_review | resolved",
  "resolution": "string (optional)",
  "resolvedAt": "ISO string (optional)",
  "resolvedBy": "string (optional)",
  "createdAt": "ISO string"
}
```

#### `notifications`
```json
{
  "_id": "ObjectId",
  "userId": "string | ObjectId",
  "type": "price_drop | counter_bid | payment | job_match | general",
  "title": "string",
  "body": "string",
  "jobId": "string | ObjectId (optional)",
  "isRead": "boolean (default false)",
  "createdAt": "ISO string | Date"
}
```

#### `chat_rooms`
```json
{
  "_id": "ObjectId",
  "jobId": "string",
  "participantIds": ["string (user IDs)"],
  "createdAt": "ISO string",
  "updatedAt": "ISO string"
}
```

#### `chat_messages` / `chatmessages`
```json
{
  "_id": "ObjectId",
  "roomId": "string | ObjectId",
  "senderId": "string | ObjectId",
  "text": "string (1-2000 chars)",
  "createdAt": "Date | ISO string",
  "updatedAt": "Date"
}
```

#### `refresh_tokens`
```json
{
  "_id": "ObjectId",
  "userId": "string (unique)",
  "token": "string (JWT refresh token)",
  "createdAt": "Date",
  "expiresAt": "Date (TTL index, auto-delete)"
}
```

### 3.2 MongoDB Indexes

| Collection | Index | Options |
|-----------|-------|---------|
| `users` | `{ email: 1 }` | unique |
| `users` | `{ googleId: 1 }` | sparse |
| `users` | `{ role: 1 }` | — |
| `jobs` | `{ status: 1, postedAt: -1 }` | — |
| `jobs` | `{ clientId: 1 }` | — |
| `jobs` | `{ acceptedBy: 1 }` | — |
| `bids` | `{ jobId: 1 }` | — |
| `bids` | `{ freelancerId: 1 }` | — |
| `transactions` | `{ clientId: 1 }` | — |
| `transactions` | `{ freelancerId: 1 }` | — |
| `notifications` | `{ userId: 1, createdAt: -1 }` | — |
| `chat_rooms` | `{ participantIds: 1 }` | — |
| `chat_rooms` | `{ jobId: 1 }` | — |
| `chat_messages` | `{ roomId: 1, createdAt: 1 }` | — |
| `disputes` | `{ transactionId: 1 }` | — |
| `refresh_tokens` | `{ userId: 1 }` | unique |
| `refresh_tokens` | `{ expiresAt: 1 }` | TTL (expireAfterSeconds: 0) |

---

## 4. Backend Microservices API

**Base URL**: `http://localhost:<PORT>/v1`

All services share common middleware: Helmet, CORS, rate limiting, input sanitization, JSON body parsing (1MB limit).

### Response Format

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 100 } }

// Error
{ "success": false, "error": { "code": "ERR_XXX", "message": "..." } }
```

### Rate Limits
- **General API**: 100 requests / 15 min / IP
- **Auth endpoints**: 10 requests / 15 min / IP

---

### 4.1 Gateway Service (`:3000`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v1` | No | Health check — returns service name + status |
| `GET` | `/v1/info` | No | Lists all microservice URLs |
| `GET` | `/health` | No | Simple health probe |

---

### 4.2 Auth Service (`:3001`)

| Method | Endpoint | Auth | Description | CRUD |
|--------|----------|------|-------------|------|
| `POST` | `/v1/auth/register` | No (rate-limited) | Register new user | **Create** |
| `POST` | `/v1/auth/login` | No (rate-limited) | Login with email/password | **Read** |
| `POST` | `/v1/auth/refresh` | No | Rotate refresh token → new token pair | — |
| `POST` | `/v1/auth/logout` | Bearer | Revoke all refresh tokens | — |
| `GET` | `/v1/auth/me` | Bearer | Get current user profile | **Read** |
| `GET` | `/v1/users/:id` | No | Get user by ID (public) | **Read** |
| `GET` | `/v1/users` | No | List users (optional `?role=` filter, paginated) | **Read** |
| `PATCH` | `/v1/users/:id` | Bearer | Update user profile | **Update** |
| `DELETE` | `/v1/users/:id` | Bearer | Delete user account | **Delete** |

**Register** — `POST /v1/auth/register`
```json
// Request
{ "email": "user@example.com", "fullName": "John Doe", "password": "secret123", "role": "freelancer" }
// Response (201)
{ "success": true, "data": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900, "user": { ... } } }
```

**Login** — `POST /v1/auth/login`
```json
// Request
{ "email": "user@example.com", "password": "secret123" }
// Response (200)
{ "success": true, "data": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900, "user": { ... } } }
```

**Update User** — `PATCH /v1/users/:id`  
Allowed fields: `fullName`, `bio`, `skills`, `company`, `availability`, `hourlyRateMin`, `hourlyRateMax`, `githubUsername`. Only self or admin.

---

### 4.3 Job Service (`:3003`)

| Method | Endpoint | Auth | Description | CRUD |
|--------|----------|------|-------------|------|
| `GET` | `/v1/jobs` | No | List jobs (filter: `status`, `skills`, `clientId`, `sort`, paginated) | **Read** |
| `GET` | `/v1/jobs/:id` | No | Get single job by ID | **Read** |
| `POST` | `/v1/jobs` | Bearer | Create a new job | **Create** |
| `PATCH` | `/v1/jobs/:id` | Bearer | Edit job (only if status=open) | **Update** |
| `DELETE` | `/v1/jobs/:id` | Bearer | Delete job + cascade delete bids (only if open) | **Delete** |
| `POST` | `/v1/jobs/:id/watch` | Bearer | Add job to user's watchlist | **Create** |
| `DELETE` | `/v1/jobs/:id/watch` | Bearer | Remove job from watchlist | **Delete** |

**Sort options**: `price_high`, `price_low`, `deadline`, default: `postedAt desc`

**Create Job** — `POST /v1/jobs`
```json
{
  "title": "Build AI chatbot",
  "description": "Production-ready chatbot...",
  "skillsRequired": ["React", "FastAPI"],
  "startingPrice": 800,
  "minimumPrice": 350,
  "decayRatePerHour": 15,
  "estimatedHours": 35,
  "deadlineAt": "2026-07-01T00:00:00Z",
  "visibility": "public"
}
```

---

### 4.4 Bidding Service (`:3004`) — Socket.IO enabled

| Method | Endpoint | Auth | Description | CRUD |
|--------|----------|------|-------------|------|
| `GET` | `/v1/bids` | No | List bids (filter: `jobId`, `freelancerId`, paginated) | **Read** |
| `GET` | `/v1/bids/:id` | No | Get single bid | **Read** |
| `POST` | `/v1/bids/accept` | Bearer | Accept job at current decayed price | **Create** |
| `POST` | `/v1/bids/counter` | Bearer | Place a counter-bid | **Create** |
| `PATCH` | `/v1/bids/:id` | Bearer | Update counter-bid (price/message) | **Update** |
| `DELETE` | `/v1/bids/:id` | Bearer | Withdraw a bid (not accepted bids) | **Delete** |

**Price Decay Formula**:
```
currentPrice = max(startingPrice - decayRatePerHour × elapsedHours, minimumPrice)
```

**Socket.IO Events emitted**:
- `price_update` — every 15 seconds for all open jobs: `{ job_id, current_price }`
- `job_accepted` — when a job is accepted: `{ job_id, freelancer_id, final_price }`

**Accept Job** — `POST /v1/bids/accept`
- Creates bid record (type=accept)
- Updates job status to "accepted"
- Creates escrow transaction (10% platform fee)

---

### 4.5 Payment Service (`:3005`)

| Method | Endpoint | Auth | Description | CRUD |
|--------|----------|------|-------------|------|
| `GET` | `/v1/payments/history` | No | List all transactions (last 50) | **Read** |
| `GET` | `/v1/payments/transactions/:id` | No | Get single transaction | **Read** |
| `GET` | `/v1/payments/config` | No | Get Razorpay public key + currency | **Read** |
| `GET` | `/v1/payments/status/:paymentId` | No | Get Razorpay payment status | **Read** |
| `POST` | `/v1/payments/create-order` | Bearer | Create Razorpay order | **Create** |
| `POST` | `/v1/payments/verify` | Bearer | Verify payment signature + record transaction | **Create** |
| `POST` | `/v1/payments/release/:txId` | Bearer | Release escrow funds | **Update** |
| `POST` | `/v1/payments/dispute/:txId` | Bearer | Dispute escrow → create dispute record | **Create** |
| `POST` | `/v1/payments/webhook` | No | Razorpay webhook handler | — |
| `GET` | `/v1/disputes` | No | List disputes (filter: `status`) | **Read** |
| `PATCH` | `/v1/disputes/:id` | Bearer | Resolve a dispute | **Update** |

**Mock Mode**: When Razorpay keys contain "placeholder", service runs in mock mode returning fake order IDs prefixed `order_mock_`.

---

### 4.6 Notification Service (`:3006`)

| Method | Endpoint | Auth | Description | CRUD |
|--------|----------|------|-------------|------|
| `GET` | `/v1/notifications` | No | List notifications (filter: `userId`, `unread`, `type`, paginated) | **Read** |
| `GET` | `/v1/notifications/:id` | No | Get single notification | **Read** |
| `POST` | `/v1/notifications` | Bearer | Create notification | **Create** |
| `PATCH` | `/v1/notifications/:id/read` | Bearer | Mark single notification read | **Update** |
| `PATCH` | `/v1/notifications/read-all` | Bearer | Mark all user notifications read | **Update** |
| `DELETE` | `/v1/notifications/:id` | Bearer | Delete single notification | **Delete** |
| `DELETE` | `/v1/notifications?userId=xxx` | Bearer | Clear all user notifications | **Delete** |

---

### 4.7 Chat Service (`:3007`) — Socket.IO enabled

| Method | Endpoint | Auth | Description | CRUD |
|--------|----------|------|-------------|------|
| `GET` | `/v1/chat/rooms` | No | List chat rooms (filter: `userId`) | **Read** |
| `POST` | `/v1/chat/rooms` | Bearer | Create chat room (deduplicates by jobId) | **Create** |
| `DELETE` | `/v1/chat/rooms/:roomId` | Bearer | Delete room + cascade delete messages | **Delete** |
| `GET` | `/v1/chat/:roomId/messages` | No | Get messages for room (paginated) | **Read** |
| `POST` | `/v1/chat/:roomId/messages` | Bearer | Send message + emit via Socket.IO | **Create** |
| `PATCH` | `/v1/chat/messages/:messageId` | Bearer | Edit message text | **Update** |
| `DELETE` | `/v1/chat/messages/:messageId` | Bearer | Delete message | **Delete** |

**Socket.IO Events**:
- Client emits `join_room(roomId)` to subscribe
- Server emits `chat_message` on new messages


---

## 5. Web App (Next.js) API Routes

**Base URL**: `http://localhost:3000/api`

These routes are server-side Next.js App Router handlers that connect **directly to MongoDB** (no microservice hop). Auth uses `jose` library with HttpOnly cookies for refresh tokens.

### 5.1 Auth Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `POST` | `/api/auth` | No | Register (`action=register`) or Login (`action=login`) | **Create/Read** |
| `GET` | `/api/auth/me` | Bearer | Get current user from access token | **Read** |
| `POST` | `/api/auth/refresh` | Cookie | Rotate refresh token → new access + refresh token pair | — |
| `POST` | `/api/auth/logout` | Cookie | Revoke all refresh tokens, clear cookie | — |
| `GET` | `/api/auth/google` | No | Redirect to Google OAuth consent screen | — |
| `GET` | `/api/auth/google/callback` | No | Handle OAuth callback → create/find user → redirect with tokens | **Create/Read** |

**Register** — `POST /api/auth` with `action: "register"`:
```json
{ "action": "register", "name": "John", "email": "john@x.com", "password": "pass123", "role": "freelancer" }
// Response: { "accessToken": "...", "user": {...}, "expiresIn": 900 }
// + Sets HttpOnly cookie: gb_refresh_token
```

**Login** — `POST /api/auth` with `action: "login"`:
```json
{ "action": "login", "email": "john@x.com", "password": "pass123" }
// Response: { "accessToken": "...", "user": {...}, "expiresIn": 900 }
```

### 5.2 Jobs Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/jobs` | No | List all jobs (sorted by postedAt desc, limit 100) | **Read** |
| `POST` | `/api/jobs` | Bearer (client only) | Create a new job | **Create** |
| `GET` | `/api/jobs/[id]` | No | Get single job by ID | **Read** |
| `PATCH` | `/api/jobs/[id]` | Bearer (freelancer only) | Accept job at final price | **Update** |

**Accept Job** — `PATCH /api/jobs/[id]`:
- Updates job status → `accepted`
- Creates bid record (type=accept)
- Creates escrow transaction (10% platform fee)

### 5.3 Bids Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/bids?jobId=xxx` | No | List bids (optional jobId filter) | **Read** |
| `POST` | `/api/bids` | Bearer (freelancer only) | Place counter-bid | **Create** |

### 5.4 Payments Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/payments` | No | Get Razorpay config (public key, currency, mock flag) | **Read** |
| `POST` | `/api/payments` | Bearer | Create Razorpay order (real or mock) | **Create** |
| `PATCH` | `/api/payments` | Bearer | Verify payment signature + save transaction | **Create** |

### 5.5 Transactions Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/transactions` | Bearer | List user's transactions (admin sees all) | **Read** |
| `PATCH` | `/api/transactions` | Bearer | Release escrow (`action=release`, client/admin) or raise dispute (`action=dispute`) | **Update/Create** |

### 5.6 Chat Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/chat/rooms` | Bearer | List user's chat rooms | **Read** |
| `POST` | `/api/chat/rooms` | Bearer | Create room (deduplicates by jobId + participants) | **Create** |
| `GET` | `/api/chat/messages?roomId=xxx` | Bearer | Get messages for a room (participant check) | **Read** |
| `POST` | `/api/chat/messages` | Bearer | Send message to room | **Create** |

### 5.7 Notifications Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/notifications` | Bearer | List user's notifications (admin sees all) | **Read** |
| `POST` | `/api/notifications` | Bearer | Create notification | **Create** |
| `PATCH` | `/api/notifications` | Bearer | Mark single read (`notificationId`) or all read (`markAll: true`) | **Update** |

### 5.8 Disputes Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/disputes` | Bearer | List disputes (admin=all, user=own) | **Read** |
| `PATCH` | `/api/disputes` | Bearer (admin only) | Resolve dispute (set status + resolution) | **Update** |

### 5.9 User Routes

| Method | Route | Auth | Description | CRUD |
|--------|-------|------|-------------|------|
| `GET` | `/api/user` | Bearer | Get authenticated user profile | **Read** |
| `PATCH` | `/api/user` | Bearer | Update own profile (fullName, bio, skills, etc.) | **Update** |
| `GET` | `/api/users?role=xxx` | Bearer | List users (admin sees all fields) | **Read** |

### 5.10 Seed Route

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/seed` | No | Clears ALL collections and populates with test data (9 users, 10 jobs, 10 bids, etc.) + creates indexes |

---

## 6. Frontend Pages & Components

### 6.1 Web App Pages (Next.js App Router)

| Route | File | Auth Required | Description |
|-------|------|---------------|-------------|
| `/` | `page.tsx` | No | Landing page — hero + feature showcase |
| `/login` | `login/page.tsx` | No | Login/Register form + Google OAuth button |
| `/feed` | `feed/page.tsx` | No | Browse all open jobs with live pricing |
| `/jobs/[id]` | `jobs/[id]/page.tsx` | No | Job detail — view bids, place bids, price decay |
| `/post-job` | `post-job/page.tsx` | Yes (client) | Create new job with form validation |
| `/my-jobs` | `my-jobs/page.tsx` | Yes | Track posted/accepted jobs |
| `/inbox` | `inbox/page.tsx` | Yes | Chat rooms & real-time messaging |
| `/payments` | `payments/page.tsx` | Yes | Razorpay-powered escrow & payment flows |
| `/earnings` | `earnings/page.tsx` | Yes | Freelancer earnings dashboard |
| `/notifications` | `notifications/page.tsx` | Yes | Notification center (read/unread) |
| `/profile` | `profile/page.tsx` | Yes | User profile & settings |
| `/admin` | `admin/page.tsx` | Yes (admin) | Admin dashboard & dispute queue |

### 6.2 Web UI Components

| Component | File | Description |
|-----------|------|-------------|
| `Navbar` | `navbar.tsx` | Top navigation bar with auth state |
| `ConditionalNavbar` | `conditional-navbar.tsx` | Shows navbar based on route |
| `JobCard` | `job-card.tsx` | Job listing card with live price, skills, deadline |
| **UI Kit (Radix)** | `ui/*.tsx` | Avatar, Badge, Button, Card, Dialog, DropdownMenu, Input, Label, Popover, Progress, ScrollArea, Select, Separator, Sheet, Skeleton, Sonner (toasts), Switch, Table, Tabs, Textarea, Tooltip |

### 6.3 Client-Side State Management

The web app uses a **React Context store** (`web/src/lib/store.tsx`) that provides:

- **Auth state**: `isLoggedIn`, `accessToken`, `expiresAt`, auto-refresh timer
- **Data fetching**: `fetchJobs()`, `fetchBids()`, `fetchTransactions()`, `fetchNotifications()`, etc.
- **Actions**: `login()`, `register()`, `logout()`, `acceptJob()`, `counterBid()`, `postJob()`, `releaseEscrow()`, `raiseDispute()`, `sendMessage()`, `updateProfile()`, `seedDatabase()`
- **Token management**: Automatic silent refresh 2 minutes before expiry, localStorage persistence, HttpOnly cookie rotation

---

## 7. Mobile App (React Native / Expo)

### 7.1 Architecture

- **Framework**: Expo SDK 54 + React Native 0.81.5
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **State**: React Context (`src/context/AppContext.tsx`)
- **API Client**: Custom fetch wrapper (`src/services/apiClient.ts`) → connects to backend microservices

### 7.2 Screens

| Screen | File | Description |
|--------|------|-------------|
| `OnboardingScreen` | `screens/OnboardingScreen.tsx` | App intro / walkthrough |
| `AuthScreen` | `screens/AuthScreen.tsx` | Login/Register |
| `ClientSetupScreen` | `screens/ClientSetupScreen.tsx` | Client onboarding |
| `FreelancerSetupScreen` | `screens/FreelancerSetupScreen.tsx` | Freelancer profile setup |
| `FeedScreen` | `screens/FeedScreen.tsx` | Job feed with live prices |
| `JobDetailScreen` | `screens/JobDetailScreen.tsx` | Job detail + bid actions |
| `PostJobScreen` | `screens/PostJobScreen.tsx` | Create new job |
| `MyJobsScreen` | `screens/MyJobsScreen.tsx` | User's jobs |
| `MyBidsScreen` | `screens/MyBidsScreen.tsx` | User's bids |
| `InboxScreen` | `screens/InboxScreen.tsx` | Chat room list |
| `ChatRoomScreen` | `screens/ChatRoomScreen.tsx` | Chat room messages |
| `PaymentsScreen` | `screens/PaymentsScreen.tsx` | Payment history |
| `EarningsScreen` | `screens/EarningsScreen.tsx` | Earnings dashboard |
| `NotificationsScreen` | `screens/NotificationsScreen.tsx` | Notifications |
| `ProfileScreen` | `screens/ProfileScreen.tsx` | Profile management |
| `WorkspaceScreen` | `screens/WorkspaceScreen.tsx` | Active workspace |
| `DisputesScreen` | `screens/DisputesScreen.tsx` | Dispute management |
| `AdminDashboardScreen` | `screens/AdminDashboardScreen.tsx` | Admin panel |

### 7.3 Reusable Components

| Component | Description |
|-----------|-------------|
| `AnimatedPrice` | Animated price display with decay |
| `Button` | Themed button with variants |
| `EmptyState` | Empty state placeholder |
| `ErrorBoundary` | Error boundary wrapper |
| `GeekScoreBadge` | Freelancer reputation badge |
| `GradientCard` | Card with gradient background |
| `JobCard` | Job listing card |
| `PriceBar` | Visual price indicator |
| `SectionHeader` | Section title component |
| `SkillChip` | Skill tag chip |
| `StatusBadge` | Job/escrow status indicator |

### 7.4 Mobile API Client (`src/services/geekbidApi.ts`)

The mobile app normalizes snake_case (backend) → camelCase (frontend):

```typescript
geekbidApi.getJobs()                    // GET /v1/jobs
geekbidApi.getJobById(id)               // GET /v1/jobs/:id
geekbidApi.postJob(input)               // POST /v1/jobs
geekbidApi.acceptJob(jobId)             // POST /v1/bids/accept
geekbidApi.counterBid(jobId, price, msg) // POST /v1/bids/counter
geekbidApi.watchJob(jobId)              // POST /v1/jobs/:id/watch
geekbidApi.unwatchJob(jobId)            // DELETE /v1/jobs/:id/watch
```

---

## 8. Authentication Flow

### 8.1 Token Architecture

| Token | Library | Secret | Expiry | Storage |
|-------|---------|--------|--------|---------|
| **Access Token** (Web) | `jose` HS256 | `NEXTAUTH_SECRET` | 15 min | localStorage + `Authorization: Bearer` header |
| **Refresh Token** (Web) | `jose` HS256 | `NEXTAUTH_SECRET` + "-refresh" | 7 days | HttpOnly cookie (`gb_refresh_token`) + MongoDB |
| **Access Token** (Backend) | `jsonwebtoken` | `JWT_SECRET` | 15 min | Client memory + `Authorization: Bearer` header |
| **Refresh Token** (Backend) | `jsonwebtoken` | `JWT_SECRET` + "-refresh" | 7 days | MongoDB `refresh_tokens` collection |

### 8.2 JWT Payload

```json
{ "userId": "...", "role": "client|freelancer|admin", "email": "...", "type": "access|refresh" }
```

### 8.3 Registration Flow

```
Client → POST /api/auth { action: "register", ... }
  → Validate email, name, password (min 6 chars), role
  → Check email uniqueness
  → Hash password (bcrypt, 12 rounds)
  → Insert user document
  → Create access + refresh token pair
  → Store refresh token in MongoDB (upsert by userId)
  → Return access token in body + set refresh cookie
```

### 8.4 Login Flow

```
Client → POST /api/auth { action: "login", email, password }
  → Find user by email
  → Compare password with bcrypt
  → Create token pair
  → Store refresh token
  → Return access token + set refresh cookie
```

### 8.5 Token Refresh Flow (Rotation)

```
Client → POST /api/auth/refresh (with HttpOnly cookie)
  → Extract refresh token from cookie
  → Verify JWT signature
  → Validate against stored token in MongoDB
  → If stored token doesn't match → REVOKE ALL tokens (theft detection)
  → Verify user still exists
  → Issue new access + refresh token pair
  → Update stored token in MongoDB (rotation)
  → Return new access token + set new refresh cookie
```

### 8.6 Google OAuth Flow

```
1. Client → GET /api/auth/google?role=freelancer
2. Redirect → Google consent screen
3. Google → GET /api/auth/google/callback?code=xxx&state=freelancer
4. Server exchanges code for Google tokens
5. Server fetches Google profile (email, name, picture)
6. Server creates/finds user (links googleId if existing email)
7. Server issues JWT token pair
8. Redirect → /login?google_token=xxx&google_user=xxx&expires_in=900
9. Client-side store picks up tokens from URL params
```

### 8.7 Silent Refresh (Client-Side)

The web store schedules automatic refresh **2 minutes before expiry**:
- Timer runs in `useEffect` on mount
- On token expiry: calls `POST /api/auth/refresh`
- On success: updates localStorage + schedules next refresh
- On failure: clears auth state → redirects to login

---

## 9. Real-Time Features

### 9.1 Price Decay (Bidding Service)

Every **15 seconds**, the bidding service broadcasts `price_update` events via Socket.IO:

```javascript
// Server (bidding-service, port 3004)
setInterval(async () => {
  const openJobs = await db.collection('jobs').find({ status: 'open' }).toArray();
  openJobs.forEach(job => {
    const currentPrice = max(startingPrice - decayRate × elapsedHours, minimumPrice);
    io.emit('price_update', { job_id, current_price });
  });
}, 15000);
```

### 9.2 Chat (Chat Service)

```javascript
// Server (chat-service, port 3007)
io.on('connection', socket => {
  socket.on('join_room', roomId => socket.join(roomId));
});
// On new message POST: io.to(roomId).emit('chat_message', message);
```

### 9.3 Job Acceptance

When a freelancer accepts a job, the bidding service emits:
```javascript
io.emit('job_accepted', { job_id, freelancer_id, final_price });
```

---

## 10. Security

### 10.1 Backend Security Middleware Stack

| Layer | Implementation | Purpose |
|-------|---------------|---------|
| **Helmet** | `app.use(helmet())` | Security headers (CSP, HSTS, etc.) |
| **CORS** | `app.use(cors())` | Cross-origin request protection |
| **Rate Limiting** | `express-rate-limit` | 100 req/15min (API), 10 req/15min (auth) |
| **Body Limit** | `express.json({ limit: '1mb' })` | Prevent large payload attacks |
| **NoSQL Injection** | `sanitizeMiddleware` | Strips `$` operator keys from body/query/params |
| **XSS Prevention** | `stripHtml()` | Strips HTML tags from all string inputs |
| **Input Validation** | `validateEmail()`, `validateString()`, `validatePositiveNumber()` | Type + length checks |

### 10.2 Auth Security

- **Password hashing**: bcrypt with 12 salt rounds
- **Token rotation**: Each refresh invalidates the previous token
- **Theft detection**: If a revoked refresh token is reused, ALL tokens for that user are revoked
- **HttpOnly cookies**: Refresh tokens are never accessible to JavaScript
- **Secure flag**: Cookies use `secure: true` in production
- **SameSite**: `lax` policy on refresh cookies
- **Password projection**: Password fields are never returned in API responses

### 10.3 Authorization Rules

| Resource | Rule |
|----------|------|
| Post jobs | Clients only |
| Accept jobs / place bids | Freelancers only |
| Release escrow | Client or Admin |
| Resolve disputes | Admin only |
| Update profile | Self or Admin |
| Delete user | Self or Admin |
| Edit/delete jobs | Only if status = "open" |
| Delete bids | Only counter bids (not accepted) |

---

## 11. Environment Variables

### 11.1 Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | — | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | `geekbid-dev-secret-change-in-production` | JWT signing secret |
| `RAZORPAY_KEY_ID` | ✅ | `rzp_test_placeholder` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | ✅ | `secret_placeholder` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | ❌ | — | Webhook signature verification |
| `GATEWAY_PORT` | ❌ | `3000` | Gateway port |
| `AUTH_PORT` | ❌ | `3001` | Auth service port |
| `JOB_PORT` | ❌ | `3003` | Job service port |
| `BIDDING_PORT` | ❌ | `3004` | Bidding service port |
| `PAYMENT_PORT` | ❌ | `3005` | Payment service port |
| `NOTIFICATION_PORT` | ❌ | `3006` | Notification service port |
| `CHAT_PORT` | ❌ | `3007` | Chat service port |

### 11.2 Web App (`web/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | — | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | ✅ | `fallback-secret-not-for-production` | JWT signing secret |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | App base URL |
| `GOOGLE_CLIENT_ID` | ❌ | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | — | Google OAuth client secret |
| `RAZORPAY_KEY_ID` | ❌ | `rzp_test_placeholder` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | ❌ | `secret_placeholder` | Razorpay secret |

---

## 12. Seed Data

`POST /api/seed` populates the database with test data:

### Users (9 total)

| Name | Email | Password | Role |
|------|-------|----------|------|
| Maya Sharma | `maya@startup.io` | `password123` | client |
| Derek Olsen | `derek@fintech.co` | `password123` | client |
| Sarah Kim | `sarah@edtech.dev` | `password123` | client |
| Arjun Dev | `arjun@devmail.io` | `password123` | freelancer |
| Priya Nair | `priya@secmail.io` | `password123` | freelancer |
| Leo Chen | `leo@web3mail.io` | `password123` | freelancer |
| Mira Patel | `mira@dataeng.io` | `password123` | freelancer |
| Jake Wilson | `jake@mobiledev.co` | `password123` | freelancer |
| Admin | `admin@geekbid.io` | `admin123` | admin |

### Jobs (10 total)

Open jobs ranging from $650–$3000 starting price across AI, Security, DeFi, Mobile, Data, and Infrastructure domains. One job pre-seeded as "accepted".

### Additional Seed Data

- **10 bids** (mix of counter and accept types)
- **1 transaction** (released escrow for the accepted job)
- **10 notifications** (price drops, counter-bids, job matches, payments)
- **1 chat room** with **5 messages**

---

## 13. CRUD Operations Summary

### Complete CRUD Matrix

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| **Users** | Register (POST /auth/register) | Get by ID, List, Get me | PATCH profile | DELETE account |
| **Jobs** | POST /jobs | List (filtered/sorted), Get by ID | PATCH (edit fields, accept) | DELETE (open only, cascades bids) |
| **Bids** | POST accept, POST counter | List (by job/freelancer), Get by ID | PATCH (counter bids only) | DELETE (not accepted bids) |
| **Transactions** | Auto-created on job accept | List, Get by ID | Release escrow, Dispute | — |
| **Disputes** | Auto-created on dispute action | List (filtered by status) | Resolve (admin) | — |
| **Notifications** | POST /notifications | List (filtered), Get by ID | Mark read (single/all) | DELETE (single/all) |
| **Chat Rooms** | POST /chat/rooms | List (by user) | — | DELETE (cascades messages) |
| **Chat Messages** | POST /chat/:roomId/messages | List (by room, paginated) | PATCH (edit text) | DELETE |
| **Refresh Tokens** | Auto on login/register | Internal validation | Rotation on refresh | Revoke on logout/theft |

---

*End of Technical Documentation*
