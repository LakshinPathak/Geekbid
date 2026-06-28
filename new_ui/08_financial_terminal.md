# 08 — Financial Terminal (Payments + Escrow)

> **Design Component:** `financial_dashboard_terminal`  
> **Target File:** `web/src/app/payments/page.tsx` (575 lines)

---

## Current Production State

A comprehensive payments page (575 lines) with:
- **Stats Row** — Total Spent/Earned, In Escrow, Available
- **Fund Escrow** — Amount input + Description + "Pay with Razorpay" button + payment result display
- **Transaction History** — Status filters (All, Held, Released, Disputed) + table with columns (Transaction, Amount, Fee, Net, Status, Action)
- **Release Confirmation** — Modal dialog for confirming escrow release
- Razorpay integration with mock mode fallback
- Mobile-responsive with stacked layouts

## Design System Upgrade

### Financial Terminal Aesthetic

| Element | Current | Design System Target |
|---------|---------|---------------------|
| Background | `bg-[#0A0A0F]` | Grid background + subtle pulse overlay |
| Stats Cards | `bg-[#12121A]` bordered | Glass-panel with data-specific accent colors |
| Payment Form | `bg-[#12121A]` card | Glass-panel with scanline accent border |
| CTA Button | `bg-[#00FF88]` solid | Neon glass button with pulse animation when ready |
| Transaction Table | Simple grid | Glass-panel table with hover row glow |
| Status Badges | Colored pills | Animated status indicators with subtle pulse |
| Release Modal | Basic card | Glass-panel overlay with blur backdrop |

### Terminal-Style Data Display

The design system emphasizes a **terminal/fintech** aesthetic for financial data:
- Monospaced font (`font-mono`) for amounts and IDs
- Blinking cursor animations on active fields
- Green-on-dark color scheme (like a trading terminal)
- Horizontal scanline across the payment form

### Key CSS Additions

```css
/* Financial Glass Panel */
.finance-card {
    background: rgba(31, 31, 37, 0.4);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(59, 75, 61, 0.3);
    border-radius: 20px;
}

/* Terminal Amount Display */
.terminal-amount {
    font-family: 'Space Mono', 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.5px;
}

/* Payment Ready Pulse */
@keyframes readyPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
}
.payment-ready {
    animation: readyPulse 2s infinite;
}

/* Transaction Row Hover */
.tx-row:hover {
    background: rgba(0, 255, 136, 0.03);
    border-left: 2px solid rgba(0, 255, 136, 0.3);
}

/* Escrow Status Animated */
.status-held {
    animation: statusPulse 3s infinite;
}
@keyframes statusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}
```

---

## Implementation Checklist

- [ ] Convert stats cards to glass-panel with accent borders
- [ ] Add terminal-style monospace to amounts
- [ ] Upgrade payment CTA with pulse animation
- [ ] Convert transaction table to glass-panel with hover glow
- [ ] Add animated status indicators
- [ ] Upgrade release modal to glassmorphic overlay
- [ ] Add scanline animation to payment form header
- [ ] Add success/failure animation to payment result

## API Dependencies

| Endpoint | Usage |
|----------|-------|
| `GET /api/payments` | Payment config (Razorpay key) |
| `POST /api/payments` | Create payment order |
| `PATCH /api/payments` | Verify payment |
| `POST /api/escrow/release` | Release held escrow |
| `GET /api/transactions` | Transaction history |

## File Changes Required

| File | Action |
|------|--------|
| `web/src/app/payments/page.tsx` | Visual overhaul to terminal aesthetic |
| `web/src/app/globals.css` | Add `.finance-card`, `.terminal-amount`, `.payment-ready` |
