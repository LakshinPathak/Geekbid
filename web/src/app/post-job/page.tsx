"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { formatMoney, SKILL_TAXONOMY, JOB_CATEGORIES, type JobCategory } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Zap, DollarSign, Clock, Target,
  TrendingDown, Eye, EyeOff, Globe, Lock, X, AlertCircle, Loader2, Activity,
} from "lucide-react";
import { getDemandMultiplier } from "@/lib/pricing";

type Step = 1 | 2 | 3;

const STEP_META = [
  { num: 1, label: "Details", icon: Target },
  { num: 2, label: "Pricing", icon: DollarSign },
  { num: 3, label: "Review", icon: Check },
];

/* ─── Decay Curve Preview Component ──────────────────────── */
function DecayCurvePreview({
  startingPrice, minimumPrice, decayRate, deadline, pricingMode, hoursToFloor,
}: {
  startingPrice: number; minimumPrice: number; decayRate: number;
  deadline: number; pricingMode: "adaptive" | "fixed"; hoursToFloor: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const [scrubHour, setScrubHour] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Chart dimensions
  const W = 520, H = 180, PAD = { t: 20, r: 16, b: 32, l: 52 };
  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  // Generate curve data points
  const maxHours = Math.max(deadline, 1);
  const STEPS = 60;

  const fixedCurve = useMemo(() => {
    const pts: { h: number; p: number }[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const h = (i / STEPS) * maxHours;
      const p = Math.max(startingPrice - decayRate * h, minimumPrice);
      pts.push({ h, p });
    }
    return pts;
  }, [startingPrice, minimumPrice, decayRate, maxHours]);

  // Adaptive curve simulates 3 unique bidders arriving over time
  const adaptiveCurve = useMemo(() => {
    if (pricingMode !== "adaptive") return null;
    const pts: { h: number; p: number }[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const h = (i / STEPS) * maxHours;
      // Simulate gradual bidder arrival: 0→1 at 20%, 1→2 at 40%, 2→3 at 60%
      const simBidders = h < maxHours * 0.2 ? 0
        : h < maxHours * 0.4 ? 1
        : h < maxHours * 0.6 ? 2 : 3;
      const mult = getDemandMultiplier(simBidders, h);
      const effectiveDecay = decayRate * mult;
      const p = Math.max(startingPrice - effectiveDecay * h, minimumPrice);
      pts.push({ h, p });
    }
    return pts;
  }, [pricingMode, startingPrice, minimumPrice, decayRate, maxHours]);

  // Scale helpers
  const priceRange = Math.max(startingPrice - minimumPrice, 1);
  const scaleX = (h: number) => PAD.l + (h / maxHours) * cw;
  const scaleY = (p: number) => PAD.t + ((startingPrice - p) / priceRange) * ch;

  // Build SVG path from curve data
  const toPath = (pts: { h: number; p: number }[]) =>
    pts.map((pt, i) => `${i === 0 ? "M" : "L"}${scaleX(pt.h).toFixed(1)},${scaleY(pt.p).toFixed(1)}`).join(" ");

  // Price at scrubbed hour (fixed decay)
  const scrubPrice = Math.max(startingPrice - decayRate * scrubHour, minimumPrice);

  // Price at scrubbed hour (adaptive)
  const scrubAdaptivePrice = useMemo(() => {
    if (!adaptiveCurve) return null;
    // Find closest point
    const closest = adaptiveCurve.reduce((best, pt) =>
      Math.abs(pt.h - scrubHour) < Math.abs(best.h - scrubHour) ? pt : best
    );
    return closest.p;
  }, [adaptiveCurve, scrubHour]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [startingPrice, minimumPrice];
    const mid = Math.round((startingPrice + minimumPrice) / 2);
    if (mid !== startingPrice && mid !== minimumPrice) ticks.push(mid);
    return ticks.sort((a, b) => b - a);
  }, [startingPrice, minimumPrice]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    const count = Math.min(5, Math.floor(maxHours));
    if (count <= 0) return [0];
    const step = maxHours / count;
    return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
  }, [maxHours]);

  // Milestone markers (25%, 50%, 75% of deadline)
  const milestones = useMemo(() => {
    return [0.25, 0.5, 0.75].map(pct => {
      const h = maxHours * pct;
      const p = Math.max(startingPrice - decayRate * h, minimumPrice);
      return { pct, h, p, label: `${Math.round(pct * 100)}%` };
    });
  }, [startingPrice, decayRate, maxHours, minimumPrice]);

  // Drag/scrub handlers
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current || !isDragging) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const hour = Math.max(0, Math.min(((svgX - PAD.l) / cw) * maxHours, maxHours));
    setScrubHour(Math.round(hour * 10) / 10);
  }, [isDragging, maxHours, cw]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    // Immediately set position
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const hour = Math.max(0, Math.min(((svgX - PAD.l) / cw) * maxHours, maxHours));
    setScrubHour(Math.round(hour * 10) / 10);
  }, [maxHours, cw]);

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  // Savings calculation
  const savingsPercent = ((startingPrice - scrubPrice) / startingPrice * 100).toFixed(0);

  return (
    <div className="bg-[#0A0A0F] rounded-xl p-5 border border-[#1E1E2A]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-[#00FF88]" />
          <p className="text-[#8A8A9A] text-xs font-semibold uppercase tracking-wider">Decay Curve Preview</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/20">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00FF88] animate-pulse" />
          <span className="text-[10px] text-[#00FF88] font-semibold">INTERACTIVE</span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={`y-${t}`}>
            <line x1={PAD.l} y1={scaleY(t)} x2={W - PAD.r} y2={scaleY(t)}
              stroke="#1E1E2A" strokeWidth={1} strokeDasharray="3,3" />
            <text x={PAD.l - 6} y={scaleY(t) + 3.5} textAnchor="end"
              fill="#55556A" fontSize={9} fontFamily="monospace">
              ${t}
            </text>
          </g>
        ))}
        {xTicks.map(t => (
          <g key={`x-${t}`}>
            <line x1={scaleX(t)} y1={PAD.t} x2={scaleX(t)} y2={H - PAD.b}
              stroke="#1E1E2A" strokeWidth={1} strokeDasharray="2,4" />
            <text x={scaleX(t)} y={H - PAD.b + 14} textAnchor="middle"
              fill="#55556A" fontSize={9} fontFamily="monospace">
              {t}h
            </text>
          </g>
        ))}

        {/* Floor line */}
        <line x1={PAD.l} y1={scaleY(minimumPrice)} x2={W - PAD.r} y2={scaleY(minimumPrice)}
          stroke="#ef4444" strokeWidth={1} strokeDasharray="4,4" opacity={0.3} />
        <text x={W - PAD.r + 2} y={scaleY(minimumPrice) + 3} fill="#ef4444" fontSize={8} opacity={0.5}>Floor</text>

        {/* Adaptive curve (area fill + line) */}
        {adaptiveCurve && (
          <>
            <path
              d={`${toPath(adaptiveCurve)} L${scaleX(maxHours)},${scaleY(minimumPrice)} L${PAD.l},${scaleY(minimumPrice)} Z`}
              fill="url(#adaptiveGrad)" opacity={0.25}
            />
            <path d={toPath(adaptiveCurve)}
              fill="none" stroke="url(#adaptiveStroke)" strokeWidth={2}
              strokeDasharray="6,4" filter="url(#glow)" />
          </>
        )}

        {/* Fixed curve (area fill + line) */}
        <path
          d={`${toPath(fixedCurve)} L${scaleX(maxHours)},${scaleY(minimumPrice)} L${PAD.l},${scaleY(minimumPrice)} Z`}
          fill="url(#fixedGrad)" opacity={0.25}
        />
        <path d={toPath(fixedCurve)}
          fill="none" stroke="#00FF88" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

        {/* Milestone dots */}
        {milestones.map(m => (
          <g key={m.label}>
            <circle cx={scaleX(m.h)} cy={scaleY(m.p)} r={3.5}
              fill="#0A0A0F" stroke="#8A8A9A" strokeWidth={1.5} />
            <text x={scaleX(m.h)} y={scaleY(m.p) - 8} textAnchor="middle"
              fill="#8A8A9A" fontSize={8} fontWeight="600">
              {formatMoney(Math.round(m.p))}
            </text>
          </g>
        ))}

        {/* Scrubber line + dot */}
        <line x1={scaleX(scrubHour)} y1={PAD.t} x2={scaleX(scrubHour)} y2={H - PAD.b}
          stroke="#00FF88" strokeWidth={1} opacity={0.3} strokeDasharray="3,3" />
        {/* Radial glow behind scrubber */}
        <circle cx={scaleX(scrubHour)} cy={scaleY(scrubPrice)} r={16}
          fill="url(#scrubGlow)" />
        {/* Animated ripple */}
        <circle cx={scaleX(scrubHour)} cy={scaleY(scrubPrice)} r={5}
          fill="none" stroke="#00FF88" strokeWidth={1} opacity={0.5}>
          <animate attributeName="r" from="5" to="18" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* Main scrubber dot */}
        <circle cx={scaleX(scrubHour)} cy={scaleY(scrubPrice)} r={5}
          fill="#00FF88" stroke="#0A0A0F" strokeWidth={2} filter="url(#glow)" />
        {scrubAdaptivePrice !== null && pricingMode === "adaptive" && (
          <circle cx={scaleX(scrubHour)} cy={scaleY(scrubAdaptivePrice)} r={4}
            fill="none" stroke="url(#adaptiveStroke)" strokeWidth={1.5}
            strokeDasharray="3,2" />
        )}

        {/* Scrubber tooltip */}
        {(() => {
          const tx = Math.min(Math.max(scaleX(scrubHour), PAD.l + 50), W - PAD.r - 50);
          const ty = Math.max(scaleY(scrubPrice) - 28, PAD.t);
          return (
            <g>
              <rect x={tx - 42} y={ty - 10} width={84} height={22} rx={6}
                fill="#1A1A24" stroke="#00FF88" strokeWidth={0.5} opacity={0.95} />
              <text x={tx} y={ty + 4} textAnchor="middle"
                fill="#00FF88" fontSize={10} fontWeight="700" fontFamily="monospace">
                {formatMoney(Math.round(scrubPrice))} @ {scrubHour.toFixed(1)}h
              </text>
            </g>
          );
        })()}

        {/* Gradient + filter definitions */}
        <defs>
          <linearGradient id="fixedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00FF88" stopOpacity={0.35} />
            <stop offset="40%" stopColor="#00FF88" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="adaptiveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.2} />
            <stop offset="60%" stopColor="#38BDF8" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="adaptiveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="scrubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00FF88" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
          </radialGradient>
        </defs>
      </svg>

      {/* Scrub slider */}
      <div className="mt-3 px-1">
        <input
          type="range"
          min={0}
          max={maxHours}
          step={0.5}
          value={scrubHour}
          onChange={e => setScrubHour(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #00FF88 ${(scrubHour / maxHours) * 100}%, #1E1E2A ${(scrubHour / maxHours) * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#55556A]">0h (Posted)</span>
          <span className="text-[10px] text-[#55556A]">{maxHours}h (Deadline)</span>
        </div>
      </div>

      {/* Legend */}
      {pricingMode === "adaptive" && (
        <div className="flex items-center gap-5 mt-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-[2px] bg-[#00FF88] rounded shadow-[0_0_6px_rgba(0,255,136,0.5)]" />
            <span className="text-[10px] text-[#8A8A9A]">Fixed decay</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-[2px] rounded" style={{ background: "linear-gradient(90deg, #38BDF8, #818CF8)", boxShadow: "0 0 6px rgba(56,189,248,0.4)" }} />
            <span className="text-[10px] text-[#8A8A9A]">Adaptive (3 bidders)</span>
          </div>
        </div>
      )}

      {/* Key metrics row */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        <div className="bg-[#12121A] rounded-xl p-3 text-center border border-[#1E1E2A] hover:border-[#2A2A3A] transition-colors">
          <p className="text-[9px] text-[#55556A] uppercase tracking-wider">Time to Floor</p>
          <p className="text-sm font-bold text-[#E8E8EC] font-heading mt-1">
            {hoursToFloor === Infinity ? "∞" : `${hoursToFloor.toFixed(1)}h`}
          </p>
        </div>
        <div className="bg-[#12121A] rounded-xl p-3 text-center border border-[#1E1E2A] hover:border-red-900/30 transition-colors">
          <p className="text-[9px] text-[#55556A] uppercase tracking-wider">Decay</p>
          <p className="text-sm font-bold text-red-400 font-heading mt-1">-${decayRate}/hr</p>
        </div>
        <div className="bg-[#12121A] rounded-xl p-3 text-center border border-[#00FF88]/10 hover:border-[#00FF88]/25 transition-colors">
          <p className="text-[9px] text-[#55556A] uppercase tracking-wider">@ {scrubHour.toFixed(0)}h</p>
          <p className="text-sm font-bold text-[#00FF88] font-heading mt-1">{formatMoney(Math.round(scrubPrice))}</p>
        </div>
        <div className="bg-[#12121A] rounded-xl p-3 text-center border border-[#00FF88]/10 hover:border-[#00FF88]/25 transition-colors">
          <p className="text-[9px] text-[#55556A] uppercase tracking-wider">Savings</p>
          <p className="text-sm font-bold text-[#00FF88] font-heading mt-1">{savingsPercent}%</p>
        </div>
      </div>
    </div>
  );
}

export default function PostJobPage() {
  const { postJob, currentUser, mounted, loading } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [startingPrice, setStartingPrice] = useState(1000);
  const [minimumPrice, setMinimumPrice] = useState(400);
  const [decayRate, setDecayRate] = useState(15);
  const [estimatedHours, setEstimatedHours] = useState(20);
  const [deadline, setDeadline] = useState(48);
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [category, setCategory] = useState<JobCategory>("other");
  const [skillSearch, setSkillSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pricingMode, setPricingMode] = useState<"adaptive" | "fixed">("adaptive");
  const [pricingHint, setPricingHint] = useState<{ available: boolean; avgFinalPrice?: number; minPrice?: number; maxPrice?: number; avgDecayRate?: number; sampleSize?: number } | null>(null);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  useEffect(() => {
    if (skills.length === 0) { setPricingHint(null); return; }
    const controller = new AbortController();
    fetch(`/api/jobs/pricing-hint?skills=${encodeURIComponent(skills.join(","))}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setPricingHint(d))
      .catch(() => {});
    return () => controller.abort();
  }, [skills]);

  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return SKILL_TAXONOMY;
    return SKILL_TAXONOMY.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()));
  }, [skillSearch]);

  const hoursToFloor = useMemo(() => {
    if (decayRate <= 0) return Infinity;
    return (startingPrice - minimumPrice) / decayRate;
  }, [startingPrice, minimumPrice, decayRate]);


  const validate = (s: Step): boolean => {
    const e: Record<string, string> = {};
    if (s >= 1) {
      if (!title.trim()) e.title = "Title is required";
    }
    if (s >= 2) {
      if (startingPrice <= 0) e.startingPrice = "Must be positive";
      if (minimumPrice <= 0) e.minimumPrice = "Must be positive";
      if (minimumPrice >= startingPrice) e.minimumPrice = "Must be less than starting price";
      if (decayRate <= 0) e.decayRate = "Must be positive";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validate(step)) setStep(Math.min(step + 1, 3) as Step);
  };

  const onSubmit = async () => {
    if (!validate(3)) return;
    const r = await postJob({
      title, description, skillsRequired: skills,
      startingPrice, minimumPrice, decayRatePerHour: decayRate,
      estimatedHours,
      deadlineAt: new Date(Date.now() + deadline * 3600000).toISOString(),
      visibility, category, pricingMode,
    });
    if (r.ok) {
      toast.success("Job posted!", { description: r.message });
      router.push("/feed");
    } else {
      toast.error("Error", { description: r.message });
    }
  };

  if (!mounted) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-[#8A8A9A] text-sm hover:text-[#00FF88] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        {/* Header */}
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#E8E8EC]">Post a New Job</h1>
        <p className="text-[#8A8A9A] text-sm mt-1">Set your starting price and let the market find the true value.</p>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-8 mb-8">
          {STEP_META.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <button
                onClick={() => { if (s.num <= step) setStep(s.num as Step); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  step >= s.num
                    ? "bg-[#00FF88] text-[#0A0A0F]"
                    : "bg-[#12121A] border border-[#1E1E2A] text-[#55556A]"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
              {i < 2 && (
                <div className={`flex-1 h-px mx-2 ${step > s.num ? "bg-[#00FF88]/40" : "bg-[#1E1E2A]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8">
          {/* Step 1: Project Details */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-[#00FF88] text-xs uppercase tracking-wider font-semibold">Project Details</p>

              <div>
                <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Job Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Build AI chatbot for customer support"
                  className="w-full h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#55556A] focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all"
                />
                {errors.title && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.title}</p>}
              </div>

              <div>
                <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as JobCategory)}
                  className="w-full h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all appearance-none cursor-pointer"
                >
                  {JOB_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the scope, deliverables, and requirements..."
                  rows={5}
                  className="w-full px-4 py-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#55556A] focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-[#8A8A9A] text-xs font-medium block mb-2">Required Skills</label>
                {/* Selected skills */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {skills.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs font-medium">
                        {s}
                        <button onClick={() => toggleSkill(s)} className="hover:text-white transition-colors"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Search */}
                <input
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  placeholder="Search skills..."
                  className="w-full h-9 px-3 mb-2 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg text-[#E8E8EC] text-xs placeholder:text-[#55556A] focus:border-[#00FF88]/50 outline-none transition-all"
                />
                <div className="max-h-[160px] overflow-y-auto flex flex-wrap gap-1.5">
                  {filteredSkills.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSkill(s)}
                      className={`text-xs rounded-lg py-1.5 px-3 transition-all border ${
                        skills.includes(s)
                          ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20"
                          : "bg-[#0A0A0F] border-[#1E1E2A] text-[#55556A] hover:text-[#8A8A9A] hover:border-[#8A8A9A]/30"
                      }`}
                    >
                      {skills.includes(s) && <Check className="inline h-3 w-3 mr-1" />}{s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Estimated Hours</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55556A]" />
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={e => setEstimatedHours(Number(e.target.value))}
                    className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#55556A] focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="h-px bg-[#1E1E2A]" />

              <button
                onClick={nextStep}
                disabled={!title.trim()}
                className="w-full h-12 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl hover:bg-[#00CC6A] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Next: Pricing <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-[#00FF88] text-xs uppercase tracking-wider font-semibold">Pricing</p>

              {/* Pricing Mode Toggle */}
              <div>
                <label className="text-[#8A8A9A] text-xs font-medium block mb-2.5">Pricing Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPricingMode("adaptive")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      pricingMode === "adaptive"
                        ? "border-[#00FF88] bg-[#00FF88]/5"
                        : "border-[#1E1E2A] bg-[#0A0A0F] hover:border-[#8A8A9A]/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className={`h-4 w-4 ${pricingMode === "adaptive" ? "text-[#00FF88]" : "text-[#55556A]"}`} />
                      <p className={`text-sm font-semibold ${pricingMode === "adaptive" ? "text-[#E8E8EC]" : "text-[#8A8A9A]"}`}>Adaptive</p>
                      <span className="text-[10px] bg-[#00FF88]/20 text-[#00FF88] px-1.5 py-0.5 rounded-full font-medium">Recommended</span>
                    </div>
                    <p className="text-[#55556A] text-xs leading-relaxed">Price responds to bidder demand. Decays slower with more interest.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode("fixed")}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      pricingMode === "fixed"
                        ? "border-[#00FF88] bg-[#00FF88]/5"
                        : "border-[#1E1E2A] bg-[#0A0A0F] hover:border-[#8A8A9A]/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className={`h-4 w-4 ${pricingMode === "fixed" ? "text-[#00FF88]" : "text-[#55556A]"}`} />
                      <p className={`text-sm font-semibold ${pricingMode === "fixed" ? "text-[#E8E8EC]" : "text-[#8A8A9A]"}`}>Fixed Decay</p>
                    </div>
                    <p className="text-[#55556A] text-xs leading-relaxed">Price drops at a constant rate. Traditional reverse auction.</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Starting Price ($) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55556A]" />
                    <input
                      type="number"
                      value={startingPrice}
                      onChange={e => setStartingPrice(Number(e.target.value))}
                      className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[#55556A] text-xs mt-1">The price your job starts at</p>
                  {errors.startingPrice && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.startingPrice}</p>}
                </div>
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Minimum Price ($) *</label>
                  <input
                    type="number"
                    value={minimumPrice}
                    onChange={e => setMinimumPrice(Number(e.target.value))}
                    className="w-full h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all"
                  />
                  <p className="text-[#55556A] text-xs mt-1">Price will never drop below this</p>
                  {errors.minimumPrice && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.minimumPrice}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Decay Rate ($/hour)</label>
                  <div className="relative">
                    <TrendingDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55556A]" />
                    <input
                      type="number"
                      value={decayRate}
                      onChange={e => setDecayRate(Number(e.target.value))}
                      className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[#55556A] text-xs mt-1">How fast the price decreases</p>
                  {errors.decayRate && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.decayRate}</p>}
                </div>
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium block mb-1.5">Deadline (hours)</label>
                  <input
                    type="number"
                    value={deadline}
                    onChange={e => setDeadline(Number(e.target.value))}
                    className="w-full h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Pricing Hint */}
              {pricingHint?.available && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-blue-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5" /> Based on {pricingHint.sampleSize} similar job{pricingHint.sampleSize !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[#55556A] text-[10px]">Avg Final Price</p>
                      <p className="font-heading text-lg font-bold text-[#E8E8EC]">${pricingHint.avgFinalPrice}</p>
                    </div>
                    <div>
                      <p className="text-[#55556A] text-[10px]">Price Range</p>
                      <p className="font-heading text-lg font-bold text-[#E8E8EC]">${pricingHint.minPrice}–${pricingHint.maxPrice}</p>
                    </div>
                    <div>
                      <p className="text-[#55556A] text-[10px]">Avg Decay Rate</p>
                      <p className="font-heading text-lg font-bold text-[#E8E8EC]">${pricingHint.avgDecayRate}/hr</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Decay Curve Preview ── */}
              <DecayCurvePreview
                startingPrice={startingPrice}
                minimumPrice={minimumPrice}
                decayRate={decayRate}
                deadline={deadline}
                pricingMode={pricingMode}
                hoursToFloor={hoursToFloor}
              />

              <div className="h-px bg-[#1E1E2A]" />

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 border border-[#1E1E2A] text-[#E8E8EC] font-semibold rounded-xl hover:bg-[#12121A] transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 h-11 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl hover:bg-[#00CC6A] transition-all flex items-center justify-center gap-2"
                >
                  Review <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-[#00FF88] text-xs uppercase tracking-wider font-semibold">Review & Post</p>

              <div className="space-y-4">
                <div>
                  <p className="text-[#55556A] text-xs uppercase tracking-wider font-medium">Title</p>
                  <p className="text-[#E8E8EC] text-sm font-semibold mt-0.5">{title || "Untitled"}</p>
                </div>
                <div className="h-px bg-[#1E1E2A]" />
                <div>
                  <p className="text-[#55556A] text-xs uppercase tracking-wider font-medium">Description</p>
                  <p className="text-[#8A8A9A] text-sm mt-0.5 whitespace-pre-wrap">{description || "No description"}</p>
                </div>
                <div className="h-px bg-[#1E1E2A]" />
                <div>
                  <p className="text-[#55556A] text-xs uppercase tracking-wider font-medium mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length > 0 ? skills.map(s => (
                      <span key={s} className="bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs font-medium">{s}</span>
                    )) : (
                      <span className="text-[#55556A] text-xs">None selected</span>
                    )}
                  </div>
                </div>
                <div className="h-px bg-[#1E1E2A]" />
                <div>
                  <p className="text-[#55556A] text-xs uppercase tracking-wider font-medium">Category</p>
                  <span className="inline-block mt-1 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs font-medium">
                    {JOB_CATEGORIES.find(c => c.value === category)?.label ?? category}
                  </span>
                </div>
                <div className="h-px bg-[#1E1E2A]" />

                {/* Price grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Starting", value: formatMoney(startingPrice), color: "text-[#E8E8EC]" },
                    { label: "Floor", value: formatMoney(minimumPrice), color: "text-[#E8E8EC]" },
                    { label: "Decay Rate", value: `$${decayRate}/hr`, color: "text-red-400/70" },
                    { label: "Est. Hours", value: `${estimatedHours}h`, color: "text-[#E8E8EC]" },
                    { label: "Pricing", value: pricingMode === "adaptive" ? "Adaptive" : "Fixed", color: pricingMode === "adaptive" ? "text-[#00FF88]" : "text-[#8A8A9A]" },
                    { label: "Deadline", value: `${deadline}h`, color: "text-[#E8E8EC]" },
                  ].map(d => (
                    <div key={d.label} className="bg-[#0A0A0F] rounded-xl p-3 border border-[#1E1E2A]">
                      <p className="text-[#55556A] text-[10px] uppercase tracking-wider">{d.label}</p>
                      <p className={`font-heading text-lg font-bold mt-0.5 ${d.color}`}>{d.value}</p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-[#1E1E2A]" />

                {/* Visibility */}
                <div>
                  <p className="text-[#55556A] text-xs uppercase tracking-wider font-medium mb-3">Visibility</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVisibility("public")}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        visibility === "public"
                          ? "border-[#00FF88] bg-[#00FF88]/5"
                          : "border-[#1E1E2A] bg-[#0A0A0F] hover:border-[#8A8A9A]/30"
                      }`}
                    >
                      <Globe className={`h-5 w-5 mx-auto mb-1.5 ${visibility === "public" ? "text-[#00FF88]" : "text-[#55556A]"}`} />
                      <p className={`text-sm font-medium ${visibility === "public" ? "text-[#E8E8EC]" : "text-[#8A8A9A]"}`}>Public</p>
                      <p className="text-[#55556A] text-xs mt-0.5">Anyone can see</p>
                    </button>
                    <button
                      onClick={() => setVisibility("invite_only")}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        visibility === "invite_only"
                          ? "border-[#00FF88] bg-[#00FF88]/5"
                          : "border-[#1E1E2A] bg-[#0A0A0F] hover:border-[#8A8A9A]/30"
                      }`}
                    >
                      <Lock className={`h-5 w-5 mx-auto mb-1.5 ${visibility === "invite_only" ? "text-[#00FF88]" : "text-[#55556A]"}`} />
                      <p className={`text-sm font-medium ${visibility === "invite_only" ? "text-[#E8E8EC]" : "text-[#8A8A9A]"}`}>Invite Only</p>
                      <p className="text-[#55556A] text-xs mt-0.5">Selected freelancers</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px bg-[#1E1E2A]" />

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 h-11 border border-[#1E1E2A] text-[#E8E8EC] font-semibold rounded-xl hover:bg-[#1A1A24] transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={onSubmit}
                  disabled={loading || !title.trim()}
                  className="flex-1 h-12 bg-[#00FF88] text-[#0A0A0F] font-bold rounded-xl hover:bg-[#00CC6A] transition-all glow-green disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Zap className="h-4 w-4" /> Post Job</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
