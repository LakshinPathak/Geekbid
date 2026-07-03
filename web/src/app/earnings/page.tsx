"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/utils";
import {
 DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, Wallet, ArrowUpRight,
} from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export default function EarningsPage() {
 const { transactions, jobs, currentUser, mounted } = useApp();
 const router = useRouter();

 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 }, [mounted, currentUser, router]);

 const myTxns = useMemo(() => transactions.filter(t =>
 t.freelancerId === (currentUser?.id ?? currentUser?._id) ||
 t.clientId === (currentUser?.id ?? currentUser?._id)
 ), [transactions, currentUser]);

 const released = useMemo(() => myTxns.filter(t => t.escrowStatus === "released").reduce((s, t) => s + t.netAmount, 0), [myTxns]);
 const pending = useMemo(() => myTxns.filter(t => t.escrowStatus === "held").reduce((s, t) => s + t.netAmount, 0), [myTxns]);
 const totalEarned = released + pending;
 const avgJobValue = myTxns.length > 0 ? totalEarned / myTxns.length : 0;

 const completedTxns = useMemo(() =>
 myTxns.filter(t => t.escrowStatus === "released").sort((a, b) =>
 new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
 ), [myTxns]);

 // Generate mock chart data based on actual totals
 const chartData = useMemo(() => {
 const base = totalEarned / 6;
 return MONTHS.map((m, i) => ({
 month: m,
 value: Math.max(0, base * (0.4 + Math.random() * 1.2) * (i < 3 ? 0.6 : 1)),
 }));
 }, [totalEarned]);

 const maxChart = Math.max(...chartData.map(d => d.value), 1);

 if (!mounted) return (
 <div className="min-h-screen flex items-center justify-center bg-[#080b14]">
 <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.22)] border-t-transparent rounded-full animate-spin" />
 </div>
 );

 return (
 <div className="min-h-screen bg-[#080b14] grid-bg">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="font-heading text-2xl sm:text-3xl font-normal text-[#f0e8d4]">Earnings</h1>
 <p className="text-[#a8997e] text-sm mt-1">Track your freelance income and payouts</p>
 </div>

 {/* Overview cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {/* Total Earned — featured */}
 <div className="finance-card p-5 relative overflow-hidden">
 <div className="absolute -top-16 -right-16 w-32 h-32 bg-[rgba(201,168,76,0.05)] rounded-full blur-3xl" />
 <div className="relative">
 <div className="flex items-center gap-2 mb-3">
 <TrendingUp className="h-4 w-4 text-[#c9a84c]" />
 <span className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">Total Earned</span>
 </div>
 <p className="font-heading text-3xl font-normal text-[#c9a84c]">{formatMoney(totalEarned)}</p>
 <p className="text-[#a8997e] text-xs mt-1">All time</p>
 </div>
 </div>

 {/* This Month */}
 <div className="finance-card p-5">
 <div className="flex items-center gap-2 mb-3">
 <DollarSign className="h-4 w-4 text-[#a8997e]" />
 <span className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">This Month</span>
 </div>
 <p className="font-heading text-2xl font-normal text-[#f0e8d4]">
 {formatMoney(chartData[chartData.length - 1]?.value ?? 0)}
 </p>
 <p className="text-[#a8997e] text-xs mt-1">Jun 2026</p>
 </div>

 {/* Pending */}
 <div className="finance-card p-5">
 <div className="flex items-center gap-2 mb-3">
 <Clock className="h-4 w-4 text-[#c9a84c]" />
 <span className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">Pending</span>
 </div>
 <p className="font-heading text-2xl font-normal text-[#c9a84c]">{formatMoney(pending)}</p>
 <p className="text-[#a8997e] text-xs mt-1">In escrow</p>
 </div>

 {/* Avg Job Value */}
 <div className="finance-card p-5">
 <div className="flex items-center gap-2 mb-3">
 <Wallet className="h-4 w-4 text-[#a8997e]" />
 <span className="text-[#a8997e] text-xs uppercase tracking-wider font-medium">Avg. Job Value</span>
 </div>
 <p className="font-heading text-2xl font-normal text-[#f0e8d4]">{formatMoney(avgJobValue)}</p>
 <p className="text-[#a8997e] text-xs mt-1">{myTxns.length} jobs</p>
 </div>
 </div>

 {/* Earnings Chart */}
 <div className="glass-card mb-8" style={{ borderRadius: '6px' }}>
 <h2 className="font-heading text-lg font-normal text-[#f0e8d4] mb-6">Monthly Earnings</h2>
 <div className="flex items-end gap-3 h-48">
 {chartData.map((d) => {
 const pct = maxChart > 0 ? (d.value / maxChart) * 100 : 0;
 return (
 <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
 <p className="text-[11px] text-[#a8997e] font-medium">{formatMoney(d.value)}</p>
 <div className="w-full flex justify-center" style={{ height: "140px" }}>
 <div
 className="w-full max-w-[48px] rounded-t-[3px] bg-[#c9a84c] relative overflow-hidden transition-all duration-700"
 style={{ height: `${Math.max(pct, 4)}%` }}
 >
 </div>
 </div>
 <p className="text-xs text-[#a8997e] font-medium">{d.month}</p>
 </div>
 );
 })}
 </div>
 </div>

 {/* Job Earnings List */}
 <div className="glass-panel overflow-hidden" style={{ borderRadius: '6px' }}>
 <div className="border-b border-[rgba(201,168,76,0.22)] px-4 sm:px-6 py-4">
 <h2 className="font-heading text-lg font-normal text-[#f0e8d4]">Completed Jobs</h2>
 <p className="text-sm text-[#a8997e] mt-0.5">{completedTxns.length} completed</p>
 </div>

 {myTxns.length === 0 ? (
 <div className="text-center py-16 px-4">
 <div className="mx-auto h-14 w-14 rounded-[6px] glass-panel-sm flex items-center justify-center mb-3">
 <DollarSign className="h-6 w-6 text-[#a8997e]" />
 </div>
 <h3 className="text-sm font-semibold text-[#a8997e]">No transactions yet</h3>
 <p className="text-xs text-[#a8997e] mt-1">Transactions will appear here after you accept or post jobs.</p>
 </div>
 ) : (
 <div className="divide-y divide-[rgba(201,168,76,0.15)]">
 {myTxns.map((t) => {
 const jobTitle = jobs.find(j => (j.id ?? j._id) === t.jobId)?.title;
 return (
 <div key={t.id ?? t._id} className="px-4 sm:px-6 py-4 hover:bg-[#111625] transition-colors">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <div className={`h-10 w-10 rounded-[6px] flex items-center justify-center shrink-0 ${
 t.escrowStatus === "released" ? "bg-[rgba(201,168,76,0.12)]" :
 t.escrowStatus === "held" ? "bg-[rgba(201,168,76,0.12)]" : "bg-[rgba(192,57,43,0.2)]"
 }`}>
 {t.escrowStatus === "released" ? <CheckCircle2 className="h-5 w-5 text-[#c9a84c]" /> :
 t.escrowStatus === "held" ? <Clock className="h-5 w-5 text-[#c9a84c]" /> :
 <AlertCircle className="h-5 w-5 text-[#e57373]" />}
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-[#f0e8d4] truncate">{jobTitle || `Job #${(t.jobId || "").slice(-6)}`}</p>
 <p className="text-xs text-[#a8997e]">{timeAgo(t.createdAt)}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 shrink-0">
 <div className="hidden sm:flex gap-3">
 <div className="text-right">
 <p className="text-[11px] text-[#a8997e]">Gross</p>
 <p className="text-xs font-bold text-[#f0e8d4]">{formatMoney(t.grossAmount)}</p>
 </div>
 <div className="text-right">
 <p className="text-[11px] text-[#a8997e]">Fee (10%)</p>
 <p className="text-xs font-bold text-[#e57373]">-{formatMoney(t.platformFee)}</p>
 </div>
 <div className="text-right">
 <p className="text-[11px] text-[#a8997e]">Net</p>
 <p className="text-xs font-bold text-[#c9a84c]">{formatMoney(t.netAmount)}</p>
 </div>
 </div>
 <span className={`inline-flex items-center rounded-[3px] border px-2.5 py-0.5 text-[11px] font-medium ${
 t.escrowStatus === "released" ? "bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border-[rgba(201,168,76,0.22)]" :
 t.escrowStatus === "held" ? "bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border-[rgba(201,168,76,0.22)]" :
 "bg-[rgba(192,57,43,0.2)] text-[#e57373] border-[rgba(201,168,76,0.22)]"
 }`}>
 {t.escrowStatus}
 </span>
 </div>
 </div>
 {/* Mobile amounts */}
 <div className="flex gap-4 mt-2 sm:hidden text-xs text-[#a8997e]">
 <span>Gross: {formatMoney(t.grossAmount)}</span>
 <span className="text-[#e57373]">Fee: -{formatMoney(t.platformFee)}</span>
 <span className="text-[#c9a84c]">Net: {formatMoney(t.netAmount)}</span>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
