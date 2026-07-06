import {
  TrendingDown, Shield, BarChart3, MessageSquare, Bell, CreditCard,
  Target, CheckCircle2, Lock,
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

export interface FaqItem {
  question: string;
  answer: string;
}

/* ─── Data (moved verbatim from the original page.tsx) ───────────── */
export const FEATURES: Feature[] = [
  {
    icon: TrendingDown,
    title: "Reverse Price Decay",
    desc: "Prices start high and automatically decrease over time using our algorithmic pricing engine. The market finds the true rate — no negotiation needed.",
    iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400", iconBorder: "border-emerald-500/20",
  },
  {
    icon: Shield,
    title: "Escrow Protection",
    desc: "Every payment is held in secure escrow until delivery is verified. 10% platform fee, full dispute resolution, and transparent fund release.",
    iconBg: "bg-blue-500/10", iconColor: "text-blue-400", iconBorder: "border-blue-500/20",
  },
  {
    icon: BarChart3,
    title: "GeekScore™ Rating",
    desc: "Our proprietary reputation system scores freelancers across delivery, quality, and reliability. Make confident hiring decisions backed by data.",
    iconBg: "bg-[rgba(201,168,76,0.12)]", iconColor: "text-[#c9a84c]", iconBorder: "border-[rgba(201,168,76,0.28)]",
  },
  {
    icon: MessageSquare,
    title: "Real-Time Chat",
    desc: "Built-in messaging with per-job chat rooms. Discuss scope, share updates, and collaborate — all inside the platform with Socket.IO live delivery.",
    iconBg: "bg-purple-500/10", iconColor: "text-purple-400", iconBorder: "border-purple-500/20",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    desc: "Instant alerts for price drops, counter-bids, job matches, and payment events. Never miss an opportunity with targeted, actionable notifications.",
    iconBg: "bg-amber-500/10", iconColor: "text-amber-400", iconBorder: "border-amber-500/20",
  },
  {
    icon: CreditCard,
    title: "Razorpay Payments",
    desc: "Integrated payment processing with Razorpay. Create orders, verify signatures, and manage the full escrow lifecycle from a single dashboard.",
    iconBg: "bg-cyan-500/10", iconColor: "text-cyan-400", iconBorder: "border-cyan-500/20",
  },
];

export const STEPS: Step[] = [
  {
    num: "01",
    title: "Post Your Project",
    desc: "Define scope, set a starting price and floor, choose the decay rate. Your job goes live instantly.",
    icon: Target,
    accent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    num: "02",
    title: "Watch Prices Drop",
    desc: "Our engine decreases the price every hour. Freelancers monitor and bid when the price hits their sweet spot.",
    icon: TrendingDown,
    accent: "bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border-[rgba(201,168,76,0.22)]",
  },
  {
    num: "03",
    title: "Review & Accept",
    desc: "Compare GeekScores, review counter-bids, and chat with candidates. Accept the best match with one click.",
    icon: CheckCircle2,
    accent: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  {
    num: "04",
    title: "Escrow & Deliver",
    desc: "Payment locks in escrow automatically. Release funds when the work ships. Dispute resolution if needed.",
    icon: Lock,
    accent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
];

export const STATS: Stat[] = [
  { value: 2400, suffix: "+", label: "Active Freelancers", prefix: "" },
  { value: 1.2, suffix: "M", label: "Total Volume", prefix: "$" },
  { value: 94, suffix: "%", label: "Client Satisfaction", prefix: "" },
  { value: 4, suffix: "hr", label: "Avg Match Time", prefix: "<" },
];

export const COMPARISONS: Comparison[] = [
  { feature: "Price Discovery", geekbid: "Automatic via decay algorithm", traditional: "Manual back-and-forth negotiation" },
  { feature: "Time to Hire", geekbid: "Hours, not weeks", traditional: "2-6 weeks average" },
  { feature: "Pricing", geekbid: "Market-driven, transparent", traditional: "Opaque, inflated rates" },
  { feature: "Payment Security", geekbid: "Built-in escrow + disputes", traditional: "Invoice and hope" },
  { feature: "Reputation", geekbid: "GeekScore™ data-driven", traditional: "Subjective reviews" },
  { feature: "Communication", geekbid: "Integrated real-time chat", traditional: "Scattered across email/Slack" },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "The escrow and dispute resolution gave us confidence to try GeekBid for our entire engineering pipeline. We've saved 40% on average.",
    name: "Derek Olsen",
    title: "VP Engineering",
    company: "FinScale",
    avatar: "DO",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    avatarGrad: "from-blue-500/40 to-blue-900/60",
    ring: "shadow-[0_0_0_2px_rgba(96,165,250,0.4)]",
    accent: "text-blue-400",
    tag: "Client",
    tagBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    saved: "Saved 40%",
    rating: 5,
  },
  {
    quote: "I switched from Upwork after my first job on GeekBid. The price decay means I actually get fair market rates instead of racing to the bottom.",
    name: "Priya Sharma",
    title: "Senior Full-Stack Developer",
    company: "Independent",
    avatar: "PS",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    avatarGrad: "from-[#c9a84c]/40 to-[#8a6e2f]/60",
    ring: "shadow-[0_0_0_2px_rgba(201,168,76,0.5)]",
    accent: "text-[#c9a84c]",
    tag: "Freelancer",
    tagBg: "bg-[rgba(201,168,76,0.10)] border-[rgba(201,168,76,0.28)] text-[#c9a84c]",
    saved: "Fair market rates",
    rating: 5,
  },
  {
    quote: "Posted a React Native project at $3,000. Three qualified engineers bid within 6 hours. Hired at $1,800. That's the power of reverse auctions.",
    name: "Marcus Chen",
    title: "CTO",
    company: "LaunchPad AI",
    avatar: "MC",
    photo: "https://randomuser.me/api/portraits/men/75.jpg",
    avatarGrad: "from-emerald-500/40 to-emerald-900/60",
    ring: "shadow-[0_0_0_2px_rgba(52,211,153,0.4)]",
    accent: "text-emerald-400",
    tag: "Client",
    tagBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
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

/* ─── NEW: FAQ content — no FAQ existed anywhere in the app before
   this redesign. 5 of these 6 answers are pulled directly from copy
   that already appears elsewhere on this page (price-decay formula,
   escrow/GeekScore feature text, the "10% fee / no upfront fees"
   trust badges, the "<4hr" avg-match-time stat). The 6th entry below
   is flagged as the one speculative answer — replace with real copy
   before shipping if this doesn't reflect actual policy. ─────────── */
export const FAQS: FaqItem[] = [
  {
    question: "How does the reverse price-decay auction work?",
    answer:
      "Every job starts at a price you set and automatically decreases over time: currentPrice = max(startPrice − decayRate × hours, floor). Freelancers watch the price drop and bid (or accept) whenever it hits their sweet spot — the market finds the true rate without back-and-forth negotiation.",
  },
  {
    question: "Is my payment protected?",
    answer:
      "Yes. Every payment is held in secure escrow until delivery is verified. GeekBid charges a 10% platform fee, and full dispute resolution is built in if something goes wrong — funds are only released when you approve the work.",
  },
  {
    question: "What is GeekScore™?",
    answer:
      "GeekScore™ is our proprietary reputation system. It scores freelancers across delivery, quality, and reliability so you can make confident hiring decisions backed by data instead of guesswork.",
  },
  {
    question: "What does GeekBid cost?",
    answer:
      "Start free — 3 job posts and 10 bids a month with a 10% success fee, taken only when a job completes and escrow releases. Plus ($19/mo) raises limits to 50 posts / 100 bids and cuts the fee to 7%; Premium ($79/mo) goes to 500 / 500, team seats, API access, and a 5% fee. If nothing gets delivered, you pay nothing.",
  },
  {
    question: "Can I upgrade, downgrade, or cancel my plan anytime?",
    answer:
      "Yes. Upgrades take effect right away, downgrades and cancellations apply at the end of your current billing period, and your jobs, bids, and data are never deleted when you move to a lower tier — only new activity beyond the new plan's limits is affected.",
  },
  {
    question: "How fast can I hire someone?",
    answer:
      "Most jobs get matched in under 4 hours on average. Because pricing is transparent and automatic, freelancers can act on a listing the moment it fits their rate — no waiting on proposals to trickle in.",
  },
  {
    question: "Can I use GeekBid for ongoing or larger projects, not just one-off gigs?",
    answer:
      // NOTE: this is the one speculative entry, not directly grounded in
      // existing on-page copy — confirm/replace before shipping.
      "GeekBid works well for both quick one-off tasks and larger, multi-week engagements — you can adjust the starting price, floor, and decay rate to match the scope, and use milestone-based escrow releases for bigger projects.",
  },
];
