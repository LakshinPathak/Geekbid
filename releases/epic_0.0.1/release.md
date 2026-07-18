# Release Notes — epic_0.0.1

> Release Date: 2026-07-18
> Type: Epic — New Feature
> GitHub Issue: #1
> Branch: epic_0.0.1 (merged into `v19` via PR #5)
> Sub-Tasks (if complex — see Step 4): #2, #3, #4

---

## Overview

Smart Match & Auto-Invite lets clients rank eligible freelancers for an open job with a deterministic skills / win-rate / bid-history score, preview the list on Free, and confirm-then-send a batch of invites on Plus (top 5) or Premium (top 10), reusing existing invite + notification semantics and monthly invite quotas.

---

## Changes

### Scoring (`web/src/lib/smart-match.ts`)

**What changed**: Pure rule-based match score (skills 50%, win rate 30%, bid history 20%) plus eligibility filter and ranking helpers, with unit tests.

**Why**: Deterministic, unit-testable ranking without LLM cost; mirrors product assumptions A4–A5 / A7.

**Technical Details**:
- `computeSmartMatchScore` / `rankFreelancersForJob`
- Excludes already-invited and already-bid freelancers
- `npm test` via `node --test` (11 cases)

### APIs + invite helper

**What changed**: Shared `createJobInvite`, `GET /api/jobs/[id]/smart-match`, `POST .../smart-match/invite`, plan field `smartMatchTopN`.

**Why**: One invite path for manual and batch sends; Free teaser vs paid auto-invite; quota-safe partial batches.

**Technical Details**:
- Free: GET preview OK, POST → 403 upgrade
- Plus topN=5 / Premium topN=10
- GET scopes candidates (skill overlap + cap 100) for scale
- Typed Mongo id helpers (`mongo-id.ts`) for CI typecheck

### UI entry points

**What changed**: `SmartMatchModal` plus Smart Match actions on My Jobs, job detail, and TalentPool (client open non-direct jobs).

**Why**: Discoverable confirm-then-send UX without surprising auto-sends (A3 / FR-5).

**Technical Details**:
- Default-select top N; deselect before Confirm
- Free shows Preview mode + pricing CTA (no Confirm send)

---

## Architecture Decisions

| Decision | Chosen Approach | Alternatives Considered | Rationale |
|----------|-----------------|-------------------------|-----------|
| Scoring | Rule-based 50/30/20 | LLM matching | Testable, cheap, matches existing skill-% direction |
| Invites | Reuse `createJobInvite` | Separate batch collection | Same quota/notification/409 behavior as manual invite |
| Free tier | Preview only (`smartMatchTopN=0`) | Limited Free invites | Monetization teaser without burning invite quota |
| Candidate load | Skill `$in` + GeekScore cap 100 | Score all freelancers | Addresses scale review Warning |

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| mongodb (existing) | workspace | Jobs, users, bids, invites |
| Next.js App Router | workspace | API routes + UI |

---

## Configuration Changes

| File | Change | Description |
|------|--------|-------------|
| `web/src/lib/plans.ts` | Modified | Added `smartMatchTopN` per plan |
| `web/tsconfig.json` | Modified | Exclude `**/*.test.ts` from `tsc` |

---

## Breaking Changes

None — backward compatible; Free clients gain preview only; paid clients gain optional Smart Match entry points.

---

## Testing Summary

| Metric | Value |
|--------|-------|
| Tests Run | 14 qa.md cases (unit 4 + api 8 + manual 2) + browser smoke |
| Pass Rate | 100% |
| Verdict | ✅ GO |

See `releases/epic_0.0.1/qa.md`.

---

## Deployment Notes

Merged to branch **`v19`** (squash PR #5, commit `ec7878d`). No env var changes required. Deploy/restart the Next.js app that serves `web/` as usual for that branch.
