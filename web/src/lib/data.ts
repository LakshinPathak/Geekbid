import { type User, type Job, type Bid, type NotificationItem, type Transaction, type Dispute, type ChatRoom, type ChatMessage } from "@/lib/utils";

// Fixed reference point to prevent SSR/client hydration mismatch
const REF = "2026-04-11T12:00:00Z";
const ref = new Date(REF).getTime();
const h = 3600000;
const m = 60000;

export const mockUsers: User[] = [
  { id: "u-client-1", _id: "u-client-1", role: "client", fullName: "Maya Sharma", email: "maya@startup.io", avatarInitial: "MS", geekScore: 0, skills: [], bio: "CTO building AI products. Previously at Google & Stripe.", isVerified: true, company: "NexaAI Labs" },
  { id: "u-client-2", _id: "u-client-2", role: "client", fullName: "Derek Olsen", email: "derek@fintech.co", avatarInitial: "DO", geekScore: 0, skills: [], bio: "Founder at FinLeap — next-gen payment infrastructure.", isVerified: true, company: "FinLeap Inc." },
  { id: "u-free-1", _id: "u-free-1", role: "freelancer", fullName: "Arjun Dev", email: "arjun@devmail.io", avatarInitial: "AD", geekScore: 712, skills: ["React", "FastAPI", "RAG Systems", "Node.js", "Kubernetes", "TypeScript", "LLM Fine-tuning"], bio: "Senior full-stack engineer focused on AI products. 8+ years.", isVerified: true, githubUsername: "arjun-dev", hourlyRateMin: 60, hourlyRateMax: 150, availability: "available" },
  { id: "u-free-2", _id: "u-free-2", role: "freelancer", fullName: "Priya Nair", email: "priya@secmail.io", avatarInitial: "PN", geekScore: 845, skills: ["Cloud Security", "Penetration Testing", "Kubernetes", "AWS", "Terraform", "CI/CD Pipelines"], bio: "Cybersecurity architect. Former AWS security team. OSCP certified.", isVerified: true, hourlyRateMin: 80, hourlyRateMax: 200, availability: "available" },
  { id: "u-free-3", _id: "u-free-3", role: "freelancer", fullName: "Leo Chen", email: "leo@web3mail.io", avatarInitial: "LC", geekScore: 456, skills: ["Smart Contracts", "DeFi Protocols", "React", "Node.js", "TypeScript"], bio: "Web3 builder. Audited 20+ smart contracts.", isVerified: false, hourlyRateMin: 50, hourlyRateMax: 120, availability: "part-time" },
  { id: "u-admin-1", _id: "u-admin-1", role: "admin", fullName: "GeekBid Admin", email: "admin@geekbid.io", avatarInitial: "GA", geekScore: 0, skills: [], bio: "Platform operations.", isVerified: true },
];

export const mockJobs: Job[] = [
  { id: "job-1", _id: "job-1", clientId: "u-client-1", title: "Build AI chatbot for customer support", description: "Production-ready chatbot with RAG pipeline, analytics dashboard, and human handoff. Docker + K8s deployment, guardrails, conversation memory with vector DB. React widget embeddable via script tag.", skillsRequired: ["RAG Systems", "FastAPI", "React", "LLM Fine-tuning"], startingPrice: 800, minimumPrice: 350, decayRatePerHour: 15, postedAt: new Date(ref - 8 * h).toISOString(), deadlineAt: new Date(ref + 36 * h).toISOString(), estimatedHours: 35, status: "open" },
  { id: "job-2", _id: "job-2", clientId: "u-client-1", title: "Kubernetes hardening + CI/CD audit", description: "Audit EKS setup, identify security risks, harden CI/CD pipelines. Severity-rated report plus immediate PRs. Pod security, network policies, RBAC review.", skillsRequired: ["Kubernetes", "Cloud Security", "CI/CD Pipelines", "AWS"], startingPrice: 1200, minimumPrice: 600, decayRatePerHour: 20, postedAt: new Date(ref - 3 * h).toISOString(), deadlineAt: new Date(ref + 48 * h).toISOString(), estimatedHours: 20, status: "open" },
  { id: "job-3", _id: "job-3", clientId: "u-client-1", title: "React Native performance optimization", description: "Improve app startup and list rendering. Profiling report, concrete fixes, benchmark before/after. FlatList virtualization, image caching.", skillsRequired: ["React Native", "TypeScript"], startingPrice: 650, minimumPrice: 300, decayRatePerHour: 12, postedAt: new Date(ref - 28 * h).toISOString(), deadlineAt: new Date(ref + 10 * h).toISOString(), estimatedHours: 18, status: "accepted", acceptedBy: "u-free-1", acceptedAt: new Date(ref - 16 * h).toISOString(), finalPrice: 458 },
  { id: "job-4", _id: "job-4", clientId: "u-client-2", title: "DeFi yield aggregator smart contract", description: "Solidity smart contract for yield aggregator across Aave, Compound and Curve. Full Hardhat test suite, gas optimization.", skillsRequired: ["Smart Contracts", "DeFi Protocols", "TypeScript"], startingPrice: 2500, minimumPrice: 1200, decayRatePerHour: 35, postedAt: new Date(ref - 5 * h).toISOString(), deadlineAt: new Date(ref + 72 * h).toISOString(), estimatedHours: 50, status: "open" },
  { id: "job-5", _id: "job-5", clientId: "u-client-2", title: "Real-time analytics dashboard with Kafka", description: "Real-time analytics consuming Kafka events. Next.js frontend with SSE. Click-stream analysis, funnel visualization.", skillsRequired: ["Kafka", "Next.js", "Node.js", "TypeScript"], startingPrice: 1800, minimumPrice: 800, decayRatePerHour: 25, postedAt: new Date(ref - 12 * h).toISOString(), deadlineAt: new Date(ref + 60 * h).toISOString(), estimatedHours: 40, status: "open" },
  { id: "job-6", _id: "job-6", clientId: "u-client-1", title: "Terraform IaC for multi-region AWS", description: "Terraform modules for multi-region AWS. VPC, EKS, RDS replicas, ElastiCache, S3, CloudFront, Route53 failover.", skillsRequired: ["Terraform", "AWS", "Kubernetes", "CI/CD Pipelines"], startingPrice: 1500, minimumPrice: 700, decayRatePerHour: 18, postedAt: new Date(ref - 1 * h).toISOString(), deadlineAt: new Date(ref + 96 * h).toISOString(), estimatedHours: 30, status: "open" },
];

export const mockBids: Bid[] = [
  { id: "bid-1", jobId: "job-1", freelancerId: "u-free-1", bidType: "counter", bidPrice: 520, message: "Can start in 2 hours. Extensive RAG experience with LangChain + Pinecone.", createdAt: new Date(ref - 60 * m).toISOString() },
  { id: "bid-2", jobId: "job-3", freelancerId: "u-free-1", bidType: "accept", bidPrice: 458, createdAt: new Date(ref - 16 * h).toISOString() },
  { id: "bid-3", jobId: "job-2", freelancerId: "u-free-2", bidType: "counter", bidPrice: 950, message: "OSCP certified with 5+ years K8s security audits.", createdAt: new Date(ref - 2 * h).toISOString() },
  { id: "bid-4", jobId: "job-4", freelancerId: "u-free-3", bidType: "counter", bidPrice: 1800, message: "Audited 20+ smart contracts on mainnet.", createdAt: new Date(ref - 4 * h).toISOString() },
  { id: "bid-5", jobId: "job-1", freelancerId: "u-free-3", bidType: "counter", bidPrice: 580, message: "Full-stack dev with AI/ML experience.", createdAt: new Date(ref - 45 * m).toISOString() },
];

export const mockNotifications: NotificationItem[] = [
  { id: "n-1", userId: "u-free-1", type: "price_drop", title: "Price Alert", body: '"AI chatbot" dropped to $680 — your target range!', createdAt: new Date(ref - 30 * m).toISOString(), isRead: false, jobId: "job-1" },
  { id: "n-2", userId: "u-client-1", type: "counter_bid", title: "Counter-bid received", body: "Arjun Dev sent $520 for AI chatbot.", createdAt: new Date(ref - 55 * m).toISOString(), isRead: false, jobId: "job-1" },
  { id: "n-3", userId: "u-free-1", type: "payment", title: "Escrow Released", body: "$412.20 released for React Native optimization.", createdAt: new Date(ref - 4 * h).toISOString(), isRead: true, jobId: "job-3" },
  { id: "n-4", userId: "u-free-1", type: "job_match", title: "New Job Match", body: '"K8s hardening" matches 3 of your skills.', createdAt: new Date(ref - 3 * h).toISOString(), isRead: false, jobId: "job-2" },
];

export const mockTransactions: Transaction[] = [
  { id: "t-1", _id: "t-1", jobId: "job-3", clientId: "u-client-1", freelancerId: "u-free-1", grossAmount: 458, platformFee: 45.8, netAmount: 412.2, escrowStatus: "released", createdAt: new Date(ref - 16 * h).toISOString(), releasedAt: new Date(ref - 4 * h).toISOString() },
  { id: "t-2", _id: "t-2", jobId: "job-1", clientId: "u-client-1", freelancerId: "u-free-1", grossAmount: 680, platformFee: 68, netAmount: 612, escrowStatus: "held", createdAt: new Date(ref - 30 * m).toISOString() },
];

export const mockDisputes: Dispute[] = [
  { id: "d-1", transactionId: "t-2", raisedBy: "u-client-1", reason: "Freelancer has not provided deployment documentation as agreed.", status: "in_review", createdAt: new Date(ref - 2 * h).toISOString() },
];

export const mockChatRooms: ChatRoom[] = [
  { id: "room-1", jobId: "job-3", participantIds: ["u-client-1", "u-free-1"], updatedAt: new Date(ref - 20 * m).toISOString() },
];

export const mockChatMessages: ChatMessage[] = [
  { id: "m-1", roomId: "room-1", senderId: "u-client-1", text: "Hey Arjun! Can you start with the startup profiling first?", createdAt: new Date(ref - 15 * h).toISOString() },
  { id: "m-2", roomId: "room-1", senderId: "u-free-1", text: "Absolutely! Running React DevTools profiler + Flipper now.", createdAt: new Date(ref - 14 * h).toISOString() },
  { id: "m-3", roomId: "room-1", senderId: "u-free-1", text: "Main bottleneck: FlatList re-renders on every state change. Images aren't cached.", createdAt: new Date(ref - 8 * h).toISOString() },
  { id: "m-4", roomId: "room-1", senderId: "u-client-1", text: "Great findings! Share the startup profiling screenshots too.", createdAt: new Date(ref - 60 * m).toISOString() },
  { id: "m-5", roomId: "room-1", senderId: "u-free-1", text: "Done. Before/after metrics uploaded. Startup 3.2s → 1.4s. FlatList now 60fps.", createdAt: new Date(ref - 20 * m).toISOString() },
];
