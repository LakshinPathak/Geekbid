# 03 — Job Feed Dashboard

> **Design Components:** `geekbid_job_feed_dashboard` + `geekbid_job_feed_advanced_motion`  
> **Target File:** `web/src/app/feed/page.tsx` (905 lines)

---

## Current Production State

A comprehensive 905-line feed with:
- **Role-aware KPI strips** — Client (My Jobs, Savings, Total Bids, Avg Decay) / Freelancer (Matches, Bids Used, Win Rate, Potential)
- **Advanced filtering** — Search, Skills picker, Category tabs, Budget/Competition/Hourly filters
- **Job cards** — Grid of auction cards with price decay bars, match scores, competition badges
- **Client-specific features** — "Your Jobs Live Status" carousel, Market Intelligence panel
- **Freelancer-specific features** — "Recommended for You" row, Quick Bid buttons

## Design System Upgrade

### Feed-Level Changes

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Background | Flat `#0A0A0F` | Grid overlay + subtle shader background |
| Header Strip | `bg-[#12121A]` card | Glass-panel with scanline accent |
| KPI Boxes | Bordered cards | Glassmorphic panels with neon data highlights |
| Filter Bar | Standard inputs | Glass-surface search with emerald focus glow |

### Job Card Upgrade

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Card Container | `bg-[#12121A] border-[#1E1E2A]` | Glass-panel (`rgba(31, 31, 37, 0.4)` + blur) |
| Price Display | `text-[#00FF88]` plain | `font-heading text-2xl` with subtle pulse animation |
| Decay Bar | Simple green bar | Animated gradient bar with glow effect |
| Competition Badge | Colored pill | Pulsing indicator for "LOW" competition |
| Hover State | `border-[#00FF88]/20` | Full card lift + neon border glow |
| Stagger Animation | `animationDelay` on mount | Intersection Observer reveal with 50ms stagger |

### Advanced Motion Features (from `geekbid_job_feed_advanced_motion`)

- **Shader background** — Animated green gradient canvas behind the feed
- **Staggered card reveals** — Cards animate in from bottom with opacity transition
- **Live pulse indicators** — Real-time pulsing dots on "LIVE" auction status
- **Hover parallax** — Subtle card tilt on mouseover (transform perspective)

### Key CSS Additions

```css
/* Job Card Glass */
.job-card {
    background: rgba(31, 31, 37, 0.4);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 16px;
    transition: all 0.3s ease;
}
.job-card:hover {
    border-color: rgba(0, 255, 136, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.1);
}

/* Decay Bar Glow */
.decay-bar {
    background: linear-gradient(90deg, #00ff88, #00e479);
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
    transition: width 0.5s ease-out;
}

/* Card Reveal Animation */
@keyframes cardReveal {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.card-reveal {
    animation: cardReveal 0.5s ease-out forwards;
}
```

---

## Implementation Checklist

- [ ] Convert job cards to glass-panel styling
- [ ] Add animated decay bar with glow
- [ ] Implement staggered card reveal animations
- [ ] Add shader/gradient background behind feed grid
- [ ] Upgrade KPI boxes to glassmorphic panels
- [ ] Add live pulse indicators to active auction cards
- [ ] Implement hover lift + neon glow on cards
- [ ] Add parallax tilt effect on desktop hover

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `GET /api/jobs` | Job listing data |
| `GET /api/bids` | Bid count/competition data |
| `POST /api/accept` | Accept job from card |
| `GET /api/users` | Client/freelancer metadata |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/feed/page.tsx` | Major visual overhaul (glass cards, animations) |
| `web/src/app/globals.css` | Add `.job-card`, `.decay-bar`, `.card-reveal` |
| `web/src/components/effects/ShaderBackground.tsx` | Reuse from hero |
