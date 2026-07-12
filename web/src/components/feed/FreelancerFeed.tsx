"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getCurrentPrice, SKILL_TAXONOMY, JOB_CATEGORIES, type Job } from "@/lib/utils";
import { getPlanConfig } from "@/lib/plans";
import { toast } from "sonner";
import { Search, X, ChevronDown, Target } from "lucide-react";
import {
 sortJobs, FREELANCER_SORTS, getCompetitionBadge,
 type SortOption, type BudgetFilter, type CompetitionFilter, type HourlyFilter,
} from "./feed-helpers";


import FreelancerStats from "./FreelancerStats";
import RecommendedCarousel from "./RecommendedCarousel";
import ActiveBidsTracker from "./ActiveBidsTracker";
import FreelancerJobCard from "./FreelancerJobCard";
import CompetitorAnalysis from "./CompetitorAnalysis";
import EmptyState from "./EmptyState";
import SubscriptionWidget from "./SubscriptionWidget";

// ── Types ─────────────────────────────────────────────────────────
interface FreelancerDashboard {
 matchedJobs: number;
 bidsUsed: number;
 bidLimit: number;
 winRate: number;
 earningPotential: number;
 geekScore: number;
}

interface ActiveBid {
 jobId: string;
 jobTitle: string;
 myPrice: number;
 currentPrice: number;
 rank: number;
 status: "winning" | "outbid" | "pending";
 cooldownEndsAt?: string;
}

// ── Freelancer Feed Component ──────────────────────────────────────
export default function FreelancerFeed() {
 const {
 jobs, bids, users, now, currentUser,
 auth, mounted, recommendedJobs, counterBid,
 } = useApp();
 const router = useRouter();

 // ── State ─────────────────────────────────────────────────────
 const [search, setSearch] = useState("");
 const [sortBy, setSortBy] = useState<SortOption>("best_match");
 const [filterSkills, setFilterSkills] = useState<string[]>([]);
 const [filterCategory, setFilterCategory] = useState("all");
 const [filterBudget, setFilterBudget] = useState<BudgetFilter>("");
 const [filterCompetition, setFilterCompetition] = useState<CompetitionFilter>("");
 const [filterHourlyRate, setFilterHourlyRate] = useState<HourlyFilter>("");
 const [showSkillPicker, setShowSkillPicker] = useState(false);
 const [showSortMenu, setShowSortMenu] = useState(false);
 const [showAdvanced, setShowAdvanced] = useState(false);

 // API-loaded data
 const [dashboard, setDashboard] = useState<FreelancerDashboard | null>(null);
 const [activeBids, setActiveBids] = useState<ActiveBid[]>([]);
 const [loadingApi, setLoadingApi] = useState(true);
 const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

 const searchInputRef = useRef<HTMLInputElement>(null);
 const sortMenuRef = useRef<HTMLDivElement>(null);
 const skillPickerRef = useRef<HTMLDivElement>(null);

 // ── Auth guard ────────────────────────────────────────────────
 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 }, [mounted, currentUser, router]);

 // ── ⌘K / Ctrl+K focuses search ─────────────────────────────────
 useEffect(() => {
 const onKeyDown = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
 e.preventDefault();
 searchInputRef.current?.focus();
 }
 };
 window.addEventListener("keydown", onKeyDown);
 return () => window.removeEventListener("keydown", onKeyDown);
 }, []);

 // ── Close Sort/Skills dropdowns on outside click or Escape ─────
 useEffect(() => {
 if (!showSortMenu && !showSkillPicker) return;
 const onPointerDown = (e: MouseEvent) => {
 const target = e.target as Node;
 if (showSortMenu && sortMenuRef.current && !sortMenuRef.current.contains(target)) setShowSortMenu(false);
 if (showSkillPicker && skillPickerRef.current && !skillPickerRef.current.contains(target)) setShowSkillPicker(false);
 };
 const onKeyDown = (e: KeyboardEvent) => {
 if (e.key === "Escape") { setShowSortMenu(false); setShowSkillPicker(false); }
 };
 document.addEventListener("mousedown", onPointerDown);
 document.addEventListener("keydown", onKeyDown);
 return () => {
 document.removeEventListener("mousedown", onPointerDown);
 document.removeEventListener("keydown", onKeyDown);
 };
 }, [showSortMenu, showSkillPicker]);

 // ── Fetch API data ────────────────────────────────────────────
 const fetchData = useCallback(async () => {
 if (!auth.accessToken) return;
 try {
 const [dashRes, trackerRes] = await Promise.all([
 fetch("/api/freelancer/dashboard", { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
 fetch("/api/freelancer/bid-tracker", { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
 ]);
 if (dashRes.ok) setDashboard(await dashRes.json());
 if (trackerRes.ok) {
 const data = await trackerRes.json();
 // Map tracker response to ActiveBid format
 const activeBidItems: ActiveBid[] = (data.bids ?? []).map((b: {
 jobId: string; jobTitle?: string; myPrice: number; currentPrice: number;
 rank?: number; status?: string; cooldownEndsAt?: string;
 }) => ({
 jobId: b.jobId,
 jobTitle: b.jobTitle ?? "",
 myPrice: b.myPrice,
 currentPrice: b.currentPrice,
 rank: b.rank ?? 0,
 status: (b.status as "winning" | "outbid" | "pending") ?? "pending",
 cooldownEndsAt: b.cooldownEndsAt,
 }));
 setActiveBids(activeBidItems);
 }
 } catch {
 // silent fallback
 } finally {
 setLoadingApi(false);
 setLastRefreshed(new Date());
 }
 }, [auth.accessToken]);

 useEffect(() => { fetchData(); }, [fetchData]);

 // ── Derived values ────────────────────────────────────────────
 const uid = currentUser?.id ?? currentUser?._id ?? "";
 const mySkills = currentUser?.skills ?? [];

 // KPIs (from API or local fallback)
 const kpis = useMemo(() => {
 if (dashboard) return dashboard;
 const matched = jobs.filter(j => j.status === "open" && mySkills.some(s => j.skillsRequired.includes(s)));
 const wonJobs = jobs.filter(j => j.acceptedBy === uid).length;
 const myBids = bids.filter(b => b.freelancerId === uid);
 const bidLimit = getPlanConfig(currentUser?.plan).limits.bidsPerMonth;
 const bidsUsed = currentUser?.planLimits?.bidsPlacedThisMonth ?? myBids.length;
 return {
 matchedJobs: matched.length,
 bidsUsed,
 bidLimit,
 winRate: myBids.length > 0 ? Math.round((wonJobs / myBids.length) * 100) : 0,
 earningPotential: matched.reduce((s, j) => s + getCurrentPrice(j, now), 0),
 geekScore: currentUser?.geekScore ?? 0,
 };
 }, [dashboard, jobs, bids, now, uid, mySkills, currentUser]);

 // Active bids (from API or local fallback)
 const displayActiveBids = useMemo((): ActiveBid[] => {
 if (activeBids.length > 0) return activeBids;
 const myBids = bids.filter(b => b.freelancerId === uid);
 // A freelancer can place multiple counter-bids on the same job (e.g. after
 // using the AI Bid Strategist's "Apply" suggestion) — dedupe to one row per
 // job here, keeping the most recent bid, matching /api/freelancer/bid-tracker's
 // behavior server-side. Without this, two bids on one job produce two rows
 // sharing the same jobId, which ActiveBidsTracker keys on and React rejects.
 const latestBidByJob = new Map<string, typeof myBids[number]>();
 for (const b of myBids) {
 const existing = latestBidByJob.get(b.jobId);
 if (!existing || new Date(b.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
 latestBidByJob.set(b.jobId, b);
 }
 }
 return Array.from(latestBidByJob.values())
 .filter(b => {
 const job = jobs.find(j => (j.id ?? j._id) === b.jobId && j.status === "open");
 return !!job;
 })
 .map(b => {
 const job = jobs.find(j => (j.id ?? j._id) === b.jobId)!;
 const currentPrice = getCurrentPrice(job, now);
 const jobBids = bids.filter(x => x.jobId === b.jobId).sort((a, c) => a.bidPrice - c.bidPrice);
 const rankIdx = jobBids.findIndex(x => x.freelancerId === uid);
 const rank = rankIdx >= 0 ? rankIdx + 1 : 0;
 return {
 jobId: b.jobId,
 jobTitle: job.title,
 myPrice: b.bidPrice,
 currentPrice,
 rank,
 status: (rank === 1 ? "winning" : "outbid") as "winning" | "outbid" | "pending",
 cooldownEndsAt: undefined,
 };
 });
 }, [activeBids, bids, jobs, uid, now]);

 // Recommended jobs (top skill-matched open jobs)
 const recommendedDisplay = useMemo(() => {
 if (recommendedJobs.length > 0)
 return recommendedJobs.filter(j => j.status === "open").slice(0, 5);
 return jobs
 .filter(j => j.status === "open" && mySkills.some(s => j.skillsRequired.includes(s)))
 .sort((a, b) => {
 const am = a.skillsRequired.filter(s => mySkills.includes(s)).length;
 const bm = b.skillsRequired.filter(s => mySkills.includes(s)).length;
 return bm - am;
 })
 .slice(0, 5);
 }, [recommendedJobs, jobs, mySkills]);

 // Client name lookup
 const clientMap = useMemo(() => {
 const map: Record<string, { name: string; rating: number; reviewCount: number }> = {};
 for (const u of users) {
 const uid2 = u.id ?? u._id ?? "";
 map[uid2] = {
 name: u.fullName ?? "",
 rating: u.averageRating ?? 0,
 reviewCount: u.totalReviews ?? 0,
 };
 }
 return map;
 }, [users]);

 // Filtered all jobs
 const filteredJobs = useMemo(() => {
 const q = search.trim().toLowerCase();
 const filtered = jobs
 .filter(j => j.status === "open")
 .filter(j => q ? `${j.title} ${j.skillsRequired.join(" ")}`.toLowerCase().includes(q) : true)
 .filter(j => filterSkills.length > 0 ? filterSkills.some(s => j.skillsRequired.includes(s)) : true)
 .filter(j => filterCategory !== "all" ? j.category === filterCategory : true)
 .filter(j => {
 if (!filterBudget) return true;
 const p = getCurrentPrice(j, now);
 if (filterBudget === "0-500") return p <= 500;
 if (filterBudget === "500-1000") return p > 500 && p <= 1000;
 if (filterBudget === "1000-2000") return p > 1000 && p <= 2000;
 if (filterBudget === "2000+") return p > 2000;
 return true;
 })
 .filter(j => {
 if (!filterCompetition) return true;
 const bc = j.bidCount ?? 0;
 if (filterCompetition === "low") return bc < 3;
 if (filterCompetition === "medium") return bc >= 3 && bc <= 5;
 if (filterCompetition === "high") return bc > 5;
 return true;
 })
 .filter(j => {
 if (!filterHourlyRate || !j.estimatedHours) return true;
 const rate = getCurrentPrice(j, now) / j.estimatedHours;
 return rate >= Number(filterHourlyRate);
 });

 return sortJobs(filtered, sortBy, now, mySkills);
 }, [jobs, search, sortBy, filterSkills, filterCategory, filterBudget, filterCompetition, filterHourlyRate, now, mySkills]);

 // My bid lookup
 const myBidByJobId = useMemo(() => {
 const map: Record<string, { rank: number }> = {};
 for (const bid of displayActiveBids) map[bid.jobId] = { rank: bid.rank };
 return map;
 }, [displayActiveBids]);

 const handleQuickBid = async (jobId: string) => {
 const job = jobs.find(j => (j.id ?? j._id) === jobId);
 if (!job) return;
 const current = getCurrentPrice(job, now);
 const price = Math.max(job.minimumPrice, Math.floor(current * 0.98)); // 2% below current, clamped to floor
 const r = await counterBid(jobId, price);
 r.ok
 ? toast.success("Bid placed!", { description: r.message })
 : toast.error("Bid failed", { description: r.message });
 };

 const hasAdvancedFilters = filterBudget || filterCompetition || filterHourlyRate;

 if (!mounted) return (
 <div className="flex items-center justify-center min-h-[60vh] bg-[#fbfaf7]">
 <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
 </div>
 );

 const hour = now.getHours();
 const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
 const firstName = currentUser?.fullName?.split(" ")[0];

 return (
 <div className="min-h-screen bg-[#ffffff] grid-bg">

 {/* ── Header ──────────────────────────────────────────────── */}
 <div className="glass-panel border-b border-[rgba(75,63,143,0.22)] py-5 px-4 sm:px-6 relative overflow-hidden" style={{ borderRadius: 0 }}>
 <div className="feed-header-mesh" aria-hidden="true" />
 <div className="feed-header-shimmer-line" aria-hidden="true" />
 <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
 <div>
 <div className="flex items-center gap-2.5 mb-1">
 <Target className="h-5 w-5 text-[#4b3f8f]" />
 <h1 className="font-heading text-xl font-bold text-[#3d3a45]">Mission Control</h1>
 </div>
 {firstName && (
 <p className="text-[#4b3f8f] text-xs font-medium mb-0.5 animate-fade-in">{greeting}, {firstName}</p>
 )}
 <p className="text-[#46424e] text-sm">
 {kpis.matchedJobs} matches · {kpis.bidsUsed}/{kpis.bidLimit} bids used · {kpis.winRate}% win rate
 </p>
 {lastRefreshed && (
 <p className="text-[#46424e]/60 text-[10px] flex items-center gap-1.5 mt-1">
 <span className="h-1.5 w-1.5 rounded-full bg-[#4d7245] animate-pulse inline-block" />
 Last refreshed {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
 </p>
 )}
 </div>

 <div className="flex items-center gap-3">
 <Link href="/profile">
 <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#ffffff] text-[#3d3a45] border-0 hover:bg-[#f4f2ee] transition-colors text-sm font-medium">
 My Profile
 </button>
 </Link>
 </div>
 </div>
 </div>

 {/* ── Body ────────────────────────────────────────────────── */}
 <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-10">

 {/* 0. Subscription status */}
 <SubscriptionWidget />

 {/* 1. Freelancer Stats Bar */}
 <FreelancerStats
 matches={kpis.matchedJobs}
 bidsUsed={kpis.bidsUsed}
 bidLimit={kpis.bidLimit}
 winRate={kpis.winRate}
 earningPotential={kpis.earningPotential}
 loading={loadingApi}
 />

 {/* 2. Recommended Carousel */}
 {recommendedDisplay.length > 0 && (
 <RecommendedCarousel
 jobs={recommendedDisplay}
 now={now}
 mySkills={mySkills}
 onQuickBid={handleQuickBid}
 />
 )}

 {/* 3. Active Bids Tracker */}
 {displayActiveBids.length > 0 && (
 <ActiveBidsTracker bids={displayActiveBids} />
 )}

 {/* 4. All Open Jobs ───────────────────────────────────── */}
 <div>
 <div className="flex items-center justify-between mb-5">
 <h2 className="text-base font-semibold text-[#3d3a45] uppercase tracking-wider">
 All Open Jobs
 </h2>
 <span className="text-[11px] text-[#46424e] font-medium">{filteredJobs.length} jobs</span>
 </div>

 {/* ── Filter Toolbar ────────────────────────────────────── */}
 <div className="glass-panel rounded-2xl border border-[rgba(75,63,143,0.22)] mb-5 overflow-visible">

 {/* Main row */}
 <div className="flex flex-wrap items-center gap-2 px-4 py-3">

 {/* Search */}
 <div className="relative flex-1 min-w-0">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#46424e]" />
 <input
 ref={searchInputRef}
 type="text"
 placeholder="Search jobs or skills..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="w-full h-9 pl-8 pr-14 text-sm bg-[#f4f2ee] border border-[rgba(75,63,143,0.22)] rounded-2xl text-[#3d3a45] placeholder:text-[#b3aec0] outline-none focus:border-[rgba(75,63,143,0.35)]/60 transition-colors"
 />
 {search ? (
 <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
 <X className="h-3 w-3 text-[#46424e]" />
 </button>
 ) : (
 <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#46424e]/60 border border-[rgba(75,63,143,0.15)] rounded px-1.5 py-0.5 pointer-events-none">
 ⌘K
 </kbd>
 )}
 </div>

 {/* Divider */}
 <div className="h-6 w-px bg-[rgba(75,63,143,0.22)] shrink-0" />

 {/* Category select — styled pill */}
 <div className="relative shrink-0">
 <select
 value={filterCategory}
 onChange={e => setFilterCategory(e.target.value)}
 className="h-9 pl-3 pr-7 text-xs font-medium rounded-2xl border border-[rgba(75,63,143,0.22)] bg-[#f4f2ee] text-[#46424e] outline-none appearance-none cursor-pointer hover:border-[rgba(75,63,143,0.35)]/50 transition-colors"
 >
 <option value="all">All Categories</option>
 {JOB_CATEGORIES.map(c => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </select>
 <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#46424e]" />
 </div>

 {/* Divider */}
 <div className="h-6 w-px bg-[rgba(75,63,143,0.22)] shrink-0" />

 {/* Sort chip */}
 <div ref={sortMenuRef} className="relative shrink-0">
 <button
 onClick={() => setShowSortMenu(v => !v)}
 className={`h-9 px-3 text-xs font-semibold rounded-2xl border flex items-center gap-1.5 transition-all ${
 sortBy !== "best_match"
 ? "border-[rgba(75,63,143,0.35)] bg-[rgba(75,63,143,0.12)] text-[#4b3f8f]"
 : "border-[rgba(75,63,143,0.22)] bg-transparent text-[#46424e] hover:border-[rgba(75,63,143,0.35)]/50"
 }`}
 >
 {FREELANCER_SORTS.find(s => s.value === sortBy)?.label ?? "Sort"}
 <ChevronDown className={`h-3 w-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
 </button>
 {showSortMenu && (
 <div className="absolute left-0 top-11 z-50 glass-panel border border-[rgba(75,63,143,0.22)] rounded-2xl py-1 min-w-[160px] ">
 {FREELANCER_SORTS.map(s => (
 <button
 key={s.value}
 onClick={() => { setSortBy(s.value); setShowSortMenu(false); }}
 className={`w-full text-left px-4 py-2 text-xs hover:bg-[#f4f2ee] transition-colors ${sortBy === s.value ? "text-[#4b3f8f] font-semibold" : "text-[#46424e]"}`}
 >
 {s.label}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Skills chip */}
 <div ref={skillPickerRef} className="relative shrink-0">
 <button
 onClick={() => setShowSkillPicker(v => !v)}
 className={`h-9 px-3 text-xs font-semibold rounded-2xl border flex items-center gap-1.5 transition-all ${
 filterSkills.length > 0
 ? "border-[rgba(75,63,143,0.35)] bg-[rgba(75,63,143,0.12)] text-[#4b3f8f]"
 : "border-[rgba(75,63,143,0.22)] bg-transparent text-[#46424e] hover:border-[rgba(75,63,143,0.35)]/50"
 }`}
 >
 Skills {filterSkills.length > 0 && <span className="feed-badge-pop bg-[#4b3f8f] text-[#ffffff] rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold">{filterSkills.length}</span>}
 <ChevronDown className={`h-3 w-3 transition-transform ${showSkillPicker ? "rotate-180" : ""}`} />
 </button>
 {showSkillPicker && (
 <div className="absolute left-0 top-11 z-50 glass-panel border border-[rgba(75,63,143,0.22)] rounded-2xl p-3 w-[260px] ">
 <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
 {SKILL_TAXONOMY.slice(0, 24).map(s => (
 <button
 key={s}
 onClick={() => setFilterSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
 className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${filterSkills.includes(s) ? "bg-[#4b3f8f] text-[#ffffff] border-transparent" : "bg-[#f4f2ee] text-[#3d3a45] border-[rgba(75,63,143,0.22)] hover:border-[rgba(75,63,143,0.35)]"}`}
 >
 {s}
 </button>
 ))}
 </div>
 {filterSkills.length > 0 && (
 <button onClick={() => setFilterSkills([])} className="w-full mt-2 text-[11px] text-[#c14d3a] hover:opacity-70 transition-opacity">
 Clear all
 </button>
 )}
 </div>
 )}
 </div>

 {/* Advanced chip */}
 <button
 onClick={() => setShowAdvanced(v => !v)}
 className={`h-9 px-3 text-xs font-semibold rounded-2xl border flex items-center gap-1.5 shrink-0 transition-all ${
 hasAdvancedFilters
 ? "border-[rgba(75,63,143,0.35)] bg-[rgba(75,63,143,0.12)] text-[#4b3f8f]"
 : "border-[rgba(75,63,143,0.22)] bg-transparent text-[#46424e] hover:border-[rgba(75,63,143,0.35)]/50"
 }`}
 >
 Filters {hasAdvancedFilters && <span className="feed-badge-pop h-1.5 w-1.5 rounded-full bg-[#4b3f8f]" />}
 <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
 </button>
 </div>

 {/* Advanced drawer */}
 <div className={`feed-drawer ${showAdvanced ? "open" : ""}`}>
 <div className="border-t border-[rgba(75,63,143,0.22)]/50 px-4 py-3 flex flex-wrap items-center gap-2">
 <span className="text-[11px] text-[#46424e] font-medium uppercase tracking-wider mr-1">Advanced:</span>

 <select
 value={filterBudget}
 onChange={e => setFilterBudget(e.target.value as BudgetFilter)}
 className="h-8 pl-3 pr-6 text-xs font-medium rounded-full border border-[rgba(75,63,143,0.22)] bg-[#f4f2ee] text-[#46424e] outline-none appearance-none cursor-pointer hover:border-[rgba(75,63,143,0.35)]/50 transition-colors"
 >
 <option value="">All Budgets</option>
 <option value="0-500">Under $500</option>
 <option value="500-1000">$500–$1k</option>
 <option value="1000-2000">$1k–$2k</option>
 <option value="2000+">$2k+</option>
 </select>

 <select
 value={filterCompetition}
 onChange={e => setFilterCompetition(e.target.value as CompetitionFilter)}
 className="h-8 pl-3 pr-6 text-xs font-medium rounded-full border border-[rgba(75,63,143,0.22)] bg-[#f4f2ee] text-[#46424e] outline-none appearance-none cursor-pointer hover:border-[rgba(75,63,143,0.35)]/50 transition-colors"
 >
 <option value="">All Competition</option>
 <option value="low">Low (&lt;3 bids)</option>
 <option value="medium">Medium (3–5)</option>
 <option value="high">High (5+)</option>
 </select>

 <select
 value={filterHourlyRate}
 onChange={e => setFilterHourlyRate(e.target.value as HourlyFilter)}
 className="h-8 pl-3 pr-6 text-xs font-medium rounded-full border border-[rgba(75,63,143,0.22)] bg-[#f4f2ee] text-[#46424e] outline-none appearance-none cursor-pointer hover:border-[rgba(75,63,143,0.35)]/50 transition-colors"
 >
 <option value="">Any $/hr</option>
 <option value="30">$30+/hr</option>
 <option value="50">$50+/hr</option>
 <option value="75">$75+/hr</option>
 <option value="100">$100+/hr</option>
 </select>

 {hasAdvancedFilters && (
 <button
 onClick={() => { setFilterBudget(""); setFilterCompetition(""); setFilterHourlyRate(""); }}
 className="h-8 px-3 text-[11px] font-semibold text-[#c14d3a] hover:opacity-70 transition-opacity rounded-full border border-[#c14d3a]/30"
 >
 Reset
 </button>
 )}
 </div>
 </div>
 </div>

 {/* Job Grid */}
 {filteredJobs.length === 0 ? (
 <EmptyState
 variant="jobs"
 title="No jobs found"
 subtitle="Try adjusting your filters or check back later"
 ctaLabel="Reset filters"
 onCta={() => {
 setSearch(""); setFilterSkills([]); setFilterCategory("all");
 setFilterBudget(""); setFilterCompetition(""); setFilterHourlyRate("");
 }}
 />
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
 {filteredJobs.map(job => {
 const jobId = job.id ?? job._id ?? "";
 const client = clientMap[job.clientId ?? ""];
 const myBidInfo = myBidByJobId[jobId];
 return (
 <FreelancerJobCard
 key={jobId}
 job={job}
 now={now}
 mySkills={mySkills}
 clientName={client?.name}
 clientRating={client?.rating}
 clientReviewCount={client?.reviewCount}
 hasMyBid={!!myBidInfo}
 myBidRank={myBidInfo?.rank}
 onQuickBid={handleQuickBid}
 />
 );
 })}
 </div>
 )}
 </div>

 {/* ── Market Pricing Intelligence ────────────────────────── */}
 <CompetitorAnalysis
 jobs={jobs}
 now={now}
 mySkills={mySkills}
 />
 </div>
 </div>
 );
}
