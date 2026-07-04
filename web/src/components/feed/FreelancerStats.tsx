"use client";
import { formatMoney } from "@/lib/utils";
import { Target, Zap, Trophy, DollarSign } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { SkeletonKpiCard } from "./SkeletonCard";

interface FreelancerStatsProps {
 matches: number;
 bidsUsed: number;
 bidLimit: number;
 winRate: number;
 earningPotential: number;
 loading?: boolean;
}

export default function FreelancerStats({
 matches,
 bidsUsed,
 bidLimit,
 winRate,
 earningPotential,
 loading = false,
}: FreelancerStatsProps) {
 if (loading) {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {Array.from({ length: 4 }, (_, i) => <SkeletonKpiCard key={i} />)}
 </div>
 );
 }

 const bidPct = bidLimit > 0 ? Math.round((bidsUsed / bidLimit) * 100) : 0;

 const stats = [
 {
 label: "Matches",
 raw: matches,
 icon: Target,
 color: "text-[#c9a84c]",
 bg: "bg-[rgba(201,168,76,0.12)]",
 border: "border-[rgba(201,168,76,0.30)]",
 sub: "skill-matched jobs",
 },
 {
 label: "Bids Used",
 value: `${bidsUsed}/${bidLimit}`,
 icon: Zap,
 color: bidPct >= 80 ? "text-[#B02020]" : "text-[#c9a84c]",
 bg: bidPct >= 80 ? "bg-[rgba(176,32,32,0.08)]" : "bg-[rgba(201,168,76,0.12)]",
 border: bidPct >= 80 ? "border-[rgba(176,32,32,0.20)]" : "border-[rgba(201,168,76,0.30)]",
 sub: `${bidPct}% used this month`,
 progress: bidPct,
 },
 {
 label: "Win Rate",
 raw: winRate,
 format: (n: number) => `${Math.round(n)}%`,
 icon: Trophy,
 color: winRate >= 15 ? "text-[#c9a84c]" : "text-[#a8997e]",
 bg: winRate >= 15 ? "bg-[rgba(201,168,76,0.12)]" : "bg-[#111625]",
 border: "border-[rgba(201,168,76,0.30)]",
 sub: "accepted rate",
 },
 {
 label: "Earning Potential",
 raw: earningPotential,
 format: formatMoney,
 icon: DollarSign,
 color: "text-[#2F7D54]",
 bg: "bg-[rgba(47,125,84,0.10)]",
 border: "border-[rgba(47,125,84,0.25)]",
 sub: "sum of matched jobs",
 },
 ];

 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {stats.map(s => (
 <div key={s.label} className={`glass-panel feed-glass-card rounded-[6px] p-4 border ${s.border} flex flex-col gap-2 relative overflow-hidden`}>
 <s.icon className={`absolute -right-2 -bottom-2 h-14 w-14 ${s.color} opacity-[0.06] pointer-events-none`} aria-hidden="true" />
 <div className="flex items-center gap-2 relative">
 <div className={`w-8 h-8 rounded-[3px] ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
 <s.icon className={`h-4 w-4 ${s.color}`} />
 </div>
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider font-semibold">{s.label}</p>
 </div>
 <p className={`font-heading text-xl font-bold ${s.color} leading-tight relative`}>
 {s.raw !== undefined ? <AnimatedCounter value={s.raw} format={s.format} /> : s.value}
 </p>
 {s.progress !== undefined && (
 <div className="h-1 w-full bg-[#111625] rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all duration-500 ${s.progress >= 80 ? "bg-red-500" : s.progress >= 50 ? "bg-yellow-500" : "bg-blue-500"}`}
 style={{ width: `${s.progress}%` }}
 />
 </div>
 )}
 <p className="text-[10px] text-[#a8997e] relative">{s.sub}</p>
 </div>
 ))}
 </div>
 );
}
