# GeekBid Feed Pages — Premium Dashboard Redesign Plan

## Context

`/feed` (both the "Procurement Terminal" client view and "Mission Control"
freelancer view) currently works but looks flat — plain bordered rectangles,
no motion, spinner-only loading, no empty states. This plan upgrades the
visual layer only (glassmorphism, count-up KPIs, tilt cards, skeleton
screens, animated carousel, etc.) across all 17 existing feed files, with
zero functional/data-flow changes and zero new npm dependencies — mirroring
the approach already validated on the landing page redesign (`v15` branch).

Research already done (3 parallel Explore passes over all 17 files + live
browser screenshots of both feed views) surfaced facts that materially
change the plan below versus a naive reading of the original brief.

## Key facts from research (read before implementing)

1. **CSS class names in the brief don't match reality.** The brief says
   `job-card`/`glass-card` exist — they don't in these files. Actual
   classes in live use: `glass-panel`, `card` (RecommendedCarousel only),
   `btn-primary`, `btn-glass`. Verify exact bodies in `globals.css` before
   extending. All new "premium" styling must be **new** classes layered on
   via combined `className` (e.g. `glass-panel feed-glass-card`), never
   edits to these shared rule bodies — they're used site-wide.
2. **Two components are orphaned/dead code today**: `ClientJobCard.tsx`
   and `JobHealthMatrix.tsx` are NOT imported by `ClientFeed.tsx`.
   `MyJobsSection.tsx` has its own internal `MyJobCard` (lines 107-282)
   that duplicates the same layout and is what's actually rendered. Since
   the brief's file list explicitly includes the orphaned two, restyle
   them for consistency, but the **live** card to prioritize and verify
   visually is `MyJobsSection`'s internal `MyJobCard`.
3. **No skeleton/loading infrastructure exists** beyond one boolean each:
   `ClientFeed.tsx`'s `loading` (gates only `SpendAnalytics`) and
   `FreelancerFeed.tsx`'s `loadingApi` (gates only `FreelancerStats`).
   Everything else (job grid, carousel, tracker, talent pool) has zero
   loading awareness — sections just pop in/out based on array length.
   Plan: reuse these two existing booleans to drive new skeletons for the
   KPI row (already gated) and additionally pass them down to gate
   skeletons for the job grid / carousel / tracker — additive prop, not a
   new state machine.
4. **RecommendedCarousel already has scroll-snap + drag-to-scroll** (native
   `overflow-x-auto`, `scrollSnapType: "x mandatory"`, manual
   `onMouseDown/Move/Up` imperative `scrollLeft` writes, a `ResizeObserver`,
   `CARD_W = 284`). Enhance, don't replace — any new peek/parallax must not
   fight the existing imperative drag writes. `MyJobsSection.tsx` has a
   **separate**, similarly-built drag carousel (`CARD_W = 320`) for job
   cards — same care applies there independently.
5. **Modals have no shared wrapper** — `DirectHireModal`, `InviteToBidModal`,
   `MessageFreelancerModal` each hand-roll an identical backdrop (`fixed
   inset-0 z-50 ... backdropFilter: blur(4px)`) with zero enter/exit
   animation today. `globals.css` already has `.animate-scale-in` (line
   ~779) and `.animate-modal-enter` (~435) unused by these — applying them
   is a safe, additive one-line-per-modal change.
6. **ActiveBidsTracker** status is `"winning"|"outbid"|"pending"`; rank is
   plain text today (`Rank #{n}`), computed as bid-price ascending position
   (rank 1 = lowest price wins, reverse-auction). `cooldownMins` is computed
   once per render from `Date.now()` — **not reactive** — a live countdown
   visual needs the parent's existing `now` tick (already in store) passed
   down, or accept the non-live computation as today.
7. **CompetitorAnalysis** already renders bar-chart-style `<div>`s with
   inline `width: X%` (category price bars, skill demand bars) — animate
   these with a CSS transition on mount (`width 0 → target`) rather than
   introducing a chart library.
8. **TalentPool is already card-based** (CSS grid of divs, not a table) —
   the redesign is a restyle (bigger avatar, GeekScore ring, etc.), not a
   table→card structural change.
9. Every component redeclares its own **local, looser** `User`/`Bid`/
   `ActiveBid` interfaces instead of importing from `@/lib/utils` — this is
   pre-existing duplication; do not consolidate as part of this visual PR.

## File-by-file approach

### New shared files (small, additive — permitted by constraint #5)
- `components/feed/SkeletonCard.tsx` — shimmer skeleton matching job-card
  layout (border, title bar, 2 chip bars, price row) — CSS shimmer via new
  `@keyframes skeleton-shimmer` gradient sweep.
- `components/feed/AnimatedCounter.tsx` — `useCountUp`-style hook + wrapper
  (same rAF-easing pattern already proven on the landing page), reused by
  `SpendAnalytics` and `FreelancerStats`.
- `components/feed/EmptyState.tsx` — reusable `{icon/SVG, title, subtitle,
  ctaLabel?, onCta?}` component with a few simple inline SVGs (no external
  images), used by empty jobs/bids/talent-pool states.
- Do **not** touch `feed-helpers.ts` — it's pure logic (sorts/filters/
  types) shared elsewhere; keep animation-only helpers in the new files
  above instead.

### globals.css additions (new section, additive, ≥8 keyframes)
`skeleton-shimmer`, `kpi-count-glow` (brief flash on value change),
`tilt-lift` (hover lift shadow expansion — or reuse landing page's
`.landing-tilt-card` pattern), `card-border-rotate` (conic-gradient hover
border, reuse the same technique as the landing testimonials), `pulse-win`
(green glow for "winning" bids), `shake-outbid` (horizontal vibration),
`tab-indicator-slide` (or implement via CSS transition on `transform:
translateX` — may not need a keyframe, a transition suffices), `badge-pop`
(scale-in for filter count badge), `chip-bounce` (skill chip toggle).
Plus a `@media (prefers-reduced-motion: reduce)` block disabling all new
ones, and a `@media (hover: hover) and (pointer: fine)` guard for
tilt/parallax (mirrors the landing page's `usePointerFine()` pattern —
reuse that exact hook if convenient via a shared import, or duplicate the
small check locally to avoid cross-importing from `components/landing/`).

### Per-component visual pass (representative pattern, applies uniformly)
- **Headers** (`ClientFeed.tsx`, `FreelancerFeed.tsx`): add ambient gradient
  mesh div (reuse landing page's `mesh-drift` technique), gold shimmer line
  under header, time-of-day greeting (`new Date().getHours()` bucketed),
  "last refreshed" timestamp from the existing `fetchDashboard`/`fetchData`
  completion time + pulse dot.
- **KPI cards** (`SpendAnalytics.tsx`, `FreelancerStats.tsx`): wrap value in
  `AnimatedCounter`, add `backdrop-blur-md` + inner-shadow via new class,
  large faded icon behind number (absolute-positioned, low opacity), hover
  lift (`transform: translateY(-2px)` + shadow, transition-only).
- **Job cards** (`MyJobsSection`'s internal card, `FreelancerJobCard.tsx`,
  plus orphaned `ClientJobCard.tsx` for consistency): 3D tilt via CSS
  `perspective` + `--rx`/`--ry` vars set by a shared small `useTilt3D`-style
  hook (copy the landing page's proven implementation, touch-gated),
  conic-gradient rotating border on hover (new class, reuse landing's
  technique), price-decay pulse dot when `job.status==="open"`, heat glow
  color-coded by `bidCount` (reuse `getCompetitionBadge` from
  `feed-helpers.ts` for the bucketing, just add a color/glow mapping).
- **Filter toolbar** (`FreelancerFeed.tsx`): `showAdvanced` drawer already
  toggles — add a max-height/opacity CSS transition (grid-rows trick, same
  as landing FAQ) instead of instant show/hide; animated pop-in badge on
  the skill-count badge (`badge-pop` keyframe); skill chips get
  scale-bounce on toggle (className swap on click, transition-based).
- **Loading states**: pass `loading`/`loadingApi` down as an additive prop
  to `MyJobsSection`, `RecommendedCarousel`, `ActiveBidsTracker`,
  `TalentPool`'s card grid — render `SkeletonCard` × N while true, crossfade
  to real content via a simple opacity transition keyed on the boolean.
- **Empty states**: swap the plain "No jobs found" text blocks (
  `FreelancerFeed.tsx` line ~481, `MyJobsSection.tsx` line ~351) for
  `<EmptyState>` with an inline SVG + reset-filters CTA wired to the
  existing filter-clearing logic already in each file.
- **RecommendedCarousel**: keep existing scroll-snap/drag exactly, layer on
  gradient fade masks (already exist, just intensify), dot indicators
  already exist (enhance styling only), add a `NEW` badge pulse for jobs
  posted <24h (`postedAt` diff, new small helper, no store change).
- **ActiveBidsTracker**: rank badge with medal coloring (1st gold/2nd
  silver/3rd bronze via `rank` value → class map), `pulse-win`/
  `shake-outbid` classes keyed off existing `status` field, mini SVG
  sparkline — since there's no bid-price-history array passed in today,
  either (a) skip the sparkline (out of scope, no data), or (b) confirm
  with user whether `job.priceHistory` (exists on `Job` type per client
  card research) can be threaded through — **flag this as a data
  availability gap to confirm before building**, don't fabricate fake data.
- **MyJobsSection tabs**: replace static tab buttons with a sliding
  underline indicator (`position: absolute` bar, `transform: translateX`
  computed from active tab index + a ref per tab, transition-only, no new
  keyframe needed).
- **TalentPool**: swap the linear GeekScore bar for an SVG circular
  progress ring (`stroke-dasharray`/`stroke-dashoffset`, animated on mount
  via CSS transition — same technique as `.geekscore-ring` class already
  defined in `globals.css` per earlier audit note, check if reusable
  as-is), bump avatar `size` prop on `CloudinaryAvatar` from `sm` to
  `md`/`lg`.
- **Modals** (all 3): add `.animate-scale-in` to the box + a fade on the
  backdrop, nothing else — preserve every existing prop/close-handler
  exactly.

## Verification
- `cd web && npx tsc --noEmit && npx eslint src/components/feed/` after
  each batch of files.
- `npm run build` full production build.
- Playwright MCP is available this session — use it to actually click
  through both feed views (client: maya@startup.io / password123,
  freelancer: arjun@devmail.io / password123) post-change: check tab
  switching, modal open/close, filter toggling, carousel drag, and
  `prefers-reduced-motion`/mobile-width (320/375/428px) via
  `browser_resize`, plus `browser_console_messages` for errors.
- Confirm `/login`, `/admin`, `/jobs/[id]` etc. are untouched (feed
  components aren't imported elsewhere, per constraint #7).

## Open question before implementing
Sparkline chart in Active Bids Tracker needs bid-price-history data that
isn't currently passed to that component — confirm whether to thread
`job.priceHistory` through, or skip the sparkline.
