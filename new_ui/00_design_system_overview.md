# GeekBid Premium Design System — Master Overview

> **System Name:** Imperial Light / Cyber-Minimalist  
> **Source:** `stitch_geekbid_premium_design_system/`  
> **Target:** `web/src/app/` (Next.js 15 + Tailwind CSS)  
> **Total Components:** 19 HTML design files + 1 style guide doc

---

## Brand Identity

GeekBid is a **Dutch Auction platform for elite engineering talent**. The brand combines:
- **Cyber-Minimalist** precision — grid-aligned layouts, monospaced accents, terminal-inspired UI
- **Royal & Rich** aesthetic — high-contrast typography, deep emerald tones, glassmorphism

## Visual Pillars

| Pillar | Implementation |
|--------|---------------|
| **Precision** | Grid-aligned layouts (32–40px), monospaced accents (JetBrains Mono) |
| **Authority** | High-contrast typography, deep emerald (#006D44) primary |
| **Transparency** | Glassmorphic layers (`backdrop-filter: blur(24px)`), real-time telemetry logs |

---

## Dual Theme System

### Dark Mode (Cyber-Minimalist) — Primary

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#131318` | Main background |
| `surface-container` | `#1f1f25` | Card backgrounds |
| `surface-container-low` | `#1b1b20` | Sidebar backgrounds |
| `surface-container-lowest` | `#0e0e13` | Deep-nested containers |
| `surface-container-highest` | `#35343a` | Elevated elements |
| `primary-container` | `#00ff88` | Primary action (buttons, badges) |
| `primary-fixed-dim` | `#00e479` | Secondary green accent |
| `on-surface` | `#e4e1e9` | Primary text |
| `on-surface-variant` | `#b9cbb9` | Muted text |
| `outline-variant` | `#3b4b3d` | Borders, dividers |
| `secondary-container` | `#0566d9` | Blue accent |
| `error` | `#ffb4ab` | Error states |

### Light Mode (Imperial Light) — Secondary

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | `#f9f9ff` | Main background |
| `primary` | `#005232` | Primary emerald |
| `primary-container` | `#006d44` | Primary container |
| `on-surface` | `#141b2b` | Primary text |
| `secondary-container` | `#fed65b` | Gold accent |
| `surface-container` | `#e9edff` | Elevated surfaces |

---

## Typography System

| Token | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| `headline-xl` | Space Grotesk | 48px | 700 | Page titles |
| `headline-lg` | Space Grotesk | 32px | 700 | Section headers |
| `headline-md` | Space Grotesk | 24px | 600 | Card titles |
| `headline-sm` | Space Grotesk | 18px | 600 | Subheadings |
| `body-lg` | Inter | 18px | 400 | Descriptions |
| `body-md` | Inter | 15px | 400 | Body text |
| `body-sm` | Inter | 13px | 400 | Captions |
| `price-display` | Inter | 36px | 800 | Financial figures |
| `label-caps` | Inter | 11px | 700 | Labels (0.1em tracking) |

---

## Core CSS Patterns

### Glass Panel (Dark)
```css
.glass-panel {
    background: rgba(31, 31, 37, 0.4);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
}
```

### Glass Panel (Light)
```css
.glass-panel {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid #E5E7EB;
}
```

### Grid Background
```css
.grid-bg {
    background-image: 
        linear-gradient(rgba(0, 228, 121, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 228, 121, 0.03) 1px, transparent 1px);
    background-size: 32px 32px;
}
```

### Neon Glow
```css
.neon-glow {
    box-shadow: 0 0 15px rgba(0, 228, 121, 0.2);
}
```

### Scanline Animation
```css
@keyframes scan {
    from { top: -10%; }
    to { top: 110%; }
}
.scanline {
    height: 2px;
    background: linear-gradient(to right, transparent, #00ff88, transparent);
    opacity: 0.15;
    animation: scan 4s linear infinite;
}
```

---

## Component Inventory

| # | Design Component | Target Page | Category |
|---|-----------------|-------------|----------|
| 1 | `geekbid_desktop_hero` | `page.tsx` (Landing) | Hero |
| 2 | `geekbid_desktop_hero_motion_upgrade` | `page.tsx` (Landing) | Hero |
| 3 | `geekbid_mobile_hero` | `page.tsx` (Landing, mobile) | Hero |
| 4 | `geekbid_job_feed_dashboard` | `feed/page.tsx` | Dashboard |
| 5 | `geekbid_job_feed_advanced_motion` | `feed/page.tsx` | Dashboard |
| 6 | `auction_victory_match_found` | `jobs/[id]/page.tsx` | Auction |
| 7 | `freelancer_profile_geekscore` | `profile/page.tsx` | Profile |
| 8 | `account_settings_security_terminal` | `settings/page.tsx` | Settings |
| 9 | `escrow_financial_terminal` | `payments/page.tsx` | Finance |
| 10 | `milestone_payment_timeline` | `payments/page.tsx` | Finance |
| 11 | `post_a_job_pricing_engine` | `post-job/page.tsx` | Job Posting |
| 12 | `real_time_mission_control_chat` | `inbox/page.tsx` | Messaging |
| 13 | `system_notifications_event_log` | `notifications/page.tsx` | Notifications |
| 14 | `admin_analytics_protocol_telemetry` | `admin/page.tsx` | Admin |
| 15 | `admin_analytics_immersive_telemetry` | `admin/page.tsx` | Admin |
| 16 | `landing_page_faq_testimonials` | `page.tsx` (Landing) | Support |
| 17 | `theme_preview_imperial_light_mode` | Global theme toggle | Theme |
| 18 | `shader` | Background utility | Effects |
| 19 | `three.js` | Background utility | Effects |
| 20 | `geekbid_zap_logo` | Global brand | Branding |

---

## Shared Navigation Shell

All components share a **consistent navigation architecture**:

### TopNavBar
- Fixed top, `z-50`, `bg-surface/80 backdrop-blur-xl`
- GeekBid logo (Space Grotesk, `text-primary-container`)
- Nav links: Market, Escrow, Post Job, History
- Right: Search, Notifications, Connect Wallet button

### SideNavBar
- Fixed left, `w-64`, `bg-surface-container-low/50 backdrop-blur-2xl`
- User avatar + verification badge
- Nav items: Terminal, Contracts, Vault, Analytics, Settings
- Active state: `bg-primary-container/10 text-primary-fixed-dim border-r-2 border-primary-fixed-dim`

---

## Integration Priority

| Priority | Component | Rationale |
|----------|-----------|-----------|
| 🔴 P0 | Hero (Desktop + Motion) | Landing page — first impression for YC |
| 🔴 P0 | Job Feed Dashboard | Core product loop |
| 🟡 P1 | Auction Victory | Deal closure flow |
| 🟡 P1 | Escrow Terminal | Financial trust signals |
| 🟡 P1 | Post Job Pricing | Client onboarding |
| 🟡 P1 | Chat (Mission Control) | Communication backbone |
| 🟢 P2 | Profile + GeekScore | Reputation system |
| 🟢 P2 | Settings | User management |
| 🟢 P2 | Notifications | Activity feed |
| 🟢 P2 | Admin Analytics | Internal ops |
| 🔵 P3 | FAQ/Testimonials | Marketing |
| 🔵 P3 | Imperial Light Mode | Theme switching |
| 🔵 P3 | Shader / Three.js | Visual polish |
