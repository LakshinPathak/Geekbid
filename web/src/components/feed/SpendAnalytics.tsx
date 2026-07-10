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
 loading?: boolean;
}

export default function SpendAnalytics({
 totalBudgetPosted,
 avgBidPrice,
 totalSavings,
 avgDecayRate,
 openJobs,
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
 color: "text-[#6f6a7d]",
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

 return (
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
 <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider font-semibold whitespace-nowrap">{s.label}</p>
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
 );
}
