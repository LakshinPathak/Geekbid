# Claude Code Prompt: AI Features for GeekBid (Gemini API)

> **Core thesis:** AI should make GeekBid's reverse auction **smarter for both sides** — freelancers bid optimally, clients get fair prices. The bidding flow is where AI adds the most value.

**Stack:** Next.js 16, MongoDB, Gemini API via `@google/generative-ai` SDK. All AI runs server-side only.
**Design:** Royal Dark — gold `#c9a84c`, bg `#080b14`, panel `#0d1120`, text `#f0e8d4`, muted `#a8997e`.

---

## Phase 1: AI Foundation Layer

### 1A. Install

```bash
cd web && npm install @google/generative-ai
```

### 1B. Env Vars (add to `.env.local`)

```env
GEMINI_API_KEY=your_key_here
AI_MODEL=gemini-2.0-flash
```

### 1C. AI Service — `web/src/lib/ai.ts` (CREATE)

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateAI(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number; json?: boolean }
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: process.env.AI_MODEL || "gemini-2.0-flash",
    generationConfig: {
      temperature: opts?.temperature ?? 0.7,
      maxOutputTokens: opts?.maxTokens ?? 2048,
      responseMimeType: opts?.json ? "application/json" : "text/plain",
    },
  });
  const result = await model.generateContent([
    { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
  ]);
  return result.response.text();
}
```

Single entry point for ALL AI calls. Easy to swap models later.

---

## Phase 2: 🎯 AI Bid Strategist (CORE FEATURE)

> **The flagship AI feature.** This is the #1 reason freelancers will use GeekBid over competitors.

### What It Does

When a freelancer views a job and wants to bid, the AI Bid Strategist panel analyzes **7 real-time signals** and provides:

1. **Optimal bid price** — not just "bid low" but the exact sweet spot
2. **Win probability** — percentage chance of winning at that price
3. **Timing advice** — bid now vs wait for further decay
4. **Risk assessment** — what happens if they wait too long
5. **Competitive position** — where their bid ranks and why

### 2A. The 7 Signals the AI Analyzes

The existing codebase already tracks all of these (no new DB fields needed):

| Signal | Source | What AI Learns |
|--------|--------|----------------|
| **Current decayed price** | `getCurrentPrice(job, now)` from `web/src/lib/utils.ts` | How much value is left in the auction |
| **Decay rate & mode** | `job.decayRatePerHour`, `job.pricingMode` | How fast the price is dropping |
| **Demand multiplier** | `getDemandMultiplier()` from `web/src/lib/pricing.ts` | Whether demand is slowing the decay |
| **Bid count & unique bidders** | `job.bidCount`, `job.uniqueBidderCount` | Competition intensity |
| **Bid price distribution** | `bids` array (min, max, avg, spread) | Where the market clusters |
| **Time remaining** | `job.deadlineAt` vs `now` | Urgency pressure |
| **Freelancer's own profile** | `geekScore`, `skills`, `hourlyRateMin/Max` | Their competitive strength |

### 2B. API Route — `web/src/app/api/ai/bid-strategy/route.ts` (CREATE)

```
POST /api/ai/bid-strategy
Headers: Authorization: Bearer <token>
Body: {
  job: {
    title, description, category,
    startingPrice, minimumPrice, currentPrice,
    decayRatePerHour, pricingMode,
    bidCount, uniqueBidderCount,
    estimatedHours, hoursElapsed, hoursRemaining,
    demandMultiplier, effectiveDecayRate
  },
  bids: {
    count, minBid, maxBid, avgBid,
    prices: number[],           // all bid prices for distribution
    myBids: number[],           // freelancer's own previous bids
    myCurrentRank: number|null  // where they currently stand
  },
  freelancer: {
    geekScore, skills: string[],
    hourlyRateMin, hourlyRateMax,
    skillMatchCount, totalSkillsRequired
  }
}
```

**Response:**
```json
{
  "suggestedBid": 680,
  "winProbability": 72,
  "confidence": "high",
  "timing": "bid_now",
  "strategy": {
    "headline": "Undercut the cluster",
    "reasoning": "5 bids clustered between $750-$820. Bidding at $680 puts you 10% below the lowest bid while keeping your effective rate at $34/hr (within your $30-45/hr range). The price will hit floor in ~6 hours, but 3 new bids are likely to slow decay further — locking in now secures a strong position.",
    "risks": [
      "2 more aggressive bidders could undercut you",
      "If no one bids for 4h, price drops to $620 naturally"
    ],
    "alternatives": [
      { "price": 750, "label": "Safe bid", "winProb": 45, "note": "Matches cluster avg, moderate chance" },
      { "price": 580, "label": "Aggressive", "winProb": 88, "note": "Near floor, very likely to win but thin margin" }
    ]
  }
}
```

**System Prompt for the AI:**

```
You are GeekBid's Bid Strategist AI. You help freelancers place optimal bids in a REVERSE AUCTION where prices decay over time.

REVERSE AUCTION RULES:
- Jobs start at a high price and decay toward a floor price over time
- Freelancers bid BELOW the current price (lower = more competitive)
- Clients can accept any bid at any time
- More bidders SLOW the decay (adaptive pricing mode)
- Each freelancer has a 30-minute cooldown between bids on the same job

ANALYSIS FRAMEWORK:
1. PRICE POSITION: Where is the current price relative to start/floor? Early auction (>70% of range) means lots of room. Late auction (<30%) means near floor, urgency matters.

2. COMPETITION: How many unique bidders? Where do bids cluster? A tight cluster means consensus on value — bidding just below it is strategic. A spread-out distribution means uncertainty — there's room to be creative.

3. DEMAND EFFECT: In adaptive mode, more bidders slow the decay. This means the price stays higher longer. If demand is high (multiplier < 0.3), the price is "sticky" and bidding near current price is safer.

4. TIMING: Hours remaining vs decay rate. If price will hit floor in 2h, waiting is risky. If floor is 20h away, there's time to wait for better positioning.

5. FREELANCER FIT: Match their skills, GeekScore, and hourly rate to the job. A high-GeekScore freelancer with perfect skill match can bid higher (clients value quality). A lower-score freelancer needs to be more aggressive on price.

6. WIN PROBABILITY: Estimate based on:
   - Position relative to other bids (lower = higher chance)
   - Skill match quality (higher = higher chance at same price)
   - GeekScore (higher = higher chance at same price)
   - Time pressure on client (more urgency = more likely to accept any reasonable bid)

CONSTRAINTS:
- suggestedBid must be between minimumPrice and currentPrice
- suggestedBid should align with freelancer's hourly rate (bid / estimatedHours ≈ their rate)
- winProbability is 0-100
- confidence is "high" (>5 bids, clear pattern), "medium" (2-4 bids), or "low" (<2 bids)
- timing is "bid_now" (price dropping fast or good opportunity), "wait_1h" (price still high, decay will help), or "bid_at_floor" (let it hit floor, minimal competition)
- Always provide exactly 2 alternatives

Return ONLY valid JSON matching the response schema. No markdown, no explanation outside the JSON.
```

### 2C. Implementation Logic (in the API route)

Before calling Gemini, compute these values server-side (don't trust client):

```typescript
// In the API route handler:
const db = await getDb();
const job = await db.collection("jobs").findOne({ _id: new ObjectId(jobId) });
const allBids = await db.collection("bids").find({ jobId }).sort({ createdAt: -1 }).toArray();
const freelancer = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });

// Compute real-time signals
const now = new Date();
const currentPrice = getCurrentPrice(job, now);  // import from @/lib/utils
const hoursElapsed = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
const hoursRemaining = Math.max(0, (new Date(job.deadlineAt).getTime() - now.getTime()) / 3600000);
const demandMult = getDemandMultiplier(job.uniqueBidderCount ?? 0, hoursElapsed);
const effectiveRate = getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? 0, hoursElapsed);
const bidPrices = allBids.map(b => b.bidPrice);
const myBids = allBids.filter(b => b.freelancerId === auth.payload.userId).map(b => b.bidPrice);
const skillMatch = freelancer.skills?.filter(s => job.skillsRequired.includes(s)).length ?? 0;

// Build the prompt with REAL data
const userPrompt = JSON.stringify({
  job: {
    title: job.title, category: job.category,
    startingPrice: job.startingPrice, minimumPrice: job.minimumPrice,
    currentPrice, decayRatePerHour: job.decayRatePerHour,
    pricingMode: job.pricingMode ?? "adaptive",
    bidCount: allBids.length, uniqueBidderCount: job.uniqueBidderCount ?? 0,
    estimatedHours: job.estimatedHours, hoursElapsed: +hoursElapsed.toFixed(1),
    hoursRemaining: +hoursRemaining.toFixed(1),
    demandMultiplier: +demandMult.toFixed(3), effectiveDecayRate: +effectiveRate.toFixed(2)
  },
  bids: {
    count: allBids.length,
    minBid: bidPrices.length ? Math.min(...bidPrices) : null,
    maxBid: bidPrices.length ? Math.max(...bidPrices) : null,
    avgBid: bidPrices.length ? +(bidPrices.reduce((a,b) => a+b, 0) / bidPrices.length).toFixed(0) : null,
    prices: bidPrices,
    myBids, myCurrentRank: /* compute rank */
  },
  freelancer: {
    geekScore: freelancer.geekScore, skills: freelancer.skills,
    hourlyRateMin: freelancer.hourlyRateMin, hourlyRateMax: freelancer.hourlyRateMax,
    skillMatchCount: skillMatch, totalSkillsRequired: job.skillsRequired.length
  }
});

const result = await generateAI(SYSTEM_PROMPT, userPrompt, { json: true, temperature: 0.4 });
```

### 2D. Frontend Component — `web/src/components/ai/AIBidStrategist.tsx` (CREATE)

A collapsible panel that replaces the existing "Suggested" chips (lines 842-863 of `jobs/[id]/page.tsx`):

```
┌──────────────────────────────────────────────────────────────┐
│ ✨ AI Bid Strategist                              [Analyze] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Recommended: $680          Win Chance: 72%                  │
│  ████████████████████░░░░░  Confidence: HIGH                 │
│                                                              │
│  "Undercut the cluster — 5 bids at $750-820.                │
│   At $680 your effective rate is $34/hr, within              │
│   your range. Price hits floor in ~6h but demand             │
│   is slowing decay."                                         │
│                                                              │
│  ⚠️ Risks:                                                   │
│  • 2 aggressive bidders could undercut                       │
│  • Price drops to $620 naturally in 4h                       │
│                                                              │
│  Alternatives:                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ Safe: $750   │  │ Aggro: $580  │                         │
│  │ 45% chance   │  │ 88% chance   │                         │
│  │ [Apply]      │  │ [Apply]      │                         │
│  └──────────────┘  └──────────────┘                         │
│                                                              │
│  Timing: ⚡ BID NOW — price dropping $18/hr                  │
│                                                              │
│  [Apply $680 to bid]                                         │
└──────────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface AIBidStrategistProps {
  jobId: string;
  currentPrice: number;
  minimumPrice: number;
  onApplyPrice: (price: number) => void;  // sets counterPrice state
}
```

**Behavior:**
- Shows a "✨ Analyze with AI" button initially (collapsed)
- On click: calls `/api/ai/bid-strategy` with current job data
- Shows loading state: "Analyzing 7 market signals..."
- Renders the strategy card with Apply buttons
- Each Apply button calls `onApplyPrice(price)` to fill the bid slider/input
- Cache result for 5 minutes (re-analyze only if bids changed)

### 2E. Integration into Job Page

**File:** `web/src/app/jobs/[id]/page.tsx`

Replace the static "Suggested" section (lines 842-863) with the AI component:

```tsx
// BEFORE (lines 842-863): Static aggressive/competitive chips
// AFTER: Dynamic AI strategist

<AIBidStrategist
  jobId={job.id ?? job._id ?? ""}
  currentPrice={current}
  minimumPrice={job.minimumPrice}
  onApplyPrice={(price) => setCounterPrice(String(price))}
/>
```

Keep the existing price slider (lines 865-886) and position bar (lines 888-906) below it — they complement the AI suggestion.

---

## Phase 3: 🎯 AI Bid Timing Alerts (Push Notifications)

### What It Does

Freelancers can "watch" a job. The AI monitors the auction and sends a notification when the optimal bidding moment arrives:

- "Price just crossed your sweet spot ($700) — bid now before 3 other watchers do"
- "Zero bids in 4h — decay acceleration kicking in. Floor in 2h."
- "New bid at $650 pushed you to rank #4 — counter-bid to reclaim position?"

### 3A. Database — Add Watch Collection

**Schema for `job_watches` collection:**
```json
{
  "userId": "string",
  "jobId": "string",
  "targetPrice": 700,
  "createdAt": "ISO string",
  "notified": false
}
```

### 3B. API Route — `web/src/app/api/ai/watch-job/route.ts` (CREATE)

```
POST /api/ai/watch-job
Body: { jobId, targetPrice? }
→ Creates a watch entry. If targetPrice is set, triggers notification when price crosses it.

DELETE /api/ai/watch-job
Body: { jobId }
→ Removes the watch
```

### 3C. Notification Trigger (in existing bid API)

**File:** `web/src/app/api/bids/route.ts` (MODIFY, after line 142)

After updating job demand signals, check if any watchers should be notified:

```typescript
// After the job update (line 142), add:
const watchers = await db.collection("job_watches").find({
  jobId, notified: false
}).toArray();

for (const watch of watchers) {
  const currentPrice = getCurrentPrice(updatedJob, new Date());
  if (watch.targetPrice && currentPrice <= watch.targetPrice) {
    // Create notification
    await db.collection("notifications").insertOne({
      userId: watch.userId,
      type: "price_alert",
      title: "Price target reached!",
      message: `${job.title} hit ${formatMoney(currentPrice)} — your target was ${formatMoney(watch.targetPrice)}`,
      jobId, read: false,
      createdAt: new Date().toISOString()
    });
    await db.collection("job_watches").updateOne(
      { _id: watch._id }, { $set: { notified: true } }
    );
  }
}
```

### 3D. Frontend — Watch Button on Job Page

**File:** `web/src/app/jobs/[id]/page.tsx`

Add a "👁 Watch + Set Alert" button next to the "Accept at $X" button (line 826):

```tsx
<button onClick={() => setShowWatchModal(true)}
  className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center gap-2">
  <Eye className="h-4 w-4" /> Watch + AI Alert
</button>
```

The modal lets them set a target price. AI suggests an optimal target based on decay trajectory.

---

## Phase 4: 🎯 AI Client Bid Evaluator

### What It Does

When a client views the Bid Comparison table (lines 385-466 of `jobs/[id]/page.tsx`), the AI evaluates all bids and recommends which to accept:

- Considers price, GeekScore, skill match, bid timing, and freelancer history
- Ranks bids by "value score" (not just lowest price)
- Explains WHY a particular bid is recommended

### 4A. API Route — `web/src/app/api/ai/evaluate-bids/route.ts` (CREATE)

```
POST /api/ai/evaluate-bids
Body: {
  job: { title, skillsRequired, startingPrice, currentPrice, minimumPrice, estimatedHours },
  bids: [{ bidPrice, freelancerName, geekScore, skillMatch, bidAge }]
}
Response: {
  recommendation: {
    bestBidIndex: 0,
    reason: "Alex offers the best value — $680 with perfect skill match and GeekScore 850. While Sam bid lower ($620), their 60% skill match makes Alex's premium worth it.",
    valueScores: [{ bidderName, score: 92, breakdown: "Price: 85, Skills: 100, Score: 90" }]
  }
}
```

### 4B. Integration — Client View on Job Page

**File:** `web/src/app/jobs/[id]/page.tsx` (after line 464, the bestValueBid section)

Replace the static "💡 Best value" box with an AI-powered recommendation panel:

```tsx
// After the existing bestValueBid block (line 464):
{isClient && jobBids.length >= 2 && (
  <AIBidEvaluator
    jobId={job.id ?? job._id ?? ""}
    bids={jobBids}
    job={job}
    users={users}
    onAccept={handleAccept}
  />
)}
```

---

## Phase 5: AI Job Description Generator

### Where: Post Job Page → Step 1, Description field

**File:** `web/src/app/post-job/page.tsx` (line 511)

Client types a title → clicks "✨ Generate" → AI writes a professional job description.

### 5A. API Route — `web/src/app/api/ai/generate-description/route.ts` (CREATE)

```
POST /api/ai/generate-description
Body: { title, category, skills[], estimatedHours }
Response: { description: string }
```

**System prompt:** Generate a 200-300 word professional job description with: Overview, Deliverables (bullets), Requirements, and Acceptance Criteria.

### 5B. Component — `web/src/components/ai/AIDescriptionButton.tsx` (CREATE)

Small button next to the Description label. On click → loading → fills textarea.

---

## Phase 6: AI Pricing Advisor

### Where: Post Job Page → Step 2, after existing pricing hint (line 704)

Enhances the existing `/api/jobs/pricing-hint` with AI reasoning.

### 6A. API Route — `web/src/app/api/ai/pricing-advisor/route.ts` (CREATE)

```
POST /api/ai/pricing-advisor
Body: { title, category, skills[], estimatedHours, marketData }
Response: {
  recommendedStartingPrice, recommendedFloorPrice, recommendedDecayRate,
  reasoning: string, confidence: "high"|"medium"|"low"
}
```

### 6B. Component — `web/src/components/ai/AIPricingAdvisor.tsx` (CREATE)

Panel with recommended values and "Apply" buttons that auto-fill the form fields.

---

## Phase 7: AI Chat Assistant

### Where: Inbox → `web/src/app/inbox/page.tsx`

Users type `/ai` prefix commands in chat:
- `/ai draft-proposal` — generates project proposal based on job context
- `/ai negotiate` — suggests negotiation points from chat history
- `/ai summarize` — condenses conversation

### 7A. API Route — `web/src/app/api/ai/chat-assist/route.ts` (CREATE)

```
POST /api/ai/chat-assist
Body: { command, jobContext, chatHistory[], userRole }
Response: { suggestion: string }
```

### 7B. Integration

Detect `/ai` in message input → show command palette → insert AI draft (editable before send).

---

## Phase 8: AI Review Summarizer

### Where: Profile pages (`web/src/app/profile/page.tsx`, `web/src/app/profile/[id]/page.tsx`)

When a user has 3+ reviews, show an AI-generated summary.

### 8A. API Route — `web/src/app/api/ai/summarize-reviews/route.ts` (CREATE)

```
POST /api/ai/summarize-reviews
Body: { reviews[] }
Response: { summary, strengths[], improvements[] }
```

### 8B. Component — `web/src/components/ai/AIReviewSummary.tsx` (CREATE)

---

## Phase 9: Smart Search

### Where: Feed page (`web/src/app/feed/page.tsx`)

Natural language search: "React projects paying over $1000" → parsed into filters.

### 9A. API Route — `web/src/app/api/ai/smart-search/route.ts` (CREATE)

```
POST /api/ai/smart-search
Body: { query, type: "jobs"|"freelancers" }
Response: { filters: { skills?, category?, minBudget?, maxBudget? }, interpretation }
```

### 9B. Component — `web/src/components/ai/AISearchBar.tsx` (CREATE)

---

## Phase 10: AI Fraud Detection (Admin)

### Where: Admin page (`web/src/app/admin/page.tsx`)

Flag suspicious activity: spam job descriptions, fake reviews, bid manipulation.

### 10A. API Route — `web/src/app/api/ai/quality-check/route.ts` (CREATE)

Runs automatically when jobs/reviews are created. Adds a `trustScore` field.

---

## Implementation Priority

| Priority | Feature | Phase | Impact | Files |
|----------|---------|-------|--------|-------|
| 🔴 **P0** | **AI Bid Strategist** | 2 | Flagship — why freelancers choose GeekBid | 3 new files |
| 🔴 **P0** | **AI Client Bid Evaluator** | 4 | Helps clients accept the RIGHT bid | 2 new files |
| 🟡 **P1** | AI Bid Timing Alerts | 3 | Retention — keeps freelancers engaged | 2 new + 1 modify |
| 🟡 **P1** | AI Job Description Gen | 5 | Saves clients 10 min per job | 2 new files |
| 🟡 **P1** | AI Pricing Advisor | 6 | Better pricing = more bids | 2 new files |
| 🟢 **P2** | AI Chat Assistant | 7 | Smoother negotiation | 1 new + 1 modify |
| 🟢 **P2** | Smart Search | 9 | Better discovery | 2 new files |
| 🔵 **P3** | Review Summarizer | 8 | Nice UX polish | 2 new files |
| 🔵 **P3** | Fraud Detection | 10 | Admin quality control | 1 new + 1 modify |

**Execution order:** Phase 1 → **Phase 2** → **Phase 4** → Phase 3 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10

---

## All Files Summary

| File | Action | Phase |
|------|--------|-------|
| `web/src/lib/ai.ts` | **CREATE** — Gemini SDK wrapper | 1 |
| `web/src/app/api/ai/bid-strategy/route.ts` | **CREATE** — Core bid AI | 2 |
| `web/src/components/ai/AIBidStrategist.tsx` | **CREATE** — Bid strategy panel | 2 |
| `web/src/app/api/ai/watch-job/route.ts` | **CREATE** — Price alerts | 3 |
| `web/src/app/api/bids/route.ts` | **MODIFY** — Add watcher notifications | 3 |
| `web/src/app/api/ai/evaluate-bids/route.ts` | **CREATE** — Client bid evaluator | 4 |
| `web/src/components/ai/AIBidEvaluator.tsx` | **CREATE** — Bid ranking panel | 4 |
| `web/src/app/api/ai/generate-description/route.ts` | **CREATE** | 5 |
| `web/src/components/ai/AIDescriptionButton.tsx` | **CREATE** | 5 |
| `web/src/app/api/ai/pricing-advisor/route.ts` | **CREATE** | 6 |
| `web/src/components/ai/AIPricingAdvisor.tsx` | **CREATE** | 6 |
| `web/src/app/api/ai/chat-assist/route.ts` | **CREATE** | 7 |
| `web/src/app/api/ai/summarize-reviews/route.ts` | **CREATE** | 8 |
| `web/src/components/ai/AIReviewSummary.tsx` | **CREATE** | 8 |
| `web/src/app/api/ai/smart-search/route.ts` | **CREATE** | 9 |
| `web/src/components/ai/AISearchBar.tsx` | **CREATE** | 9 |
| `web/src/app/api/ai/quality-check/route.ts` | **CREATE** | 10 |
| `web/src/app/jobs/[id]/page.tsx` | **MODIFY** — Add strategist + evaluator | 2, 4 |
| `web/src/app/post-job/page.tsx` | **MODIFY** — Add description gen + pricing | 5, 6 |
| `web/src/app/inbox/page.tsx` | **MODIFY** — Add /ai commands | 7 |
| `web/src/app/profile/page.tsx` | **MODIFY** — Add review summary | 8 |
| `web/src/app/feed/page.tsx` | **MODIFY** — Add smart search | 9 |
| `web/src/app/admin/page.tsx` | **MODIFY** — Add fraud scores | 10 |

## AI Bid Strategy — Free Trial Gating

**Free plan users get 2 AI bid analyses per month.** After that, they see a paywall prompting upgrade to Pro.

### How It Works

1. **Tracking:** Add `aiBidUsesThisMonth` counter to the existing `planLimits` object on the user document (same pattern as `bidsPlacedThisMonth` at line 58 of `web/src/app/api/bids/route.ts`):

```json
{
  "planLimits": {
    "bidsPlacedThisMonth": 3,
    "aiBidUsesThisMonth": 1,
    "monthResetAt": "2026-07-28T00:00:00Z"
  }
}
```

2. **API Enforcement:** In `/api/ai/bid-strategy/route.ts`, check BEFORE calling Gemini:

```typescript
const user = await db.collection("users").findOne({ _id: new ObjectId(auth.payload.userId) });
const plan = user?.plan ?? "free";
const limits = user?.planLimits ?? { aiBidUsesThisMonth: 0 };

if (plan === "free" && limits.aiBidUsesThisMonth >= 2) {
  return NextResponse.json({
    error: "free_limit_reached",
    message: "You've used your 2 free AI analyses this month. Upgrade to Pro for unlimited.",
    usedCount: 2,
    maxCount: 2
  }, { status: 403 });
}

// ... call Gemini ...

// After success, increment counter:
await db.collection("users").updateOne(
  { _id: new ObjectId(auth.payload.userId) },
  { $inc: { "planLimits.aiBidUsesThisMonth": 1 } }
);
```

3. **Frontend Paywall:** In `AIBidStrategist.tsx`, handle the `free_limit_reached` error:

```tsx
// When API returns 403 with error === "free_limit_reached":
<div className="glass-panel p-5 text-center border-[rgba(201,168,76,0.35)]">
  <Sparkles className="h-6 w-6 text-[#c9a84c] mx-auto mb-2" />
  <p className="text-[#f0e8d4] text-sm font-semibold">AI Analyses Used Up</p>
  <p className="text-[#a8997e] text-xs mt-1">You've used 2/2 free AI bid analyses this month</p>
  <Link href="/pricing">
    <button className="btn-primary w-full mt-3 text-sm">
      Upgrade to Pro — Unlimited AI
    </button>
  </Link>
</div>
```

4. **Usage Counter on Button:** Show remaining uses on the analyze button:

```tsx
<button className="...">
  ✨ Analyze with AI
  {plan === "free" && (
    <span className="text-[9px] text-[#a8997e] ml-1">
      ({2 - aiBidUsesThisMonth}/2 free)
    </span>
  )}
</button>
```

5. **Reset Logic:** The existing `monthResetAt` check in `bids/route.ts` (line 59) already resets counters monthly. Add `aiBidUsesThisMonth: 0` to that same reset block.

| Plan | AI Bid Analyses / Month | Other AI Features |
|------|------------------------|-------------------|
| Free | **2** | Description gen: 3/month, Others: locked |
| Pro | **Unlimited** | All unlimited |

---

## Rules

- ALL AI calls go through `web/src/lib/ai.ts` — never import Gemini SDK directly in routes
- NEVER expose `GEMINI_API_KEY` to client — all AI runs in API routes only
- ALL AI routes require `authenticateRequest()` — no anonymous AI calls
- Rate limit: 20 AI calls per user per hour (track in MongoDB `ai_usage` collection)
- AI features degrade gracefully — if Gemini is down, hide AI buttons, don't break the page
- Cache AI responses: bid strategy 5min, pricing advice 30min, descriptions 1hr
- Use `temperature: 0.4` for bid/pricing (precision matters), `0.7` for descriptions (creativity matters)
- All AI UI uses `Sparkles` icon from Lucide + "✨" visual identity
- Keep Royal Dark theme — AI elements are integrated, not a separate product
