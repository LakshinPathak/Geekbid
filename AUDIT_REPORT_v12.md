# GeekBid — Full Codebase Audit (v12 branch)

**Scope:** All 16 audit prompts (architecture, auth, bidding, payments, API contracts, security, chat/notifications, admin, integrations, DB, job lifecycle, state, secondary features, error handling, feature matrix).
**Method:** codebase-memory-mcp graph (19,530 nodes / 68,963 edges) + full source read of the backend common layer, all 6 microservices, and every security-critical Next.js API route + core libs.

---

## 0. The single most important finding

**The entire `backend/` directory is dead code.** The running application (Next.js `web/`) talks *only* to its own `/api/*` route handlers. There is **zero** reference in `web/src` to the Express gateway or services (`localhost:3001–3007`, `*_SERVICE_URL`, `GATEWAY`). The only `localhost:3000` reference is `email.ts`'s `APP_URL` for building links.

Consequence: there are effectively **two parallel implementations** of auth, jobs, bids, and payments:

| Layer | Status | Security posture |
|-------|--------|------------------|
| `web/src/app/api/*` (Next.js) | **LIVE** — this is production | Hardened (v12 fixes present) |
| `backend/services/*` (Express) | **DEAD** — never called by the app | Weaker; several real holes |

Every finding below is tagged **[LIVE]** (affects the running app — fix these) or **[DEAD]** (only in the unused Express layer — lower priority, but delete or secure it so it can't be accidentally deployed).

---

## 1. Architecture Summary

- **Frontend:** Next.js 15 (App Router), React, single `AppProvider` context store (`web/src/lib/store.tsx`, 1,306 lines) — Context + `useState`/`useCallback`, not Redux/Zustand.
- **Live backend:** Next.js route handlers (72 routes) → MongoDB Atlas (`geekbid` DB) via `web/src/lib/mongodb.ts`.
- **Dead backend:** Express microservices (auth, job, bidding, payment, notification, chat, gateway) under `backend/` sharing a `common/` layer.
- **Integrations:** MongoDB (mongodb driver, no ODM/schemas), Resend (email — real), Cloudinary (avatars/uploads — signed server-side), Google Gemini (`@google/generative-ai`), Razorpay (payments — in the *dead* service only), Google OAuth.
- **Dead/orphaned code:** all of `backend/` relative to the app; `web/src/lib/data.ts` (mock data) is **not imported anywhere** — good, confirmed not used in production.

---

## 2. Findings by Severity (LIVE app)

### HIGH

| # | Finding | File:Line | Detail / Fix |
|---|---------|-----------|--------------|
| H1 | **Money stored as floating-point, not integer cents** | `api/jobs/[id]/route.ts:142,146,351,358`; `api/payments/route.ts:209-210`; `api/milestones/route.ts:141-144` | `platformFee = grossAmount * 0.1`, `netAmount = finalPrice - fee`, all JS floats rounded with `.toFixed(2)`. Accumulates rounding error across partial milestone releases (`newReleasedAmount >= grossAmount - 0.01` fudge factor is a symptom). **Fix:** store money as integer minor units (paise/cents); compute fees with integer math. |
| H2 | **Dead Express layer ships weaker auth** | `backend/common/authMiddleware.js:3` | `JWT_SECRET = process.env.JWT_SECRET || 'geekbid-dev-secret-change-in-production'` — hardcoded fallback. If this layer is ever deployed, tokens are forgeable. Contrast the live layer (`web/src/lib/auth.ts:8`) which **throws** if `NEXTAUTH_SECRET` is unset. **Fix:** delete `backend/` or remove the fallback + add the same throw. |

### MEDIUM

| # | Finding | File:Line | Detail / Fix |
|---|---------|-----------|--------------|
| M1 | **Auth not synced across browser tabs** | `web/src/lib/store.tsx` (no `storage` listener) | Tokens live in `localStorage` but there is no `window.addEventListener("storage", …)`. Logging out (or in) in one tab leaves other tabs on stale auth until refresh. **Fix:** add a storage-event listener that re-hydrates/clears `auth` + `currentUser`. |
| M2 | **CORS fully open in dead layer** | `backend/common/app.js:15` (`cors()`), `backend/services/bidding-service/index.js:13` (`origin:'*'`) | Any origin allowed. [DEAD] but a landmine if deployed. |
| M3 | **Public unauth endpoints in dead layer** | `backend/services/auth-service/index.js:200,220` | `GET /v1/users/:id` and `GET /v1/users` require no auth and dump user lists. [DEAD] — the LIVE equivalent `api/users/[id]` correctly strips `email`/`password`/`refreshToken`. |
| M4 | **`web` Mongo client not concurrency-guarded on cold start** | `web/src/lib/mongodb.ts:8-14` | `getDb()` caches `cachedDb`, but two concurrent first-calls each `new MongoClient().connect()` before the cache is set, and there's no `global` reuse across HMR/serverless invocations → possible connection churn. **Fix:** cache the *connect promise* (and stash on `globalThis` in dev). |

### LOW / correctness nits

| # | Finding | File:Line | Detail |
|---|---------|-----------|--------|
| L1 | Counter-bid amount not bounded by budget | `api/bids/route.ts:120-127` | `bidPrice` is coerced to `Number` and stored; only truthiness (`!bidPrice`) is checked. A negative or absurdly large value isn't rejected server-side (negative fails `!bidPrice` only if 0). Add explicit `> 0` + upper-bound validation. |
| L2 | Milestone `approve` doesn't verify job is `accepted`/`in_progress` | `api/milestones/route.ts:117-125` | Only checks client ownership. Escrow release is separately guarded by `escrowStatus:"held"` so no double-spend, but status hygiene is loose. |
| L3 | `500` responses sometimes leak error detail | `api/seed/route.ts:971` (`details: String(err)`) | Seed returns raw error string. Low impact (admin-gated) but inconsistent with the rest of the app which returns generic messages. |
| L4 | Empty catch swallows load error | `web/src/app/team/page.tsx:41` | `} catch {}` hides fetch failures from the user. |

---

## 3. What is SOLID in the LIVE app (verified, not just assumed)

These were specifically probed by the audit prompts and came back **clean**:

- **NoSQL injection:** `loginUser`/`registerUser` force `String(...)` on all inputs (`auth.ts:163-166,290-291`); `sanitize.ts` strips `$`-keys, `__proto__`, `constructor`; admin search escapes regex metacharacters (`admin/users/route.ts:30`). No string-concatenated queries found.
- **XSS:** zero `dangerouslySetInnerHTML` / `innerHTML` / `eval` in `web/src`.
- **Secrets:** none hardcoded in app source (only in `node_modules`); Cloudinary/Gemini/Resend keys read from env server-side. Only `NEXT_PUBLIC_CLOUDINARY_*` reach the client, which is correct (cloud name + unsigned preset are meant to be public).
- **Password hashing:** bcrypt cost 12 on live register (`auth.ts:176`) and admin-create (`admin/users/route.ts:84`). (Seed uses cost 10 for fixtures — fine.)
- **JWT:** access 15m / refresh 7d, refresh tokens **rotated and DB-validated** with theft-detection revoke (`auth.ts:319-347`); httpOnly + `secure`-in-prod cookies.
- **OAuth CSRF:** state nonce cookie (`oauth-state.ts`) + one-time in-memory exchange codes so tokens never hit the URL.
- **Rate limiting:** in-memory limiter on admin-key brute force (5/15min) and bid cooldown (30min); note this is per-instance (won't hold across horizontally-scaled deployments).
- **IDOR checks:** transactions filter by `clientId/freelancerId` unless admin (`transactions/route.ts:17-25`); notifications scoped to `userId`; chat messages verify room participation on **both** read and write (`chat/messages/route.ts:26-32,88-94`); job edit/cancel/complete verify `clientId === userId`.
- **Race conditions:** job acceptance uses atomic `findOneAndUpdate({status:"open"})` returning 409 on loss (`jobs/[id]/route.ts:135-141,322-339`); plan-limit bid/job counters use atomic `findOneAndUpdate` with `$lt` cap (`bids/route.ts:85-97`); escrow release guarded by `escrowStatus:"held"` filter.
- **Reviews:** gated on released escrow + job participation + unique index (`reviews/route.ts:59-85`). Cannot review without a completed, paid job.
- **AI quota:** all 8 AI routes enforce `checkAndConsumeAiQuota` / bid-strategy counter; free plan capped, atomic increment.
- **Admin:** every `api/admin/*` route checks `role === "admin"` after `authenticateRequest`; actions write to `audit_logs`; admin bootstrap via seed or admin-key-gated create.
- **Email:** real Resend integration with per-recipient dedup logging (`email.ts`).

---

## 4. Feature Matrix (LIVE end-to-end)

| Feature | Route(s) | DB | Status |
|---|---|---|---|
| Email register/login | `api/auth` | users, refresh_tokens | ✅ Working |
| Google OAuth | `api/auth/google/*` | users | ✅ Working (state + exchange-code CSRF) |
| Profile view/edit/avatar | `api/user`, `api/users/[id]`, `api/upload/sign` | users | ✅ Working (signed Cloudinary) |
| Job post/edit/delete | `api/jobs`, `api/jobs/[id]` | jobs | ✅ Client-gated, atomic |
| Job feed/search/filter | `api/jobs`, `api/jobs/recommended` | jobs | ✅ Paginated, invite-visibility aware |
| Bidding place/accept/counter/award | `api/bids`, `api/jobs/[id]` (accept/accept_best) | bids, jobs, transactions | ✅ Atomic accept; ⚠️ L1 bid bounds |
| Price decay | server-computed on accept + 15s socket in dead svc | jobs | ✅ Live path recomputes server-side (never trusts client) |
| Milestones | `api/milestones` | milestones, transactions | ✅ Partial escrow release; ⚠️ L2 |
| Payments/escrow | `api/transactions`, `api/payments` | transactions | ⚠️ Works but H1 float money; Razorpay only in DEAD svc |
| Chat | `api/chat/rooms`, `api/chat/messages` | chat_rooms, chat_messages | ✅ Participant-checked. **Polling, not WebSocket** (live socket.io exists only in dead bidding-svc) |
| Notifications | `api/notifications`, `.../count` | notifications | ✅ In-app; email via Resend |
| Reviews | `api/reviews` | reviews | ✅ Escrow-gated, unique |
| Referrals | `api/referrals`, `lib/referrals.ts` | referrals, users | ✅ Credited on first completion (idempotent) |
| Teams | `api/teams` | teams | ✅ Create/invite/accept |
| Assessments | `api/assessments` | assessments, assessment_results | ✅ Seeded question banks |
| Admin (stats/users/jobs/disputes/logs/tx) | `api/admin/*` | multiple | ✅ Real Mongo, role-gated, audited |
| AI Bid Strategist + 7 AI tools | `api/ai/*` | users (quota) | ✅ Real Gemini, quota-enforced |
| Cloudinary CDN | `api/upload/sign`, `api/upload/delete` | — | ✅ Signed, folder+format allowlist |
| Settings / Pricing / Earnings | `settings/`, `pricing/`, `freelancer/earnings` | users, transactions | ✅ Wired to real data |

---

## 5. Top recommendations (priority order)

1. **Delete or fully secure `backend/`.** It's dead weight that duplicates auth/payments with weaker controls (H2, M2, M3). If it's kept for a future migration, remove the hardcoded JWT fallback and lock CORS *now*.
2. **Move money to integer minor units** (H1) before real Razorpay goes live in the Next layer.
3. **Add cross-tab auth sync** (M1) — small, high UX/security value.
4. **Harden the `web` Mongo singleton** for serverless/HMR (M4).
5. **Tighten bid-amount validation** (L1) and clean up the seed error leak + empty catch (L3/L4).

*Note on rate limiting & OAuth exchange codes:* both use in-memory `Map`s (`sanitize.ts`, `oauth-state.ts`). Correct for single-instance, but they silently degrade on multi-instance/serverless deployments — revisit if you scale horizontally.
