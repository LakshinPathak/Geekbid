# 05 — Freelancer Profile & GeekScore

> **Design Component:** `freelancer_profile_geekscore`  
> **Target File:** `web/src/app/profile/page.tsx` (478 lines)

---

## Current Production State

A complete profile page (478 lines) with:
- **Header card** — Avatar initial, name, email, role badge, availability, GeekScore display
- **Stats row** — 4 KPI boxes (Jobs Won, Bids Made, Rate, GeekScore)
- **Reviews section** — List of reviewer cards with star ratings
- **Referral section** — Referral link, code, stats (Invites, Signed Up, Completed, Credits)
- **Edit form** — Full Name, Bio, Company, Skills picker, Hourly Rate, Availability selector, GitHub verification
- **Account** — Delete account with confirmation

## Design System Upgrade

### Profile Header

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Avatar | `bg-[#00FF88]/10` with text initial | Circular avatar with emerald ring + verification badge overlay |
| GeekScore | Plain number | **GeekScore™ Badge** — Hexagonal/circular gauge with tier color + animated fill |
| Stats | `bg-[#0A0A0F]` boxes | Glass-panel cards with hover glow |
| Name | `text-3xl text-[#E8E8EC]` | Space Grotesk with tier-colored accent underline |
| Badges | Simple pills | Animated pill badges with subtle shimmer |

### GeekScore™ Visual System

The design system introduces a **dedicated GeekScore visualization**:

```
Tier System:
- 0-199: Bronze (text-orange-400) — "Rising Star"
- 200-499: Silver (text-gray-300) — "Skilled"  
- 500-799: Gold (text-yellow-400) — "Expert"
- 800-999: Platinum (text-cyan-400) — "Elite"
- 1000+: Diamond (text-purple-400) — "Legendary"
```

| Element | Implementation |
|---------|---------------|
| Score Ring | SVG circle with `stroke-dasharray` animated to fill percentage |
| Tier Badge | Colored pill with tier icon |
| Breakdown | Mini bar chart showing component scores |
| Tooltip | Hover shows: "Completion Rate + Quality + Speed + Reviews" |

### Key CSS Additions

```css
/* GeekScore Ring */
.geekscore-ring {
    width: 120px;
    height: 120px;
    position: relative;
}
.geekscore-ring circle {
    fill: none;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease-out;
}
.geekscore-ring .bg-ring {
    stroke: rgba(59, 75, 61, 0.3);
}
.geekscore-ring .fill-ring {
    stroke: var(--tier-color);
    stroke-dasharray: 314;
    stroke-dashoffset: calc(314 - (314 * var(--score-pct) / 100));
}

/* Profile Glass Card */
.profile-card {
    background: rgba(31, 31, 37, 0.4);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
}
```

---

## Implementation Checklist

- [ ] Create `GeekScoreRing.tsx` SVG component
- [ ] Upgrade avatar to ring-bordered circular with verification overlay
- [ ] Convert stat boxes to glass-panel
- [ ] Add tier color system to profile header
- [ ] Implement animated score fill on page load
- [ ] Add skill badges with hover effects
- [ ] Upgrade review cards to glass-panel
- [ ] Add GitHub verification badge visual (checkmark + repo stats)

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `PATCH /api/users/:id` | Profile update (updateProfile action) |
| `GET /api/github/:username` | GitHub verification |
| `GET /api/reviews` | Review data for profile |
| `GET /api/referrals` | Referral stats |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/profile/page.tsx` | Visual overhaul of header + stats + review cards |
| `web/src/components/GeekScoreRing.tsx` | **NEW** — SVG score visualization |
| `web/src/app/globals.css` | Add `.geekscore-ring`, `.profile-card` |
