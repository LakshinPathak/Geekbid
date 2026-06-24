export type Role = 'client' | 'freelancer' | 'admin';
export type Availability = 'available' | 'part-time' | 'unavailable';

export type User = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  avatarInitial: string;
  geekScore: number;
  skills: string[];
  bio: string;
  isVerified: boolean;
  // Freelancer-specific
  githubUsername?: string;
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  availability?: Availability;
  // Client-specific
  company?: string;
  jobsPosted?: number;
  avgPaymentSpeed?: string;
};

export type JobStatus = 'open' | 'accepted' | 'expired' | 'cancelled';
export type JobVisibility = 'public' | 'invite_only';

export type Job = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  skillsRequired: string[];
  startingPrice: number;
  currentPrice?: number;
  minimumPrice: number;
  decayRatePerHour: number;
  postedAt: string;
  deadlineAt: string;
  estimatedHours: number;
  status: JobStatus;
  acceptedBy?: string;
  acceptedAt?: string;
  finalPrice?: number;
  visibility?: JobVisibility;
};

export type BidType = 'accept' | 'counter';

export type Bid = {
  id: string;
  jobId: string;
  freelancerId: string;
  bidType: BidType;
  bidPrice: number;
  message?: string;
  createdAt: string;
};

export type NotificationType =
  | 'job_posted'
  | 'price_drop'
  | 'job_accepted'
  | 'counter_bid_received'
  | 'payment_released'
  | 'new_message'
  | 'dispute_raised';

export type NotificationItem = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  jobId?: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export type ChatRoom = {
  id: string;
  jobId: string;
  participantIds: string[];
  updatedAt: string;
};

export type EscrowStatus = 'pending' | 'held' | 'released' | 'refunded' | 'disputed';

export type Transaction = {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  escrowStatus: EscrowStatus;
  createdAt: string;
  releasedAt?: string;
};

export type Dispute = {
  id: string;
  transactionId: string;
  raisedBy: string;
  reason: string;
  status: 'open' | 'in_review' | 'resolved';
  createdAt: string;
};

export type NewJobInput = {
  title: string;
  description: string;
  skillsRequired: string[];
  startingPrice: number;
  minimumPrice: number;
  decayRatePerHour: number;
  estimatedHours: number;
  deadlineAt: string;
  visibility?: JobVisibility;
};

export type SortOption = 'best_match' | 'highest_price' | 'fastest_decay' | 'newest' | 'nearest_deadline';

export type FilterState = {
  skills: string[];
  minPrice: number;
  maxPrice: number;
  sortBy: SortOption;
};
