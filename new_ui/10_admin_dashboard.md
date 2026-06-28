# 10 — Admin Dashboard

> **Design Component:** `admin_command_center` (implied from component set)  
> **Target File:** `web/src/app/admin/page.tsx` (406 lines)

---

## Current Production State

A full admin dashboard (406 lines) with:
- **Role guard** — Only visible to admin users
- **Header** — Shield icon, title, "Seed Database" button
- **Stats Row** — Total Users, Open Jobs, Active Disputes, Revenue (Fees)
- **Tab System** — Disputes, Users, Jobs, Transactions (4 tabs with counter badges)
- **Disputes Tab** — Dispute cards with reason, amounts, status, resolve button
- **Users Tab** — Filterable user table (Name, Email, Role, Score, Verified)
- **Jobs Tab** — Job table (Title, Status, Current Price, Decay Rate, Bid Count)
- **Transactions Tab** — Financial table with filter + escrow release

## Design System Upgrade

### Command Center Aesthetic

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Background | `bg-[#0A0A0F]` | Grid background + subtle command center overlay |
| Header | Shield icon card | Large glass-panel with admin hologram effect |
| Stats | 4 bordered cards | Glass-panel with animated counter on load |
| Tab Bar | `bg-[#12121A]` segmented | Glass tab bar with active tab neon glow |
| Tables | Simple grids | Glass-panel tables with row hover glow |
| Dispute Cards | Bordered cards | Glass cards with severity-colored accent |

### Key Design Enhancements

```css
/* Admin Command Center */
.admin-header {
    background: linear-gradient(135deg, rgba(0, 255, 136, 0.05), rgba(31, 31, 37, 0.4));
    backdrop-filter: blur(24px);
    border: 1px solid rgba(0, 255, 136, 0.15);
}

/* Stat Counter Animation */
@keyframes countUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.stat-counter {
    animation: countUp 0.5s ease-out forwards;
}

/* Dispute Severity */
.dispute-high { border-left: 3px solid #ef4444; }
.dispute-medium { border-left: 3px solid #eab308; }
.dispute-low { border-left: 3px solid #6366f1; }
```

---

## Implementation Checklist

- [ ] Upgrade header to glass-panel with admin gradient
- [ ] Add animated counter on stat cards (useCountUp hook)
- [ ] Upgrade tab bar to glass segmented control
- [ ] Convert all tables to glass-panel
- [ ] Add severity indicators to dispute cards
- [ ] Add row hover glow effect to tables
- [ ] Implement real-time data refresh animation
- [ ] Add chart visualization for revenue/user metrics (optional)

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| All endpoints | Admin has full access to all data |
| `POST /api/seed` | Seed database |
| `POST /api/escrow/release` | Release escrow |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/admin/page.tsx` | Visual overhaul to command center aesthetic |
| `web/src/app/globals.css` | Add `.admin-header`, `.stat-counter`, `.dispute-*` |
