# GeekBid — Full CRUD Audit & Test Case Plan (Phase-Wise)

**Purpose:** a phase-wise, execute-in-order test plan covering **every Create/Read/Update/Delete
operation** in the app, across all three logins (**Client**, **Freelancer**, **Admin**), derived
directly from reading every route handler in `web/src/app/api/**/route.ts` (76 route files, 26
distinct resources) plus every page that calls them. Every test case ends in a blank `☐` for a
tester to mark Pass/Fail. Rows marked **[KNOWN GAP]** are confirmed-by-code absences of a CRUD
operation (not bugs to "fix" during testing — just don't expect them to work). Rows marked
**[NEGATIVE]** are security/validation boundary tests (should fail/reject, not succeed).

**Total: 24 phases, 340+ test cases.**

**Companion document:** `CRUD_INTERACTION_TEST_PLAN.md` (repo root) covers UI-interaction/button-level
testing with live-session bug history. This document is the CRUD-operation-level audit — organized by
data entity and HTTP verb, not by page.

---

## Phase 0 — Test Environment & Seed Accounts

Seed via `POST /api/seed` (admin-only, idempotent) before starting. Seeded credentials (all
password `password123` except admin):

| Role | Email | Notes |
|---|---|---|
| Client | `maya@startup.io` | primary client test account |
| Client | `derek@fintech.co` | secondary client (for cross-account IDOR tests) |
| Client | `sarah@edtech.dev` | tertiary client |
| Freelancer | `priya@secmail.io` | primary freelancer test account |
| Freelancer | `arjun@devmail.io` | secondary freelancer |
| Freelancer | `leo@web3mail.io` | tertiary freelancer |
| Freelancer | `mira@dataeng.io` | quaternary |
| Freelancer | `jake@mobiledev.co` | quinary |
| Admin | `admin@geekbid.io` | password `admin123` |

| ID | Task | Expected Result | ☐ |
|---|---|---|---|
| P0-01 | Confirm MongoDB Atlas connection reachable (`MONGODB_URI`) | App boots, `/api/auth/me` doesn't 500 | ☐ |
| P0-02 | Run `POST /api/seed` as admin | 8 users + sample jobs/bids/transactions created, idempotent on re-run | ☐ |
| P0-03 | Obtain a fresh access token per role (login each seeded account) | 3 valid Bearer tokens (client/freelancer/admin) for use in all phases below | ☐ |
| P0-04 | Confirm `RAZORPAY_KEY_ID` present/absent | Determines whether Phase 9/15 run in **mock mode** or **real Razorpay Test Mode** — note which for every payment test below | ☐ |

---

## Phase 1 — Authentication & Session Lifecycle

Entity: session/token (not a DB-visible CRUD entity, but the foundational Create/Read/Delete cycle
every other phase depends on). Route: `api/auth*`.

| ID | CRUD | Role | Test Case | Steps | Expected Result | ☐ |
|---|---|---|---|---|---|---|
| P1-01 | Create | Guest | Register as client | `POST /api/auth {action:register, name, email, password≥6, role:client}` | 201, user created, `roles:["client"]` | ☐ |
| P1-02 | Create | Guest | Register as freelancer | Same, `role:freelancer` | 201, `roles:["freelancer"]` | ☐ |
| P1-03 | Create | Guest | Register with password < 6 chars | `password:"abc"` | 400 rejected | ☐ |
| P1-04 | Create | Guest | Register with duplicate email, no password on existing (Google-only) account | Register email that already has `password:null` | Should attempt password-role add — verify exact behavior (link vs 409) | ☐ |
| P1-05 | Create | Guest | Register with `referralCode` of an existing user | New user linked as referral | Referrer's `GET /api/referrals` shows `totalInvites+1` | ☐ |
| P1-06 [NEGATIVE] | Create | Guest | Register 11 times from same IP within 15 min | 11th attempt | 429 rate-limited (limit is 10/15min/IP) | ☐ |
| P1-07 | Read | Guest→Client | Login with valid client credentials | `POST /api/auth {action:login}` | 200, access+refresh tokens issued | ☐ |
| P1-08 [NEGATIVE] | Read | Guest | Login with wrong password | — | 401, generic "Invalid email or password" (no user-exists leak) | ☐ |
| P1-09 [NEGATIVE] | Read | Guest | Login as a `suspended:true` user | Admin suspends a test account first (Phase 18), then attempt login | 403/401 blocked | ☐ |
| P1-10 [NEGATIVE] | Read | Guest | Login as a `deleted:true` user | Admin soft-deletes a test account first, then attempt login | Blocked, generic error (no "account deleted" leak) | ☐ |
| P1-11 [NEGATIVE] | Read | Any | Login as non-admin while `maintenanceMode:true` | Admin toggles maintenance on (Phase 22) first | Non-admin login blocked; admin login still succeeds | ☐ |
| P1-12 | Read | Any | `GET /api/auth/me` with valid access token | — | 200, full profile minus password | ☐ |
| P1-13 [NEGATIVE] | Read | Any | `GET /api/auth/me` with no/garbage token | — | 401 | ☐ |
| P1-14 [NEGATIVE] | Read | Any | `GET /api/auth/me` with an expired (>15min old) access token | Wait or use a stale token | 401 "expired or invalid" | ☐ |
| P1-15 | Update | Any | `POST /api/auth/refresh` with valid refresh cookie | — | 200, new token pair issued, old refresh token rotated | ☐ |
| P1-16 [NEGATIVE] | Update | Any | Replay an already-rotated (used-once) refresh token | Use refresh token a 2nd time after it was already rotated | Reuse detected → **all** tokens for that user revoked | ☐ |
| P1-17 [NEGATIVE] | Update | Any | Refresh 21 times within 15 min from same IP | 21st attempt | 429 (limit 20/15min/IP) | ☐ |
| P1-18 | Update | Client/Freelancer | Switch role on a dual-role account | `POST /api/auth/switch-role {role}` where caller already holds that role | 200, new token pair with switched role | ☐ |
| P1-19 [NEGATIVE] | Update | Client | Switch to a role not in `roles[]` (e.g. client→admin) | — | 403 rejected | ☐ |
| P1-20 | Delete | Any | `POST /api/auth/logout` | — | All refresh tokens for user revoked, cookie cleared, `{ok:true}` | ☐ |
| P1-21 | Delete | Any | Logout with an already-invalid session | — | Still returns `{ok:true}` (no error leak) | ☐ |
| P1-22 | Create | Guest | Google OAuth sign-in (new email) | Full OAuth round trip | New user auto-created, `isVerified:true`, `authProvider:"google"` | ☐ |
| P1-23 | Update | Existing user | Google OAuth sign-in matching an existing password-based email | — | `googleId` linked to existing account, no duplicate user | ☐ |
| P1-24 [NEGATIVE] | Read | Guest | Reuse an OAuth exchange code twice, or after 60s | 2nd exchange attempt | Rejected (one-time, 60s TTL) | ☐ |
| P1-25 [NEGATIVE] | Read | Guest | Tamper with the OAuth `state` param / CSRF nonce cookie mismatch | — | Callback rejects | ☐ |

---

## Phase 2 — User Profile CRUD (self-service)

Route: `api/user`, `api/user/plan`, `api/user/verify-github`, `api/users*`, `api/upload/*`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P2-01 | Read | Any | `GET /api/user` (via `/profile` page) | Own profile, password stripped | ☐ |
| P2-02 | Update | Any | `PATCH /api/user` with all allowed fields (`fullName, bio, skills, company, availability, hourlyRateMin/Max, avatarUrl/PublicId, githubUsername`) | 200, all fields persisted — verify via reload, not just optimistic UI | ☐ |
| P2-03 [NEGATIVE] | Update | Any | `PATCH /api/user` attempting to set `role`, `email`, `geekScore`, `plan` (not on allowlist) | Field silently ignored, not persisted | ☐ |
| P2-04 [KNOWN GAP] | Update | Any | Submit `hourlyRateMin > hourlyRateMax` or negative rate | **No server-side validation exists** — will silently save invalid range; confirm this reproduces (not a fix target unless asked) | ☐ |
| P2-05 | Update | Any | Change `githubUsername` after already being `githubVerified:true` | `githubVerified` resets to `false`, `githubData:null` | ☐ |
| P2-06 | Create/Update | Any | `POST /api/user/verify-github {step:"start", githubUsername}` | One-time code `geekbid-verify-<hex>` issued; place in GH bio | ☐ |
| P2-07 | Update | Any | `POST /api/user/verify-github {step:"confirm"}` after adding code to real GH bio | `githubVerified:true`, `githubData` populated | ☐ |
| P2-08 [NEGATIVE] | Update | Any | Confirm step without code actually in bio | Rejected, stays unverified | ☐ |
| P2-09 [NEGATIVE] | Update | Any | Verify a GitHub username that doesn't exist | 404 | ☐ |
| P2-10 | Read | Any | `GET /api/user/plan` | Plan config + usage counters (jobsPostedThisMonth, bidsPlacedThisMonth, aiUsesThisMonth, etc.) | ☐ |
| P2-11 | Read | Any | `GET /api/users` (Team page / talent pool) | List excludes `deleted`; non-admin also excludes `suspended`, and response strips `password/googleId/email` | ☐ |
| P2-12 | Read | Admin | `GET /api/users` as admin | Same list but only `password` stripped (email/googleId visible to admin) | ☐ |
| P2-13 | Read | Guest | `GET /api/users/[id]` unauthenticated (public profile page) | 200, works with no auth; strips `password/refreshToken/email` | ☐ |
| P2-14 [NEGATIVE] | Read | Guest | `GET /api/users/[id]` for a deleted or suspended user's id | 404 (indistinguishable from "id doesn't exist" — no enumeration leak) | ☐ |
| P2-15 [KNOWN GAP] | Delete | Any | Attempt to delete own account (Settings page "Confirm Delete") | **No `DELETE /api/user` endpoint exists at all** — confirm UI stub does nothing / errors, this is a feature gap not a quick bug | ☐ |
| P2-16 | Create | Any | `POST /api/upload/sign {folder:"geekbid/avatars"}` | Signed Cloudinary payload with format allowlist baked in | ☐ |
| P2-17 [NEGATIVE] | Create | Any | `POST /api/upload/sign {folder:"arbitrary/path"}` | 400, folder not on allowlist | ☐ |
| P2-18 | Delete | Any | `DELETE /api/upload/delete {publicId}` for own current avatar | 200, avatar cleared from Cloudinary + `avatarUrl/avatarPublicId` cleared on user | ☐ |
| P2-19 [NEGATIVE] | Delete | Any | `DELETE /api/upload/delete {publicId}` for a publicId that isn't the caller's current avatar (e.g. someone else's, or an old stale one) | 403 Unauthorized | ☐ |

---

## Phase 3 — Client: Job Posting CRUD

Route: `api/jobs`, `api/jobs/[id]`, `api/jobs/[id]/cancel`, `api/jobs/[id]/complete`, `api/jobs/direct-offer`, `api/jobs/pricing-hint`. Page: `post-job`, `my-jobs`, `jobs/[id]`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P3-01 | Create | Client | Post job with all fields via wizard (`title, description, skillsRequired[], startingPrice, minimumPrice, decayRatePerHour, estimatedHours, deadlineAt, category, visibility, pricingMode`) | 201, `status:"open", bidCount:0, featured:false`, monthly job-post quota decremented | ☐ |
| P3-02 [NEGATIVE] | Create | Client | Post job with only `title`, omit all price fields | **[KNOWN GAP]** No validation — `startingPrice`/`minimumPrice`/`decayRatePerHour`/`estimatedHours` become `NaN` and are stored as-is (confirm reproduces; flag if you want it fixed) | ☐ |
| P3-03 [NEGATIVE] | Create | Freelancer | Attempt `POST /api/jobs` as freelancer | 403 client-only | ☐ |
| P3-04 [NEGATIVE] | Create | Client | Post job with invalid `category` value | Falls back to `"other"`, not rejected | ☐ |
| P3-05 [NEGATIVE] | Create | Client | Post job after exceeding monthly plan job-post quota | 403, quota-exceeded message | ☐ |
| P3-06 | Create | Client | Post job with `visibility:"invite_only"` | Job created hidden from public feed, only visible to client, invited freelancers, admin | ☐ |
| P3-07 | Read | Guest/Any | `GET /api/jobs` feed | `invite_only` jobs excluded unless caller is owner/invited/admin; sorted `featured desc, postedAt desc` | ☐ |
| P3-08 | Read | Any | `GET /api/jobs?category=web_dev` filter | Only matching-category jobs returned | ☐ |
| P3-09 | Read | Any | `GET /api/jobs/[id]` by valid ObjectId | Full job doc | ☐ |
| P3-10 | Update | Client (owner) | Cancel own open job — `PATCH /api/jobs/[id] {action:"cancel"}` | `status:"open"→"cancelled"`, bidders notified | ☐ |
| P3-11 [NEGATIVE] | Update | Client (non-owner) | Attempt to cancel another client's job | 403 | ☐ |
| P3-12 [NEGATIVE] | Update | Client (owner) | Cancel a job that's already `accepted`/`completed` | Rejected — only valid from `"open"` | ☐ |
| P3-13 | Update | Client (owner) | Complete an `accepted` job — `PATCH /api/jobs/[id]/complete` | `status→"completed"`, escrow tx released, referral credited, emails sent to both parties | ☐ |
| P3-14 [NEGATIVE] | Update | Freelancer | Attempt to complete a job (even one assigned to them) | 403 client/admin only | ☐ |
| P3-15 | Update | Admin | Complete/cancel any job on behalf of client via same endpoints | Succeeds, admin bypasses ownership check | ☐ |
| P3-16 [KNOWN GAP] | Update | Client | Attempt to edit an already-posted job's title/description/price ("Edit Job" link) | **No edit-mode exists** — links to a blank creation form; confirm this UX gap, don't expect field-level PATCH from the client UI | ☐ |
| P3-17 [NEGATIVE — race] | Update | Client | Fire two concurrent `cancel` requests via `api/jobs/[id]/cancel` (the dedicated route, not the action-based one) | **[KNOWN GAP]** This route uses plain `updateOne`, no CAS guard — small TOCTOU window vs. the action-based cancel which IS CAS-guarded | ☐ |
| P3-18 | Create | Client | Direct-offer a specific freelancer — `POST /api/jobs/direct-offer` | Job created `visibility:"invite_only", type:"direct_offer", offerStatus:"pending"`, decay disabled | ☐ |
| P3-19 [NEGATIVE] | Create | Client | Direct-offer a freelancer with `geekScore < 500` | 403 rejected | ☐ |
| P3-20 [NEGATIVE] | Create | Client | Direct-offer targeting a client (not freelancer) id | 400/403 rejected | ☐ |
| P3-21 | Read | Any | `GET /api/jobs/pricing-hint?skills=web_dev,api` | Aggregated historical accepted-price data for matching skills | ☐ |
| P3-22 | Read | Client | View own `my-jobs` list, confirm counts (open/accepted/completed/cancelled) match DB | Matches | ☐ |

---

## Phase 4 — Freelancer: Bid & Job-Acceptance CRUD

Route: `api/bids`, `api/bids/my`, `api/jobs/[id]` (action=accept/accept_best), `api/jobs/offer-response`, `api/jobs/recommended`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P4-01 | Create | Freelancer | Place a bid within `[minimumPrice, currentPrice]` on an open job | 201, bid recorded, job's `bidCount++/uniqueBidderCount/lowestCounterBid/priceHistory` updated (history capped at 50) | ☐ |
| P4-02 [NEGATIVE] | Create | Freelancer | Bid below `minimumPrice` or above server-computed `currentPrice` | 400 rejected | ☐ |
| P4-03 [NEGATIVE] | Create | Freelancer | Bid on a job that's no longer `"open"` | 400/409 rejected | ☐ |
| P4-04 [NEGATIVE] | Create | Freelancer | Bid on a `type:"direct_offer"` job (must go through offer-response instead) | Rejected | ☐ |
| P4-05 [NEGATIVE] | Create | Freelancer | Place a 2nd bid on the same job within 30 minutes of the 1st | 429 cooldown | ☐ |
| P4-06 | Create | Freelancer | Place a 2nd bid on the same job after 30+ minutes | Succeeds | ☐ |
| P4-07 [NEGATIVE] | Create | Client | Attempt `POST /api/bids` as a client | 403 freelancer-only | ☐ |
| P4-08 [NEGATIVE] | Create | Freelancer | Exceed monthly bid quota for plan tier | 403 quota | ☐ |
| P4-09 | Read | Freelancer | `GET /api/bids/my` | Own bids with joined job details | ☐ |
| P4-10 | Read | Client | `GET /api/bids?jobId=X` on own job | All bids on that job visible | ☐ |
| P4-11 [NEGATIVE] | Read | Freelancer | `GET /api/bids?jobId=X` for a job that isn't theirs and they haven't bid on | Own bids/own-job bids only — confirm cross-tenant bid list isn't leaked | ☐ |
| P4-12 | Update | Freelancer | Accept an open job directly (bid-type "accept") — `PATCH /api/jobs/[id]` default action | Server computes `finalPrice` itself (never trusts client-sent price); escrow tx + chat room + notifications created | ☐ |
| P4-13 [NEGATIVE — race] | Update | Freelancer | Two freelancers accept the same job simultaneously | Only one succeeds; loser gets 409 "already accepted by another request"; quota rolled back for loser | ☐ |
| P4-14 | Update | Client (owner) | `accept_best` on an open job with multiple bids | Awards to the **lowest bidder** regardless of which row was clicked in UI — verify UI's "Accept" button on a non-lowest bid still results in lowest-bid winner (documented prior finding — confirm still true) | ☐ |
| P4-15 | Update | Freelancer | Respond to a direct offer — `PATCH /api/jobs/offer-response {response:"accepted"}` | Only the offered freelancer can respond; `status→"accepted"`, escrow+chat+notifications created | ☐ |
| P4-16 [NEGATIVE] | Update | Freelancer (not the offeree) | Attempt to respond to someone else's direct offer | 403 | ☐ |
| P4-17 | Update | Freelancer | Decline a direct offer | `offerStatus→"declined"`, job `status→"cancelled"`, client notified | ☐ |
| P4-18 [NEGATIVE] | Update | Freelancer | Respond to an offer twice (already accepted/declined) | 409, CAS-guarded | ☐ |
| P4-19 | Read | Freelancer | `GET /api/jobs/recommended` | Top 10 jobs ranked by skill overlap with own `skills[]` | ☐ |
| P4-20 | Read | Freelancer (no skills set) | Same, with empty `skills[]` | Empty array, not an error | ☐ |

---

## Phase 5 — Invite-to-Bid CRUD

Route: `api/invites`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P5-01 | Create | Client (job owner) | Invite a specific freelancer to bid on own open job | 201, notification sent to freelancer, monthly invite quota decremented | ☐ |
| P5-02 [NEGATIVE] | Create | Client (non-owner) | Invite a freelancer to bid on another client's job | 403 | ☐ |
| P5-03 [NEGATIVE] | Create | Client | Duplicate-invite same freelancer to same job twice | 409 (checked both pre-check and unique-index race guard) | ☐ |
| P5-04 [NEGATIVE] | Create | Client | Invite to a job that's no longer `"open"` | Rejected | ☐ |
| P5-05 [NEGATIVE] | Create | Client | Exceed monthly invite quota | 403 | ☐ |
| P5-06 | Read | Client | `GET /api/invites` — sees own sent invites | Correct list, `jobTitle` populated | ☐ |
| P5-07 | Read | Freelancer | `GET /api/invites` — sees own received invites | Correct list | ☐ |
| P5-08 | Update | Freelancer (invitee) | Accept an invite — `PATCH /api/invites {response:"accepted"}` | `status→"accepted"`, client notified | ☐ |
| P5-09 | Update | Freelancer (invitee) | Decline an invite | `status→"declined"` | ☐ |
| P5-10 [NEGATIVE] | Update | Freelancer (not invitee) | Respond to someone else's invite | 403 | ☐ |
| P5-11 [NEGATIVE] | Update | Freelancer | Respond to an already-responded invite (race) | 409 CAS | ☐ |

---

## Phase 6 — Featured / Boost CRUD

Route: `api/jobs/feature`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P6-01 | Update | Client (owner) | Feature own job using remaining monthly quota | `featured:true`, quota decremented, no payment needed | ☐ |
| P6-02 | Update | Client (owner) | Feature own job **after** quota exhausted, with a valid unconsumed boost-payment transaction | Succeeds, transaction's `consumedAt` set (claimed atomically) | ☐ |
| P6-03 [NEGATIVE] | Update | Client (owner) | Attempt to reuse the same payment transaction to feature a 2nd job | Rejected — already consumed | ☐ |
| P6-04 [NEGATIVE] | Update | Client (owner) | Feature job with quota exhausted and no valid payment | 403 | ☐ |
| P6-05 | Update | Client (owner) | Un-feature (`featured:false`) | Free, no quota check | ☐ |
| P6-06 | Update | Admin | Feature/un-feature any job regardless of ownership | Succeeds | ☐ |
| P6-07 [NEGATIVE] | Update | Client (non-owner) | Feature another client's job | 403 | ☐ |

---

## Phase 7 — Chat (Rooms & Messages) CRUD

Route: `api/chat/rooms`, `api/chat/messages`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P7-01 | Create | Client (job owner) | Open a chat room with any freelancer via Talent Pool "Message" (no prior bid/association required) | 201, room created — this is the intentional exemption for proactive outreach | ☐ |
| P7-02 | Create | Client/Freelancer | Open room with a freelancer already associated with the job (bid placed / accepted) | Succeeds | ☐ |
| P7-03 [NEGATIVE] | Create | Client | Open room naming a 3rd-party freelancer who has no association AND isn't opened via the exempted Talent-Pool path (e.g. directly crafted request for a random job) | 403 | ☐ |
| P7-04 [NEGATIVE] | Create | Any | Create room with `participantIds` not exactly 2, or caller not one of them | 400/403 | ☐ |
| P7-05 | Create | Any | Re-request room creation for same `jobId`+participants pair | Returns the **existing** room (idempotent), not a duplicate | ☐ |
| P7-06 | Read | Participant | `GET /api/chat/rooms` | Only rooms where caller is in `participantIds` | ☐ |
| P7-07 | Create | Participant | `POST /api/chat/messages {roomId, text}` | 201, message stored, room's `updatedAt` bumped | ☐ |
| P7-08 [NEGATIVE] | Create | Participant | Send empty/whitespace-only `text` | 400 rejected | ☐ |
| P7-09 [NEGATIVE] | Create | Non-participant | Attempt to post a message into a room the caller isn't part of | 404 (indistinguishable from not-found) | ☐ |
| P7-10 | Read | Participant | `GET /api/chat/messages?roomId=X` | Full message history | ☐ |
| P7-11 [NEGATIVE] | Read | Non-participant | Same, for a room they're not in | 404 | ☐ |
| P7-12 [KNOWN GAP] | Update/Delete | Any | Attempt to edit or delete a sent message | No such endpoint exists — messages are immutable by design | ☐ |

---

## Phase 8 — Notifications CRUD

Route: `api/notifications`, `api/notifications/count`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P8-01 | Read | Any | `GET /api/notifications` | Own notifications only (admin sees all) | ☐ |
| P8-02 | Read | Any | `GET /api/notifications/count` | Correct unread count | ☐ |
| P8-03 | Create | Any | `POST /api/notifications {type, title, body}` | Creates a notification **for the caller's own userId only** — confirm it cannot target another user's id even if passed | ☐ |
| P8-04 [NEGATIVE] | Create | Any | Fire 21 `POST /api/notifications` within 1 minute | 429 (rate-limited 20/min/user, anti-self-spam) | ☐ |
| P8-05 | Update | Any | `PATCH /api/notifications {notificationId}` marks one read | Scoped to own userId; 400 if invalid ObjectId | ☐ |
| P8-06 | Update | Any | `PATCH /api/notifications {markAll:true}` | All own unread → read | ☐ |
| P8-07 [NEGATIVE] | Update | User A | Attempt to mark User B's notification read by guessing its id | No-op / not found (scoped query, can't touch other users' rows) | ☐ |
| P8-08 | Read | Freelancer/Client | Click a notification carrying a `jobId` in the UI | Navigates to `/jobs/{jobId}` and marks read (prior-session fix — confirm still works) | ☐ |
| P8-09 [KNOWN GAP] | Delete | Any | Attempt to delete a notification | No DELETE endpoint exists | ☐ |

---

## Phase 9 — Payments & Escrow Transactions CRUD

Route: `api/payments`, `api/transactions`, `api/webhooks/razorpay`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P9-01 | Read | Any | `GET /api/payments` | Returns Razorpay public key + `mock:true/false` flag | ☐ |
| P9-02 | Create | Any | `POST /api/payments {amount>0}` | Order created (real Razorpay order, or `order_mock_<ts>` if key unset) | ☐ |
| P9-03 [NEGATIVE] | Create | Any | `POST /api/payments {amount:0}` or negative | 400 rejected | ☐ |
| P9-04 | Update | Any | `PATCH /api/payments` verify a **real** captured payment with valid signature | Signature HMAC-verified via `timingSafeEqual`; amount recomputed server-side from Razorpay's own API response (never trusts client `amount`); transaction created | ☐ |
| P9-05 [NEGATIVE] | Update | Any | Verify with a tampered/invalid `razorpay_signature` | Rejected | ☐ |
| P9-06 [NEGATIVE] | Update | Any | Replay the same `razorpayPaymentId` twice | Idempotent — returns existing tx, doesn't double-credit | ☐ |
| P9-07 [NEGATIVE — prod safety] | Update | Any | Attempt to verify a `order_mock_` order id when `NODE_ENV=production` | Blocked | ☐ |
| P9-08 | Read | Client/Freelancer | `GET /api/transactions` | Own transactions only (as client OR freelancer party); admin sees all | ☐ |
| P9-09 | Update | Client (owner) | Release escrow — `PATCH /api/transactions {action:"release"}` from `held` | `escrowStatus→"released"`, CAS-guarded | ☐ |
| P9-10 [NEGATIVE] | Update | Client (non-owner of tx) | Release someone else's escrow | 403 | ☐ |
| P9-11 [NEGATIVE — race] | Update | Client | Fire two concurrent release requests on same tx | Only 1st succeeds; 2nd gets 409 (already released) | ☐ |
| P9-12 | Update | Client or Freelancer (party) | Raise a dispute — `PATCH /api/transactions {action:"dispute"}` from `held` | `escrowStatus:"held"→"disputed"`, a `disputes` doc inserted | ☐ |
| P9-13 [NEGATIVE] | Update | Non-party | Attempt to dispute a transaction they're not party to | 403 | ☐ |
| P9-14 [NEGATIVE] | Update | Any | Dispute a tx that's not currently `held` (e.g. already released) | 409 CAS | ☐ |

---

## Phase 10 — Disputes CRUD (non-admin side)

Route: `api/disputes`. See Phase 20 for the admin-only resolve variant.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P10-01 [KNOWN GAP] | Create | Client/Freelancer | Attempt to directly create a dispute (there's no "Raise Dispute" form independent of the transaction-dispute action) | **`POST /api/disputes` doesn't exist at all** — only `GET`/`PATCH`. Disputes are created solely as a side-effect of `PATCH /api/transactions {action:"dispute"}` (Phase 9-12) | ☐ |
| P10-02 | Read | Party | `GET /api/disputes` as the raiser or the other party on the linked transaction | Both sides of a dispute can see it | ☐ |
| P10-03 [NEGATIVE] | Read | Non-party | Attempt to view a dispute unrelated to caller | Not returned in list | ☐ |
| P10-04 | Update | Admin (via this route, not admin-only route) | `PATCH /api/disputes {status:"resolved", resolutionType:"refund_client"}` | Transaction `escrowStatus→"refunded"` (CAS on `held`) | ☐ |
| P10-05 | Update | Admin | Same with `resolutionType:"pay_freelancer"` | `escrowStatus→"released"` | ☐ |
| P10-06 [KNOWN GAP] | Update | Admin | Same with `resolutionType:"split_50_50"` | **Explicitly unhandled in code** — no partial-payout mechanism exists; confirm it's a no-op on the transaction, not a silent full payout to either side | ☐ |
| P10-07 [NEGATIVE] | Update | Admin | Resolve the same dispute twice | Dispute record itself has **no CAS guard** — can be "re-resolved" repeatedly at the dispute-doc level (unlike the linked tx, which IS CAS-guarded so money only moves once). Confirm dispute status can be flipped back and forth without a 409 | ☐ |
| P10-08 [NEGATIVE] | Update | Non-admin | Attempt `PATCH /api/disputes` as client/freelancer | Confirm role gate (route doesn't explicitly check `role==="admin"` per the audit — verify in practice whether a non-admin party can call this and move money themselves) | ☐ |

---

## Phase 11 — Reviews CRUD

Route: `api/reviews`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P11-01 | Create | Client/Freelancer (party) | Leave a review after escrow is `released` on a completed job | 201, `revieweeId` must be the *other* party on that same transaction | ☐ |
| P11-02 [NEGATIVE] | Create | Any | Leave a review while escrow is still `held` (job merely `completed` status, not yet released) | Rejected — requires `escrowStatus:"released"` specifically, not just job completion | ☐ |
| P11-03 [NEGATIVE] | Create | Party | Review targeting an arbitrary `revieweeId` not the actual counterparty on that transaction | 403 | ☐ |
| P11-04 [NEGATIVE] | Create | Party | Submit `rating` outside 1–5 | Rejected | ☐ |
| P11-05 [NEGATIVE] | Create | Party | Submit a 2nd review for the same `(jobId, reviewerId)` pair | 409 duplicate | ☐ |
| P11-06 | Read | Any | `GET /api/reviews?userId=X` | Reviews for that user, `averageRating`/`totalReviews` correctly recomputed after each new review | ☐ |
| P11-07 | Read | Any | `GET /api/reviews?jobId=X` | Reviews tied to that job | ☐ |
| P11-08 [KNOWN GAP] | Update/Delete | Reviewer | Attempt to edit or retract a submitted review | No such endpoint — reviews are immutable | ☐ |

---

## Phase 12 — Milestones CRUD

Route: `api/milestones`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P12-01 | Create | Client (job owner) | Define milestones for own job (`title, description, amount` per milestone) | 201, sequential `order`, `status:"pending"` each | ☐ |
| P12-02 [NEGATIVE] | Create | Client (non-owner) | Define milestones on another client's job | 403 | ☐ |
| P12-03 [NEGATIVE / KNOWN GAP] | Create | Client | Define milestones whose `amount` sum ≠ job's agreed price | **No validation exists** — confirm it saves anyway, amounts don't have to reconcile | ☐ |
| P12-04 [NEGATIVE / KNOWN GAP] | Create | Client | Submit a milestone with non-numeric `amount` | Silently coerced to `0` (`Number(m.amount)||0`), not rejected | ☐ |
| P12-05 [KNOWN GAP] | Read | Any authenticated | `GET /api/milestones?jobId=X` for a job the caller has no relation to | **No ownership/participant check in this route** — confirm any logged-in user can view any job's milestone breakdown by knowing/guessing the jobId | ☐ |
| P12-06 | Update | Freelancer (assigned) | Start a milestone — `PATCH {action:"start"}` from `pending` | `status→"in_progress"` | ☐ |
| P12-07 [NEGATIVE] | Update | Freelancer (not assigned to this job) | Start someone else's milestone | 403 | ☐ |
| P12-08 [NEGATIVE] | Update | Freelancer | Start a milestone not currently `pending` | 409 | ☐ |
| P12-09 | Update | Freelancer (assigned) | Submit a milestone — `PATCH {action:"submit"}` from `in_progress` | `status→"submitted"` | ☐ |
| P12-10 | Update | Client (owner) or Admin | Approve a milestone — `PATCH {action:"approve"}` from `submitted` | `status→"approved"`, exact-cent escrow release of that milestone's `amount` from the job's held transaction | ☐ |
| P12-11 [NEGATIVE — race] | Update | Client | Fire two concurrent `approve` calls on the same milestone | Only 1st releases funds (CAS on `escrowReleased`) | ☐ |
| P12-12 | Update | Client | Approve the final milestone bringing cumulative released ≥ gross | Transaction fully flips to `escrowStatus:"released"` | ☐ |
| P12-13 [NEGATIVE] | Update | Freelancer | Attempt to approve own submitted milestone (should be client/admin only) | 403 | ☐ |
| P12-14 [KNOWN GAP] | Delete | Client | Attempt to delete a milestone | No DELETE endpoint | ☐ |

---

## Phase 13 — Team CRUD

Route: `api/teams`. Page: `team`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P13-01 | Create | Any (Plus/Premium plan) | Create a team (`name`) | 201, caller becomes `teamRole:"owner"` | ☐ |
| P13-02 [NEGATIVE] | Create | Free plan | Create a team | 403 — free plan has 0 `teamSeats` | ☐ |
| P13-03 [NEGATIVE] | Create | Any | Create a 2nd team while already owning/belonging to one | 409 | ☐ |
| P13-04 | Read | Owner/Member | `GET /api/teams` | Team doc with joined member users + `analytics{totalJobs, activeJobs, totalSpend}` | ☐ |
| P13-05 | Read | Non-member | `GET /api/teams` | `null` — not in a team | ☐ |
| P13-06 | Update | Owner | Invite a member by email — `PATCH {action:"invite", email}` | Appended to `invites[]`, notified | ☐ |
| P13-07 [NEGATIVE] | Update | Non-owner member | Attempt to invite as a regular member (not owner) | 403 "You don't own a team" | ☐ |
| P13-08 [NEGATIVE] | Update | Owner | Invite past the plan's `teamSeats` cap (counting members + pending invites) | 403 | ☐ |
| P13-09 [NEGATIVE / KNOWN GAP] | Update | Owner | Invite the same email twice | **No dedupe check** — confirm two pending invite entries can exist for one email (each still counts toward the seat cap) | ☐ |
| P13-10 | Update | Invitee | Accept a team invite — `PATCH {action:"accept", teamId}` | Added to `memberIds`, `teamRole:"member"` | ☐ |
| P13-11 [NEGATIVE] | Update | Invitee already on a different team | Accept an invite while already belonging to a team | 409 | ☐ |
| P13-12 [NEGATIVE] | Update | Non-invitee | Attempt to accept using a `teamId` with no matching pending invite for caller's email | Rejected | ☐ |
| P13-13 [KNOWN GAP] | Delete | Owner/Member | Attempt to leave a team, remove a member, or disband a team | **No such endpoint exists** — confirm no leave/remove/disband UI path works | ☐ |

---

## Phase 14 — Referrals

Route: `api/referrals` (read-only endpoint; creation happens inside Phase 1 registration and job-completion flows).

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P14-01 | Read | Any | `GET /api/referrals` first call ever for this user | Lazily generates a 16-hex `referralCode`, initializes `referralCredits:0` | ☐ |
| P14-02 | Read | Any | Subsequent calls | Same stable code returned, not regenerated | ☐ |
| P14-03 | Create (indirect) | Guest | Register using another user's `referralCode` | New referral record `status:"pending"`; referrer's `totalInvites` +1, `signedUp` +1 | ☐ |
| P14-04 | Update (indirect) | Referred user | Complete their first job (escrow released) | Referral status moves to `first_job_completed`/`credited`; referrer's `totalCredits` increases | ☐ |
| P14-05 [NEGATIVE] | Create (indirect) | Guest | Register with a garbage/non-existent `referralCode` | Registration still succeeds, just no referral link created (confirm it doesn't hard-fail registration) | ☐ |

---

## Phase 15 — Subscriptions & Plans CRUD

Route: `api/subscriptions`, `api/admin/users/[id]/plan` (admin side in Phase 18). Page: `pricing`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P15-01 | Create | Any | Subscribe to `plan:"plus"` (mock mode, no Razorpay Plan configured) | Immediately `status:"active"`, user's `plan/subscriptionId/planExpiresAt` set, welcome email sent | ☐ |
| P15-02 | Create | Any | Subscribe in **real** Razorpay mode | Sub created `status:"created"` only — plan flip deferred to webhook `subscription.activated`, confirm plan does NOT change until webhook fires | ☐ |
| P15-03 [NEGATIVE] | Create | Any | Subscribe to `plan:"free"` | Rejected — free isn't a valid POST target (it's the default/no-plan state) | ☐ |
| P15-04 [NEGATIVE] | Create | Any | Subscribe again while an existing sub is `created/active/past_due` | 409 | ☐ |
| P15-05 | Read | Any | `GET /api/subscriptions` | Most recent sub doc, or `{subscription:null}` | ☐ |
| P15-06 | Update | Any | `PATCH {action:"verify_checkout"}` with valid Razorpay callback params | Signature verified against the specific sub row; confirms authenticity but doesn't itself flip plan | ☐ |
| P15-07 [NEGATIVE] | Update | Any | `verify_checkout` with mismatched `razorpay_subscription_id` (not caller's own) | 404 | ☐ |
| P15-08 | Update | Any (mock sub) | `PATCH {action:"cancel"}` | Mock subs cancel **immediately** (`status:"cancelled"`), `handleDowngrade` frees plan right away | ☐ |
| P15-09 | Update | Any (real sub) | `PATCH {action:"cancel"}` | Real subs cancel at cycle end (`cancelAtPeriodEnd:true`), plan stays active until then | ☐ |
| P15-10 | Update | Any (mock sub) | `PATCH {action:"change_plan", newPlan}` | Applies **immediately** for mock subs | ☐ |
| P15-11 | Update | Any (real sub) | Same for real subs | Scheduled at cycle end via Razorpay, not immediate | ☐ |
| P15-12 [NEGATIVE] | Update | Any | `change_plan` to the same plan already active | 400 | ☐ |
| P15-13 | Update (webhook) | System | Simulate `subscription.activated` webhook from Razorpay | Plan actually flips for the pending real subscription | ☐ |
| P15-14 | Read | Client/Freelancer | Pricing page shows correct upgrade/downgrade CTAs per current plan tier | Downgrade options show disabled "Downgrade unavailable" (prior-session fix — confirm still correct, not a functional-but-mislabeled button) | ☐ |

---

## Phase 16 — API Keys CRUD + External v1 API

Route: `api/keys`, `api/v1/jobs`. Page: `settings`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P16-01 | Create | Plus/Premium plan | `POST /api/keys {name}` | 201, raw key shown **once** with one-time warning, bcrypt+SHA256 hashes stored | ☐ |
| P16-02 [NEGATIVE] | Create | Free plan | Create an API key | 403 — `hasApiAccess` required | ☐ |
| P16-03 [NEGATIVE] | Create | Plus/Premium | Create a key past the plan's `maxApiKeys` cap | 403 | ☐ |
| P16-04 | Read | Any | `GET /api/keys` | Own non-revoked keys, masked to `prefix` only | ☐ |
| P16-05 | Delete | Owner | `DELETE /api/keys?id=X` own key | Soft-revoke (`revokedAt` set) | ☐ |
| P16-06 [NEGATIVE] | Delete | Non-owner | Delete another user's key id | 404 (no distinct 403 — confirm no existence leak either way) | ☐ |
| P16-07 | Read | External | `GET /api/v1/jobs` with valid `X-API-Key` header | 200, correct auth via SHA-256 fast path | ☐ |
| P16-08 [NEGATIVE] | Read | External | Same with a revoked key | 401 | ☐ |
| P16-09 [NEGATIVE] | Read | External | Same with no key / garbage key | 401 | ☐ |
| P16-10 [NEGATIVE] | Read | External | Valid key, but owner has since downgraded off Plus/Premium | 403 — access re-checked at request time, not just creation time | ☐ |
| P16-11 [NEGATIVE] | Read | External | Exceed the per-key rate limit within a minute | 429 | ☐ |
| P16-12 | Create | External | `POST /api/v1/jobs` with valid key, same fields as internal job-create | Job created, same category whitelist + quota CAS as internal `POST /api/jobs` | ☐ |
| P16-13 | Read | External | Legacy key (pre-`keyHash`) still authenticates via bcrypt fallback | Succeeds, then backfills `keyHash` for future fast-path lookups | ☐ |

---

## Phase 17 — Assessments CRUD

Route: `api/assessments`. Page: `assessments`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P17-01 | Read | Guest/Any | `GET /api/assessments` (list) | Assessments with `questionCount`, no full question text | ☐ |
| P17-02 | Read | Guest/Any | `GET /api/assessments?id=X` (take) | Questions returned **without** `correctIndex` (anti-cheat) | ☐ |
| P17-03 | Create | Freelancer | `POST /api/assessments {assessmentId, answers[]}` first attempt | Scored, `passed` if `score ≥ passingScore`; on pass: skill added to `verifiedSkills`, `geekScore +50`, congrats email | ☐ |
| P17-04 [NEGATIVE] | Create | Freelancer | Retake same assessment within 30 days of last attempt | 429 cooldown | ☐ |
| P17-05 | Create | Freelancer | Retake after 30+ days | Succeeds | ☐ |
| P17-06 | Read | Freelancer | `GET /api/assessments?results=true` | Own past results only | ☐ |
| P17-07 [NEGATIVE] | Read | Guest | `?results=true` unauthenticated | 401 | ☐ |
| P17-08 [KNOWN GAP] | Update/Delete | Any | Attempt to edit/delete a submitted result | No such endpoint — results immutable | ☐ |

---

## Phase 18 — Admin: Users CRUD

Route: `api/admin/users*`, `api/admin/verify-key`. Page: `admin/users`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P18-01 | Read | Admin | `GET /api/admin/users` (paginated, default limit) | Correct `page`/`limit`/`total`/`pages` math — confirm the earlier `limit` default-omission bug (fixed in `sanitizeNumber`) doesn't regress: omitting `limit` entirely must NOT clamp to 1 row/page | ☐ |
| P18-02 | Read | Admin | `?role=freelancer` filter | Only freelancers | ☐ |
| P18-03 [NEGATIVE] | Read | Admin | `?role=garbage` | Ignored, unfiltered list returned (not 400) | ☐ |
| P18-04 | Read | Admin | `?search=maya` | Regex-matched against `fullName`/`email`, ReDoS-safe (escaped) | ☐ |
| P18-05 | Read | Admin | Confirm `deleted:true` users never appear regardless of filters | Always excluded | ☐ |
| P18-06 [NEGATIVE] | Create | Non-admin | Attempt `POST /api/admin/users` (create admin account) as client/freelancer | 403 | ☐ |
| P18-07 | Create | Admin | `POST /api/admin/users {name, email, password, adminKey}` with correct `adminKey` | 201 new admin created | ☐ |
| P18-08 [NEGATIVE] | Create | Admin | Same with wrong `adminKey` | Rejected, failure logged to `audit_logs` | ☐ |
| P18-09 [NEGATIVE] | Create | Admin | 6 attempts within 15 min (any adminKey validity) | 429 (5/15min/admin) | ☐ |
| P18-10 | Read | Admin | `GET /api/admin/users/[id]` | Single user, password stripped | ☐ |
| P18-11 | Update | Admin | `PATCH /api/admin/users/[id] {suspended:true}` | User suspended, **all their refresh tokens revoked immediately** — confirm their active session dies without waiting for token expiry | ☐ |
| P18-12 | Update | Admin | Restore — `{suspended:false}` | User can log in again | ☐ |
| P18-13 | Update | Admin | `{role:"admin"}` promote a user | `role` changed, also merged into `roles[]` | ☐ |
| P18-14 [NEGATIVE] | Update | Admin | `{role:"superadmin"}` (not in enum) | 400 | ☐ |
| P18-15 | Update | Admin | `{geekScore:999, isVerified:true, bio, skills, fullName}` | All persisted, logged to `audit_logs` | ☐ |
| P18-16 [NEGATIVE] | Update | Non-admin | Attempt `PATCH /api/admin/users/[id]` as any non-admin | 403 | ☐ |
| P18-17 | Delete | Admin | `DELETE /api/admin/users/[id] {reason}` | Soft delete only (`deleted:true, deletedAt, deleteReason`), refresh tokens revoked, list view immediately excludes them (Phase 18-05) | ☐ |
| P18-18 [NEGATIVE] | Delete | Non-admin | Attempt to delete a user | 403 | ☐ |
| P18-19 | Update | Admin | `PATCH /api/admin/users/[id]/plan {plan:"premium", reason}` | `plan` set, `planExpiresAt:null`, logged to both `plan_change_log` and `audit_logs` | ☐ |
| P18-20 [NEGATIVE] | Update | Admin | `{plan:"enterprise"}` (not a real plan key) | Rejected | ☐ |
| P18-21 | Create/verify | Admin | `POST /api/admin/verify-key {key}` correct | Success logged, gate unlocked | ☐ |
| P18-22 [NEGATIVE] | Create/verify | Admin | Wrong key, repeated 6× in 15 min | 429, failures logged | ☐ |

---

## Phase 19 — Admin: Jobs CRUD

Route: `api/admin/jobs*`. Page: `admin/jobs`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P19-01 | Read | Admin | `GET /api/admin/jobs` paginated | Correct pagination | ☐ |
| P19-02 | Read | Admin | `?status=open` / `cancelled` / `removed` / `all` | Filtered correctly | ☐ |
| P19-03 [NEGATIVE] | Read | Admin | `?status=garbage` | Ignored/falls back | ☐ |
| P19-04 | Read | Admin | `?search=` against title/description | Regex-escaped, works | ☐ |
| P19-05 | Update | Admin | `PATCH /api/admin/jobs/[id] {title, description, startingPrice, minimumPrice, decayRatePerHour, featured, skillsRequired, category}` | All persisted | ☐ |
| P19-06 [NEGATIVE] | Update | Admin | `{status:"accepted"}` via this generic editor | **Explicitly blocked (400)** — must use the real accept flow so escrow/chat/notifications aren't skipped | ☐ |
| P19-07 [KNOWN GAP] | Update | Admin | `{status:"completed"}` or any other status jump directly (e.g. `open`→`completed` skipping `accepted`) | **Not blocked** — no state-machine validation beyond the one `"accepted"` special-case; confirm arbitrary status jumps succeed | ☐ |
| P19-08 [NEGATIVE] | Update | Non-admin | Attempt `PATCH /api/admin/jobs/[id]` | 403 | ☐ |
| P19-09 | Delete | Admin | `DELETE /api/admin/jobs/[id] {reason}` | Soft-delete: `status:"removed", deletedAt, deleteReason` — confirm it displays distinctly as "removed" in the list (unlike the parallel user soft-delete bug fixed previously, this one was confirmed already correct) | ☐ |
| P19-10 [NEGATIVE] | Delete | Non-admin | Attempt to remove a job | 403 | ☐ |

---

## Phase 20 — Admin: Disputes CRUD

Route: `api/admin/disputes`. Page: `admin/disputes`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P20-01 | Read | Admin | `GET /api/admin/disputes` paginated (max limit 50) | `raisedByName`, `jobTitle`, `amount`, `escrowStatus` all correctly joined | ☐ |
| P20-02 | Read | Admin | `?status=` filter | Correct | ☐ |
| P20-03 | Update | Admin | `PATCH {disputeId, status:"resolved", resolution:"...", resolutionType:"refund_client"}` | Tx `escrowStatus→"refunded"` (CAS on `held`) | ☐ |
| P20-04 | Update | Admin | Same with `resolutionType:"pay_freelancer"` | Tx `escrowStatus→"released"` | ☐ |
| P20-05 [NEGATIVE] | Update | Admin | `{status:"resolved"}` with **empty/missing `resolution`** | 400 — this admin route requires non-empty resolution text (stricter than the non-admin `PATCH /api/disputes` in Phase 10, which doesn't enforce this — confirm the inconsistency) | ☐ |
| P20-06 [NEGATIVE — money safety] | Update | Admin | Resolve the same dispute a 2nd time (already resolved) | The linked transaction is CAS-guarded on `held`, so a 2nd resolve is a no-op on money — confirm no double-refund/double-payout even though the dispute doc itself allows re-flipping status | ☐ |
| P20-07 [KNOWN GAP] | Update | Admin | `resolutionType:"split_50_50"` | Unhandled — confirm no money moves | ☐ |
| P20-08 [NEGATIVE] | Update | Non-admin | Attempt `PATCH /api/admin/disputes` | 403 | ☐ |

---

## Phase 21 — Admin: Transactions CRUD

Route: `api/admin/transactions`. Page: `admin/transactions`.

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P21-01 | Read | Admin | `GET /api/admin/transactions` paginated (max limit 50) | `jobTitle`, `clientName`, `freelancerName` joined correctly | ☐ |
| P21-02 | Read | Admin | `?status=held/released/refunded/disputed` (maps to `escrowStatus`) | Correct filter | ☐ |
| P21-03 | Update | Admin | `PATCH {txId, action:"release"}` from `held` | `escrowStatus→"released"`, logged to `audit_logs` | ☐ |
| P21-04 | Update | Admin | `PATCH {txId, action:"refund"}` from `held` | `escrowStatus→"refunded"` | ☐ |
| P21-05 [NEGATIVE] | Update | Admin | Either action on a tx not currently `held` | 409 | ☐ |
| P21-06 [NEGATIVE] | Update | Non-admin | Attempt release/refund | 403 | ☐ |

---

## Phase 22 — Admin: Config / Logs / Stats

Route: `api/admin/config*`, `api/admin/logs`, `api/admin/stats`. Page: `admin/config`, `admin/logs`, `admin` (dashboard).

| ID | CRUD | Role | Test Case | Expected Result | ☐ |
|---|---|---|---|---|---|
| P22-01 | Read | Admin | `GET /api/admin/config` | Merged defaults + stored overrides | ☐ |
| P22-02 | Update | Admin | `PATCH {maintenanceMode:true}` | Persisted; **cross-check against Phase 1-11**: non-admin logins now blocked, admin logins still work | ☐ |
| P22-03 | Update | Admin | `PATCH {maintenanceMode:false}` | Un-does P22-02, non-admin logins resume | ☐ |
| P22-04 | Update | Admin | `PATCH {registrationOpen:false}` | New registrations should be blocked — verify against Phase 1-01/1-02 | ☐ |
| P22-05 | Update | Admin | `PATCH {aiEnabled:false}` | AI features (bid strategist, pricing advisor, description generator) should stop working app-wide | ☐ |
| P22-06 | Update | Admin | `PATCH {planFees:{free:0, plus:15, premium:10}}` (values clamped 0–100) | Persisted, `invalidatePlanFeeCache()` triggered | ☐ |
| P22-07 [NEGATIVE] | Update | Admin | `planFees` value `150` or `-5` or `NaN` | Silently dropped (out of `[0,100]` or non-finite) | ☐ |
| P22-08 [NEGATIVE] | Update | Non-admin | Attempt any config PATCH | 403 | ☐ |
| P22-09 | Read | Admin | `GET /api/admin/config/env-status` | Boolean presence only for 6 env vars, no actual secret values leaked | ☐ |
| P22-10 | Read | Admin | `GET /api/admin/logs` paginated (default 30, max 100) | Audit log entries for every admin mutation performed in Phases 18–22 above should appear here | ☐ |
| P22-11 | Read | Admin | `GET /api/admin/stats` (dashboard) | `users.total` (excl. deleted), `jobs.total/open`, `transactions.gmv/fees/heldEscrow`, `disputes.active` all reconcile against direct DB counts | ☐ |
| P22-12 [NEGATIVE] | Read | Non-admin | Attempt any `/api/admin/*` GET route | 403 across the board | ☐ |

---

## Phase 23 — Cross-Role Security & RBAC Boundary Tests

Consolidated IDOR / privilege-escalation / session-integrity tests that cut across every entity above — run these last, using two accounts of the same role (e.g. two clients) plus a stale/tampered token.

| ID | Test Case | Expected Result | ☐ |
|---|---|---|---|
| P23-01 | Client A attempts every "owner-only" mutation (Phase 3/6/9/12) against a resource owned by Client B, using correct auth but wrong-owner id | 403 in every case — sweep all owner-checked routes | ☐ |
| P23-02 | Freelancer A attempts freelancer-scoped mutations (bid accept, milestone start/submit, offer-response) against a job/offer belonging to Freelancer B | 403 in every case | ☐ |
| P23-03 | Any non-admin token calls every `/api/admin/*` route directly (bypassing UI) | 403 uniformly — confirm no admin route is missing its role check | ☐ |
| P23-04 | Manually craft a JWT with `role:"admin"` using a guessed/wrong secret | Signature verification fails, 401 | ☐ |
| P23-05 | Admin revokes/demotes a user's role via Phase 18-13/18-11, then the affected user makes a request with their **still-unexpired** access token | Request still succeeds with the OLD role/permissions until token naturally expires (≤15 min) or they refresh — this is a **known/accepted latency**, not a bug: confirm it matches documented behavior, don't file it as a new finding | ☐ |
| P23-06 | Suspend a user (P18-11) who has an open browser session using only the access token (no refresh yet attempted) | Still works until access token expires; only the next refresh/login attempt is blocked | ☐ |
| P23-07 | Attempt to pass MongoDB operators (`$gt`, `$where`, etc.) or `__proto__` in any JSON body field across a sample of routes (login email, search query, bio) | `sanitizeQuery`/`sanitizeString` strip/reject — confirm no NoSQL injection succeeds | ☐ |
| P23-08 | Attempt ReDoS-style regex payloads in `?search=` params (admin users/jobs) | Regex-escaped before use — confirm no hang | ☐ |
| P23-09 | Confirm every write route's field allowlist rejects unexpected extra fields (e.g. `PATCH /api/user {role:"admin", fullName:"x"}`) | Only allowlisted fields persist | ☐ |
| P23-10 | Confirm rate limits are per-user (or per-IP where documented) and reset correctly after the window | Matches documented windows (Phase 1, 8, 18) | ☐ |

---

## Phase 24 — Known Gaps & Out-of-Scope Summary

Not bugs to fix during this audit — confirmed-by-code absences, listed here so a tester doesn't
waste time hunting for a button/endpoint that was never built:

| Area | Gap | Where |
|---|---|---|
| Account deletion | No `DELETE /api/user` — Settings "Confirm Delete" is a dead stub | P2-15 |
| Job editing | No edit-mode on `post-job` — "Edit Job" links to a blank creation form | P3-16 |
| Password reset | No reset-flow endpoint anywhere in the app — "Forgot password?" is a dead stub | (not in any phase above — confirm separately if testing login page) |
| Dispute creation | No standalone `POST /api/disputes` — only reachable via `PATCH /api/transactions {action:"dispute"}` | P10-01 |
| Split-payout disputes | `split_50_50` resolutionType is explicitly unhandled, no code path moves money | P10-06, P20-07 |
| Team leave/disband | No leave-team, remove-member, or disband-team endpoint | P13-13 |
| Message edit/delete | Chat messages are immutable, no edit/delete | P7-12 |
| Notification delete | No DELETE endpoint for notifications | P8-09 |
| Review edit/retract | Reviews are immutable once submitted | P11-08 |
| Assessment result edit | Results immutable, no re-grade/edit path | P17-08 |
| Milestone delete | No DELETE endpoint for milestones | P12-14 |
| Job hard delete (admin) | Admin "delete" is always soft (`status:"removed"` or `deleted:true`) — no true document deletion anywhere in the app for jobs or users | P18-17, P19-09 |
| Admin job status state machine | Only `"accepted"` is blocked from the generic editor; all other status jumps are unguarded | P19-07 |
| Milestone amount reconciliation | No validation that milestone amounts sum to the job's price | P12-03 |
| Job price-field validation | `POST /api/jobs` only hard-requires `title`; price/hours fields can be omitted and stored as `NaN` | P3-02 |
| Profile rate-range validation | No server check that `hourlyRateMin ≤ hourlyRateMax` or that either is non-negative | P2-04 |
| `PATCH /api/jobs/[id]/cancel` race guard | Uses plain `updateOne`, not CAS — theoretical (low-severity) TOCTOU window vs. the CAS-guarded `action`-based cancel | P3-17 |
| Team duplicate invites | No dedupe check for inviting the same email twice to one team | P13-09 |
| `/api/v1/jobs` legacy-key auth path | O(n) bcrypt fallback scan for keys predating `keyHash` — self-flagged in code as a scaling concern, not an active incident | P16-13 |

---

## Execution Notes

- Run Phases 0–2 first (environment + auth + profile) since every later phase depends on valid
  tokens for all three roles.
- Phases 3–17 (client/freelancer entity CRUD) can be executed in any order relative to each other,
  but within a phase, respect the Create → Read → Update → Delete ordering shown (later rows often
  depend on state created by earlier rows in the same phase, e.g. you need an open job before you
  can bid on it).
- Run Phases 18–22 (admin) after 3–17, since several admin test cases (suspend, soft-delete,
  plan-change, maintenance mode) are designed to be exercised against accounts/resources already
  touched in earlier phases, so the "before/after" effect is visible.
- Run Phase 23 (security sweep) last, using the accounts/resources already populated by all prior
  phases as the cross-tenant targets.
- For every `[NEGATIVE]` row, "Pass" means **the app correctly rejects/blocks it** — a negative test
  that succeeds when it shouldn't is the bug, not the other way around.
- For every `[KNOWN GAP]` row, "Pass" means **you confirmed the gap reproduces exactly as described**
  (i.e., the documentation is accurate) — it is not a request to implement the missing feature
  during this audit pass.
