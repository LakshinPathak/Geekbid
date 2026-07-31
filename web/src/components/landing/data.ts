import {
  TrendingDown, Shield, BarChart3, MessageSquare, Bell, CreditCard,
  Target, CheckCircle2, Lock,
  Palette, Code2, PenLine, Megaphone, Clapperboard, BrainCircuit,
  type LucideIcon,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */
export interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
}

export interface Step {
  num: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
}

export interface Stat {
  value: number;
  suffix: string;
  label: string;
  prefix: string;
}

export interface Comparison {
  feature: string;
  geekbid: string;
  traditional: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  photo: string;
  avatarGrad: string;
  ring: string;
  accent: string;
  tag: string;
  tagBg: string;
  saved: string;
  rating: number;
}

export interface JobRow {
  title: string;
  price: string;
  decay: string;
  skills: string[];
  time: string;
  bids: number;
}

export interface Auction {
  id: number;
  title: string;
  category: string;
  start: number;
  floor: number;
  bidders: number;
  secondsLeft: number;
}

export interface Category {
  name: string;
  count: number;
  avgDrop: number;
  timeToHire: string;
  icon: LucideIcon;
  /* 7 representative weekly price-index points (illustrative, not live
     data — same treatment as the rest of this category's numbers) used
     to draw the small sparkline next to "avg price drop." Normalized
     0-100; the overall downward slope is the point, exact values are
     not meaningful. */
  trend: number[];
}

export interface Faq {
  q: string;
  a: string;
}

export interface CaseStep {
  label: string;
  time: string;
  elapsed: string;
  detail: string;
}

export interface CaseStudy {
  title: string;
  category: string;
  ceiling: number;
  accepted: number;
  steps: CaseStep[];
}

/* ─── Data (moved verbatim from the original page.tsx) ───────────── */
export const FEATURES: Feature[] = [
  {
    icon: TrendingDown,
    title: "Reverse Price Decay",
    desc: "Prices start high and automatically decrease over time using our algorithmic pricing engine. The market finds the true rate — no negotiation needed.",
    iconBg: "bg-[#16a34a]/10", iconColor: "text-[#16a34a]", iconBorder: "border-[#16a34a]/20",
  },
  {
    icon: Shield,
    title: "Escrow Protection",
    desc: "Every payment is held in secure escrow until delivery is verified. 10% platform fee, full dispute resolution, and transparent fund release.",
    iconBg: "bg-[#7c3aed]/10", iconColor: "text-[#7c3aed]", iconBorder: "border-[#7c3aed]/20",
  },
  {
    icon: BarChart3,
    title: "GeekScore™ Rating",
    desc: "Our proprietary reputation system scores freelancers across delivery, quality, and reliability. Make confident hiring decisions backed by data.",
    iconBg: "bg-[rgba(91,33,182,0.12)]", iconColor: "text-[#5b21b6]", iconBorder: "border-[rgba(91,33,182,0.28)]",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Chat",
    desc: "Built-in messaging with per-job chat rooms. Discuss scope, share updates, and collaborate — all inside the platform with Socket.IO live delivery.",
    iconBg: "bg-[#5b21b6]/10", iconColor: "text-[#5b21b6]", iconBorder: "border-[#5b21b6]/20",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    desc: "Instant alerts for price drops, counter-bids, job matches, and payment events. Never miss an opportunity with targeted, actionable notifications.",
    iconBg: "bg-[#b4791e]/10", iconColor: "text-[#b4791e]", iconBorder: "border-[#b4791e]/20",
  },
  {
    icon: CreditCard,
    title: "Razorpay Payments",
    desc: "Integrated payment processing with Razorpay. Create orders, verify signatures, and manage the full escrow lifecycle from a single dashboard.",
    iconBg: "bg-[#96543f]/10", iconColor: "text-[#96543f]", iconBorder: "border-[#96543f]/20",
  },
];

export const STEPS: Step[] = [
  {
    num: "01",
    title: "Post Your Project",
    desc: "Define scope, set a starting price and floor, choose the decay rate. Your job goes live instantly.",
    icon: Target,
    accent: "bg-[#16a34a]/15 text-[#16a34a] border-[#16a34a]/25",
  },
  {
    num: "02",
    title: "Watch Prices Drop",
    desc: "Our engine decreases the price every hour. Freelancers monitor and bid when the price hits their sweet spot.",
    icon: TrendingDown,
    accent: "bg-[rgba(91,33,182,0.16)] text-[#5b21b6] border-[rgba(91,33,182,0.28)]",
  },
  {
    num: "03",
    title: "Review & Accept",
    desc: "Compare GeekScores, review counter-bids, and chat with candidates. Accept the best match with one click.",
    icon: CheckCircle2,
    accent: "bg-[#b4791e]/15 text-[#b4791e] border-[#b4791e]/25",
  },
  {
    num: "04",
    title: "Escrow & Deliver",
    desc: "Payment locks in escrow automatically. Release funds when the work ships. Dispute resolution if needed.",
    icon: Lock,
    accent: "bg-[#5b21b6]/15 text-[#5b21b6] border-[#5b21b6]/25",
  },
];

export const STATS: Stat[] = [
  { value: 2400, suffix: "+", label: "Active Freelancers", prefix: "" },
  { value: 1.2, suffix: "M", label: "Total Volume", prefix: "$" },
  { value: 94, suffix: "%", label: "Client Satisfaction", prefix: "" },
  { value: 4, suffix: "hr", label: "Avg Match Time", prefix: "<" },
];

/* Trimmed to the two rows that aren't already made elsewhere on the
   page — Price Discovery/Pricing echo the mechanic section, Payment
   Security echoes the escrow section; repeating them here was the
   same claim a third time. */
export const COMPARISONS: Comparison[] = [
  { feature: "Time to Hire", geekbid: "Hours, not weeks", traditional: "2-6 weeks average" },
  { feature: "Price Discovery", geekbid: "Live reverse auction — price decays to true market rate", traditional: "Manual quotes and back-and-forth negotiation" },
  { feature: "Reputation", geekbid: "GeekScore™ (data-driven reputation score)", traditional: "Subjective reviews" },
  { feature: "Payment Security", geekbid: "Escrow-protected, released on your approval", traditional: "Upfront or invoice-based, no built-in protection" },
  { feature: "Platform Fees", geekbid: "As low as 5% on paid plans", traditional: "15-20%+ commission" },
  { feature: "Bid Transparency", geekbid: "See live bids, GeekScores, and win rates", traditional: "Blind proposals with little signal" },
  { feature: "Dispute Resolution", geekbid: "Built-in, escrow-backed process", traditional: "Ad-hoc, often unresolved" },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "The escrow and dispute resolution gave us confidence to try GeekBid for our entire engineering pipeline. We've saved 40% on average.",
    name: "Derek Olsen",
    title: "VP Engineering",
    company: "FinScale",
    avatar: "DO",
    photo: "",
    avatarGrad: "from-[#5b21b6]/40 to-[#5b21b6]/60",
    ring: "shadow-[0_0_0_2px_rgba(61,51,115,0.4)]",
    accent: "text-[#5b21b6]",
    tag: "Client",
    tagBg: "bg-[#5b21b6]/10 border-[#5b21b6]/20 text-[#5b21b6]",
    saved: "Saved 40%",
    rating: 5,
  },
  {
    quote: "I switched from Upwork after my first job on GeekBid. The price decay means I actually get fair market rates instead of racing to the bottom.",
    name: "Emma Johnson",
    title: "Senior Full-Stack Developer",
    company: "Independent",
    avatar: "EJ",
    photo: "",
    avatarGrad: "from-[#5b21b6]/40 to-[#5b21b6]/60",
    ring: "shadow-[0_0_0_2px_rgba(91,33,182,0.5)]",
    accent: "text-[#5b21b6]",
    tag: "Freelancer",
    tagBg: "bg-[rgba(91,33,182,0.10)] border-[rgba(91,33,182,0.28)] text-[#5b21b6]",
    saved: "Fair market rates",
    rating: 5,
  },
  {
    quote: "Posted a React Native project at $3,000. Three qualified engineers bid within 6 hours. Hired at $1,800. That's the power of reverse auctions.",
    name: "Marcus Chen",
    title: "CTO",
    company: "LaunchPad AI",
    avatar: "MC",
    photo: "",
    avatarGrad: "from-[#16a34a]/40 to-[#16a34a]/60",
    ring: "shadow-[0_0_0_2px_rgba(77,114,69,0.4)]",
    accent: "text-[#16a34a]",
    tag: "Client",
    tagBg: "bg-[#16a34a]/10 border-[#16a34a]/20 text-[#16a34a]",
    saved: "Hired at $1,800",
    rating: 5,
  },
];

export const JOB_ROWS: JobRow[] = [
  { title: "AI Chatbot with RAG Pipeline", price: "$2,450", decay: "$18/hr", skills: ["React", "FastAPI", "LLM"], time: "14h 22m", bids: 5 },
  { title: "Kubernetes Cluster Hardening", price: "$1,100", decay: "$20/hr", skills: ["K8s", "AWS", "Security"], time: "8h 45m", bids: 3 },
  { title: "DeFi Yield Aggregator Audit", price: "$2,200", decay: "$35/hr", skills: ["Solidity", "Web3"], time: "5h 12m", bids: 8 },
  { title: "Real-Time Analytics Dashboard", price: "$1,650", decay: "$22/hr", skills: ["Kafka", "React", "D3.js"], time: "12h 08m", bids: 4 },
];

export const AUCTIONS: Auction[] = [
  { id: 1, title: "Landing page for fintech app", category: "Design", start: 1400, floor: 620, bidders: 3, secondsLeft: 5400 },
  { id: 2, title: "React dashboard rebuild", category: "Development", start: 2800, floor: 1450, bidders: 5, secondsLeft: 9200 },
  { id: 3, title: "20 blog posts on SaaS pricing", category: "Writing", start: 900, floor: 380, bidders: 7, secondsLeft: 3100 },
  { id: 4, title: "Launch campaign for D2C skincare brand", category: "Marketing", start: 1800, floor: 820, bidders: 4, secondsLeft: 7300 },
  { id: 5, title: "60-second explainer video, motion graphics", category: "Video & Animation", start: 2100, floor: 950, bidders: 2, secondsLeft: 11200 },
  { id: 6, title: "Fine-tune a support-ticket classifier", category: "Data & AI", start: 3400, floor: 1600, bidders: 6, secondsLeft: 15800 },
];

export const CATEGORIES: Category[] = [
  { name: "Design", count: 214, avgDrop: 46, timeToHire: "5h 40m", icon: Palette, trend: [58, 62, 54, 60, 50, 44, 38] },
  { name: "Development", count: 381, avgDrop: 52, timeToHire: "9h 10m", icon: Code2, trend: [70, 66, 68, 58, 52, 48, 40] },
  { name: "Writing", count: 156, avgDrop: 58, timeToHire: "3h 20m", icon: PenLine, trend: [64, 60, 50, 46, 40, 34, 28] },
  { name: "Marketing", count: 129, avgDrop: 44, timeToHire: "6h 50m", icon: Megaphone, trend: [55, 58, 52, 50, 46, 42, 40] },
  { name: "Video & Animation", count: 97, avgDrop: 39, timeToHire: "11h 30m", icon: Clapperboard, trend: [52, 50, 48, 50, 44, 42, 41] },
  { name: "Data & AI", count: 143, avgDrop: 35, timeToHire: "14h 05m", icon: BrainCircuit, trend: [48, 50, 46, 44, 40, 38, 39] },
];

/* Illustrative composite case, not a real customer — same treatment as
   AUCTIONS/TESTIMONIALS above (representative, not live data). */
export const CASE_STUDY: CaseStudy = {
  title: "Payment Fraud-Detection Service",
  category: "Development",
  ceiling: 3200,
  accepted: 1480,
  steps: [
    { label: "Posted", time: "Day 1 · 9:02am", elapsed: "+0m", detail: "$3,200 ceiling, 48h decay window" },
    { label: "First bid", time: "Day 1 · 11:40am", elapsed: "+2h 38m", detail: "marcus_k bids $2,650" },
    { label: "Price milestone", time: "Day 1 · 6:15pm", elapsed: "+9h 13m", detail: "Price crosses $2,000 — 4 bidders now watching" },
    { label: "Client question", time: "Day 2 · 8:50am", elapsed: "+23h 48m", detail: "Client asks about SOC 2 compliance in chat" },
    { label: "Accepted", time: "Day 2 · 3:20pm", elapsed: "+30h 18m", detail: "Hired priya_ml at $1,480" },
  ],
};

export const FAQS: Faq[] = [
  { q: "Can I set my own floor price and decay rate?", a: "Yes. When you post a job you choose the starting ceiling, the floor it will never drop below, and how fast it decays per hour — we just suggest defaults based on your category." },
  { q: "Is posting a job really free?", a: "Yes. Posting, receiving bids, and messaging freelancers costs nothing. We only charge freelancers a success fee when they win a job." },
  { q: "What happens if I never find a price I like?", a: "You are never obligated to hire. If no bid meets your bar before time runs out, you can relist the job or close it with no cost." },
  { q: "How do you keep quality from racing to the bottom with price?", a: "Every bid shows the freelancer's rating, past work, and win rate alongside the price, so you're never choosing blind on price alone." },
  { q: "Can freelancers see each other's bids?", a: "Freelancers see the current lowest price so they know what to beat, but never who placed it or their profile details." },
  { q: "What categories of work can I post?", a: "Design, development, writing, marketing, video and animation, and data and AI work today, with more categories opening regularly." },
];

