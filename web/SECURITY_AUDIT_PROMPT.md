# Claude Code Prompt — Security Audit: Injection Attack Resistance

Copy everything inside the triple backtick block below and paste into Claude Code:

---

```
# SECURITY AUDIT: NoSQL Injection & Injection Attack Resistance

Project: /home/lakshinpathak/Downloads/Geekbid-master/

## OBJECTIVE
Audit the ENTIRE codebase for NoSQL injection vulnerabilities (MongoDB), XSS, and other injection attacks. GeekBid uses MongoDB (NOT SQL) — so test for MongoDB operator injection, not SQL injection.

## WHAT TO CHECK

### 1. NoSQL Injection (CRITICAL)
Scan ALL files matching these patterns for unsafe MongoDB queries:
- web/src/app/api/**/route.ts (all Next.js API routes)
- backend/services/*/index.js (all Express microservices)

For EACH endpoint that takes user input (req.body, req.query, req.params, searchParams), check if user input is passed DIRECTLY into MongoDB queries without sanitization.

VULNERABLE pattern (BAD):
```js
// User sends { email: { "$gt": "" }, password: { "$gt": "" } }
const user = await db.collection("users").findOne({ email: req.body.email, password: req.body.password });
// This bypasses auth because { "$gt": "" } matches everything
```

SAFE pattern (GOOD):

```js
// Force string type
const email = String(req.body.email);
const user = await db.collection("users").findOne({ email });
```

Check EVERY MongoDB query (.find, .findOne, .updateOne, .deleteOne, .aggregate) for:

- Is user input sanitized/typed before being used in the query?
- Are MongoDB operators ($gt, $ne, $regex, $where, $expr) blockable from user input?
- Are ObjectId params validated before use in queries?

### 2. Auth Bypass via Injection

Test these specific attack vectors:

- Login endpoint: Can { email: {"$gt": ""}, password: {"$gt": ""} } bypass auth?
- Admin verify-key: Can { key: {"$gt": ""} } bypass the admin key check?
- User lookup by ID: Can invalid ObjectIds crash the server?
- Search endpoints: Can $regex injection cause ReDoS?

### 3. XSS (Cross-Site Scripting)

Check if any user-generated content (job titles, descriptions, bids, chat messages, user names) is:

- Rendered as raw HTML (dangerouslySetInnerHTML)
- Passed to eval() or Function()
- Inserted into script tags

React/Next.js auto-escapes JSX, but check for dangerouslySetInnerHTML usage.

### 4. Prototype Pollution

Check if any endpoint does:

- Object.assign({}, req.body) without filtering __proto__
- Spread operator on unvalidated input: { ...req.body }
- Deep merge of user input into config objects

### 5. Command Injection

Check if any user input is passed to:

- child_process.exec()
- eval()
- new Function()
- require() with dynamic paths

### 6. Rate Limiting

Check if these critical endpoints have rate limiting:

- Login endpoint (brute force prevention)
- Admin key verification (brute force prevention)
- Registration endpoint (spam prevention)
- Password reset endpoint (abuse prevention)

If no rate limiting exists, add express-rate-limit or a simple in-memory counter.

### 7. IDOR (Insecure Direct Object Reference)

Check if these endpoints verify ownership:

- GET/PATCH/DELETE user profile — can user A modify user B's profile?
- GET/PATCH/DELETE jobs — can non-owner modify a job?
- Bid submission — is freelancerId taken from the JWT (safe) or request body (unsafe)?
- Escrow release — can a non-party release escrow?
- Dispute creation — can someone create a dispute for a job they're not involved in?

## OUTPUT FORMAT

Create a security report at web/SECURITY_AUDIT.md with:

### Summary Table

| # | File | Line | Severity | Type | Description | Status |
| - | ---- | ---- | -------- | ---- | ----------- | ------ |

### Severity levels:

- CRITICAL: Auth bypass, data leak, RCE possible
- HIGH: Injection possible but limited impact
- MEDIUM: Missing validation that could be exploited
- LOW: Best practice violation

### Attack Test Results

For each attack vector tested, document:

- Attack: what was tested
- Endpoint: which API route
- Payload: the malicious input
- Result: VULNERABLE or SAFE
- Fix applied: what was done

## THEN FIX ALL CRITICAL AND HIGH ISSUES

### Step 1: Create sanitize utility

Create web/src/lib/sanitize.ts:

```ts
/**
 * Input sanitization utilities to prevent NoSQL injection
 */

// Force input to string, stripping any object/array that could contain MongoDB operators
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim();
}

// Validate MongoDB ObjectId format (24 hex characters)
export function sanitizeObjectId(input: unknown): string | null {
  const str = String(input || "");
  return /^[a-f\d]{24}$/i.test(str) ? str : null;
}

// Sanitize an entire query object — strip any keys starting with $
export function sanitizeQuery(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    // Block MongoDB operators in keys
    if (key.startsWith("$")) continue;
    // Block __proto__ for prototype pollution
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    // Recursively sanitize nested objects
    if (typeof val === "object" && val !== null) {
      // Force to string — nested objects could contain $gt, $ne, etc.
      clean[key] = String(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// Sanitize number input
export function sanitizeNumber(input: unknown, defaultVal = 0): number {
  const num = Number(input);
  return Number.isFinite(num) ? num : defaultVal;
}

// Sanitize pagination params
export function sanitizePagination(page: unknown, limit: unknown) {
  return {
    page: Math.max(1, sanitizeNumber(page, 1)),
    limit: Math.min(100, Math.max(1, sanitizeNumber(limit, 20))),
  };
}

// Sanitize search string for safe use in MongoDB $regex
export function sanitizeSearchRegex(input: unknown): string {
  const str = sanitizeString(input);
  // Escape regex special characters to prevent ReDoS
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

### Step 2: Apply sanitization to ALL API routes

For every API route that queries MongoDB:

1. Cast ALL user inputs to expected types BEFORE using in queries:

```ts
const email = sanitizeString(body.email);
const password = sanitizeString(body.password);
const id = sanitizeObjectId(params.id);
if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
```

2. For search endpoints, escape regex:

```ts
const search = sanitizeSearchRegex(searchParams.get("search"));
const filter = search ? { fullName: { $regex: search, $options: "i" } } : {};
```

3. For pagination:

```ts
const { page, limit } = sanitizePagination(searchParams.get("page"), searchParams.get("limit"));
const skip = (page - 1) * limit;
```

### Step 3: Fix admin key verification specifically

In web/src/app/api/admin/verify-key/route.ts, ensure:

```ts
const { key } = await req.json();
const sanitizedKey = String(key || ""); // Force to string — blocks { "$gt": "" }
if (sanitizedKey === process.env.ADMIN_SECRET_KEY) { ... }
```

## CRITICAL ENDPOINTS TO PRIORITIZE (check these FIRST):

1. POST /api/auth/login (or wherever login happens) — NoSQL injection in email/password
2. POST /api/admin/verify-key — operator injection in key field
3. GET /api/admin/users?search= — regex injection in search
4. All routes with [id] params — ObjectId validation
5. POST /api/bids — bid amount manipulation, freelancerId spoofing
6. POST /api/jobs — job creation input validation
7. PATCH /api/admin/users/[id] — role escalation (can regular user set role: "admin"?)
8. All backend/services/*/index.js Express routes — same checks

## ALSO CHECK:

- Are JWT tokens validated on every protected route?
- Is the JWT secret strong enough? (check NEXTAUTH_SECRET value)
- Are CORS headers properly configured?
- Is helmet.js or equivalent security headers middleware in use?
- Are file uploads validated for type/size? (Cloudinary integration)
- Are API keys exposed in client-side code? (check for NEXT_PUBLIC_ keys that shouldn't be public)

## DELIVERABLES:

1. web/SECURITY_AUDIT.md — full report with findings table
2. web/src/lib/sanitize.ts — sanitization utility (create this)
3. Fix ALL critical and high severity issues in-place
4. Add input validation comments above each fix for documentation

```
```
