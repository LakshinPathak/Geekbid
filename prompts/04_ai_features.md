# Claude Code Prompt: AI-Powered Features for GeekBid Platform

**Task:** Integrate AI-powered features across the GeekBid platform using the Gemini API (or OpenAI-compatible endpoint). These features enhance the core reverse-auction workflow by making job posting smarter, matching more accurate, bidding more strategic, and communication more efficient.

**Tech Stack:** Next.js 16, MongoDB, Gemini API (via `@google/generative-ai` SDK or REST). All AI calls happen server-side in Next.js API routes — never expose API keys to the client.

**Design System:** Royal Dark theme — gold `#c9a84c`, bg `#080b14`, panel bg `#0d1120`, text `#f0e8d4`, muted `#a8997e`.

---

## Architecture Overview

```
Client Components                    Server API Routes               External
┌─────────────────────┐             ┌────────────────────┐          ┌──────────┐
│ AI-assisted forms   │─── fetch ──▶│ /api/ai/*          │── req ──▶│ Gemini   │
│ Smart suggestions   │             │  - generate        │          │ API      │
│ AI badges/insights  │             │  - match           │          └──────────┘
└─────────────────────┘             │  - analyze         │
                                    │  - suggest         │          ┌──────────┐
                                    │  (all auth-gated)  │── r/w ──▶│ MongoDB  │
                                    └────────────────────┘          └──────────┘
```

---

## Phase 1: Foundation — AI Service Layer

### 1A. Install Dependencies

```bash
cd web
npm install @google/generative-ai
```

### 1B. Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.0-flash
AI_MAX_TOKENS=2048
AI_TEMPERATURE=0.7
```

### 1C. Create AI Service Utility

**File:** `web/src/lib/ai.ts`

Create a reusable server-side AI service:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateAIResponse(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; json?: boolean }
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: process.env.AI_MODEL || "gemini-2.0-flash",
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 2048,
      responseMimeType: options?.json ? "application/json" : "text/plain",
    },
  });

  const result = await model.generateContent([
    { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
  ]);

  return result.response.text();
}
```

This is the single entry point for all AI features — easy to swap models later.

---

## Phase 2: AI-Powered Job Description Generator

### Where: Post Job Page → `web/src/app/post-job/page.tsx` (Step 1, Description field)

**What it does:** Client types a brief job title (e.g., "Build AI chatbot") → clicks "✨ Generate with AI" → AI produces a professional, detailed job description with scope, deliverables, requirements, and timeline guidance.

### 2A. API Route

**File:** `web/src/app/api/ai/generate-description/route.ts`

```
POST /api/ai/generate-description
Headers: Authorization: Bearer <token>
Body: { title: string, category: string, skills: string[], estimatedHours?: number }
Response: { description: string }
```

**System Prompt:**
```
You are a technical project manager for GeekBid, a premium freelance marketplace.
Generate a professional job description for a reverse auction job posting.
Include: Project Overview, Scope & Deliverables (bullet points), Technical Requirements,
Acceptance Criteria, and Estimated Timeline.
Keep it concise (200-300 words). Use professional tone. Don't include pricing.
```

### 2B. Frontend Component

**File:** `web/src/components/ai/AIDescriptionButton.tsx`

A button that sits next to the Description textarea on the Post Job page:

```tsx
// Renders a "✨ Generate with AI" button with loading state
// On click: calls /api/ai/generate-description with current title, category, skills
// On success: fills the description textarea via onChange callback
// Shows a small "AI generated · Edit as needed" badge below the textarea
```

**Props:**
```typescript
{
  title: string;
  category: string;
  skills: string[];
  estimatedHours: number;
  onGenerated: (description: string) => void;
}
```

### 2C. Integration Point

**File:** `web/src/app/post-job/page.tsx` (Step 1, after line 511)

Add the AI button between the label and textarea:
```tsx
<div className="flex items-center justify-between mb-1.5">
  <label className="text-[#a8997e] text-xs font-medium">Description</label>
  <AIDescriptionButton
    title={title}
    category={category}
    skills={skills}
    estimatedHours={estimatedHours}
    onGenerated={setDescription}
  />
</div>
```

---

## Phase 3: Smart Freelancer-Job Matching

### Where: Feed Page → `web/src/app/feed/page.tsx` (Client view, Talent Pool section)

**What it does:** When a client views the Talent Pool, each freelancer card shows an "AI Match Score" (0-100%) based on how well the freelancer's skills, experience, and rate align with the client's open jobs.

### 3A. API Route

**File:** `web/src/app/api/ai/match-score/route.ts`

```
POST /api/ai/match-score
Headers: Authorization: Bearer <token>
Body: {
  freelancer: { skills, bio, geekScore, hourlyRateMin, hourlyRateMax, availability },
  jobs: [{ title, skillsRequired, startingPrice, minimumPrice, category }]
}
Response: { score: number (0-100), topMatchJob: string, reason: string }
```

**System Prompt:**
```
You are a talent matching engine for GeekBid, a tech freelance marketplace.
Score how well this freelancer matches the client's open jobs (0-100).
Consider: skill overlap (most important), rate alignment with job budget,
availability, and GeekScore (higher = more reliable).
Return JSON: { "score": number, "topMatchJob": "job title", "reason": "one sentence" }
```

### 3B. Frontend Integration

**File:** `web/src/components/feed/TalentPool.tsx`

On each `FreelancerCard`, add a small AI match badge:
```tsx
// In the card header area (after GeekScore badge):
<div className="flex items-center gap-1 px-2 py-0.5 rounded-[3px]
  bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.22)]">
  <Sparkles className="h-3 w-3 text-[#c9a84c]" />
  <span className="text-[11px] text-[#c9a84c] font-medium">{matchScore}% match</span>
</div>
```

**Caching strategy:** Cache match scores in localStorage with a 1-hour TTL per freelancer-clientJobs pair to avoid redundant API calls.

---

## Phase 4: AI Bid Advisor (Freelancer)

### Where: Job Detail Page → `web/src/app/jobs/[id]/page.tsx` (Bid placement section)

**What it does:** When a freelancer views a job and wants to bid, they see an "AI Bid Advisor" panel that suggests an optimal bid price and strategy based on:
- Current decayed price and time remaining
- Number of existing bids
- Their own GeekScore and skill match
- Historical data from similar jobs

### 4A. API Route

**File:** `web/src/app/api/ai/bid-advisor/route.ts`

```
POST /api/ai/bid-advisor
Headers: Authorization: Bearer <token>
Body: {
  job: { title, currentPrice, minimumPrice, startingPrice, bidCount, timeRemaining, skillsRequired, category },
  freelancer: { skills, geekScore, hourlyRateMin, hourlyRateMax },
  marketData: { avgFinalPriceForCategory, avgBidsPerJob }
}
Response: {
  suggestedBid: number,
  confidence: "high" | "medium" | "low",
  strategy: string,
  reasoning: string
}
```

### 4B. Frontend Component

**File:** `web/src/components/ai/AIBidAdvisor.tsx`

A collapsible panel below the bid form on the job detail page:
```
┌─────────────────────────────────────────────────┐
│ ✨ AI Bid Advisor                          [▼]  │
├─────────────────────────────────────────────────┤
│ Suggested Bid: $750        Confidence: HIGH     │
│                                                 │
│ Strategy: "The price is decaying rapidly with   │
│ only 2 bids. Counter-bid at 85% of current      │
│ price for best value."                          │
│                                                 │
│ [Apply Suggestion]                              │
└─────────────────────────────────────────────────┘
```

### 4C. Integration Point

**File:** `web/src/app/jobs/[id]/page.tsx`

Add the advisor component above the bid amount input in the freelancer bid section.

---

## Phase 5: AI-Powered Smart Search

### Where: Feed Page → Job browsing and Talent Pool search

**What it does:** Replace basic text search with semantic/natural-language search. A freelancer can type "I want React projects with good pay" instead of selecting filters manually.

### 5A. API Route

**File:** `web/src/app/api/ai/smart-search/route.ts`

```
POST /api/ai/smart-search
Headers: Authorization: Bearer <token>
Body: { query: string, type: "jobs" | "freelancers" }
Response: {
  filters: {
    skills?: string[],
    category?: string,
    minBudget?: number,
    maxBudget?: number,
    availability?: string,
    sortBy?: string
  },
  interpretation: string
}
```

**System Prompt:**
```
You are a search query interpreter for GeekBid, a tech freelance marketplace.
Parse the user's natural language query into structured filters.
Available skills: [SKILL_TAXONOMY list]
Available categories: [JOB_CATEGORIES list]
Return JSON with applicable filters only. Include an "interpretation" field
explaining what you understood.
```

### 5B. Frontend Component

**File:** `web/src/components/ai/AISearchBar.tsx`

A search bar with an AI toggle:
```
┌──────────────────────────────────────────────┐
│ 🔍 "React projects paying over $1000"   [✨] │
│                                              │
│ AI understood: React jobs, starting > $1000  │
│ Applied: skill=React, minBudget=$1000        │
└──────────────────────────────────────────────┘
```

### 5C. Integration Point

**File:** `web/src/app/feed/page.tsx`

Add above the existing filter bar. When AI search is active, auto-apply the returned filters to the existing filter state.

---

## Phase 6: AI Chat Assistant (In-Conversation)

### Where: Inbox → `web/src/app/inbox/page.tsx` (Chat view)

**What it does:** In a chat conversation, users can type `/ai` to get AI-powered assistance:
- `/ai draft-proposal` — Generates a project proposal template based on the job context
- `/ai negotiate` — Suggests negotiation talking points based on chat history
- `/ai summarize` — Summarizes the conversation so far

### 6A. API Route

**File:** `web/src/app/api/ai/chat-assist/route.ts`

```
POST /api/ai/chat-assist
Headers: Authorization: Bearer <token>
Body: {
  command: "draft-proposal" | "negotiate" | "summarize",
  jobContext: { title, description, currentPrice, skills },
  chatHistory: { sender: string, text: string }[],  // last 20 messages
  userRole: "client" | "freelancer"
}
Response: { suggestion: string }
```

### 6B. Frontend Integration

**File:** `web/src/app/inbox/page.tsx`

1. Detect `/ai` prefix in the message input
2. Show a small command palette dropdown: `draft-proposal`, `negotiate`, `summarize`
3. On selection, call the API and insert the result as a draft message (editable before sending)
4. Show a subtle "✨ AI Draft" badge on the message before sending

---

## Phase 7: AI Review Summarizer

### Where: Profile Page → `web/src/app/profile/[id]/page.tsx` and `web/src/app/profile/page.tsx`

**What it does:** When a user has 3+ reviews, show an AI-generated summary at the top of the reviews section: "Clients praise Alex's fast delivery and clean code. Some mention communication could improve during off-hours."

### 7A. API Route

**File:** `web/src/app/api/ai/summarize-reviews/route.ts`

```
POST /api/ai/summarize-reviews
Body: { reviews: { rating: number, comment: string, reviewerRole: string }[] }
Response: { summary: string, strengths: string[], improvements: string[] }
```

### 7B. Frontend Component

**File:** `web/src/components/ai/AIReviewSummary.tsx`

```
┌─────────────────────────────────────────────────┐
│ ✨ AI Summary (based on 8 reviews)              │
│                                                 │
│ "Clients consistently praise fast delivery and  │
│  clean, well-documented code. Rated highly for  │
│  proactive communication and meeting deadlines." │
│                                                 │
│ 💪 Strengths: Fast delivery · Clean code        │
│ 📈 Room to grow: Off-hours availability         │
└─────────────────────────────────────────────────┘
```

### 7C. Integration Point

**File:** `web/src/app/profile/page.tsx` (line 214, before the reviews map)
**File:** `web/src/app/profile/[id]/page.tsx` (public profile, same location)

Add the summary component when `reviews.length >= 3`.

---

## Phase 8: Smart Pricing Advisor (Post Job)

### Where: Post Job Page → `web/src/app/post-job/page.tsx` (Step 2, Pricing section)

**What it does:** Already has a basic `pricing-hint` API (line 377-384). Enhance it with AI to provide more nuanced recommendations.

### 8A. Enhance Existing Pricing Hint

The current `/api/jobs/pricing-hint` returns raw averages. Add an AI layer:

**File:** `web/src/app/api/ai/pricing-advisor/route.ts`

```
POST /api/ai/pricing-advisor
Body: {
  title: string,
  category: string,
  skills: string[],
  estimatedHours: number,
  marketData: { avgFinalPrice, minPrice, maxPrice, sampleSize }
}
Response: {
  recommendedStartingPrice: number,
  recommendedFloorPrice: number,
  recommendedDecayRate: number,
  reasoning: string,
  confidence: "high" | "medium" | "low"
}
```

### 8B. Frontend Component

**File:** `web/src/components/ai/AIPricingAdvisor.tsx`

A panel in the Pricing step that shows AI recommendations with "Apply" buttons:

```
┌─────────────────────────────────────────────────────┐
│ ✨ AI Pricing Advisor                               │
│                                                     │
│ Based on 12 similar React + FastAPI jobs:            │
│                                                     │
│ Starting Price: $1,200  [Apply]                     │
│ Floor Price:    $500    [Apply]                      │
│ Decay Rate:     $18/hr  [Apply]                     │
│                                                     │
│ "React + FastAPI projects typically settle at        │
│  $650-$800. Setting starting at $1,200 with $500    │
│  floor gives optimal competition window."            │
│                                                     │
│ Confidence: HIGH (12 similar jobs analyzed)          │
└─────────────────────────────────────────────────────┘
```

### 8C. Integration Point

**File:** `web/src/app/post-job/page.tsx` (Step 2, after the existing pricing hint at line 704)

---

## Phase 9: AI Skill Verification Enhancement

### Where: Assessments → `web/src/app/assessments/page.tsx`

**What it does:** Enhance the existing skill assessment system with AI-generated questions that adapt to the user's performance level.

### 9A. API Route

**File:** `web/src/app/api/ai/generate-assessment/route.ts`

```
POST /api/ai/generate-assessment
Body: { skill: string, difficulty: "beginner" | "intermediate" | "advanced" }
Response: {
  questions: [
    { question: string, options: string[], correctIndex: number, explanation: string }
  ]
}
```

AI generates 10 fresh questions per assessment, preventing memorization of static question banks.

---

## Phase 10: AI Fraud & Quality Detection (Admin)

### Where: Admin Page → `web/src/app/admin/page.tsx`

**What it does:** Flag suspicious activity automatically:
- Duplicate accounts (similar names/IPs)
- Low-quality job descriptions (too vague, spam-like)
- Bid manipulation patterns (same user bidding on own jobs)
- Fake reviews (sentiment doesn't match rating)

### 10A. API Route

**File:** `web/src/app/api/ai/quality-check/route.ts`

```
POST /api/ai/quality-check
Body: {
  type: "job" | "review" | "user",
  content: { ... }  // the entity to check
}
Response: {
  score: number (0-100, higher = more trustworthy),
  flags: string[],
  recommendation: "approve" | "review" | "reject"
}
```

### 10B. Integration

Add a "🤖 AI Quality" column in the admin dashboard that shows automated trust scores for new jobs and reviews.

---

## Implementation Priority

| Priority | Feature | Complexity | Impact | Phase |
|----------|---------|-----------|--------|-------|
| 🔴 P0 | AI Job Description Generator | Low | High — saves clients 5-10 min per job | 2 |
| 🔴 P0 | Smart Pricing Advisor | Medium | High — better pricing = more bids | 8 |
| 🟡 P1 | AI Bid Advisor | Medium | High — helps freelancers win more jobs | 4 |
| 🟡 P1 | AI Chat Assistant | Medium | Medium — streamlines negotiation | 6 |
| 🟢 P2 | Smart Search | Medium | Medium — better discovery | 5 |
| 🟢 P2 | Match Score | Medium | Medium — helps clients find talent | 3 |
| 🟢 P2 | Review Summarizer | Low | Low-Medium — nice UX polish | 7 |
| 🔵 P3 | AI Assessments | High | Medium — better skill verification | 9 |
| 🔵 P3 | Fraud Detection | High | Low (low volume currently) | 10 |

**Recommended execution order:** Phase 1 → Phase 2 → Phase 8 → Phase 4 → Phase 6 → Phase 5 → Phase 3 → Phase 7 → Phase 9 → Phase 10

---

## Key Files Summary

| File | Action | Phase |
|------|--------|-------|
| `web/src/lib/ai.ts` | **CREATE** | 1 |
| `web/src/app/api/ai/generate-description/route.ts` | **CREATE** | 2 |
| `web/src/app/api/ai/match-score/route.ts` | **CREATE** | 3 |
| `web/src/app/api/ai/bid-advisor/route.ts` | **CREATE** | 4 |
| `web/src/app/api/ai/smart-search/route.ts` | **CREATE** | 5 |
| `web/src/app/api/ai/chat-assist/route.ts` | **CREATE** | 6 |
| `web/src/app/api/ai/summarize-reviews/route.ts` | **CREATE** | 7 |
| `web/src/app/api/ai/pricing-advisor/route.ts` | **CREATE** | 8 |
| `web/src/app/api/ai/generate-assessment/route.ts` | **CREATE** | 9 |
| `web/src/app/api/ai/quality-check/route.ts` | **CREATE** | 10 |
| `web/src/components/ai/AIDescriptionButton.tsx` | **CREATE** | 2 |
| `web/src/components/ai/AIBidAdvisor.tsx` | **CREATE** | 4 |
| `web/src/components/ai/AISearchBar.tsx` | **CREATE** | 5 |
| `web/src/components/ai/AIPricingAdvisor.tsx` | **CREATE** | 8 |
| `web/src/components/ai/AIReviewSummary.tsx` | **CREATE** | 7 |
| `web/src/app/post-job/page.tsx` | Modify | 2, 8 |
| `web/src/app/jobs/[id]/page.tsx` | Modify | 4 |
| `web/src/app/inbox/page.tsx` | Modify | 6 |
| `web/src/app/feed/page.tsx` | Modify | 3, 5 |
| `web/src/app/profile/page.tsx` | Modify | 7 |
| `web/src/app/profile/[id]/page.tsx` | Modify | 7 |
| `web/src/components/feed/TalentPool.tsx` | Modify | 3 |
| `web/src/app/admin/page.tsx` | Modify | 10 |

## Rules

- ALL AI calls go through `web/src/lib/ai.ts` — single point of control
- NEVER expose Gemini API key to client — all AI calls are server-side API routes
- ALL AI API routes require authentication via `authenticateRequest()`
- AI responses must be validated/sanitized before rendering (prevent prompt injection in outputs)
- Add rate limiting: max 20 AI calls per user per hour (tracked in MongoDB)
- AI features should gracefully degrade — if AI API is down, hide the AI buttons, don't break the page
- Show loading states with a distinctive "✨" sparkle icon and "Thinking..." text
- Cache AI responses where appropriate (e.g., match scores: 1hr, pricing advice: 30min)
- All AI UI elements use the sparkle ✨ icon from Lucide (`Sparkles`) for consistency
- Keep Royal Dark theme — AI elements should feel integrated, not like a separate product
