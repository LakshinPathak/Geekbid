"use client";
import { formatMoney } from "@/lib/utils";
import { DollarSign, TrendingDown, PiggyBank, Zap } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { SkeletonKpiCard } from "./SkeletonCard";

interface SpendAnalyticsProps {
 totalBudgetPosted: number;
 avgBidPrice: number;
 totalSavings: number;
 avgDecayRate: number;
 openJobs: number;
 /** Real per-month spend, computed by the caller from actual job postings
     (see ClientFeed.tsx) — never mocked/randomized here. */
 monthlySpend: { key: string; month: string; value: number }[];
 loading?: boolean;
}

export default function SpendAnalytics({
 totalBudgetPosted,
 avgBidPrice,
 totalSavings,
 avgDecayRate,
 openJobs,
 monthlySpend,
 loading = false,
}: SpendAnalyticsProps) {
 if (loading) {
 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {Array.from({ length: 4 }, (_, i) => <SkeletonKpiCard key={i} />)}
 </div>
 );
 }

 const stats = [
 {
 label: "Budget Posted",
 raw: totalBudgetPosted,
 format: formatMoney,
 icon: DollarSign,
 color: "text-[#3d3a45]",
 bg: "bg-[rgba(75,63,143,0.12)]",
 border: "border-[rgba(75,63,143,0.22)]",
 show: true,
 },
 {
 label: "Avg Bid Price",
 raw: avgBidPrice,
 format: formatMoney,
 icon: TrendingDown,
 color: "text-[#46424e]",
 bg: "bg-[#f4f2ee]",
 border: "border-[rgba(75,63,143,0.15)]",
 show: avgBidPrice > 0,
 },
 {
 label: "Total Savings",
 raw: totalSavings,
 format: (n: number) => `-${formatMoney(n)}`,
 icon: PiggyBank,
 color: "text-[#4b3f8f]",
 bg: "bg-[rgba(75,63,143,0.15)]",
 border: "border-[rgba(75,63,143,0.25)]",
 show: totalSavings > 0,
 },
 {
 label: "Avg Decay",
 raw: avgDecayRate,
 format: (n: number) => `-${formatMoney(n)}/hr`,
 icon: Zap,
 color: "text-[#96543f]",
 bg: "bg-[#c14d3a]/12",
 border: "border-[#c14d3a]/22",
 show: openJobs > 0,
 },
 ];

 const maxChart = Math.max(...monthlySpend.map(d => d.value), 1);

 return (
 <div className="space-y-3">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {stats.map(s => (
 <div
 key={s.label}
 className={`glass-panel feed-glass-card rounded-2xl p-4 border ${s.border} flex items-center gap-3 relative overflow-hidden`}
 >
 <s.icon className={`absolute -right-2 -bottom-2 h-14 w-14 ${s.color} opacity-[0.06] pointer-events-none`} aria-hidden="true" />
 <div className={`w-9 h-9 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center shrink-0 relative`}>
 <s.icon className={`h-4 w-4 ${s.color}`} />
 </div>
 <div className="min-w-0 relative">
 <p className="text-[10px] text-[#46424e] uppercase tracking-wider font-semibold whitespace-nowrap">{s.label}</p>
 {s.show ? (
 <p className={`font-heading text-base font-normal ${s.color} leading-tight`}>
 <AnimatedCounter value={s.raw} format={s.format} />
 </p>
 ) : (
 <p className={`font-heading text-base font-normal ${s.color} leading-tight`}>—</p>
 )}
 </div>
 </div>
 ))}
 </div>

 <div className="glass-panel feed-glass-card rounded-2xl p-4 border border-[rgba(75,63,143,0.22)]">
 <p className="text-[10px] text-[#46424e] uppercase tracking-wider font-semibold mb-3">Monthly Spend</p>
 <div className="flex items-end gap-2 h-28">
 {monthlySpend.map((d) => {
 const pct = maxChart > 0 ? (d.value / maxChart) * 100 : 0;
 return (
 <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
 <p className="text-[9px] text-[#46424e] font-medium whitespace-nowrap">
 {d.value > 0 ? formatMoney(d.value) : ""}
 </p>
 <div className="w-full flex justify-center" style={{ height: "80px" }}>
 <div
 className={`w-full max-w-[28px] rounded-t-[3px] transition-all duration-700 ${d.value > 0 ? "bg-[#4b3f8f]" : "bg-[rgba(75,63,143,0.18)]"}`}
 style={{ height: d.value > 0 ? `${Math.max(pct, 4)}%` : "6px" }}
 />
 </div>
 <p className="text-[10px] text-[#46424e] font-medium">{d.month}</p>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}
