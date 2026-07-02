# Plan: Make GeekBid a true full-stack app on the Express microservices

> Status: **Phase 0 complete + verified. Phase 1 read/transactional domains flipped to microservices + verified. Write pipelines with web-coupled side-effects (Resend/Razorpay/Gemini/Cloudinary) intentionally remain in the Next BFF. See `HANDOFF_ANTIGRAVITY.md` §2 for the exact delivered state.**

## 0. Decisions locked (production-grade)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| A | Browser → backend wiring | **BFF proxy** — browser keeps calling `/api/*`; Next.js routes forward to the gateway | Keeps httpOnly refresh cookie + OAuth exchange-code security, no CORS exposure, no public service ports, no frontend rewrite. Industry-standard for Next.js + microservices. |
| B | Scope / sequencing | **Hybrid → full, incremental, test-gated** | Production-grade ≠ big-bang. Ship the 7 existing domains through services first, expand to the rest in phases. Each route flip is proven invisible to the UI before moving on. |
| 3 | Razorpay live vs mock | **Keep the auto-detecting code path** — real HMAC signature verification runs when real keys are present; falls back to mock only when placeholder keys are detected (`IS_MOCK`). Money moves to **integer minor units** during the payment port. | No real keys today, but the code is production-ready and flips to live purely via env. Never hardcode keys. |
| 4 | Real-time transport | **socket.io proxied through the gateway (single origin)**, implemented in **Phase 2** — not blocking core migration. Polling stays working until then. | Single public origin, no direct service-port exposure, consistent with the BFF decision. |
| 5 | Missing domains: many tiny services vs folded | **A small, logical set of services**, not 40 micro-endpoints: `admin-service`, `ai-service`, `analytics-service` (client+freelancer dashboards), `social-service` (reviews/referrals/teams/invites), `assessment-service`; **milestones** folded into payment-service; **infra-bound utilities** (Cloudinary sign/delete, seed, email-logs) **stay in the Next.js BFF** (tightly coupled to Next server env). | Avoids over-fragmentation; keeps secrets (Gemini) server-side in their owning service; keeps Next-specific infra where it belongs. |

---

> Original proposal below (unchanged).

## 1. Goal

Put the `backend/` Express microservices into the actual request path so they serve the app's data, instead of the Next.js `/api/*` handlers doing all the work directly against MongoDB. Keep everything (don't delete), and route real traffic through the gateway → services.

## 2. The core reality this plan has to deal with

From reading every route on both sides:

**Express services today cover ~7 domains** (auth, users, jobs, bids, payments/transactions/disputes, notifications, chat) — and even those are *thinner* than the Next.js versions.

**The Next.js app uses ~72 routes.** These have **no microservice equivalent at all**:
- **admin** (11 routes), **AI** (8 routes), **client dashboards** (5), **freelancer dashboards** (5)
- reviews, referrals, teams, invites, assessments, keys, milestones, upload (sign/delete), email-logs, seed
- job sub-flows: direct-offer, feature, offer-response, pricing-hint, recommended; bids/my

**Two structural mismatches** that must be normalized wherever we route through Express:
- **Response envelope:** Express returns `{ success, data }` / `{ success, error }`; the frontend expects **raw JSON** (arrays/objects).
- **Auth/token model:** Next.js uses an **httpOnly refresh cookie + one-time exchange codes**; Express auth-service returns `refreshToken` in the JSON body and has no Google OAuth, no exchange-code handoff.

**The gateway is not a gateway.** `backend/services/gateway/index.js` only serves static `/v1/info`. It has **zero proxy logic** — so there is currently no single door to the services.

**Behavioral gaps** where a service "exists" but does less than the live route — e.g. Next.js job-accept also creates the escrow transaction, chat room, both in-app notifications, losing-bidder notifications, and emails, using adaptive server-side pricing. The Express bidding accept only makes a transaction + a socket emit. Routing accept to Express as-is would silently drop chat/notifications/emails.

**Conclusion:** this is a build, not a config flip. The plan is phased so the microservices genuinely handle traffic early, then expand to full coverage.

## 3. Two architectural decisions (recommendation baked in)

**Decision A — How the browser reaches the backend:**
- **Recommended: BFF proxy.** Browser keeps calling `/api/*`; each Next.js route becomes a thin forwarder to the gateway. Keeps httpOnly cookies, no CORS exposure, no frontend rewrite, lets us migrate route-by-route invisibly.
- Alternative: browser calls the gateway directly (change `apiRequest` base URL). "Purer" microservices, but forces CORS, public service ports, and moving the whole cookie/OAuth/exchange-code security model into Express. More work, more risk.

**Decision B — Scope/sequencing:**
- **Recommended: Hybrid → full.** Phase 1 routes the 7 domains that already have services through the gateway (bringing them to behavioral parity first). Later phases build the missing ~40 endpoints as new services. The app is a real microservice consumer after Phase 1; full coverage is incremental.
- Alternative: big-bang full parity before switching anything — much longer before anything works, higher risk.

*The rest of the plan assumes BFF-proxy + hybrid-to-full. Rework if going direct-gateway or big-bang.*

## 4. Target architecture

```
Browser (React, store.tsx)
   -> fetch("/api/...")                     [unchanged]
   -> Next.js route handler (thin proxy)    [rewritten to forward]
   -> GATEWAY :3000  (real reverse proxy)   [new: http-proxy-middleware]
        -> auth-service     :3001
        -> job-service      :3003
        -> bidding-service  :3004  (+ socket.io)
        -> payment-service  :3005
        -> notification-svc :3006
        -> chat-service     :3007  (+ socket.io)
   -> MongoDB Atlas (single shared connection string)
```

For domains with no service yet, the Next.js route keeps its current direct-to-Mongo logic until its service is built (Phase 3+).

## 5. Phased execution

### Phase 0 — Foundations (no behavior change)
1. **Turn the gateway into a real proxy.** Add `http-proxy-middleware` routing: `/v1/auth/*`->3001, `/v1/users*`->3001, `/v1/jobs*`->3003, `/v1/bids*`->3004, `/v1/payments*`+`/v1/disputes*`->3005, `/v1/notifications*`->3006, `/v1/chat*`->3007. Forward `Authorization` header + body; keep helmet, drop the wildcard CORS to an allowlist.
2. **Unify secrets.** Make Express `JWT_SECRET` derive from the same value as Next's `NEXTAUTH_SECRET` (so a token minted by one verifies on the other) and **remove the hardcoded fallback**. Point Express `MONGODB_URI` at the same Atlas DB.
3. **Add a server-side API client in Next.js** (`web/src/lib/backend.ts`): `backendFetch(path, req)` that calls `GATEWAY_URL`, forwards the caller's `Authorization`, and **unwraps `{success,data}` -> raw JSON / re-throws `{success:false,error}` as the right status**. This is the single seam that fixes the envelope mismatch.
4. **Dev runtime:** a `concurrently` script (or compose) that boots all 7 services + Next together, plus health-check gating so the proxy doesn't fire before services are up. (There's already `backend/scripts/dev.js` to extend.)

### Phase 1 — Route the 7 existing domains through the services (BFF proxies)
For each, first **bring the Express service to behavioral parity** with the current Next route, then replace the Next route body with a `backendFetch` proxy. Order chosen by risk:

1. **users / profile** (lowest risk): `/api/users`, `/api/users/[id]`, `/api/user` -> auth-service `/v1/users*`. Add the sensitive-field stripping the Next version does.
2. **jobs read + CRUD:** `/api/jobs` (GET/POST), `/api/jobs/[id]` (GET) -> job-service. Port invite-visibility filtering and category validation into job-service.
3. **notifications:** `/api/notifications*`, `/api/notifications/count` -> notification-service.
4. **chat:** `/api/chat/rooms`, `/api/chat/messages` -> chat-service (participant checks already present there).
5. **bids + job accept/award (highest risk — money + side effects):** port into bidding/job service the full accept pipeline (adaptive pricing, escrow tx, chat-room creation, in-app notifications, losing-bidder notifications, emails, atomic `findOneAndUpdate` 409 guard). Only then proxy `/api/bids` and `/api/jobs/[id]` PATCH.
6. **payments/transactions/disputes:** proxy `/api/transactions`, `/api/payments`, `/api/disputes` -> payment-service (this is also where the *real Razorpay* integration finally becomes live — the one genuine upgrade this migration delivers). Fix the float-money issue here as part of the port.

Each step ends with an end-to-end check before moving on.

### Phase 2 — Real-time
Wire the frontend to the bidding-service and chat-service **socket.io** servers for live price decay and chat (replacing the current polling), or proxy WS through the gateway. Decide: direct WS to service ports vs gateway WS upgrade.

### Phase 3 — Build the missing services (full coverage)
Create new microservices / endpoints for the ~40 uncovered routes, grouped:
- **reviews-service** (reviews), **social-service** (referrals, teams, invites), **assessment-service**, **keys**, **milestones** (into job or payment service).
- **admin-service** (11 routes, role-gated + audit logs).
- **ai-service** (8 Gemini routes + quota) — keep the Gemini key server-side there.
- **analytics-service** (client + freelancer dashboards).
- **media/upload** (Cloudinary sign/delete), **email-logs**, **seed** (admin/bootstrap only).
Each: build service -> parity-test -> flip the Next route to proxy.

### Phase 4 — Cleanup
- Delete now-dead direct-Mongo logic from Next routes (they're all proxies now).
- Consolidate the duplicated `sanitize`/`validate`/auth helpers so there's one source of truth.
- Document the service map + ports + envs in the READMEs.

## 6. Cross-cutting concerns the plan handles explicitly
- **Auth continuity:** shared secret so tokens interoperate; Google OAuth + exchange-code handoff **stays in Next.js** (it's browser/cookie-bound) and just mints a token the services accept — no need to rebuild OAuth in Express.
- **Envelope normalization:** the single `backendFetch` unwrapper (Phase 0.3) — not per-route.
- **Idempotency/races:** preserve the atomic `findOneAndUpdate({status:"open"})` and `escrowStatus:"held"` guards when porting; don't regress to `findOne`+`updateOne`.
- **Money:** switch to integer minor units during the payment port (fixes the float bug at the same time).
- **Rate limiting / OAuth codes:** currently in-memory per-instance — note they need shared storage (Redis) once services scale; out of scope unless requested.

## 7. Verification strategy
- Per route: a before/after contract test (same request -> same JSON shape the frontend consumes) so the proxy is provably invisible to the UI.
- Full smoke flow after each phase: register -> post job -> bid -> accept -> chat -> milestone -> release -> review.
- Explicit checks that the *side effects* survive the port (chat room created, notifications inserted, emails sent).

## 8. Effort / risk snapshot
- **Phase 0–1** (microservices genuinely serving core domains): the meaningful milestone; medium effort, concentrated risk in the bids/payments port.
- **Phase 3** (full parity): the long tail — ~40 endpoints across ~6 new services; large but mechanical and incremental.
- **Biggest risks:** the job-accept side-effect pipeline, money correctness, and auth-token interop. All are sequenced early and gated by tests.

## 9. Open questions to resolve before starting
1. **Decision A** — BFF proxy (recommended) or browser-hits-gateway-directly?
2. **Decision B** — hybrid->full (recommended) or full parity before switching?
3. Should the payment port also **flip mock Razorpay to live** (needs real keys), or stay in mock mode for now?
4. Real-time: **socket.io direct** to service ports, or proxied through the gateway?
5. Do you want the missing domains (admin, AI, dashboards) as **separate new microservices** or folded into a smaller number of services?

---

## Appendix A — Endpoint inventory (source of truth for the parity matrix)

### Express services (exist today)
- **auth-service :3001** — `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`, `GET /v1/users/:id`, `GET /v1/users`, `PATCH /v1/users/:id`, `DELETE /v1/users/:id`
- **job-service :3003** — `GET /v1/jobs`, `GET /v1/jobs/:id`, `POST /v1/jobs`, `PATCH /v1/jobs/:id`, `DELETE /v1/jobs/:id`, `POST/DELETE /v1/jobs/:id/watch`
- **bidding-service :3004** — `GET /v1/bids`, `GET /v1/bids/:id`, `POST /v1/bids/accept`, `POST /v1/bids/counter`, `PATCH /v1/bids/:id`, `DELETE /v1/bids/:id` (+ socket.io price broadcast every 15s)
- **payment-service :3005** — `GET /v1/payments/history`, `GET /v1/payments/transactions/:id`, `GET /v1/disputes`, `PATCH /v1/disputes/:id`, `POST /v1/payments/release/:txId`, `POST /v1/payments/dispute/:txId`, `POST /v1/payments/create-order`, `POST /v1/payments/verify`, `POST /v1/payments/webhook`, `GET /v1/payments/status/:paymentId`, `GET /v1/payments/config` (Razorpay)
- **notification-service :3006** — `GET /v1/notifications`, `GET /v1/notifications/:id`, `POST /v1/notifications`, `PATCH /v1/notifications/:id/read`, `PATCH /v1/notifications/read-all`, `DELETE /v1/notifications/:id`, `DELETE /v1/notifications`
- **chat-service :3007** — `GET /v1/chat/rooms`, `POST /v1/chat/rooms`, `GET /v1/chat/:roomId/messages`, `POST /v1/chat/:roomId/messages`, `PATCH /v1/chat/messages/:messageId`, `DELETE /v1/chat/messages/:messageId`, `DELETE /v1/chat/rooms/:roomId` (+ socket.io)
- **gateway :3000** — `GET /v1`, `GET /v1/info` only (NO proxy logic — must be built)

### Next.js `/api/*` routes the app actually uses (~72)
- **auth:** auth [POST], auth/me [GET], auth/refresh [POST], auth/logout [POST], auth/google, auth/google/callback, auth/google/exchange
- **users:** users [GET], users/[id] [GET], user [GET,PATCH], user/verify-github [POST]
- **jobs:** jobs [GET,POST], jobs/[id] [GET,PATCH], jobs/[id]/cancel [PATCH], jobs/[id]/complete [PATCH], jobs/direct-offer [POST], jobs/feature [PATCH], jobs/offer-response [PATCH], jobs/pricing-hint [GET], jobs/recommended [GET], v1/jobs [GET,POST]
- **bids:** bids [GET,POST], bids/my [GET]
- **milestones:** milestones [GET,POST,PATCH]
- **money:** transactions [GET,PATCH], payments [GET,POST,PATCH], disputes [GET,PATCH]
- **chat:** chat/rooms [GET,POST], chat/messages [GET,POST]
- **notifications:** notifications [GET,POST,PATCH], notifications/count [GET]
- **reviews:** reviews [GET,POST]
- **referrals:** referrals [GET]
- **teams:** teams [GET,POST,PATCH]
- **invites:** invites [GET,POST,PATCH]
- **assessments:** assessments [GET,POST]
- **keys:** keys [GET,POST,DELETE]
- **admin (11):** admin/config [GET,PATCH], admin/config/env-status [GET], admin/disputes [GET,PATCH], admin/jobs [GET], admin/jobs/[id] [PATCH,DELETE], admin/logs [GET], admin/stats [GET], admin/transactions [GET,PATCH], admin/users [GET,POST], admin/users/[id] [GET,PATCH,DELETE], admin/verify-key [POST]
- **ai (8):** ai/bid-strategy, ai/chat-assist, ai/evaluate-bids, ai/generate-description, ai/pricing-advisor, ai/quality-check, ai/smart-search, ai/summarize-reviews [all POST]
- **client dashboards (5):** client/activity-feed, client/dashboard, client/job-health, client/market-intel, client/spend-analytics [all GET]
- **freelancer dashboards (5):** freelancer/bid-tracker, freelancer/dashboard, freelancer/earnings, freelancer/match-radar, freelancer/price-alerts [all GET]
- **misc:** upload/sign [POST], upload/delete [DELETE], email-logs [GET,DELETE], seed [POST]

### Domains with NO microservice yet (must be built in Phase 3)
reviews, referrals, teams, invites, assessments, keys, milestones, admin (all), ai (all), client dashboards (all), freelancer dashboards (all), upload, email-logs, seed, and job sub-flows (direct-offer, feature, offer-response, pricing-hint, recommended), bids/my.
