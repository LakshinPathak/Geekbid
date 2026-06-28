"use client";
import { useMemo, useState } from "react";
import { getCurrentPrice, JOB_CATEGORIES, type Job } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";
import { ChevronDown, TrendingDown, Flame, BarChart2 } from "lucide-react";

interface Props {
 jobs: Job[]; // all open jobs
 now: Date;
 mySkills?: string[]; // freelancer's own skills — highlights matched rows
}

interface CategoryStat {
 category: string;
 label: string;
 jobCount: number;
 avgPrice: number;
 avgDecay: number;
 avgBids: number;
 minPrice: number;
 maxPrice: number;
 catJobs: Job[];
 hasMySkill: boolean; // true if freelancer has a skill in this category
}

interface SkillStat {
 skill: string;
 count: number;
 avgPrice: number;
 isMine: boolean; // true if this is the freelancer's skill
}

function getCategoryLabel(cat: string) {
 return JOB_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

function competitionBadge(avgBids: number) {
 if (avgBids >= 5) return { text: "High", bg: "bg-[rgba(192,57,43,0.2)]", text2: "text-[#e57373]" };
 if (avgBids >= 2) return { text: "Medium", bg: "bg-[rgba(201,168,76,0.12)]", text2: "text-[#c9a84c]" };
 return { text: "Low", bg: "bg-[rgba(47,125,84,0.12)]", text2: "text-[#4caf7d]" };
}

export default function CompetitorAnalysis({ jobs, now, mySkills = [] }: Props) {
 const [expandedCat, setExpandedCat] = useState<string | null>(null);

 // All open jobs = the market
 const mktJobs = useMemo(() => jobs.filter(j => j.status === "open"), [jobs]);

 // ── Category stats ───────────────────────────────────
 const categoryStats = useMemo((): CategoryStat[] => {
 const map: Record<string, Job[]> = {};
 for (const job of mktJobs) {
 const cat = job.category ?? "other";
 if (!map[cat]) map[cat] = [];
 map[cat].push(job);
 }
 return Object.entries(map).map(([cat, catJobs]) => {
 const prices = catJobs.map(j => getCurrentPrice(j, now));
 const hasMySkill = mySkills.length > 0 && catJobs.some(j =>
 j.skillsRequired.some(s => mySkills.includes(s))
 );
 return {
 category: cat,
 label: getCategoryLabel(cat),
 jobCount: catJobs.length,
 avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
 avgDecay: catJobs.reduce((a, j) => a + j.decayRatePerHour, 0) / catJobs.length,
 avgBids: catJobs.reduce((a, j) => a + (j.bidCount ?? 0), 0) / catJobs.length,
 minPrice: Math.min(...prices),
 maxPrice: Math.max(...prices),
 catJobs,
 hasMySkill,
 };
 }).sort((a, b) => b.jobCount - a.jobCount);
 }, [mktJobs, now, mySkills]);

 // ── Skill stats ──────────────────────────────────────
 const skillStats = useMemo((): SkillStat[] => {
 const map: Record<string, { count: number; totalPrice: number }> = {};
 for (const job of mktJobs) {
 const price = getCurrentPrice(job, now);
 for (const skill of job.skillsRequired) {
 if (!map[skill]) map[skill] = { count: 0, totalPrice: 0 };
 map[skill].count++;
 map[skill].totalPrice += price;
 }
 }
 return Object.entries(map)
 .map(([skill, { count, totalPrice }]) => ({
 skill, count,
 avgPrice: totalPrice / count,
 isMine: mySkills.includes(skill),
 }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 10);
 }, [mktJobs, now, mySkills]);

 if (mktJobs.length === 0) return null;

 const overallAvg = mktJobs.reduce((s, j) => s + getCurrentPrice(j, now), 0) / mktJobs.length;
 const overallDecay = mktJobs.reduce((s, j) => s + j.decayRatePerHour, 0) / mktJobs.length;
 const maxAvgPrice = Math.max(...categoryStats.map(c => c.avgPrice), 1);
 const maxSkillCount = Math.max(...skillStats.map(s => s.count), 1);

 return (
 <div className="space-y-4">

 {/* ── Section header ─────────────────────────────── */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-sm font-normal font-heading text-[#f0e8d4] uppercase tracking-wider flex items-center gap-2">
 <BarChart2 className="h-4 w-4 text-[#c9a84c]" />
 Market Pricing Intelligence
 </h2>
 <p className="text-[11px] text-[#a8997e] mt-0.5">
 Bid smarter — {mktJobs.length} live jobs across {categoryStats.length} categories
 </p>
 </div>
 {/* Summary pills */}
 <div className="flex items-center gap-2">
 <div className="px-3 py-1.5 rounded-[3px] bg-[#111625] border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Market Avg</p>
 <p className="font-heading text-sm font-normal text-[#f0e8d4]">{formatMoney(overallAvg)}</p>
 </div>
 <div className="px-3 py-1.5 rounded-[3px] bg-[rgba(192,57,43,0.1)] border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Avg Decay</p>
 <p className="font-heading text-sm font-normal text-[#e57373]">-{formatMoney(overallDecay)}/hr</p>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

 {/* ── LEFT: Category breakdown ────────────────── */}
 <div className="space-y-2">
 <p className="text-[11px] text-[#a8997e] font-semibold uppercase tracking-wider px-1">
 By Category
 </p>

 {categoryStats.map(cat => {
 const comp = competitionBadge(cat.avgBids);
 const barPct = Math.round((cat.avgPrice / maxAvgPrice) * 100);
 const isOpen = expandedCat === cat.category;

 return (
 <div key={cat.category}
 className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] overflow-hidden"
 >
 {/* Row */}
 <button
 onClick={() => setExpandedCat(isOpen ? null : cat.category)}
 className="w-full flex items-center gap-4 px-4 py-3 hover:bg-[#111625] transition-colors text-left"
 >
 {/* Left: name + bar */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-sm font-semibold text-[#f0e8d4]">{cat.label}</span>
 <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.22)]">
 {cat.jobCount} job{cat.jobCount !== 1 ? "s" : ""}
 </span>
 <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium ${comp.bg} ${comp.text2} border border-[rgba(201,168,76,0.22)]`}>
 {comp.text} comp.
 </span>
 {cat.hasMySkill && (
 <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-medium bg-[#2e7d52]/20 text-[#4caf7d] border border-[rgba(201,168,76,0.22)]">
 ✓ My Skills
 </span>
 )}
 </div>
 {/* Price bar */}
 <div className="h-0.5 w-full bg-[#1a1f30]">
 <div
 className="h-full rounded-full bg-[#c9a84c] transition-all duration-500"
 style={{ width: `${barPct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#a8997e] mt-1">
 <span>Min {formatMoney(cat.minPrice)}</span>
 <span>Max {formatMoney(cat.maxPrice)}</span>
 </div>
 </div>

 {/* Right: avg price + decay */}
 <div className="shrink-0 text-right">
 <p className="font-heading text-base font-normal text-[#f0e8d4]">{formatMoney(cat.avgPrice)}</p>
 <p className="text-[10px] text-[#e57373] flex items-center justify-end gap-0.5">
 <TrendingDown className="h-2.5 w-2.5" />
 -{formatMoney(cat.avgDecay)}/hr
 </p>
 </div>

 <ChevronDown className={`h-4 w-4 text-[#a8997e] transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
 </button>

 {/* Expanded: job-level breakdown */}
 {isOpen && (
 <div className="border-t border-[rgba(201,168,76,0.15)] bg-[#0a0e1a] px-4 py-3 overflow-x-auto">
 {/* Column headers */}
 <div className="grid grid-cols-[1fr_90px_80px_72px] gap-2 pb-1.5 border-b border-[rgba(201,168,76,0.15)] mb-2 min-w-[320px]">
 {["Job", "Price", "Decay/hr", "Bids"].map(h => (
 <span key={h} className="text-[10px] text-[#a8997e] font-semibold uppercase last:text-right">
 {h}
 </span>
 ))}
 </div>
 {cat.catJobs.map(j => (
 <div
 key={j.id ?? j._id}
 className="grid grid-cols-[1fr_90px_80px_72px] gap-2 py-1.5 border-b border-[rgba(201,168,76,0.15)] last:border-0 min-w-[320px]"
 >
 <span className="text-[11px] text-[#f0e8d4] truncate">{j.title}</span>
 <span className="text-[11px] font-normal font-heading text-[#f0e8d4]">
 {formatMoney(getCurrentPrice(j, now))}
 </span>
 <span className="text-[11px] text-[#e57373]">
 -{formatMoney(j.decayRatePerHour)}
 </span>
 <span className="text-[11px] text-[#a8997e] text-right">
 {j.bidCount ?? 0}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* ── RIGHT: Skill demand ─────────────────────── */}
 <div className="space-y-3">
 <p className="text-[11px] text-[#a8997e] font-semibold uppercase tracking-wider px-1 flex items-center gap-1.5">
 <Flame className="h-3.5 w-3.5 text-[#c9a84c]" />
 Hot Skills by Demand
 </p>

 <div className="space-y-1.5">
 {skillStats.map((skill, i) => {
 const barPct = Math.round((skill.count / maxSkillCount) * 100);
 return (
 <div
 key={skill.skill}
 className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] px-3 py-2.5"
 >
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-[10px] font-bold text-[#a8997e] w-5 shrink-0">
 #{i + 1}
 </span>
 <span className={`flex-1 text-xs font-semibold truncate ${
 skill.isMine ? "text-[#4caf7d]" : "text-[#f0e8d4]"
 }`}>
 {skill.skill}{skill.isMine ? " ✓" : ""}
 </span>
 <span className="text-[10px] text-[#a8997e] shrink-0">
 {skill.count} job{skill.count !== 1 ? "s" : ""}
 </span>
 <span className="text-[10px] font-bold text-[#c9a84c] shrink-0">
 {formatMoney(skill.avgPrice)}
 </span>
 </div>
 {/* Demand bar */}
 <div className="h-1 w-full bg-[#1a1f30] rounded-full overflow-hidden">
 <div
 className="h-full rounded-full bg-[#c9a84c]/60 transition-all duration-500"
 style={{ width: `${barPct}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>

 {/* Pricing insight callout */}
 <div className="p-3.5 rounded-[6px] bg-[#0a0e1a] border border-[rgba(201,168,76,0.22)]">
 <p className="text-[11px] font-bold text-[#c9a84c] mb-1.5 flex items-center gap-1.5">
 💡 Pricing Insight
 </p>
 <p className="text-[11px] text-[#a8997e] leading-relaxed">
 Market avg decay is <strong>{formatMoney(overallDecay)}/hr</strong>. 
 Most competitive category: <strong>{categoryStats[0]?.label ?? "—"}</strong> with{" "}
 <strong>{categoryStats[0]?.avgBids.toFixed(1) ?? "—"} avg bids</strong> per job.
 Bid below <strong>{formatMoney(categoryStats[0]?.avgPrice ?? 0)}</strong> in that category to rank #1.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
