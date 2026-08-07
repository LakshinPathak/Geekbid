import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAdaptivePrice } from "./pricing";

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

// Job/bid prices (startingPrice, minimumPrice, bidPrice, decayRatePerHour)
// have no stored currency field and are treated as USD-denominated
// throughout the app — that part is unchanged here. This optional param
// exists so callers displaying a real `transactions` row (which DOES carry
// a `currency`, usually "INR" since Razorpay on this account only settles
// in INR) can render it correctly instead of always labeling it `$`.
export function formatMoney(amount: number, currency: string = "USD"): string {
 if (currency !== "USD") {
 try {
 return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
 style: "currency",
 currency,
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(amount);
 } catch {
 // Unknown/invalid currency code — fall through to the USD format below
 // rather than throwing on a bad value from the DB.
 }
 }
 return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCurrentPrice(job: Job, now: Date): number {
 if (job.status !== 'open') return job.finalPrice ?? job.minimumPrice;

 // Adaptive pricing: use demand-responsive engine
 if (job.pricingMode !== 'fixed') {
 return getAdaptivePrice(job, now);
 }

 // Fixed pricing: original linear decay
 const elapsedMs = Math.max(now.getTime() - new Date(job.postedAt).getTime(), 0);
 const elapsedHours = elapsedMs / (1000 * 60 * 60);
 return Math.max(job.startingPrice - job.decayRatePerHour * elapsedHours, job.minimumPrice);
}

export function getHoursToFloor(job: Job, now: Date): number {
 const current = getCurrentPrice(job, now);
 if (current <= job.minimumPrice) return 0;

 if (job.pricingMode === 'fixed') {
 return (current - job.minimumPrice) / job.decayRatePerHour;
 }

 // Adaptive pricing has no closed-form floor time — the demand multiplier,
 // bid boost, and counter-bid pull (pricing.ts) are all non-linear in
 // elapsed time, so dividing by the flat base decayRatePerHour (as the
 // fixed-mode branch does) ignored the adaptive rate entirely: a hot job's
 // real decay is much slower than the base rate (multiplier < 1) so this
 // showed a much shorter "time to floor" than reality, and a stale
 // zero-bid job accelerates after 24h (multiplier up to 2x) so it showed a
 // longer one. Search forward numerically instead.
 return getAdaptiveHoursToFloor(job, now);
}

// Exponential search for an upper bound where price has reached the floor,
// then binary search down to ~1 minute of precision. getAdaptivePrice is
// treated as monotonically non-increasing over time for a fixed snapshot of
// bid signals (bidCount/lastBidAt/lowestCounterBid held constant, only `now`
// varies) — true in practice: the bid-boost term only ever fades toward
// zero as elapsed-since-last-bid grows, it never re-triggers on its own.
function getAdaptiveHoursToFloor(job: Job, now: Date): number {
 const MAX_HOURS = 24 * 60; // ~60 days — treat as "not reaching floor" beyond this
 const priceAt = (h: number) => getAdaptivePrice(job, new Date(now.getTime() + h * 3600000));

 if (priceAt(MAX_HOURS) > job.minimumPrice) return MAX_HOURS;

 let lo = 0;
 let hi = 1;
 while (priceAt(hi) > job.minimumPrice) hi *= 2;
 while (hi - lo > 1 / 60) {
 const mid = (lo + hi) / 2;
 if (priceAt(mid) <= job.minimumPrice) hi = mid;
 else lo = mid;
 }
 return hi;
}

export function formatHoursToFloor(hours: number): string {
 if (hours <= 0) return 'At floor';
 if (hours < 1) return `${Math.ceil(hours * 60)}m`;
 let h = Math.floor(hours);
 let m = Math.round((hours - h) * 60);
 // Rounding the leftover minutes can carry up to 60 (e.g. 2.9995h ->
 // h=2, m=round(59.97)=60), which used to render as "2h 60m" instead
 // of rolling over into the next hour.
 if (m === 60) { h += 1; m = 0; }
 return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function timeAgo(dateStr: string): string {
 const diffMs = Date.now() - new Date(dateStr).getTime();
 const hrs = Math.floor(diffMs / (1000 * 60 * 60));
 if (hrs < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
}

// Types
export type Role = 'client' | 'freelancer' | 'admin';

export type User = {
 id: string; _id?: string; role: Role; roles?: Role[]; fullName: string; email: string; avatarInitial: string;
 geekScore: number; skills: string[]; bio: string; isVerified: boolean;
 company?: string; githubUsername?: string; availability?: string;
 hourlyRateMin?: number; hourlyRateMax?: number;
 averageRating?: number; totalReviews?: number;
 githubVerified?: boolean; githubData?: { publicRepos: number; followers: number; profileUrl: string; verifiedAt: string };
 referralCode?: string; referredBy?: string; referralCredits?: number;
 plan?: 'free' | 'plus' | 'premium'; subscriptionId?: string | null; planExpiresAt?: string | null; planDowngradedAt?: string | null;
 planLimits?: { jobsPostedThisMonth: number; bidsPlacedThisMonth: number; aiBidUsesThisMonth?: number; aiUsesThisMonth?: number; aiMonthResetAt?: string; aiBidMonthResetAt?: string; monthResetAt: string; featuredBoostsUsedThisMonth?: number; invitesSentThisMonth?: number };
 teamId?: string; teamRole?: 'owner' | 'member';
 verifiedSkills?: string[];
 avatarUrl?: string;
 avatarPublicId?: string;
};

export type JobCategory = 'ai_ml' | 'web_dev' | 'mobile' | 'devops' | 'security' | 'data_eng' | 'blockchain' | 'design' | 'writing' | 'video' | 'qa' | 'other';

export const JOB_CATEGORIES: { value: JobCategory; label: string }[] = [
 { value: 'ai_ml', label: 'AI/ML' },
 { value: 'web_dev', label: 'Web Development' },
 { value: 'mobile', label: 'Mobile' },
 { value: 'devops', label: 'DevOps/Cloud' },
 { value: 'security', label: 'Security' },
 { value: 'data_eng', label: 'Data Engineering' },
 { value: 'blockchain', label: 'Blockchain/Web3' },
 { value: 'design', label: 'Graphics & Design' },
 { value: 'writing', label: 'Writing & Translation' },
 { value: 'video', label: 'Video & Animation' },
 { value: 'qa', label: 'QA/Testing' },
 { value: 'other', label: 'Other' },
];

export const getCategoryLabel = (value: string) => JOB_CATEGORIES.find(c => c.value === value)?.label ?? value;

export type Job = {
 id: string; _id?: string; clientId: string; title: string; description: string;
 skillsRequired: string[]; startingPrice: number; minimumPrice: number;
 decayRatePerHour: number; postedAt: string; deadlineAt: string;
 estimatedHours: number; status: 'open' | 'accepted' | 'expired' | 'cancelled' | 'completed' | 'removed';
 acceptedBy?: string; acceptedAt?: string; finalPrice?: number;
 currentPrice?: number; category?: JobCategory;
 visibility?: 'public' | 'invite_only';
 featured?: boolean; featuredAt?: string;
 type?: 'auction' | 'direct_offer'; offeredTo?: string; offerStatus?: 'pending' | 'accepted' | 'declined';
 pricingMode?: 'fixed' | 'adaptive';
 bidCount?: number;
 uniqueBidderCount?: number;
 lastBidAt?: string | null;
 lowestCounterBid?: number | null;
 priceHistory?: { price: number; at: string; event: string }[];
};

export type Bid = {
 id: string; jobId: string; freelancerId: string;
 bidType: 'accept' | 'counter'; bidPrice: number;
 message?: string; createdAt: string;
};

export type NotificationItem = {
 id: string; userId: string; type: string; title: string;
 body: string; createdAt: string; isRead: boolean; jobId?: string;
};

export type Transaction = {
 id: string; _id?: string; jobId: string; clientId: string; freelancerId: string;
 grossAmount: number; platformFee: number; netAmount: number;
 escrowStatus: string; createdAt: string; releasedAt?: string;
 currency?: string;
};

export type SubscriptionStatus = 'created' | 'active' | 'past_due' | 'halted' | 'cancelled' | 'completed';

export type Subscription = {
 id: string; _id?: string; userId: string;
 plan: 'plus' | 'premium';
 razorpaySubscriptionId: string; razorpayPlanId: string;
 status: SubscriptionStatus;
 currentPeriodStart: string; currentPeriodEnd: string;
 cancelAtPeriodEnd: boolean;
 pendingPlanChange: 'plus' | 'premium' | null;
 gracePeriodEndsAt: string | null;
 createdAt: string; updatedAt: string;
 lastWebhookEventId: string | null;
};

export type Dispute = {
 id: string; transactionId: string; raisedBy: string;
 reason: string; status: string; createdAt: string;
};

export type ChatMessage = { id: string; roomId: string; senderId: string; text: string; createdAt: string; };
export type ChatRoom = { id: string; jobId: string; participantIds: string[]; updatedAt: string; lastReadBy?: Record<string, string>; };

export type Review = {
 id: string; _id?: string; jobId: string; reviewerId: string; revieweeId: string;
 rating: number; comment: string; reviewerRole: 'client' | 'freelancer'; createdAt: string;
};

export type Milestone = {
 id: string; _id?: string; jobId: string; title: string; description: string;
 amount: number; order: number; status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'disputed';
 submittedAt?: string; approvedAt?: string; createdAt: string;
};

export type Referral = {
 id: string; _id?: string; referrerUserId: string; referredUserId: string;
 referralCode: string; status: 'signed_up' | 'first_job_completed' | 'credited';
 creditAmount: number; createdAt: string; completedAt?: string;
};

export type Team = {
 id: string; _id?: string; name: string; ownerId: string;
 memberIds: string[]; invites: { email: string; status: string; invitedAt: string }[];
 createdAt: string;
};

export type ApiKey = {
 id: string; _id?: string; userId: string; key: string; name: string;
 lastUsedAt?: string; createdAt: string; revokedAt?: string;
};

export type Assessment = {
 id: string; _id?: string; skill: string;
 questions: { question: string; options: string[]; correctIndex: number }[];
 timeLimit: number; passingScore: number;
};

export type AssessmentResult = {
 id: string; _id?: string; userId: string; assessmentId: string; skill: string;
 score: number; passed: boolean; answers: number[];
 startedAt: string; completedAt: string;
};

// Geek Score
export const GEEK_TIERS = [
 { min: 0, max: 199, label: 'Newbie', color: '#b3aec0' },
 { min: 200, max: 399, label: 'Script Kiddie', color: '#4d7245' },
 { min: 400, max: 599, label: 'Code Monkey', color: '#9c8fd8' },
 { min: 600, max: 799, label: 'Senior Geek', color: '#3d3373' },
 { min: 800, max: 1000, label: '10x Engineer', color: '#4b3f8f' },
];
export const getGeekTier = (score: number) => GEEK_TIERS.find((t) => score >= t.min && score <= t.max) ?? GEEK_TIERS[0];

export const SKILL_TAXONOMY = [
 'React', 'React Native', 'Next.js', 'Vue', 'Angular', 'Node.js',
 'FastAPI', 'Django', 'GraphQL', 'TypeScript',
 'NLP', 'Computer Vision', 'LLM Fine-tuning', 'RAG Systems', 'MLOps',
 'Kubernetes', 'Terraform', 'CI/CD Pipelines', 'AWS', 'GCP',
 'Cloud Security', 'Penetration Testing', 'Web App Security',
 'Smart Contracts', 'DeFi Protocols', 'NFT Platforms',
 'ETL Pipelines', 'Spark', 'Kafka', 'Airflow',
 'Flutter', 'iOS (Swift)', 'Android (Kotlin)',
 'Logo Design', 'Vector Illustration', 'Branding', 'UI/UX Design', 'Figma',
 'Copywriting', 'Content Writing', 'Translation', 'Technical Writing', 'SEO Writing',
 'Video Editing', 'Motion Graphics', '2D Animation', '3D Animation', 'Voice Over',
];
