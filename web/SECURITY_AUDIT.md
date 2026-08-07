# GeekBid Security Audit — June 2026

**Scope:** `web/src/app/api/**/*.ts`, `web/src/lib/auth.ts`, `backend/services/*/index.js`
**Categories audited:** NoSQL injection, ReDoS, IDOR, brute-force / rate limiting, prototype pollution, hardcoded secrets, null dereference

---

## Findings

| ID | Severity | Category | File | Line | Description | Status |
|----|----------|----------|------|------|-------------|--------|
| C1 | CRITICAL | Hardcoded secret | `web/src/lib/auth.ts` | 8 | `NEXTAUTH_SECRET` fell back to `"fallback-secret-not-for-production"` — attacker could forge JWT for any user | **FIXED** |
| C2 | CRITICAL | Type confusion / DoS | `web/src/lib/auth.ts` | `loginUser` | `email`/`password` typed as `string` but runtime accepts object → `TypeError` → 500 DoS | **FIXED** |
| H1 | HIGH | Brute force | `web/src/app/api/auth/route.ts` | 6 | No rate limiting on login/register — unlimited password guessing | **FIXED** |
| H2 | HIGH | Brute force | `web/src/app/api/admin/verify-key/route.ts` | 6 | No rate limiting on admin key endpoint | **FIXED** |
| H3 | HIGH | ReDoS | `web/src/app/api/admin/users/route.ts` | 35 | `{ $regex: search }` with raw user input — catastrophic backtracking with crafted strings | **FIXED** |
| H4 | HIGH | ReDoS | `web/src/app/api/admin/jobs/route.ts` | 27 | Same unescaped `$regex` on title/description fields | **FIXED** |
| H5 | HIGH | Null dereference | `web/src/app/api/transactions/route.ts` | 74 | `tx.clientId.toString()` without null check after `findOne` — crashes if transaction not found | **FIXED** |
| H6 | HIGH | Null dereference | `web/src/app/api/transactions/route.ts` | 125 | Same pattern for `action === "dispute"` branch | **FIXED** |
| M1 | MEDIUM | ObjectId injection | `web/src/app/api/disputes/route.ts` | 73 | `new ObjectId(disputeId)` from raw request body — throws on non-hex input, leaking stack trace | **FIXED** |
| M2 | MEDIUM | ObjectId injection | `web/src/app/api/transactions/route.ts` | 73 | Same: `new ObjectId(transactionId)` without validation | **FIXED** |
| M3 | MEDIUM | ObjectId injection | `web/src/app/api/admin/users/[id]/route.ts` | 27 | Route param `id` used directly in `ObjectId.createFromHexString()` | **FIXED** |
| M4 | MEDIUM | ObjectId injection | `web/src/app/api/admin/jobs/[id]/route.ts` | 24 | Same | **FIXED** |
| M5 | MEDIUM | String injection | `web/src/app/api/admin/verify-key/route.ts` | 19 | `key` from request body could be object; `===` against `ADMIN_SECRET_KEY` string always false but still burns rate limit | **FIXED** |
| M6 | MEDIUM | String injection | `web/src/app/api/admin/users/route.ts` | 62 | `adminKey` compared to env string without `String()` coercion | **FIXED** |
| L1 | LOW | Role enum bypass | `web/src/app/api/admin/users/route.ts` | 28 | `role` query param passed directly to MongoDB without allowlist validation | **FIXED** |
| L2 | LOW | Status enum bypass | `web/src/app/api/admin/jobs/route.ts` | 24 | `status` query param passed to MongoDB without allowlist | **FIXED** |

---

## Backend (Express microservices) — Pre-existing protections

The backend services in `backend/services/` were already well-protected:

| Protection | Where |
|------------|-------|
| `authLimiter` (10 req / 15 min per IP) | `auth-service/index.js` |
| `apiLimiter` (100 req / 15 min per IP) | `bidding-service`, `job-service` |
| `sanitize()` strips `$`-prefixed keys | `backend/common/validate.js` |
| `validateEmail()` regex | `backend/common/validate.js` |
| `stripHtml()` on all text fields | `backend/common/validate.js` |
| `requireAuth` middleware (JWT verify) | All service routes |
| Ownership checks on PATCH/DELETE | `job-service`, `bidding-service` |
| IDOR guard: `freelancerId` from JWT (never body) | `bidding-service/index.js` |

No changes made to backend services.

---

## New files created

### `web/src/lib/sanitize.ts`

Utility library imported by all fixed routes:

| Export | Purpose |
|--------|---------|
| `sanitizeString(input)` | Forces to plain string, rejects objects |
| `sanitizeObjectId(input)` | Validates 24-hex ObjectId, returns null if invalid |
| `sanitizeQuery(input)` | Strips `$`-prefix keys and `__proto__` / `constructor` |
| `sanitizeNumber(input, default)` | Coerces to finite number |
| `sanitizePagination(page, limit)` | Clamps to safe ranges (1–100) |
| `sanitizeSearchRegex(input)` | Escapes all regex metacharacters before `$regex` use |
| `checkRateLimit(key, max, windowMs)` | In-memory sliding-window rate limiter (Map-based) |
| `getClientIp(req)` | Reads `x-forwarded-for` / `x-real-ip` for rate-limit keys |

---

## Fixes applied to Next.js routes

### `web/src/lib/auth.ts`
- Removed hardcoded fallback secret (`"fallback-secret-not-for-production"`) — throws at startup if `NEXTAUTH_SECRET` missing
- `loginUser` and `registerUser` now accept `unknown` parameters, coerce with `String()` before any DB query or comparison

### `web/src/app/api/auth/route.ts`
- Added IP-based rate limiting: 10 requests / 15 min before returning 429

### `web/src/app/api/admin/verify-key/route.ts`
- Added IP-based rate limiting: 5 attempts / 15 min
- `key` coerced to string before `===` comparison

### `web/src/app/api/admin/users/route.ts`
- `sanitizeSearchRegex()` on search param before MongoDB `$regex`
- `role` validated against allowlist `["freelancer","client","admin","all"]`
- All POST inputs (`name`, `email`, `password`, `adminKey`) force-typed to string

### `web/src/app/api/admin/jobs/route.ts`
- `sanitizeSearchRegex()` on search param before MongoDB `$regex`
- `status` validated against allowlist of job statuses
- `sanitizePagination()` for page/limit params

### `web/src/app/api/admin/users/[id]/route.ts`
- `sanitizeObjectId()` validates route param before `new ObjectId()`
- Returns 400 (not 500) on invalid ID

### `web/src/app/api/admin/jobs/[id]/route.ts`
- `sanitizeObjectId()` validates route param in both PATCH and DELETE handlers

### `web/src/app/api/transactions/route.ts`
- `sanitizeObjectId()` on `transactionId` from request body
- Null check on `tx` after `findOne()` in both `release` and `dispute` branches
- `sanitizeString()` on `action` and `reason`

### `web/src/app/api/disputes/route.ts`
- `sanitizeObjectId()` on `disputeId` from request body
- Returns 404 if dispute not found (previously: crash on ObjectId constructor)
- `sanitizeString()` on `resolution` and `status`

### `web/.env.local`
- `NEXTAUTH_SECRET` replaced from `fallback-secret-not-for-production` to 64-char cryptographic hex (generated via `openssl rand -hex 32`)

---

## Attack scenarios tested / mitigated

**C1 — JWT forgery:** Attacker knows `NEXTAUTH_SECRET=fallback-secret-not-for-production` (was in source), mints `{ role: "admin" }` JWT, calls any `/api/admin/*`. Now throws at startup if secret missing; `.env.local` has strong secret.

**C2 / M5 / M6 — Object injection:** POST `{ "email": { "$gt": "" }, "password": "x" }` to login → `compareSync(x, user.password)` with wrong user or TypeError. All inputs now `String()`-coerced before use.

**H1 / H2 — Brute force:** Scripted login loop or admin key guesser. Rate limiter returns 429 after 10 (auth) or 5 (admin-key) requests per IP per 15 minutes.

**H3 / H4 — ReDoS:** GET `/api/admin/users?search=(((((((((a+)+)+)+)` — crafted backtracking regex causing 100% CPU. `sanitizeSearchRegex()` escapes `(`, `+`, etc., making it a literal string search.

**H5 / H6 — Null crash:** PATCH `{ "transactionId": "<valid-id-for-nonexistent-tx>", "action": "release" }` → `findOne` returns `null` → `tx.clientId.toString()` throws → 500 leaks stack. Now explicit 404.

**M1–M4 — ObjectId crash:** Send `{ "disputeId": "not-24-hex" }` → `new ObjectId("not-24-hex")` throws `BSONTypeError` → 500. Now validated with regex first → 400 with clean message.

---

# Addendum — v11 (job acceptance, escrow, chat, and OAuth audit)

**Scope:** Bid-acceptance → messaging orchestration, escrow/payment integrity, chat authorization, Google OAuth, admin/seed access control, public v1 API, and AI-route rate limiting. Full narrative write-up with exploit scenarios and file:line references: [`geekbid_bid_acceptance_and_system_audit.md`](../geekbid_bid_acceptance_and_system_audit.md) at repo root.

## Findings

| ID | Severity | Category | File | Description | Status |
|----|----------|----------|------|-------------|--------|
| V11-C1 | CRITICAL | IDOR | `web/src/app/api/jobs/[id]/route.ts` | `PATCH` `action=cancel`/`complete` checked only `role === "client"`, never job ownership — any client could cancel or force-complete another client's job, and `complete` also force-released that job's escrow | **FIXED** |
| V11-H1 | HIGH | Race condition | `web/src/app/api/jobs/[id]/route.ts` | `accept`/`accept_best` used `findOne` then a separate `updateOne` — two concurrent requests could both pass the `status === "open"` check and both run the full accept flow (double escrow transaction) | **FIXED** — atomic `findOneAndUpdate` gated on `status: "open"`, returns 409 on conflict |
| V11-H2 | HIGH | Race condition | `web/src/app/api/transactions/route.ts` | `release`/`dispute` had no check on the transaction's current `escrowStatus` — a release could override an open dispute; a dispute could be raised after payout | **FIXED** — atomic `findOneAndUpdate` gated on `escrowStatus: "held"` |
| V11-H3 | HIGH | Trust boundary | `web/src/app/api/payments/route.ts` | Ledger amount (`grossAmount`/fees) came from the client request body, never cross-checked against what Razorpay actually captured | **FIXED** — server-side lookup of the payment via Razorpay's API before recording the transaction |
| V11-H4 | HIGH | IDOR | `web/src/app/api/chat/rooms/route.ts`, `web/src/app/api/chat/messages/route.ts` | No check that the caller was a participant — any authenticated user could create a room with arbitrary participants, or post into any room by ID | **FIXED** — caller must be a participant; room participants must be associated with the job |
| V11-H5 | HIGH | CSRF / session fixation | `web/src/app/api/auth/google/route.ts`, `.../callback/route.ts` | OAuth `state` was just the plain `role` string, never validated — a crafted callback URL could log a victim into an attacker's account | **FIXED** — random nonce in an httpOnly cookie, validated on callback |
| V11-H6 | HIGH | Sensitive data in URL | `web/src/app/api/auth/google/callback/route.ts` | Access token and full user JSON were appended to the `/login` redirect URL — exposed via browser history, proxy/access logs, and `Referer` headers | **FIXED** — one-time, 60s-TTL exchange code; token only ever travels in a POST body |
| V11-H7 | HIGH | Missing auth | `web/src/app/api/seed/route.ts` | Gated only by an `ALLOW_SEED` env flag with no admin check — a misconfigured environment allowed an unauthenticated caller to wipe the database | **FIXED** — requires admin auth, except for the one-time bootstrap of a genuinely empty non-production database |
| V11-H8 | HIGH | DoS / perf | `web/src/app/api/v1/jobs/route.ts` | API-key auth ran `bcrypt.compareSync` against every row in `api_keys` per request | **FIXED** — indexed SHA-256 hash lookup, with a self-migrating fallback for pre-existing keys |
| V11-H9 | HIGH | Business-logic bypass | `web/src/app/api/v1/jobs/route.ts` | Public API job creation skipped the category whitelist, the free-plan job cap, and didn't set the pricing-engine fields the rest of the app assumes exist | **FIXED** — mirrors the internal job-creation route's validation and field set |
| V11-M1 | MEDIUM | Missing check | `web/src/app/api/bids/route.ts` | No server-side check that the job was still `open` before accepting a bid | **FIXED** |
| V11-M2 | MEDIUM | Data leak | `web/src/app/api/users/route.ts` | `email` was returned to any authenticated caller, not just admins | **FIXED** — projected out for non-admin callers |
| V11-M3 | MEDIUM | Missing feature | `web/src/app/api/jobs/[id]/complete/route.ts` | This is the route the frontend actually calls to complete a job, and it never released escrow at all (only its unused PATCH-action twin did) | **FIXED** |
| V11-M4 | MEDIUM | Missing feature | `web/src/app/api/milestones/route.ts` | "Approve & Release" milestone action only flipped a status field — never touched escrow/transactions | **FIXED** — real partial escrow release per milestone |
| V11-M5 | MEDIUM | Dead feature | `web/src/app/api/referrals/route.ts` | Referral credits were recorded at `0` on signup and never transitioned — the reward mechanic never paid out | **FIXED** — credited on the referred user's first completed job |
| V11-M6 | MEDIUM | Missing rate limit | `web/src/app/api/ai/{chat-assist,evaluate-bids,generate-description,quality-check,pricing-advisor,smart-search}/route.ts` | Only `bid-strategy` enforced a free-plan usage cap; the other six had none | **FIXED** — shared plan-limit check |
| V11-M7 | MEDIUM | Trust boundary | `web/src/app/api/ai/evaluate-bids/route.ts` | Took `job`/`bids`/`freelancers` wholesale from the request body instead of re-fetching by `jobId`, so a client could fabricate an inflated freelancer profile | **FIXED** — re-fetches everything server-side; also switched bid identification from array index to `bidId` since server/client ordering could otherwise silently mismatch |
| V11-M8 | MEDIUM | Race condition | `web/src/app/api/jobs/route.ts`, `web/src/app/api/bids/route.ts` | Free-plan monthly caps were read-then-increment, not atomic | **FIXED** — atomic `findOneAndUpdate` gated on the cap |
| V11-L1 | LOW | Defense in depth | `web/src/app/api/upload/sign/route.ts` | Signed upload params had no format restriction | **FIXED** — `allowed_formats` baked into the signature (image formats only). Note: the live avatar-upload flow uses an unsigned Cloudinary preset directly from the browser and doesn't call this route at all |
| V11-L2 | LOW | Performance | `web/src/app/api/bids/my/route.ts` | One `findOne` per bid to join job details (N+1) | **FIXED** — single batched `$in` query |

Also fixed in the same pass, found during verification of a separate messaging feature: a `return` statement accidentally nested inside an unrelated `if` block that could leave a request hanging with no response, and notification documents using `read`/`message` field names inconsistent with the `isRead`/`body` schema used everywhere else — the mismatch meant notification text wouldn't render and "mark all read" would silently skip them.

## No issues found

`lib/auth.ts` JWT handling (HS256 pinned, `jose`-verified, DB-backed refresh rotation), all `/api/admin/**` role checks (independently re-verified server-side, not just the client-side key gate), `/api/user*` ownership scoping, `/api/disputes` and `/api/invites` ownership checks, `/api/keys` and `/api/teams` scoping, `/api/email-logs` access control.
