# GeekBid — Imperial Light UI Migration Instructions

> **For**: Claude Code  
> **Project**: `/home/lakshinpathak/Downloads/Geekbid-master/`  
> **Stack**: Next.js (App Router) + MongoDB + Tailwind CSS + Resend Email  
> **Design System**: "Imperial Light" (Cyber-minimalist, glassmorphism)

---

## CONTEXT

You are migrating the GeekBid freelance auction platform from its current basic UI to a premium "Imperial Light" design system. All documentation lives in `new_ui/` (16 files). Read each file before working on its corresponding section.

The app is a **Next.js App Router** project at `web/`. Key paths:
- Pages: `web/src/app/` (page.tsx files)
- API Routes: `web/src/app/api/`  
- Shared Libs: `web/src/lib/` (mongodb.ts, auth.ts, email.ts)
- Styles: `web/src/app/globals.css`
- Config: `web/tailwind.config.ts`

MongoDB connection string: `mongodb+srv://lakshin25:Lakshin%40123@cluster0.wpsakax.mongodb.net/`

---

## PHASE 1: Foundation (Do This First)

### Step 1.1 — Design Tokens & CSS Utilities
**Read**: `new_ui/13_design_tokens_css_utilities.md`

1. Update `web/tailwind.config.ts` with the Imperial Light color palette:
   - Background: `#0A0A0F`, Surface: `#12121A`, Elevated: `#1A1A2E`
   - Primary: `#00FF88`, Secondary: `#00D4FF`, Accent: `#FF6B35`
   - Text Primary: `#E8E8F0`, Text Secondary: `#8888A0`
   - Border: `rgba(255,255,255,0.06)`
2. Add glassmorphism utilities to `globals.css`:
   - `.glass-panel` — `backdrop-blur: 24px`, `background: rgba(18,18,26,0.85)`, `border: 1px solid rgba(255,255,255,0.06)`
   - `.glass-card` — Same with `border-radius: 16px` and `padding: 24px`
   - `.glass-input` — For form inputs with glow focus states
   - `.glass-button-primary` — `#00FF88` bg with hover glow animation
   - `.glass-button-secondary` — Outlined variant
3. Add Google Font: `Inter` (weights: 400, 500, 600, 700) via `next/font/google`
4. Add CSS animations: `fadeInUp`, `slideInRight`, `pulseGlow`, `shimmer`
5. Add status badge utilities: `.badge-active`, `.badge-pending`, `.badge-completed`

### Step 1.2 — Navigation & Layout Shell
**Read**: `new_ui/12_navigation_layout.md`

1. Create `web/src/components/layout/Navbar.tsx`:
   - Glassmorphic top bar with backdrop blur
   - GeekBid logo (left), nav links (center), auth/profile actions (right)
   - Mobile hamburger menu with slide-in drawer
   - Active route indicator with `#00FF88` underline
   - Notification bell with unread count badge
2. Create `web/src/components/layout/Footer.tsx`:
   - Dark glass panel footer with links, socials, copyright
3. Update `web/src/app/layout.tsx` to wrap all pages with the new Navbar + Footer

---

## PHASE 2: Landing Page (Hero + Sections)

### Step 2.1 — Hero Section
**Read**: `new_ui/01_landing_hero.md`

Update `web/src/app/page.tsx`:
1. Replace the current hero with a full-viewport glassmorphic hero
2. Main headline: "Where Code Meets **Opportunity**" (bold the keyword in `#00FF88`)
3. Subtitle explaining the reverse-auction concept
4. Two CTA buttons: "Browse Projects" (primary) + "Post a Job" (secondary)
5. Live stats ticker showing: Active Auctions, Freelancers, Avg Savings %
6. Animated floating particles or gradient mesh background (CSS only, no Three.js)
7. Trust badges section below hero (GitHub verified, Escrow protected, etc.)

### Step 2.2 — How It Works + FAQ + Testimonials
**Read**: `new_ui/02_landing_faq_testimonials.md`

Continue in `page.tsx`:
1. "How It Works" — 3-step glassmorphic cards with icons (Post → Bid → Ship)
2. "Why GeekBid?" — Feature grid (6 cards) with hover glow effects
3. FAQ accordion with smooth expand/collapse animations
4. Testimonials carousel with glassmorphic cards
5. Final CTA section with gradient background

---

## PHASE 3: Auth Pages

### Step 3.1 — Login & Signup
**Read**: `new_ui/06_auth_pages.md`

Update `web/src/app/login/page.tsx`:
1. Split layout: left panel (branding/illustration), right panel (form)
2. Glassmorphic form card with `glass-input` styled fields
3. Toggle between Login/Register modes (existing logic preserved)
4. Google OAuth button with branded styling
5. Form validation with inline error states (red glow border)
6. Loading states with shimmer animations on submit
7. Preserve ALL existing auth logic — only change the JSX/styling

---

## PHASE 4: Core Pages

### Step 4.1 — Job Feed / Dashboard
**Read**: `new_ui/03_job_feed_dashboard.md`

Update `web/src/app/feed/page.tsx`:
1. Glassmorphic filter bar (category pills, search input, sort dropdown)
2. Job cards with glass-card styling:
   - Live price decay countdown timer (preserve existing `usePriceDecay` hook)
   - Skill tags with colored chips
   - Bid count indicator
   - "Featured" badge with glow effect for featured jobs
3. Client view: KPI cards at top (Active Jobs, Total Spend, Active Freelancers)
4. Freelancer view: KPI cards (Available Jobs, Active Bids, Earnings)
5. Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
6. Preserve ALL existing data fetching and state management

### Step 4.2 — Auction Victory Modal
**Read**: `new_ui/04_auction_victory.md`

Create `web/src/components/modals/AuctionVictoryModal.tsx`:
1. Celebration overlay when a bid is accepted
2. Confetti animation (CSS-based)
3. Glass panel showing: job title, final price, savings %, freelancer info
4. Action buttons: "Start Chat" + "View Milestones"
5. Integrate into feed page — trigger when job acceptance happens

### Step 4.3 — Profile Page
**Read**: `new_ui/05_freelancer_profile_geekscore.md`

Update `web/src/app/profile/page.tsx`:
1. Profile header card with avatar, name, role, GeekScore™ display
2. GeekScore™ circular progress ring (animated on mount)
3. Skills grid with glassmorphic skill chips
4. GitHub verification badge (if verified)
5. Stats row: Completed Jobs, Avg Rating, Response Time
6. Reviews section with glassmorphic review cards
7. Edit profile form in a glass modal
8. Preserve existing profile data fetching and update logic

### Step 4.4 — Post Job Wizard
**Read**: `new_ui/07_post_job_wizard.md`

Update `web/src/app/post-job/page.tsx`:
1. Multi-step wizard with progress indicator
2. Step 1: Title + Description (glassmorphic text inputs)
3. Step 2: Skills selection (tag picker with autocomplete)
4. Step 3: Pricing (starting price, minimum price, decay rate, estimated hours)
5. Step 4: Review & Submit
6. Pricing hint integration (call `/api/jobs/pricing-hint`)
7. Smooth transitions between steps
8. Preserve existing job creation API call logic

### Step 4.5 — Financial Terminal (Payments Page)
**Read**: `new_ui/08_financial_terminal.md`

Update `web/src/app/payments/page.tsx`:
1. Terminal-style glassmorphic dashboard
2. Balance card with total earnings/spending
3. Transaction list with status badges (held/released/disputed)
4. Escrow status indicators with progress bars
5. Pay Now / Release Escrow action buttons
6. Preserve existing Razorpay integration logic

### Step 4.6 — Notifications
**Read**: `new_ui/09_notifications_inbox.md`

Update `web/src/app/notifications/page.tsx`:
1. Glassmorphic notification cards grouped by date
2. Type-specific icons (bid, payment, job match, etc.)
3. Mark as read (single + mark all) with visual state change
4. Unread indicator (dot) on unread items
5. Empty state with illustration when no notifications
6. Preserve existing notification fetching logic

---

## PHASE 5: Admin & Settings

### Step 5.1 — Admin Dashboard
**Read**: `new_ui/10_admin_dashboard.md`

Update `web/src/app/admin/page.tsx`:
1. Admin-only KPI cards (Total Users, Active Jobs, Revenue, Open Disputes)
2. Users table with search, role filter, and action buttons
3. Disputes management section
4. Email logs viewer
5. Glassmorphic data tables
6. Preserve admin role-gating logic

### Step 5.2 — Settings & API Keys
**Read**: `new_ui/11_settings_api_keys.md`

Update `web/src/app/settings/page.tsx`:
1. Tabbed glassmorphic panel (Profile, API Keys, Preferences)
2. API key management: generate, view (masked), revoke
3. Glassmorphic danger zone for destructive actions
4. Preserve existing API key CRUD logic

---

## PHASE 6: Remaining Pages
**Read**: `new_ui/14_remaining_pages.md`

Apply glassmorphic styling to:
1. `web/src/app/chat/page.tsx` — Glass chat bubbles, room list sidebar
2. `web/src/app/jobs/[id]/page.tsx` — Job detail with bid list, accept UI
3. `web/src/app/referrals/page.tsx` — Referral stats, share code card
4. `web/src/app/teams/page.tsx` — Team management cards
5. `web/src/app/assessments/page.tsx` — Quiz cards with progress ring

---

## PHASE 7: New CRUD Operations
**Read**: `new_ui/15_crud_operations_audit.md`

Build these **Priority 1** endpoints (only P1 for now):
1. `GET /api/users/[id]` — Public profile data (exclude email/password)
2. `PATCH /api/jobs/[id]/cancel` — Client cancels own open job, sends `sendJobCancelledEmail`
3. `PATCH /api/jobs/[id]/complete` — Client marks job completed, sends summary email
4. `GET /api/notifications/count` — Returns `{ unread: number }` for navbar badge
5. `GET /api/bids/my` — Freelancer's bid history with job details joined

For each new endpoint:
- Follow the existing pattern in `web/src/app/api/` (NextRequest/NextResponse)
- Use `authenticateRequest` from `@/lib/auth` for protected routes
- Use `getDb` from `@/lib/mongodb` for database access
- Add corresponding email functions to `web/src/lib/email.ts` where noted

---

## CRITICAL RULES

1. **NEVER delete existing logic** — Only change JSX/TSX markup and CSS/Tailwind classes
2. **Preserve all API calls** — Keep every `fetch()`, `useEffect`, and state variable intact
3. **Preserve all hooks** — `usePriceDecay`, auth hooks, etc. must remain functional
4. **Preserve all env vars** — Don't change environment variable names
5. **Preserve all MongoDB queries** — Don't modify existing database operations
6. **Mobile-first** — All glassmorphic panels must be responsive
7. **Dark theme only** — Background is `#0A0A0F`, never use light backgrounds
8. **Use Inter font** — Replace default fonts with Inter from Google Fonts
9. **Animations are subtle** — `0.3s ease` transitions, no jarring effects
10. **Test each page** after modifying it by running `npm run dev`

---

## EXECUTION ORDER

```
Phase 1 → Phase 2 → Phase 3 → Phase 4.1 → Phase 4.3 → Phase 4.4 → 
Phase 4.5 → Phase 4.6 → Phase 4.2 → Phase 5 → Phase 6 → Phase 7
```

Start with Phase 1. After each phase, run `npm run dev` at `web/` and verify the changes visually. Ask me to review before moving to the next phase.

---

## REFERENCE FILES

All design specifications are in `new_ui/`:
- `00_design_system_overview.md` — Master overview
- `01_landing_hero.md` through `14_remaining_pages.md` — Per-screen specs
- `15_crud_operations_audit.md` — Backend gaps & new endpoints

Read each file BEFORE working on its corresponding section. They contain exact color codes, spacing, component structures, and file mappings.
