# Planning — epic_TBD ({version})

> Generated: 2026-07-18
> Type: Epic
> GitHub Issue: (not created yet — Step 1)
> Branch: epic_TBD
> Status: intake
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

> Note: no User Stories or Test Cases in Part A — those live in `releases/{version}/qa.md` (Step 3+).
>
> **Part B (Proposed Solution, Complexity, Scope files, Implementation Steps) is intentionally omitted** — Step 3 only.
