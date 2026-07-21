# GeekBid — UI Enhancement Plan (bklit.com + motion.dev + Anime.js research)

Status: **DRAFT FOR REVIEW** — research only, no code changed. This is a companion doc to
`SAAS_SUBSCRIPTION_PLAN.md`. The modal exit-animation item from §4 has since been implemented
(see §7) using the zero-dependency approach this doc recommends.

## 1. What was researched and why

You asked for research into three sites as potential sources of "cooler" UI for the landing
page, feed pages, or other sections:

- **[bklit.com/docs/components](https://bklit.com/docs/components)**
- **[motion.dev](https://motion.dev/)**
- **[animejs.com](https://animejs.com/)**

All three were fetched and cross-referenced against what's actually in the codebase already
(the landing/feed redesigns done earlier this session), so the recommendations below are
specific to real gaps, not generic "add more animation" advice.

## 2. What each one actually is

- **bklit** is an installable **npm chart component library** — 17 chart types (Area, Bar,
  Candlestick, Line, Live Line, Pie/Donut, Radar, Gauge, Heatmap, Sankey, Scatter, Sunburst,
  etc.) plus supporting primitives (Legend, Grid, Tooltip, Axes, Brush, a `useChart` hook).
  It's a **data-visualization** library, not an animation/motion library.
- **motion.dev** is the **Motion** library (formerly Framer Motion) — a React/JS animation
  library: independent transform props, native hover/press/drag gestures, automatic
  layout-change animation (`layout` prop), real spring physics, exit animations
  (`AnimatePresence`), and scroll-linked animation.

These solve two different problems. bklit is worth considering; motion mostly duplicates
work already done by hand in this codebase (see §3).

## 3. Codebase reality check — why this matters

The landing/feed redesign done earlier this session deliberately used a **zero-dependency,
CSS + ref-driven** approach rather than a library:

- `usePointerFine()` gates every mouse-following effect off entirely on touch devices
- `useRafThrottle` collapses `mousemove` handling to one write per animation frame
- Tilt/glow/mouse-position hooks write CSS custom properties (`--rx`, `--ry`, `--mx`, `--my`)
  directly via `el.style.setProperty(...)` — **never React state** — so nothing re-renders on
  hover, keeping it at 60fps for free
- `useCountUp` / `useSlotDigits` are hand-rolled rAF-based easing functions
- Every chart in the app today is **raw hand-authored SVG** — most notably the "Price
  Trajectory" chart on the job detail page (`web/src/app/jobs/[id]/page.tsx`, ~lines 692–755),
  which manually computes `<polyline>` points for two competing price-decay scenarios, with
  glow filters and dashed projection lines, but **no axes, no tooltips, no legend** — because
  building those by hand is a lot of bespoke SVG math for marginal payoff.

This matters for the recommendation below: motion.dev would mostly re-solve problems already
solved by hand at zero bundle cost. bklit solves something that was never attempted by hand
for good reason (real charting is genuinely tedious to hand-roll well).

## 4. Recommendations, ranked by impact

### 1. Job detail "Price Trajectory" chart → bklit Live Line Chart
**File:** `web/src/app/jobs/[id]/page.tsx:692-755` · **Impact: High · Complexity: Medium**

The clearest win. This is a genuine data-viz gap (no tooltips, no axes today), isolated to
one component, and doesn't touch anything else. The existing "LIVE" badge already implies a
live-updating chart — bklit's Live Line Chart is a direct fit. This would be my pick for a
first, standalone follow-up if you want to try adding this dependency.

### 2. Category/market breakdown charts in `CompetitorAnalysis.tsx` and `MarketIntel.tsx`
**Impact: High · Complexity: Medium**

These currently render per-category price/competition stats and "hot skills by demand"
rankings as plain text/div-bar rows. A bklit Bar Chart or Radar Chart (for multi-category
comparison) would visually upgrade the platform's biggest analytics surface without
restructuring the surrounding layout.

### 3. KPI trend visuals in `SpendAnalytics.tsx` / `FreelancerStats.tsx`
**Impact: Medium · Complexity: Small**

Win-rate and budget-utilization are currently plain numbers. A small bklit Gauge or Ring
Chart would add visual weight without any structural change to these components.

### 4. GeekScore ring — leave it alone
The existing hand-stroked SVG ring (`<circle>` + `stroke-dasharray`) is already small, clean,
and used in several places (profile, TalentPool, bid tables). Swapping it for a chart-library
component would add a dependency for something that already works well — not worth the churn.

### 5. motion.dev's `layout` prop for the sliding tab indicator
**File:** `web/src/components/feed/MyJobsSection.tsx` · **Impact: Low-Medium · Complexity: Small**

The one place motion.dev would genuinely earn its cost. The tab indicator today is manually
computed via `tabRefs`/`offsetLeft`/`offsetWidth` in React state — motion's `layout` prop
would replace that measurement code with automatic FLIP-style animation. Nice-to-have, not
urgent, and easily deferred or skipped.

### 6. `AnimatePresence` for modal exit animations
**Files:** `DirectHireModal.tsx`, `InviteToBidModal.tsx`, `MessageFreelancerModal.tsx` ·
**Impact: Medium · Complexity: Small-Medium**

These modals currently have an enter animation (`animate-fade-in`/`animate-scale-in`) but no
exit animation — they likely just unmount instantly on close. `AnimatePresence` would add a
real closing transition. Equally achievable without a new dependency (a CSS transition + an
`isClosing` state flag, same pattern already used elsewhere in this codebase) if you'd rather
not add motion.dev just for this.

### 7. Anime.js — evaluated, not recommended

**[animejs.com](https://animejs.com/)** (Anime.js v4, ~24.5KB modular) offers timeline
sequencing, SVG shape-morphing/line-drawing, staggering, spring easing, a scroll-observer API,
and physics-based draggables — via an **imperative** API (`animate()`, `createTimeline()`,
`createDraggable()`) with no React-specific bindings, meaning the same manual
wiring-via-refs/effects burden as the codebase's existing hand-rolled hooks, just with a
library underneath instead of raw rAF/CSS.

Checked against the codebase for a genuine gap:
- **Staggered entrance** — already fully implemented everywhere via plain inline
  `transitionDelay`/`animationDelay` math (`Features.tsx:17,22`, `HowItWorks.tsx:17,23,59`).
  No gap.
- **SVG path-drawing** (`stroke-dashoffset` line-draw) — the one place this would apply is
  the job detail page's hand-rolled Price Trajectory `<polyline>` sparkline
  (`jobs/[id]/page.tsx:692-755`) — but that's the exact chart recommendation #1 above already
  proposes replacing wholesale with bklit's Live Line Chart. The gap is closed by the bklit
  recommendation, not by adding a second library on top of it.
- **Timeline sequencing / draggables / scroll-linked animation** — nothing in the app needs
  multi-step sequencing or drag interactions today.

**Verdict: do not add.** Same "safer and free" test motion.dev failed — no genuine capability
gap remains once bklit is factored in, and its imperative API has no ergonomics advantage over
the existing ref-based hooks.

## 5. Dependency verdict

- **bklit: worth adding.** It solves a real, currently-unsolved problem (no proper charting —
  today's charts are hand-rolled SVG with no axes/tooltips). Recommend starting with just #1
  (Price Trajectory chart) as a contained trial before using it more broadly.
- **motion.dev: not recommended as a general addition.** Nearly everything it offers here is
  either already built by hand at zero bundle cost (tilt, glow, mouse-follow, count-up), or
  cheaper to add as another 10–20 lines of CSS+ref code following the existing pattern than to
  pull in a new animation runtime. The one exception (#5, sliding tab indicator) is optional
  and low-stakes either way.
- **Anime.js: not recommended**, for the same reason as motion.dev — see #7 above. Recommended
  final stack: keep the existing zero-dependency CSS+ref system as-is, add **only** bklit, and
  only for real charting needs (#1–#3).

## 6. Suggested next step

If you want to move forward, the smallest safe trial is: add `bklit` as a dependency and
replace just the Price Trajectory chart (#1) on the job detail page. That validates the
library's API/bundle cost against a single, isolated component before deciding whether to
extend it to CompetitorAnalysis/MarketIntel (#2) or SpendAnalytics (#3).

## 7. Shipped: modal exit animations (recommendation #6, zero-dependency route)

Implemented directly, no new dependency:

- Added `fade-out`/`scale-out` keyframes to `web/src/app/globals.css`, mirroring the existing
  `fade-in`/`scale-in` entrance pair.
- `DirectHireModal.tsx`, `InviteToBidModal.tsx`, `MessageFreelancerModal.tsx` each got an
  `isClosing` state flag and a `handleClose()` wrapper (sets `isClosing`, then calls the real
  `onClose` after a 180ms `setTimeout` matching the exit animation's duration) — every close
  path (backdrop click, X button, Cancel button, post-success close) now routes through it, so
  every way of dismissing a modal gets the same exit transition.
- Verified with `tsc --noEmit` (clean).
