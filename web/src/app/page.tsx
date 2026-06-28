"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
 Zap, ArrowRight, TrendingDown, Shield, Users, Code, Clock,
 DollarSign, Star, ChevronRight, Sparkles, BarChart3, Lock,
 Globe, CheckCircle2, ArrowUpRight, Target, Award, Play,
 MessageSquare, Bell, CreditCard, Eye, Gauge, Timer,
 ArrowDown, ChevronDown, Minus, Plus, X, Check,
} from "lucide-react";

/* ─── Animated counter hook ──────────────────────────────── */
function useCountUp(end: number, duration = 2000, start = 0, enabled = true) {
 const [value, setValue] = useState(start);
 useEffect(() => {
 if (!enabled) return;
 let raf: number;
 const t0 = performance.now();
 const tick = (now: number) => {
 const p = Math.min((now - t0) / duration, 1);
 const ease = 1 - Math.pow(1 - p, 3);
 setValue(Math.round(start + (end - start) * ease));
 if (p < 1) raf = requestAnimationFrame(tick);
 };
 raf = requestAnimationFrame(tick);
 return () => cancelAnimationFrame(raf);
 }, [end, duration, start, enabled]);
 return value;
}

/* ─── Intersection observer hook ─────────────────────────── */
function useInView(threshold = 0.15) {
 const ref = useRef<HTMLDivElement>(null);
 const [inView, setInView] = useState(false);
 useEffect(() => {
 const el = ref.current;
 if (!el) return;
 const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
 obs.observe(el);
 return () => obs.disconnect();
 }, [threshold]);
 return { ref, inView };
}

/* ─── Live price decay demo ──────────────────────────────── */
function PriceDecayDemo() {
 const [price, setPrice] = useState(2400);
 const [elapsed, setElapsed] = useState(0);
 const MIN = 800;
 const DECAY = 25;

 useEffect(() => {
 const id = setInterval(() => {
 setElapsed(prev => {
 const next = prev + 1;
 const newPrice = Math.max(2400 - DECAY * next, MIN);
 setPrice(newPrice);
 if (newPrice <= MIN) { clearInterval(id); return prev; }
 return next;
 });
 }, 120);
 return () => clearInterval(id);
 }, []);

 const pct = ((2400 - price) / (2400 - MIN)) * 100;

 return (
 <div className="card">
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(201,168,76,0.22)]">
 <div>
 <p className="text-[9px] font-sans uppercase tracking-[0.12em] text-[#a8997e]">Live Price Decay</p>
 <p className="text-xs text-[#a8997e] mt-0.5 font-sans">AI Chatbot Development</p>
 </div>
 <span className="text-[9px] font-bold tracking-[0.09em] uppercase font-sans px-2 py-1 rounded-[2px] bg-[#c9a84c] text-[#050810]">LIVE</span>
 </div>

 {/* Price */}
 <div className="px-4 py-4">
 <div className="flex items-baseline gap-2 mb-3">
 <span className="text-4xl sm:text-5xl font-serif font-normal text-[#f0e8d4] tabular-nums">
 ${price.toLocaleString()}
 </span>
 <span className="text-sm text-[#c9a84c] font-sans">↘ -${DECAY}/hr</span>
 </div>

 {/* Progress bar: flat 2px track per Royal spec */}
 <div className="h-0.5 bg-[#1a1f30] mb-1.5">
 <div
 className="h-0.5 bg-[#c9a84c] transition-all duration-150 ease-linear"
 style={{ width: `${100 - pct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] font-sans text-[#a8997e]">
 <span>Floor: ${MIN.toLocaleString()}</span>
 <span>Start: $2,400</span>
 </div>

 {/* Mini stat cards */}
 <div className="grid grid-cols-3 gap-2 mt-3">
 {[
 { label: "Bids", value: "7" },
 { label: "Watching", value: "23" },
 { label: "Left", value: `${Math.max(64 - elapsed, 0)}h` },
 ].map(s => (
 <div key={s.label} className="rounded-[3px] border border-[rgba(201,168,76,0.22)] py-2 text-center bg-[#050810]">
 <p className="text-sm font-serif font-normal text-[#f0e8d4]">{s.value}</p>
 <p className="text-[9px] font-sans uppercase tracking-[0.09em] text-[#a8997e] mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>
 </div>

 {/* Accept button */}
 <div className="px-4 pb-4 border-t border-[rgba(201,168,76,0.22)] pt-3">
 <button className="btn-primary w-full justify-center text-[11px] tracking-[0.07em] uppercase py-2.5 rounded-[3px]">
 Accept at ${price.toLocaleString()}
 </button>
 </div>
 </div>
 );
}

/* ─── Data ───────────────────────────────────────────────── */
const FEATURES = [
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

const STEPS = [
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

const STATS = [
 { value: 2400, suffix: "+", label: "Active Freelancers", prefix: "" },
 { value: 1.2, suffix: "M", label: "Total Volume", prefix: "$" },
 { value: 94, suffix: "%", label: "Client Satisfaction", prefix: "" },
 { value: 4, suffix: "hr", label: "Avg Match Time", prefix: "<" },
];

const COMPARISONS = [
 { feature: "Price Discovery", geekbid: "Automatic via decay algorithm", traditional: "Manual back-and-forth negotiation" },
 { feature: "Time to Hire", geekbid: "Hours, not weeks", traditional: "2-6 weeks average" },
 { feature: "Pricing", geekbid: "Market-driven, transparent", traditional: "Opaque, inflated rates" },
 { feature: "Payment Security", geekbid: "Built-in escrow + disputes", traditional: "Invoice and hope" },
 { feature: "Reputation", geekbid: "GeekScore™ data-driven", traditional: "Subjective reviews" },
 { feature: "Communication", geekbid: "Integrated real-time chat", traditional: "Scattered across email/Slack" },
];

const TESTIMONIALS = [
 {
 quote: "The escrow and dispute resolution gave us confidence to try GeekBid for our entire engineering pipeline. We've saved 40% on average.",
 name: "Derek Olsen",
 title: "VP Engineering",
 company: "FinScale",
 avatar: "DO",
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
 avatarGrad: "from-emerald-500/40 to-emerald-900/60",
 ring: "shadow-[0_0_0_2px_rgba(52,211,153,0.4)]",
 accent: "text-emerald-400",
 tag: "Client",
 tagBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
 saved: "Hired at $1,800",
 rating: 5,
 },
];

const JOB_ROWS = [
 { title: "AI Chatbot with RAG Pipeline", price: "$2,450", decay: "$18/hr", skills: ["React", "FastAPI", "LLM"], time: "14h 22m", bids: 5 },
 { title: "Kubernetes Cluster Hardening", price: "$1,100", decay: "$20/hr", skills: ["K8s", "AWS", "Security"], time: "8h 45m", bids: 3 },
 { title: "DeFi Yield Aggregator Audit", price: "$2,200", decay: "$35/hr", skills: ["Solidity", "Web3"], time: "5h 12m", bids: 8 },
 { title: "Real-Time Analytics Dashboard", price: "$1,650", decay: "$22/hr", skills: ["Kafka", "React", "D3.js"], time: "12h 08m", bids: 4 },
];

/* ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
 const { currentUser, mounted } = useApp();
 const router = useRouter();
 const statsSection = useInView(0.1);
 const testimonialsSection = useInView(0.1);
 const stat0 = useCountUp(STATS[0].value, 2000, 0, statsSection.inView);
 const stat1 = useCountUp(12, 2000, 0, statsSection.inView);
 const stat2 = useCountUp(STATS[2].value, 2000, 0, statsSection.inView);
 const stat3 = useCountUp(STATS[3].value, 1500, 0, statsSection.inView);
 const statValues = [stat0, stat1, stat2, stat3];

 useEffect(() => {
 if (mounted && currentUser) router.replace("/feed");
 }, [mounted, currentUser, router]);

 if (!mounted || currentUser) return null;

 return (
 <div className="bg-[#080b14] text-[#f0e8d4] overflow-x-hidden">
 {/* ═══ NAVBAR ═══ */}
 <nav className="sticky top-0 z-50 w-full border-b border-[rgba(201,168,76,0.22)] bg-[#050810]">
 <div className="flex h-14 items-center justify-between px-8 max-w-7xl mx-auto">
 <div className="flex items-center gap-2.5">
 <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-[#c9a84c] text-[#050810] text-xs font-black font-sans">G</div>
 <span className="text-sm font-bold tracking-[0.03em] font-sans text-[#f0e8d4]">GeekBid</span>
 </div>
 <div className="hidden md:flex items-center gap-6 text-[11px] tracking-[0.09em] uppercase text-[#a8997e] font-sans">
 <a href="#how-it-works" className="hover:text-[#c9a84c] transition-colors duration-200">How it Works</a>
 <a href="#features" className="hover:text-[#c9a84c] transition-colors duration-200">Features</a>
 <a href="#compare" className="hover:text-[#c9a84c] transition-colors duration-200">Compare</a>
 <a href="#testimonials" className="hover:text-[#c9a84c] transition-colors duration-200">Testimonials</a>
 </div>
 <div className="flex items-center gap-3">
 <Link href="/login">
 <button className="hidden sm:block text-[11px] tracking-[0.06em] uppercase text-[#a8997e] hover:text-[#a8997e] transition-colors font-sans">Sign In</button>
 </Link>
 <Link href="/login?tab=register&role=client">
 <button className="flex items-center gap-2 btn-primary text-[11px] tracking-[0.07em] uppercase px-4 py-2 rounded-[3px]">
 Get Started <ArrowUpRight className="h-3.5 w-3.5" />
 </button>
 </Link>
 </div>
 </div>
 </nav>

 {/* ═══ HERO ═══ */}
 <section className="relative min-h-[85vh] flex items-center justify-center px-6 lg:px-8 pt-12 pb-12">
 {/* Ambient glows */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#c9a84c]/[0.06] rounded-full blur-[160px] pointer-events-none" />
 <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.04] rounded-full blur-[130px] pointer-events-none" />
 <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/[0.04] rounded-full blur-[110px] pointer-events-none" />
 <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.3)] to-transparent pointer-events-none" />

 <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
 {/* Left: Copy */}
 <div className="text-center lg:text-left animate-fade-in-up">
 {/* Badge */}
 <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#c9a84c] border border-[rgba(201,168,76,0.22)] px-3 py-1.5 rounded-[2px] mb-6 font-sans cursor-default">
 <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse inline-block" />
 Live · Reverse Auction Platform
 </div>

 <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-normal leading-[1.18] mb-5">
 Hire engineers<br />
 <em className="text-[#c9a84c] not-italic">at the right price</em>
 </h1>

 <p className="text-lg sm:text-xl text-[#a8997e] leading-[1.75] mb-6 max-w-lg font-sans mx-auto lg:mx-0">
 The world&apos;s first reverse-auction marketplace for tech talent. Post a job, watch prices automatically decay, and hire when it hits your sweet spot.
 </p>

 {/* CTAs */}
 <div className="flex flex-col sm:flex-row gap-3 mt-0 justify-center lg:justify-start">
 <Link href="/login?tab=register&role=client">
 <button className="group btn-primary text-base px-10 py-4 rounded-[3px]">
 Start Hiring Free
 <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
 </button>
 </Link>
 <Link href="/login?tab=register&role=freelancer">
 <button className="group btn-ghost text-base px-10 py-4 rounded-[3px]">
 <Code className="h-4 w-4" /> Join as Freelancer
 </button>
 </Link>
 </div>

 {/* Trust badges */}
 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-6">
  {[
   { icon: "🔒", text: "Escrow Protected" },
   { icon: "⚡", text: "< 4hr Match Time" },
   { icon: "🛡️", text: "Dispute Resolution" },
   { icon: "✨", text: "No Upfront Fees" },
  ].map(b => (
   <div key={b.text} className="flex items-center gap-1.5 text-sm text-[#a8997e]">
    <span>{b.icon}</span>
    <span>{b.text}</span>
   </div>
  ))}
 </div>
 </div>

 {/* Right: Live Price Decay Demo */}
 <div className="animate-fade-in-up flex justify-center" style={{ animationDelay: "0.12s" }}>
 <div className="w-full max-w-sm">
 <PriceDecayDemo />
 </div>
 </div>
 </div>


 </section>

 {/* ═══ SOCIAL PROOF STRIP ═══ */}
 <div className="border-y border-[rgba(201,168,76,0.15)] bg-[#050810] py-3 overflow-hidden">
 <div className="flex items-center gap-12 animate-marquee whitespace-nowrap" style={{ animation: "marquee 28s linear infinite" }}>
 {[
 { icon: "⚡", text: "AI Chatbot · $2,450 → accepted in 6h" },
 { icon: "🔒", text: "Kubernetes Hardening · $1,100 · escrow released" },
 { icon: "🔥", text: "DeFi Audit · $2,200 · 8 bids competing" },
 { icon: "✅", text: "React Dashboard · $1,650 · matched in 3h 20m" },
 { icon: "⚡", text: "Mobile App · $3,000 · hired at $1,800" },
 { icon: "🛡️", text: "Cloud Infra · $900 · dispute resolved in 24h" },
 { icon: "⚡", text: "AI Chatbot · $2,450 → accepted in 6h" },
 { icon: "🔒", text: "Kubernetes Hardening · $1,100 · escrow released" },
 { icon: "🔥", text: "DeFi Audit · $2,200 · 8 bids competing" },
 { icon: "✅", text: "React Dashboard · $1,650 · matched in 3h 20m" },
 { icon: "⚡", text: "Mobile App · $3,000 · hired at $1,800" },
 { icon: "🛡️", text: "Cloud Infra · $900 · dispute resolved in 24h" },
 ].map((item, i) => (
 <span key={i} className="inline-flex items-center gap-2 text-[11px] text-[#a8997e] font-sans shrink-0">
 <span>{item.icon}</span>
 <span>{item.text}</span>
 {i % 6 !== 5 && <span className="text-[rgba(201,168,76,0.3)] ml-4">·</span>}
 </span>
 ))}
 </div>
 <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
 </div>

 {/* ═══ PRODUCT SHOWCASE ═══ */}
 <section className="relative py-16 sm:py-24 bg-[#050810]">
 <div className="mx-auto max-w-6xl px-5">
 <div className="text-center mb-12">
 <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">Platform Preview</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
 Your auction feed.<br /><em className="text-[#c9a84c] not-italic">Reimagined.</em>
 </h2>
 </div>

 {/* Browser mockup */}
 <div className="relative">
 <div className="absolute -inset-1 /[0.06] rounded-[6px]" />
 <div className="relative rounded-[6px] border border-[rgba(201,168,76,0.15)] bg-[#050810] overflow-hidden ">
 {/* Chrome bar */}
 <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[rgba(201,168,76,0.15)]">
 <div className="flex gap-1.5">
 <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
 <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
 <div className="h-3 w-3 rounded-full bg-[#28C840]" />
 </div>
 <div className="flex-1 flex justify-center">
 <div className="bg-[#0d1120]/[0.04] border border-[rgba(201,168,76,0.15)] rounded-[3px] px-4 py-1 text-xs text-[#a8997e] font-mono">geekbid.com/feed</div>
 </div>
 </div>

 {/* Dashboard content */}
 <div className="p-5 sm:p-8">
 {/* Stats row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
 {[
 { label: "Open Jobs", value: "12", sub: "+3 today", color: "text-emerald-400" },
 { label: "Total Value", value: "$24.8K", sub: "Across all jobs", color: "text-[#f0e8d4]" },
 { label: "Avg Decay", value: "$23/hr", sub: "Price reduction", color: "text-[#c9a84c]" },
 { label: "Active Bids", value: "34", sub: "7 new today", color: "text-amber-400" },
 ].map(s => (
 <div key={s.label} className="rounded-[6px] bg-[#111625] border border-[rgba(201,168,76,0.15)] p-4">
 <p className="text-[11px] text-[#a8997e] uppercase tracking-wider mb-1">{s.label}</p>
 <p className={`text-xl sm:text-2xl font-black ${s.color}`}>{s.value}</p>
 <p className="text-[11px] text-[#a8997e] mt-0.5">{s.sub}</p>
 </div>
 ))}
 </div>

 {/* Job rows */}
 <div className="rounded-[6px] border border-[rgba(201,168,76,0.15)] overflow-hidden">
 <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-[rgba(201,168,76,0.15)] text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">
 <span>Project</span>
 <span className="hidden sm:flex items-center justify-end">Bids</span>
 <span className="text-right">Time Left</span>
 <span className="text-right">Price</span>
 </div>
 {JOB_ROWS.map((job, i) => (
 <div key={job.title} className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 ${i < JOB_ROWS.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-[#111625]/[0.02] transition-colors`}>
 <div className="flex items-center gap-3 min-w-0">
 <div className="h-8 w-8 rounded-[3px] bg-[rgba(201,168,76,0.08)] flex items-center justify-center text-[#a8997e] shrink-0">
 <Code className="h-4 w-4" />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-[#f0e8d4] truncate">{job.title}</p>
 <div className="flex gap-1.5 mt-0.5">
 {job.skills.map(s => <span key={s} className="text-[11px] text-[#a8997e] bg-[rgba(201,168,76,0.06)] px-1.5 py-0.5 rounded-[3px]">{s}</span>)}
 </div>
 </div>
 </div>
 <div className="hidden sm:flex items-center gap-1.5 text-right">
 <Users className="h-3 w-3 text-[#a8997e]" />
 <span className="text-xs text-[#a8997e]">{job.bids}</span>
 </div>
 <div className="text-right">
 <p className="text-xs text-[#a8997e] font-mono">{job.time}</p>
 </div>
 <div className="text-right">
 <p className="text-sm font-bold text-[#f0e8d4]">{job.price}</p>
 <p className="text-[11px] text-emerald-400/90">{"↓"} {job.decay}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ HOW IT WORKS ═══ */}
 <section id="how-it-works" className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-6xl px-5 sm:px-8">
 <div className="text-center mb-16 sm:mb-20">
 <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">How It Works</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight max-w-3xl mx-auto">
 From posting to payment in four simple steps
 </h2>
 <p className="text-base text-[#a8997e] max-w-xl mx-auto mt-5">
 Traditional hiring is slow, expensive, and opaque. GeekBid&apos;s algorithmic pricing finds the true market rate automatically.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr] gap-4 lg:gap-0 items-start">
  {STEPS.map((s, idx) => (
   <>
   <div key={s.num} className="group glass-card hover:border-[rgba(201,168,76,0.35)] transition-all duration-300 relative overflow-hidden">
    <span className="absolute top-3 right-3 text-[10px] font-bold font-mono text-[#c9a84c] border border-[rgba(201,168,76,0.28)] bg-[rgba(201,168,76,0.06)] px-1.5 py-0.5 rounded-[2px] tracking-wider">{s.num}</span>
    <div className="relative z-10">
     <div className={`h-10 w-10 rounded-[6px] border ${s.accent} flex items-center justify-center mb-5`}>
      <s.icon className="h-5 w-5" />
     </div>
     <h3 className="text-lg font-serif font-normal text-[#f0e8d4] mb-2">{s.title}</h3>
     <p className="text-sm sm:text-base text-[#a8997e] leading-relaxed">{s.desc}</p>
    </div>
   </div>
   {idx < STEPS.length - 1 && (
    <div key={`conn-${s.num}`} className="hidden lg:flex items-center justify-center mt-8">
     <div className="w-full border-t border-dashed border-[rgba(201,168,76,0.28)]" />
    </div>
   )}
   </>
  ))}
 </div>

 {/* Price decay formula callout */}
 <div className="mt-12 glass-panel p-6 sm:p-8 text-center scanline">
 <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4">◈ The Price Decay Formula ◈</p>
 <p className="text-xl sm:text-2xl md:text-3xl font-mono-il text-[#a8997e] tracking-tight">
 <span className="text-[#c9a84c]">currentPrice</span>
 {" = max("}
 <span className="text-[#f0e8d4]/80">startPrice</span>
 {" − "}
 <span className="text-[#c9a84c]">decayRate</span>
 {" × "}
 <span className="text-[#c9a84c]">hours</span>
 {", "}
 <span className="text-[#f0e8d4]/80">floor</span>
 {")"}
 </p>
 <p className="text-sm text-[#a8997e] mt-3">Prices never go below your configured minimum. You control the speed.</p>
 </div>
 </div>
 </section>

 {/* ═══ FEATURES ═══ */}
 <section id="features" className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-6xl px-5 sm:px-8">
 <div className="text-center mb-16">
 <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">Platform Features</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight max-w-3xl mx-auto">
 Everything you need to hire and deliver, built in
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {FEATURES.map(f => (
 <div key={f.title} className="group job-card p-8 relative hover:border-[rgba(201,168,76,0.32)] transition-all duration-300">
 <div className="relative z-10">
 <div className={`h-14 w-14 rounded-[6px] ${f.iconBg} border ${f.iconBorder} flex items-center justify-center mb-6 transition-colors`}>
 <f.icon className={`h-6 w-6 ${f.iconColor}`} />
 </div>
 <h3 className="text-lg font-serif font-normal text-[#f0e8d4] mb-2">{f.title}</h3>
 <p className="text-sm sm:text-base text-[#a8997e] leading-relaxed">{f.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ COMPARISON ═══ */}
 <section id="compare" className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-4xl px-5 sm:px-8">
 <div className="text-center mb-16">
 <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">Why GeekBid</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
 Traditional hiring is broken
 </h2>
 <p className="text-base text-[#a8997e] max-w-lg mx-auto mt-5">
 See how GeekBid&apos;s reverse auction model compares to the old way of sourcing engineering talent.
 </p>
 </div>

 <div className="overflow-x-auto">
 <div className="glass-panel overflow-hidden min-w-[500px]">
 {/* Header */}
 <div className="grid grid-cols-[1fr_1fr_1fr] border-b border-[rgba(201,168,76,0.22)]">
 <div className="p-4 sm:p-5 text-sm font-semibold text-[#a8997e]" />
 <div className="p-4 sm:p-5 text-center border-x border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.06)]">
 <div className="flex items-center justify-center gap-2">
 <Zap className="h-4 w-4 text-[#c9a84c]" />
 <span className="text-sm font-bold text-[#c9a84c]">GeekBid</span>
 </div>
 </div>
 <div className="p-4 sm:p-5 text-center">
 <span className="text-sm font-semibold text-[#a8997e]">Traditional</span>
 </div>
 </div>

 {/* Rows */}
 {COMPARISONS.map((c, i) => (
  <div key={c.feature} className={`grid grid-cols-[1fr_1fr_1fr] hover:bg-[rgba(201,168,76,0.04)] transition-colors ${i < COMPARISONS.length - 1 ? "border-b border-[rgba(201,168,76,0.22)]" : ""}`}>
   <div className="p-4 sm:p-5 text-sm sm:text-base font-medium text-[#a8997e]">{c.feature}</div>
   <div className="p-4 sm:p-5 text-center border-x border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.03)]">
    <div className="flex items-start justify-center gap-2">
     <Check className="h-4 w-4 text-[#c9a84c] shrink-0 mt-0.5" />
     <span className="text-sm sm:text-base text-[#c9a84c] font-medium">{c.geekbid}</span>
    </div>
   </div>
   <div className="p-4 sm:p-5 text-center">
    <div className="flex items-start justify-center gap-2">
     <X className="h-4 w-4 text-[#a8997e] shrink-0 mt-0.5" />
     <span className="text-sm sm:text-base text-[#a8997e]">{c.traditional}</span>
    </div>
   </div>
  </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ STATS ═══ */}
 <section ref={statsSection.ref} className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative overflow-hidden">
 <div className="absolute inset-0 bg-[#050810] pointer-events-none" />
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#c9a84c]/[0.04] rounded-full blur-[100px] pointer-events-none" />
 <div className="mx-auto max-w-5xl px-5 relative z-10">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
 {STATS.map((s, i) => (
 <div key={s.label} className="text-center group">
 <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto mb-4 opacity-60" />
 <p className="text-5xl sm:text-6xl font-serif font-normal text-[#c9a84c] tabular-nums group-hover:scale-105 transition-transform duration-300">
 {s.prefix}{i === 1 ? `${(statValues[i] / 10).toFixed(1)}` : statValues[i]}{s.suffix}
 </p>
 <p className="text-sm font-sans text-[#a8997e] mt-2 uppercase tracking-[0.08em]">{s.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ TESTIMONIALS ═══ */}
 <section id="testimonials" ref={testimonialsSection.ref} className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative overflow-hidden">
 {/* Background decoration */}
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#c9a84c]/[0.03] rounded-full blur-[120px]" />
 <div className="absolute top-8 left-8 text-[200px] font-serif text-[rgba(201,168,76,0.03)] leading-none select-none hidden lg:block">&ldquo;</div>
 <div className="absolute bottom-8 right-8 text-[200px] font-serif text-[rgba(201,168,76,0.03)] leading-none select-none hidden lg:block rotate-180">&ldquo;</div>
 </div>

 <div className="mx-auto max-w-6xl px-5 relative z-10">
 <div className="text-center mb-16">
 <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">What people say</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
 Loved by engineers<br className="hidden sm:block" /> and clients alike
 </h2>
 <p className="text-base text-[#a8997e] max-w-md mx-auto mt-4">Real results from real people using GeekBid to hire and get hired.</p>
 </div>

 {/* 3-col card grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 {TESTIMONIALS.map((t, i) => (
 <div
 key={t.name}
 className="group relative rounded-[8px] p-px overflow-hidden"
 style={{
 background: "linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.04) 50%, rgba(201,168,76,0.12))",
 opacity: testimonialsSection.inView ? 1 : 0,
 transform: testimonialsSection.inView ? "translateY(0)" : "translateY(32px)",
 transition: `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`,
 }}
 >
 {/* inner card */}
 <div className="rounded-[7px] bg-[#0a0d18] p-6 sm:p-7 h-full flex flex-col relative overflow-hidden group-hover:bg-[#0d1020] transition-colors duration-300">
 {/* decorative quote */}
 <span className="absolute top-4 right-5 text-6xl font-serif text-[rgba(201,168,76,0.08)] leading-none select-none group-hover:text-[rgba(201,168,76,0.14)] transition-colors duration-300">&rdquo;</span>

 {/* Top row: role tag + stars */}
 <div className="flex items-center justify-between mb-5">
 <span className={`text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-[3px] border ${t.tagBg}`}>{t.tag}</span>
 <div className="flex gap-0.5">
 {[1,2,3,4,5].map(s => (
 <Star key={s} className="h-3.5 w-3.5 fill-[#c9a84c] text-[#c9a84c]" />
 ))}
 </div>
 </div>

 {/* Quote */}
 <blockquote className="font-serif font-normal text-[#f0e8d4] text-base leading-relaxed flex-1 mb-6">
 &ldquo;{t.quote}&rdquo;
 </blockquote>

 {/* Result pill */}
 <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${t.accent} mb-5 self-start`}>
 <CheckCircle2 className="h-3.5 w-3.5" />
 {t.saved}
 </div>

 {/* Divider */}
 <div className="h-px w-full bg-gradient-to-r from-[rgba(201,168,76,0.15)] via-[rgba(201,168,76,0.06)] to-transparent mb-5" />

 {/* Attribution */}
 <div className="flex items-center gap-3">
 <div className={`relative h-11 w-11 rounded-full bg-gradient-to-br ${t.avatarGrad} ${t.ring} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
 {t.avatar}
 <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0a0d18]" />
 </div>
 <div>
 <p className="text-sm font-semibold text-[#f0e8d4]">{t.name}</p>
 <p className="text-[11px] text-[#a8997e] mt-0.5">{t.title} · <span className={t.accent}>{t.company}</span></p>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Bottom trust strip */}
 <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
 {[
 { val: "2,400+", label: "Active Freelancers" },
 { val: "94%", label: "Client Satisfaction" },
 { val: "$1.2M+", label: "Total Paid Out" },
 { val: "< 4hr", label: "Avg Match Time" },
 ].map(s => (
 <div key={s.label} className="text-center">
 <p className="text-xl font-serif text-[#c9a84c]">{s.val}</p>
 <p className="text-[10px] uppercase tracking-wider text-[#a8997e] mt-0.5">{s.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ DUAL CTA: FOR CLIENTS & FREELANCERS ═══ */}
 <section className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-6xl px-5 sm:px-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* For Clients */}
 <div className="group glass-card hover:border-[rgba(201,168,76,0.40)] relative overflow-hidden">
 <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#c9a84c]/[0.05] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="relative z-10">
 <div className="h-12 w-12 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.35)] flex items-center justify-center mb-6">
 <Target className="h-6 w-6 text-[#c9a84c]" />
 </div>
 <h3 className="text-2xl font-serif font-normal text-[#f0e8d4] mb-3">For Clients</h3>
 <ul className="space-y-3 mb-8">
 {["Post jobs with custom decay rates", "Escrow protects every payment", "Browse verified freelancer profiles", "Real-time chat with candidates"].map(item => (
 <li key={item} className="flex items-center gap-3 text-sm text-[#a8997e]">
 <CheckCircle2 className="h-4 w-4 text-[#c9a84c] shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 <Link href="/login?tab=register&role=client">
 <button className="btn-primary text-sm px-8 py-3.5 rounded-[3px] w-full justify-center">
 Start Hiring <ArrowRight className="h-4 w-4" />
 </button>
 </Link>
 </div>
 </div>

 {/* For Freelancers */}
 <div className="group glass-card hover:border-[rgba(201,168,76,0.30)] relative overflow-hidden">
 <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/[0.05] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="relative z-10">
 <div className="h-12 w-12 rounded-[3px] bg-[rgba(201,168,76,0.10)] border border-[rgba(201,168,76,0.35)] flex items-center justify-center mb-6">
 <Code className="h-6 w-6 text-[#c9a84c]" />
 </div>
 <h3 className="text-2xl font-serif font-normal text-[#f0e8d4] mb-3">For Freelancers</h3>
 <ul className="space-y-3 mb-8">
 {["Watch job prices and bid at your target rate", "Build your GeekScore™ reputation", "Get matched to jobs by skills", "Guaranteed payment via escrow"].map(item => (
 <li key={item} className="flex items-center gap-3 text-sm text-[#a8997e]">
 <CheckCircle2 className="h-4 w-4 text-[#c9a84c] shrink-0" />
 {item}
 </li>
 ))}
 </ul>
 <Link href="/login?tab=register&role=freelancer">
 <button className="btn-ghost text-sm px-8 py-3.5 rounded-[3px] w-full justify-center">
 Join as Freelancer <ArrowRight className="h-4 w-4" />
 </button>
 </Link>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ═══ FINAL CTA ═══ */}
 <section className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative grid-bg overflow-hidden">
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#c9a84c]/[0.09] rounded-full blur-[160px]" />
 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.4)] to-transparent" />
 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.2)] to-transparent" />
 </div>
 <div className="mx-auto max-w-4xl px-5 text-center relative z-10">
 <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#c9a84c] border border-[rgba(201,168,76,0.22)] px-3 py-1.5 rounded-[2px] mb-8 font-sans">
 <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse inline-block" />
 Join 2,400+ engineers on GeekBid
 </div>
 <h2 className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal text-[#f0e8d4] leading-[1.05]">
 Ready to hire<br /><em className="text-[#c9a84c] not-italic">smarter?</em>
 </h2>
 <p className="text-lg text-[#a8997e] mt-6 max-w-lg mx-auto">
 Join thousands of companies using reverse auctions to find the best engineering talent at the right price.
 </p>
 <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
 <Link href="/login?tab=register&role=client">
 <button className="group btn-primary text-base px-12 py-4 rounded-[3px]">
 Get Started Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
 </button>
 </Link>
 <Link href="/login?tab=register&role=freelancer">
 <button className="btn-ghost text-base px-12 py-4 rounded-[3px]">
 Apply as Freelancer <ChevronRight className="h-4 w-4" />
 </button>
 </Link>
 </div>
 <p className="text-xs text-[#a8997e] mt-6 opacity-60">No credit card required · Free to post · 10% success fee only</p>
 </div>
 </section>

 {/* ═══ FOOTER ═══ */}
 <footer className="border-t border-[rgba(201,168,76,0.22)] py-12 sm:py-16 bg-[#050810]">
 <div className="mx-auto max-w-6xl px-5">
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-12 mb-12">
 {/* Brand */}
 <div className="sm:col-span-1">
 <div className="flex items-center gap-2.5 mb-4">
 <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#c9a84c] text-[#050810]">
 <Zap className="h-4 w-4" />
 </div>
 <span className="text-base font-serif font-normal text-[#f0e8d4]">GeekBid</span>
 </div>
 <p className="text-sm text-[#a8997e] leading-relaxed">
 The reverse-auction marketplace for engineering talent.
 </p>
 </div>

 {/* Platform */}
 <div>
  <p className="text-[11px] font-semibold text-[#c9a84c] uppercase tracking-widest mb-4">Platform</p>
  <div className="flex flex-col gap-2.5">
   <Link href="/feed" className="text-sm text-[#a8997e] hover:text-[#f0e8d4] transition-colors">Browse Jobs</Link>
   <Link href="/post-job" className="text-sm text-[#a8997e] hover:text-[#f0e8d4] transition-colors">Post a Job</Link>
   <Link href="/login?role=freelancer" className="text-sm text-[#a8997e] hover:text-[#f0e8d4] transition-colors">Find Work</Link>
   <Link href="/pricing" className="text-sm text-[#a8997e] hover:text-[#f0e8d4] transition-colors">Pricing</Link>
  </div>
 </div>
 {/* Company */}
 <div>
  <p className="text-[11px] font-semibold text-[#c9a84c] uppercase tracking-widest mb-4">Company</p>
  <div className="flex flex-col gap-2.5">
   <span className="text-sm text-[#a8997e]">About Us</span>
   <span className="text-sm text-[#a8997e]">Careers</span>
   <span className="text-sm text-[#a8997e]">Blog</span>
   <span className="text-sm text-[#a8997e]">Contact</span>
  </div>
 </div>
 {/* Legal */}
 <div>
  <p className="text-[11px] font-semibold text-[#c9a84c] uppercase tracking-widest mb-4">Legal</p>
  <div className="flex flex-col gap-2.5">
   <span className="text-sm text-[#a8997e]">Terms of Service</span>
   <span className="text-sm text-[#a8997e]">Privacy Policy</span>
   <span className="text-sm text-[#a8997e]">Cookie Policy</span>
  </div>
 </div>
 </div>

 {/* Bottom bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[rgba(201,168,76,0.22)]">
 <p className="text-xs text-[#a8997e]">&copy; 2026 GeekBid Inc. All rights reserved.</p>
 </div>
 </div>
 </footer>
 </div>
 );
}
