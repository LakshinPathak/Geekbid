# GeekBid — Web App (Next.js 16)

The frontend + API layer of the GeekBid reverse-auction freelance marketplace.

**v18** — Full sitewide retheme, "Royal Dark" (navy/gold/serif/flat) → "Pastel
Indigo" (cream/indigo/sans/soft-shadow/pill-shaped), color/shape only — no
backend, CRUD, or functional changes. Sourced from 4 Fable 5 mockups analyzed
in parallel, distilled into a token spec (`NEW_THEME.md`) with a verified WCAG
contrast pass, then executed in 9 phases across every page for both
client/freelancer and admin: `globals.css` foundation → shared chrome → auth/
landing → feed → job lifecycle → people/comms → money/account → admin → a
final full-tree audit. Each phase was verified live with Playwright (zero
console errors) and committed separately on `v18`. Notable fixes found along
the way: a `.glass-input` CSS rule that pill-radius'd `<textarea>` elements
into ovals that clipped placeholder/body text on 10+ pages (message
composers, dispute forms, bios, job descriptions); 6 plain `.ts` files
(`feed-helpers.ts`, `pricing.ts`, `utils.ts`'s `GEEK_TIERS`, the Razorpay
checkout theme color, transactional email HTML templates, and the landing
page's feature/testimonial data) that a `*.tsx`-only sweep had silently
skipped despite feeding already-retouched pages; the `components/ui/*`
shadcn primitives (Button, Card, Dialog, etc.) never being scheduled in any
phase; and several rainbow/off-palette decorative colors (skill-tier badges,
GeekScore ramp, confetti, chart gradients) consolidated into the new
single-accent-family palette.

Two more structural bugs surfaced in live production testing after the
9 phases landed, both fixed on `v18`: (1) the shadcn primitives carried
`dark:` Tailwind variants that respond to OS/browser `prefers-color-scheme`
by default (no `@custom-variant dark` is configured) — invisible in the old
all-dark theme, but painted inconsistent dark patches on buttons/inputs/
selects/badges for any user with their system in dark mode once the base
theme went light. Removed, since this app has exactly one fixed palette, no
theme toggle. (2) every custom class in `globals.css` (`.card`, `.btn-primary`,
`.glass-input`, etc.) was plain unlayered CSS, which per the cascade spec
always outranks anything in `@layer utilities` — silently defeating
one-off Tailwind overrides like `className="glass-input pl-10"` sitewide
(visible as a `$` icon overlapping input text on the payments page, among
other spots). Fixed by wrapping the component classes in `@layer components`,
matching Tailwind v4's intended layer order.

Also on `v18`, but a separate feature (not part of the retheme): the
category taxonomy expanded past dev/tech-only. `JobCategory` and
`JOB_CATEGORIES` (`lib/utils.ts`) gained `writing` (Writing & Translation)
and `video` (Video & Animation), `design` was relabeled "Graphics &
Design," and `SKILL_TAXONOMY` gained 15 matching skills — mirrored into
the server-side category whitelist in both job-creation routes and the
AI smart-search prompt's category enum, so the new values are actually
accepted end-to-end, not just selectable in a dropdown that silently
falls back to "other." The live database (`geekbid` on the shared Atlas
cluster) was seeded with 3 new freelancer personas (a designer, a
copywriter, a video editor/animator) and 4 new open jobs across the new
categories, so the feed/talent-pool/market-intelligence panels show
real breadth immediately rather than only after someone manually posts
a non-tech job.

Full spec: [`../NEW_THEME.md`](../NEW_THEME.md), page-by-page execution map:
[`../FRONTEND_PAGES.md`](../FRONTEND_PAGES.md).

**v17** — Real Free/Plus/Premium SaaS tiering, executed in 5 phases: `src/lib/plans.ts` as
the single source of truth for tier numbers; quota enforcement (jobs, bids, AI, teams,
invites, featured boosts, API keys) on **every** tier via atomic `findOneAndUpdate` checks,
not just free; 3 confirmed quota-bypass bugs closed (`direct-offer`, the job-accept path,
`POST /api/keys`); admin plan overrides + per-tier fee config; pay-per-boost featured-job
monetization (reuses the existing one-off Razorpay flow); and a full Razorpay recurring
subscription billing system — lifecycle routes, a signature-verified idempotent webhook
state machine, MongoDB-backed distributed rate limiting, 9 billing email templates, and
reconciliation/retry cron jobs (code-complete, pending real Razorpay Plan setup). Full
write-up: [`../README.md`](../README.md#whats-in-v17), execution checklist:
[`../SAAS_PHASED_EXECUTION_PLAN.md`](../SAAS_PHASED_EXECUTION_PLAN.md).

**v17 refinements** (post-Phase-4, also on `main`/`master` now) — sitewide typography
overhaul (`Inter` + bare `Georgia` → self-hosted `Plus Jakarta Sans` + `Fraunces`, fixing a
CSS-custom-property-inheritance bug in the process); a redesigned, consolidated landing page
(the price-decay mechanic gets its own full-bleed "live market terminal" section instead of
a hero-corner widget; repeated AI-tell "eyebrow" labels removed; page cut from ~9 sections to
5); layout-width consistency across 10 pages + the navbar; a feed subscription widget with
properly signature-verified Razorpay checkout; and a full CRUD audit of every API route that
found and fixed 7 real bugs (a bid-list authorization leak, one-sided dispute visibility,
two missing invite guards, a recency-sort bug, a crash-to-500 on bad IDs, and a broken
recipient-name lookup across 4 transactional-email call sites). Full write-up:
[`../README.md`](../README.md#v17-refinements-post-phase-4).

**v17 live-testing pass** (also on `main`/`master`) — the CRUD audit above tested the API
directly; this pass actually drove the app in a browser as real client/freelancer/admin
accounts, clicking through every page and interactive element (185-row MECE checklist,
[`../CRUD_INTERACTION_TEST_PLAN.md`](../CRUD_INTERACTION_TEST_PLAN.md)), and found + fixed 14
more bugs, every one re-verified against the real database. Most notable: suspended and
soft-deleted users could both still log in (neither was ever checked); dispute resolution
reported "resolved" while silently never releasing or refunding the actual escrowed
transaction; the auction-victory modal could show the wrong winner's name and the wrong
final price after a client accepted a bid (both re-derived client-side instead of trusting
the server's response); and the pricing page could fire a real downgrade-via-checkout
mislabeled as an "Upgrade" button. Also confirmed two gaps are missing backend capabilities
rather than missing buttons: there's no `POST /api/disputes` route at all, and no
partial-payout mechanism exists for a "Split 50/50" dispute resolution — both left
unbuilt as scoping decisions, not bug fixes.

**v17 code-review pass** (also on `main`/`master`) — a systematic file-by-file review of the
whole codebase (not live-testing this time), partitioned across auth/security,
jobs/bids/pricing, payments/financial, AI/chat/misc APIs, and frontend, found and fixed 19
more bugs, the highest-risk ones re-verified live. Most notable: the mock payment flow always
failed signature verification (broken in the current environment), direct-offer jobs could be
accepted by any freelancer instead of just the intended recipient, GitHub "verification"
proved nothing about actual account ownership, reviews could be forged against an unrelated
stranger, and two racy status transitions (job completion, milestone approve/submit/start)
could double-fire side effects. Also removed the landing page's FAQ section and fixed two
background-color mismatches. Full write-up:
[`../README.md`](../README.md#full-codebase-code-review-19-more-bugs).

**v16** — Landing page + feed dashboard visual redesign (glass panels, tilt effects, animated counters, skeleton/empty states), dual-role accounts (`User.roles[]` + `POST /api/auth/switch-role`, so one login can be both a client and a freelancer), an OAuth sign-in bug fix (Google login no longer silently mislogs you into the wrong role), and bug fixes found via live testing: QuickBid could ask for a price below the job floor (now clamped client-side and enforced server-side in `POST /api/bids`), a feed duplicate-key React crash, and the job detail page's layout. Full write-up: [`../README.md`](../README.md#whats-in-v16), research trail: [`../oauthfix_plan.md`](../oauthfix_plan.md).

**v15** — Atomic AI-quota and milestone-escrow checks (closes two check-then-write races), rate limiting added to all AI routes + token refresh + the public v1 API, a token-refresh race fix in `store.tsx`, and root `error.tsx`/`loading.tsx`. See [`../V15_FIXES.md`](../V15_FIXES.md).

**v12** — Follow-up security pass: admin-key removed from client bundle, payment verification made idempotent (no replay), direct-offer accept made atomic, `GET /api/bids` + `GET /api/milestones` now require auth, all AI routes quota-capped. See [`../geekbid_review_2026-07-02.md`](../geekbid_review_2026-07-02.md).

**v11** — Job acceptance/escrow/chat/OAuth security hardening. See [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) (v11 addendum) and [`../geekbid_bid_acceptance_and_system_audit.md`](../geekbid_bid_acceptance_and_system_audit.md) for the full write-up.

**v10** — Cloudinary image CDN + Gemini AI features.

## Stack

| | |
|--|--|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Design system | Pastel Indigo (v18) — `#fbfaf7` cream bg · `#4b3f8f` indigo accent · `#3d3a45` text · Plus Jakarta Sans + IBM Plex Mono (was "Royal Dark": `#080b14` navy · `#c9a84c` gold · Fraunces serif) |
| State | React Context (`src/lib/store.tsx`) |
| Database | MongoDB Atlas (native driver) |
| Auth | JWT + bcrypt + Google OAuth 2.0 |
| Image CDN | Cloudinary — `next-cloudinary` (`CldImage`, `CldUploadWidget`), face-detect crop, WebP auto |
| AI | Google Gemini 2.0 Flash via `@google/generative-ai` |
| Email | Nodemailer |
| Icons | Lucide React |
| Toasts | Sonner |

## Getting Started

### 1. Environment

Create `web/.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/geekbid?retryWrites=true&w=majority
NEXTAUTH_SECRET=any-random-32-char-string
NEXTAUTH_URL=http://localhost:3000
ADMIN_SECRET_KEY=any-random-string             # gates /admin and creating new admin users

# Cloudinary (v10) — create free account at cloudinary.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret          # server-side only
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=geekbid_unsigned

# Gemini AI (v10) — get key at aistudio.google.com
GEMINI_API_KEY=your_gemini_key                 # server-side only
AI_MODEL=gemini-2.0-flash

# Optional
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx                    # v17 — required for /api/webhooks/razorpay to accept events
RAZORPAY_PLAN_ID_PLUS=plan_xxx                 # v17 — subscriptions run in mock mode without these
RAZORPAY_PLAN_ID_PREMIUM=plan_xxx
CRON_SECRET=any-random-string                  # v17 — required by /api/cron/*
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RESEND_API_KEY=re_your_key                     # transactional email
```

> This file must stay in sync with `web/.env.example`, `web/Dockerfile`'s `ARG` list, and the `build` job env block in `.github/workflows/ci.yml` — see the note at the bottom of `.env.example`.

> **Cloudinary setup:** Create an upload preset named `geekbid_unsigned` (unsigned mode) on your Cloudinary dashboard.

### 2. Install & run

```bash
npm install
npm run dev      # http://localhost:3000
```

### 3. Seed test data

```bash
curl -X POST http://localhost:3000/api/seed
```

This works without auth only on a fresh, empty database (it's what creates the seeded admin account). Re-seeding an already-populated database requires that admin's Bearer token — see the root [README's seed instructions](../README.md#4-seed-the-database).

Test accounts: `maya@startup.io` / `arjun@devmail.io` — password `password123`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  Landing page (animations, carousel, scroll triggers)
│   ├── feed/page.tsx             Role-based feed router
│   ├── login/page.tsx            Login + register
│   ├── post-job/page.tsx         Job creation wizard + AI description gen + AI pricing
│   ├── jobs/[id]/page.tsx        Job detail + bid interface + AI Bid Strategist + AI Evaluator
│   ├── inbox/page.tsx            Chat rooms
│   ├── profile/page.tsx          User profile + avatar uploader
│   ├── notifications/page.tsx
│   ├── payments/page.tsx
│   ├── earnings/page.tsx         Freelancer only
│   ├── admin/page.tsx            Admin only
│   └── api/
│       ├── upload/
│       │   ├── sign/route.ts     Cloudinary signed upload (v10)
│       │   └── delete/route.ts   Image deletion with ownership check (v10)
│       ├── ai/
│       │   ├── bid-strategy/     Gemini bid analysis, free 2/month gating (v10)
│       │   ├── evaluate-bids/    Client bid value scoring (v10)
│       │   ├── generate-description/  Job description AI (v10)
│       │   ├── pricing-advisor/  Starting price + floor + decay AI (v10)
│       │   ├── summarize-reviews/
│       │   ├── smart-search/
│       │   ├── chat-assist/
│       │   └── quality-check/
│       ├── subscriptions/        v17 — POST/GET/PATCH subscription lifecycle (mock mode w/o real Plan IDs)
│       ├── webhooks/razorpay/    v17 — signature-verified, idempotent billing webhook
│       ├── cron/                 v17 — reconcile-subscriptions (daily), retry-webhooks (15min)
│       └── ...                   ~80 total REST API routes (see root README)
│
├── components/
│   ├── CloudinaryAvatar.tsx      Single source of truth for ALL avatars (v10)
│   ├── AvatarUploader.tsx        CldUploadWidget — crop, upload, remove (v10)
│   ├── PlanLimitBanner.tsx       v17 — reusable 80%+-quota-used banner
│   ├── ai/
│   │   ├── AIBidStrategist.tsx   7-signal bid analysis panel (v10), tier-aware quota as of v17
│   │   ├── AIBidEvaluator.tsx    Client bid value ranking (v10)
│   │   ├── AIDescriptionButton.tsx  ✨ Generate job description (v10)
│   │   └── AIPricingAdvisor.tsx  Pricing recommendation panel (v10)
│   ├── feed/
│   │   ├── ClientFeed.tsx        "Procurement Terminal" — client role
│   │   ├── FreelancerFeed.tsx    "Mission Control" — freelancer role
│   │   ├── MyJobsSection.tsx     Job carousel with inline bid panels
│   │   ├── TalentPool.tsx        Freelancer browse for clients
│   │   ├── SpendAnalytics.tsx
│   │   ├── FreelancerStats.tsx
│   │   ├── RecommendedCarousel.tsx
│   │   ├── ActiveBidsTracker.tsx
│   │   ├── MarketIntel.tsx
│   │   ├── CompetitorAnalysis.tsx
│   │   ├── DirectHireModal.tsx   GeekScore > 500 gate
│   │   ├── InviteToBidModal.tsx
│   │   └── MessageFreelancerModal.tsx
│   ├── modals/
│   │   ├── AuctionVictoryModal.tsx
│   │   └── FeaturedBoostModal.tsx  v17 — pay-per-boost checkout
│   ├── navbar.tsx
│   ├── mobile-bottom-nav.tsx
│   └── job-card.tsx
│
└── lib/
    ├── store.tsx       Context + all store actions (acceptJob, counterBid, cancelJob, completeJob, …)
    ├── auth.ts         authenticateRequest, JWT helpers
    ├── plans.ts        v17 — PlanTier/PlanConfig/PLANS, getPlanConfig() — single source of truth for tiers
    ├── razorpay.ts     v17 — shared Razorpay REST helper + webhook signature verification
    ├── rate-limit.ts   v17 — MongoDB-backed distributed rate limiter (replaces sanitize.ts's in-memory Map)
    ├── plan-downgrade.ts   v17 — handleDowngrade(): LIFO API-key revocation, team freeze/over-limit flow
    ├── webhook-processing.ts  v17 — Razorpay subscription webhook state machine (6 handlers)
    ├── billing-emails.ts  v17 — 9 subscription/billing email templates
    ├── middleware/plan-header.ts  v17 — X-User-Plan header for cross-tab plan sync
    ├── ai.ts           Gemini wrapper — single entry point for ALL AI calls (v10)
    ├── cloudinary.ts   Cloudinary server-side SDK config (v10)
    ├── pricing.ts      getAdaptivePrice — demand-aware decay formula
    ├── mongodb.ts      Atlas connection singleton
    ├── email.ts        Nodemailer/Resend — 20+ transactional templates
    ├── utils.ts        getCurrentPrice, formatMoney, SKILL_TAXONOMY, JOB_CATEGORIES
    ├── ai-plan-limit.ts  Atomic AI usage quota, tier-aware as of v17 (was free-only)
    └── sanitize.ts     Input sanitization (rate limiting moved to rate-limit.ts in v17)
```

## v10 Feature Details

### Cloudinary Avatar System

`CloudinaryAvatar` is the single source of truth for every avatar in the app. It handles three cases automatically:

```tsx
// Cloudinary URL → CldImage (WebP, face-detect crop, responsive)
// External URL (Google) → <img>, falls back to initials on load failure (v17 refinement)
// No URL → initials fallback (Royal Dark styling)
<CloudinaryAvatar
  avatarUrl={user.avatarUrl}    // optional
  avatarInitial={user.avatarInitial}
  size="md"                     // xs | sm | md | lg | xl
/>
```

Avatar surfaces: navbar (desktop + mobile), profile header, profile reviewer, public profile, inbox sidebar, chat header, job cards, TalentPool, MyJobsSection, team page, admin list, landing testimonials.

`AvatarUploader` wraps `CldUploadWidget` for profile photo upload:
- Crop-to-square enforced
- Max 5 MB, formats: jpg/png/webp/gif
- Royal Dark widget theme
- Change + Remove buttons

### AI Bid Strategist

The flagship AI feature. Appears on every job detail page for freelancers.

**7 signals analysed:**
1. Current decayed price (live)
2. Decay rate + pricing mode
3. Demand multiplier (adaptive engine)
4. Bid count + unique bidders
5. Bid price distribution (min, max, avg, cluster)
6. Time remaining to deadline
7. Freelancer's GeekScore, skills, and hourly rate range

**Returns:** suggested bid, win probability %, confidence level, timing recommendation, risk bullets, 2 alternatives with Apply buttons.

**Free plan gating:** 2 uses/month. Counter shown on the Analyze button. Upgrade prompt on limit reached.

### AI Bid Evaluator

Client-side panel below the bid comparison table. Scores each bid by value (not just lowest price): considers price position, skill match, GeekScore, and commitment. Highlights the recommended bid with a one-click Accept.

### AI Description Generator

On the Post Job page: enter a title → click **✨ Generate** → Gemini writes a 150-250 word professional description with deliverables and requirements.

### AI Pricing Advisor

On the Post Job page: Gemini recommends starting price, floor price, and hourly decay rate based on job title, category, skills, and estimated hours. One-click "Apply" fills all three pricing fields.

## Security Rules

| Rule | Enforcement |
|------|-------------|
| `GEMINI_API_KEY` never client-side | Only imported in `lib/ai.ts` (server module) |
| `CLOUDINARY_API_SECRET` never client-side | Only imported in `lib/cloudinary.ts` (server module) |
| All AI routes require auth | `authenticateRequest()` at top of every `/api/ai/*` handler |
| Upload delete verifies ownership | Checks `user.avatarPublicId === publicId` before destroy |
| AI errors never break pages | All AI components catch errors and hide themselves gracefully |

## Key Store Actions

```ts
const {
  // Jobs
  postJob,       // POST /api/jobs
  acceptJob,     // PATCH /api/jobs/[id] — freelancer: accept price · client: award best bid
  cancelJob,     // PATCH /api/jobs/[id]/cancel
  completeJob,   // PATCH /api/jobs/[id]/complete
  counterBid,    // POST /api/bids — 30-min cooldown enforced client-side + server-side

  // Profile (v10: avatarUrl/avatarPublicId now accepted)
  updateProfile, // PATCH /api/user

  // Chat
  createChatRoom,
  sendMessage,

  // Offers & invites
  createDirectOffer,

  // Notifications
  markNotificationRead,
  markAllRead,
} = useApp();
```

## API Routes

All routes documented in the root [README.md](../README.md#api-reference-full). v10 additions: `/api/upload/sign`, `/api/upload/delete`, and 8 `/api/ai/*` routes. v17 additions: `/api/user/plan`, `/api/admin/users/[id]/plan`, `/api/subscriptions`, `/api/webhooks/razorpay`, `/api/cron/reconcile-subscriptions`, `/api/cron/retry-webhooks`.

## Design Tokens (v18 — "Pastel Indigo")

```css
/* Backgrounds */
--bg-base:    #fbfaf7   /* page background — warm cream */
--bg-panel:   #fbfaf7   /* glass panel */
--bg-card:    #ffffff   /* card surface */
--bg-input:   #ffffff   /* input field (pill-shaped) */
--bg-muted:   #f4f2ee   /* muted/neutral tile */

/* Text */
--text-primary:   #3d3a45  /* near-black plum-gray — headings and body */
--text-secondary: #6f6a7d  /* labels, meta text */
--text-tertiary:  #b3aec0  /* decorative micro-text only — low contrast by design */

/* Accent */
--accent:       #4b3f8f   /* deep indigo — CTAs, prices, active states */
--accent-mid:   #9c8fd8   /* progress fills, chart lines, focus rings */
--accent-hover: #3d3373   /* button hover / deep variant */
--accent-dim:   rgba(75,63,143,0.22)  /* border default */
--accent-hover-border: rgba(75,63,143,0.35)  /* border hover */

/* Status — deliberately no saturated red; terracotta reads calmer */
--success: #4d7245
--danger:  #96543f   /* readable/body use; #b06a56 for large/decorative only */
--warning: #7a6a2c   /* readable/body use; #a08a3c for large/decorative only */

/* Shape — full inversion from the old sharp/flat 2-6px scale */
--radius-pill: 99px   /* buttons, badges, pills — universal */
--radius-card: 16px   /* cards */
--radius-tile: 12px   /* stat tiles, outer wrappers */
```

Full rationale, the complete old→new token mapping, and the WCAG contrast
audit behind these choices: [`../NEW_THEME.md`](../NEW_THEME.md).

## CSS Animation Classes (globals.css)

| Class | Effect |
|-------|--------|
| `animate-fade-in-up` | Blur-to-clear + slide up |
| `animate-fade-in-right` | Slide in from right |
| `animate-subtle-float` | Gentle vertical float loop |
| `animate-marquee` | Horizontal scroll (social proof) |
| `animate-card-border-glow` | Pulsing indigo border (v18 — was gold) |
| `animate-live-breathe` | Opacity oscillation |
| `animate-price-tick` | Green flash on price change |
| `progress-shimmer` | Shimmer sweep on progress bar |
| `hero-scan-line` | CRT scan-line sweep |
| `animate-hero-grid` | Dot-grid fade-in |
| `animate-spark` | Ember particle float |
