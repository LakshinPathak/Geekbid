# GeekBid — Dual-Role Accounts + OAuth Role-Mismatch Fix — Research Notes

Status: **Phase 1 (research) COMPLETE. Phase 2 (design) NOT started yet.**
This file is a checkpoint save of raw findings so nothing is lost — not a final plan yet.

## The two problems being solved

1. **Bug**: Google OAuth silently logs a user into their existing account's role,
   ignoring the role they picked on this attempt, with zero error/warning.
2. **Feature request**: allow one account/email to hold BOTH a client and a
   freelancer identity ("dual role"), via proper DB flags — not a full account
   split.

## Bug walkthrough (confirmed via code read)

1. User picks role on `/login`, clicks "Continue with Google" →
   `/api/auth/google?role=client` (`login/page.tsx:448`, reuses the same
   `role` state as the password-signup toggle at lines 336-361).
2. `google/route.ts:38` encodes `state = "<nonce>.client"`.
3. `google/callback/route.ts:21` decodes role from state, calls
   `googleLoginUser({ email, googleId, role, ... })`.
4. First time: `auth.ts:227` `findOne({$or:[{email},{googleId}]})` finds nothing
   → creates new user with that role (`auth.ts:237-266`). Works.
5. Second attempt, different role, same email: `findOne` **finds the existing
   user** → skips the create branch entirely → `auth.ts:229-236` only links
   `googleId` if missing, **never re-checks/uses the newly requested role** →
   returns the existing user's ORIGINAL role. No error surfaced anywhere.

Same root cause hits password signup differently: `auth.ts:168-169`
`registerUser`'s `findOne({email})` (no role in filter) means a second
`register` call with the same email always returns `"Email already
registered"` regardless of role — at least this path errors visibly, unlike OAuth.

## Central technical constraint (this drives the whole design)

**The JWT payload embeds `role` directly at sign-time** (`TokenPayload` in
`auth.ts:18-23`: `{ userId, role: string, email, type }`). `authenticateRequest()`
(`auth.ts:143-153`) never re-reads the DB — it trusts whatever role was baked
into the token. Consequences:
- Changing `User.role` in the DB (e.g. via the one existing admin PATCH,
  `admin/users/[id]/route.ts:49`) does **not** take effect until the access
  token is refreshed (15min expiry, `ACCESS_TOKEN_EXPIRY` at `auth.ts:12`) —
  `refreshAccessToken` (`auth.ts:319-348`) is the only place that re-reads the
  DB role and re-mints a token with it.
- `GET /api/auth/me` re-reads DB fresh and can disagree with the JWT until next refresh.
- **Any dual-role design must account for this**: an "active role" toggle
  can't just flip a DB field — either tokens must carry `roles: string[]`
  instead of one `role`, or "which role am I acting as" must be re-checked
  per-request against the DB rather than trusted from the token, or switching
  roles must force a fresh token mint.

## `User` type / schema today (`src/lib/utils.ts`)

- `Role = 'client' | 'freelancer' | 'admin'` (line 50) — single string union, no array.
- `User.role: Role` (line 53) — required, single-valued, no dual-role representation anywhere.
- Role-flavored fields that already coexist on one user doc unconditionally
  (not a discriminated union): `geekScore`, `skills`, `hourlyRateMin/Max`,
  `availability`, `githubUsername/Verified/Data`, `verifiedSkills` (freelancer-ish);
  `company` (client-ish); `averageRating/totalReviews` (both); `plan/planLimits`
  (mixes `jobsPostedThisMonth` (client) + `bidsPlacedThisMonth`/`aiBidUsesThisMonth`
  (freelancer) in one object already).
- `password` not in the type at all (stripped before return); can be `null` in
  the raw Mongo doc for Google-only signups (`auth.ts:242`) — `loginUser`
  (`auth.ts:298`) has **no guard** before `compareSync(pw, user.password)`,
  a latent crash risk for password-login attempts on a Google-only account.
- `googleId`/`authProvider` are NOT in the typed `User` — written to Mongo but
  untyped, pass through via `...user` spreads.
- `geekScore` init differs by role: freelancer=100, client=0
  (`auth.ts:188` password path, `auth.ts:253` OAuth path).

## Auth functions — exact current behavior (`src/lib/auth.ts`)

- `registerUser` (156-209): email-only uniqueness (168-169), role forced to
  `freelancer`/`client` only (172-174), geekScore by role (188), never sets
  googleId/authProvider.
- `googleLoginUser` (220-285): email-OR-googleId lookup (227); existing user →
  only links googleId if missing (231-236), **ignores requested role entirely**;
  new user → role from query param or default freelancer (245), `password: null`
  (242), `authProvider: "google"` only set on fresh creation (262, not
  retroactively on linking).
- `loginUser` (288-316): email-only lookup, no null-password guard before compareSync.
- Token creation: `createAccessToken`/`createRefreshToken`/`createTokenPair`
  (31-53) all take a single `role: string` param, baked directly into the JWT.

## OAuth flow role plumbing

- `google/route.ts:12,38` — reads `?role=`, defaults freelancer, encodes into
  `state` as `"<nonce>.<role>"`. Role itself is NOT part of the CSRF/signature
  check — only the nonce is validated against the cookie; role rides along as
  plain unsigned text (low risk since nonce mismatch already blocks the flow,
  but noting it's not authenticated data).
- `google/callback/route.ts:21,37,86` — decodes role, checks nonce only, passes
  role into `googleLoginUser`.
- `google/exchange/route.ts` — pure pass-through, no role logic, just hands
  back whatever `user.role` googleLoginUser produced via a one-time exchange code.

## Frontend store (`src/lib/store.tsx`)

- `currentUser: User|null` persisted whole to `localStorage["gb_user"]`
  (`STORAGE_KEY_USER`), restored on mount, synced cross-tab via `storage` event.
  Role travels as part of this single object, no separate handling.
- `persistAuth` (169-179) is the funnel for login/register/googleAuth — all
  three just call it with whatever `user` the API returned.
- **No centralized `isClient`/`isFreelancer` derived state** — every consuming
  component computes `currentUser.role === "..."` locally and independently
  (17+ separate call sites across the frontend — see below). A dual-role
  change means touching every one of these individually unless a shared
  hook/helper is introduced first.
- A `switchRole(role)` action exists (848-863) but is a **dev/demo dead end**:
  it swaps `currentUser` to a **different existing user record** with the
  target role (searches the already-loaded `users` array), reusing the same
  (now-mismatched) access token, and has **zero call sites** anywhere in the
  UI. Not reusable as-is for a same-account role toggle — doesn't touch the
  JWT at all, would immediately desync from every `authenticateRequest`-gated
  API route.
- `acceptJob` in store.tsx:876 branches business logic (not just UI) on
  `currentUser.role === "client"` to pick the API request shape — another
  place that would need "acting-as role" awareness, not just page routing.
- Only session-scoped-state precedent in the app: `sessionStorage.admin_verified`
  (`admin/layout.tsx`, `AdminKeyGate.tsx:32`) — a per-tab gate flag, unrelated
  to role but the closest existing pattern for "session view state distinct
  from the persisted account."

## Backend: full inventory of role-authorization gates (30+ routes)

All ad-hoc, per-route, on `auth.payload.role` (from the JWT — see constraint
above), NO centralized "require role X" helper exists in `authenticateRequest`.

**Freelancer-only** (`role !== "freelancer"` → 403): `api/bids/route.ts:44`,
`api/bids/my/route.ts:15`, `api/freelancer/bid-tracker/route.ts:10`,
`api/freelancer/dashboard/route.ts:10`, `api/freelancer/match-radar/route.ts:10`,
`api/freelancer/price-alerts/route.ts:10`, `api/freelancer/earnings/route.ts:9`,
`api/jobs/offer-response/route.ts:16`, `api/jobs/recommended/route.ts:14`,
`api/jobs/[id]/route.ts:242` (default accept action).

**Client-only** (`role !== "client"` → 403): `api/jobs/route.ts:70` (POST
create), `api/jobs/direct-offer/route.ts:15`, `api/jobs/[id]/route.ts:58,81,118`
(cancel/complete/accept_best), `api/jobs/[id]/complete/route.ts:20` (+ ownership
check :38), `api/jobs/[id]/cancel/route.ts:19` (+ ownership :37),
`api/client/activity-feed|dashboard|job-health|market-intel|spend-analytics/route.ts:9`,
`api/transactions/route.ts:70` (release, allows client OR admin) + ownership :80.

**Ownership-based, not role-string gated** (would NOT need to change under a
roles[] model): `api/ai/evaluate-bids/route.ts:59` (job.clientId match + admin
override), `api/jobs/feature/route.ts:29`, `api/milestones/route.ts:113,119`.

**Admin-only** (`role !== "admin"`): all of `api/admin/**` (10 files),
`api/disputes/route.ts:57`, `api/email-logs/route.ts:24,66`, `api/seed/route.ts:41`.

**Role used for data-visibility filtering, not hard deny** (would need
`roles.includes(...)` treatment too): `api/jobs/route.ts:24` (invite-only
filter), `api/notifications/route.ts:17`, `api/transactions/route.ts:18`,
`api/disputes/route.ts:20`, `api/users/route.ts:23` (field projection),
`api/invites/route.ts:19` (**binary branch, no admin case** —
`filter = role==="client" ? {clientId} : {freelancerId}` — a dual-role user
would only ever see one side of their invites under current logic),
`api/reviews/route.ts:93` (`reviewerRole` derived straight from token role,
defaults to freelancer for anything non-client).

**AI routes**: only `evaluate-bids` has any role/ownership check (client-owns-job).
`bid-strategy` and the other 6 general AI routes have NO role check at all —
any authenticated user can call any of them today, freelancer-flavored or not.

## Backend: role mutation points

Only one: `api/admin/users/[id]/route.ts:49` — admin-only PATCH, `allowed`
fields include `"role"`. Changes DB immediately but (per JWT constraint above)
doesn't affect the user's live session until token refresh.

## Frontend: full inventory of role branches (17+ sites)

- `app/feed/page.tsx:23` — the master router: `role==="client" ? ClientFeed : FreelancerFeed`, binary, no third case.
- `components/navbar.tsx:107,125-129,139-143,204,245-246` — role text label, "Post a Job" (client-only) and "Admin Panel" (admin-only) menu items, both desktop dropdown and mobile drawer variants.
- `components/mobile-bottom-nav.tsx:34,36-38` — entirely different 5-item vs 4-item tab arrays for client vs freelancer (client gets a "Post" tab inserted).
- `app/profile/page.tsx:129,131-143,169-171,190,357,374` — different stat tiles, role badge text, GeekScore ring (freelancer-only), "Company" field (client-only), whole "Professional" section incl. GitHub verification (freelancer-only).
- `app/profile/[id]/page.tsx:86-88` — `showActions = isClient(viewer) && isFreelancer(viewed) && !ownProfile` gates Direct-Hire/Invite buttons on someone else's profile — this is a **cross-user** role check (viewer vs viewed), separate axis from a same-user dual-role concern.
- `app/post-job/page.tsx` — **no role guard at all**, frontend-side (only checks `!currentUser` → redirect to login). Client-only-ness today is UI-affordance-only (hidden nav links) — worth confirming the backend (`api/jobs/route.ts:70`) is the actual enforcement, which it is.
- `components/feed/TalentPool.tsx:101,102,238-261,264-269,307` — `isClient` gates Message/Invite always-visible + Hire (further gated by target's GeekScore≥500); non-clients see "View Profile" hint instead; underlying list itself filtered to `role==="freelancer"` users.
- `app/jobs/[id]/page.tsx:156-157,200,392,499,504,618,624,814,961,970` — heaviest concentration outside the feed router: `isFreelancer`, `isClient` (ownership-scoped — must be *the* client who posted *this* job), entire action panel branches, milestone action buttons split by workflow stage not just role.
- `components/ai/AIBidStrategist.tsx:39` — whole widget `return null` for non-freelancers.
- `components/job-card.tsx` — takes `isFreelancer` prop but **appears dead/unused** (no imports found anywhere; feeds use `ClientJobCard`/`FreelancerJobCard` instead) — flag for deletion rather than migration.
- `app/my-jobs/page.tsx:26,77,80,114-118,175,200` — subtitle text, Post-Job button, empty-state copy, per-row Feature/Chat buttons, review-target selection all keyed off `isClient`.
- `app/admin/users/page.tsx:164-165` — read-only role-colored badge, not a gate.
- `app/admin/layout.tsx:26` — the one true frontend route-guard-by-role: blocks all of `/admin/*` for non-admins.

## Login/signup UI (`app/login/page.tsx`)

- Role picked via a 2-button toggle ("I'm a Client" / "I'm a Freelancer",
  lines 336-361), visible only in register mode, state seeded from a `?role=`
  query param (line 30, default freelancer).
- Same `role` state variable is reused for both the password-register submit
  (line 127: `register(name,email,password,role)`) AND the Google OAuth button
  (line 448: `/api/auth/google?role=${role}`) — no separate OAuth-specific role UI.
- Login mode (existing account) ignores the role toggle entirely — makes
  sense today since role is fixed per account, but relevant if dual-role ships
  (login would need a role/mode selector instead).

## What's confirmed to NOT exist anywhere (so no reuse possible)

- No `roles: string[]` or any multi-value role field.
- No account-linking / "add a role to my existing account" flow.
- No session-scoped "active role" distinct from the persisted account object.
- No centralized `requireRole()` helper in the API auth layer — every route
  hand-rolls its own check.
- No centralized `isClient`/`isFreelancer` hook on the frontend — every
  consumer recomputes it locally.

## Next step (not yet done)

Phase 2: design the actual approach — need to decide between (a) `roles:
string[]` on one account + an "active role" switcher (bigger, cleanest long
term, touches JWT shape + ~30 backend checks + ~17 frontend sites), vs (b) a
lighter "linked accounts" model (two separate user docs, same email, linked by
a shared `linkedAccountId`, with a UI switcher that re-authenticates into the
other linked doc — smaller blast radius, reuses more of today's single-role
code, but has its own JWT-refresh/switching UX to work out). Also still need
to design the immediate OAuth-mismatch bug fix as either (1) a standalone fix
independent of dual-role (return an explicit error today), or (2) folded
directly into whichever dual-role model gets chosen (mismatch → offer to
"add this role to your account" instead of erroring). Haven't picked yet —
pick up here next.
