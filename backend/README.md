# GeekBid Backend — Microservices

Express.js microservice scaffold for GeekBid. Each service runs independently and is orchestrated via `docker-compose.yml` in the repo root.

> **Note:** The primary production API is the Next.js App Router (`web/src/app/api/`). These microservices handle real-time features (Socket.IO bid decay, chat) and serve as the scaling layer.

## Services

| Service | Port | Responsibility |
|---------|------|----------------|
| `gateway` | 3000 | API gateway — routes to downstream services, rate limiting |
| `auth-service` | 3001 | JWT issue/verify, Google OAuth, bcrypt password hashing |
| `job-service` | 3003 | Job CRUD, search, decay price computation |
| `bidding-service` | 3004 | Counter-bids, Socket.IO real-time price broadcast |
| `payment-service` | 3005 | Razorpay escrow orders, verification, webhook |
| `notification-service` | 3006 | Push notifications, email triggers |
| `chat-service` | 3007 | Chat rooms, messages, Socket.IO delivery |

## Run (all services)

```bash
cd backend
npm install
npm start
```

## Run via Docker (recommended)

```bash
# From repo root
docker-compose up
```

Services will be available at their respective ports. Web app proxies through the gateway.

## Environment Variables (`backend/.env`)

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/geekbid
JWT_SECRET=same-secret-as-web-NEXTAUTH_SECRET
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Port overrides (optional — defaults shown)
GATEWAY_PORT=3000
AUTH_PORT=3001
JOB_PORT=3003
BIDDING_PORT=3004
PAYMENT_PORT=3005
NOTIFICATION_PORT=3006
CHAT_PORT=3007
```

> `JWT_SECRET` must match `NEXTAUTH_SECRET` in `web/.env.local` if you want tokens issued by one layer to be verified by the other.

## Socket.IO Events

### Bidding Service (port 3004)

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_job` | Client → Server | `{ jobId }` |
| `price_update` | Server → Client | `{ jobId, currentPrice, bidCount }` |
| `new_bid` | Server → Client | `{ jobId, bidPrice, freelancerId }` |

### Chat Service (port 3007)

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_room` | Client → Server | `{ roomId }` |
| `send_message` | Client → Server | `{ roomId, text }` |
| `new_message` | Server → Client | `{ roomId, senderId, text, createdAt }` |

## Shared Middleware (`common/`)

- **JWT auth middleware** — verifies Bearer token on protected routes
- **Rate limiter** — 100 req/15min general, 10 req/15min auth endpoints
- **NoSQL injection guard** — strips `$` operator keys from request bodies
- **XSS guard** — strips HTML tags from string fields
- **CORS** — configured per `NODE_ENV`
- **Helmet** — security headers on all services
