# 15 — CRUD Operations Audit & Gap Analysis

> **Scope**: Every API route in `web/src/app/api/` audited against 16 MongoDB collections.
> **Goal**: Map existing CRUD, identify **missing operations**, and define new endpoints needed for the Imperial Light design system.

---

## 1. Existing CRUD Matrix

### Legend
| Symbol | Meaning |
|--------|---------|
| ✅ | Exists and working |
| ❌ | Missing — needs to be built |
| ⚠️ | Partial — exists but incomplete |

---

### 1.1 `users` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| Register | POST | `/api/auth` | ✅ | action=register, sends welcome email |
| Login | POST | `/api/auth` | ✅ | action=login, returns JWT |
| Google OAuth | GET | `/api/auth/google` | ✅ | Redirect to Google |
| Google Callback | GET | `/api/auth/google/callback` | ✅ | Handles OAuth callback |
| Get Current User | GET | `/api/auth/me` | ✅ | From JWT cookie |
| Get Own Profile | GET | `/api/user` | ✅ | Protected, excludes password |
| Update Profile | PATCH | `/api/user` | ✅ | Allowed: fullName, bio, skills, company, availability, hourlyRate |
| List All Users | GET | `/api/users` | ✅ | Admin sees all, others see public |
| Verify GitHub | POST | `/api/user/verify-github` | ✅ | Calls GitHub API, updates user |
| Logout | POST | `/api/auth/logout` | ✅ | Clears refresh token |
| Refresh Token | POST | `/api/auth/refresh` | ✅ | Issues new access token |
| **Delete Account** | DELETE | `/api/user` | ❌ | **NEW — needed for settings page** |
| **Change Password** | PATCH | `/api/user/password` | ❌ | **NEW — needed for settings** |
| **Upload Avatar** | POST | `/api/user/avatar` | ❌ | **NEW — needed for profile redesign** |
| **Get Public Profile** | GET | `/api/users/[id]` | ❌ | **NEW — needed for freelancer cards** |
| **Update Notification Prefs** | PATCH | `/api/user/preferences` | ❌ | **NEW — email opt-in/out** |

**File**: [user/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/user/route.ts)

---

### 1.2 `jobs` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List All Jobs | GET | `/api/jobs` | ✅ | Public, ?category= filter, sorted by featured+date |
| Create Job | POST | `/api/jobs` | ✅ | Client only, plan limits enforced, sends email |
| Get Single Job | GET | `/api/jobs/[id]` | ✅ | Public |
| Accept Job | PATCH | `/api/jobs/[id]` | ✅ | Freelancer only, server-side price calc, creates escrow |
| Toggle Featured | PATCH | `/api/jobs/feature` | ✅ | Admin or client |
| Direct Offer | POST | `/api/jobs/direct-offer` | ✅ | Client→Freelancer, GeekScore≥500 required |
| Offer Response | PATCH | `/api/jobs/offer-response` | ✅ | Freelancer accept/decline |
| Pricing Hint | GET | `/api/jobs/pricing-hint` | ✅ | Historical price analytics by skills |
| Recommended | GET | `/api/jobs/recommended` | ✅ | Skill-match scoring for freelancers |
| V1 List/Create | GET/POST | `/api/v1/jobs` | ✅ | API key auth, external integrations |
| **Update Job** | PATCH | `/api/jobs` | ❌ | **NEW — edit title/desc/skills before any bids** |
| **Cancel/Close Job** | PATCH | `/api/jobs/[id]/cancel` | ❌ | **NEW — client cancels open job** |
| **Delete Job** | DELETE | `/api/jobs/[id]` | ❌ | **NEW — admin hard-delete** |
| **Search Jobs** | GET | `/api/jobs/search` | ❌ | **NEW — full-text search with filters** |
| **Job Analytics** | GET | `/api/jobs/[id]/analytics` | ❌ | **NEW — bid count, price history chart data** |
| **Mark Completed** | PATCH | `/api/jobs/[id]/complete` | ❌ | **NEW — formal completion flow + email** |
| **Save/Bookmark Job** | POST | `/api/jobs/[id]/save` | ❌ | **NEW — freelancer saves for later** |

**Files**: [jobs/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/jobs/route.ts), [jobs/[id]/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/jobs/%5Bid%5D/route.ts)

---

### 1.3 `bids` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Bids | GET | `/api/bids` | ✅ | ?jobId= filter |
| Place Counter-Bid | POST | `/api/bids` | ✅ | 30min cooldown, plan limits, sends emails |
| **Withdraw Bid** | DELETE | `/api/bids/[id]` | ❌ | **NEW — freelancer retracts before acceptance** |
| **Update Bid** | PATCH | `/api/bids/[id]` | ❌ | **NEW — modify bid amount/message** |
| **My Bids** | GET | `/api/bids/my` | ❌ | **NEW — freelancer's bid history dashboard** |

**File**: [bids/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/bids/route.ts)

---

### 1.4 `transactions` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Transactions | GET | `/api/transactions` | ✅ | Protected, role-filtered |
| Release Escrow | PATCH | `/api/transactions` | ✅ | action=release, client/admin only, sends emails |
| Raise Dispute | PATCH | `/api/transactions` | ✅ | action=dispute, creates dispute doc |
| **Transaction Detail** | GET | `/api/transactions/[id]` | ❌ | **NEW — single transaction view** |
| **Export Transactions** | GET | `/api/transactions/export` | ❌ | **NEW — CSV/PDF export for financial terminal** |
| **Refund** | POST | `/api/transactions/[id]/refund` | ❌ | **NEW — admin-initiated refund flow** |

**File**: [transactions/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/transactions/route.ts)

---

### 1.5 `payments` (Razorpay)

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| Create Order | POST | `/api/payments` | ✅ | Razorpay or mock fallback |
| Verify Payment | PATCH | `/api/payments` | ✅ | Signature verification, creates transaction |
| Get Config | GET | `/api/payments` | ✅ | Returns public key + mock status |
| **Payment History** | GET | `/api/payments/history` | ❌ | **NEW — user's payment history with receipts** |

**File**: [payments/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/payments/route.ts)

---

### 1.6 `milestones` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Milestones | GET | `/api/milestones` | ✅ | ?jobId= required |
| Create Milestones | POST | `/api/milestones` | ✅ | Client only, batch insert |
| Update Status | PATCH | `/api/milestones` | ✅ | start/submit/approve actions, sends emails |
| **Delete Milestone** | DELETE | `/api/milestones/[id]` | ❌ | **NEW — remove pending milestone** |
| **Edit Milestone** | PUT | `/api/milestones/[id]` | ❌ | **NEW — update title/amount before start** |

**File**: [milestones/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/milestones/route.ts)

---

### 1.7 `disputes` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Disputes | GET | `/api/disputes` | ✅ | Admin=all, user=own |
| Resolve Dispute | PATCH | `/api/disputes` | ✅ | Admin only, sends resolution email |
| **Create Dispute** | POST | `/api/disputes` | ❌ | **NEW — standalone dispute creation (not tied to transaction PATCH)** |
| **Add Evidence** | POST | `/api/disputes/[id]/evidence` | ❌ | **NEW — upload files/screenshots** |

**File**: [disputes/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/disputes/route.ts)

---

### 1.8 `notifications` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Notifications | GET | `/api/notifications` | ✅ | Protected, role-filtered |
| Create Notification | POST | `/api/notifications` | ✅ | Internal/admin use |
| Mark Read | PATCH | `/api/notifications` | ✅ | Single or markAll |
| **Delete Notification** | DELETE | `/api/notifications/[id]` | ❌ | **NEW — dismiss/clear** |
| **Unread Count** | GET | `/api/notifications/count` | ❌ | **NEW — badge count for navbar** |

**File**: [notifications/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/notifications/route.ts)

---

### 1.9 `reviews` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Reviews | GET | `/api/reviews` | ✅ | ?userId= or ?jobId= |
| Create Review | POST | `/api/reviews` | ✅ | Only after escrow released, uniqueness check, updates avg rating |
| **Edit Review** | PATCH | `/api/reviews/[id]` | ❌ | **NEW — edit within 24h window** |
| **Delete Review** | DELETE | `/api/reviews/[id]` | ❌ | **NEW — admin moderation** |

**File**: [reviews/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/reviews/route.ts)

---

### 1.10 `chat_rooms` & `chat_messages` Collections

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Rooms | GET | `/api/chat/rooms` | ✅ | User's rooms only |
| Create Room | POST | `/api/chat/rooms` | ✅ | Deduplicates by job+participants |
| List Messages | GET | `/api/chat/messages` | ✅ | ?roomId=, verifies participant |
| Send Message | POST | `/api/chat/messages` | ✅ | Updates room.updatedAt |
| **Delete Message** | DELETE | `/api/chat/messages/[id]` | ❌ | **NEW — unsend within 5min** |
| **Mark Messages Read** | PATCH | `/api/chat/messages/read` | ❌ | **NEW — read receipts** |
| **Typing Indicator** | WS | N/A | ❌ | **Future — WebSocket needed** |

**Files**: [chat/rooms/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/chat/rooms/route.ts), [chat/messages/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/chat/messages/route.ts)

---

### 1.11 `teams` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| Get Team | GET | `/api/teams` | ✅ | With analytics (jobs, spend) |
| Create Team | POST | `/api/teams` | ✅ | Prevents duplicate membership |
| Invite / Accept | PATCH | `/api/teams` | ✅ | Email invite + accept flow |
| **Remove Member** | PATCH | `/api/teams/remove` | ❌ | **NEW — owner kicks member** |
| **Leave Team** | POST | `/api/teams/leave` | ❌ | **NEW — member self-removes** |
| **Delete Team** | DELETE | `/api/teams` | ❌ | **NEW — owner dissolves team** |

**File**: [teams/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/teams/route.ts)

---

### 1.12 `referrals` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| Get Stats + Code | GET | `/api/referrals` | ✅ | Auto-generates code if missing |
| **Redeem Credits** | POST | `/api/referrals/redeem` | ❌ | **NEW — apply credits to payment** |

**File**: [referrals/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/referrals/route.ts)

---

### 1.13 `api_keys` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Keys | GET | `/api/keys` | ✅ | Masked display |
| Generate Key | POST | `/api/keys` | ✅ | bcrypt hashed, shown once |
| Revoke Key | DELETE | `/api/keys` | ✅ | Soft-delete (revokedAt) |

**File**: [keys/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/keys/route.ts) — **✅ COMPLETE, no gaps**

---

### 1.14 `assessments` & `assessment_results` Collections

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Assessments | GET | `/api/assessments` | ✅ | Hides correct answers |
| Get Single | GET | `/api/assessments?id=` | ✅ | Quiz-taking view |
| Get Results | GET | `/api/assessments?results=true` | ✅ | User's history |
| Submit Answers | POST | `/api/assessments` | ✅ | 30-day cooldown, auto-scores, boosts GeekScore |
| **Create Assessment** | POST | `/api/assessments/admin` | ❌ | **NEW — admin creates quiz** |

**File**: [assessments/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/assessments/route.ts)

---

### 1.15 `email_logs` Collection

| Operation | Method | Route | Status | Notes |
|-----------|--------|-------|--------|-------|
| List Logs | GET | `/api/email-logs` | ✅ | Paginated, filtered by type/status |
| Purge Logs | DELETE | `/api/email-logs` | ✅ | Admin: by ID or by age |

**File**: [email-logs/route.ts](file:///home/lakshinpathak/Downloads/Geekbid-master/web/src/app/api/email-logs/route.ts) — **✅ COMPLETE, no gaps**

---

### 1.16 `seed` (Utility)

| Operation | Method | Route | Status |
|-----------|--------|-------|--------|
| Seed All Data | POST | `/api/seed` | ✅ | Blocked in production unless ALLOW_SEED=true |

---

## 2. Email Functions Already Integrated (18 total)

| # | Function | Trigger Point |
|---|----------|---------------|
| 1 | `sendWelcomeEmail` | POST `/api/auth` (register) |
| 2 | `sendNewBidEmail` | POST `/api/bids` |
| 3 | `sendPriceTargetAlertEmail` | POST `/api/bids` (bid ≤ 110% floor) |
| 4 | `sendDirectOfferEmail` | POST `/api/jobs/direct-offer` |
| 5 | `sendOfferResponseEmail` | PATCH `/api/jobs/offer-response` |
| 6 | `sendJobAcceptedEmail` | PATCH `/api/jobs/[id]` (accept) |
| 7 | `sendBookingConfirmationEmail` | PATCH `/api/jobs/[id]` + offer-response |
| 8 | `sendJobPostedEmail` | POST `/api/jobs` |
| 9 | `sendMilestoneSubmittedEmail` | PATCH `/api/milestones` (submit) |
| 10 | `sendMilestoneApprovedEmail` | PATCH `/api/milestones` (approve) |
| 11 | `sendEscrowReleasedEmail` | PATCH `/api/transactions` (release) |
| 12 | `sendJobCompletedEmail` | PATCH `/api/transactions` (release) |
| 13 | `sendDisputeEmail` | PATCH `/api/transactions` (dispute) |
| 14 | `sendDisputeResolvedEmail` | PATCH `/api/disputes` (resolve) |
| 15 | `sendPaymentConfirmationEmail` | PATCH `/api/payments` (verify) |
| 16 | `sendTeamInviteEmail` | PATCH `/api/teams` (invite) |
| 17 | `sendNewReviewEmail` | POST `/api/reviews` |
| 18 | `sendReferralSignupEmail` | POST `/api/auth` (with referralCode) |
| 19 | `sendAssessmentPassedEmail` | POST `/api/assessments` (passed) |

---

## 3. NEW CRUD Operations Required

### 🔴 Priority 1 — Critical for New UI

| # | Route | Method | Collection | Purpose | Email Trigger? |
|---|-------|--------|------------|---------|----------------|
| 1 | `/api/users/[id]` | GET | users | Public profile view for freelancer cards | No |
| 2 | `/api/jobs/[id]/cancel` | PATCH | jobs | Client cancels open job | ✅ `sendJobCancelledEmail` |
| 3 | `/api/jobs/[id]/complete` | PATCH | jobs | Mark job as completed by client | ✅ `sendJobCompletedSummaryEmail` |
| 4 | `/api/notifications/count` | GET | notifications | Unread badge count for navbar | No |
| 5 | `/api/bids/my` | GET | bids | Freelancer's bid history dashboard | No |

### 🟡 Priority 2 — Important for Polish

| # | Route | Method | Collection | Purpose | Email Trigger? |
|---|-------|--------|------------|---------|----------------|
| 6 | `/api/user/password` | PATCH | users | Change password from settings | No |
| 7 | `/api/user/preferences` | PATCH | users | Email notification opt-in/out | No |
| 8 | `/api/jobs/search` | GET | jobs | Full-text search with skill/price/status filters | No |
| 9 | `/api/bids/[id]` | DELETE | bids | Withdraw bid before job accepted | No |
| 10 | `/api/milestones/[id]` | DELETE | milestones | Remove pending milestone | No |
| 11 | `/api/teams/remove` | PATCH | teams | Owner removes a member | ✅ `sendTeamRemovalEmail` |
| 12 | `/api/teams/leave` | POST | teams | Member leaves team | No |

### 🟢 Priority 3 — Nice-to-Have

| # | Route | Method | Collection | Purpose | Email Trigger? |
|---|-------|--------|------------|---------|----------------|
| 13 | `/api/user` | DELETE | users | Account deletion (GDPR) | ✅ `sendAccountDeletedEmail` |
| 14 | `/api/user/avatar` | POST | users | Upload profile avatar | No |
| 15 | `/api/transactions/[id]` | GET | transactions | Single transaction detail | No |
| 16 | `/api/transactions/export` | GET | transactions | CSV/PDF export | No |
| 17 | `/api/disputes` | POST | disputes | Standalone dispute creation | ✅ `sendDisputeEmail` |
| 18 | `/api/disputes/[id]/evidence` | POST | disputes | Upload evidence files | No |
| 19 | `/api/jobs/[id]/save` | POST | saved_jobs | Bookmark job for later | No |
| 20 | `/api/chat/messages/[id]` | DELETE | chat_messages | Unsend message (5min window) | No |
| 21 | `/api/referrals/redeem` | POST | referrals/users | Apply referral credits | No |
| 22 | `/api/assessments/admin` | POST | assessments | Admin creates new quizzes | No |
| 23 | `/api/reviews/[id]` | PATCH | reviews | Edit review (24h window) | No |
| 24 | `/api/jobs/[id]/analytics` | GET | jobs/bids | Bid activity + price history chart data | No |

---

## 4. New MongoDB Collections Needed

| Collection | Purpose | Required By |
|------------|---------|-------------|
| `saved_jobs` | Freelancer job bookmarks | `/api/jobs/[id]/save` |
| `user_preferences` | Email notification settings (or embed in `users` doc) | `/api/user/preferences` |

> **Recommendation**: Embed `preferences` inside the `users` document (no new collection needed). Only `saved_jobs` requires a new collection.

---

## 5. New Email Functions Needed

| # | Function | Trigger | Template Summary |
|---|----------|---------|------------------|
| 1 | `sendJobCancelledEmail` | Job cancelled by client | Notify freelancers who bid |
| 2 | `sendJobCompletedSummaryEmail` | Job marked complete | Summary to both parties |
| 3 | `sendTeamRemovalEmail` | Member removed from team | Notify removed member |
| 4 | `sendAccountDeletedEmail` | Account self-deletion | Confirmation + data retention policy |

---

## 6. Missing Indexes for New Operations

```javascript
// Add to seed/route.ts or a migration script
db.collection("saved_jobs").createIndex({ userId: 1, jobId: 1 }, { unique: true });
db.collection("saved_jobs").createIndex({ userId: 1, createdAt: -1 });
db.collection("jobs").createIndex({ title: "text", description: "text" }); // Full-text search
db.collection("users").createIndex({ referralCode: 1 }, { unique: true, sparse: true });
```

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| **Existing API Routes** | 32 |
| **Existing HTTP Handlers** | 52 |
| **MongoDB Collections** | 16 (+1 new) |
| **Email Functions** | 19 existing + 4 new = **23** |
| **Missing CRUD Operations** | **24 new endpoints** |
| **P1 (Critical)** | 5 endpoints |
| **P2 (Important)** | 7 endpoints |
| **P3 (Nice-to-have)** | 12 endpoints |
