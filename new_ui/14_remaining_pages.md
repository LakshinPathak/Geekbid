# 14 — Remaining Pages (Job Detail, Disputes, Referrals, Review)

> **Target Files:** Various secondary pages

---

## Job Detail Page — `web/src/app/jobs/[id]/page.tsx`

### Current State
Dynamic route for individual job viewing with:
- Job header (title, client, category, status)
- Price decay visualization (current price, decay rate, time remaining)
- Bid section (place bid, view existing bids)
- Accept/Counter bid actions (client view)
- Job description, required skills, deadline info

### Design System Upgrade
| Element | Change |
|---------|--------|
| Job card | Glass-panel with scanline |
| Price display | Terminal-style monospace with neon glow |
| Bid input | Glass input with emerald focus |
| Bid list | Glass cards with stagger animation |
| Action buttons | Neon glass CTA buttons |
| Timer | Live countdown with pulse effect |

---

## Disputes Page — `web/src/app/disputes/page.tsx`

### Current State
Dispute management for users with:
- Active disputes list
- Dispute detail with reason and evidence
- File dispute form (select transaction, reason, description)
- Status tracking (Open → In Review → Resolved)

### Design System Upgrade
| Element | Change |
|---------|--------|
| Dispute cards | Glass-panel with severity border (red/yellow/green) |
| Status timeline | Vertical glass progress steps |
| Evidence section | Glass-panel with file previews |
| Resolution area | Admin glass command panel |

---

## Referrals Page — `web/src/app/referrals/page.tsx`

### Current State
(Covered within Profile page as a tab/section)
- Referral link with copy button
- Referral stats (Invites, Signed Up, Completed, Credits)
- Referral code display

### Design System Upgrade
| Element | Change |
|---------|--------|
| Referral link card | Glass-panel with copy animation |
| Stats grid | Glass KPI boxes with animated counters |
| Share buttons | Social media glass buttons |
| Leaderboard | Glass table with rank badges |

---

## Review/Feedback Pages

### Current State
- Review submission within job detail page
- Rating stars (1-5)
- Text review input
- Review display on profile page

### Design System Upgrade
| Element | Change |
|---------|--------|
| Star rating | Animated gold star fill |
| Review card | Glass-panel with avatar and date |
| Submit form | Glass-panel with animated success state |

---

## Email Integration Touch Points (All Pages)

| Page | Email Trigger | Template |
|------|--------------|----------|
| Login/Signup | Welcome email | `email_welcome` |
| Post Job | Job posted confirmation | `email_job_posted` |
| Job Detail | Bid received notification | `email_bid_received` |
| Job Detail | Bid accepted notification | `email_bid_accepted` |
| Payments | Payment confirmation | `email_payment_confirmed` |
| Payments | Escrow released | `email_escrow_released` |
| Disputes | Dispute filed | `email_dispute_filed` |
| Disputes | Dispute resolved | `email_dispute_resolved` |
| Feed | Bid target reached alert | `email_bid_target_reached` |

---

## Implementation Priority Matrix

| Priority | Screen | Effort | Impact |
|----------|--------|--------|--------|
| 🔴 P0 | Landing Hero (01) | High | First impression |
| 🔴 P0 | Auth Pages (06) | Medium | User acquisition |
| 🔴 P0 | Job Feed (03) | High | Core experience |
| 🟡 P1 | Design Tokens (13) | Medium | Foundation |
| 🟡 P1 | Navigation (12) | Medium | Always visible |
| 🟡 P1 | Post Job Wizard (07) | Medium | Revenue driver |
| 🟡 P1 | Profile/GeekScore (05) | Medium | User retention |
| 🟢 P2 | Financial Terminal (08) | Medium | Monetization |
| 🟢 P2 | Auction Victory (04) | Low | Delight moment |
| 🟢 P2 | Admin Dashboard (10) | Medium | Internal tool |
| ⚪ P3 | Notifications (09) | Low | Polish |
| ⚪ P3 | Settings (11) | Low | Utility page |
| ⚪ P3 | FAQ/Testimonials (02) | Low | Conversion |
| ⚪ P3 | Remaining Pages (14) | Medium | Completeness |
