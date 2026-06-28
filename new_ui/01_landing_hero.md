# 01 — Landing Hero Section

> **Design Components:** `geekbid_desktop_hero` + `geekbid_desktop_hero_motion_upgrade` + `geekbid_mobile_hero`  
> **Target File:** `web/src/app/page.tsx` (Lines 1–777)

---

## Current Production State

The landing page is a single 777-line `"use client"` component with:
- **PriceDecayDemo** — animated counter showing $2400→$800 decline
- **useCountUp** / **useInView** hooks for scroll-triggered animations
- Multiple sections: Hero, Stats, How It Works, Live Auctions, Testimonials, Pricing, CTA, Footer
- Color palette: `#0A0A0F` bg, `#12121A` cards, `#00FF88` primary, `#1E1E2A` borders

## Design System Upgrade — What Changes

### Hero Section

| Element | Current (`page.tsx`) | Design System Target |
|---------|---------------------|---------------------|
| Background | Flat `#0A0A0F` | WebGL shader canvas (fragment shader gradient) + grid overlay |
| Typography | Standard `font-heading` | Space Grotesk 48px/700 with gradient text `bg-clip-text` |
| Hero CTA | Simple emerald button | Glass-panel button with neon glow shadow |
| Price Demo | Basic animated counter | Glassmorphic card with scanline animation + neon pulse |
| Grid Lines | None | `background-size: 32px 32px` emerald grid at 3% opacity |
| Motion | None | Three.js particle field / shader background canvas |

### Key Design Tokens to Apply

```css
/* Hero Background */
.hero-bg {
    background: #0A0A0F;
    background-image: 
        linear-gradient(rgba(0, 228, 121, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 228, 121, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
}

/* Headline Gradient */
.hero-headline {
    background: linear-gradient(135deg, #ffffff 0%, #00ff88 50%, #00e479 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* Glass CTA Button */
.hero-cta {
    background: rgba(0, 255, 136, 0.15);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 255, 136, 0.3);
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.15);
    transition: all 0.3s ease;
}
.hero-cta:hover {
    background: rgba(0, 255, 136, 0.25);
    box-shadow: 0 0 50px rgba(0, 255, 136, 0.25);
}
```

### Three.js / Shader Integration

The design system includes two background effect modules:
1. **`shader/code.html`** — Fragment shader creating animated gradient mesh (green/teal plasma)
2. **`three.js/code.html`** — Particle field with floating geometric shapes

**Migration Strategy:**
- Create `web/src/components/effects/ShaderBackground.tsx` as a client component
- Wrap WebGL canvas initialization in `useEffect` with proper cleanup
- Conditionally render on desktop only (`useMediaQuery`)
- Implement `IntersectionObserver` to pause when off-screen (performance)

### Mobile Hero (`geekbid_mobile_hero`)

- Simplified layout — stacked vertical
- No Three.js effects (performance)
- Condensed price demo card
- Swipeable trust indicators

---

## Implementation Checklist

- [ ] Add grid overlay CSS to `globals.css`
- [ ] Create `ShaderBackground.tsx` client component
- [ ] Upgrade headline to gradient text
- [ ] Replace solid CTA button with glass-panel variant
- [ ] Add scanline animation to PriceDecayDemo card
- [ ] Implement responsive breakpoint: shader on `lg:`, simplified on mobile
- [ ] Add floating stat badges (design system shows "Active Auctions: 2,847")

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| None (static) | Hero is purely presentational — no API calls needed |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/page.tsx` | Modify hero section (lines ~100–300) |
| `web/src/app/globals.css` | Add `.grid-bg`, `.glass-panel`, `.scanline`, `.neon-glow` |
| `web/src/components/effects/ShaderBackground.tsx` | **NEW** — WebGL shader wrapper |
| `web/src/components/effects/ParticleField.tsx` | **NEW** — Three.js particle system |
