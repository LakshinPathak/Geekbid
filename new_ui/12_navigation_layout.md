# 12 — Navigation & Layout Shell

> **Design Components:** `navigation_bar_desktop` + `navigation_bar_mobile` (implied)  
> **Target File:** `web/src/app/layout.tsx` + `web/src/components/Navbar.tsx` (if exists)

---

## Current Production State

The layout uses a top navigation bar embedded in `layout.tsx` with:
- **Logo** — "GeekBid" text with emerald accent
- **Nav Links** — Feed, Post Job, Payments, Profile, Admin (role-gated)
- **Role switcher** — Dropdown for dev mode role switching
- **User menu** — Avatar + Name + Logout
- **Notifications** — Bell icon with unread count badge
- **Mobile** — Hamburger menu with slide-out drawer

## Design System Upgrade

### Desktop Navigation

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Bar Background | `bg-[#0A0A0F]/80 backdrop-blur-sm` | Glass-panel: `rgba(10, 10, 15, 0.7)` + `blur(20px)` |
| Logo | Text-only | Animated logo with subtle glow pulse |
| Nav Links | Simple text links | Glass pill buttons with active state glow |
| Active Link | Color change only | Emerald underline bar + glass background |
| Notification Badge | Small circle | Animated pulse badge |
| User Avatar | Text initial in circle | Ring-bordered avatar with online indicator |
| Separator | None or border | Subtle emerald gradient line |

### Mobile Navigation

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Menu Button | Standard hamburger | Animated hamburger → X transition |
| Drawer | Slide-out panel | Glass-panel full-screen overlay |
| Menu Items | Stacked links | Large touch-friendly glass buttons with icons |
| Close | X button | Swipe gesture + X button |

### Key CSS Additions

```css
/* Glass Navbar */
.nav-glass {
    background: rgba(10, 10, 15, 0.7);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(59, 75, 61, 0.2);
    position: sticky;
    top: 0;
    z-index: 50;
}

/* Active Nav Link */
.nav-link-active {
    background: rgba(0, 255, 136, 0.1);
    color: #00ff88;
    position: relative;
}
.nav-link-active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #00ff88;
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

/* Mobile Glass Overlay */
.mobile-nav-overlay {
    background: rgba(10, 10, 15, 0.95);
    backdrop-filter: blur(40px);
}
```

---

## Implementation Checklist

- [ ] Upgrade navbar background to glassmorphic
- [ ] Add animated active link indicators
- [ ] Implement logo glow animation
- [ ] Upgrade notification badge with pulse
- [ ] Add avatar ring border with online status
- [ ] Upgrade mobile drawer to glass overlay
- [ ] Add animated hamburger → X transition
- [ ] Implement scroll-triggered navbar opacity change

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/layout.tsx` | Navbar visual overhaul |
| `web/src/app/globals.css` | Add `.nav-glass`, `.nav-link-active`, `.mobile-nav-overlay` |
