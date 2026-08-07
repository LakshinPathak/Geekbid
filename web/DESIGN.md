---
name: Pastel Indigo
colors:
  background: "#fbfaf7"
  foreground: "#3d3a45"
  card: "#ffffff"
  card-foreground: "#3d3a45"
  popover: "#ffffff"
  popover-foreground: "#3d3a45"
  primary: "#4b3f8f"
  primary-foreground: "#ffffff"
  accent-hover: "#3d3373"
  secondary: "#f4f2ee"
  secondary-foreground: "#3d3a45"
  muted: "#f4f2ee"
  muted-foreground: "#6f6a7d"
  destructive: "#c14d3a"
  border: "rgba(75,63,143,0.22)"
  border-strong: "rgba(75,63,143,0.35)"
  input: "#ffffff"
  ring: "#4b3f8f"
  success: "#4d7245"
  warning: "#7a6a2c"
  ink-muted: "#b3aec0"
typography:
  hero-h1:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 37px
    fontWeight: "500"
    lineHeight: 1.16
    letterSpacing: -0.8px
  section-title:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 16px
    fontWeight: "500"
  card-title:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 13px
    fontWeight: "500"
  body:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.7
  nav-meta:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 12px
    fontWeight: "400"
  micro-label:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 10px
    fontWeight: "500"
    letterSpacing: 1.2px
  price-mono:
    fontFamily: "IBM Plex Mono"
    fontSize: 22px
    fontWeight: "500"
rounded:
  sm: 12px
  md: 99px
  lg: 16px
  xl: 18px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 28px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: 11px 24px
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 11px 24px
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  badge-success:
    backgroundColor: "#e9f2e6"
    textColor: "{colors.success}"
    rounded: "{rounded.md}"
  badge-warning:
    backgroundColor: "#f3edda"
    textColor: "{colors.warning}"
    rounded: "{rounded.md}"
  badge-destructive:
    backgroundColor: "#fbe9e4"
    textColor: "#96543f"
    rounded: "{rounded.md}"
  card-default:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-featured:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input-field:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  nav-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
  popover-menu:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.sm}"
  stat-tile:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  meta-label:
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro-label}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: 11px 24px
---

## Overview

Pastel Indigo is a calm, boutique-SaaS aesthetic: warm cream surfaces, a single deep-indigo
accent, and a soft, pill-everything shape language. It replaces an older dark/gold/serif/flat
theme with something lighter and gentler. Headings are sans, **weight 500 only — never bold**.
Shadows are soft and purple-tinted, used sparingly (roughly half of all cards have none at all).
There are **no gradients anywhere** in this system.

## Colors

`primary` (`#4b3f8f`) is the single brand accent — used for primary buttons, active nav state,
links, and large price/stat numbers. It is deliberately the *only* saturated, high-chroma color
in the palette.

Status/semantic colors are intentionally desaturated and never pure red or blue: `destructive`
(`#c14d3a`) is a muted terracotta rather than alarm-red, `success` (`#4d7245`) is a soft sage,
`warning` (`#7a6a2c`) is muted gold. This softening is deliberate even for negative trends (e.g.
price drops use terracotta, not red).

`ink-muted` (`#b3aec0`) is reserved strictly for decorative micro-text (timestamps,
strikethrough/disabled values) — it fails WCAG AA and must never carry content a user needs to
read. Use `muted-foreground` (`#6f6a7d`) for any real secondary/body/nav text; it was deliberately
darkened from an earlier `#8a8694` draft specifically to pass AA at the small sizes it's used at.

Badge/status text colors are sometimes darkened one step beyond their matching `colors.*` token
(e.g. `destructive` badge text uses `#96543f` rather than the raw `#c14d3a`) purely to keep small
badge text at AA contrast against its tinted background — the raw token stays correct for larger
elements like buttons.

`border`, `border-strong`, and `ring` are real, actively-used tokens (card/input borders, focus
rings, the "featured" card differentiator) but have no home in this spec's component-token schema,
which only supports `backgroundColor`/`textColor`/`typography`/`rounded`/`padding`/`size`/
`height`/`width` — there is no `borderColor` property. They're documented here as colors for
completeness even though no `components` entry references them directly.

## Typography

Font families: **Plus Jakarta Sans** for all sans (headings and body — self-hosted via
`next/font/google`), **IBM Plex Mono** reserved exclusively for numeric/price/stat values. Mono
is never used for labels or prose — only for the number itself.

Headings never go bold. Every heading role in this system (`hero-h1`, `section-title`,
`card-title`) is weight 500, which is what gives the UI its calm, restrained feel — resist the
urge to bump heading weight for emphasis; use size or color instead.

## Layout

Spacing is generous and airy: card interiors ~16px, buttons 11px vertical / 24px horizontal,
section gutters up to 28px, grid gaps 8–24px. Prefer more whitespace over denser packing.

## Elevation & Depth

Two shadow tiers exist (`shadow-default` and `shadow-elevated`, both soft and purple-tinted at
very low opacity) but are used sparingly — many inner/nested cards have no shadow at all.
Elevation is never the primary way to signal a "featured" or important element; use `border` and
`border-strong`/`ring` for that instead (see Components below).

## Shapes

Buttons and badges are always fully pill-shaped (`rounded.md`, 99px) with zero exceptions. Cards
use `rounded.lg` (16px) or `rounded.xl` (18px). Smaller tiles/panels use `rounded.sm` (12px).
Note: `rounded.md` (99px) is a pill, not a "medium" radius in the usual sense — this naming
carries over from the existing codebase and should not be changed without a coordinated rename
across every call site.

## Components

**Buttons**: `button-primary` is solid `primary` with white text, pill radius, weight 500, no
border; hover darkens to `accent-hover`. `button-secondary` uses a tinted `muted` background with
`primary` text. `button-ghost` has no background/border — text only, in `primary`.
`button-destructive` (solid `destructive` bg, white text) is reserved for true irreversible
actions — delete a job, reject a dispute — distinct from the softer terracotta badges used for
non-destructive urgency/price-decay signals.

**Badges**: uniform recipe across all semantic variants — tinted background + matching saturated
text of the same hue, pill radius, small font (10–11px).

**Cards**: `card-default` is white with a subtle border and light/no shadow. `card-featured` is
identical except its border switches to `border-strong` — that border-weight change is the *only*
visual differentiator for "featured," never a background-color or shadow change.

**Inputs**: white (or lightly tinted) background, pill radius, `border` by default; numeric
inputs use the mono font.

**Nav bar**: white or cream background, bottom `border`, active link in `primary` at weight 500
versus `muted-foreground` for inactive links.

## Do's and Don'ts

- **Do** keep all heading weights at 500 — never use bold (700) anywhere in the UI.
- **Do** use `primary` as the only saturated/high-chroma color; everything else stays muted or
  neutral.
- **Do** use pill radius (`rounded.md`) for every button and badge, with zero exceptions.
- **Do** reserve the mono font (`price-mono`) strictly for numeric/price/stat values, never for
  labels or prose.
- **Do** differentiate "featured" cards with `border-strong` only — not a background or shadow
  change.
- **Don't** introduce gradients, neon, or glow effects — none exist anywhere in this system.
- **Don't** use saturated red or blue for status/semantic colors — use the muted terracotta
  (`destructive`), sage (`success`), and gold (`warning`) tones instead.
- **Don't** use `ink-muted` (or any similarly low-contrast tone) for text a user needs to read —
  it fails WCAG AA by design and is reserved for decorative micro-text only.
- **Don't** rely on shadow alone to signal importance/elevation — shadows are used sparingly and
  are a secondary cue at most.
