"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Zap, ArrowRight, TrendingDown, Shield, Users, Code, Clock,
  DollarSign, Star, ChevronRight, Sparkles, BarChart3, Lock,
  Globe, CheckCircle2, ArrowUpRight, Target, Award, Play
} from "lucide-react";

const FEATURES = [
  {
    icon: TrendingDown,
    title: "Reverse Price Decay",
    desc: "with algorithmic pricing that finds the perfect market rate",
  },
  {
    icon: Shield,
    title: "Escrow Protection",
    desc: "with funds locked until delivery is verified and approved",
  },
  {
    icon: BarChart3,
    title: "GeekScore™ Intelligence",
    desc: "with AI-powered reputation scoring across every metric",
  },
];

const STATS = [
  { value: "2,400+", label: "Active Freelancers" },
  { value: "$1.2M", label: "Total Volume" },
  { value: "94%", label: "Satisfaction" },
  { value: "<4hr", label: "Avg Match" },
];

const STEPS = [
  { num: "01", title: "Post Your Project", desc: "Define scope, budget ceiling, and decay speed." },
  { num: "02", title: "Watch Prices Drop", desc: "Prices decrease automatically over time." },
  { num: "03", title: "Review & Accept", desc: "Pick the perfect talent at the right price." },
  { num: "04", title: "Escrow & Deliver", desc: "Payment held until work is delivered." },
];

export default function LandingPage() {
  const { currentUser, mounted } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (mounted && currentUser) router.replace("/feed");
  }, [mounted, currentUser, router]);

  if (!mounted || currentUser) return null;

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <div className="flex h-14 items-center justify-between px-6 rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">GeekBid</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
          </div>
          <Link href="/login?tab=register&role=client">
            <button className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all">
              Book a demo <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-5 text-center">
        {/* Ambient glow behind hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-white/[0.03] rounded-full blur-[100px] pointer-events-none" />

        {/* Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8 text-sm text-white/50 hover:bg-white/[0.06] transition-colors cursor-default">
          <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[11px] font-bold uppercase tracking-wider">NEW</span>
          <span>Reverse Auction Platform for Engineers</span>
          <ChevronRight className="h-3.5 w-3.5 text-white/30" />
        </div>

        {/* Hero headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-extrabold tracking-[-0.04em] leading-[0.95] max-w-5xl">
          Hire engineers
          <br />
          <span className="text-white/30">at the right price</span>
        </h1>

        <p className="text-base sm:text-lg text-white/40 mt-8 max-w-lg leading-relaxed">
          The world&apos;s first reverse auction marketplace for tech talent.
          Post a job, watch prices drop, hire when it&apos;s right.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 mt-12">
          <Link href="/login?tab=register&role=client">
            <button className="flex items-center justify-center gap-2.5 bg-white text-black text-base font-bold px-10 py-4 rounded-2xl hover:bg-white/90 transition-all shadow-[0_0_60px_rgba(255,255,255,0.1)] hover:shadow-[0_0_80px_rgba(255,255,255,0.15)] hover:-translate-y-0.5">
              Start Hiring Free <ArrowUpRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/login?tab=register&role=freelancer">
            <button className="flex items-center justify-center gap-2.5 border border-white/[0.12] text-white/60 text-base font-semibold px-10 py-4 rounded-2xl hover:bg-white/[0.04] hover:text-white/80 transition-all">
              <Code className="h-4 w-4" /> Join as Freelancer
            </button>
          </Link>
        </div>

        {/* Trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-xs text-white/25">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> No credit card</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Escrow protected</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Verified talent only</span>
        </div>
      </section>

      {/* ═══ PRODUCT SHOWCASE ═══ */}
      <section className="relative pb-20 sm:pb-32 -mt-10">
        {/* Gradient transition from black to slightly lighter */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
        
        <div className="mx-auto max-w-5xl px-5">
          {/* Product mockup in device frame */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-white/[0.08] to-transparent rounded-3xl" />
            <div className="relative rounded-2xl border border-white/[0.06] bg-neutral-950 overflow-hidden shadow-2xl">
              {/* Tab bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-1 text-xs text-white/30 font-mono">geekbid.com/feed</div>
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Open Jobs</p>
                    <p className="text-2xl font-black text-white">12</p>
                    <p className="text-[10px] text-white/20 mt-0.5">+3 today</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Value</p>
                    <p className="text-2xl font-black text-white">$24.8K</p>
                    <p className="text-[10px] text-white/20 mt-0.5">Across all jobs</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Avg Decay</p>
                    <p className="text-2xl font-black text-white">$23/hr</p>
                    <p className="text-[10px] text-white/20 mt-0.5">Price reduction</p>
                  </div>
                </div>
                {/* Job rows */}
                {[
                  { title: "React Dashboard for SaaS", price: "$2,450", decay: "$18/hr", skills: ["React", "TypeScript"], time: "14h 22m" },
                  { title: "K8s Cluster Migration", price: "$4,100", decay: "$25/hr", skills: ["Kubernetes", "AWS"], time: "8h 45m" },
                  { title: "ML Pipeline Optimization", price: "$3,800", decay: "$30/hr", skills: ["Python", "PyTorch"], time: "5h 12m" },
                ].map(job => (
                  <div key={job.title} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/30">
                        <Code className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/80">{job.title}</p>
                        <div className="flex gap-2 mt-0.5">
                          {job.skills.map(s => <span key={s} className="text-[10px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded">{s}</span>)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div className="hidden sm:block">
                        <p className="text-[10px] text-white/20">Remaining</p>
                        <p className="text-xs text-white/40 font-mono">{job.time}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{job.price}</p>
                        <p className="text-[10px] text-white/20">↓ {job.decay}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* "Your command center. Reimagined." text overlay */}
          <div className="text-center mt-16 sm:mt-24">
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.04em] text-white/90 leading-[1.05]">
              Your auction feed.
              <br />
              <span className="text-white/20">Reimagined.</span>
            </h2>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-semibold text-white/25 uppercase tracking-[0.25em] mb-4">Purpose-built for tech hiring</p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-white/90 max-w-2xl leading-tight mb-4">
            Behind every great product is a great engineer
          </h2>
          <p className="text-base text-white/30 max-w-xl mb-16">
            Traditional hiring is slow, expensive, and opaque. We&apos;ve built a transparent marketplace where price discovery happens in real-time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
                <span className="text-5xl font-black text-white/[0.06] absolute top-4 right-4 group-hover:text-white/[0.1] transition-colors">{s.num}</span>
                <div className="relative z-10">
                  <h3 className="text-base font-bold text-white/90 mb-2 mt-8">{s.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES (The GeekBid Difference) ═══ */}
      <section id="features" className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-xs font-semibold text-white/25 uppercase tracking-[0.25em] mb-4">The GeekBid Difference</p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-[-0.03em] text-white/90 leading-tight">
                The modern, secure marketplace for engineering talent.
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
            {FEATURES.map(f => (
              <div key={f.title} className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-white/[0.12] transition-all duration-300 overflow-hidden">
                {/* Subtle blue edge glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/[0.05] rounded-full blur-3xl" />
                </div>
                <div className="relative z-10">
                  <div className="h-16 w-16 rounded-3xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-6 group-hover:border-white/[0.1] transition-colors">
                    <f.icon className="h-7 w-7 text-white/40 group-hover:text-white/60 transition-colors" />
                  </div>
                  <h3 className="text-lg font-bold text-white/90 mb-2">{f.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BIG STATEMENT ═══ */}
      <section className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[1.1] text-white/80">
            GeekBid makes hiring
            <br />
            faster and transparent
            <br />
            <span className="text-white/20">— so you can focus on</span>
            <br />
            <span className="text-white/20">building what matters.</span>
          </h2>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="mx-auto max-w-4xl px-5 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{s.value}</p>
              <p className="text-xs text-white/25 mt-1.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 sm:p-14">
            <div className="flex gap-0.5 justify-center mb-6">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-white/20 text-white/20" />)}
            </div>
            <blockquote className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/70 leading-relaxed tracking-tight max-w-2xl mx-auto">
              &ldquo;GeekBid saved us 40% on our AI infrastructure project. The reverse auction model is genuinely game-changing.&rdquo;
            </blockquote>
            <div className="mt-8">
              <p className="text-sm font-semibold text-white/60">Sarah Chen</p>
              <p className="text-xs text-white/25 mt-0.5">CTO, NexaAI</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 sm:py-32 border-t border-white/[0.04]">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.04em] text-white/90 mb-6">
            Ready to power up?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/login?tab=register&role=client">
              <button className="flex items-center justify-center gap-2.5 bg-white text-black text-base font-bold px-12 py-4 rounded-2xl hover:bg-white/90 transition-all shadow-[0_0_60px_rgba(255,255,255,0.08)] hover:shadow-[0_0_80px_rgba(255,255,255,0.12)]">
                Start Hiring <ArrowUpRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/login?tab=register&role=freelancer">
              <button className="flex items-center justify-center gap-2.5 border border-white/[0.12] text-white/50 text-base font-semibold px-12 py-4 rounded-2xl hover:bg-white/[0.04] hover:text-white/70 transition-all">
                Apply as Freelancer <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="mx-auto max-w-5xl px-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold">GeekBid</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-white/20">
            <Link href="/login" className="hover:text-white/50 transition-colors">Sign In</Link>
            <Link href="/login?role=freelancer" className="hover:text-white/50 transition-colors">For Freelancers</Link>
            <Link href="/login?role=client" className="hover:text-white/50 transition-colors">For Clients</Link>
          </div>
          <p className="text-xs text-white/15">&copy; 2026 GeekBid Inc.</p>
        </div>
      </footer>
    </div>
  );
}
