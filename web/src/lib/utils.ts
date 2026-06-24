import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCurrentPrice(job: Job, now: Date): number {
  if (job.status !== 'open') return job.finalPrice ?? job.minimumPrice;
  const elapsedMs = Math.max(now.getTime() - new Date(job.postedAt).getTime(), 0);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  return Math.max(job.startingPrice - job.decayRatePerHour * elapsedHours, job.minimumPrice);
}

export function getHoursToFloor(job: Job, now: Date): number {
  const current = getCurrentPrice(job, now);
  if (current <= job.minimumPrice) return 0;
  return (current - job.minimumPrice) / job.decayRatePerHour;
}

export function formatHoursToFloor(hours: number): string {
  if (hours <= 0) return 'At floor';
  if (hours < 1) return `${Math.ceil(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
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
  id: string; _id?: string; role: Role; fullName: string; email: string; avatarInitial: string;
  geekScore: number; skills: string[]; bio: string; isVerified: boolean;
  company?: string; githubUsername?: string; availability?: string;
  hourlyRateMin?: number; hourlyRateMax?: number;
};

export type Job = {
  id: string; _id?: string; clientId: string; title: string; description: string;
  skillsRequired: string[]; startingPrice: number; minimumPrice: number;
  decayRatePerHour: number; postedAt: string; deadlineAt: string;
  estimatedHours: number; status: 'open' | 'accepted' | 'expired';
  acceptedBy?: string; acceptedAt?: string; finalPrice?: number;
  currentPrice?: number;
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
};

export type Dispute = {
  id: string; transactionId: string; raisedBy: string;
  reason: string; status: string; createdAt: string;
};

export type ChatMessage = { id: string; roomId: string; senderId: string; text: string; createdAt: string; };
export type ChatRoom = { id: string; jobId: string; participantIds: string[]; updatedAt: string; };

// Geek Score
export const GEEK_TIERS = [
  { min: 0, max: 199, label: 'Newbie', color: '#6B7280' },
  { min: 200, max: 399, label: 'Script Kiddie', color: '#34D399' },
  { min: 400, max: 599, label: 'Code Monkey', color: '#60A5FA' },
  { min: 600, max: 799, label: 'Senior Geek', color: '#A78BFA' },
  { min: 800, max: 1000, label: '10x Engineer', color: '#F59E0B' },
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
];
