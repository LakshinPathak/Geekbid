# GeekBid Migration — LIVE STATUS TRACKER

> **Living checklist. Updated as each item completes so work survives a context reset.**
> Branch: `v13` · Pattern: BFF proxy (browser → Next `/api/*` → gateway :8080 → Express service → Mongo).
> Full context: `HANDOFF_ANTIGRAVITY.md` (run/test guide) + `MIGRATION_PLAN_backend_microservices.md` (plan/decisions).

## Legend
✅ done + verified live · 🟡 in progress · ⬜ not started · 🔵 intentionally kept in BFF (web-coupled to Resend/Razorpay/Gemini/Cloudinary)

---

## Foundation (Phase 0) — ✅ DONE + verified
- ✅ Gateway reverse proxy (`backend/services/gateway/index.js`) + `/health` aggregate + CORS allowlist
- ✅ Gateway route table incl. `/v1/transactions` → payments
- ✅ JWT secret unified (backend `JWT_SECRET` == web `NEXTAUTH_SECRET`); hardcoded fallback removed
- ✅ BFF client `web/src/lib/backend.ts` (`backendFetch`, `proxyToBackend`, `tokenFromRequest`)
- ✅ Dev orchestration: root `package.json` + `scripts/dev-all.js` (`npm run dev`)
- ✅ Verified: jose-minted (web) token accepted by Express services through gateway

## Reads + clean writes — ✅ DONE + verified
| Endpoint | Service | Status |
|---|---|---|
| GET /api/users | auth-service /v1/users | ✅ (401 no-token; email admin-only) |
| GET /api/users/[id] | auth-service /v1/users/:id | ✅ (public hides email/googleId) |
| GET /api/user | auth-service /v1/auth/me | ✅ |
| PATCH /api/user | auth-service PATCH /v1/users/:id (self) | ✅ (self ok, other 403) |
| GET/POST/PATCH /api/notifications | notification-service | ✅ (string-userId schema) |
| GET /api/notifications/count | notification-service | ✅ (unread=2) |
| GET/POST /api/chat/rooms | chat-service | ✅ (token-scoped + job-assoc auth) |
| GET/POST /api/chat/messages | chat-service | ✅ (chat_messages coll; non-participant 404) |
| GET /api/bids | bidding-service /v1/bids | ✅ (401 no-token; 10 bids) |
| GET /api/bids/my | bidding-service /v1/bids/my | ✅ (freelancer 200, client 403) |
| GET /api/transactions | payment-service /v1/transactions | ✅ (IDOR-scoped) |
| GET /api/disputes | payment-service /v1/disputes | ✅ (admin all / else own) |
| GET /api/jobs | job-service /v1/jobs | ✅ (invite-only visibility) |
| GET /api/jobs/[id] | job-service /v1/jobs/:id | ✅ |
| POST /api/jobs | job-service POST /v1/jobs + BFF email | ✅ (client-only, plan-limit, adaptive) |

## State-transition writes (service DB write + BFF email) — 🟡 IN PROGRESS
| Endpoint | Service work | BFF flip | Verified |
|---|---|---|---|
| PATCH /api/transactions (release/dispute) | ✅ payment-service PATCH /v1/transactions (atomic guards) | ✅ done | ✅ 409 double-release, 403 non-owner |
| PATCH /api/disputes (admin resolve) | ✅ payment-service PATCH /v1/disputes | ✅ done | ✅ 403 non-admin, 404 missing |
| POST /api/bids (counter) | ✅ bidding-service POST /v1/bids/counter (plan-limit + cooldown + demand signals) | ✅ done | ✅ client→403, freelancer→201, cooldown→429, negative→422 |
| PATCH /api/jobs/[id] cancel | ⬜ TODO | ⬜ | ⬜ |
| PATCH /api/jobs/[id] complete | ⬜ TODO (escrow release) | ⬜ | ⬜ |
| PATCH /api/jobs/[id] accept/accept_best | ⬜ TODO (needs pricing.ts port + chat/notif/escrow) | ⬜ | ⬜ |
| /api/jobs/[id]/cancel, /complete (separate routes) | ⬜ TODO | ⬜ | ⬜ |
| PATCH /api/milestones | ⬜ TODO | ⬜ | ⬜ |

## 🔵 Intentionally kept in Next BFF (do NOT migrate — web-coupled, no benefit)
- `/api/payments` (Razorpay signature verify uses web Razorpay keys)
- AI (8, Gemini), admin (11, audit), client/freelancer dashboards (10, read aggregations)
- reviews, referrals, teams, invites, assessments, keys, upload (Cloudinary), email-logs, seed
- auth login/register/OAuth/refresh/logout (httpOnly cookie + OAuth exchange-code are browser-bound)

## ⬜ Deferred (future)
- Money → integer minor units (during a payments port)
- Phase 2 real-time: socket.io through gateway (services emit; frontend polls today)

---

## How to run / test (for continuation)
```
npm run install:all && npm run dev     # services+gateway+web
# health: curl http://127.0.0.1:8080/health
# mint a test token (web secret): see HANDOFF_ANTIGRAVITY.md §4
```
Backend restart after service edits: kill ports 8080/3001/3003-3007, `npm --prefix backend start`.

## Flip recipe (repeat per endpoint)
1. Read Next route + matching Express handler.
2. Enrich the service to full parity (auth, projection, atomic guards, string-id schema).
3. Flip Next route: pure read → `proxyToBackend`; write-with-email → `backendFetch` then fire email from result.
4. Restart backend, test `/v1` via gateway, then `/api` via Next. Then **update this file**.

## Commits on v13 so far
1. Phase 0 + read/transactional flips
2. job create/list + profile update writes
3. (pending) transactions/disputes PATCH writes
