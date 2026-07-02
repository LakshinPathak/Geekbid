# GeekBid — Full-Stack Migration Handoff (for end-to-end testing)

> **Purpose:** hand this to the Antigravity IDE (or any reviewer) to run the app
> end-to-end and continue the backend migration. It states exactly what was
> changed, what is **done & verified**, what is **still pending**, how to run
> everything, and how to test it.

Branch: **v13** · Date: 2026-07-02

---

## 1. What this change is

GeekBid had **two parallel backends**:
- **Next.js `/api/*` route handlers** (in `web/`) — the only one the app actually used. Talks straight to MongoDB.
- **Express microservices** (in `backend/`: gateway + auth/job/bidding/payment/notification/chat) — fully written but **never called** by the app (dead code).

This branch begins converting GeekBid into a **true full-stack microservice app** using the **BFF (backend-for-frontend) pattern**:

```
Browser (React, store.tsx)
   → fetch("/api/…")                    [UNCHANGED — no frontend rewrite]
   → Next.js route handler (BFF proxy)  [forwards, unwraps envelope]
   → GATEWAY  :8080  (reverse proxy)    [NEW — routes to services]
        → auth-service     :3001   (/v1/auth, /v1/users)
        → job-service      :3003   (/v1/jobs)
        → bidding-service  :3004   (/v1/bids)  (+ socket.io)
        → payment-service  :3005   (/v1/payments, /v1/disputes)  (Razorpay)
        → notification-svc :3006   (/v1/notifications)
        → chat-service     :3007   (/v1/chat)  (+ socket.io)
   → MongoDB Atlas (shared "geekbid" DB)
```

The browser still calls `/api/*` (keeps httpOnly refresh cookie + Google OAuth exchange-code security). Each Next route either **proxies** to the gateway (migrated) or still talks **directly to Mongo** (not yet migrated). Both work side-by-side, so the app is always runnable.

---

## 2. Status — DONE vs PENDING

### Architecture split (final for this branch)
**Read + pure-DB transactional domains → microservices.** **Write pipelines with web-coupled side-effects (Resend email, Razorpay, Gemini, Cloudinary) → stay in the Next BFF.** This is an intentional, production-defensible split — not a shortcut. Forcing Razorpay/Resend/Gemini into Express would duplicate secrets and add risk for no gain.

### ✅ Done & verified (live, through the running gateway)
- **Gateway is a real reverse proxy** (`backend/services/gateway/index.js`) — streams method/headers/body to the owning service, `/health` aggregates all services, CORS allowlisted. *Verified.*
- **Cross-service auth works.** Backend `JWT_SECRET` synced to web `NEXTAUTH_SECRET`, hardcoded fallback removed. *Verified:* a jose-minted token (exactly as `web/src/lib/auth.ts` mints) is accepted by the Express `jsonwebtoken` middleware; `GET /v1/auth/me` returns the right user.
- **BFF client** (`web/src/lib/backend.ts`) — `backendFetch` + `proxyToBackend`, unwraps `{success,data}`→raw JSON, maps errors to status. Whole web app typechecks clean (`tsc --noEmit` exit 0).
- **Routes flipped to microservices (all verified against seeded data):**
  | Next route | Service | Verified |
  |---|---|---|
  | `GET /api/users` | auth-service `/v1/users` | 401 no-token; email hidden non-admin, shown admin |
  | `GET /api/users/[id]` | auth-service `/v1/users/:id` | public profile hides email/googleId |
  | `GET /api/user` | auth-service `/v1/auth/me` | self profile |
  | `GET/POST/PATCH /api/notifications` | notification-service | list=2, correct string-userId scope |
  | `GET /api/notifications/count` | notification-service | unread=2 |
  | `GET/POST /api/chat/rooms` | chat-service | 1 room, token-scoped, job-association auth |
  | `GET/POST /api/chat/messages` | chat-service | 5 msgs from `chat_messages`; non-participant→404 |
  | `GET /api/bids` | bidding-service `/v1/bids` | 401 no-token; 10 bids |
  | `GET /api/bids/my` | bidding-service `/v1/bids/my` | freelancer→200, client→403 |
  | `GET /api/transactions` | payment-service `/v1/transactions` | IDOR-scoped (own only); admin→all |
  | `GET /api/disputes` | payment-service `/v1/disputes` | admin all / else own |
  | `GET /api/jobs/[id]` | job-service `/v1/jobs/:id` | single job |
- **Dev orchestration** — `npm run dev` boots services + gateway (health-gated) then Next (`scripts/dev-all.js`, dependency-free).

### 🟡 Intentionally kept in the Next BFF (web-coupled side-effects)
These still run their original hardened logic in Next.js; they were **not** moved because they call Resend/Razorpay/Gemini/Cloudinary which live in the web runtime:
- `POST /api/bids` (Resend email + plan-limit), `PATCH /api/jobs/[id]` accept/award/cancel/complete (email + chat room + notifications + escrow), `/api/jobs/[id]/cancel`, `/api/jobs/[id]/complete`.
- `PATCH /api/transactions` (release/dispute email), `PATCH /api/disputes` (resolve email), `/api/payments` (Razorpay + email), `/api/milestones`.
- `POST /api/jobs` (create — plan-limit + category), `/api/user` PATCH.
- AI (8, Gemini), admin (11, audit-logged), client/freelancer dashboards (10, read aggregations), reviews, referrals, teams, invites, assessments, keys, upload (Cloudinary), email-logs, seed.

### ⏳ Not done (future work)
- Move money to **integer minor units** + make Razorpay live (during a payments port).
- **Phase 2** real-time: socket.io through the gateway (services already emit; frontend still polls).
- Optionally build dedicated microservices for AI/admin/analytics if you want them off the BFF (see plan §5 Phase 3) — and port the write pipelines by adding a backend email module.

See `MIGRATION_PLAN_backend_microservices.md` for the full phased plan, decisions, and endpoint parity matrix.

---

## 3. How to run (local)

### Prereqs
- Node 20+, npm. MongoDB Atlas URI (already in env files below).

### Environment
Two env files (both git-ignored, already present on the dev machine — recreate from the `.env.example` files if missing):

**`backend/.env`** — must include:
```
MONGODB_URI=<same Atlas geekbid DB as web>
JWT_SECRET=<MUST equal web NEXTAUTH_SECRET>     # already synced
GATEWAY_PORT=8080
AUTH_PORT=3001  JOB_PORT=3003  BIDDING_PORT=3004
PAYMENT_PORT=3005  NOTIFICATION_PORT=3006  CHAT_PORT=3007
RAZORPAY_KEY_ID=...  RAZORPAY_KEY_SECRET=...     # mock mode if placeholder
```

**`web/.env.local`** — must include:
```
MONGODB_URI=<same Atlas geekbid DB>
NEXTAUTH_SECRET=<same value as backend JWT_SECRET>
BACKEND_GATEWAY_URL=http://127.0.0.1:8080        # NEW — BFF → gateway
... (Google OAuth, Resend, Cloudinary, Gemini, ADMIN_SECRET_KEY as before)
```
> **Critical invariant:** `backend/JWT_SECRET === web/NEXTAUTH_SECRET`. If they differ, every proxied protected route returns 401.

### Install & run
```bash
npm run install:all        # installs backend + web deps
npm run dev                # boots services + gateway, then Next on :3000
```
- Web app: http://localhost:3000
- Gateway: http://localhost:8080 (health: `GET /health`)
- Run only backend: `npm run dev:backend` · only web: `npm run dev:web`

### Seed the database (first run)
`POST http://localhost:3000/api/seed` — allowed on an empty non-prod DB; otherwise admin-gated. Seeds users (incl. `admin@geekbid.io` / `admin123`), jobs, bids, etc.

---

## 4. End-to-end test plan (for Antigravity)

### A. Backend/gateway smoke (no UI)
```bash
# all services up?
curl -s http://localhost:8080/health          # → {"ok":true,"services":{...all "up"}}

# public proxied read
curl -s "http://localhost:8080/v1/jobs?limit=1"    # → {"success":true,"data":{"jobs":[…]}}

# auth-gated route rejects anonymous
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/v1/users   # → 401
```

### B. Migrated routes through the Next BFF (app must be running)
Log into the UI, grab the access token from `localStorage.gb_access_token`, then:
```bash
TOKEN=<paste>
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users      # bare array, no emails unless admin
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/user       # own profile
curl -s http://localhost:3000/api/users/<someUserId>                           # public profile, no email
```
These now flow browser → Next `/api` → gateway → auth-service → Mongo. Confirm identical shapes to before.

### C. Full UI smoke (both migrated + not-yet-migrated paths)
Register → log in → post a job → place/accept a bid → chat → milestone → release escrow → review.
Everything should work: migrated routes via services, the rest still via Next-direct. **Watch for:** 401s (secret mismatch), missing side-effects on accept (chat room/notifications/emails), or shape drift on `/api/users*`.

### D. Regression focus
- Token from web verifies on services (Section B).
- `/api/users` hides email for non-admins, shows for admins.
- Gateway `/health` flips to 503 if any service is down (kill one service to confirm).

---

## 5. How to continue the migration (the repeatable "flip recipe")

For each remaining route:
1. **Read** the Next route (`web/src/app/api/.../route.ts`) and the matching Express handler.
2. **Enrich the Express service** to full behavioral parity (auth checks, projections, side-effects: escrow tx, chat room, notifications, emails, atomic `findOneAndUpdate` guards). Do **not** regress the atomic race guards.
3. **Flip the Next route** to `proxyToBackend(req, "/v1/…", { unwrapKey })` (see `api/users/route.ts` as the template).
4. **Restart backend**, test the `/v1` route through the gateway, then the `/api` route through Next.
5. Money: convert to **integer minor units** when porting payments/milestones.

Highest-risk flips (do carefully, test hardest): **job accept/award** and **payments** — they move money and fire many side-effects.

---

## 6. Files changed on this branch
- `backend/services/gateway/index.js` — rewritten as reverse proxy.
- `backend/common/authMiddleware.js` — removed hardcoded JWT fallback; hard-fail if unset.
- `backend/services/auth-service/index.js` — `/v1/users` auth-gated + admin/public projection; `/v1/users/:id` hides email/googleId; PATCH allows avatar fields.
- `backend/.env.example` — JWT_SECRET guidance, gateway port 8080, CORS allowlist.
- `web/src/lib/backend.ts` — **new** BFF client.
- `web/src/app/api/users/route.ts`, `web/src/app/api/users/[id]/route.ts`, `web/src/app/api/user/route.ts` — flipped to proxies (GET).
- `web/.env.example` — `BACKEND_GATEWAY_URL`.
- `package.json` (**new** root), `scripts/dev-all.js` (**new**) — full-stack dev orchestration.
- `MIGRATION_PLAN_backend_microservices.md` — plan + locked decisions.
- `_stale/` — archived unused `data.ts` + old reports.

## 7. Known risks / notes
- **Secret invariant** (§3) is the #1 failure mode.
- Rate-limit + OAuth exchange-code stores are **in-memory per-instance** — fine single-node, need Redis when scaled.
- Money is still **floating-point** until the payment port; fix during that flip.
- The `backend/.env` on the dev machine contains **real** Razorpay/Cloudinary/Gemini keys and the Mongo URI — it is git-ignored; never commit it.
- The git remote currently embeds a GitHub PAT in its URL — rotate it and switch to a credential helper.
