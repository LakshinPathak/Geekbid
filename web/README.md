# GeekBid — Web App (Next.js 15)

The frontend + API layer of the GeekBid reverse-auction freelance marketplace.

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

# Optional
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```

### 2. Install & run

```bash
npm install
npm run dev      # http://localhost:3000
```

### 3. Seed test data

```bash
curl -X POST http://localhost:3000/api/seed
```

Test accounts: `maya@startup.io` / `arjun@devmail.io` — password `password123`

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  Landing page (animations, carousel, scroll triggers)
│   ├── feed/page.tsx             Role-based feed router
│   ├── login/page.tsx            Login + register
│   ├── post-job/page.tsx         Job creation wizard
│   ├── jobs/[id]/page.tsx        Job detail + bid interface
│   ├── inbox/page.tsx            Chat rooms
│   ├── profile/page.tsx          User profile
│   ├── notifications/page.tsx
│   ├── payments/page.tsx
│   ├── earnings/page.tsx         Freelancer only
│   ├── admin/page.tsx            Admin only
│   └── api/                      45 REST API routes (see root README)
│
├── components/
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
│   │   ├── MessageFreelancerModal.tsx
│   │   ├── FreelancerJobCard.tsx
│   │   └── ClientJobCard.tsx
│   ├── modals/
│   │   └── AuctionVictoryModal.tsx
│   ├── navbar.tsx
│   ├── mobile-bottom-nav.tsx
│   └── job-card.tsx
│
└── lib/
    ├── store.tsx       Context + all store actions (acceptJob, counterBid, cancelJob, completeJob, …)
    ├── auth.ts         authenticateRequest, JWT helpers
    ├── pricing.ts      getAdaptivePrice — demand-aware decay formula
    ├── mongodb.ts      Atlas connection singleton
    ├── email.ts        Nodemailer — 10 transactional templates
    ├── utils.ts        getCurrentPrice, formatMoney, SKILL_TAXONOMY, JOB_CATEGORIES
    └── data.ts         Static seed/reference data
```

## Key Store Actions

```ts
const {
  // Jobs
  postJob,       // POST /api/jobs
  acceptJob,     // PATCH /api/jobs/[id] — freelancer: accept price · client: award best bid
  cancelJob,     // PATCH /api/jobs/[id]/cancel
  completeJob,   // PATCH /api/jobs/[id]/complete
  counterBid,    // POST /api/bids — 30-min cooldown enforced client-side + server-side

  // Chat
  createChatRoom,  // POST /api/chat/rooms
  sendMessage,     // POST /api/chat/messages

  // Offers & invites (called directly via fetch in modals)
  createDirectOffer,  // POST /api/jobs/direct-offer

  // Notifications
  markNotificationRead,
  markAllRead,
} = useApp();
```

## API Routes

All 45 routes are documented in the root [README.md](../README.md#api-reference).

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
