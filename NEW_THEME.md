# New Theme Spec — "Pastel Indigo" (from Fable 5 mockups)

Source: 4 mockup files in `Fable 5/` — freelancer feed, job detail, landing
hero, open jobs/market intel. All 4 were analyzed independently (one
sub-agent per file) and use **the exact same palette, type scale, and
component recipes** — this is one unified design system, not 4 separate
looks, which makes it safe to treat as a single source of truth.

This is a **complete inversion** of the current "Royal Dark" theme: dark
navy/gold/serif/flat → light cream/indigo/sans/soft-shadow/pill-everything.

---

## 1. Color palette

### Surfaces (light-mode, 3-tier depth)

| Token | Hex | Role |
|---|---|---|
| `surface-1` | **undefined in all 4 mockups** — see §5 gap | Outermost page canvas, wraps everything |
| `surface-2` (panel) | `#fbfaf7` | Warm off-white section/panel background (nav bar, hero card, page body) |
| `surface-3` (card) | `#ffffff` | Card/list-item background, sits on top of surface-2 |
| `surface-muted` | `#f4f2ee` | Muted stat tiles, neutral tag pills |
| `surface-input-bg` | `#f8f6f1` | Form boxes (e.g. counter-bid input container) |

### Accent (primary brand — deep indigo, replaces the old gold)

| Token | Hex | Role |
|---|---|---|
| `accent` | `#4b3f8f` | Primary CTA bg, active nav, links, large price/stat numbers, chart stroke endpoint |
| `accent-mid` | `#9c8fd8` | Progress-bar fill, chart line/dot, featured-card border, focus ring |
| `accent-soft` | `#c9c0e8` | Secondary/lower-priority progress fill, secondary chart series |
| `accent-tint-bg` | `#f0edfa` | Stat-tile bg, progress track, secondary-button bg, chart area fill |
| `accent-tint-bg-strong` | `#e3def7` | Active filter pill bg, notification bubble bg, badge bg |
| `accent-tint-text` | `#8b83a8` | Label text sitting on an accent-tinted tile |
| `accent-border` | `#d9d4e8` | Border for inputs/secondary buttons on tinted surfaces |
| `text-on-accent` | `#ffffff` | Text/label color on top of solid `accent` (e.g. primary button label) |

### Text

| Token | Hex | Role |
|---|---|---|
| `text-primary` | `#3d3a45` | Headings, primary values, emphasis — near-black plum-gray (never pure black) |
| `text-secondary` | `#8a8694` | Body copy, nav links, meta text |
| `text-body` | `#5f5b68` | Longer-form description/prose text (job description block) — sits between primary and secondary |
| `text-tertiary` | `#b3aec0` | Micro-labels, timestamps, placeholders — **low contrast by design, ≤12px only, see §6 a11y note** |
| `text-disabled` | `#d5d1dd` | Strikethrough / disabled values (e.g. "listed at" struck price) |

### Borders

| Token | Hex | Role |
|---|---|---|
| `border` | `#ece9e2` | Default card/panel/pill border (~universal) |
| `border-subtle` | `#f2f0ea` | Hairline divider inside cards, row separators |
| `border-accent` | `#d9d4e8` | Input border on tinted bg, outline-button border |
| `border-featured` | `1.5px solid #9c8fd8` | The *only* visual differentiator for a "featured/highlighted" card — no bg change, just a thicker accent border + stronger shadow |

### Semantic / status — deliberately **no saturated red or blue anywhere**

| Meaning | BG | Text/value | Notes |
|---|---|---|---|
| Success (match, earnings, "open" status, live dot) | `#e9f2e6` | `#4d7245` (value), `#6d9060` (label), `#9db894` (subtext), dot `#7fae72` | |
| Warning / premium / gold-tier | `#f3edda` / `#f2eee6` | `#a08a3c` | |
| Urgency / price-decay / "danger" | `#fbe9e4` | `#b06a56` (value), `#c4907e` (lighter) | **Terracotta, not red** — deliberate softening, even for negative price trends |
| Live/warning indicator dot | — | `#e0a23e` (amber) | |
| Neutral/low-comp badge | `#f2eee6` | `#8a8065` | |

### Shadows — soft, purple-tinted, used sparingly

| Token | Value | Usage |
|---|---|---|
| `shadow-default` | `0 2px 12px rgba(80,70,110,0.04)` | Most cards (very subtle — many inner cards have *no* shadow at all) |
| `shadow-elevated` | `0 2px 16px rgba(80,70,110,0.06–0.08)` | Featured/highlighted card, live-auction card |

Gradients: **none used anywhere** in any of the 4 mockups.

Data-viz / charts: only 2 series colors ever appear — `accent-mid`
(`#9c8fd8`) primary, `accent-soft` (`#c9c0e8`) secondary — on an
`accent-tint-bg` (`#f0edfa`) fill area. No red/green trend colors even for
negative price movement (uses the terracotta above instead).

---

## 2. Typography

- **Headings drop serif entirely.** All 4 mockups style headings as sans,
  weight **500 only** — no bold/700 appears anywhere in any file. This is
  a deliberate, consistent restraint (calm/boutique feel). This is a
  meaningful departure from the current app's Fraunces serif h1/h2/h3.
- `var(--font-mono)` is applied consistently across **all 4 files** to
  every numeric/price/data value (prices, stats, countdown timers, quotas)
  — never to labels or prose. This role is much bigger than in the current
  app. The mono family itself is not defined in any mockup (external
  dependency) — needs a pick, see §5.
- No named sans family appears either (inherited from a parent stylesheet
  not included in the snippets) — safe to keep the app's existing
  Plus Jakarta Sans, which already suits this weight-500-heavy, soft look.

### Scale (consistent across files)

| Use | Size | Weight | Color | Notes |
|---|---|---|---|---|
| Hero H1 | 37px | 500 | `#3d3a45` | line-height 1.16, letter-spacing -0.8px |
| Section title | 14–17px | 500 | `#3d3a45` | |
| Card title | 12.5–13px | 500 | `#3d3a45` | |
| Body/description | 12px | 400 | `#5f5b68` | line-height ~1.7 |
| Nav/meta text | 10–12.5px | 400 | `#8a8694` | |
| Micro-label/eyebrow | 8.5–11.5px | 500 | `#b3aec0` | uppercase-style, letter-spacing 1–1.5px |
| Large price/stat (mono) | 18–30px | 500 | `#4b3f8f` or `#3d3a45` | biggest text in any screen, always mono |

No literal `<h1>–<h3>` CSS beyond an `sr-only` heading in each file — visual
"headings" are styled `<div>/<span>` elements at weight 500. If porting to
the real app, this means: **stop relying on a global `h1,h2,h3{color}` CSS
rule** (see `FRONTEND_PAGES.md` §8.2) — the new design system styles
headings per-element by weight/size/color explicitly, matching how the
current codebase already (accidentally) does it via inline classes.

---

## 3. Shape & spacing — flat/sharp → soft/rounded (full philosophy flip)

| Token | Old (Royal Dark) | New (Pastel Indigo) |
|---|---|---|
| Buttons/badges/pills | 3px | **99px (fully pill-shaped)** — universal, zero exceptions across all 4 files |
| Cards | 6px | **16–18px** |
| Stat tiles / secondary panels | 3–6px | **12–14px** |
| Outer wrappers | 3px | **10–12px** |
| Progress bars | 1–2px | **2–3px** (kept small/thin) |
| Border width | 0.5px | 1px standard, **1.5px** only for featured-card emphasis |
| Shadows | `none` everywhere (flat design) | Soft, purple-tinted, used on ~half of cards |

Padding/spacing: generous and airy throughout — cards 13–18px, buttons
7–11px vertical / 13–24px horizontal, section gutters up to 28px, grid
gaps 8–24px. Whitespace-heavy compared to the current denser dark UI.

---

## 4. Component recipes (identical pattern in all 4 files)

| Component | Spec |
|---|---|
| **Primary button** | bg `#4b3f8f`, text `#ffffff`, radius 99px, weight 500, no border. No hover state visible in static mockups — needs a hover value picked (see §5). |
| **Secondary/outline button** | bg `#f0edfa`, text `#4b3f8f`, border `1px solid #d9d4e8`, radius 99px |
| **Ghost/text link** | no bg/border, text `#4b3f8f` |
| **Badges/pills** (all semantic variants) | uniform recipe: tinted bg + matching saturated text of the same hue, radius 99px, 8.5–11px font |
| **Card (default)** | bg `#ffffff`, border `1px solid #ece9e2`, radius 16px, `shadow-default` (or none on inner/nested cards) |
| **Card (featured/highlighted)** | same as default but border → `1.5px solid #9c8fd8`, shadow → `shadow-elevated`. **This is the only differentiator** — no background-color change for "featured" state. |
| **Input field** | bg `#ffffff` (or `#f8f6f1` in a bordered container), border `1px solid #ece9e2` (or `#d9d4e8` on tinted bg), radius 99px (pill), mono font for numeric inputs |
| **Progress/decay bar** | track `#f0edfa`, fill `#9c8fd8` (or `#c9c0e8` for secondary/lower-priority rows), radius 2–3px, sometimes a white-ringed accent dot marks current position |
| **Nav bar** | bg `#ffffff` or `#fbfaf7`, bottom border `#ece9e2`, active link `#4b3f8f` + weight 500 (vs `#8a8694` inactive), notification bubble bg `#e3def7` text `#4b3f8f` |
| **Chart/sparkline** | 2 series max: `#9c8fd8` primary stroke/fill, `#c9c0e8` secondary; area fill `#f0edfa`; endpoint dot `#4b3f8f` with white ring |

---

## 5. Gaps the mockups leave undefined — decisions needed

All 4 files reference the same two external CSS variables without ever
defining them. Recommendations below are reasonable defaults, not
mockup-verified — flag these back to the designer/Fable 5 output if a
"perfect" match matters:

1. **`--surface-1`** (outer page canvas, wraps the `#fbfaf7` panel).
   *Recommendation*: `#ffffff` (pure white canvas, cream `#fbfaf7` panel,
   white cards — a clean 3-tier system). Alternative: a slightly darker
   neutral like `#f5f3ef` for more visible layering — pick by eye once
   applied.
2. **`--font-mono`** (used heavily — every price/stat/number in all 4
   files). *Recommendation*: `'IBM Plex Mono'` or `'JetBrains Mono'` via
   `next/font/google` for a clean geometric mono that pairs well with the
   soft weight-500 aesthetic (avoid `'Courier New'`, the current fallback
   — too typewriter/harsh for this look).
3. **Default sans family** (headings/body — never named in any mockup).
   *Recommendation*: keep the app's existing **Plus Jakarta Sans** — it's
   already self-hosted via `next/font`, and its geometric warmth fits a
   weight-500-only, pill-shaped, boutique-SaaS look without adding a new
   font dependency.
4. **Button hover states** — not visible in any static mockup.
   *Recommendation*: darken `accent` by ~10% (e.g. `#3d3373`) for
   primary-button hover, consistent with how the old theme handled
   `accent-hover`.
5. **A true "destructive" red** — the mockups never show a real
   delete/destroy action, only "urgency" (terracotta `#b06a56`). The real
   app has destructive actions (delete job, reject dispute, etc.) that
   terracotta may under-signal. *Recommendation*: keep terracotta for soft
   urgency/decay signals, but add one slightly more saturated red (e.g.
   `#c14d3a`) reserved only for true destructive/irreversible actions.

---

## 6. Accessibility note — verified WCAG contrast ratios

The sub-agent analyses flagged `text-tertiary` as "~2.3:1, low contrast" by
eye. That undersold it, and it wasn't the only pair with a problem —
computed exact ratios (WCAG relative-luminance formula) for every text/bg
pair in this spec:

| Pair | Ratio | AA-normal (4.5:1) | AA-large (3:1) | Verdict |
|---|---|---|---|---|
| `text-primary` (#3d3a45) on card/panel | 10.7–11.1:1 | PASS | PASS | Safe everywhere |
| `text-body` (#5f5b68) on card | 6.6:1 | PASS | PASS | Safe everywhere |
| `text-on-accent` (#fff) on `accent` button | 8.7:1 | PASS | PASS | Safe everywhere |
| `accent` (#4b3f8f) as text on surface-2 | 8.4:1 | PASS | PASS | Safe for links/active states |
| `success` text (#4d7245) on success bg | 4.8:1 | PASS | PASS | Safe |
| **`text-secondary` (#8a8694) on card/panel** | **3.4–3.6:1** | **FAIL** | PASS | ⚠ Used in mockups for 10–12.5px nav/meta/body text — that's *below* the 18px/14px-bold "large text" threshold, so this **fails AA at the size it's actually used**, not just in edge cases |
| **`accent-tint-text` (#8b83a8) on tinted tile** | **3.1:1** | **FAIL** | PASS | ⚠ Same issue — used for small labels on stat tiles |
| **danger/terracotta text (#b06a56) on danger bg** | **3.6:1** | **FAIL** | PASS | ⚠ Used for price/value text ~11–18px, not reliably "large text" |
| **`warning` text (#a08a3c) on warning bg** | **2.9:1** | **FAIL** | **FAIL** | ⚠ Fails even the relaxed large-text threshold — worst offender |
| `text-tertiary` (#b3aec0) on card/panel | **2.1–2.2:1** | FAIL | FAIL | Worse than the ~2.3:1 estimate; already flagged, use only for decorative micro-text |
| `text-disabled` (#d5d1dd) on card | 1.5:1 | FAIL | FAIL | Expected/fine — this is deliberately near-invisible for struck-through/disabled values, not meant to be read |

**Net finding**: 5 of 11 pairs fail AA-normal, and 4 of those are used at
sizes small enough that "large text" leniency doesn't rescue them
(`text-secondary`, `accent-tint-text`, the terracotta danger text, and the
warning text are the real risks — not just the already-known
`text-tertiary`). For comparison, the **current "Royal Dark" theme passes
AA comfortably on every equivalent pair** (7–16:1 ratios) — so this retheme
trades away real contrast margin for the softer pastel look.

**Recommendation before porting to the real app**: darken these four for
production use, keeping the mockup values only for truly decorative/large
elements:
- `text-secondary`: `#8a8694` → something ≥`#6f6a7d` (reaches ~4.5:1)
- `accent-tint-text`: `#8b83a8` → darken toward `#6a6088` on tinted bg
- danger/terracotta value text: `#b06a56` → `#96543f` for readable body use, keep `#b06a56` for large numbers/decorative only
- `warning` text: `#a08a3c` → `#7a6a2c` (the current warning pair fails even large-text AA, highest-priority fix)

Do **not** let `text-tertiary` or `text-disabled` leak into anything a user
needs to read comfortably — reserve them strictly for micro-labels and
intentionally-deemphasized struck values, same as the mockups do.

---

## 7. Old → new token mapping (direct swap reference)

Cross-references `FRONTEND_PAGES.md` §8.6 (the hex find-and-replace list
already prepared for the current "Royal Dark" codebase). Use this table to
fill in the "new value" side of that replacement pass:

| Old token (Royal Dark) | Old hex | → | New value | New role |
|---|---|---|---|---|
| `--color-background` / `--bg` | `#080b14` | → | `#fbfaf7` (or `surface-1`, see §5) | Page background |
| `--color-card` / `--bg-subtle` | `#0d1120` | → | `#ffffff` | Card background |
| `--bg-muted` / `--color-secondary` | `#111625` | → | `#f4f2ee` / `#f0edfa` | Muted tile / tinted surface |
| `--bg-dark` | `#050810` | → | *(concept removed — see text-on-accent below)* | |
| `--color-foreground` / `--text-primary` | `#f0e8d4` | → | `#3d3a45` | Primary text/headings |
| `--text-secondary` / `--color-muted-foreground` | `#a8997e` | → | `#8a8694` (mockup) → **`#6f6a7d`** for real body/nav use (⚠ fails AA at mockup value, §6) | Secondary/body text |
| `--text-muted` | `#6b5f45` | → | `#b3aec0` | Tertiary text (⚠ low contrast, §6 — decorative micro-text only) |
| `--accent` / `--color-primary` | `#c9a84c` | → | `#4b3f8f` | Primary accent/brand |
| `--accent-hover` | `#d4b55a` | → | `#3d3373` (proposed, §5) | Accent hover |
| `--accent-deep` | `#8a6e2f` | → | `#3d3373` (proposed, §5) | Deep accent variant |
| `--accent-bg` | `rgba(201,168,76,0.12)` | → | `#f0edfa` / `#e3def7` | Accent-tinted background |
| `--color-primary-foreground` / text-on-accent | `#050810` | → | `#ffffff` | Text on solid accent (**flips dark→light**) |
| `--border` | `rgba(201,168,76,0.22)` | → | `#ece9e2` | Default border |
| `--border-strong` | `rgba(201,168,76,0.35)` | → | `#d9d4e8` (default) / `#9c8fd8` (featured) | Emphasis border |
| `--destructive` / `--danger` | `#c0392b` | → | `#b06a56` (large/decorative only) / `#96543f` (readable body text, §6) / `#c14d3a` (true destructive, §5) | Error/danger |
| `--success` | `#2e7d52` | → | `#4d7245` | Success (passes AA as-is) |
| `--warning` | `#c9a84c` | → | `#a08a3c` (mockup, ⚠ fails AA even large-text, §6) → **`#7a6a2c`** for real use / `#e0a23e` (dot/decorative only) | Warning |
| `--input` | `#0a0e1a` | → | `#ffffff` / `#f8f6f1` | Input background |
| `--ring` | `#c9a84c` | → | `#9c8fd8` | Focus ring |
| `--font-serif` (Fraunces, all headings) | — | → | **removed** — headings become sans, weight 500 | Heading font |
| `--font-sans` (Plus Jakarta Sans) | — | → | **kept as-is** (§5) | Body/heading font |
| `--font-mono` (Courier New) | — | → | IBM Plex Mono / JetBrains Mono (proposed, §5) | Numeric/price font |
| `--radius-*` (2–6px, sharp/flat) | — | → | 99px pills, 12–18px cards (§3) | Full shape philosophy flip |
| `--shadow-*` (all `none`) | — | → | soft purple-tinted shadows (§1) | Flat → soft-shadow |

This mapping, combined with the component-class table in
`FRONTEND_PAGES.md` §7, and the hex-occurrence audit in §8, is enough to
do a mechanical, page-by-page retheme: swap every old hex for its new
counterpart above, in `globals.css` first, then across every `.tsx` file
listed in `FRONTEND_PAGES.md` sections 1–5.

---

## 8. Implementation plan — sequence, Playwright verification, commit workflow

Execution order below follows `FRONTEND_PAGES.md` §9.6, expanded into a
concrete, page-by-page checklist with a testing and git step built into
every phase. Nothing in this section has been executed yet — it's the
plan to follow once retheming starts.

### 8.0 One-time setup (before touching any page)

1. `git checkout -b v18` off the current `v17` branch — all retheme work
   happens on this branch, never on `v17`/`main` directly.
2. Confirm the dev server runs: `cd web && npm run dev` (Next.js on
   `http://localhost:3000`, per `package.json`).
3. Confirm Playwright MCP can reach it (`browser_navigate` to
   `http://localhost:3000`) before starting Phase 1.
4. Decide the open items in §5 (surface-1, font-mono family, hover color,
   destructive red) up front — they're referenced by nearly every phase
   below, so re-deciding mid-way would mean re-touching earlier pages.

### 8.1 Phases (in order)

| Phase | Scope | Files (see `FRONTEND_PAGES.md` for full list) |
|---|---|---|
| **1. Foundation** | `globals.css` only — CSS variables (§7 table above), component classes (`.card`, `.btn-primary`, `.badge-*`, etc.), radius scale, shadow tokens | `web/src/app/globals.css` |
| **2. Shared chrome** | Nav/layout used on every authenticated page | `layout.tsx`, `navbar.tsx`, `conditional-navbar.tsx`, `mobile-bottom-nav.tsx`, `ui/sonner.tsx` |
| **3. Auth + marketing** | First-impression + highest decorative-effect debt (§9.4 of `FRONTEND_PAGES.md`) | `login`, `page.tsx` (landing) + its 17 `landing/*` components, `pricing`, `error.tsx`, `loading.tsx` |
| **4. Core app — feed & discovery** | `feed` + its 18 `feed/*` components (shared by client + freelancer) | `feed/page.tsx` and imports |
| **5. Core app — job lifecycle** | `jobs/[id]`, `post-job`, `my-jobs` (client-side job flow) | + `ai/*`, `modals/*` used by these |
| **6. Core app — people & comms** | `inbox`, `notifications`, `profile`, `profile/[id]`, `team` | + `CloudinaryAvatar`, `AvatarUploader`, `feed/DirectHireModal` etc. |
| **7. Core app — money & account** | `payments`, `earnings`, `assessments`, `settings` | |
| **8. Admin** | Separate layout/theme surface, lowest traffic, do last | `admin/layout.tsx` + all `admin/*` pages + `admin/*` components |
| **9. Final audit** | Re-grep every hex in §7 above and every `rounded-[Npx]` value across all of `src/` — zero remaining old-theme hits is the done condition | whole `web/src` tree |

### 8.2 Per-page workflow (repeat for every page inside a phase)

1. **Edit**: apply the §7 token map + the hardcoded-hex/radius replacements
   from `FRONTEND_PAGES.md` §8.6/§9.1/§9.2 to the page's `page.tsx` and
   every component it imports (per the page→component map in
   `FRONTEND_PAGES.md` §1–5). For Phase 3's landing/feed pages, also apply
   the keep/simplify/remove decision from §9.4 for decorative effect
   classes.
2. **Verify with Playwright MCP** (dev server must be running):
   - `browser_navigate` to the page's route.
   - `browser_snapshot` (and `browser_take_screenshot`, full page) — check
     background/text/accent colors visually match this document's palette
     and no old gold/navy hex is still visible.
   - `browser_console_messages` — confirm no new console errors/warnings
     introduced by the edit.
   - `browser_resize` to a mobile width (e.g. 390×844) and re-screenshot —
     confirm layout doesn't break at the new radius/spacing values.
   - Exercise at least one interactive element on the page (primary
     button hover/click, a modal if the page has one, a badge/status
     state) to confirm hover/focus colors from §5/§7 render correctly.
   - If the page requires auth, log in first via the `login` page (only
     needed after Phase 3 is done) or reuse an existing session.
3. **Fix and re-verify** if anything looks wrong — do not move to the next
   page with a known visual regression.
4. **Commit**: once a page (or the full phase, for small phases like
   Foundation/Shared chrome) passes verification, stage only the files
   touched for that page and commit on `v18` with a message like
   `style: retheme <page/phase name> to Pastel Indigo palette`. **One
   commit per page/phase**, not one giant end-of-project commit — this
   keeps the history bisectable if a later page's changes cause a
   regression.
5. Move to the next page in the phase, then the next phase.

### 8.3 Git/branch notes

- All work stays on `v18` locally; `v17`/`main` are untouched throughout.
- Per this session's standing rule: commits happen locally after each
  verified page, but **pushing `v18` to GitHub (or opening a PR) is a
  separate, explicit step done only when asked** — it's a
  visible-to-others action, not bundled automatically into "commit after
  each page."
