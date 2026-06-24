"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { formatMoney, SKILL_TAXONOMY } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Check, Zap, DollarSign, Clock, Target,
  TrendingDown, Eye, EyeOff, Globe, Lock, X, AlertCircle, Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3;

const STEP_META = [
  { num: 1, label: "Details", icon: Target },
  { num: 2, label: "Pricing", icon: DollarSign },
  { num: 3, label: "Review", icon: Check },
];

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
  const [skillSearch, setSkillSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) return SKILL_TAXONOMY;
    return SKILL_TAXONOMY.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()));
  }, [skillSearch]);

  const hoursToFloor = useMemo(() => {
    if (decayRate <= 0) return Infinity;
    return (startingPrice - minimumPrice) / decayRate;
  }, [startingPrice, minimumPrice, decayRate]);

  const pricePreviewPercent = useMemo(() => {
    if (startingPrice <= minimumPrice) return 0;
    return ((startingPrice - minimumPrice) / startingPrice) * 100;
  }, [startingPrice, minimumPrice]);

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
      visibility,
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

              {/* Price Preview */}
              <div className="bg-[#0A0A0F] rounded-xl p-5 border border-[#1E1E2A]">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="h-4 w-4 text-[#00FF88]" />
                  <p className="text-[#8A8A9A] text-xs font-semibold uppercase tracking-wider">Price Preview</p>
                </div>

                {/* Visual timeline */}
                <div className="relative mb-4">
                  <div className="h-2 bg-[#1E1E2A] rounded-full w-full">
                    <div
                      className="h-2 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pricePreviewPercent, 5)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <div className="text-center">
                      <div className="h-3 w-px bg-[#00FF88] mx-auto mb-1" />
                      <p className="text-[#00FF88] text-xs font-bold font-heading">{formatMoney(startingPrice)}</p>
                      <p className="text-[#55556A] text-[10px]">Start</p>
                    </div>
                    <div className="text-center">
                      <div className="h-3 w-px bg-[#55556A] mx-auto mb-1" />
                      <p className="text-[#E8E8EC] text-xs font-bold font-heading">{formatMoney(minimumPrice)}</p>
                      <p className="text-[#55556A] text-[10px]">Floor</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-[#55556A]">Time to floor</span>
                  <span className="font-heading font-bold text-[#E8E8EC]">
                    {hoursToFloor === Infinity ? "∞" : `${hoursToFloor.toFixed(1)}h`}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#55556A]">Decay rate</span>
                  <span className="font-heading font-bold text-red-400/70">-${decayRate}/hr</span>
                </div>
              </div>

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

                {/* Price grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Starting", value: formatMoney(startingPrice), color: "text-[#E8E8EC]" },
                    { label: "Floor", value: formatMoney(minimumPrice), color: "text-[#E8E8EC]" },
                    { label: "Decay Rate", value: `$${decayRate}/hr`, color: "text-red-400/70" },
                    { label: "Est. Hours", value: `${estimatedHours}h`, color: "text-[#E8E8EC]" },
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
