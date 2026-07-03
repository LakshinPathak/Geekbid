"use client";
import { formatMoney } from "@/lib/utils";
import { DollarSign, TrendingDown, PiggyBank, Zap } from "lucide-react";

interface SpendAnalyticsProps {
 totalBudgetPosted: number;
 avgBidPrice: number;
 totalSavings: number;
 avgDecayRate: number;
 openJobs: number;
}

export default function SpendAnalytics({
 totalBudgetPosted,
 avgBidPrice,
 totalSavings,
 avgDecayRate,
 openJobs,
}: SpendAnalyticsProps) {
 const stats = [
 {
 label: "Budget Posted",
 value: formatMoney(totalBudgetPosted),
 icon: DollarSign,
 color: "text-[#f0e8d4]",
 bg: "bg-[rgba(201,168,76,0.12)]",
 border: "border-[rgba(201,168,76,0.22)]",
 },
 {
 label: "Avg Bid Price",
 value: avgBidPrice > 0 ? formatMoney(avgBidPrice) : "—",
 icon: TrendingDown,
 color: "text-[#a8997e]",
 bg: "bg-[#111625]",
 border: "border-[rgba(201,168,76,0.15)]",
 },
 {
 label: "Total Savings",
 value: totalSavings > 0 ? `-${formatMoney(totalSavings)}` : "$0",
 icon: PiggyBank,
 color: "text-[#c9a84c]",
 bg: "bg-[rgba(201,168,76,0.15)]",
 border: "border-[rgba(201,168,76,0.25)]",
 },
 {
 label: "Avg Decay",
 value: openJobs > 0 ? `-${formatMoney(avgDecayRate)}/hr` : "—",
 icon: Zap,
 color: "text-[#e57373]",
 bg: "bg-[#c0392b]/12",
 border: "border-[#c0392b]/22",
 },
 ];

 return (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {stats.map(s => (
 <div
 key={s.label}
 className={`glass-panel rounded-[3px] p-4 border ${s.border} flex items-center gap-3`}
 >
 <div className={`w-9 h-9 rounded-[3px] ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
 <s.icon className={`h-4 w-4 ${s.color}`} />
 </div>
 <div className="min-w-0">
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider font-semibold whitespace-nowrap">{s.label}</p>
 <p className={`font-heading text-base font-normal ${s.color} leading-tight`}>{s.value}</p>
 </div>
 </div>
 ))}
 </div>
 );
}
