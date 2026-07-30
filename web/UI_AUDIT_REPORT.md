# Landing Page UI Audit — GeekBid (`/`)

Audited live at `http://localhost:3000/` with Playwright MCP across desktop (1440px), tablet (768px), and mobile (390px) viewports. Scope: landing page only, including responsiveness.

---

## P1 — High severity

### 1. "Five stations" mechanism diagram — all node labels clipped/invisible — ✅ FIXED
**Where:** `web/src/components/landing/MechanismTrace.tsx` (the dark "Five stations, running continuously" section)
**Reproduces on:** desktop, tablet, and mobile — not a responsive-only bug.
**Status:** fixed — `viewBox` widened from `"0 0 600 160"` to `"-40 -20 680 200"` so all five labels sit fully inside the box. Verified by screenshot at 1440px and 390px: "Post", "Decay", "Bid", "Accept", "Escrow" all render in full.

The loop diagram's SVG has `viewBox="0 0 600 160"`, but the station label `<text>` elements are positioned right at or past the edge of that box:

```tsx
const STATIONS = [
  { label: "Post",    x: 100, y: 20,  anchor: "middle", dy: -14 },      // text y = 6   → clipped (above y=0)
  { label: "Decay",   x: 500, y: 20,  anchor: "middle", dy: -14 },      // text y = 6   → clipped (above y=0)
  { label: "Bid",     x: 580, y: 80,  anchor: "start",  dy: 4, dx: 14 },// text x = 594 → clipped (viewBox width = 600)
  { label: "Accept",  x: 300, y: 140, anchor: "middle", dy: 26 },       // text y = 166 → fully outside (height = 160)
  { label: "Escrow",  x: 20,  y: 80,  anchor: "end",    dy: 4, dx: -14 }// text x = 6, extends left of x=0 → clipped
];
```

Effect: "Post" and "Decay" show only the bottom half of their letters, "Accept" is almost entirely invisible below the diagram, and "Bid"/"Escrow" are reduced to a single stray character ("E" / a sliver) at the diagram's left/right edges. This is the most visible bug on the page — a labeled diagram in the hero-adjacent "mechanism" section where 4 of 5 labels are unreadable.

**Fix:** widen the viewBox to add padding, e.g. `viewBox="-30 -14 660 190"`, or pull the node coordinates inward so labels stay within `0–160`/`0–600`. Verify by screenshotting the section after the change — text should be fully visible at every node.

---

### 2. Testimonial avatars broken (CSP blocks the placeholder image host) — ✅ FIXED
**Where:** "Loved by freelancers and clients alike" section
**Console:**
```
Loading the image 'https://randomuser.me/api/portraits/...' violates the following
Content Security Policy directive: "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com"
```
All 3 testimonial avatars (Derek Olsen, Emma Johnson, Marcus Chen) render as empty gray circles instead of photos — every load, on every viewport.
**Status:** fixed — `web/src/components/landing/data.ts` already had `avatar` initials (`DO`/`EJ`/`MC`) and `CloudinaryAvatar` already had an initials-fallback path built in; the only problem was the dead `photo: "https://randomuser.me/..."` URLs being passed in. Cleared those three `photo` fields to `""`, so the component deterministically renders the initials circle instead of depending on an `onError` firing after a CSP block. Verified: console errors on the landing page dropped from 13 to 1 (the remaining one is the unrelated `/api/jobs` 500, item #6), and all three avatars now show clean initials.

---

## P2 — Medium severity

### 3. Pricing cards: uneven feature-list length leaves large empty gaps — ✅ PARTIALLY FIXED
**Where:** `web/src/components/landing/PricingSection.tsx` (landing-page pricing section; the dedicated `/pricing` route uses its own card markup and wasn't touched — same issue there was noted but not in this file's scope).
The "Plus" card has 8 feature bullets; "Free" has 5 and "Premium" has 6. Because all three cards share a row and stretch to equal height, Free and Premium ended up with a large dead-space gap between their last bullet and the CTA button.
**Status:** improved — the feature `<ul>` was `flex-1` (correctly pinning the CTA to a consistent baseline) but left all its slack below the last item. Added `flex flex-col justify-center` so the list is vertically centered within the available space instead: whitespace is now split above/below the list rather than dumped in one block, which reads as intentional instead of unfinished. A content-level fix (equalizing feature counts, or a "+N more" pattern) would close the gap further but wasn't done here — this was a pure layout tweak.

### 4. Mobile header has no way to reach nav links or Sign In
**Where:** landing page header at ≤390px width.
Desktop/tablet header shows: `How It Works · Compare · Pricing · Testimonials · Sign In · Get Started`. At mobile width, everything collapses to just the logo and a "Get Started" button — no hamburger/menu affordance appears, so mobile visitors have no way to reach **Sign In** (existing users must scroll the entire page hoping to find a login link, which doesn't exist below the fold either) or jump to How It Works/Compare/Testimonials. Confirmed via accessibility snapshot — those five nav items simply aren't present in the mobile DOM, not just visually hidden.
**Fix:** add a mobile menu (hamburger → drawer/sheet) that includes at minimum Sign In, since it's a completely different action from "Get Started."

---

## P3 — Low / informational

### 5. Next.js dev-tools indicator sits over bottom-left content
Not a production bug (`<nextjs-portal>` / "Open Next.js Dev Tools" button, dev-mode only), but it visibly overlaps the footer's first column ("The reverse-auction marketplace for freelance talent.") and the mechanism section heading on mobile, because that content is flush against the bottom-left corner with no safe-area padding. Purely cosmetic in dev, but if a real fixed widget is ever added there (chat bubble, cookie banner), it will collide the same way — worth giving bottom-left/bottom-right page content a little breathing room from the viewport edge.

### 6. `/api/jobs` returns 500 on every landing-page load
**Console:** `Failed to load resource: the server responded with a status of 500 @ /api/jobs`
**Root cause:** no `.env.local` in `web/` (only `.env.example`) — `NEXTAUTH_SECRET` and `MONGODB_URI` are unset, so any route touching auth/DB throws at module-eval time. The landing page itself doesn't visibly break (its hero/ticker numbers are static demo data), so this doesn't produce a visible landing-page bug today — but it's worth fixing so console output is clean and so any future landing-page section that does fetch real data doesn't silently fail. Not something I could fix without real DB/auth credentials.

---

## Verified non-issues (checked, ruled out)
- The typewriter "|" cursor in the login-page headline (not landing page, checked while scoping) — intentional typing animation, not a stray character.
- The dark "Five stations"/"Authority stream" full-bleed bands against an otherwise light page — intentional per the existing design system, not a broken dark-mode toggle.
- Footer text on `/pricing` appearing to touch the left viewport edge at tablet width — measured via `getBoundingClientRect`; the element is correctly inset and centered. Screenshot compression made it look clipped; DOM confirms it isn't.

---

## Motion-concepts artifact — analysis & tie-in to bug #1

Reference: [Five Designers, One Brief — GeekBid Motion Concepts](https://claude.ai/code/artifact/b828f333-703c-4a43-b57d-d5a8c58bcff5)

**What it is:** a motion-design brainstorm doc, not built code — 45 concepts total (5 designer "lanes" × 9 not-yet-built landing-page animation moments), framed as a menu to pick from. The five lanes: Minimalist, Data-viz, Playful/tactile, Cinematic scroll, Systems-diagram. Shared constraints across all five: accent is `#5b21b6` only (no gradients/neon/glow), headings weight 500 (never bold), pill buttons, sparse soft shadows, everything degrades to a static frame under `prefers-reduced-motion`.

**Direct tie-in to bug #1 above:** the doc's Section 3, "Mechanism trace," proposes ambient/traveling-dot animation for the **exact same Post→Decay→Bid→Accept→Escrow loop diagram** that has the label-clipping bug in `MechanismTrace.tsx`. All five designer takes in that section assume the node labels are legible and layer motion on top (ripples, traveling packets, pulsing nodes). Right now most of those labels are invisible, so any of these concepts would ship broken on top of a broken base. **Fix the viewBox clipping first, then layer motion on** — don't animate a diagram whose labels don't render.

**Which lanes fit GeekBid's brand** (per PRODUCT.md: "premium, confident... financial/trading terminal crossed with editorial marketplace," anti-references explicitly rule out generic-AI-SaaS motion):

- **Systems-diagram and Data-viz fit best.** Both treat motion as instrumentation (state-gated escrow, count-ups tied to real deltas, telemetry-style dot traversal) — the "trading terminal" read the brand wants, and the most differentiated of the five against generic SaaS motion.
- **Playful/tactile — avoid wholesale.** It leans on spring/bounce/overshoot easing (squash-and-stretch, "settle-bounce," rubber-stamp thud) on nearly every section, which conflicts with the project's own motion rule (ease-out-quart/quint, no bounce/elastic) and skews the tone younger/friendlier than "Sharp, Trustworthy" calls for.
- **Minimalist** is the safe fallback for anything shipped fast with zero risk of feeling busy — good default, but a full page of it reads a little flat.
- **Cinematic scroll** is the heaviest engineering lift (scroll-pinning, scrubbed progress) — worth spending on one or two high-value moments (the doc's own strongest picks: Section 2 case timeline, Section 7 payoff band) rather than all nine, or it fights the "restraint" side of the brand.

---

## Landing Page Consolidation & Motion Pass

### Scroll-length reduction

Measured via `document.documentElement.scrollHeight` at `http://localhost:3000/`, Playwright MCP, before any edits and again after all changes:

| Viewport | Before | After | Reduction |
|---|---|---|---|
| Desktop 1440×900 | 11,194px | 10,768px | 426px (3.8%) |
| Mobile 390×844 | 14,695px | 14,554px | 141px (1.0%) |

Desktop reduction is intentionally larger — the brief scoped consolidation to `≥1024px`, and mobile's small drop is a side-effect of tightening vertical rhythm (see below), not layout restructuring. Mobile section order/stacking is unchanged from baseline; verified via full-page screenshots (`mslice_0.png`–`mslice_9.png` in the repo root at the time of testing).

### Sections consolidated (desktop, ≥1024px)

- **`LiveAuctions` + `Categories`** (`web/src/app/page.tsx`): wrapped in `lg:grid lg:grid-cols-2` — "browse what's live" and "browse by category" now sit side by side instead of two consecutive full-width bands. Both components' card grids were switched from viewport-based Tailwind breakpoints (`sm:grid-cols-3`, `lg:grid-cols-3`) to **container queries** (`@container` on the `<section>`, `@[420px]:grid-cols-2 @[860px]:grid-cols-3` on the card grid) — necessary because Tailwind's `sm:`/`lg:` variants key off viewport width, not the actual ~650px column width these components render into once paired, so the old classes would have kept forcing 3-up card grids into a half-width column at desktop. Container queries make each grid respond to its own rendered width instead, correctly giving 2-up cards when paired and 3-up when either renders full-width (e.g. on a route that isn't paired). Also unified `Categories`' background to `lg:bg-white` and added `lg:border-l` so the two panels read as one row instead of a mismatched white/cream seam (their original standalone bg treatments were opposite of each other).
- **`CeilingToFloor` + `CaseTimeline`** (both "one job, start to finish" walkthroughs): **not** merged into a grid — `CeilingToFloor`'s desktop stage uses absolutely-positioned bid cards at fixed `%`/px coordinates (`web/src/components/landing/CeilingToFloor.tsx`) tuned for a ~1000px-wide stage; halving that width would collide adjacent bid cards (checked the math: at a ~600px column, cards at x=64%/86% with `max-w-[170px]` would overlap by ~38px). Instead applied **tightened vertical rhythm**: `CeilingToFloor` padding `py-24 sm:py-28` → `py-16 sm:py-20`, its redundant `border-b` removed (CaseTimeline's own `border-t` immediately below already serves as the divider), and `CaseTimeline` padding `py-16 sm:py-24` → `py-10 sm:py-14` with heading margin `mb-14` → `mb-10`. This is the "tightened rhythm" alternative the brief explicitly allowed for pairs where a forced grid would hurt readability.
- **`AuthorityStream` + `EscrowPerimeter`** ("140 bids" stat + escrow trust diagram): **attempted, then reverted.** Initially paired via `lg:grid-cols-2`, but visual review (both automated screenshot review and direct user feedback on a live screenshot) showed the pairing read poorly — `AuthorityStream`'s content is sparse (one stat, a tick chart, one line of text) next to `EscrowPerimeter`'s denser diagram+buttons, producing a lopsided panel with a large dead zone under the stat even after vertical centering. Reverted both components to full-width stacked sections (their original state); no residual pairing-only styling left behind (the `lg:flex lg:flex-col lg:justify-center` added to `AuthorityStream` for centering was removed along with the revert).

### Motion added

All new motion reuses the existing `useInView`/`useReducedMotion` hooks from `web/src/components/landing/hooks.ts` and the SVG `stroke-dasharray`/`stroke-dashoffset` draw-on-view idiom established in `MechanismTrace.tsx`.

- **`MechanismTrace.tsx` — Systems-diagram, "Five stations."** Rebuilt from a single perpetual 7s loop into the doc's literal two-phase state machine: a fast **burst** pass (`BURST_DUR_S = 1.6s`, one `<animateMotion>` + `<animate>` fading it out at the end) sweeps the loop once, with each station flashing in strict sequence via a new `mech-node-burst` keyframe (`web/src/app/globals.css`) delayed proportionally to its position on the path; a second, dimmer **idle** token then begins exactly when the burst ends (SMIL `begin="1.6s"`) and repeats indefinitely at a slow 6s pace, with nodes resting at the spec's 0.4 opacity via `mech-node-idle`. Reduced motion: the two `<animateMotion>` circles and both node keyframes are gated out entirely (`!reducedMotion && drawn`), leaving the loop path fully drawn and all 5 node labels at opacity 1 — a complete static frame (verified via `prefers-reduced-motion: reduce` emulation, screenshot `reduced-motion-mechanism.png`).
- **`EscrowPerimeter.tsx` — Systems-diagram, "Your money never leaves escrow until you approve."** Added a drawn SVG perimeter (`rect` with `stroke-dashoffset`) around the Escrow node that traces itself the instant the token arrives and `phase` becomes `"held"`, and fades out on release — a literal "firewall diagram" boundary reinforcing the existing state-gated token travel, rather than just a static border-color change. Reduced motion: `phase` is set to `"held"` immediately (pre-existing logic) and the perimeter's `transition: none` means it renders fully drawn on first paint, no partial-draw flash (verified, `reduced-motion-escrow2.png`).
- **`Categories.tsx` — Data-viz, "Talent for every kind of work."** Added a 7-point `Sparkline` per category card (new `trend` field on `Category` in `data.ts`), drawn via `stroke-dashoffset` gated on the same `inView`/stagger timing as the existing count-up (`ROW_STAGGER_S = 0.07`, i.e. the ~70ms row stagger the brief called for). Also added a small pulsing dot on the sparkline's latest point (`spark-pulse` keyframe) after a user spot-check flagged that the right-side category cards looked static/dead next to the left-side live-auction cards' continuous price-ticking — the pulse gives the aggregate readout the same "still alive" quality without fabricating a fake live interval on rollup stats. Reduced motion: line renders fully drawn (`strokeDashoffset: 0`, no transition) and the pulse `animation: none`.
- **`PricingSection.tsx` — Systems-diagram, ascending-stairs connector.** Added a right-angle stepped path (`stroke-dashoffset` draw, same mechanism as `CaseTimeline`'s rail) connecting Free → Plus → Premium above the cards, with a badge dot at each tier that changes fill color at a delay proportional to its position on the path. Fixed a bug caught during my own visual review before shipping it: the first version put badge `<circle>` elements inside the same `preserveAspectRatio="none"` SVG as the path, which non-uniformly stretches the coordinate space (needed so the path's x-positions track 3 unequal-aspect card columns) — this squashed the circles into visible ellipses. Fixed by moving the badges out to plain positioned `<span>` elements (percentage `left`/`top`) outside the distorted SVG, keeping only the path (which tolerates the stretch, being mostly straight segments) inside it. Reduced motion: path renders fully drawn and all three badges fully lit on first paint, no transition. Existing pricing-card bugfix (`flex flex-col justify-center` on the feature `<ul>`) is untouched.
- **`Nav.tsx` — Data-viz, logo hover.** Per the doc's spec ("nudges down 2px and springs back, 180ms, no bounce"), changed the logo mark's hover treatment from `scale-110` to `translate-y-[2px]` over `duration-[180ms] ease-out`. Scoped to the `markClassName` prop passed from `Nav.tsx` only — `Logo.tsx` itself (shared by non-landing pages) was not touched.
- **`FAQ.tsx`, `CaseTimeline.tsx`, `AuthorityStream.tsx`, `PayoffBand.tsx`** were reviewed against their spec'd designer takes and found to already implement them closely (grid-template-rows accordion + rotating "+", path-driven node lighting, tick-collapse-to-survivor, staggered log-line reveal) — left as-is rather than churned for cosmetic-only deltas.

### New issues found and fixed during verification

1. Squashed-ellipse badge dots in the pricing connector (above) — caught before considering the task done, not shipped broken.
2. Container-query breakpoint mismatch for the `LiveAuctions`/`Categories` pairing (above) — caught by inspecting computed `grid-template-columns` at the actual paired width, not just eyeballing a screenshot.
3. `AuthorityStream`/`EscrowPerimeter` pairing looked lopsided in practice despite being structurally sound — reverted per direct visual feedback rather than defended on principle.
4. No new console errors: verified 1 error before and after all changes, both viewports (`Failed to load resource: 500 @ /api/jobs`, the pre-existing, unrelated issue logged as item #6 above).

### Confirmation: original 3 bug fixes still intact

- `MechanismTrace.tsx` — `viewBox="-40 -20 680 200"` still in place; all 5 station labels (Post, Decay, Bid, Accept, Escrow) confirmed visible in both the burst and idle animation states and under reduced motion.
- `data.ts` — all three testimonial `photo` fields still `""`; `CloudinaryAvatar` initials fallback (DO/EJ/MC) confirmed rendering, no CSP image errors.
- `PricingSection.tsx` — `flex flex-col justify-center` on the feature `<ul>` still present; no dead-space regression from the new stairs connector, which sits above the cards, not inside them.
