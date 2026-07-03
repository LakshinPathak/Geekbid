"use client";
import { formatMoney } from "@/lib/utils";
import { Target, Zap, Trophy, DollarSign } from "lucide-react";

interface FreelancerStatsProps {
 matches: number;
 bidsUsed: number;
 bidLimit: number;
 winRate: number;
 earningPotential: number;
}

export default function FreelancerStats({
 matches,
 bidsUsed,
 bidLimit,
 winRate,
 earningPotential,
}: FreelancerStatsProps) {
 const bidPct = bidLimit > 0 ? Math.round((bidsUsed / bidLimit) * 100) : 0;

 const stats = [
 {
 label: "Matches",
 value: `${matches}`,
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
 color: bidPct >= 80 ? "text-[#B02020]" : bidPct >= 50 ? "text-[#c9a84c]" : "text-[#c9a84c]",
 bg: bidPct >= 80 ? "bg-[rgba(176,32,32,0.08)]" : bidPct >= 50 ? "bg-[rgba(201,168,76,0.12)]" : "bg-[rgba(201,168,76,0.12)]",
 border: bidPct >= 80 ? "border-[rgba(176,32,32,0.20)]" : bidPct >= 50 ? "border-[rgba(201,168,76,0.30)]" : "border-[rgba(201,168,76,0.22)]",
 sub: `${bidPct}% used this month`,
 progress: bidPct,
 },
 {
 label: "Win Rate",
 value: `${winRate}%`,
 icon: Trophy,
 color: winRate >= 30 ? "text-[#c9a84c]" : winRate >= 15 ? "text-[#c9a84c]" : "text-[#a8997e]",
 bg: winRate >= 30 ? "bg-[rgba(201,168,76,0.12)]" : winRate >= 15 ? "bg-[rgba(201,168,76,0.12)]" : "bg-[#111625]",
 border: winRate >= 30 ? "border-[rgba(201,168,76,0.30)]" : winRate >= 15 ? "border-[rgba(201,168,76,0.30)]" : "border-[rgba(201,168,76,0.22)]",
 sub: "accepted rate",
 },
 {
 label: "Earning Potential",
 value: formatMoney(earningPotential),
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
 <div key={s.label} className={`glass-panel rounded-[6px] p-4 border ${s.border} flex flex-col gap-2`}>
 <div className="flex items-center gap-2">
 <div className={`w-8 h-8 rounded-[3px] ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
 <s.icon className={`h-4 w-4 ${s.color}`} />
 </div>
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider font-semibold">{s.label}</p>
 </div>
 <p className={`font-heading text-xl font-bold ${s.color} leading-tight`}>{s.value}</p>
 {s.progress !== undefined && (
 <div className="h-1 w-full bg-[#111625] rounded-full overflow-hidden">
 <div
 className={`h-full rounded-full transition-all duration-500 ${s.progress >= 80 ? "bg-red-500" : s.progress >= 50 ? "bg-yellow-500" : "bg-blue-500"}`}
 style={{ width: `${s.progress}%` }}
 />
 </div>
 )}
 <p className="text-[10px] text-[#a8997e]">{s.sub}</p>
 </div>
 ))}
 </div>
 );
}
