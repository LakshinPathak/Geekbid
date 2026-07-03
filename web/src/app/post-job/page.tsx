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
import AIDescriptionButton from "@/components/ai/AIDescriptionButton";
import AIPricingAdvisor from "@/components/ai/AIPricingAdvisor";

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
 <div className="bg-[#080b14] glass-card scanline">
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <TrendingDown className="h-4 w-4 text-[#c9a84c]" />
 <p className="text-[#a8997e] text-xs font-semibold uppercase tracking-wider font-heading">Decay Curve Preview</p>
 </div>
 <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.30)]">
 <div className="h-1.5 w-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
 <span className="text-[11px] text-[#c9a84c] font-semibold">INTERACTIVE</span>
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
 stroke="rgba(201,168,76,0.22)" strokeWidth={1} strokeDasharray="3,3" />
 <text x={PAD.l - 6} y={scaleY(t) + 3.5} textAnchor="end"
 fill="#6E6E85" fontSize={9} fontFamily="monospace">
 ${t}
 </text>
 </g>
 ))}
 {xTicks.map(t => (
 <g key={`x-${t}`}>
 <line x1={scaleX(t)} y1={PAD.t} x2={scaleX(t)} y2={H - PAD.b}
 stroke="rgba(201,168,76,0.22)" strokeWidth={1} strokeDasharray="2,4" />
 <text x={scaleX(t)} y={H - PAD.b + 14} textAnchor="middle"
 fill="#6E6E85" fontSize={9} fontFamily="monospace">
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
 className="decay-curve-line"
 fill="none" stroke="#c9a84c" strokeWidth={2.5}
 strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

 {/* Milestone dots */}
 {milestones.map(m => (
 <g key={m.label}>
 <circle cx={scaleX(m.h)} cy={scaleY(m.p)} r={3.5}
 fill="#111625" stroke="rgba(201,168,76,0.35)" strokeWidth={1.5} />
 <text x={scaleX(m.h)} y={scaleY(m.p) - 8} textAnchor="middle"
 fill="#8A8A9A" fontSize={8} fontWeight="600">
 {formatMoney(Math.round(m.p))}
 </text>
 </g>
 ))}

 {/* Scrubber line + dot */}
 <line x1={scaleX(scrubHour)} y1={PAD.t} x2={scaleX(scrubHour)} y2={H - PAD.b}
 stroke="#c9a84c" strokeWidth={1} opacity={0.3} strokeDasharray="3,3" />
 {/* Radial glow behind scrubber */}
 <circle cx={scaleX(scrubHour)} cy={scaleY(scrubPrice)} r={16}
 fill="url(#scrubGlow)" />
 {/* Animated ripple */}
 <circle cx={scaleX(scrubHour)} cy={scaleY(scrubPrice)} r={5}
 fill="none" stroke="#c9a84c" strokeWidth={1} opacity={0.5}>
 <animate attributeName="r" from="5" to="18" dur="2s" repeatCount="indefinite" />
 <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
 </circle>
 {/* Main scrubber dot */}
 <circle cx={scaleX(scrubHour)} cy={scaleY(scrubPrice)} r={5}
 fill="#c9a84c" stroke="#080b14" strokeWidth={2} filter="url(#glow)" />
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
 fill="#111625" stroke="#c9a84c" strokeWidth={0.5} opacity={0.95} />
 <text x={tx} y={ty + 4} textAnchor="middle"
 fill="#c9a84c" fontSize={10} fontWeight="700" fontFamily="monospace">
 {formatMoney(Math.round(scrubPrice))} @ {scrubHour.toFixed(1)}h
 </text>
 </g>
 );
 })()}

 {/* Gradient + filter definitions */}
 <defs>
 <linearGradient id="fixedGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.35} />
 <stop offset="40%" stopColor="#c9a84c" stopOpacity={0.15} />
 <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
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
 <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.4} />
 <stop offset="100%" stopColor="#c9a84c" stopOpacity={0} />
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
 background: `linear-gradient(to right, #c9a84c ${(scrubHour / maxHours) * 100}%, #1a1f30 ${(scrubHour / maxHours) * 100}%)`,
 }}
 />
 <div className="flex justify-between mt-1">
 <span className="text-[11px] text-[#a8997e]">0h (Posted)</span>
 <span className="text-[11px] text-[#a8997e]">{maxHours}h (Deadline)</span>
 </div>
 </div>

 {/* Legend */}
 {pricingMode === "adaptive" && (
 <div className="flex items-center gap-5 mt-3 px-1">
 <div className="flex items-center gap-2">
 <div className="w-5 h-[2px] bg-[#c9a84c] rounded-[3px] shadow-[0_0_6px_rgba(200,146,61,0.5)]" />
 <span className="text-[11px] text-[#a8997e]">Fixed decay</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-5 h-[2px] rounded-[3px]" style={{ background: 'linear-gradient(90deg, #38BDF8, #818CF8)' }} />
 <span className="text-[11px] text-[#a8997e]">Adaptive (3 bidders)</span>
 </div>
 </div>
 )}

 {/* Key metrics row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
 <div className="glass-panel-sm rounded-[6px] p-3 text-center">
 <p className="text-[9px] text-[#a8997e] uppercase tracking-wider">Time to Floor</p>
 <p className="text-sm font-bold text-[#f0e8d4] font-heading mt-1">
 {hoursToFloor === Infinity ? "∞" : `${hoursToFloor.toFixed(1)}h`}
 </p>
 </div>
 <div className="glass-panel-sm rounded-[6px] p-3 text-center">
 <p className="text-[9px] text-[#a8997e] uppercase tracking-wider">Decay</p>
 <p className="text-sm font-bold text-[#B02020] font-heading mt-1">-${decayRate}/hr</p>
 </div>
 <div className="glass-panel-sm rounded-[6px] p-3 text-center border-[rgba(201,168,76,0.35)]/15">
 <p className="text-[9px] text-[#a8997e] uppercase tracking-wider">@ {scrubHour.toFixed(0)}h</p>
 <p className="text-sm font-bold text-[#c9a84c] font-heading mt-1">{formatMoney(Math.round(scrubPrice))}</p>
 </div>
 <div className="glass-panel-sm rounded-[6px] p-3 text-center border-[rgba(201,168,76,0.35)]/15">
 <p className="text-[9px] text-[#a8997e] uppercase tracking-wider">Savings</p>
 <p className="text-sm font-bold text-[#c9a84c] font-heading mt-1">{savingsPercent}%</p>
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
 <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
 <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin" />
 </div>
 );

 return (
 <div className="min-h-screen bg-[#080b14] grid-bg">
 <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-20 pb-8">
 {/* Back link */}
 <Link href="/feed" className="inline-flex items-center gap-1.5 text-[#a8997e] text-sm hover:text-[#c9a84c] transition-colors mb-6">
 <ArrowLeft className="h-4 w-4" /> Back to Feed
 </Link>

 {/* Header */}
 <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#f0e8d4]">Post a New Job</h1>
 <p className="text-[#a8997e] text-sm mt-1 font-sans">Set your starting price and let the market find the true value.</p>

 {/* Progress bar */}
 <div className="mt-8 mb-2">
 <div className="wizard-progress">
 <div className="wizard-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
 </div>
 <div className="flex items-center justify-between mt-3 mb-4">
 {STEP_META.map((s) => (
 <button
 key={s.num}
 onClick={() => { if (s.num <= step) setStep(s.num as Step); }}
 className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-[6px] text-xs font-semibold transition-all font-heading ${
 step >= s.num
 ? "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.35)]/25"
 : "text-[#a8997e] glass-panel-sm"
 }`}
 >
 {step > s.num ? <Check className="h-3.5 w-3.5 shrink-0" /> : <s.icon className="h-3.5 w-3.5 shrink-0" />}
 <span className="hidden sm:inline">{s.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Form card */}
 <div className="wizard-step p-6 sm:p-8 scanline">
 {/* Step 1: Project Details */}
 {step === 1 && (
 <div className="space-y-6">
 <p className="text-[#c9a84c] text-xs uppercase tracking-wider font-semibold">Project Details</p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Job Title *</label>
 <input
 value={title}
 onChange={e => setTitle(e.target.value)}
 placeholder="e.g. Build AI chatbot for customer support"
 className="glass-input w-full"
 />
 {errors.title && <p className="text-[#B02020] text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.title}</p>}
 </div>
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Category *</label>
 <div className="relative">
 <select
 value={category}
 onChange={e => setCategory(e.target.value as JobCategory)}
 className="glass-input w-full appearance-none cursor-pointer pr-10"
 >
 {JOB_CATEGORIES.map(c => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </select>
 <ArrowRight className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e] rotate-90 pointer-events-none" />
 </div>
 </div>
 </div>

 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Description</label>
 <textarea
 value={description}
 onChange={e => setDescription(e.target.value)}
 placeholder="Describe the scope, deliverables, and requirements..."
 rows={5}
 className="glass-input w-full resize-none"
 />
 <div className="mt-2">
 <AIDescriptionButton
 title={title}
 skills={skills}
 category={category}
 estimatedHours={estimatedHours}
 onApply={(desc, suggestedSkills) => {
 setDescription(desc);
 suggestedSkills.forEach(s => { if (!skills.includes(s)) toggleSkill(s); });
 }}
 />
 </div>
 </div>

 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-2">Required Skills</label>
 {/* Selected skills */}
 {skills.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-3">
 {skills.map(s => (
 <span key={s} className="inline-flex items-center gap-1.5 bg-[#c9a84c] text-[#050810] border border-transparent rounded-[3px] px-3 py-0.5 text-xs font-sans font-semibold">
 {s}
 <button onClick={() => toggleSkill(s)} className="hover:text-[#f0e8d4] transition-colors"><X className="h-3 w-3" /></button>
 </span>
 ))}
 </div>
 )}
 {/* Search */}
 <input
 value={skillSearch}
 onChange={e => setSkillSearch(e.target.value)}
 placeholder="Search skills..."
 className="glass-input w-full h-9 px-3 mb-2 text-xs"
 />
 <div className="max-h-[180px] overflow-y-auto flex flex-wrap gap-1.5 pb-1">
 {filteredSkills.map(s => (
 <button
 key={s}
 onClick={() => toggleSkill(s)}
 className={`text-xs rounded-[3px] py-1.5 px-3 transition-all border ${
 skills.includes(s)
 ? "bg-[#c9a84c] text-[#050810] border-transparent"
 : "bg-[#0d1120] border-[rgba(201,168,76,0.22)] text-[#a8997e] hover:text-[#a8997e] hover:border-[#8A8A9A]/30"
 }`}
 >
 {skills.includes(s) && <Check className="inline h-3 w-3 mr-1" />}{s}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Estimated Hours</label>
 <div className="relative">
 <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e]" />
 <input
 type="number"
 value={estimatedHours}
 onChange={e => setEstimatedHours(Number(e.target.value))}
 className="glass-input w-full"
 style={{ paddingLeft: '44px' }}
 />
 </div>
 </div>

 <div className="h-px bg-[rgba(201,168,76,0.15)]" />

 <button
 onClick={nextStep}
 disabled={!title.trim()}
 className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
 >
 Next: Pricing <ArrowRight className="h-4 w-4" />
 </button>
 </div>
 )}

 {/* Step 2: Pricing */}
 {step === 2 && (
 <div className="space-y-6">
 <p className="text-[#c9a84c] text-xs uppercase tracking-wider font-semibold">Pricing</p>

 {/* AI Pricing Advisor */}
 <AIPricingAdvisor
 title={title}
 skills={skills}
 category={category}
 estimatedHours={estimatedHours}
 onApply={(start, floor) => {
 setStartingPrice(start);
 setMinimumPrice(floor);
 }}
 />

 {/* Pricing Mode Toggle */}
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-2.5">Pricing Mode</label>
 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={() => setPricingMode("adaptive")}
 className={`p-3.5 rounded-[6px] border text-left transition-all ${
 pricingMode === "adaptive"
 ? "border-[rgba(201,168,76,0.35)] bg-[#c9a84c]/5"
 : "border-[rgba(201,168,76,0.22)] bg-[#0d1120] hover:border-[#8A8A9A]/30"
 }`}
 >
 <div className="flex items-center gap-2 mb-1">
 <Activity className={`h-4 w-4 ${pricingMode === "adaptive" ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
 <p className={`text-sm font-semibold ${pricingMode === "adaptive" ? "text-[#f0e8d4]" : "text-[#a8997e]"}`}>Adaptive</p>
 <span className="text-[11px] bg-[#c9a84c]/20 text-[#c9a84c] px-1.5 py-0.5 rounded-[3px] font-sans font-medium">Recommended</span>
 </div>
 <p className="text-[#a8997e] text-xs leading-relaxed">Price responds to bidder demand. Decays slower with more interest.</p>
 </button>
 <button
 type="button"
 onClick={() => setPricingMode("fixed")}
 className={`p-3.5 rounded-[6px] border text-left transition-all ${
 pricingMode === "fixed"
 ? "border-[rgba(201,168,76,0.35)] bg-[#c9a84c]/5"
 : "border-[rgba(201,168,76,0.22)] bg-[#0d1120] hover:border-[#8A8A9A]/30"
 }`}
 >
 <div className="flex items-center gap-2 mb-1">
 <TrendingDown className={`h-4 w-4 ${pricingMode === "fixed" ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
 <p className={`text-sm font-semibold ${pricingMode === "fixed" ? "text-[#f0e8d4]" : "text-[#a8997e]"}`}>Fixed Decay</p>
 </div>
 <p className="text-[#a8997e] text-xs leading-relaxed">Price drops at a constant rate. Traditional reverse auction.</p>
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Starting Price ($) *</label>
 <div className="relative">
 <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e]" />
 <input
 type="number"
 value={startingPrice}
 onChange={e => setStartingPrice(Number(e.target.value))}
 className="glass-input w-full"
 style={{ paddingLeft: '44px' }}
 />
 </div>
 <p className="text-[#a8997e] text-xs mt-1">The price your job starts at</p>
 {errors.startingPrice && <p className="text-[#B02020] text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.startingPrice}</p>}
 </div>
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Minimum Price ($) *</label>
 <input
 type="number"
 value={minimumPrice}
 onChange={e => setMinimumPrice(Number(e.target.value))}
 className="glass-input w-full"
 />
 <p className="text-[#a8997e] text-xs mt-1">Price will never drop below this</p>
 {errors.minimumPrice && <p className="text-[#B02020] text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.minimumPrice}</p>}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Decay Rate ($/hour)</label>
 <div className="relative">
 <TrendingDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e]" />
 <input
 type="number"
 value={decayRate}
 onChange={e => setDecayRate(Number(e.target.value))}
 className="glass-input w-full"
 style={{ paddingLeft: '44px' }}
 />
 </div>
 <p className="text-[#a8997e] text-xs mt-1">How fast the price decreases</p>
 {errors.decayRate && <p className="text-[#B02020] text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.decayRate}</p>}
 </div>
 <div>
 <label className="text-[#a8997e] text-xs font-medium block mb-1.5">Deadline (hours)</label>
 <input
 type="number"
 value={deadline}
 onChange={e => setDeadline(Number(e.target.value))}
 className="glass-input w-full"
 />
 </div>
 </div>

 {/* Pricing Hint */}
 {pricingHint?.available && (
 <div className="bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.22)] rounded-[6px] p-4">
 <p className="text-[#c9a84c] text-xs font-semibold mb-2 flex items-center gap-1.5">
 <TrendingDown className="h-3.5 w-3.5" /> Based on {pricingHint.sampleSize} similar job{pricingHint.sampleSize !== 1 ? "s" : ""}
 </p>
 <div className="grid grid-cols-3 gap-3">
 <div>
 <p className="text-[#a8997e] text-[11px]">Avg Final Price</p>
 <p className="font-serif font-normal text-lg text-[#f0e8d4]">${pricingHint.avgFinalPrice}</p>
 </div>
 <div>
 <p className="text-[#a8997e] text-[11px]">Price Range</p>
 <p className="font-serif font-normal text-lg text-[#f0e8d4]">${pricingHint.minPrice}–${pricingHint.maxPrice}</p>
 </div>
 <div>
 <p className="text-[#a8997e] text-[11px]">Avg Decay Rate</p>
 <p className="font-serif font-normal text-lg text-[#f0e8d4]">${pricingHint.avgDecayRate}/hr</p>
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

 <div className="h-px bg-[rgba(201,168,76,0.15)]" />

 <div className="flex gap-3">
 <button
 onClick={() => setStep(1)}
 className="btn-ghost flex-1 flex items-center justify-center gap-2"
 >
 <ArrowLeft className="h-4 w-4" /> Back
 </button>
 <button
 onClick={nextStep}
 className="btn-primary flex-1 flex items-center justify-center gap-2"
 >
 Review <ArrowRight className="h-4 w-4" />
 </button>
 </div>
 </div>
 )}

 {/* Step 3: Review & Submit */}
 {step === 3 && (
 <div className="space-y-6">
 <p className="text-[#c9a84c] text-xs uppercase tracking-wider font-semibold">Review & Post</p>

 <div className="space-y-4">
 <div>
 <p className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">Title</p>
 <p className="text-[#f0e8d4] text-sm font-semibold mt-0.5">{title || "Untitled"}</p>
 </div>
 <div className="h-px bg-[rgba(201,168,76,0.15)]" />
 <div>
 <p className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">Description</p>
 <p className="text-[#a8997e] text-sm mt-0.5 whitespace-pre-wrap">{description || "No description"}</p>
 </div>
 <div className="h-px bg-[rgba(201,168,76,0.15)]" />
 <div>
 <p className="text-[#a8997e] text-xs uppercase tracking-wider font-medium mb-2">Skills</p>
 <div className="flex flex-wrap gap-1.5">
 {skills.length > 0 ? skills.map(s => (
 <span key={s} className="bg-[#c9a84c] text-[#050810] border border-transparent rounded-[3px] px-3 py-0.5 text-xs font-sans font-semibold">{s}</span>
 )) : (
 <span className="text-[#a8997e] text-xs">None selected</span>
 )}
 </div>
 </div>
 <div className="h-px bg-[rgba(201,168,76,0.15)]" />
 <div>
 <p className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">Category</p>
 <span className="inline-block mt-1 bg-[#c9a84c] text-[#050810] border border-transparent rounded-[3px] px-3 py-0.5 text-xs font-sans font-semibold">
 {JOB_CATEGORIES.find(c => c.value === category)?.label ?? category}
 </span>
 </div>
 <div className="h-px bg-[rgba(201,168,76,0.15)]" />

 {/* Price grid */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {[
 { label: "Starting", value: formatMoney(startingPrice), color: "text-[#f0e8d4]" },
 { label: "Floor", value: formatMoney(minimumPrice), color: "text-[#f0e8d4]" },
 { label: "Decay Rate", value: `$${decayRate}/hr`, color: "text-[#B02020]" },
 { label: "Est. Hours", value: `${estimatedHours}h`, color: "text-[#f0e8d4]" },
 { label: "Pricing", value: pricingMode === "adaptive" ? "Adaptive" : "Fixed", color: pricingMode === "adaptive" ? "text-[#c9a84c]" : "text-[#a8997e]" },
 { label: "Deadline", value: `${deadline}h`, color: "text-[#f0e8d4]" },
 ].map(d => (
 <div key={d.label} className="glass-panel-sm rounded-[6px] p-3">
 <p className="text-[#a8997e] text-[11px] uppercase tracking-wider">{d.label}</p>
 <p className={`font-serif font-normal text-lg mt-0.5 ${d.color}`}>{d.value}</p>
 </div>
 ))}
 </div>

 <div className="h-px bg-[rgba(201,168,76,0.15)]" />

 {/* Visibility */}
 <div>
 <p className="text-[#a8997e] text-xs uppercase tracking-wider font-medium mb-3">Visibility</p>
 <div className="grid grid-cols-2 gap-3">
 <button
 onClick={() => setVisibility("public")}
 className={`p-4 rounded-[6px] border text-center transition-all ${
 visibility === "public"
 ? "border-[rgba(201,168,76,0.35)] bg-[#c9a84c]/5"
 : "border-[rgba(201,168,76,0.22)] bg-[#0d1120] hover:border-[#8A8A9A]/30"
 }`}
 >
 <Globe className={`h-5 w-5 mx-auto mb-1.5 ${visibility === "public" ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
 <p className={`text-sm font-medium ${visibility === "public" ? "text-[#f0e8d4]" : "text-[#a8997e]"}`}>Public</p>
 <p className="text-[#a8997e] text-xs mt-0.5">Anyone can see</p>
 </button>
 <button
 onClick={() => setVisibility("invite_only")}
 className={`p-4 rounded-[6px] border text-center transition-all ${
 visibility === "invite_only"
 ? "border-[rgba(201,168,76,0.35)] bg-[#c9a84c]/5"
 : "border-[rgba(201,168,76,0.22)] bg-[#0d1120] hover:border-[#8A8A9A]/30"
 }`}
 >
 <Lock className={`h-5 w-5 mx-auto mb-1.5 ${visibility === "invite_only" ? "text-[#c9a84c]" : "text-[#a8997e]"}`} />
 <p className={`text-sm font-medium ${visibility === "invite_only" ? "text-[#f0e8d4]" : "text-[#a8997e]"}`}>Invite Only</p>
 <p className="text-[#a8997e] text-xs mt-0.5">Selected freelancers</p>
 </button>
 </div>
 </div>
 </div>

 <div className="h-px bg-[rgba(201,168,76,0.15)]" />

 <div className="flex gap-3">
 <button
 onClick={() => setStep(2)}
 className="btn-ghost flex-1 flex items-center justify-center gap-2"
 >
 <ArrowLeft className="h-4 w-4" /> Back
 </button>
 <button
 onClick={onSubmit}
 disabled={loading || !title.trim()}
 className="btn-primary payment-ready flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
