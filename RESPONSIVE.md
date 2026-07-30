# Responsive / Mobile QA Prompt

Use this as a self-contained prompt (paste it in as-is) to run a full
mobile-viewport UX pass across GeekBid. Page list source of truth:
[`FRONTEND_PAGES.md`](./FRONTEND_PAGES.md) — sections 1–8 cover every
public/landing, client, freelancer, and admin/login page. Use that file
for the exact page list; don't re-derive it here.

---

## Prompt

> Test every page listed in `FRONTEND_PAGES.md` (sections 1–8: landing,
> auth, client + freelancer authenticated pages, and admin) at mobile
> viewport widths, for both the client and freelancer roles plus admin
> where reachable. For each page, check the items in the checklist below
> and fix anything that fails — this is a UX/layout pass, not a color
> pass (the sitewide retheme to "Pastel Indigo" is already done; don't
> re-touch colors unless a fix genuinely requires it, e.g. a contrast
> issue only visible at mobile width).
>
> Test at these viewports, in this order, using Playwright MCP
> (`browser_resize` before each page, or navigate fresh per viewport):
> - 390×844 (iPhone 12/13/14 baseline — treat this as the primary target)
> - 360×800 (common Android baseline — catches anything that only just
>   fits at 390 and breaks narrower)
> - 768×1024 (tablet/iPad portrait — the breakpoint where most
>   `md:`/`lg:` layout switches happen; check the transition itself,
>   not just the two end states)
>
> For every page: `browser_navigate`, `browser_resize`, then
> `browser_take_screenshot` (full page) and `browser_console_messages`
> (level "error") — zero console errors is a hard requirement, not
> optional. Log in as needed (client test account, freelancer test
> account) to reach authenticated pages; note in your final report if
> admin pages are blocked by missing admin credentials (same limitation
> noted in earlier sessions — code-review the admin pages' JSX/className
> for the same checklist items instead of a live screenshot if so).
>
> Work through the page list in `FRONTEND_PAGES.md` top to bottom. Group
> your fixes into logical commits (e.g. "nav/header fixes", "form/input
> fixes", "card/grid fixes") rather than one commit per page — most
> mobile bugs are shared-component bugs (navbar, buttons, cards) that
> show up identically across many pages, so fix once, re-verify across
> all affected pages, then commit. Don't stop after the first pass if
> you find shared-component bugs partway through — go back and
> re-screenshot earlier pages once a shared fix lands, since the same
> bug may have been present (and now fixed) there too without you having
> flagged it the first time.
>
> Report back with a per-page pass/fail table and a list of every fix
> made, referencing file paths and line numbers.

---

## Checklist — what "proper" means per page

### Header / navigation
- [ ] Logo mark is vertically centered in the header bar (not
  optically off-center due to padding/line-height mismatch with
  adjacent nav items or the hamburger icon)
- [ ] Logo (the shared `<Logo>`/`<LogoMark>`/`<LogoWordmark>` components
  in `web/src/components/Logo.tsx`) renders the full circular `< >`
  bracket mark + green online dot + two-tone "Geek"/"Bid" wordmark
  correctly at mobile width — mark isn't squished into an oval, the
  wordmark doesn't wrap onto its own line under the mark, and the gap
  between mark and wordmark stays consistent with desktop. Since every
  page now imports this one shared component, a bug here is sitewide —
  but flex/gap context differs per call site (nav bar vs. login side
  panel vs. mobile drawer vs. footer), so still spot-check each, don't
  assume "fixed once" covers every usage
- [ ] Logo doesn't collide with, or sit too close to, the
  hamburger/menu icon or any right-side avatar/icon at the narrowest
  tested width
- [ ] Hamburger menu icon is a proper tap target (≥44×44px hit area,
  per the existing `.touch-target` utility in `globals.css`)
- [ ] Mobile drawer/menu (if present) opens without layout shift,
  covers/dims the page correctly, and closes via both the X button
  and a backdrop tap
- [ ] Bottom tab bar (mobile-bottom-nav.tsx), where present, doesn't
  overlap page content — check the page's bottom padding/safe-area
  actually clears it (`.pb-safe` utility exists for this; confirm it's
  applied where needed)
- [ ] Active nav state (underline, color, bold) is visually clear at
  small sizes, not just barely-there

### Typography & spacing
- [ ] No text overflow, clipping, or unintended truncation — long job
  titles, freelancer names, email addresses, category labels all wrap
  or truncate gracefully (`line-clamp`, `truncate`, or wrapping), never
  spill outside their container or overlap a neighboring element
- [ ] No orphaned single words wrapping alone onto their own line in
  headings if avoidable
- [ ] Consistent spacing rhythm — cards/sections don't have visibly
  mismatched padding/margin between adjacent elements that should match
- [ ] Font sizes stay legible at 390px — nothing relies on a `lg:`/`xl:`
  size that never gets overridden for mobile and ends up too large or
  too small
- [ ] Icon+text pairs (buttons, labels, badges) keep proper gap/padding
  at mobile width — this is the same bug class as the `$` icon overlap
  found earlier (`.glass-input pl-10` losing to unlayered CSS); re-check
  every icon-prefixed input/button specifically, since that fix was
  verified on desktop width but not explicitly re-checked at mobile
- [ ] Category and skill labels don't overflow or clip now that the
  taxonomy is wider than the original tech-only set — `JOB_CATEGORIES`
  in `web/src/lib/utils.ts` now includes longer strings ("Graphics &
  Design", "Writing & Translation", "Video & Animation") than the old
  tech-only labels, and `SKILL_TAXONOMY` has 15 additional skills. Any
  fixed-width badge/pill/`truncate` sized against the old, shorter
  label set is a likely mobile overflow candidate — check job-card
  category badges, the Talent Pool skill tags, and admin job/user
  tables specifically

### Forms & inputs
- [ ] All inputs/textareas/selects are full-width and don't overflow
  their container or the viewport
- [ ] Textareas keep the card-radius override (`textarea.glass-input`)
  — verify no textarea reverts to pill-radius text-clipping at mobile
- [ ] Multi-step forms (post-job wizard) — step tabs/pills don't wrap
  awkwardly or overflow horizontally; the active-step indicator bar
  stays proportional
- [ ] Dropdowns/selects (category filter, skill search) open in a
  usable position — not clipped by the viewport edge or hidden behind
  other elements
- [ ] Buttons stack sensibly (don't stay side-by-side if that causes
  cramping) — check every "two buttons in a row" pattern (Log in/Sign
  up tabs, Aggressive/Competitive counter-bid suggestions, etc.)

### Cards & grids
- [ ] Multi-column grids (job cards, feed KPI cards, pricing tiers,
  talent pool cards) collapse to a single column (or appropriate
  reduced column count) at mobile width — no horizontal scroll, no
  cards squeezed unreadably narrow
- [ ] Card internal layout (price/effective-rate two-column rows,
  badge rows, footer meta row) doesn't wrap into a broken multi-line
  mess — check job cards specifically, they have the most packed
  internal layout of any component
- [ ] Modals (AuctionVictoryModal, FeaturedBoostModal, message/invite
  modals) fit within the viewport with room to scroll if content is
  tall, and don't get cut off top/bottom
- [ ] Tables (admin transactions/users/disputes, transaction history)
  either become horizontally scrollable within their own container
  (never causing the whole page to scroll sideways) or restructure into
  a stacked/card layout on mobile — confirm which pattern each table
  currently uses and that it actually works, not just "doesn't visibly
  break in a screenshot"

### Filter / pill rows
- [ ] Horizontal pill rows (Talent Pool skill filters in
  `TalentPool.tsx`, job category filters, "All / 🔥 Hot / ⚠ No Bids"
  segmented filters in `MyJobsSection.tsx`) don't overflow the viewport
  or force page-level horizontal scroll at mobile width — confirm each
  row either wraps cleanly onto multiple lines or scrolls horizontally
  *within its own container* (`overflow-x-auto` on the row itself, not
  the page)
- [ ] With the expanded skill taxonomy there can now be significantly
  more pills than before (e.g. Talent Pool showed 10+ skill-filter
  buttons in one row during testing) — re-check pill rows specifically
  for this, since they may have only been visually verified with the
  smaller pre-expansion skill set

### Charts & data visualizations
- [ ] Bar charts (client-side "Monthly Spend" in `SpendAnalytics.tsx`,
  freelancer-side earnings chart in `app/earnings/page.tsx`) fit their
  6 monthly columns within 390px width without the `$` value labels
  overlapping each other or wrapping — each column is a
  `flex-1 flex flex-col items-center` cell, so verify the label text
  size doesn't force a column wider than its fair share on the
  narrowest tested viewport
- [ ] Near-zero/empty-month bars (rendered at a fixed minimum height,
  not zero, when a month has $0) remain visually distinguishable from
  populated bars at mobile size — they shouldn't disappear entirely or
  become indistinguishable from the chart's baseline/gridline
- [ ] A client/freelancer with zero jobs/earnings in every month (the
  chart's fully-empty state) still renders its month labels and axis
  correctly rather than collapsing or hiding — check a fresh test
  account with no history, not just accounts with data

### Touch & interaction
- [ ] Every clickable/tappable element meets a reasonable minimum touch
  target size — small icon-only buttons (close, edit, delete) are the
  usual offenders
- [ ] No hover-only affordances that are unreachable on touch (e.g. a
  tooltip or action that only appears on `:hover` with no touch
  equivalent)
- [ ] Sliders (counter-bid amount slider) are usable with a thumb, not
  just a mouse — check the touch target of the slider handle itself

### Overall page-level checks
- [ ] No horizontal scroll on the page body at any tested width (the
  #1 most common mobile bug — check `document.documentElement.scrollWidth`
  vs `window.innerWidth` via `browser_run_code_unsafe` if a screenshot
  alone doesn't make it obvious)
- [ ] Page doesn't have dead/excess whitespace at the bottom that makes
  it feel broken or unfinished
- [ ] Sticky/fixed elements (nav bar, bottom tab bar, scroll-progress
  bar) don't stack on top of each other or leave a gap
- [ ] Animations/transitions that exist for desktop (hover-tilt cards,
  mouse-follow glow) correctly no-op on touch devices — confirm the
  existing `@media (hover: none), (pointer: coarse)` guards in
  `globals.css` are actually working, not just present in source

---

## Known bug pattern — off-center logo / tab-switcher (found & fixed on `/login`)

A real instance of this was found and fixed on the mobile `/login` page and
is worth checking for on every other page during this pass:

- **Logo not centered**: the mobile-only logo wrapper (`lg:hidden`) had no
  `justify-center`, so the logo sat left-aligned inside a full-width flex
  container instead of centered in the viewport. Fix: add `justify-center`
  to that wrapper. Check any page with a mobile-specific logo/header block
  for the same missing-`justify-center` pattern.
- **Log in / Sign up tab-switcher pill not centered**: the switcher used
  `inline-flex`, which sizes to content and left-aligns inside its parent
  instead of centering. Fix: change to `flex w-fit mx-auto lg:mx-0` so it's
  centered on mobile and reverts to left-aligned at the `lg:` breakpoint
  where the two-column layout takes over. Check every other
  two-button/pill-switcher pattern (role toggles, filter pills, step
  indicators) for the same `inline-flex`-without-centering mistake.

Both bugs were only visible at mobile width — desktop's `lg:` two-column
layout masked them. Treat "is it visually centered at 390px, not just
present" as a first-class check, not just "does it exist."

## Notes for whoever runs this

- This app has no dark-mode toggle (see `v18`'s README changelog) — if
  anything renders unexpectedly dark during this pass, it's very likely
  the same OS-`prefers-color-scheme` class of bug found before, not a
  new one. Check for a stray `dark:` Tailwind class before assuming it's
  a mobile-specific issue.
- Textarea radius, icon/input padding, and the `@layer components`
  cascade fix were verified once already but only at desktop width —
  treat mobile as a fresh verification pass for those, not an assumed-fixed.
- Keep this prompt in sync with `FRONTEND_PAGES.md` if the page list
  changes (new pages added/removed) — this file intentionally doesn't
  duplicate that list so there's one source of truth to update.
