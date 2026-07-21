# v14 — correctness & reliability fixes over v12

v14 **is v12** plus a focused set of correctness/robustness fixes to the live
Next.js app. **No feature or architecture changes** — the microservice-migration
experiment lives on the separate `v13_with_microservice_half_code` branch, not here.

Everything below was verified with `tsc --noEmit` (exit 0) on `web/`.

---

## 1. Money arithmetic is now exact (integer-cent math)

**Problem (v12):** escrow fee/net were computed with chained floating-point math —
`Number((amount * 0.1).toFixed(2))` — which drifts (`458 * 0.1 === 45.800000000000004`)
and accumulates across partial milestone releases. The old milestone code even
carried a `>= gross - 0.01` fudge factor to paper over the drift.

**Fix:** new **`web/src/lib/money.ts`** with `splitEscrow()`, `toCents()`, `toDollars()`
that do every split in **integer cents**, guaranteeing `platformFee + netAmount === gross`
to the cent. Wired into **every** escrow-creating path:
- `POST /api/jobs/[id]` — `accept` and `accept_best`
- `PATCH /api/jobs/offer-response` — direct-offer acceptance
- `PATCH /api/payments` — Razorpay verify
- `PATCH /api/milestones` — partial escrow release (now an **exact** fully-released
  comparison in cents; the `- 0.01` fudge is gone)

**Deliberately not included** (documented follow-up): storing money as integer minor
units *end-to-end* (schema + data migration + all UI `.toLocaleString()` display). That
is a larger, separate project. v14 fixes the **computation**, which was the actual
source of the drift.

## 2. Cross-tab auth sync

**Problem (v12):** auth state lived in `localStorage` with no `storage` event listener,
so logging in or out in one browser tab left other open tabs on stale auth until refresh.

**Fix:** `web/src/lib/store.tsx` now listens for `storage` events and mirrors the change
into every open tab — it re-hydrates auth on login and clears auth + cancels the refresh
timer on logout.

## 3. Hardened MongoDB connection singleton

**Problem (v12):** `getDb()` cached the resolved `Db`, but two concurrent cold-start
callers could each open a new `MongoClient` before the cache was set, and nothing was
reused across HMR reloads / serverless invocations — connection churn.

**Fix:** `web/src/lib/mongodb.ts` caches the connect **promise** on `globalThis`; a
failed connection is never cached, so the next caller retries cleanly.

## 4. Stop leaking internal errors / no silent failures

- **`POST /api/seed`** no longer returns `details: String(err)` in its 500 response —
  the internal error is logged server-side only.
- **`web/src/app/team/page.tsx`** no longer swallows load failures in an empty
  `catch {}` — it logs them.

---

## Files changed vs v12
```
web/src/lib/money.ts                      (new)
web/src/lib/store.tsx                      cross-tab auth sync
web/src/lib/mongodb.ts                     promise-cached singleton
web/src/app/api/seed/route.ts              no error-detail leak
web/src/app/team/page.tsx                  no empty catch
web/src/app/api/jobs/[id]/route.ts         splitEscrow (accept, accept_best)
web/src/app/api/jobs/offer-response/route.ts  splitEscrow
web/src/app/api/payments/route.ts          splitEscrow
web/src/app/api/milestones/route.ts        exact cent release
```

## Recommended next (not in v14)
- Full integer-minor-unit money storage + data migration + UI display pass.
- Move in-memory rate-limiting / OAuth exchange codes to Redis before running >1 instance.
- If mobile + multi-client is the goal: extract a standalone NestJS backend (see the
  architecture discussion), not microservices.
