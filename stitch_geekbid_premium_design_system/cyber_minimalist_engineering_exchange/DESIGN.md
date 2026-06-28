---
name: Cyber-Minimalist Engineering Exchange
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39383e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f25'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e9'
  on-surface-variant: '#b9cbb9'
  inverse-surface: '#e4e1e9'
  inverse-on-surface: '#303036'
  outline: '#849585'
  outline-variant: '#3b4b3d'
  surface-tint: '#00e479'
  primary: '#f1ffef'
  on-primary: '#003919'
  primary-container: '#00ff88'
  on-primary-container: '#007139'
  inverse-primary: '#006d37'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#fff9ff'
  on-tertiary: '#3c0091'
  tertiary-container: '#e5d8ff'
  on-tertiary-container: '#713fda'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#60ff99'
  primary-fixed-dim: '#00e479'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#131318'
  on-background: '#e4e1e9'
  surface-variant: '#35343a'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  price-display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 40px
  container-padding: 24px
  gutter: 16px
---

## Brand & Style

The design system embodies a **$10B developer tool aesthetic**, merging the precision of high-end technical platforms with a premium, cold cybernetic atmosphere. It is designed specifically for an elite engineering audience, evoking a sense of high-performance, live-market urgency, and professional sophistication.

The style is defined as **Premium Cyber-Minimalism**, characterized by:
- **Ultra-Minimalism:** A "less but better" approach with maximum whitespace and a strictly functional layout.
- **Glassmorphism:** Deep, translucent layers with heavy backdrop blurs (20px+) to create sophisticated depth without clutter.
- **Technical Polish:** 3% opacity background grids and hairline borders (1.5px) that mimic a high-fidelity IDE or trading terminal.
- **Ambient Glows:** Subdued emerald and purple lighting effects used as directional cues and status indicators rather than decorative elements.
- **Kinetic Feedback:** Highly responsive spring animations (shrink to 0.96 scale) on all interactive elements to provide a tactile, physical feel.

## Colors

The system uses a **Strict Dark Mode** architecture. Color is used sparingly and purposefully to highlight active states and financial fluctuations.

### Core Palette
- **Primary (Neon Emerald):** Used for primary CTAs, positive growth, and live auction tickers.
- **Secondary (Cobalt Blue):** Used for verification marks and secondary navigation pathways.
- **Tertiary (Amethyst):** Reserved for elite status tiers and high-level system notifications.
- **Neutral (Midnight Void):** The foundational canvas.

### Surface Hierarchy
- **Level 0 (Background):** `#0A0A0F` — The root canvas.
- **Level 1 (Surface):** `#12121A` — Primary container cards and navigation bars.
- **Level 2 (Elevated):** `#1E1E2A` — Hover states, modals, and active selection highlights.
- **Borders:** `#1E1E2A` (Hairline) — High-precision framing.

## Typography

The typography strategy balances raw technical data with editorial authority.

- **Headlines:** Space Grotesk provides a geometric, mechanical feel. Headlines should use tight tracking and leading to maintain a compact, "designed" appearance.
- **Body:** Inter is used for its exceptional legibility in dark environments.
- **Data (Prices):** Always use `tabular-nums` for numeric auction values to prevent layout jitter during real-time price decay.
- **Labels:** Use uppercase with increased letter spacing for structural anchors.
- **Mobile Scaling:** For screens under 768px, `headline-xl` should scale down to 32px and `headline-lg` to 24px.

## Layout & Spacing

The layout follows a **Fluid Grid** model designed to feel like a high-end dashboard.

- **Grid:** 12-column system on desktop, 4-column on mobile.
- **Rhythm:** A strict 4px baseline. Most components use `md` (16px) or `lg` (24px) for internal padding.
- **Whitespace:** Use generous `xl` (40px) vertical margins between major sections to emphasize the "uncluttered" premium feel.
- **Responsive Behavior:** 
  - **Desktop (>1024px):** Maximum content width of 1440px with centered alignment.
  - **Tablet (768px - 1023px):** Fluid width with 32px side margins.
  - **Mobile (<767px):** 20px side margins; cards stack vertically.

## Elevation & Depth

Hierarchy is achieved through a combination of **Tonal Layers** and **Glassmorphism**.

- **Surfaces:** Use a 1px border (`#1E1E2A`) on all cards to define shape. Shadows are avoided in favor of "Inner Glows"—subtle 1px top-borders that are slightly lighter than the surface color to simulate a top-down light source.
- **Backdrop Blur:** Use `backdrop-filter: blur(24px)` on modals and navigation bars to maintain context while isolating the foreground.
- **Ambient Glows:** Use ultra-diffused, low-opacity (10-15%) radial gradients behind primary components (e.g., a green glow behind a "Live" price) to indicate importance without using heavy drop shadows.

## Shapes

The shape language is sophisticated and modern, using `rounded-2xl` for primary containers to soften the technical aesthetic.

- **Cards/Modals:** Use `rounded-2xl` (1.5rem / 24px) for a premium, friendly feel.
- **Buttons/Inputs:** Use `rounded-lg` (0.5rem / 8px) for a more precise, tool-like appearance.
- **Status Pills:** Use "Pill-shaped" (999px) for badges and tags.

## Components

- **Buttons:** 
  - **Primary:** Neon Emerald gradient fill with black text. 1.08x scale on hover, 0.96x on click.
  - **Secondary:** Glassmorphic fill (white 10% opacity) with white border and text.
- **Job Cards:** Should feature a Cyber Steel background, a hairline border, and an isolated price panel with a 3% opacity grid texture.
- **Price Tickers:** Use a pulsing animation (scale 1.0 to 1.05) when values decrease.
- **Input Fields:** Deep surface fill (`#12121A`) with a subtle 1px border that turns Neon Emerald on focus.
- **Chips:** Small, uppercase labels with a 10% opacity background of their respective accent color (e.g., green text on dark green tint).
- **Navigation:** A floating bottom bar on mobile with glassmorphic blur and emerald-glow active indicators.