# GeekBid — Web App (Next.js 15)

The frontend + API layer of the GeekBid reverse-auction freelance marketplace.

**v11** — Job acceptance/escrow/chat/OAuth security hardening. See [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) (v11 addendum) and [`../geekbid_bid_acceptance_and_system_audit.md`](../geekbid_bid_acceptance_and_system_audit.md) for the full write-up.

**v10** — Cloudinary image CDN + Gemini AI features.

## Stack

| | |
|--|--|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Design system | Royal Dark — `#080b14` bg · `#c9a84c` gold · `#f0e8d4` ivory · Georgia serif + Inter sans |
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
```

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
│       └── ...                   45 other REST API routes (see root README)
│
├── components/
│   ├── CloudinaryAvatar.tsx      Single source of truth for ALL avatars (v10)
│   ├── AvatarUploader.tsx        CldUploadWidget — crop, upload, remove (v10)
│   ├── ai/
│   │   ├── AIBidStrategist.tsx   7-signal bid analysis panel (v10)
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
│   │   └── AuctionVictoryModal.tsx
│   ├── navbar.tsx
│   ├── mobile-bottom-nav.tsx
│   └── job-card.tsx
│
└── lib/
    ├── store.tsx       Context + all store actions (acceptJob, counterBid, cancelJob, completeJob, …)
    ├── auth.ts         authenticateRequest, JWT helpers
    ├── ai.ts           Gemini wrapper — single entry point for ALL AI calls (v10)
    ├── cloudinary.ts   Cloudinary server-side SDK config (v10)
    ├── pricing.ts      getAdaptivePrice — demand-aware decay formula
    ├── mongodb.ts      Atlas connection singleton
    ├── email.ts        Nodemailer — 10 transactional templates
    ├── utils.ts        getCurrentPrice, formatMoney, SKILL_TAXONOMY, JOB_CATEGORIES
    └── data.ts         Static seed/reference data
```

## v10 Feature Details

### Cloudinary Avatar System

`CloudinaryAvatar` is the single source of truth for every avatar in the app. It handles three cases automatically:

```tsx
// Cloudinary URL → CldImage (WebP, face-detect crop, responsive)
// External URL (Google) → <img>
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

All routes documented in the root [README.md](../README.md#api-reference). v10 additions: `/api/upload/sign`, `/api/upload/delete`, and 8 `/api/ai/*` routes.

## Design Tokens

```css
/* Backgrounds */
--bg-base:    #080b14   /* page background */
--bg-panel:   #0d1120   /* glass panel */
--bg-card:    #0a0d18   /* card surface */
--bg-input:   #111625   /* input field */

/* Text */
--text-primary: #f0e8d4  /* ivory — headings and body */
--text-muted:   #a8997e  /* warm gray — labels, hints */

/* Accent */
--gold:       #c9a84c   /* gold — CTAs, prices, active states */
--gold-dim:   rgba(201,168,76,0.22)  /* border default */
--gold-hover: rgba(201,168,76,0.35)  /* border hover */

/* Status */
--success:    #4caf7d
--danger:     #e57373
--info:       #60a5fa
```

## CSS Animation Classes (globals.css)

| Class | Effect |
|-------|--------|
| `animate-fade-in-up` | Blur-to-clear + slide up |
| `animate-fade-in-right` | Slide in from right |
| `animate-subtle-float` | Gentle vertical float loop |
| `animate-marquee` | Horizontal scroll (social proof) |
| `animate-card-border-glow` | Pulsing gold border |
| `animate-live-breathe` | Opacity oscillation |
| `animate-price-tick` | Green flash on price change |
| `progress-shimmer` | Shimmer sweep on progress bar |
| `hero-scan-line` | CRT scan-line sweep |
| `animate-hero-grid` | Dot-grid fade-in |
| `animate-spark` | Ember particle float |
