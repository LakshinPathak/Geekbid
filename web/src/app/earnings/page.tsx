"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/utils";
import {
 DollarSign, TrendingUp, Clock, CheckCircle2, AlertCircle, Wallet,
} from "lucide-react";

export default function EarningsPage() {
 const { transactions, jobs, currentUser, mounted } = useApp();
 const router = useRouter();

 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 // This page reports freelance income specifically ("Total Earned" from
 // completed work) — a client's transactions are money they SPENT, not
 // earned, so mixing the two into one figure would be actively misleading.
 // Clients have the equivalent role-neutral view at /payments.
 else if (mounted && currentUser && currentUser.role !== "freelancer") router.replace("/payments");
 }, [mounted, currentUser, router]);

 const myTxns = useMemo(() => transactions.filter(t =>
 t.freelancerId === (currentUser?.id ?? currentUser?._id)
 ), [transactions, currentUser]);

 const released = useMemo(() => myTxns.filter(t => t.escrowStatus === "released").reduce((s, t) => s + t.netAmount, 0), [myTxns]);
 const pending = useMemo(() => myTxns.filter(t => t.escrowStatus === "held").reduce((s, t) => s + t.netAmount, 0), [myTxns]);
 const totalEarned = released + pending;
 const avgJobValue = myTxns.length > 0 ? totalEarned / myTxns.length : 0;

 const completedTxns = useMemo(() =>
 myTxns.filter(t => t.escrowStatus === "released").sort((a, b) =>
 new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
 ), [myTxns]);

 // Real monthly aggregation from released transactions (by releasedAt, or
 // createdAt if that's missing) — this used to be Math.random() scaled by
 // the all-time total, which invented numbers that changed on every reload
 // and had nothing to do with actual monthly income.
 const chartData = useMemo(() => {
 const now = new Date();
 const buckets = Array.from({ length: 6 }, (_, i) => {
 const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
 return { label: d.toLocaleString("en-US", { month: "short" }), year: d.getFullYear(), month: d.getMonth() };
 });
 return buckets.map(({ label, year, month }) => {
 const value = myTxns
 .filter(t => t.escrowStatus === "released")
 .filter(t => {
 const d = new Date(t.releasedAt ?? t.createdAt);
 return d.getFullYear() === year && d.getMonth() === month;
 })
 .reduce((s, t) => s + t.netAmount, 0);
 return { month: label, value };
 });
 }, [myTxns]);

 const thisMonthLabel = useMemo(() => {
 const now = new Date();
 return now.toLocaleString("en-US", { month: "short", year: "numeric" });
 }, []);

 const maxChart = Math.max(...chartData.map(d => d.value), 1);

 if (!mounted) return (
 <div className="min-h-screen flex items-center justify-center bg-[#fbfaf7]">
 <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.22)] border-t-transparent rounded-full animate-spin" />
 </div>
 );

 return (
 <div className="min-h-screen bg-[#fbfaf7] grid-bg">
 <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="font-heading text-2xl sm:text-3xl font-normal text-[#3d3a45]">Earnings</h1>
 <p className="text-[#6f6a7d] text-sm mt-1">Track your freelance income and payouts</p>
 </div>

 {/* Overview cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {/* Total Earned — featured */}
 <div className="finance-card p-5 relative overflow-hidden">
 <div className="absolute -top-16 -right-16 w-32 h-32 bg-[rgba(75,63,143,0.05)] rounded-full blur-3xl" />
 <div className="relative">
 <div className="flex items-center gap-2 mb-3">
 <TrendingUp className="h-4 w-4 text-[#4b3f8f]" />
 <span className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">Total Earned</span>
 </div>
 <p className="font-heading text-3xl font-normal text-[#4b3f8f]">{formatMoney(totalEarned)}</p>
 <p className="text-[#6f6a7d] text-xs mt-1">All time</p>
 </div>
 </div>

 {/* This Month */}
 <div className="finance-card p-5">
 <div className="flex items-center gap-2 mb-3">
 <DollarSign className="h-4 w-4 text-[#6f6a7d]" />
 <span className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">This Month</span>
 </div>
 <p className="font-heading text-2xl font-normal text-[#3d3a45]">
 {formatMoney(chartData[chartData.length - 1]?.value ?? 0)}
 </p>
 <p className="text-[#6f6a7d] text-xs mt-1">{thisMonthLabel}</p>
 </div>

 {/* Pending */}
 <div className="finance-card p-5">
 <div className="flex items-center gap-2 mb-3">
 <Clock className="h-4 w-4 text-[#4b3f8f]" />
 <span className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">Pending</span>
 </div>
 <p className="font-heading text-2xl font-normal text-[#4b3f8f]">{formatMoney(pending)}</p>
 <p className="text-[#6f6a7d] text-xs mt-1">In escrow</p>
 </div>

 {/* Avg Job Value */}
 <div className="finance-card p-5">
 <div className="flex items-center gap-2 mb-3">
 <Wallet className="h-4 w-4 text-[#6f6a7d]" />
 <span className="text-[#6f6a7d] text-xs uppercase tracking-wider font-medium">Avg. Job Value</span>
 </div>
 <p className="font-heading text-2xl font-normal text-[#3d3a45]">{formatMoney(avgJobValue)}</p>
 <p className="text-[#6f6a7d] text-xs mt-1">{myTxns.length} jobs</p>
 </div>
 </div>

 {/* Earnings Chart */}
 <div className="glass-card mb-8" style={{ borderRadius: '6px' }}>
 <h2 className="font-heading text-lg font-normal text-[#3d3a45] mb-6">Monthly Earnings</h2>
 <div className="flex items-end gap-3 h-48">
 {chartData.map((d) => {
 const pct = maxChart > 0 ? (d.value / maxChart) * 100 : 0;
 return (
 <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
 <p className="text-[11px] text-[#6f6a7d] font-medium">{formatMoney(d.value)}</p>
 <div className="w-full flex justify-center" style={{ height: "140px" }}>
 <div
 className="w-full max-w-[48px] rounded-t-[3px] bg-[#4b3f8f] relative overflow-hidden transition-all duration-700"
 style={{ height: `${Math.max(pct, 4)}%` }}
 >
 </div>
 </div>
 <p className="text-xs text-[#6f6a7d] font-medium">{d.month}</p>
 </div>
 );
 })}
 </div>
 </div>

 {/* Job Earnings List */}
 <div className="glass-panel overflow-hidden" style={{ borderRadius: '6px' }}>
 <div className="border-b border-[rgba(75,63,143,0.22)] px-4 sm:px-6 py-4">
 <h2 className="font-heading text-lg font-normal text-[#3d3a45]">Completed Jobs</h2>
 <p className="text-sm text-[#6f6a7d] mt-0.5">{completedTxns.length} completed</p>
 </div>

 {myTxns.length === 0 ? (
 <div className="text-center py-16 px-4">
 <div className="mx-auto h-14 w-14 rounded-xl glass-panel-sm flex items-center justify-center mb-3">
 <DollarSign className="h-6 w-6 text-[#6f6a7d]" />
 </div>
 <h3 className="text-sm font-semibold text-[#6f6a7d]">No transactions yet</h3>
 <p className="text-xs text-[#6f6a7d] mt-1">Transactions will appear here after you accept or post jobs.</p>
 </div>
 ) : (
 <div className="divide-y divide-[rgba(75,63,143,0.15)]">
 {myTxns.map((t) => {
 const jobTitle = jobs.find(j => (j.id ?? j._id) === t.jobId)?.title;
 return (
 <div key={t.id ?? t._id} className="px-4 sm:px-6 py-4 hover:bg-[#f4f2ee] transition-colors">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
 t.escrowStatus === "released" ? "bg-[rgba(75,63,143,0.12)]" :
 t.escrowStatus === "held" ? "bg-[rgba(75,63,143,0.12)]" : "bg-[rgba(193,77,58,0.2)]"
 }`}>
 {t.escrowStatus === "released" ? <CheckCircle2 className="h-5 w-5 text-[#4b3f8f]" /> :
 t.escrowStatus === "held" ? <Clock className="h-5 w-5 text-[#4b3f8f]" /> :
 <AlertCircle className="h-5 w-5 text-[#96543f]" />}
 </div>
 <div className="min-w-0">
 <p className="text-sm font-medium text-[#3d3a45] truncate">{jobTitle || `Job #${(t.jobId || "").slice(-6)}`}</p>
 <p className="text-xs text-[#6f6a7d]">{timeAgo(t.createdAt)}</p>
 </div>
 </div>
 <div className="flex items-center gap-4 shrink-0">
 <div className="hidden sm:flex gap-3">
 <div className="text-right">
 <p className="text-[11px] text-[#6f6a7d]">Gross</p>
 <p className="text-xs font-bold text-[#3d3a45]">{formatMoney(t.grossAmount, t.currency)}</p>
 </div>
 <div className="text-right">
 <p className="text-[11px] text-[#6f6a7d]">Fee (10%)</p>
 <p className="text-xs font-bold text-[#96543f]">-{formatMoney(t.platformFee, t.currency)}</p>
 </div>
 <div className="text-right">
 <p className="text-[11px] text-[#6f6a7d]">Net</p>
 <p className="text-xs font-bold text-[#4b3f8f]">{formatMoney(t.netAmount, t.currency)}</p>
 </div>
 </div>
 <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
 t.escrowStatus === "released" ? "bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border-[rgba(75,63,143,0.22)]" :
 t.escrowStatus === "held" ? "bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border-[rgba(75,63,143,0.22)]" :
 "bg-[rgba(193,77,58,0.2)] text-[#96543f] border-[rgba(75,63,143,0.22)]"
 }`}>
 {t.escrowStatus}
 </span>
 </div>
 </div>
 {/* Mobile amounts */}
 <div className="flex gap-4 mt-2 sm:hidden text-xs text-[#6f6a7d]">
 <span>Gross: {formatMoney(t.grossAmount, t.currency)}</span>
 <span className="text-[#96543f]">Fee: -{formatMoney(t.platformFee, t.currency)}</span>
 <span className="text-[#4b3f8f]">Net: {formatMoney(t.netAmount, t.currency)}</span>
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
