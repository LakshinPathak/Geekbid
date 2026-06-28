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
      color: "text-[#A67628]",
      bg: "bg-[rgba(200,146,61,0.10)]",
      border: "border-[#C8923D]/20",
    },
    {
      label: "Avg Bid Price",
      value: avgBidPrice > 0 ? formatMoney(avgBidPrice) : "—",
      icon: TrendingDown,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    {
      label: "Total Savings",
      value: totalSavings > 0 ? `-${formatMoney(totalSavings)}` : "$0",
      icon: PiggyBank,
      color: "text-[#C8923D]",
      bg: "bg-[rgba(200,146,61,0.10)]",
      border: "border-[#C8923D]/30",
    },
    {
      label: "Avg Decay",
      value: openJobs > 0 ? `-${formatMoney(avgDecayRate)}/hr` : "—",
      icon: Zap,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className={`glass-panel rounded-xl p-4 border ${s.border} flex items-center gap-3`}
        >
          <div className={`w-9 h-9 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-[#7B8694] uppercase tracking-wider font-semibold whitespace-nowrap">{s.label}</p>
            <p className={`font-heading text-base font-bold ${s.color} leading-tight`}>{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
