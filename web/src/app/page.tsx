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
 <div className="glass-panel scanline p-6 sm:p-8">
 <div className="flex items-center justify-between mb-6">
 <div>
 <p className="text-xs text-[#a8997e] uppercase tracking-wider font-semibold">Live Price Decay</p>
 <p className="text-sm text-[#a8997e] mt-1 font-heading">AI Chatbot Development</p>
 </div>
 <div className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#c9a84c] border border-transparent">
 <div className="h-1.5 w-1.5 rounded-full bg-[#c9a84c] unread-dot" />
 <span className="text-xs text-white font-semibold">LIVE</span>
 </div>
 </div>

 <div className="flex items-end gap-3 mb-4">
 <span className="text-5xl sm:text-6xl font-serif font-normal text-[#f0e8d4] tabular-nums">
 ${price.toLocaleString()}
 </span>
 <div className="flex items-center gap-1 pb-2">
 <TrendingDown className="h-4 w-4 text-[#d4b55a]" />
 <span className="text-sm text-[#d4b55a] font-semibold">-${DECAY}/hr</span>
 </div>
 </div>

 <div className="relative h-2 rounded-full bg-[rgba(201,168,76,0.12)] overflow-hidden mb-3">
 <div
 className="absolute inset-y-0 left-0 decay-bar transition-all duration-150 ease-linear"
 style={{ width: `${100 - pct}%` }}
 />
 </div>
 <div className="flex justify-between text-[11px] text-[#a8997e]">
 <span>Floor: ${MIN.toLocaleString()}</span>
 <span>Elapsed: {elapsed}h</span>
 <span>Start: $2,400</span>
 </div>

 <div className="grid grid-cols-3 gap-3 mt-6">
 {[
 { label: "Bids", value: "7", icon: Users },
 { label: "Watchers", value: "23", icon: Eye },
 { label: "Time Left", value: `${Math.max(64 - elapsed, 0)}h`, icon: Timer },
 ].map(s => (
 <div key={s.label} className="rounded-[3px] border border-[rgba(201,168,76,0.15)] px-3 py-2.5 text-center bg-[rgba(201,168,76,0.05)]">
 <s.icon className="h-3.5 w-3.5 text-[#a8997e] mx-auto mb-1" />
 <p className="text-sm font-serif font-normal text-[#f0e8d4]">{s.value}</p>
 <p className="text-[11px] text-[#a8997e]">{s.label}</p>
 </div>
 ))}
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
 gradient: "-500/10 ",
 },
 {
 icon: Shield,
 title: "Escrow Protection",
 desc: "Every payment is held in secure escrow until delivery is verified. 10% platform fee, full dispute resolution, and transparent fund release.",
 gradient: "-500/10 ",
 },
 {
 icon: BarChart3,
 title: "GeekScore™ Rating",
 desc: "Our proprietary reputation system scores freelancers across delivery, quality, and reliability. Make confident hiring decisions backed by data.",
 gradient: "-500/10 ",
 },
 {
 icon: MessageSquare,
 title: "Real-Time Chat",
 desc: "Built-in messaging with per-job chat rooms. Discuss scope, share updates, and collaborate — all inside the platform with Socket.IO live delivery.",
 gradient: "-500/10 ",
 },
 {
 icon: Bell,
 title: "Smart Notifications",
 desc: "Instant alerts for price drops, counter-bids, job matches, and payment events. Never miss an opportunity with targeted, actionable notifications.",
 gradient: "-500/10 ",
 },
 {
 icon: CreditCard,
 title: "Razorpay Payments",
 desc: "Integrated payment processing with Razorpay. Create orders, verify signatures, and manage the full escrow lifecycle from a single dashboard.",
 gradient: "-500/10 ",
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
 accent: "bg-[rgba(201,168,76,0.12)] text-[#d4b55a] border-[rgba(201,168,76,0.22)]",
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
 quote: "GeekBid saved us 40% on our AI infrastructure project. The reverse auction model is genuinely game-changing for how we source engineering talent.",
 name: "Sarah Chen",
 title: "CTO, NexaAI",
 avatar: "SC",
 },
 {
 quote: "As a freelancer, I love the transparency. I can see exactly when a project hits my target rate and jump on it. No more lowball negotiations.",
 name: "Arjun Dev",
 title: "Senior Full-Stack Engineer",
 avatar: "AD",
 },
 {
 quote: "The escrow system gives us peace of mind. We know the money is there, and the dispute resolution process is fair and fast.",
 name: "Derek Olsen",
 title: "VP Engineering, FinScale",
 avatar: "DO",
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
 const [activeTestimonial, setActiveTestimonial] = useState(0);

 const statsSection = useInView(0.3);
 const stat0 = useCountUp(STATS[0].value, 2000, 0, statsSection.inView);
 const stat1 = useCountUp(12, 2000, 0, statsSection.inView);
 const stat2 = useCountUp(STATS[2].value, 2000, 0, statsSection.inView);
 const stat3 = useCountUp(STATS[3].value, 1500, 0, statsSection.inView);
 const statValues = [stat0, stat1, stat2, stat3];

 useEffect(() => {
 if (mounted && currentUser) router.replace("/feed");
 }, [mounted, currentUser, router]);

 useEffect(() => {
 const id = setInterval(() => setActiveTestimonial(p => (p + 1) % TESTIMONIALS.length), 6000);
 return () => clearInterval(id);
 }, []);

 if (!mounted || currentUser) return null;

 return (
 <div className="bg-[#0d1120] text-[#f0e8d4] overflow-x-hidden">
 {/* ═══ NAVBAR ═══ */}
 <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
 <div className="flex h-14 items-center justify-between px-6 border border-[rgba(201,168,76,0.22)] bg-[#0d1120]/90">
 <div className="flex items-center gap-2.5">
 <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#c9a84c] text-[#080b14]">
 <Zap className="h-4 w-4" />
 </div>
 <span className="text-base font-bold tracking-tight font-heading text-[#f0e8d4]">GeekBid</span>
 </div>
 <div className="hidden md:flex items-center gap-8 text-sm text-[#a8997e]">
 <a href="#how-it-works" className="hover:text-[#d4b55a] transition-colors duration-200">How it Works</a>
 <a href="#features" className="hover:text-[#d4b55a] transition-colors duration-200">Features</a>
 <a href="#compare" className="hover:text-[#d4b55a] transition-colors duration-200">Compare</a>
 <a href="#testimonials" className="hover:text-[#d4b55a] transition-colors duration-200">Testimonials</a>
 </div>
 <div className="flex items-center gap-3">
 <Link href="/login">
 <button className="hidden sm:block text-sm text-[#a8997e] hover:text-[#f0e8d4] transition-colors font-medium">Sign In</button>
 </Link>
 <Link href="/login?tab=register&role=client">
 <button className="flex items-center gap-2 btn-primary text-sm px-5 py-2.5 rounded-[3px]">
 Get Started <ArrowUpRight className="h-3.5 w-3.5" />
 </button>
 </Link>
 </div>
 </div>
 </nav>

 {/* ═══ HERO ═══ */}
 <section className="relative min-h-screen flex items-center justify-center px-5 pt-24 pb-16 grid-bg">
 {/* Ambient glows */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[#c9a84c]/[0.04] rounded-full blur-[150px] pointer-events-none" />
 <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
 <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-purple-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

 <div className="relative w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
 {/* Left: Copy */}
 <div className="text-center lg:text-left animate-fade-in-up">
 {/* Badge */}
 <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-[3px] border border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.04)] mb-8 text-sm text-[#a8997e] hover:bg-[rgba(201,168,76,0.07)] transition-colors cursor-default">
 <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[#c9a84c] text-[#080b14] text-[11px] font-bold uppercase tracking-wider"><span className="h-1.5 w-1.5 rounded-full bg-[#080b14] animate-pulse inline-block mr-1"></span>LIVE</span>
 <span>Reverse Auction Platform for Engineers</span>
 <ChevronRight className="h-3.5 w-3.5 text-[#a8997e]" />
 </div>

 <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-serif font-normal tracking-tight leading-[1.05]">
 Hire engineers
 <br />
 <span className="text-gradient">
 at the right price
 </span>
 </h1>

 <p className="text-lg sm:text-xl text-[#a8997e] mt-8 max-w-lg leading-relaxed mx-auto lg:mx-0">
 The world&apos;s first reverse-auction marketplace for tech talent. Post a job, watch prices automatically decay, and hire when it hits your sweet spot.
 </p>

 {/* CTAs */}
 <div className="flex flex-col sm:flex-row gap-4 mt-10 justify-center lg:justify-start">
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

 {/* Trust signals */}
 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 mt-8 text-xs text-[#a8997e]">
 <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#d4b55a]/80" /> No credit card required</span>
 <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-400/80" /> Escrow protected</span>
 <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-amber-400/80" /> Verified talent only</span>
 </div>
 </div>

 {/* Right: Live Price Decay Demo */}
 <div className="relative animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
 
 <PriceDecayDemo />
 </div>
 </div>

 {/* Scroll indicator */}
 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#a8997e] animate-bounce">
 <span className="text-[11px] uppercase tracking-widest">Scroll</span>
 <ChevronDown className="h-4 w-4" />
 </div>
 </section>

 {/* ═══ PRODUCT SHOWCASE ═══ */}
 <section className="relative py-16 sm:py-24 bg-[#050810]">
 <div className="mx-auto max-w-6xl px-5">
 <div className="text-center mb-12">
 <p className="text-xs font-semibold text-[#a8997e] uppercase tracking-[0.25em] mb-4">Platform Preview</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
 Your auction feed. <span className="text-[#a8997e]">Reimagined.</span>
 </h2>
 </div>

 {/* Browser mockup */}
 <div className="relative">
 <div className="absolute -inset-1 /[0.06] rounded-[6px]" />
 <div className="relative rounded-[6px] border border-[rgba(201,168,76,0.15)] bg-neutral-950 overflow-hidden ">
 {/* Chrome bar */}
 <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[rgba(201,168,76,0.15)]">
 <div className="flex gap-1.5">
 <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
 <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
 <div className="h-3 w-3 rounded-full bg-[#28C840]" />
 </div>
 <div className="flex-1 flex justify-center">
 <div className="bg-[#0d1120]/[0.04] border border-[rgba(201,168,76,0.15)] rounded-[3px] px-4 py-1 text-xs text-white/55 font-mono">geekbid.com/feed</div>
 </div>
 </div>

 {/* Dashboard content */}
 <div className="p-5 sm:p-8">
 {/* Stats row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
 {[
 { label: "Open Jobs", value: "12", sub: "+3 today", color: "text-emerald-400" },
 { label: "Total Value", value: "$24.8K", sub: "Across all jobs", color: "text-white" },
 { label: "Avg Decay", value: "$23/hr", sub: "Price reduction", color: "text-[#d4b55a]" },
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
 <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 border-b border-[rgba(201,168,76,0.15)] text-[11px] text-white/55 uppercase tracking-wider font-semibold">
 <span>Project</span>
 <span className="hidden sm:block text-right">Bids</span>
 <span className="text-right">Time Left</span>
 <span className="text-right">Price</span>
 </div>
 {JOB_ROWS.map((job, i) => (
 <div key={job.title} className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3.5 ${i < JOB_ROWS.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-[#111625]/[0.02] transition-colors`}>
 <div className="flex items-center gap-3 min-w-0">
 <div className="h-8 w-8 rounded-[3px] bg-[rgba(201,168,76,0.08)] flex items-center justify-center text-white/50 shrink-0">
 <Code className="h-4 w-4" />
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-white/90 truncate">{job.title}</p>
 <div className="flex gap-1.5 mt-0.5">
 {job.skills.map(s => <span key={s} className="text-[11px] text-white/50 bg-[rgba(201,168,76,0.06)] px-1.5 py-0.5 rounded-[3px]">{s}</span>)}
 </div>
 </div>
 </div>
 <div className="hidden sm:flex items-center gap-1.5 text-right">
 <Users className="h-3 w-3 text-white/40" />
 <span className="text-xs text-white/60">{job.bids}</span>
 </div>
 <div className="text-right">
 <p className="text-xs text-[#a8997e] font-mono">{job.time}</p>
 </div>
 <div className="text-right">
 <p className="text-sm font-bold text-white">{job.price}</p>
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
 <p className="text-xs font-semibold text-[#a8997e] uppercase tracking-[0.25em] mb-4">How It Works</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight max-w-3xl mx-auto">
 From posting to payment in four simple steps
 </h2>
 <p className="text-base text-[#a8997e] max-w-xl mx-auto mt-5">
 Traditional hiring is slow, expensive, and opaque. GeekBid&apos;s algorithmic pricing finds the true market rate automatically.
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {STEPS.map((s) => (
 <div key={s.num} className="group glass-card hover:border-[rgba(201,168,76,0.35)] transition-all duration-300">
 <span className="text-5xl font-serif font-normal text-[rgba(201,168,76,0.08)] absolute top-4 right-4 group-hover:text-[rgba(201,168,76,0.18)] transition-colors">{s.num}</span>
 <div className="relative z-10">
 <div className={`h-10 w-10 rounded-[6px] border ${s.accent} flex items-center justify-center mb-5`}>
 <s.icon className="h-5 w-5" />
 </div>
 <h3 className="text-base font-serif font-normal text-[#f0e8d4] mb-2">{s.title}</h3>
 <p className="text-sm text-[#a8997e] leading-relaxed">{s.desc}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Price decay formula callout */}
 <div className="mt-12 glass-panel p-6 sm:p-8 text-center scanline">
 <p className="text-xs text-[#a8997e] uppercase tracking-widest mb-4 font-semibold">The Price Decay Formula</p>
 <p className="text-xl sm:text-2xl md:text-3xl font-mono-il text-[#a8997e] tracking-tight">
 <span className="text-[#d4b55a]">currentPrice</span>
 {" = max("}
 <span className="text-[#f0e8d4]/80">startPrice</span>
 {" − "}
 <span className="text-[#d4b55a]">decayRate</span>
 {" × "}
 <span className="text-[#d4b55a]">hours</span>
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
 <p className="text-xs font-semibold text-[#a8997e] uppercase tracking-[0.25em] mb-4">Platform Features</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight max-w-3xl mx-auto">
 Everything you need to hire and deliver, built in
 </h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {FEATURES.map(f => (
 <div key={f.title} className="group job-card p-8 relative">
 <div className="relative z-10">
 <div className="h-14 w-14 rounded-[6px] bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.22)] flex items-center justify-center mb-6 group-hover:border-[rgba(201,168,76,0.35)] transition-colors">
 <f.icon className="h-6 w-6 text-[#a8997e] group-hover:text-[#c9a84c] transition-colors" />
 </div>
 <h3 className="text-lg font-serif font-normal text-[#f0e8d4] mb-2">{f.title}</h3>
 <p className="text-sm text-[#a8997e] leading-relaxed">{f.desc}</p>
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
 <p className="text-xs font-semibold text-[#a8997e] uppercase tracking-[0.25em] mb-4">Why GeekBid</p>
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
 <Zap className="h-4 w-4 text-[#d4b55a]" />
 <span className="text-sm font-bold text-[#d4b55a]">GeekBid</span>
 </div>
 </div>
 <div className="p-4 sm:p-5 text-center">
 <span className="text-sm font-semibold text-[#a8997e]">Traditional</span>
 </div>
 </div>

 {/* Rows */}
 {COMPARISONS.map((c, i) => (
 <div key={c.feature} className={`grid grid-cols-[1fr_1fr_1fr] ${i < COMPARISONS.length - 1 ? "border-b border-[rgba(201,168,76,0.22)]" : ""}`}>
 <div className="p-4 sm:p-5 text-sm font-medium text-[#a8997e]">{c.feature}</div>
 <div className="p-4 sm:p-5 text-center border-x border-[rgba(201,168,76,0.22)] bg-[rgba(201,168,76,0.03)]">
 <div className="flex items-start justify-center gap-2">
 <Check className="h-4 w-4 text-[#d4b55a] shrink-0 mt-0.5" />
 <span className="text-sm text-[#a8997e]">{c.geekbid}</span>
 </div>
 </div>
 <div className="p-4 sm:p-5 text-center">
 <div className="flex items-start justify-center gap-2">
 <X className="h-4 w-4 text-[#a8997e] shrink-0 mt-0.5" />
 <span className="text-sm text-[#a8997e]">{c.traditional}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ═══ STATS ═══ */}
 <section ref={statsSection.ref} className="py-20 sm:py-28 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-5xl px-5">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
 {STATS.map((s, i) => (
 <div key={s.label} className="text-center">
 <p className="text-4xl sm:text-5xl font-serif font-normal text-[#c9a84c] tabular-nums">
 {s.prefix}{i === 1 ? `${(statValues[i] / 10).toFixed(1)}` : statValues[i]}{s.suffix}
 </p>
 <p className="text-xs text-[#a8997e] mt-2 font-medium uppercase tracking-wider">{s.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ═══ TESTIMONIALS ═══ */}
 <section id="testimonials" className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-4xl px-5">
 <div className="text-center mb-16">
 <p className="text-xs font-semibold text-[#a8997e] uppercase tracking-[0.25em] mb-4">Testimonials</p>
 <h2 className="text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight">
 Loved by engineers and clients alike
 </h2>
 </div>

 {/* Testimonial cards */}
 <div className="relative">
 {TESTIMONIALS.map((t, i) => (
 <div
 key={t.name}
 className={`transition-all duration-500 ${i === activeTestimonial ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none"}`}
 >
 <div className="testimonial-card p-8 sm:p-12 text-center">
 <div className="flex gap-1 justify-center mb-8">
 {[1, 2, 3, 4, 5].map(s => <Star key={s} className="h-5 w-5 fill-[#d4b55a] text-[#d4b55a]" />)}
 </div>
 <blockquote className="text-xl sm:text-2xl font-serif font-normal text-[#f0e8d4] leading-relaxed max-w-2xl mx-auto">
 &ldquo;{t.quote}&rdquo;
 </blockquote>
 <div className="mt-8 flex items-center justify-center gap-4">
 <div className="h-12 w-12 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.35)] flex items-center justify-center text-sm font-bold text-[#c9a84c]">{t.avatar}</div>
 <div className="text-left">
 <p className="text-sm font-semibold text-[#f0e8d4]">{t.name}</p>
 <p className="text-xs text-[#a8997e] mt-0.5">{t.title}</p>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Dots */}
 <div className="flex justify-center gap-2 mt-8">
 {TESTIMONIALS.map((_, i) => (
 <button
 key={i}
 onClick={() => setActiveTestimonial(i)}
 className={`h-0.5 rounded-none transition-all duration-300 ${i === activeTestimonial ? "w-8 bg-[#c9a84c]" : "w-3 bg-[rgba(201,168,76,0.25)] hover:bg-[rgba(201,168,76,0.50)]"}`}
 />
 ))}
 </div>
 </div>
 </section>

 {/* ═══ DUAL CTA: FOR CLIENTS & FREELANCERS ═══ */}
 <section className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
 <div className="mx-auto max-w-6xl px-5 sm:px-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* For Clients */}
 <div className="group glass-card hover:border-[rgba(201,168,76,0.35)]/40 job-card-hover relative overflow-hidden">
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
 <div className="group glass-card hover:border-[rgba(201,168,76,0.35)]/20 job-card-hover relative overflow-hidden">
 <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/[0.05] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
 <div className="relative z-10">
 <div className="h-12 w-12 rounded-[6px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] flex items-center justify-center mb-6">
 <Code className="h-6 w-6 text-[#d4b55a]" />
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
 <section className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative grid-bg">
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#c9a84c]/[0.03] rounded-full blur-[120px]" />
 </div>
 <div className="mx-auto max-w-4xl px-5 text-center relative z-10">
 <h2 className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal text-[#f0e8d4] leading-[1.05]">
 Ready to hire <span className="text-gradient">smarter?</span>
 </h2>
 <p className="text-lg text-[#a8997e] mt-6 max-w-lg mx-auto">
 Join thousands of companies using reverse auctions to find the best engineering talent at the right price.
 </p>
 <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
 <Link href="/login?tab=register&role=client">
 <button className="group btn-primary text-base px-12 py-4 rounded-[3px]">
 Get Started Free <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
 </button>
 </Link>
 <Link href="/login?tab=register&role=freelancer">
 <button className="btn-ghost text-base px-12 py-4 rounded-[3px]">
 Apply as Freelancer <ChevronRight className="h-4 w-4" />
 </button>
 </Link>
 </div>
 </div>
 </section>

 {/* ═══ FOOTER ═══ */}
 <footer className="border-t border-[rgba(201,168,76,0.22)] py-12 sm:py-16 bg-[#050810]">
 <div className="mx-auto max-w-6xl px-5">
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-12 mb-12">
 {/* Brand */}
 <div className="sm:col-span-1">
 <div className="flex items-center gap-2.5 mb-4">
 <div className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#c9a84c] text-white">
 <Zap className="h-4 w-4" />
 </div>
 <span className="text-base font-serif font-normal text-[#f0e8d4]">GeekBid</span>
 </div>
 <p className="text-sm text-[#a8997e] leading-relaxed">
 The reverse-auction marketplace for engineering talent.
 </p>
 </div>

 {/* Links */}
 <div>
 <p className="text-[11px] font-medium text-[#6b5f45] uppercase tracking-widest mb-4">Platform</p>
 <ul className="space-y-2.5">
 <li><Link href="/feed" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">Browse Jobs</Link></li>
 <li><Link href="/login?tab=register&role=client" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">Post a Job</Link></li>
 <li><Link href="/login?tab=register&role=freelancer" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">Find Work</Link></li>
 </ul>
 </div>
 <div>
 <p className="text-[11px] font-medium text-[#6b5f45] uppercase tracking-widest mb-4">Resources</p>
 <ul className="space-y-2.5">
 <li><a href="#how-it-works" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">How it Works</a></li>
 <li><a href="#features" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">Features</a></li>
 <li><a href="#compare" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">GeekBid vs Traditional</a></li>
 </ul>
 </div>
 <div>
 <p className="text-[11px] font-medium text-[#6b5f45] uppercase tracking-widest mb-4">Account</p>
 <ul className="space-y-2.5">
 <li><Link href="/login" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">Sign In</Link></li>
 <li><Link href="/login?tab=register" className="text-sm text-[#a8997e] hover:text-[#c9a84c] transition-colors">Create Account</Link></li>
 </ul>
 </div>
 </div>

 {/* Bottom bar */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[rgba(201,168,76,0.22)]">
 <p className="text-xs text-[#a8997e]">&copy; 2026 GeekBid Inc. All rights reserved.</p>
 <div className="flex items-center gap-1 text-xs text-[#a8997e]">
 <span>Built with</span>
 <span className="text-[#a8997e]">Next.js</span>
 <span>&middot;</span>
 <span className="text-[#a8997e]">MongoDB</span>
 <span>&middot;</span>
 <span className="text-[#a8997e]">Socket.IO</span>
 </div>
 </div>
 </div>
 </footer>
 </div>
 );
}
