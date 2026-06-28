"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getCurrentPrice, getCategoryLabel, type Job } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Settings } from "lucide-react";

import SpendAnalytics from "./SpendAnalytics";
import MyJobsSection from "./MyJobsSection";
import MarketIntel from "./MarketIntel";
import TalentPool from "./TalentPool";

// ── Types ─────────────────────────────────────────────────────────
interface ClientDashboard {
 totalJobs: number;
 openJobs: number;
 totalBudgetPosted: number;
 totalSpent: number;
 totalSavings: number;
 avgBidPrice: number;
 totalBids: number;
 avgDecayRate: number;
}

type Bid = { id?: string; _id?: string; jobId: string; freelancerId: string; bidPrice: number; message?: string; createdAt?: string; };

interface MarketIntelData {
 avgStartingPrice: number;
 avgDecayRate: number;
 avgFirstBidHours: number | null;
 topSkills: string[];
 categoryLabels: string;
 jobCount: number;
}

// ── Client Feed Component ──────────────────────────────────────────
export default function ClientFeed() {
 const {
 jobs, bids, users, now, currentUser, acceptJob,
 auth, mounted,
 } = useApp();
 const router = useRouter();

 // ── State ─────────────────────────────────────────────────────

 // API-loaded data
 const [dashboard, setDashboard] = useState<ClientDashboard | null>(null);
 const [marketIntel, setMarketIntel] = useState<MarketIntelData | null>(null);
 const [loading, setLoading] = useState(true);

 // ── Auth guard ────────────────────────────────────────────────
 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 }, [mounted, currentUser, router]);

 // ── Fetch dashboard data from API ─────────────────────────────
 const fetchDashboard = useCallback(async () => {
 if (!auth.accessToken) return;
 try {
 const [dashRes, mktRes] = await Promise.all([
 fetch("/api/client/dashboard", { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
 fetch("/api/client/market-intel", { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
 ]);
 if (dashRes.ok) setDashboard(await dashRes.json());
 if (mktRes.ok) setMarketIntel(await mktRes.json());
 } catch {
 // silent — falls back to local computation
 } finally {
 setLoading(false);
 }
 }, [auth.accessToken]);

 useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

 // ── Derived values ────────────────────────────────────────────
 const uid = currentUser?.id ?? currentUser?._id ?? "";
 const mySkills = currentUser?.skills ?? [];

 // My own open jobs
 const myOpenJobs = useMemo(() =>
 jobs.filter(j => j.status === "open" && j.clientId === uid),
 [jobs, uid]
 );

 // KPIs (from API or local fallback)
 const kpis = useMemo(() => {
 if (dashboard) return dashboard;
 const savings = myOpenJobs.reduce((s, j) => s + Math.max(0, j.startingPrice - getCurrentPrice(j, now)), 0);
 const allMyBids = bids.filter(b => myOpenJobs.map(j => j.id ?? j._id).includes(b.jobId));
 return {
 totalJobs: myOpenJobs.length,
 openJobs: myOpenJobs.length,
 totalBudgetPosted: myOpenJobs.reduce((s, j) => s + j.startingPrice, 0),
 totalSpent: 0,
 totalSavings: savings,
 avgBidPrice: allMyBids.length > 0 ? allMyBids.reduce((s, b) => s + b.bidPrice, 0) / allMyBids.length : 0,
 totalBids: allMyBids.length,
 avgDecayRate: myOpenJobs.length > 0
 ? myOpenJobs.reduce((s, j) => s + j.decayRatePerHour, 0) / myOpenJobs.length : 0,
 };
 }, [dashboard, myOpenJobs, bids, now]);

 // Market intel (from API or local fallback)
 const mktData = useMemo((): MarketIntelData | null => {
 if (marketIntel) return marketIntel;
 if (myOpenJobs.length === 0) return null;
 const cats = [...new Set(myOpenJobs.map(j => j.category).filter(Boolean))] as string[];
 const mktJobs = jobs.filter(j => j.status === "open" && j.clientId !== uid && cats.includes(j.category ?? ""));
 if (mktJobs.length === 0) return null;
 const skillFreq: Record<string, number> = {};
 for (const job of mktJobs) for (const s of job.skillsRequired) skillFreq[s] = (skillFreq[s] ?? 0) + 1;
 const topSkills = Object.entries(skillFreq).sort(([, a], [, b]) => b - a).slice(0, 4).map(([s]) => s);
 return {
 avgStartingPrice: mktJobs.reduce((s, j) => s + j.startingPrice, 0) / mktJobs.length,
 avgDecayRate: mktJobs.reduce((s, j) => s + j.decayRatePerHour, 0) / mktJobs.length,
 avgFirstBidHours: null,
 topSkills,
 categoryLabels: cats.map(c => getCategoryLabel(c)).join(", "),
 jobCount: mktJobs.length,
 };
 }, [marketIntel, myOpenJobs, jobs, uid]);

 // ── Cast bids to typed array ─────────────────────────────────
 const typedBids = useMemo((): Bid[] => bids.map(b => ({
 id: (b as { id?: string }).id,
 _id: (b as { _id?: string })._id,
 jobId: b.jobId,
 freelancerId: b.freelancerId,
 bidPrice: b.bidPrice,
 message: (b as { message?: string }).message,
 createdAt: (b as { createdAt?: string }).createdAt,
 })), [bids]);




 const handleAcceptBest = async (jobId: string) => {
 const r = await acceptJob(jobId);
 r.ok
 ? toast.success("Job accepted!", { description: r.message })
 : toast.error("Cannot accept", { description: r.message });
 };

 if (!mounted) return (
 <div className="flex items-center justify-center min-h-[60vh] bg-[#0d1120]">
 <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin" />
 </div>
 );

 return (
 <div className="min-h-screen bg-[#0d1120] grid-bg">

 {/* ── Header ──────────────────────────────────────────────── */}
 <div className="glass-panel border-b border-[rgba(201,168,76,0.22)] py-5 px-4 sm:px-6" style={{ borderRadius: 0 }}>
 <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <Settings className="h-5 w-5 text-[#c9a84c]" />
 <h1 className="font-heading text-xl font-bold text-[#f0e8d4]">Procurement Terminal</h1>
 </div>
 <p className="text-[#a8997e] text-sm">
 {kpis.openJobs} active job{kpis.openJobs !== 1 ? "s" : ""}
 {kpis.totalSavings > 0 && ` · $${Math.round(kpis.totalSavings).toLocaleString()} saved from decay`}
 </p>
 </div>

 <div className="flex items-center gap-3">
 <Link href="/post-job">
 <button className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#c9a84c] text-[#050810] border border-transparent hover:bg-[rgba(201,168,76,0.12)] transition-colors text-sm font-semibold">
 <Plus className="h-4 w-4" />
 Post Job
 </button>
 </Link>
 </div>
 </div>
 </div>

 {/* ── Body ────────────────────────────────────────────────── */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">

 {/* 1. Spend Analytics */}
 {!loading && (
 <SpendAnalytics
 totalBudgetPosted={kpis.totalBudgetPosted}
 avgBidPrice={kpis.avgBidPrice}
 totalSavings={kpis.totalSavings}
 avgDecayRate={kpis.avgDecayRate}
 openJobs={kpis.openJobs}
 />
 )}

 {/* 2. My Posted Jobs + Active Bids Feed */}
 <MyJobsSection
 jobs={myOpenJobs}
 bids={typedBids}
 users={users}
 now={now}
 onAcceptBest={handleAcceptBest}
 />

 {/* 3. Market Intelligence */}
 {mktData && (
 <MarketIntel
 avgStartingPrice={mktData.avgStartingPrice}
 avgDecayRate={mktData.avgDecayRate}
 avgFirstBidHours={mktData.avgFirstBidHours}
 topSkills={mktData.topSkills}
 categoryLabels={mktData.categoryLabels}
 jobCount={mktData.jobCount}
 />
 )}

 {/* 4. Talent Pool ───────────────────────────────────── */}
 <TalentPool
 users={users}
 jobs={jobs}
 bids={bids}
 now={now}
 ownClientId={uid}
 />


 </div>
 </div>
 );
}
