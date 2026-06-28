---
name: Imperial Engineering Exchange
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#3f4942'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#6f7a71'
  outline-variant: '#bec9bf'
  surface-tint: '#006d44'
  primary: '#005232'
  on-primary: '#ffffff'
  primary-container: '#006d44'
  on-primary-container: '#93ecb8'
  inverse-primary: '#80d8a6'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#44474b'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c5f63'
  on-tertiary-container: '#d7d9dd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9cf5c1'
  primary-fixed-dim: '#80d8a6'
  on-primary-fixed: '#002111'
  on-primary-fixed-variant: '#005232'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e0e2e6'
  tertiary-fixed-dim: '#c4c7ca'
  on-tertiary-fixed: '#191c1f'
  on-tertiary-fixed-variant: '#44474a'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-sm: 16px
  margin-lg: 48px
  container-max: 1440px
---

## Brand & Style
The design system bridges the gap between high-performance engineering tools and luxury financial institutions. It targets elite engineers and stakeholders who value precision, reliability, and exclusivity. 

The aesthetic is **Elite Minimalist with Glassmorphic accents**. It moves away from the aggressive neon glows of typical "cyber" aesthetics toward a refined "Titanium & Ivory" palette. The interface should feel expensive, airy, and hyper-organized—resembling a bespoke physical dashboard found in a high-end laboratory or a premium trading floor. The emotional response should be one of calm authority and technological superiority.

## Colors
The palette is rooted in **Royal Emerald (#006D44)**, used as the primary driver for action and identity. This deep green provides a sense of stability and growth. 

- **Primary:** Royal Emerald for primary buttons, active states, and brand signatures.
- **Accents:** Champagne Gold (#D4AF37) is used sparingly for high-value highlights, status indicators, or "pro" tier features.
- **Surfaces:** A hierarchy of off-whites. The base layer is **Titanium White (#F9FAFB)**, with nested containers using **Pearl Gray (#F3F4F6)** and pure White for elevated cards.
- **Interaction:** Success states utilize a brighter emerald, while destructive actions use a muted burgundy to maintain the sophisticated tone.

## Typography
Typography is the primary vehicle for the "Engineering" side of the brand. We use **Space Grotesk** for headlines to provide a technical, geometric edge. 

**Inter** serves as the body face for maximum legibility in data-heavy environments. To lean into the "Exchange" aspect, **JetBrains Mono** is utilized for labels, metadata, and numerical values, evoking the precision of code and financial tickers. 

Text colors should never be pure black; use **Deep Charcoal (#111827)** for primary text and **Slate Gray (#4B5563)** for secondary info to maintain the "Rich" softness of the UI.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid grid**. Use a 12-column grid for desktop with wide 24px gutters to allow the design to "breathe," reinforcing the premium feel. 

- **Margins:** Desktop views should maintain 48px outer margins. On mobile, this scales down to 16px.
- **Rhythm:** All vertical spacing must be a multiple of 4px. Use generous padding (32px+) inside cards to emphasize the "Luxury" of space.
- **Alignment:** Data columns should be strictly aligned with technical labels to maintain the engineering rigor.

## Elevation & Depth
This design system uses **High-End Glassmorphism** to create depth. Layers are defined by their translucency rather than heavy shadows.

- **Surface Tiers:** Background is #F9FAFB. Content cards are pure white with a 1px border in #E5E7EB.
- **Glass Effect:** Floating panels (modals, dropdowns) should use a backdrop-blur (12px) with a semi-transparent white fill (70% opacity). 
- **Shadows:** Use "Ambient Diffusion"—very soft, low-opacity shadows (Blur: 20px, Spread: -5px, Color: #000000 at 4% opacity). Avoid hard dropshadows.
- **Outlines:** Every elevated element should have a subtle "Burnished Silver" (#E5E7EB) hairline stroke to define its boundary against the light background.

## Shapes
In accordance with the "ROUND_EIGHT" consistency, the base corner radius is **0.5rem (8px)**. This provides a balance between the sharp, technical nature of engineering and the sophisticated, approachable nature of a luxury brand.

- **Small Components:** Checkboxes and small tags use 4px (rounded-sm).
- **Standard Components:** Buttons, inputs, and cards use 8px (rounded-md).
- **Large Components:** Hero sections or large modal containers use 16px (rounded-lg).

## Components
- **Buttons:** Primary buttons are Solid Royal Emerald with white text. Secondary buttons use a "Titanium" ghost style—transparent fill with a silver border and Emerald text.
- **Input Fields:** Use a soft gray background (#F3F4F6) that turns white on focus. The focus ring should be a 2px Royal Emerald glow with 20% opacity.
- **Chips/Tags:** Status tags should use a light tint of their functional color (e.g., light green background for 'Active') with high-contrast text.
- **Data Cards:** Use a 1px border (#E5E7EB). Headers within cards should be separated by a subtle horizontal rule and use JetBrains Mono for the subtitle.
- **Glass Navigation:** The top navigation bar should be fixed with a heavy backdrop blur and a thin bottom border in Champagne Gold for a touch of luxury.