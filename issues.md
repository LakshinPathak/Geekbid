# GeekBid (`web`) — Bug Issues

> Full-codebase review of `README.md` + `web/` (API routes, libs, pages, components, store).
> Date: 2026-07-17 · **61 issues** (ISSUE-1–34 first pass; ISSUE-35–61 second pass + README gaps).
> Solutions / DB / CRUD: see [`planning.md`](./planning.md).
>
> Many bugs from the v17/v18 audits (suspended login, maintenance mode, dispute escrow release, bid TOCTOU, invite guards, soft-deleted login, etc.) appear **already fixed** in current code. This file lists **remaining live issues** only.

---

## Critical

### ISSUE-1 — Free paid plans when Razorpay / plan IDs are missing

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Area** | Billing / subscriptions |
| **File(s)** | `web/src/app/api/subscriptions/route.ts` (~75–109) |

**What’s wrong:** If `RAZORPAY_KEY_ID` is still the placeholder **or** `RAZORPAY_PLAN_ID_PLUS` / `PREMIUM` is unset, `POST /api/subscriptions` immediately activates Plus/Premium and writes `users.plan`. There is **no** `NODE_ENV === "production"` guard (unlike mock payments).

**Failure scenario:** Misconfigured or staging-like production (or missing plan IDs with real keys) → free paid tiers, lower fees, higher quotas.

**Suggested fix:** Fail closed in production when Razorpay/plan IDs are missing; only allow mock when explicitly enabled (e.g. `ALLOW_MOCK_BILLING=true`).

---

### ISSUE-2 — Featured boost accepts any verified payment amount

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Area** | Monetization / featured jobs |
| **File(s)** | `web/src/app/api/jobs/feature/route.ts` (~91–103); related: `web/src/app/api/payments/route.ts` (client chooses `amount` + `description`) |

**What’s wrong:** Payment claim only checks `description: featured_boost:<jobId>` + `verified` + unused; never checks `grossAmount >= FEATURED_BOOST_PRICE_USD` (or currency).

**Failure scenario:** Pay ₹1 (or $0.01), verify with `description: "featured_boost:<jobId>"`, feature the job.

**Suggested fix:** Require `grossAmount`/`currency` to match the boost price; preferably bind order notes at create time, not client-supplied `description`.

---

### ISSUE-3 — Cancel is not atomic — can cancel an already-accepted job

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Area** | Jobs / auction races |
| **File(s)** | `web/src/app/api/jobs/[id]/cancel/route.ts` (~41–48); contrast accept path in `web/src/app/api/jobs/[id]/route.ts` |

**What’s wrong:** Status check is a plain read (`job.status !== "open"`); `updateOne` does not require `status: "open"` in the filter.

**Failure scenario:** Accept and cancel concurrent → job becomes `cancelled` after accept; escrow row left `held`; freelancer “won” then lost.

**Suggested fix:** `findOneAndUpdate({ _id, status: "open" }, { $set: { status: "cancelled", ... } })` and return 409 if unmatched (same pattern as accept/complete).

---

### ISSUE-4 — Direct Hire offers cannot be accepted/declined in the UI

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **Area** | Frontend / Direct Hire |
| **File(s)** | `web/src/lib/store.tsx` (~590–608 — `respondToOffer` defined); no callers under `web/src/app/**` or `web/src/components/**` |

**What’s wrong:** Store exposes `respondToOffer` → `PATCH /api/jobs/offer-response`, but nothing in the UI ever calls it. Job detail only offers auction Accept / counter-bid.

**Failure scenario:** Client sends a Direct Hire offer. Offered freelancer opens the job, clicks “Accept at $X”. API rejects (`direct_offer` must use offer-response). Decline is also impossible. Feature is dead on the freelancer side.

**Suggested fix:** On job detail (and feed for `type === "direct_offer"` + `offeredTo === me`), render Accept/Decline that call `respondToOffer`. Hide auction Accept/counter for direct offers.

---

## High

### ISSUE-5 — Bid monthly quota consumed on cooldown 429

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Bids / plan limits |
| **File(s)** | `web/src/app/api/bids/route.ts` (~125–157) |

**What’s wrong:** Quota is reserved (~125–138), then cooldown can return 429 (~149–155) **without** decrementing. Refund only exists for the later “still open” path (~166–170).

**Failure scenario:** Freelancer hits cooldown → loses a monthly bid slot with no bid placed; repeat → empty quota.

**Suggested fix:** Refund quota on cooldown failure (or check cooldown before reserving).

---

### ISSUE-6 — Accept/award mints “held” escrow with no payment; payments create a second ledger

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Escrow / payments |
| **File(s)** | `web/src/app/api/jobs/[id]/route.ts` (~405–416, ~151–156); `web/src/app/api/jobs/offer-response/route.ts` (~56–68); `web/src/app/api/payments/route.ts` (~229–246); `web/src/app/api/jobs/[id]/complete/route.ts` (~59–62) |

**What’s wrong:** Accept/offer-accept insert `escrowStatus: "held"` with no Razorpay capture. `PATCH /api/payments` can insert **another** held tx for the same `jobId` (`freelancerId: ""`). Complete does `updateOne({ jobId, escrowStatus: "held" })` — one arbitrary row.

**Failure scenario:** “Escrow released” without funds; or wrong of two rows released; freelancer/earnings/admin stats lie.

**Suggested fix:** Single escrow lifecycle: fund (verified payment) → hold → release; don’t invent held rows on accept, or attach accept to an existing funded tx and reject complete without funded escrow.

---

### ISSUE-7 — Team seat enforcement looks up owner with wrong `_id` type

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Teams / plan downgrade |
| **File(s)** | `web/src/lib/plan-downgrade.ts` (~93–95) |

**What’s wrong:** `ownerId` is a string; `_id` is ObjectId → lookup fails → `getPlanConfig(undefined)` → Free (`teamSeats: 0`) → `allowedMembers = 0` → **all members removed**.

**Failure scenario:** After seat deadline, Plus/Premium teams can be wiped by the reconciliation cron.

**Suggested fix:** `findOne({ _id: new ObjectId(team.ownerId) })` (with validation).

---

### ISSUE-8 — Month reset for jobs/bids not write-guarded (quota wipe / bypass)

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Plan quotas |
| **File(s)** | `web/src/app/api/bids/route.ts` (~118–121); `web/src/app/api/jobs/route.ts` (~137–140); `web/src/app/api/jobs/direct-offer/route.ts` (~44–47); `web/src/app/api/jobs/feature/route.ts` (~46–49). Contrast: `web/src/lib/ai-plan-limit.ts` **does** guard reset. |

**What’s wrong:** Unconditional `$set` of counters to 0 when `monthResetAt` looked stale.

**Failure scenario:** Concurrent requests: one increments, another resets → counters cleared mid-period → extra jobs/bids/boosts.

**Suggested fix:** Same conditional reset as `checkAndConsumeAiQuota` (`$or` on missing/`monthResetAt` still equal to the value you read).

---

### ISSUE-9 — Webhook idempotency allows concurrent double-processing

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Razorpay webhooks |
| **File(s)** | `web/src/app/api/webhooks/razorpay/route.ts` (~33–55) |

**What’s wrong:** Upsert only `$setOnInsert`; skip only if `status === "processed"`. Two in-flight deliveries both see `received` and both call `processWebhookEvent` (quota resets, downgrades, emails).

**Suggested fix:** Atomically claim: `findOneAndUpdate({ eventId, status: { $in: ["received","failed"] } }, { $set: { status: "processing" } })` (or insert-only claim); process only if you won the claim.

---

### ISSUE-10 — Per-row “Accept” awards the lowest bid, not that row’s freelancer

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Frontend / job detail |
| **File(s)** | `web/src/app/jobs/[id]/page.tsx` (~278–299, ~476–480; AI path ~420–424); `web/src/lib/store.tsx` `acceptJob` (~935–938 — `action: "accept_best"`) |

**What’s wrong:** Every Accept button (table row + “Accept This Bid”) calls `acceptJob` → `accept_best` (lowest bid). UI implies accepting *that* bid.

**Failure scenario:** Client clicks Accept next to Freelancer B ($800). Job is awarded to Freelancer A ($500). Victory modal can show A while the click was on B.

**Suggested fix:** Either label every control “Accept lowest bid” / single CTA (like My Jobs “Accept Best”), or add `accept_bid` with `freelancerId`/`bidId` and wire buttons to it.

---

### ISSUE-11 — Plan usage UI stays stale after jobs/bids/AI use

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Frontend / plan limits |
| **File(s)** | `web/src/lib/store.tsx` (~1323–1348 — `planUsage` from `currentUser.planLimits`); `post-job/page.tsx` (~456–461); `jobs/[id]/page.tsx` (~871–876); `AIBidStrategist.tsx` |

**What’s wrong:** Quotas update on the server; client `planLimits` only change on login/refresh. Banner/strategist keep old counts. `postJob`/`counterBid` don’t refresh user.

**Failure scenario:** Free user posts 3 jobs; banner still shows under-limit and doesn’t block. Next post fails with API quota error. Same for bids / AI strategist.

**Suggested fix:** After successful post/bid/AI/feature/invite, `refreshCurrentUser()` or patch local `planLimits` from response / `X-User-Plan` usage payload.

---

### ISSUE-12 — Adaptive “time to floor” uses fixed linear decay

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Frontend / price display |
| **File(s)** | `web/src/lib/utils.ts` (~27–31 — `getHoursToFloor`); used in `FreelancerJobCard.tsx`, job detail ETA |

**What’s wrong:** `getHoursToFloor` always divides by `decayRatePerHour`, ignoring adaptive multiplier / boost / pull. `getCurrentPrice` is adaptive; ETA is not.

**Failure scenario:** Hot adaptive job decays slowly; card shows “2h to floor” while real floor is much later (or opposite with zero-bid acceleration). Freelancers mis-time accepts.

**Suggested fix:** Derive ETA from adaptive effective rate (or binary-search adaptive price until floor).

---

### ISSUE-13 — Payments use raw `auth.accessToken` (no refresh)

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Frontend / payments |
| **File(s)** | `web/src/app/payments/page.tsx` (~118–128, ~141–146, ~188–193); same pattern in `ClientFeed.tsx`, `FreelancerFeed.tsx`, some AI components |

**What’s wrong:** Checkout/verify use `auth.accessToken` instead of `getValidToken()`. Razorpay handler can run minutes later with an expired JWT.

**Failure scenario:** User starts checkout near token expiry; after paying, verify returns 401 → “Verification failed” despite a real charge (webhook may still activate, UI looks failed).

**Suggested fix:** `const token = await getValidToken()` before each request; re-fetch token inside Razorpay `handler`.

---

## Medium

### ISSUE-14 — Milestones GET has no job authorization

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | AuthZ |
| **File(s)** | `web/src/app/api/milestones/route.ts` (~9–31) |

**What’s wrong:** Any authenticated user can list milestones for any `jobId` (amounts, titles, status).

**Suggested fix:** Require caller is `job.clientId`, `job.acceptedBy`, or admin.

---

### ISSUE-15 — Invite-only / direct-offer jobs readable by ID without auth

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | AuthZ / jobs |
| **File(s)** | `web/src/app/api/jobs/[id]/route.ts` (~11–35) |

**What’s wrong:** Public GET returns full job (price, `offeredTo`, description). Feed hides invite-only; ID route does not.

**Suggested fix:** For `visibility === "invite_only"` / `direct_offer`, require client, invitee/`offeredTo`, or admin.

---

### ISSUE-16 — Payment verification race can mint duplicate txs

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Payments |
| **File(s)** | `web/src/app/api/payments/route.ts` (~207–248) |

**What’s wrong:** `findOne(razorpayPaymentId)` then `insertOne` — no unique index. Concurrent verifies → duplicate held escrow.

**Suggested fix:** Unique index on `razorpayPaymentId` + handle duplicate-key as idempotent return.

---

### ISSUE-17 — Cron auth fails open if `CRON_SECRET` unset

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Cron / security |
| **File(s)** | `web/src/app/api/cron/reconcile-subscriptions/route.ts` (~23–25); `web/src/app/api/cron/retry-webhooks/route.ts` (~13–15) |

**What’s wrong:** `Bearer ${undefined}` → `Bearer undefined`. Anyone who sends that header can reconcile/downgrade/retry webhooks.

**Suggested fix:** Reject if `!process.env.CRON_SECRET`; use constant-time compare.

---

### ISSUE-18 — Direct-offer price not validated

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Jobs |
| **File(s)** | `web/src/app/api/jobs/direct-offer/route.ts` (~70–71) |

**What’s wrong:** `Number(price)` can be `NaN`/≤0; escrow/emails break.

**Suggested fix:** Same finite/positive checks as `jobs/route.ts` POST.

---

### ISSUE-19 — Concurrent subscription create can double-subscribe

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Billing |
| **File(s)** | `web/src/app/api/subscriptions/route.ts` (~56–65, ~112–141) |

**What’s wrong:** Non-atomic “existing active?” check → two `created`/`active` rows for one user.

**Suggested fix:** Partial unique index on `{ userId }` where status ∈ active set, or atomic claim.

---

### ISSUE-20 — Dispute resolve accepts any `status` string

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Disputes |
| **File(s)** | `web/src/app/api/disputes/route.ts` (~87–113) |

**What’s wrong:** Escrow moves only if `newStatus === "resolved"`. Admin can set `"RESOLVED"` / `"closed"` and leave escrow `disputed`.

**Suggested fix:** Allowlist (`open` | `resolved` | …) and require `resolutionType` when resolving.

---

### ISSUE-21 — Complete email uses wrong price field

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Jobs / email |
| **File(s)** | `web/src/app/api/jobs/[id]/complete/route.ts` (~78) |

**What’s wrong:** Uses `job.acceptedPrice ?? job.minimumPrice`; accept writes `finalPrice`. Summary email often wrong.

**Suggested fix:** Prefer `job.finalPrice`.

---

### ISSUE-22 — Post Job double-submit (wrong `loading` flag)

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend |
| **File(s)** | `web/src/app/post-job/page.tsx` (~356, ~420–435, ~866–871) |

**What’s wrong:** Button uses store `loading` (login/register only). `postJob` never sets it. No local `submitting`.

**Failure scenario:** Double-click creates two jobs and burns two quota slots.

**Suggested fix:** Local `submitting` state; disable button until `postJob` settles.

---

### ISSUE-23 — Inbox replaces all messages when opening a room

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend / chat |
| **File(s)** | `web/src/lib/store.tsx` (~401–418); `web/src/app/inbox/page.tsx` |

**What’s wrong:** Fetch for one room overwrites the global `chatMessages` array.

**Failure scenario:** After opening room A, sidebar last-message previews for rooms B/C go blank until those rooms are opened again.

**Suggested fix:** Merge by `roomId`: `setChatMessages(prev => [...prev.filter(m => m.roomId !== roomId), ...data])`.

---

### ISSUE-24 — Earnings “This Month” / chart are random fake numbers

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend / earnings |
| **File(s)** | `web/src/app/earnings/page.tsx` (~39–46, ~86–89) |

**What’s wrong:** Chart uses `Math.random()` from `totalEarned`; “This Month” shows last fake bar.

**Failure scenario:** Freelancer sees invented monthly income that changes when totals refresh — looks like a money bug.

**Suggested fix:** Aggregate real `releasedAt`/`createdAt` by month, or remove the chart until real series exist.

---

### ISSUE-25 — My Jobs marks non-open jobs as “Completed”

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend |
| **File(s)** | `web/src/app/my-jobs/page.tsx` (~165–171) |

**What’s wrong:** Badge is `isOpen ? "Live" : "Completed"` — `accepted`/`cancelled`/`expired` all show “Completed”.

**Suggested fix:** Map badge from `job.status` (`Accepted`, `Cancelled`, etc.).

---

### ISSUE-26 — Freelancer My Jobs omits jobs they only bid on

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend |
| **File(s)** | `web/src/app/my-jobs/page.tsx` (~30–38, ~78–79) |

**What’s wrong:** Copy says “accepted or bid on”; filter is only `clientId` or `acceptedBy`.

**Failure scenario:** Freelancer with open counters sees an empty list and thinks bids vanished.

**Suggested fix:** Include jobs where they have bids (and/or pending direct offers).

---

### ISSUE-27 — Feed role routing: non-clients get Freelancer UI

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend / roles |
| **File(s)** | `web/src/app/feed/page.tsx` (~23–24) |

**What’s wrong:** Only `client` → `ClientFeed`; else → `FreelancerFeed` (admins, dual-role edge cases).

**Failure scenario:** Admin lands on freelancer Mission Control; freelancer APIs 403; broken empty dashboards.

**Suggested fix:** Explicit branches for `freelancer` / `admin` (admin → `/admin`); default redirect when role unknown.

---

### ISSUE-28 — Job Accept / Counter lack in-flight guards

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Frontend |
| **File(s)** | `web/src/app/jobs/[id]/page.tsx` (~278–310, ~877–880) |

**What’s wrong:** No `accepting`/`bidding` disable; rapid clicks fire multiple PATCHes/POSTs.

**Failure scenario:** Double Accept races (second may 409); double counter can hit cooldown / quota oddly.

**Suggested fix:** Disable buttons while the promise is in flight.

---

### ISSUE-29 — `$` formatting vs INR payments

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Money / UX |
| **File(s)** | `web/src/lib/utils.ts` (~9–11 — `formatMoney` → `$`); `web/src/app/payments/page.tsx`; payment API default `INR` |

**What’s wrong:** Escrow/job UI shows USD-style `$`; Razorpay flow is INR.

**Failure scenario:** User pays ₹5000, lists show `$5,000.00` — trust/money confusion.

**Suggested fix:** Single currency helper driven by payment config / job currency.

---

## Low

### ISSUE-30 — Suspended users keep access until access JWT expires

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Area** | Auth |
| **File(s)** | `web/src/lib/auth.ts` `authenticateRequest` (~143–152); `web/src/app/api/auth/me/route.ts` |

**What’s wrong:** Suspend/delete enforced on login/refresh/switch-role, not on each request. Up to ~15m of API access.

**Suggested fix:** Check `suspended`/`deleted` in `authenticateRequest` (or short-lived denylist).

---

### ISSUE-31 — Feature pay-path uses caller as `clientId` (admin edge case)

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Area** | Featured jobs |
| **File(s)** | `web/src/app/api/jobs/feature/route.ts` (~94) |

**What’s wrong:** Payment claim uses `auth.payload.userId`. Admin featuring with paid fallback looks for admin’s tx, not job owner’s.

**Suggested fix:** Match `clientId: job.clientId` (or allow admin override explicitly).

---

### ISSUE-32 — Reconciliation writes local status `"halted"`

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Area** | Subscriptions / cron |
| **File(s)** | `web/src/app/api/cron/reconcile-subscriptions/route.ts` (~6–15, ~48–55) |

**What’s wrong:** Webhook path uses `"cancelled"` for halt; cron can set `"halted"`, outside the usual status set.

**Suggested fix:** Map Razorpay `halted` → local `"cancelled"` (and still downgrade).

---

### ISSUE-33 — Inbox send can double-fire

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Area** | Frontend / chat |
| **File(s)** | `web/src/app/inbox/page.tsx` (~60–69, ~243–250) |

**What’s wrong:** No disable while `sendMessage` runs; Enter / button can double-submit.

**Suggested fix:** `sending` flag; clear input optimistically or after success only once.

---

### ISSUE-34 — `markAllRead` ignores API failure

| Field | Detail |
|---|---|
| **Severity** | Low |
| **Area** | Frontend / notifications |
| **File(s)** | `web/src/lib/store.tsx` (~1190–1211 vs single-read ~1159–1184) |

**What’s wrong:** Optimistic all-read; failed PATCH is swallowed (unlike single-read revert).

**Failure scenario:** UI shows all read; reload brings unread back with no error.

**Suggested fix:** Revert or toast on non-OK response.

---

## Second-pass audit (2026-07-17) — ISSUE-35+

> Additional confirmed bugs **not** in the first 34. See [`planning.md`](./planning.md) §13+ for DB/CRUD solutions.

### High

### ISSUE-35 — Referral `referralCode` NoSQL injection

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Auth / referrals / security |
| **File(s)** | `web/src/app/api/auth/route.ts` (~63–65) |

**What’s wrong:** `referralCode` from JSON is passed into `findOne({ referralCode })` without string sanitization/coercion.

**Failure scenario:** `POST /api/auth` with `"referralCode": { "$ne": null }` matches an arbitrary referrer and attributes signup (+ later credit) to them.

**Suggested fix:** `sanitizeString(referralCode)`; query only with a primitive string; reject objects.

---

### ISSUE-36 — Dual-role register re-applies referral → double credit

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Referrals |
| **File(s)** | `web/src/app/api/auth/route.ts` (~62–85); `web/src/lib/referrals.ts` |

**What’s wrong:** Referral insert runs whenever `referralCode && result.user`, including dual-role “add role”. No guard for existing `referredBy` / prior `referrals` row.

**Failure scenario:** User credited once; registers other role with a code → new `signed_up` row → next job completion can credit again (or leave duplicate signed_up rows).

**Suggested fix:** Skip if `result.roleAdded` or user already has `referredBy`; unique index on `referrals.referredUserId`.

---

### ISSUE-37 — Assessment submit race inflates GeekScore

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Assessments |
| **File(s)** | `web/src/app/api/assessments/route.ts` (~88–127) |

**What’s wrong:** Cooldown is check-then-insert; `(userId, assessmentId)` is not uniquely enforced; passed path `$inc: { geekScore: 50 }` runs per insert.

**Failure scenario:** Two concurrent POSTs both pass cooldown → two results → +100 GeekScore and duplicate verified skill noise.

**Suggested fix:** Unique partial index + insert as atomic claim; only `$inc` geekScore if insert wins.

---

### ISSUE-38 — Google login always sends `role=` (can mutate existing users)

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | OAuth / dual-role |
| **File(s)** | `web/src/app/login/page.tsx` (~470); `googleLoginUser` applies role from OAuth state |

**What’s wrong:** “Continue with Google” always hits `/api/auth/google?role=${role}` (defaults to freelancer), even on the **login** tab. Existing users can get that role added or active role switched.

**Failure scenario:** Client-only user logs in via Google → silently gains freelancer (or is switched to it).

**Suggested fix:** Login tab: omit role (or `intent=login`); only signup tab passes role; backend must not add/switch role on pure login.

---

### ISSUE-39 — Team invitee cannot accept invite in UI

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Teams |
| **File(s)** | `web/src/app/team/page.tsx` (~36–47, ~86–110); accept exists in `api/teams` |

**What’s wrong:** Invitees are not yet `ownerId`/`memberIds`, so `GET /api/teams` returns null → UI shows “Create a Team”. No accept-invite UI.

**Failure scenario:** Owner invites colleague → invitee cannot join. Feature dead for invitees.

**Suggested fix:** `GET` return pending invite for caller email; FE Accept button → `PATCH/POST action: "accept"`.

---

### ISSUE-40 — Over-limit team: no remove-member UI or API

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Teams |
| **File(s)** | `web/src/app/team/page.tsx` (~125–136, ~169–184); `api/teams/route.ts` |

**What’s wrong:** Over-limit copy tells owner to remove members; no remove control; API has no remove/kick action.

**Failure scenario:** Seat deadline / `over_limit` → owner cannot shrink team; cron may wipe members (see ISSUE-7).

**Suggested fix:** Add `action: "remove_member"` (owner-only) updating `teams.memberIds` + clearing `users.teamId`; wire FE buttons.

---

### ISSUE-41 — Session restore race redirects to `/login`

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Auth / store |
| **File(s)** | `web/src/lib/store.tsx` (~699–732); pages with `mounted && !currentUser → /login` |

**What’s wrong:** On mount with expired access JWT, `mounted=true` while `currentUser` is still null during `silentRefresh()`.

**Failure scenario:** Returning user with valid refresh cookie is bounced to `/login` before refresh finishes.

**Suggested fix:** Gate redirects on `authReady` / `!refreshing`; don’t set `mounted` until silent refresh settles.

---

### ISSUE-42 — Featured Boost charges ₹10 labeled as $10

| Field | Detail |
|---|---|
| **Severity** | High |
| **Area** | Monetization |
| **File(s)** | `web/src/components/modals/FeaturedBoostModal.tsx` (~77–85, ~104–107, ~136–137, ~176) |

**What’s wrong:** Sends `amount: FEATURED_BOOST_PRICE_USD` (10) with `currency: config?.currency || "INR"` while UI says **$10**. Distinct from display-only ISSUE-29; compounds ISSUE-2.

**Failure scenario:** Client pays **₹10** for a boost marketed as $10.

**Suggested fix:** Single source: INR paise amount = convert USD→INR at order time, or reprice boost in INR; UI must match `currency` + amount; server enforces same (ISSUE-2).

---

### Medium

### ISSUE-43 — Teams GET leaks member emails

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | PII / teams |
| **File(s)** | `web/src/app/api/teams/route.ts` (~28–45) |

**What’s wrong:** `.project({ password: 0 })` still returns `email`, `googleId`, etc. in `members`.

**Suggested fix:** Project only public fields (`fullName`, `avatarUrl`, `geekScore`, `role`, `_id`).

---

### ISSUE-44 — Public profile leaks `googleId`

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | PII |
| **File(s)** | `web/src/app/api/users/[id]/route.ts` (~28–36) |

**What’s wrong:** Strips `password` / `email` / `refreshToken` but not `googleId`.

**Suggested fix:** Also omit `googleId`, `referredBy`, billing fields, etc.

---

### ISSUE-45 — Client dashboards load entire `users` collection

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Performance / security |
| **File(s)** | `api/client/activity-feed/route.ts` (~22); `api/client/job-health/route.ts` (~18) |

**What’s wrong:** `users.find({}).toArray()` with no projection — pulls all users (incl. password hashes) into memory.

**Suggested fix:** `find({ _id: { $in: bidderIds } }, { projection: { fullName: 1, geekScore: 1 } })`.

---

### ISSUE-46 — Team accept ignores seat cap / races

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Teams |
| **File(s)** | `web/src/app/api/teams/route.ts` (~162–188; invite check ~132–141 only) |

**What’s wrong:** Accept only checks pending invite; no seat re-check; `$push` is not CAS on capacity.

**Failure scenario:** Concurrent accepts (or accept after downgrade) exceed `teamSeats`.

**Suggested fix:** Atomic update with seat predicate (`memberIds` length &lt; allowed); reject when full.

---

### ISSUE-47 — Chat messages: no size / rate limits

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Chat |
| **File(s)** | `web/src/app/api/chat/messages/route.ts` (~75–106) |

**What’s wrong:** Auth + membership only; `text.trim()` with no max length / `checkRateLimit`.

**Suggested fix:** Cap length (e.g. 5k); rate-limit per user/room.

---

### ISSUE-48 — Freelancer dashboard metrics wrong

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Dashboard |
| **File(s)** | `web/src/app/api/freelancer/dashboard/route.ts` (~16–47) |

**What’s wrong:** Win rate only joins bids to `status: "open"` jobs; `bidsUsed` falls back to **all-time** `myBids.length` when planLimits missing.

**Suggested fix:** Count wins via `acceptedBy` / completed jobs; never use lifetime bid count for monthly quota.

---

### ISSUE-49 — Assessment `timeLimit` not enforced server-side

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Assessments |
| **File(s)** | `web/src/app/api/assessments/route.ts` (~75–114) |

**What’s wrong:** Client sends `startedAt`; server never compares elapsed time to `assessment.timeLimit`.

**Suggested fix:** Reject if elapsed &gt; timeLimit + grace; prefer server-issued attempt token / `assessment_attempts.startedAt`.

---

### ISSUE-50 — Unsigned Cloudinary upload path (signed API unused)

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Uploads |
| **File(s)** | `AvatarUploader.tsx`; `api/upload/sign/route.ts` (unused) |

**What’s wrong:** UI uses unsigned public preset; anyone can upload to the cloud account without GeekBid auth.

**Suggested fix:** Use signed uploads from `/api/upload/sign`; lock/disable unsigned preset.

---

### ISSUE-51 — InviteToBidModal: raw token + can invite on direct_offer

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Invites / FE |
| **File(s)** | `web/src/components/feed/InviteToBidModal.tsx` (~26–30, ~39–47) |

**What’s wrong:** Uses `auth.accessToken`; filter uses `pricingMode !== "direct"` but direct offers use `type: "direct_offer"`.

**Suggested fix:** `getValidToken()`; exclude `type === "direct_offer"`; API should also reject invite on direct_offer jobs.

---

### ISSUE-52 — Razorpay script “already in DOM” race → mock verify

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Payments FE |
| **File(s)** | `FeaturedBoostModal.tsx` (~35–47, ~96–116); `useSubscriptionCheckout.ts` |

**What’s wrong:** If `#razorpay-script` exists but `window.Razorpay` isn’t ready, `scriptLoaded` never becomes true → boost modal takes **mock verify** for a **real** order.

**Suggested fix:** Poll/`onload` until `window.Razorpay`; never mock-verify non-mock orders.

---

### ISSUE-53 — Subscription status `created` treated as live → wrong change_plan

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Billing FE |
| **File(s)** | `web/src/lib/useSubscriptionCheckout.ts` (~53–54, ~88–99) |

**What’s wrong:** Status `created` is treated as an existing subscription → `change_plan` instead of completing checkout.

**Failure scenario:** User starts sub, dismisses Razorpay → retry “Upgrade” runs plan-change, not payment.

**Suggested fix:** Treat `created` as incomplete checkout; resume with `subscription_id` checkout, not change_plan.

---

### ISSUE-54 — Admin pages + `fetchJobs` use raw `accessToken`

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Auth FE |
| **File(s)** | `admin/*.tsx`, `AdminKeyGate.tsx`, `store.tsx` `fetchJobs` (~310–325) |

**What’s wrong:** Same class as ISSUE-13 — new surfaces without `getValidToken()`.

**Suggested fix:** Use `getValidToken()` everywhere.

---

### ISSUE-55 — Assessment auto-submit can re-fire after failed submit at t=0

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | Assessments FE |
| **File(s)** | `web/src/app/assessments/page.tsx` (~71–88, ~96–98) |

**What’s wrong:** Effect omits `submitting`/`quizResult` deps; on failed submit with `timeLeft === 0`, changing answers recreates `submitQuiz` and re-fires.

**Suggested fix:** Include deps; set `submittedAttempt` latch; ignore further auto-submits.

---

### ISSUE-56 — `/post-job` has no client-role gate

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | FE gating |
| **File(s)** | `web/src/app/post-job/page.tsx` (~374–376) |

**What’s wrong:** Freelancers can open the wizard; API rejects only on submit.

**Suggested fix:** Redirect non-clients early.

---

### ISSUE-57 — Mobile Inbox badge uses notification unread

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **Area** | FE / nav |
| **File(s)** | `web/src/components/mobile-bottom-nav.tsx` (~18, ~55–58) |

**What’s wrong:** Inbox badge uses global notification `unreadCount`, not chat unread.

**Suggested fix:** Separate chat unread count from notifications (API or client derive from rooms).

---

### Known product gaps (README — still open)

### ISSUE-58 — Forgot Password is a dead stub

| Field | Detail |
|---|---|
| **Severity** | Medium (product gap) |
| **Area** | Auth |
| **File(s)** | `login/page.tsx`; no reset API |

**What’s wrong:** Button has no handler/route. Flagged in README, never built.

**Suggested fix:** `password_reset_tokens` collection + `POST /api/auth/forgot` + `POST /api/auth/reset` + email link flow.

---

### ISSUE-59 — Delete Account Confirm does nothing

| Field | Detail |
|---|---|
| **Severity** | Medium (product gap) |
| **Area** | Settings / profile |
| **File(s)** | `profile/page.tsx` (~521–530); no delete API |

**What’s wrong:** Confirm Delete has no `onClick`; no soft-delete account API for self-serve.

**Suggested fix:** `DELETE /api/user` or `PATCH` set `deleted: true`, revoke refresh tokens, clear session; wire Confirm button.

---

### ISSUE-60 — No user-facing dispute creation API/UI

| Field | Detail |
|---|---|
| **Severity** | Medium (product gap) |
| **Area** | Disputes |
| **File(s)** | Admin can resolve; no create route for parties |

**What’s wrong:** Clients/freelancers cannot open a dispute; only admin resolution path exists.

**Suggested fix:** `POST /api/disputes` (party must be job client or accepted freelancer; job accepted/completed; one open dispute per job).

---

### ISSUE-61 — “Split” dispute resolution incomplete

| Field | Detail |
|---|---|
| **Severity** | Medium (product gap) |
| **Area** | Disputes / escrow |
| **File(s)** | `api/disputes` resolution types |

**What’s wrong:** Refund Client / Pay Freelancer exist; Split is missing or non-functional (README).

**Suggested fix:** `resolutionType: "split"` + amounts; update `transactions` (partial release/refund) atomically.

---

## Notes

- No `dangerouslySetInnerHTML` XSS surface found under `web/src`.
- CodeRabbit CLI review was **not** run: this workspace (`Geekbid-19`) has no `.git` directory (`--dir` requires a git repo).
- Second-pass also found OAuth CSRF, refresh rotation, transactions authz, API keys, seed prod gate looking **clean**.

---

## Suggested fix order

1. ISSUE-1 — Block mock subscriptions in production / missing plan IDs  
2. ISSUE-2 + **42** — Enforce boost payment amount **and** correct currency  
3. ISSUE-3 — Atomic cancel  
4. ISSUE-35 — Sanitize referralCode (NoSQL)  
5. ISSUE-37 — Assessment unique claim / GeekScore race  
6. ISSUE-4 — Wire Direct Offer Accept/Decline UI  
7. ISSUE-5 — Refund bid quota on cooldown failure  
8. ISSUE-7 + **39–40, 46** — Teams ObjectId + accept UI + remove member + seat CAS  
9. ISSUE-6 — Unify escrow funding vs accept ledger  
10. ISSUE-36, 38, 41 — Referral double-credit, Google login role, session restore  
11. Remaining High → Medium → Low / product gaps (58–61)

---

## Summary counts

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 17 |
| Medium | 31 |
| Low | 5 |
| **Total** | **61** |

*(ISSUE-1–34 first pass; ISSUE-35–61 second pass + README gaps.)*
