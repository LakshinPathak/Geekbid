# 09 — Notifications & Inbox

> **Design Components:** `notification_center` (implied)  
> **Target Files:** `web/src/app/notifications/page.tsx` (162 lines) + `web/src/app/inbox/page.tsx` (248 lines)

---

## Notifications Page — Current State

Compact 162-line notification center with:
- **Filter tabs** — All, Price Drops, Bids, Payments, Matches
- **Notification cards** — Icon + Title + Body + Timestamp + Unread indicator
- **Mark all read** — Button to clear unread status
- **Icon system** — TrendingDown (price_drop), MessageSquare (counter_bid), DollarSign (payment), Zap (job_match)

## Inbox (Chat) Page — Current State

248-line messaging system with:
- **Room list** — Left panel with search + room cards
- **Message thread** — Right panel with chronological messages
- **Send input** — Text input + Send button
- **Room metadata** — Other participant name, job reference, last message preview

## Design System Upgrade

### Notifications

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Container | `bg-[#0A0A0F]` | Grid background |
| Cards | `bg-[#12121A]` bordered | Glass-panel with type-specific accent border |
| Unread Indicator | Green dot + left border | Animated pulse dot + full card glow |
| Filter Tabs | Pill buttons | Glass segmented control |
| Empty State | Simple icon + text | Illustrated empty state with CTA |
| Group Headers | None | Date-based grouping ("Today", "Yesterday", "Earlier") |

### Inbox (Chat)

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Room List | Simple card list | Glass-panel sidebar with hover glow |
| Message Bubbles | Basic divs | Glass bubbles with sender coloring |
| Input Area | Simple input | Glass input with typing indicator |
| Online Status | None | Green dot indicator on user avatar |
| Timestamps | Plain text | Relative time with hover for absolute |
| File Sharing | None | Drag-and-drop attachment area |

### Key CSS Additions

```css
/* Notification Glass Card */
.notif-card {
    background: rgba(31, 31, 37, 0.3);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(59, 75, 61, 0.2);
    transition: all 0.3s ease;
}
.notif-card.unread {
    border-left: 3px solid #00ff88;
    background: rgba(0, 255, 136, 0.02);
}

/* Chat Bubble */
.chat-bubble-self {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 16px 16px 4px 16px;
}
.chat-bubble-other {
    background: rgba(31, 31, 37, 0.4);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 16px 16px 16px 4px;
}

/* Unread Pulse */
@keyframes unreadPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.7; }
}
.unread-dot {
    animation: unreadPulse 2s infinite;
}
```

---

## Implementation Checklist

### Notifications
- [ ] Upgrade cards to glass-panel
- [ ] Add animated unread pulse indicator
- [ ] Implement date-based grouping
- [ ] Upgrade filter tabs to glass segmented control
- [ ] Add card entrance animations

### Inbox
- [ ] Upgrade room list to glass sidebar
- [ ] Redesign message bubbles with directional radius
- [ ] Add online status indicators
- [ ] Upgrade send input to glass-styled
- [ ] Add typing indicator animation

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `GET /api/notifications` | Notification data |
| `PATCH /api/notifications/:id` | Mark as read |
| `GET /api/chat/rooms` | Chat rooms |
| `GET /api/chat/messages` | Messages for a room |
| `POST /api/chat/messages` | Send message |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/notifications/page.tsx` | Glass-panel upgrade |
| `web/src/app/inbox/page.tsx` | Chat UI overhaul |
| `web/src/app/globals.css` | Add `.notif-card`, `.chat-bubble-*`, `.unread-dot` |
