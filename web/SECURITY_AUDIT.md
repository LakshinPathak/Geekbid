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
