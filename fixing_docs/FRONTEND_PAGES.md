# Frontend Pages — Color Theme Refinement Map

Scope: **color theme only** (Tailwind classes, CSS variables, hex/rgba colors,
backgrounds, borders, text/accent colors). No layout, no functionality, no
backend/CRUD changes — those stay exactly as-is.

Route files (`page.tsx`) are thin wrappers — actual markup/colors mostly live
in the imported component files, so both are listed together per page.
Covers **all** areas: public/landing, client, freelancer, and admin/login.

---

## 1. Public / Landing (unauthenticated)

- web/src/app/page.tsx
  - web/src/components/landing/LandingGate.tsx
  - web/src/components/landing/Nav.tsx
  - web/src/components/landing/Hero.tsx
  - web/src/components/landing/SocialProof.tsx
  - web/src/components/landing/PriceDecayShowcase.tsx
  - web/src/components/landing/PriceDecayDemo.tsx
  - web/src/components/landing/WhyGeekBidSection.tsx
  - web/src/components/landing/Testimonials.tsx
  - web/src/components/landing/CTA.tsx
  - web/src/components/landing/Footer.tsx
  - web/src/components/landing/Features.tsx
  - web/src/components/landing/Comparison.tsx
  - web/src/components/landing/HowItWorks.tsx
  - web/src/components/landing/PricingSection.tsx
  - web/src/components/landing/Stats.tsx
  - web/src/components/landing/ScrollProgress.tsx
  - web/src/components/landing/SectionDivider.tsx
- web/src/app/login/page.tsx (auth — used by both client & freelancer)
- web/src/app/pricing/page.tsx

## 2. Client + Freelancer (shared authenticated app pages)

- web/src/app/feed/page.tsx
  - web/src/components/feed/ClientFeed.tsx
  - web/src/components/feed/FreelancerFeed.tsx
  - web/src/components/feed/FreelancerJobCard.tsx
  - web/src/components/feed/FreelancerStats.tsx
  - web/src/components/feed/ActiveBidsTracker.tsx
  - web/src/components/feed/CompetitorAnalysis.tsx
  - web/src/components/feed/DirectHireModal.tsx
  - web/src/components/feed/EmptyState.tsx
  - web/src/components/feed/InviteToBidModal.tsx
  - web/src/components/feed/MarketIntel.tsx
  - web/src/components/feed/MessageFreelancerModal.tsx
  - web/src/components/feed/MyJobsSection.tsx
  - web/src/components/feed/RecommendedCarousel.tsx
  - web/src/components/feed/SkeletonCard.tsx
  - web/src/components/feed/SpendAnalytics.tsx
  - web/src/components/feed/SubscriptionWidget.tsx
  - web/src/components/feed/TalentPool.tsx
  - web/src/components/feed/AnimatedCounter.tsx
- web/src/app/inbox/page.tsx
  - web/src/components/CloudinaryAvatar.tsx
- web/src/app/notifications/page.tsx
- web/src/app/profile/page.tsx
  - web/src/components/AvatarUploader.tsx
  - web/src/components/CloudinaryAvatar.tsx
- web/src/app/profile/[id]/page.tsx
  - web/src/components/CloudinaryAvatar.tsx
  - web/src/components/feed/DirectHireModal.tsx
  - web/src/components/feed/InviteToBidModal.tsx
  - web/src/components/feed/MessageFreelancerModal.tsx
- web/src/app/settings/page.tsx
- web/src/app/team/page.tsx
  - web/src/components/CloudinaryAvatar.tsx
- web/src/app/post-job/page.tsx (client)
  - web/src/components/ai/AIDescriptionButton.tsx
  - web/src/components/ai/AIPricingAdvisor.tsx
  - web/src/components/PlanLimitBanner.tsx
- web/src/app/my-jobs/page.tsx (client)
  - web/src/components/modals/FeaturedBoostModal.tsx
- web/src/app/jobs/[id]/page.tsx
  - web/src/components/ai/AIBidEvaluator.tsx
  - web/src/components/ai/AIBidStrategist.tsx
  - web/src/components/modals/AuctionVictoryModal.tsx
  - web/src/components/PlanLimitBanner.tsx
- web/src/app/assessments/page.tsx (freelancer)
- web/src/app/earnings/page.tsx (freelancer)
- web/src/app/payments/page.tsx (client)

## 2b. Route-level boundary files (not in the original page list)

- web/src/app/error.tsx — uses `.glass-panel`, `.glass-input`, `.btn-primary`
- web/src/app/loading.tsx — global loading skeleton

## 3. Admin (separate layout/theme surface)

- web/src/app/admin/layout.tsx
  - web/src/components/admin/AdminKeyGate.tsx
  - web/src/components/admin/AdminSidebar.tsx
- web/src/app/admin/page.tsx
- web/src/app/admin/config/page.tsx
- web/src/app/admin/disputes/page.tsx
- web/src/app/admin/jobs/page.tsx
- web/src/app/admin/logs/page.tsx
- web/src/app/admin/transactions/page.tsx
- web/src/app/admin/users/page.tsx
  - web/src/components/CloudinaryAvatar.tsx

## 4. Shared chrome (every authenticated page)

- web/src/app/layout.tsx (root layout — fonts, `<Toaster>`, nav)
  - web/src/components/conditional-navbar.tsx
  - web/src/components/navbar.tsx
  - web/src/components/mobile-bottom-nav.tsx
  - web/src/components/ui/sonner.tsx (toast styling)

## 5. Shared primitives (used across all pages above)

- web/src/components/ui/avatar.tsx
- web/src/components/ui/badge.tsx
- web/src/components/ui/button.tsx
- web/src/components/ui/card.tsx
- web/src/components/ui/dialog.tsx
- web/src/components/ui/dropdown-menu.tsx
- web/src/components/ui/input.tsx
- web/src/components/ui/label.tsx
- web/src/components/ui/popover.tsx
- web/src/components/ui/progress.tsx
- web/src/components/ui/scroll-area.tsx
- web/src/components/ui/select.tsx
- web/src/components/ui/separator.tsx
- web/src/components/ui/sheet.tsx
- web/src/components/ui/skeleton.tsx
- web/src/components/ui/switch.tsx
- web/src/components/ui/table.tsx
- web/src/components/ui/tabs.tsx
- web/src/components/ui/textarea.tsx
- web/src/components/ui/tooltip.tsx

## 6. Global theme source (highest-leverage single file)

- web/src/app/globals.css — all `--color-*` / `--*` CSS variables (currently
  the "Royal Dark" palette: navy background `#080b14`, gold accent
  `#c9a84c`, cream text `#f0e8d4`). Most page/component colors resolve back
  to these tokens, so retheming starts here.

---

## 7. CSS files — full inventory (global vs. local)

This project has **exactly one CSS file, and it is global**. There is no
`tailwind.config.js/ts` (Tailwind v4 — config lives inline via `@theme
inline` in the same file) and no CSS Modules (`*.module.css`) anywhere in
`src`.

| File | Scope | Applies to |
|---|---|---|
| `web/src/app/globals.css` | **Global** — imported once in `web/src/app/layout.tsx` (`import "./globals.css"`), so it loads on every route, public and authenticated, client/freelancer/admin alike. | Every single page in sections 1–5 above. |

Everything else is **inline Tailwind utility classes** written directly in
each `.tsx` file's `className` (e.g. `bg-[#0d1120]`, `text-accent`,
`border-white/10`) — there are no other `.css`/`.scss` files to touch. So a
full retheme is two kinds of edits, both inside `globals.css` plus the
`.tsx` files:

1. **Token edits in `globals.css`** (highest leverage, changes propagate
   everywhere that references a CSS variable or a Tailwind utility built
   from `@theme inline`, e.g. `bg-primary`, `text-accent`, `border-border`).
2. **Component-class edits in `globals.css`** — named classes like
   `.card`, `.btn-primary`, `.job-card` etc. (table below) are defined once
   in `globals.css` and reused across many pages via `className`.
3. **Hardcoded hex/rgba edits directly in `.tsx` files** — some
   components use raw Tailwind arbitrary-value colors (`bg-[#0d1120]`,
   `border-[rgba(201,168,76,0.22)]`) instead of a token/class. These will
   NOT change just by editing `globals.css` and must be found/replaced in
   the component files themselves (grep for hex codes like `c9a84c`,
   `0d1120`, `080b14`, `f0e8d4` across `src/` to catch all of them).

### Named component classes in `globals.css` → which pages/components use them

| Class | Defined for | Used on |
|---|---|---|
| `.card` | generic card | jobs/[id], post-job, profile, profile/[id], MyJobsSection, RecommendedCarousel, SubscriptionWidget, TalentPool, landing CTA/PriceDecayDemo/Testimonials, ui/card.tsx |
| `.glass-panel` / `-sm` / `-lg` | panel container | almost every authenticated page (admin/*, assessments, earnings, inbox, jobs/[id], my-jobs, notifications, payments, post-job, profile, profile/[id], settings, team) + feed components + modals |
| `.glass-card` | elevated card | earnings, post-job, profile, settings, landing HowItWorks |
| `.grid-bg` | dotted background | admin layout, assessments, earnings, inbox, jobs/[id], my-jobs, notifications, payments, post-job, pricing, profile, profile/[id], settings, team, ClientFeed, FreelancerFeed, landing CTA |
| `.glass-input` | form input | admin/config, admin/disputes, admin/jobs, admin/transactions, admin/users, error.tsx, inbox, jobs/[id], my-jobs, payments, post-job, profile, settings, team, AdminKeyGate, DirectHireModal, MessageFreelancerModal |
| `.btn-primary` / `.btn-glass` / `.btn-ghost` | buttons | most pages/components, incl. landing Hero/Nav/CTA, admin, feed |
| `.nav-glass`, `.nav-link-active`, `.mobile-nav-overlay` | nav chrome | navbar.tsx, landing Nav.tsx |
| `.badge-active` / `-pending` / `-completed` / `-disputed` | status badges | admin/disputes, admin/jobs, admin/transactions, admin/users, jobs/[id], profile, team, payments |
| `.job-card` | job listing card | my-jobs, landing Features |
| `.finance-card`, `.terminal-amount`, `.tx-row` | financial UI | earnings, payments, team, admin/disputes, admin/jobs, admin/transactions, settings |
| `.auth-container` | login/auth shell | login/page.tsx (via inline style match — verify on edit) |
| `.chat-bubble-self` / `-other` | chat UI | inbox/page.tsx |
| `.admin-header`, `.dispute-high/-medium/-low` | admin chrome | admin/* pages |
| `.settings-key-display` | API key box | settings/page.tsx |
| `.profile-card`, `.geekscore-ring` | profile UI | profile/page.tsx, TalentPool.tsx |
| `.faq-item`, `.testimonial-card` | landing sections | landing HowItWorks/Comparison, Testimonials.tsx |
| `.victory-overlay` | auction win modal | payments/page.tsx, AuctionVictoryModal, FeaturedBoostModal |
| `.wizard-step`, `.wizard-progress*`, `.decay-curve-line` | job-post wizard | post-job/page.tsx |
| `.feed-*` (skeleton, glass-card, tilt-card, pulse-win, shake-outbid, tab-indicator, header-mesh) | feed dashboard | feed/* components (ActiveBidsTracker, ClientFeed, FreelancerFeed, FreelancerJobCard, FreelancerStats, CompetitorAnalysis, MarketIntel, MyJobsSection, RecommendedCarousel, SkeletonCard, SpendAnalytics, TalentPool) |
| `.landing-*` (mesh-bg, glass-card, tilt-card, gradient-shimmer, etc.) | landing page only | Hero, Features, HowItWorks |

### Recommended edit order for an accurate retheme

1. `web/src/app/globals.css` — swap the palette in `:root` and `@theme
   inline` (background/foreground/card/primary/accent/border/muted/etc.),
   then the component classes in the same file (`.btn-primary`, `.card`,
   `.badge-*`, `.job-card`, etc. — currently hardcoded to the old hex
   values rather than referencing the variables above them).
2. Grep `src/` for the old hex codes (`c9a84c`, `d4b55a`, `8a6e2f`,
   `080b14`, `0d1120`, `111625`, `050810`, `f0e8d4`, `a8997e`, `6b5f45`,
   `c0392b`, `2e7d52`, `4caf7d`) to catch arbitrary-value Tailwind classes
   in `.tsx` files that bypass the CSS variables — these live inside the
   component files listed in sections 1–5, not in `globals.css`.
3. Spot-check each page in sections 1–3 in the browser after the two
   passes above, since some components layer additional inline
   `rgba(...)`/gradient colors on top (see the "LANDING PAGE" and "FEED
   PAGES" additive blocks at the bottom of `globals.css`).

---

## 8. Font colors & headings — full audit (global vs. local)

**Headline finding: the CSS-variable/theme-token layer is barely used for
text color.** Out of every `text-*` color usage in the codebase, only
**2 instances** (`text-primary`, in 1–2 files) reference a theme token.
Everything else — **every heading, every paragraph, every label, on every
single page** — is a hardcoded Tailwind arbitrary-value hex/rgba baked
directly into the `.tsx` file's `className`. This is the single most
important thing to know before retheming: **editing `globals.css` alone
will change almost nothing that's visibly text-colored.** The real work is
a find-and-replace across `.tsx` files.

### 8.1 Font family — source of truth (this part IS global/clean)

- `web/src/app/layout.tsx` loads the two font files via `next/font/google`
  (Fraunces = serif, Plus Jakarta Sans = sans) and exposes them as CSS vars
  (`--font-fraunces`, `--font-jakarta`) on the `<html>`/`<body>` element.
- `web/src/app/globals.css` maps those to usable tokens:
  `--font-serif: var(--font-fraunces)…`, `--font-sans: var(--font-jakarta)…`,
  `--font-mono: 'Courier New', monospace` (hardcoded, not a Google font).
- Utility classes (also in `globals.css`, used directly in components):
  `.font-heading` (serif, weight 400) — **125 uses**, `.font-sans`/body —
  **44 uses**, `.font-serif` direct — **38 uses**, `.font-mono` — **21
  uses**, `.font-mono-il` — **11 uses** (settings API-key display, terminal
  amounts).
- To change typeface app-wide: only 2 files to touch (`layout.tsx` for the
  font import, `globals.css` for the var mapping). This part is genuinely
  global — no per-component overrides found.

### 8.2 Heading color — global rule exists, but is redundantly overridden inline

- `globals.css` has one blanket rule: `h1, h2, h3 { font-family:
  var(--font-serif); font-weight: 400; color: #f0e8d4; }` (lines ~171–175).
  There is **no rule for h4–h6** (none are used in the app — confirmed 0
  occurrences of `<h4>`/`<h5>`/`<h6>`).
- Tag counts: **25×** `<h1>`, **41×** `<h2>`, **22×** `<h3>`, across
  landing + app pages.
- In practice, most headings **re-declare the color inline anyway**,
  bypassing/duplicating the global rule:
  - `text-[#f0e8d4]` on **74** of the heading tags (same ivory as the
    global default — redundant but consistent)
  - `text-[#a8997e]` on **10** headings (muted/secondary variant)
  - `text-[#c9a84c]` on **4** headings (gold — emphasis headings)
  - `.text-gradient` on **2** headings (landing hero-style gradient text,
    gold→ivory, defined in `globals.css`)
  - The remainder just use size classes (`text-lg`/`text-xl`/etc.) and
    inherit the global `#f0e8d4`.
- **Practical implication**: changing the `h1,h2,h3{color:...}` rule in
  `globals.css` will only affect the headings that *don't* have an inline
  `text-[#f0e8d4]` override — i.e. most won't actually change. Both the
  global rule and the ~74 inline occurrences need updating together.

### 8.3 Every text color hex in use, where it comes from, and what it means

All of these are **local** (hardcoded per-file `text-[#hex]`), not theme
tokens, unless noted. Counts = total occurrences / distinct files:

| Hex | Role (by context) | Occurrences | Files | Source |
|---|---|---|---|---|
| `#f0e8d4` | Primary text / heading ivory | 296 | 69 | Local, mirrors `--color-foreground`/`--text-primary` in globals.css but not linked to it |
| `#a8997e` | Secondary/muted body text (also the CSS `body{color}` default) | 712 | 73 | Local, mirrors `--text-secondary` but not linked to it |
| `#c9a84c` | Accent/gold — links, active nav, emphasis, prices | 288 | 61 | Local, mirrors `--accent`/`--color-primary` but not linked to it |
| `#e57373` | Error/disputed text (lighter red) | 60 | 25 | Local only — no matching globals.css variable |
| `#050810` | Text-on-gold (e.g. button labels on `.btn-primary`) | 49 | 27 | Local, mirrors `--bg-dark` |
| `#4caf7d` | Success/completed text (green) | 34 | 17 | Local only |
| `#B02020` | Danger/error text — **different red from `#e57373` and `--destructive: #c0392b`** | 31 | 11 | Local only — 3rd distinct "error red" in the codebase |
| `#080b14` | Text-on-light / base bg used as text color | 15 | 8 | Local, mirrors `--bg`/`--surface-base` |
| `#C05B00` | Warning (burnt orange) | 6 | 1 | Local only, isolated to one file |
| `#e0a06e`, `#d8d8d8`, `#d8c589`, `#d4b55a`, `#a78bfa`, `#60a5fa`, `#8A9BAA`, `#6bcf95`, `#2F7D54`, `#0d0f1a` | One-off decorative/data-viz text colors (purple/blue dots, chart labels) | 1–2 each | 1–2 each | Local, scattered mostly in landing/feed data-viz components |

**Inconsistency flag**: the app already uses **three different reds** for
"error/danger/disputed" (`#c0392b` in the `--destructive`/`--danger`
CSS variables, `#e57373` inline in 25 files, `#B02020` inline in 11 files)
and **two different greens** for "success" (`#2e7d52` in CSS variables,
`#4caf7d` inline in 17 files). A retheme should pick ONE canonical
red and ONE canonical green and replace all variants — otherwise the new
theme will look inconsistent (some danger/success elements retheme,
others silently don't because they're a different hex nobody searched for).

### 8.4 Backgrounds & borders — same pattern, confirmed

Same story as text color, just for `bg-*` and `border-*`:

- Top `bg-[...]` values: `#c9a84c` (122×), `#111625` (112×),
  `rgba(201,168,76,0.12)` (68×), `#080b14` (50×), `#0d1120` (37×),
  `#050810` (17×), `#c0392b`/`#2e7d52` (12× each, status colors).
- Top `border-[...]` values: `rgba(201,168,76,0.22)` (149×),
  `rgba(201,168,76,0.35)` (42×), `#c9a84c` (23×), plus a stray
  `#8A8A9A` (6×, not part of the palette anywhere else — likely a
  leftover/inconsistent gray).
- Same conclusion: these are baked into `.tsx` files across every page
  group, not centralized. `globals.css` component classes (`.card`,
  `.btn-primary`, etc.) use the *same* hardcoded hex rather than the
  `--color-*`/`--*` variables defined a few lines above them in the same
  file — so even editing the variables at the top of `globals.css` won't
  cascade into `.card`, `.btn-primary`, `.job-card`, etc.

### 8.5 What's actually clean/global (small, safe wins)

- `::selection` color (globals.css, 1 rule, applies everywhere)
- `.glass-input::placeholder` color `#5a4e38` (globals.css, 1 rule)
- Scrollbar thumb/track colors (globals.css, 1 rule block)
- Font family switching (see 8.1 — genuinely centralized)

### 8.6 Bottom line for an accurate Claude Code retheme pass

Because token usage is ~0% for actual rendered color, the reliable
approach is a **global hex find-and-replace across `web/src`**, not a
CSS-variable edit:

```
c9a84c → new accent          (main gold, 700+ combined uses)
d4b55a → new accent-hover
8a6e2f → new accent-deep
f0e8d4 → new primary text / ivory
a8997e → new secondary/body text   (highest single count: 712)
6b5f45 → new muted text
080b14 / 050810 / 0d1120 / 111625 / 0a0e1a / 1a1f30 → new surface/bg ramp
c0392b / e57373 / B02020 → consolidate to ONE new danger red
2e7d52 / 4caf7d → consolidate to ONE new success green
```

Do the replace in `globals.css` first (defines the canonical values),
then repeat the same replacements across every `.tsx` file in sections
1–5 above (that's where ~95%+ of the actual occurrences live). Re-grep
each hex after to confirm zero remaining hits before calling a page done.

---

## 9. Revamp execution patterns — consolidated learnings

Everything below is synthesized from the full codebase audit (§1–8) plus
the new target theme in `NEW_THEME.md` (the "Pastel Indigo" system from
the Fable 5 mockups). This is the practical playbook for actually doing
the revamp, not just a map of what exists.

### 9.1 The codebase has two layers of color, and they're both needed

1. **`globals.css` component classes** (`.card`, `.btn-primary`,
   `.job-card`, `.badge-*`, etc.) — reused across dozens of files each.
   Editing these once gets you most of the *shared chrome* for free.
2. **Per-file arbitrary Tailwind hex** (`text-[#c9a84c]`, `bg-[#0d1120]`,
   `border-[rgba(...)]`) — the majority of actual color pixels on screen
   (§8.3–8.4). These do **not** inherit from `globals.css` and must be
   find-and-replaced file-by-file.
   **Pattern**: never assume editing `globals.css` finished a page —
   always re-grep the page's own `.tsx`/component files for the old hex
   codes afterward.

### 9.2 Shape tokens have the exact same two-layer problem — newly confirmed

Beyond the `--radius-*` variables in `globals.css`, there are **410
hardcoded arbitrary radius classes** directly in `.tsx` files: `rounded-
[6px]` (197×), `rounded-[3px]` (172×), `rounded-[2px]` (21×), `rounded-
[4px]` (20×) — these mirror the old sharp/flat `--radius-lg/md/sm` values
one-for-one but are **not linked to the variables**, so they won't change
just by editing `--radius-*`. Since `NEW_THEME.md` §3 calls for a full
shape-philosophy flip (sharp 2–6px → pill 99px buttons / 16–18px cards),
these 410 occurrences need the same grep-and-replace treatment as the
color hexes: `rounded-[6px]`→card radius, `rounded-[3px]`/`rounded-[2px]`
→ button/badge radius (effectively `rounded-full`), `rounded-[4px]` case-
by-case.

### 9.3 Shadows are a light footprint — quick, low-risk win

Only **9 files** reference any `shadow-*`/box-shadow at all (the rest rely
on the flat `--shadow-*: none` tokens in `globals.css`). Since the new
theme reintroduces soft shadows (`NEW_THEME.md` §1), this is one of the
cheapest, safest changes: update the `--shadow-*` tokens in `globals.css`
+ spot-check those 9 files, done — no wide `.tsx` sweep needed here,
unlike colors/radius.

### 9.4 The "additive" dark-mode effects layer is conceptually incompatible with the new theme — decide, don't just recolor

`globals.css` has two large "ADDITIVE" blocks (landing page, feed
dashboard — see the comment banners at the bottom of the file) plus **61
distinct** `animate-*`/`landing-*`/`feed-*` decorative classes: mesh-drift
backgrounds, glow orbs, scanlines, conic-gradient rotating borders, grain
overlays, glassmorphism blur, fake-cursor animation, ember particles. These
were purpose-built for the "Royal Dark" moody/premium aesthetic. The new
Pastel Indigo theme (`NEW_THEME.md` §1) explicitly has **no gradients, no
glow, near-invisible flat shadows, and a calm/boutique feel** — recoloring
these effects (e.g. swapping gold rgba for indigo rgba) will keep a "dark
sci-fi trading terminal" *motion language* under a pastel palette, which
will look mismatched. **Recommendation**: treat each of these 61 classes
as a keep/simplify/remove decision, not a recolor target — most (mesh-bg,
glow-orb, scanline, ember, fake-cursor, grain-overlay, conic rotating
borders) should likely be removed outright; a few (fade-in-up, scale-in,
skeleton-shimmer) are theme-agnostic motion and can stay as-is.

### 9.5 Text-on-accent inverts — a systemic, not per-file, change

Old theme: light gold accent → **dark** text on top (`#050810`, 49
occurrences / 27 files, e.g. `.btn-primary` label color). New theme:
darker indigo accent → **white** text on top (`NEW_THEME.md` §1/§7). This
is a clean, mechanical swap (`#050810` → `#ffffff` wherever it's used *as
a foreground color on an accent-colored surface* — verify each hit is a
text-on-accent case and not an unrelated near-black background use, since
`#050810` is also used standalone as a background in a few places).

### 9.6 Recommended page-by-page revamp order (risk/effort based)

1. **`globals.css` first** — token values (§7 mapping in this file,
   cross-referenced with `NEW_THEME.md` §7), component classes, shadows
   (§9.3), radius scale. This alone reskins shared chrome: nav, buttons,
   badges, generic `.card`/`.glass-panel` across every page for free.
2. **Shared chrome** (`layout.tsx`, `navbar.tsx`, `conditional-navbar.tsx`,
   `mobile-bottom-nav.tsx`) — small file count, visible on every page,
   good early confidence check.
3. **Auth/marketing surface** (`login`, landing page + its ~17 components,
   `pricing`) — highest visual stakes (first impression), but the landing
   page also carries the heaviest "additive" decorative-effects debt
   (§9.4) — budget extra time here for the keep/remove decisions.
4. **Core authenticated app** (`feed`, `jobs/[id]`, `post-job`, `my-jobs`,
   `inbox`, `notifications`, `profile*`, `settings`, `team`, `payments`,
   `earnings`, `assessments`) — the bulk of the hex/radius occurrences
   live here; mechanical grep-and-replace per §8.6/§9.1/§9.2.
5. **Admin** (`admin/*`) — separate layout/theme surface (§3), lowest
   traffic, do last; simplest visually (mostly tables/forms, few
   decorative effects).
6. **Final pass**: re-grep every hex in §8.6's list plus the 4 arbitrary
   radius values (§9.2) across all of `src/` — zero remaining hits is the
   done condition, not "looks right in the pages I checked."

### 9.7 Known open decisions before starting (from `NEW_THEME.md` §5)

Get these picked/confirmed before the bulk edit pass, since they affect
many files at once: `--surface-1` outer-canvas value, `--font-mono`
replacement family, primary-button hover color, and whether to add a
separate true-destructive red alongside the new theme's soft terracotta.
