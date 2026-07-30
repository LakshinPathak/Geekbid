# Planning — epic_0.0.1 (epic_0.0.1)

> Generated: 2026-07-18
> Type: Epic
> GitHub Issue: #1
> Branch: epic_0.0.1
> Status: planned
> WORKSPACE: `/home/lakshin_pathak/Downloads/Geekbid-19/web`
> GitHub: `LakshinPathak/Geekbid`

---

## ASSUMPTIONS (product defaults — parent must confirm with developer)

These fill brief gaps. They are **not** locked until the developer approves.

| # | Topic | Proposed default | Rationale |
|---|---|---|---|
| A1 | **Top-N per auto-invite run** | Plus = **5**, Premium = **10** (hardcoded in plan config; not admin-configurable in v1) | Fits Plus invite budget (25/mo) and Premium unlimited; keeps first batch small enough to review. |
| A2 | **Free tier access** | Free clients **can view** match scores / ranked list for an open job (teaser), but **cannot** run auto-invite or bulk-send; UI shows upgrade CTA. Manual single invite via existing TalentPool / InviteToBidModal remains available under Free’s `invitesPerMonth` (5). | Brief gates smart/auto on Plus/Premium; teaser supports conversion without removing Free’s existing manual invite. |
| A3 | **Auto-invite UX** | **One-click confirm**: client opens Smart Match for a job → sees ranked top N (editable: deselect) → confirms → system sends invites via existing `POST /api/invites`. **Not** fully automatic on job post in v1. | Avoids surprise spam and accidental quota burn; reuses invite notifications unchanged. |
| A4 | **Scoring model** | **Rule-based weighted score** (skills overlap, win rate, bid history signals). **No LLM / AI matching in v1.** | Codebase already uses deterministic skill-% match for freelancer→job (`/api/jobs/recommended`, match-radar); no freelancer→job AI engine exists. Rule-based is testable and cheaper. |
| A5 | **Score formula (v1 weights)** | Skills overlap **50%**, win rate **30%**, bid-history quality **20%** (e.g. prior bids on similar skills / completed jobs with positive outcome). Exact sub-signals documented in Part B; formula must be deterministic and unit-testable. | Mirrors brief signals; skills dominate because TalentPool already relies on skill overlap. |
| A6 | **Quota interaction** | Each auto-invite counts **1:1** against existing `planLimits.invitesSentThisMonth` / `invitesPerMonth`. Auto-invite cannot exceed remaining monthly invite quota; if remaining &lt; selected N, send only up to remaining and surface a clear message. | `POST /api/invites` already enforces plan limits (Free 5, Plus 25, Premium ∞). |
| A7 | **Eligibility for candidates** | Only freelancers who have **not** already been invited to that job, have **not** already bid on that job, and (optional soft filter) are not marked busy-only if product later adds it — v1: skip already-invited and already-bid. | Matches InviteToBidModal’s “already bid” UX and API 409 duplicate invite. |
| A8 | **Entry points** | Primary: client job detail / My Jobs open-job actions (“Smart Match”). Secondary: optional CTA near TalentPool. Not on freelancer feed / RecommendedCarousel. | RecommendedCarousel is job recommendations **for freelancers**, not this feature. |

---

<!-- PART A — INTAKE (Step 0d). Do not rewrite at Step 3; Part B is appended later. -->

## Problem Statement

Clients with open jobs today invite freelancers one-by-one through TalentPool and `InviteToBidModal` (`POST /api/invites`). TalentPool only sorts by coarse skill-overlap count and GeekScore; there is no ranked “fit” score that combines skills, win rate, and bid history for a **specific** open job, and no way to invite the best matches in one confirmed batch. That makes sourcing slow and uneven: strong freelancers may never be invited, while clients burn monthly invite quota on weak manual picks. Existing “match %” surfaces (`RecommendedCarousel`, `/api/jobs/recommended`, match-radar) score **jobs for freelancers**, not freelancers for a client’s job — so they do not solve this gap.

## Target Users

- **Primary:** Clients on **Plus** or **Premium** who have at least one **open** (non-direct) job and want faster, higher-quality invite sourcing.
- **Secondary (teaser):** Free-tier clients who can preview ranked matches but must upgrade to auto-invite (assumption A2).
- **Indirect:** Freelancers who receive invites via the existing invite + `job_invite` notification path (no new freelancer-facing match UI in this epic).

## Goals / Success Criteria

1. For an open job owned by the client, the product returns a **deterministic ranked list** of freelancer candidates with a visible match score and short breakdown (skills / win rate / bid history).
2. Plus/Premium clients can **confirm and send** invites to the top N matches (N per A1) in one action, creating the same invite records and notifications as today’s manual invite.
3. Free clients **cannot** execute auto-invite; they see an upgrade path when they try (A2).
4. Auto-invites respect **monthly invite quotas** already defined in `web/src/lib/plans.ts` and enforced in `POST /api/invites` (A6).
5. Success metrics (product): measurable increase in invite→bid conversion vs manual-only baseline within a release window; operational: zero invites sent without client confirmation in v1 (A3).

## In-Scope

- Job-scoped freelancer match scoring (skills, win rate, bid history) with a documented rule-based formula (A4–A5).
- API (and/or server helper) to compute ranked matches for a job the caller owns.
- Client UI to view ranked matches, adjust selection within top N, and confirm auto-invite (A3).
- Plan gating: auto-invite / bulk-send requires Plus or Premium; Free teaser + upgrade CTA (A2).
- Reuse of existing invite creation path (`POST /api/invites` or a thin batch wrapper that calls the same rules: open job, owner-only, duplicate guard, plan limit, notification).
- Clear handling when remaining invite quota &lt; selected count (A6).
- Exclusion of freelancers already invited to or already bidding on that job (A7).

## Out-of-Scope

- Fully automatic invite-on-job-post without confirmation (deferred; A3).
- AI / LLM-based matching or ranking (deferred; A4).
- Changing Free/Plus/Premium `invitesPerMonth` numbers themselves (unless needed only to add a separate `smartMatchTopN` constant).
- Freelancer-side job recommendation changes (`RecommendedCarousel`, `/api/jobs/recommended`, match-radar).
- New messaging, Direct Hire, or TalentPool redesign beyond optional Smart Match entry points (A8).
- Admin-configurable weight tuning UI or ML model training.
- Cross-job “always invite this freelancer” preferences or saved shortlists.
- Email/SMS channels beyond existing in-app `job_invite` notifications.

## Functional Requirements

1. **FR-1 Match computation:** Given an authenticated client and an open job they own, the system computes a numeric match score per eligible freelancer using rule-based weights (skills ≥ win rate ≥ bid history per A5), and returns results sorted by score descending.
2. **FR-2 Score transparency:** Each ranked result includes the overall score and component contributions (or equivalent breakdown) so the client can understand why someone ranked highly.
3. **FR-3 Eligibility filters:** Candidates exclude freelancers who already have a pending/responded invite for that job or who already submitted a bid on that job; only `role === freelancer` users are considered.
4. **FR-4 Top-N defaults:** Default selection size is 5 for Plus and 10 for Premium (A1). Client may deselect individuals before confirm; cannot select more than tier N in one auto-invite run.
5. **FR-5 Confirm-then-send:** Auto-invite sends only after explicit client confirmation of the selected set; no invites are created on job create/publish alone (A3).
6. **FR-6 Invite semantics:** Each confirmed send creates invites equivalent to manual `POST /api/invites` (pending status, duplicate 409 behavior, freelancer `job_invite` notification, monthly counter increment).
7. **FR-7 Plan gate — auto-invite:** If the client’s plan resolves to Free (including unknown/legacy fallthrough to Free via `getPlanConfig`), auto-invite / batch send is rejected with an upgrade-oriented error; UI does not offer a working confirm for Free.
8. **FR-8 Plan gate — preview:** Free clients may request/view the ranked match list for their open job (teaser) but cannot confirm auto-invite (A2).
9. **FR-9 Quota:** Batch send stops at remaining `invitesPerMonth` capacity; response indicates how many were sent vs skipped for quota (A6). Premium’s unlimited invites behave as today (`Infinity`).
10. **FR-10 Authorization:** Only the job’s `clientId` owner may request matches or auto-invite for that job; job must be `status === "open"` (same constraints as invites route).
11. **FR-11 Entry UI:** From an open job context (My Jobs / job detail), Plus/Premium clients can open Smart Match; Free sees locked/teaser treatment with pricing CTA (A8).
12. **FR-12 Idempotency / partial failure:** Re-running Smart Match after some invites were sent re-ranks remaining eligible freelancers only; already-invited IDs do not appear again (FR-3).

## Constraints / Non-Goals

- **Constraint:** Extend existing invite and plan-limit infrastructure; do not invent a parallel invite store or bypass `invitesSentThisMonth`.
- **Constraint:** Scoring must be deterministic and unit-testable (same inputs → same ranking); no opaque model calls in v1.
- **Constraint:** Do not conflate this feature with freelancer job-match APIs; keep client←→freelancer direction explicit in naming (`smart-match` / `match-candidates` style).
- **Non-goal:** Optimizing GeekScore algorithm or changing Geek Tiers.
- **Non-goal:** Guaranteeing invite acceptance or bid placement — only improving invite targeting and speed.
- **Non-goal:** Real-time collaborative multi-seat “team picks a match” UX (team seats exist on plans but are out of this epic).

---

> Note: no User Stories or Test Cases in Part A — those live in `releases/epic_0.0.1/qa.md` (Step 3+).

---

<!-- PART B — PLAN (Step 3). Appended below Part A; do not rewrite Part A. -->

## Proposed Solution

Planning used **graphify** (`query` / `explain` / `path` on `web/graphify-out`) plus **scoped reads** of `web/repomix-output.xml` (never the full pack) to confirm real touchpoints: `POST` in `src/app/api/invites/route.ts` (auth → owner/open-job checks → `getPlanConfig` invite quota → insert + `job_invite` notification), plan limits in `src/lib/plans.ts`, client invite UX in `InviteToBidModal.tsx` / `TalentPool.tsx`, open-job surfaces in `MyJobsSection.tsx` and `src/app/jobs/[id]/page.tsx`, and existing skill-% helpers only on the **freelancer→job** path (`/api/jobs/recommended`, `/api/freelancer/match-radar`) — which we do **not** reuse as the product surface, but can mirror for skill-overlap math.

**Approach (confirm-then-send, rule-based, reuse invites):**

1. **Pure scoring module** (`src/lib/smart-match.ts`) — deterministic weighted score (A5): skills overlap **50%**, win rate **30%**, bid-history quality **20%**. Inputs are plain data (job skills, freelancer skills, bid/acceptance aggregates); output is `{ score, breakdown: { skills, winRate, bidHistory } }` on a 0–100 scale. Unit-testable with no Mongo.

   - **Skills:** `overlap = |skills ∩ skillsRequired| / max(|skillsRequired|, 1)` → 0–100. Same direction as recommended/match-radar, but job is the reference set (client←freelancer).
   - **Win rate:** reuse dashboard semantics — `acceptedBids / uniqueJobsBid` (accepted = job `acceptedBy === freelancerId`), 0–100; freelancers with zero bids score 0 on this component (not NaN).
   - **Bid history:** among the freelancer’s past bids on jobs that share ≥1 skill with the target job, fraction that ended accepted / completed positively (acceptedBy or job status completed with that freelancer), 0–100; if no similar-skill history → 0.
   - **Final:** `round(0.5*skills + 0.3*winRate + 0.2*bidHistory)`; sort desc; ties broken by higher GeekScore then name.

2. **GET match API** — `GET /api/jobs/[id]/smart-match` (owner-only, job `status === "open"`, non-direct). Loads freelancers (`role === freelancer`), excludes already-invited and already-bid for that job (A7), scores via the helper, returns ranked list with breakdown. **Free may call this** (teaser, FR-8). Response includes `topN` from plan config and `canAutoInvite` boolean.

3. **Batch invite API** — `POST /api/jobs/[id]/smart-match/invite` with `{ freelancerIds: string[] }`. Plus/Premium only (FR-7); Free → 403 upgrade message. Cap selection to tier `smartMatchTopN` (A1). For each ID, call a **shared invite-creation helper** extracted from today’s `POST /api/invites` (same open-job / owner / duplicate 409 / plan `invitesSentThisMonth` / notification rules — A6, FR-6). Stop when monthly quota is exhausted; response `{ sent, skippedQuota, errors[] }` (FR-9). No invites without this confirmed POST (A3).

4. **Plan config** — extend `PlanConfig` / `PLANS` in `plans.ts` with `smartMatchTopN`: Free `0` (preview only), Plus `5`, Premium `10` (A1–A2). Does not change `invitesPerMonth` numbers.

5. **UI** — new `SmartMatchModal`: fetch ranked list, default-select top N (editable deselect, cannot exceed N), Confirm sends batch invite. Entry: primary button on open jobs in `MyJobsSection` and client-owned open job detail (`jobs/[id]`); secondary optional CTA on `TalentPool` (A8). Free sees list + upgrade CTA, disabled confirm.

**Out of implementation path:** do not alter `RecommendedCarousel`, `/api/jobs/recommended`, or match-radar; do not auto-invite on job post.

## Complexity Assessment

| Signal | Value |
|---|---|
| Files touched | **8+** (new lib + 2 API routes + modal + plans + invites extract + MyJobs + job detail; optional TalentPool) |
| Independent deliverable units | **3** (scoring lib, match/batch APIs + invite helper, client UI/entry points) — could be reviewed separately but ship on one branch |
| Cross-cutting concern? | **Yes** — auth (`authenticateRequest`), plan gating (`plans.ts` / `getPlanConfig`), invite + notification data path (`invites` collection); graphify shows invites route tightly coupled to plans + auth |
| New external dependency / migration? | **No** DB migration; may add a minimal `node --test` (or vitest) script only — no Playwright/new SaaS deps |
| **Verdict** | **Complex** |
| Confirmed with developer? | **Yes — matched Complex** |

**Rubric reason (for parent Step 5):** Complex because files ≫ 3 and the work cross-cuts auth, plan limits, and the invite write path — any one Complex signal is enough.

## Sub-Task Index (complex work only — see Step 4)

> Tracking labels only — **all code ships on the single parent branch `epic_0.0.1`** (no `epic_0.0.1.{sub_n}` branches / stacked PRs).
>
> Parent creates GitHub sub-issues under #1 and fills Sub-Issue # below.

| Sub-Issue # | Version Tag | Title | Status |
|---|---|---|---|
| #2 | `epic_0.0.1.1` | Scoring lib + unit tests + smartMatchTopN on plans | ⬜ |
| #3 | `epic_0.0.1.2` | Invite helper extract + GET/POST smart-match APIs | ⬜ |
| #4 | `epic_0.0.1.3` | SmartMatchModal + My Jobs / job detail (+ optional TalentPool CTA) | ⬜ |

## Scope

### Files to Create
| # | File Path | Purpose |
|---|-----------|---------|
| 1 | `web/src/lib/smart-match.ts` | Deterministic score + breakdown helpers; eligibility filter helpers (pure where possible) |
| 2 | `web/src/lib/smart-match.test.ts` | Unit tests for 50/30/20 scoring edge cases (`node --test` or equivalent) |
| 3 | `web/src/lib/create-job-invite.ts` | Shared invite create used by `POST /api/invites` and smart-match batch (quota, 409, notification) |
| 4 | `web/src/app/api/jobs/[id]/smart-match/route.ts` | `GET` ranked candidates for job owner (Free teaser allowed) |
| 5 | `web/src/app/api/jobs/[id]/smart-match/invite/route.ts` | `POST` confirm-then-send batch; Plus/Premium + top-N + quota |
| 6 | `web/src/components/feed/SmartMatchModal.tsx` | Ranked list UI, selection, confirm / Free upgrade CTA |

### Files to Modify
| # | File Path | What Changes |
|---|-----------|-------------|
| 1 | `web/src/lib/plans.ts` | Add `smartMatchTopN` per tier (0 / 5 / 10); keep existing `invitesPerMonth` |
| 2 | `web/src/app/api/invites/route.ts` | Delegate `POST` body to `create-job-invite` helper (behavior-preserving refactor) |
| 3 | `web/src/components/feed/MyJobsSection.tsx` | “Smart Match” action on open (non-direct) client jobs |
| 4 | `web/src/app/jobs/[id]/page.tsx` | Client-owner open-job entry to open `SmartMatchModal` |
| 5 | `web/src/components/feed/TalentPool.tsx` | Optional secondary CTA to Smart Match for a selected open job (A8) |
| 6 | `web/package.json` | Add `"test"` script for unit runner if introducing `node --test` / vitest |

### Files to Delete
| # | File Path | Reason |
|---|-----------|--------|
| — | None | — |

## Implementation Steps

1. Add `smartMatchTopN` to `PLANS` / `PlanConfig` in `plans.ts` (Free 0, Plus 5, Premium 10).
2. Implement `smart-match.ts` score formula + unit tests (skills / win rate / bid history / weights / eligibility sorting).
3. Extract `create-job-invite.ts` from current `POST /api/invites`; wire invites route through it without changing external contract.
4. Implement `GET /api/jobs/[id]/smart-match`: auth, owner, open job, load freelancers + invites + bids, score, return ranked + `canAutoInvite` / `topN`.
5. Implement `POST .../smart-match/invite`: plan gate, top-N cap, loop `create-job-invite`, partial quota handling, structured response.
6. Build `SmartMatchModal` (list, breakdown, deselect, confirm / upgrade); wire MyJobs + job detail (+ optional TalentPool CTA).
7. Manual/API smoke against Free / Plus / Premium: preview, reject Free confirm, Plus N=5, quota exhaustion message, skip already invited/bid.

## Risk Areas

- **Estimated effort**: Medium–High (new API surface + plan gating + UI; invite refactor must stay behavior-compatible).
- **Risk areas**:
  - **Invite refactor regressions** — extracting `create-job-invite` could break single-invite / race / unique-index 409 handling; keep atomic quota increment semantics from today’s route.
  - **Win-rate / bid-history data cost** — scoring many freelancers may need careful aggregation queries (batch bids by freelancerId) to avoid N+1; cap candidate pool if needed (e.g. skill-overlap > 0 first, then score top K).
  - **Plan fallthrough** — unknown/legacy plans already map to Free via `getPlanConfig`; auto-invite must treat that as locked (FR-7).
  - **No existing test harness** — `package.json` has only `lint` / Next scripts (no Playwright/vitest/jest); unit tests need a minimal runner; UI verified manually.
  - **Quota partial sends** — UX must clearly show sent vs skipped so clients do not assume all selected invites went out.

---

> ⏸️ **Developer: Review and approve Part A + Part B, and the `qa.md` skeleton
> (Step 3/4), before development begins (Step 5 gate).**
>
> **If a developer-requested change alters Part A (scope, acceptance
> criteria, expected behavior) — not just Part B implementation detail —
> edit Part A in this same file first, then regenerate the affected rows
> in `qa.md`. Never edit `qa.md`'s stories/cases out of sync with Part A.**
