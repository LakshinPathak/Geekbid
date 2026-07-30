# GeekBid — Zero-Dependency Feature Build List

> **Purpose**: Features from Phase 2 & 3 that can be built using ONLY the existing tech stack.
> No new npm packages, no new third-party services (no Cloudinary, SendGrid, Sentry, PostHog, etc.).
> Hand this file to Claude Code for implementation.

---

## Existing Stack (Already Installed)

| Layer | What's Available |
|-------|-----------------|
| **Web** | Next.js 16, React 19, Radix UI, Tailwind CSS 4, Lucide Icons, Sonner (toasts), jose (JWT), bcryptjs, mongodb driver |
| **Backend** | Express 4, helmet, cors, rate-limit, jsonwebtoken, bcryptjs, mongodb driver, razorpay SDK, socket.io |
| **Mobile** | React Native 0.81, Expo SDK 54, React Navigation, socket.io-client |
| **Database** | MongoDB Atlas (native driver, already connected) |

---

## Features That Need ZERO New Dependencies (13 Total)

### Feature 1: Reviews & Ratings System
**Priority**: High | **Complexity**: Medium | **Phase**: 2

**What to build**:
- New `reviews` MongoDB collection
- Clients can review freelancers after job completion (escrow released)
- Freelancers can review clients after job completion
- 1–5 star rating + text review (max 1000 chars)
- One review per user per job (enforce uniqueness)
- Average rating calculated and stored on user document
- GeekScore algorithm update: factor in average rating

**Schema** (`reviews` collection):
```json
{
  "_id": "ObjectId",
  "jobId": "string",
  "reviewerId": "string",
  "revieweeId": "string",
  "rating": "number (1-5)",
  "comment": "string (max 1000 chars)",
  "reviewerRole": "client | freelancer",
  "createdAt": "ISO string"
}
```

**API Routes (Web — Next.js)**:
- `POST /api/reviews` — Create review (auth required, only after escrow released)
- `GET /api/reviews?userId=xxx` — Get reviews for a user
- `GET /api/reviews?jobId=xxx` — Get reviews for a job

**Backend Microservice**:
- Add to existing auth-service or create review endpoints in job-service

**UI**:
- Review modal on `/my-jobs` page after escrow is released
- Star rating component (build with Lucide Star icons, no library needed)
- Reviews section on user profile page (`/profile`)
- Average rating badge on JobCard component (show client's rating)

**Indexes**:
```
{ jobId: 1, reviewerId: 1 } — unique (one review per reviewer per job)
{ revieweeId: 1, createdAt: -1 } — for fetching user reviews
```

---

### Feature 2: Job Categories & Tags Taxonomy
**Priority**: High | **Complexity**: Low | **Phase**: 2

**What to build**:
- Predefined category system for jobs
- Categories: `AI/ML`, `Web Development`, `Mobile`, `DevOps/Cloud`, `Security`, `Data Engineering`, `Blockchain/Web3`, `Design`, `QA/Testing`, `Other`
- Add `category` field to jobs collection
- Filter jobs by category on feed page
- Category pills/tabs on the feed page UI

**Schema change** (add to `jobs` documents):
```json
{
  "category": "string (enum: ai_ml | web_dev | mobile | devops | security | data_eng | blockchain | design | qa | other)"
}
```

**Changes needed**:
- Update `POST /api/jobs` to accept `category` field (required)
- Update `GET /api/jobs` to support `?category=xxx` filter
- Update post-job form (`/post-job`) with category dropdown
- Add category filter tabs/pills to feed page (`/feed`)
- Add category badge to JobCard component
- Update seed data to include categories on existing jobs
- Add MongoDB index: `{ category: 1, status: 1, postedAt: -1 }`

---

### Feature 3: Smart Job Matching Algorithm
**Priority**: High | **Complexity**: Medium | **Phase**: 2

**What to build**:
- Match freelancers to jobs based on skill overlap
- Score formula: `matchScore = (overlapping skills / required skills) × 100`
- Boost score based on: GeekScore, past completion rate, availability
- Show "Match %" badge on job cards for logged-in freelancers
- "Recommended for You" section at top of feed page
- Trigger notification when a new job matches >60% of freelancer's skills

**Implementation** (no ML needed — pure MongoDB aggregation):
```javascript
// Pseudocode for match scoring
function calculateMatch(freelancerSkills, jobSkillsRequired) {
  const overlap = jobSkillsRequired.filter(s => freelancerSkills.includes(s));
  const skillScore = (overlap.length / jobSkillsRequired.length) * 100;
  return Math.round(skillScore);
}
```

**API Routes**:
- `GET /api/jobs/recommended` — Returns top 10 matched jobs for authenticated freelancer
- Add `matchScore` to job list response when user is authenticated freelancer

**UI**:
- Green match percentage badge on JobCard (e.g., "85% Match")
- "Recommended for You" carousel/section at top of `/feed`
- Sort option: "Best Match" in feed filters

---

### Feature 4: GitHub Profile Verification
**Priority**: Medium | **Complexity**: Low | **Phase**: 2

**What to build**:
- Freelancers enter GitHub username in profile
- Backend calls GitHub public API (`https://api.github.com/users/{username}`) using native `fetch` (no library needed)
- Verify the account exists, pull public repos count, followers, contributions
- Display verified GitHub badge on profile
- Show public repos count + top languages

**API Route**:
- `POST /api/user/verify-github` — Takes `githubUsername`, calls GitHub API, stores verification result

**Schema change** (add to `users` documents):
```json
{
  "githubVerified": "boolean",
  "githubData": {
    "publicRepos": "number",
    "followers": "number",
    "profileUrl": "string",
    "verifiedAt": "ISO string"
  }
}
```

**UI**:
- Verify button on profile page next to GitHub username field
- Green checkmark badge + repo count on profile once verified
- GitHub badge visible on JobCard bids and freelancer listings

**Note**: GitHub public API allows 60 req/hour unauthenticated — sufficient for profile verification. No API key needed.

---

### Feature 5: Referral System
**Priority**: Medium | **Complexity**: Medium | **Phase**: 2

**What to build**:
- Each user gets a unique referral code (generated on registration)
- Referral link: `https://geekbid.io/login?ref=XXXXXX`
- When a referred user completes their first job, referrer gets platform fee credit
- Track referral chain: who referred whom
- Referral dashboard showing invites sent, signups, earnings

**Schema** (new `referrals` collection):
```json
{
  "_id": "ObjectId",
  "referrerUserId": "string",
  "referredUserId": "string",
  "referralCode": "string",
  "status": "signed_up | first_job_completed | credited",
  "creditAmount": "number (0 until first job completed)",
  "createdAt": "ISO string",
  "completedAt": "ISO string (optional)"
}
```

**Schema change** (add to `users`):
```json
{
  "referralCode": "string (unique, 8-char alphanumeric)",
  "referredBy": "string (referral code used during signup, optional)",
  "referralCredits": "number (accumulated credits, default 0)"
}
```

**API Routes**:
- `GET /api/referrals` — Get user's referral stats (auth required)
- `GET /api/referrals/code` — Get user's referral code + shareable link
- Update `POST /api/auth` (register) to accept `referralCode` and track it

**UI**:
- Referral section on profile page with shareable link + copy button
- Referral dashboard page or tab showing invite stats
- Credit balance visible in earnings/payments page

---

### Feature 6: Tiered Subscription Plans (Logic Only)
**Priority**: High | **Complexity**: Medium | **Phase**: 3

**What to build**:
- User plan tiers: `free`, `pro`, `enterprise`
- Free: 3 job posts/month (clients), 10 bids/month (freelancers)
- Pro: Unlimited posts/bids, priority in search, reduced platform fee (7% vs 10%)
- Enterprise: All Pro features + team seats + API access
- Enforce limits on job creation and bidding based on plan
- Plan stored on user document (payment integration is separate — just the logic + UI)

**Schema change** (add to `users`):
```json
{
  "plan": "free | pro | enterprise (default: free)",
  "planLimits": {
    "jobsPostedThisMonth": "number",
    "bidsPlacedThisMonth": "number",
    "monthResetAt": "ISO string"
  }
}
```

**Changes needed**:
- Middleware to check plan limits before `POST /api/jobs` and `POST /api/bids`
- Auto-reset monthly counters (check `monthResetAt` on each request)
- Pricing page UI (can be a static page showing plans)
- Plan badge on user profile
- Upgrade CTA when limit is hit (modal with plan comparison)
- Admin ability to manually set user plans

---

### Feature 7: Featured Job Listings
**Priority**: Medium | **Complexity**: Low | **Phase**: 3

**What to build**:
- `featured: true` flag on jobs
- Featured jobs appear at the top of feed with a highlighted card style
- Admin or client can mark a job as featured
- Featured jobs get a gold/premium border + "Featured" badge

**Schema change** (add to `jobs`):
```json
{
  "featured": "boolean (default: false)",
  "featuredAt": "ISO string (optional)"
}
```

**Changes needed**:
- Update `GET /api/jobs` to sort featured jobs first
- Update JobCard component with featured variant (gold border, badge)
- Admin dashboard: toggle to feature/unfeature jobs
- Optional: client can feature own job from My Jobs page

---

### Feature 8: Instant Hire (Skip Auction)
**Priority**: Medium | **Complexity**: Medium | **Phase**: 3

**What to build**:
- Clients can send direct hire offers to freelancers (bypassing auction)
- Only for freelancers with GeekScore > 500
- Creates a job in "direct_offer" status
- Freelancer can accept/decline the offer
- If accepted, goes straight to escrow (no bidding phase)

**Schema change** (add to `jobs`):
```json
{
  "type": "auction | direct_offer (default: auction)",
  "offeredTo": "string (freelancer userId, for direct offers)",
  "offerStatus": "pending | accepted | declined (for direct offers)"
}
```

**API Routes**:
- `POST /api/jobs/direct-offer` — Client creates direct offer to specific freelancer
- `PATCH /api/jobs/[id]/offer-response` — Freelancer accepts/declines

**UI**:
- "Hire Directly" button on freelancer profiles (visible to clients)
- Direct offer form (simplified job creation with pre-set price)
- Offer notification for freelancer
- Accept/Decline UI in My Jobs page

---

### Feature 9: Milestone Payments
**Priority**: High | **Complexity**: Medium | **Phase**: 3

**What to build**:
- Split large jobs into milestones with individual escrow amounts
- Each milestone has: title, description, amount, status
- Client releases escrow per milestone (not all at once)
- Progress tracker showing milestone completion

**Schema** (new `milestones` collection):
```json
{
  "_id": "ObjectId",
  "jobId": "string",
  "title": "string",
  "description": "string",
  "amount": "number",
  "order": "number (1, 2, 3...)",
  "status": "pending | in_progress | submitted | approved | disputed",
  "submittedAt": "ISO string (optional)",
  "approvedAt": "ISO string (optional)",
  "createdAt": "ISO string"
}
```

**Changes needed**:
- Update post-job form to optionally add milestones
- Create milestone management UI on job detail page
- Freelancer can mark milestone as "submitted"
- Client can approve milestone → releases that portion of escrow
- Update transaction creation to work per-milestone
- Progress bar showing milestone completion on job detail page

---

### Feature 10: Team Accounts
**Priority**: Low | **Complexity**: Medium | **Phase**: 3

**What to build**:
- Organization/team entity that groups multiple client users
- Team owner invites members via email
- Shared job posting under team name
- Shared billing / transaction history
- Team-level analytics (total spend, active jobs)

**Schema** (new `teams` collection):
```json
{
  "_id": "ObjectId",
  "name": "string",
  "ownerId": "string (userId)",
  "memberIds": ["string (userIds)"],
  "invites": [{ "email": "string", "status": "pending | accepted", "invitedAt": "ISO string" }],
  "createdAt": "ISO string"
}
```

**Schema change** (add to `users`):
```json
{
  "teamId": "string (optional)",
  "teamRole": "owner | member (optional)"
}
```

**API Routes**:
- `POST /api/teams` — Create team
- `GET /api/teams` — Get user's team
- `POST /api/teams/invite` — Invite member by email
- `PATCH /api/teams/invite` — Accept/decline invite
- `GET /api/teams/analytics` — Team-level stats

---

### Feature 11: Public API for Integrations
**Priority**: Low | **Complexity**: Medium | **Phase**: 3

**What to build**:
- API key generation for programmatic access
- Rate-limited public API endpoints (separate from web app routes)
- Key management page in profile settings
- API docs page (static markdown-rendered page)

**Schema** (new `api_keys` collection):
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "key": "string (hashed, prefix: gbk_)",
  "name": "string (user-defined label)",
  "lastUsedAt": "ISO string",
  "createdAt": "ISO string",
  "revokedAt": "ISO string (optional)"
}
```

**API Routes**:
- `POST /api/keys` — Generate new API key (show once, store hashed)
- `GET /api/keys` — List user's API keys (masked)
- `DELETE /api/keys/[id]` — Revoke API key
- `GET /api/v1/jobs` — Public API (auth via `X-API-Key` header)
- `POST /api/v1/jobs` — Public API to create jobs

---

### Feature 12: Skill Assessments (GeekScore Boost)
**Priority**: Medium | **Complexity**: High | **Phase**: 3

**What to build**:
- Timed skill quizzes (multiple choice, stored in MongoDB)
- Categories match job categories (React, Node.js, AWS, etc.)
- 10 questions per assessment, 15 minutes time limit
- Score threshold: ≥70% = "Verified" badge for that skill
- GeekScore boost: +50 points per verified skill
- Assessment results stored, can retake after 30 days

**Schema** (new `assessments` collection):
```json
{
  "_id": "ObjectId",
  "skill": "string",
  "questions": [{
    "question": "string",
    "options": ["string (4 options)"],
    "correctIndex": "number (0-3)"
  }],
  "timeLimit": "number (seconds, default 900)",
  "passingScore": "number (default 70)"
}
```

**Schema** (new `assessment_results` collection):
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "assessmentId": "string",
  "skill": "string",
  "score": "number (0-100)",
  "passed": "boolean",
  "answers": ["number (selected option indexes)"],
  "startedAt": "ISO string",
  "completedAt": "ISO string"
}
```

**API Routes**:
- `GET /api/assessments` — List available assessments
- `GET /api/assessments/[id]` — Start assessment (returns questions without answers)
- `POST /api/assessments/[id]/submit` — Submit answers, calculate score
- `GET /api/assessments/results` — User's assessment history

**UI**:
- Assessments page (new route `/assessments`)
- Quiz-taking interface with timer
- Results page with score breakdown
- Verified skill badges on profile + JobCard

**Seed data**: Include 3-5 assessments with 10 questions each for popular skills

---

### Feature 13: Statistical Pricing Suggestions
**Priority**: Low | **Complexity**: Medium | **Phase**: 3

**What to build**:
- When client creates a job, suggest starting price and decay rate
- Based on MongoDB aggregation of historical completed jobs with similar skills
- Show: average price, median price, typical decay rate, average time-to-accept
- "Similar jobs went for $X–$Y" hint on post-job form

**Implementation** (MongoDB aggregation, no ML):
```javascript
// Aggregate completed jobs with overlapping skills
db.collection('jobs').aggregate([
  { $match: { status: 'accepted', skillsRequired: { $in: selectedSkills } } },
  { $group: {
    _id: null,
    avgFinalPrice: { $avg: '$finalPrice' },
    minPrice: { $min: '$finalPrice' },
    maxPrice: { $max: '$finalPrice' },
    avgDecayRate: { $avg: '$decayRatePerHour' },
    count: { $sum: 1 }
  }}
]);
```

**API Route**:
- `GET /api/jobs/pricing-hint?skills=React,Node.js` — Returns pricing suggestions

**UI**:
- Pricing hint card on post-job form (appears after skills are selected)
- "Based on X similar jobs" disclaimer

---

## Features EXCLUDED (Require New Dependencies)

| Feature | Why Excluded |
|---------|-------------|
| Freelancer portfolios (file upload) | Needs Cloudinary/S3/file storage service |
| Email notifications | Needs SendGrid/Resend/email service |
| Push notifications | Needs expo-notifications package + push service |
| Advanced full-text search | Needs Atlas Search setup or Algolia |
| Analytics/event tracking | Needs PostHog/Mixpanel SDK |
| Video proposals | Needs video upload/storage service |
| Multi-currency | Needs Stripe or Razorpay international config |

---

## Implementation Order (Recommended)

```
1. Job Categories & Tags          ← Low effort, high UX impact
2. Reviews & Ratings              ← Critical for trust, enables GeekScore
3. Smart Job Matching             ← Drives engagement, uses existing data
4. Featured Job Listings          ← Low effort, monetization foundation
5. GitHub Verification            ← Trust signal, free GitHub API
6. Milestone Payments             ← High value for large jobs
7. Referral System                ← Growth engine
8. Tiered Plans (logic only)      ← Monetization framework
9. Instant Hire                   ← Power feature for repeat users
10. Statistical Pricing           ← Data-driven UX improvement
11. Skill Assessments             ← Differentiation, content-heavy
12. Team Accounts                 ← Enterprise feature
13. Public API                    ← Developer/agency feature
```

---

## Technical Context for Claude Code

- **Web app location**: `web/src/app/` (Next.js App Router)
- **API routes**: `web/src/app/api/` (each route is a `route.ts` file)
- **Components**: `web/src/components/` (Radix UI + Tailwind)
- **State management**: `web/src/lib/store.tsx` (React Context)
- **DB connection**: `web/src/lib/mongodb.ts` (import `getDb`)
- **Auth helper**: `web/src/lib/auth.ts` (import `verifyAccessToken`)
- **Backend services**: `backend/services/` (7 Express microservices)
- **Backend shared**: `backend/common/` (app.js, db.js, auth, validation)
- **Design system**: Dark theme, `#00FF88` accent, Space Grotesk + Inter fonts
- **Existing seed**: `web/src/app/api/seed/route.ts` (update for new collections)
- **Full tech docs**: `docs/TECHNICAL_DOCUMENTATION.md` (900 lines, complete API reference)
