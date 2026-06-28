"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getCurrentPrice, SKILL_TAXONOMY, JOB_CATEGORIES, type Job } from "@/lib/utils";
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

 // ── Auth guard ────────────────────────────────────────────────
 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 }, [mounted, currentUser, router]);

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
 const bidLimit = currentUser?.plan === "pro" ? 50 : currentUser?.plan === "enterprise" ? 200 : 10;
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
 return myBids
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
 const price = Math.floor(getCurrentPrice(job, now) * 0.98); // 2% below current
 const r = await counterBid(jobId, price);
 r.ok
 ? toast.success("Bid placed!", { description: r.message })
 : toast.error("Bid failed", { description: r.message });
 };

 const hasAdvancedFilters = filterBudget || filterCompetition || filterHourlyRate;

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
 <Target className="h-5 w-5 text-[#c9a84c]" />
 <h1 className="font-heading text-xl font-bold text-[#f0e8d4]">Mission Control</h1>
 </div>
 <p className="text-[#a8997e] text-sm">
 {kpis.matchedJobs} matches · {kpis.bidsUsed}/{kpis.bidLimit} bids used · {kpis.winRate}% win rate
 </p>
 </div>

 <div className="flex items-center gap-3">
 <Link href="/profile">
 <button className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#050810] text-[#f0e8d4] border-0 hover:bg-[#111625] transition-colors text-sm font-medium">
 My Profile
 </button>
 </Link>
 </div>
 </div>
 </div>

 {/* ── Body ────────────────────────────────────────────────── */}
 <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

 {/* 1. Freelancer Stats Bar */}
 {!loadingApi && (
 <FreelancerStats
 matches={kpis.matchedJobs}
 bidsUsed={kpis.bidsUsed}
 bidLimit={kpis.bidLimit}
 winRate={kpis.winRate}
 earningPotential={kpis.earningPotential}
 />
 )}

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
 <h2 className="text-base font-semibold text-[#f0e8d4] uppercase tracking-wider">
 All Open Jobs
 </h2>
 <span className="text-[11px] text-[#a8997e] font-medium">{filteredJobs.length} jobs</span>
 </div>

 {/* ── Filter Toolbar ────────────────────────────────────── */}
 <div className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] mb-5 overflow-visible">

 {/* Main row */}
 <div className="flex items-center gap-2 px-4 py-3">

 {/* Search */}
 <div className="relative flex-1 min-w-0">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a8997e]" />
 <input
 type="text"
 placeholder="Search jobs or skills..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="w-full h-9 pl-8 pr-8 text-sm bg-[#111625] border border-[rgba(201,168,76,0.22)] rounded-[6px] text-[#f0e8d4] placeholder:text-[#8A9BAA] outline-none focus:border-[rgba(201,168,76,0.35)]/60 transition-colors"
 />
 {search && (
 <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
 <X className="h-3 w-3 text-[#a8997e]" />
 </button>
 )}
 </div>

 {/* Divider */}
 <div className="h-6 w-px bg-[rgba(201,168,76,0.22)] shrink-0" />

 {/* Category select — styled pill */}
 <div className="relative shrink-0">
 <select
 value={filterCategory}
 onChange={e => setFilterCategory(e.target.value)}
 className="h-9 pl-3 pr-7 text-xs font-medium rounded-[6px] border border-[rgba(201,168,76,0.22)] bg-[#111625] text-[#a8997e] outline-none appearance-none cursor-pointer hover:border-[rgba(201,168,76,0.35)]/50 transition-colors"
 >
 <option value="all">All Categories</option>
 {JOB_CATEGORIES.map(c => (
 <option key={c.value} value={c.value}>{c.label}</option>
 ))}
 </select>
 <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#a8997e]" />
 </div>

 {/* Divider */}
 <div className="h-6 w-px bg-[rgba(201,168,76,0.22)] shrink-0" />

 {/* Sort chip */}
 <div className="relative shrink-0">
 <button
 onClick={() => setShowSortMenu(v => !v)}
 className={`h-9 px-3 text-xs font-semibold rounded-[6px] border flex items-center gap-1.5 transition-all ${
 sortBy !== "best_match"
 ? "border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.12)] text-[#c9a84c]"
 : "border-[rgba(201,168,76,0.22)] bg-transparent text-[#a8997e] hover:border-[rgba(201,168,76,0.35)]/50"
 }`}
 >
 {FREELANCER_SORTS.find(s => s.value === sortBy)?.label ?? "Sort"}
 <ChevronDown className={`h-3 w-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
 </button>
 {showSortMenu && (
 <div className="absolute left-0 top-11 z-50 glass-panel border border-[rgba(201,168,76,0.22)] rounded-[6px] py-1 min-w-[160px] ">
 {FREELANCER_SORTS.map(s => (
 <button
 key={s.value}
 onClick={() => { setSortBy(s.value); setShowSortMenu(false); }}
 className={`w-full text-left px-4 py-2 text-xs hover:bg-[#111625] transition-colors ${sortBy === s.value ? "text-[#c9a84c] font-semibold" : "text-[#a8997e]"}`}
 >
 {s.label}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Skills chip */}
 <div className="relative shrink-0">
 <button
 onClick={() => setShowSkillPicker(v => !v)}
 className={`h-9 px-3 text-xs font-semibold rounded-[6px] border flex items-center gap-1.5 transition-all ${
 filterSkills.length > 0
 ? "border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.12)] text-[#c9a84c]"
 : "border-[rgba(201,168,76,0.22)] bg-transparent text-[#a8997e] hover:border-[rgba(201,168,76,0.35)]/50"
 }`}
 >
 Skills {filterSkills.length > 0 && <span className="bg-[#c9a84c] text-[#050810] rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold">{filterSkills.length}</span>}
 <ChevronDown className={`h-3 w-3 transition-transform ${showSkillPicker ? "rotate-180" : ""}`} />
 </button>
 {showSkillPicker && (
 <div className="absolute left-0 top-11 z-50 glass-panel border border-[rgba(201,168,76,0.22)] rounded-[6px] p-3 w-[260px] ">
 <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
 {SKILL_TAXONOMY.slice(0, 24).map(s => (
 <button
 key={s}
 onClick={() => setFilterSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
 className={`px-2 py-1 rounded-[3px] text-[11px] border transition-colors ${filterSkills.includes(s) ? "bg-[#c9a84c] text-[#050810] border-transparent" : "bg-[#111625] text-[#f0e8d4] border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)]"}`}
 >
 {s}
 </button>
 ))}
 </div>
 {filterSkills.length > 0 && (
 <button onClick={() => setFilterSkills([])} className="w-full mt-2 text-[11px] text-[#B02020] hover:opacity-70 transition-opacity">
 Clear all
 </button>
 )}
 </div>
 )}
 </div>

 {/* Advanced chip */}
 <button
 onClick={() => setShowAdvanced(v => !v)}
 className={`h-9 px-3 text-xs font-semibold rounded-[6px] border flex items-center gap-1.5 shrink-0 transition-all ${
 hasAdvancedFilters
 ? "border-[rgba(201,168,76,0.35)] bg-[rgba(201,168,76,0.12)] text-[#c9a84c]"
 : "border-[rgba(201,168,76,0.22)] bg-transparent text-[#a8997e] hover:border-[rgba(201,168,76,0.35)]/50"
 }`}
 >
 Filters {hasAdvancedFilters && <span className="h-1.5 w-1.5 rounded-full bg-[#c9a84c]" />}
 <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
 </button>
 </div>

 {/* Advanced drawer */}
 {showAdvanced && (
 <div className="border-t border-[rgba(201,168,76,0.22)]/50 px-4 py-3 flex flex-wrap items-center gap-2">
 <span className="text-[11px] text-[#a8997e] font-medium uppercase tracking-wider mr-1">Advanced:</span>

 <select
 value={filterBudget}
 onChange={e => setFilterBudget(e.target.value as BudgetFilter)}
 className="h-8 pl-3 pr-6 text-xs font-medium rounded-[3px] border border-[rgba(201,168,76,0.22)] bg-[#111625] text-[#a8997e] outline-none appearance-none cursor-pointer hover:border-[rgba(201,168,76,0.35)]/50 transition-colors"
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
 className="h-8 pl-3 pr-6 text-xs font-medium rounded-[3px] border border-[rgba(201,168,76,0.22)] bg-[#111625] text-[#a8997e] outline-none appearance-none cursor-pointer hover:border-[rgba(201,168,76,0.35)]/50 transition-colors"
 >
 <option value="">All Competition</option>
 <option value="low">Low (&lt;3 bids)</option>
 <option value="medium">Medium (3–5)</option>
 <option value="high">High (5+)</option>
 </select>

 <select
 value={filterHourlyRate}
 onChange={e => setFilterHourlyRate(e.target.value as HourlyFilter)}
 className="h-8 pl-3 pr-6 text-xs font-medium rounded-[3px] border border-[rgba(201,168,76,0.22)] bg-[#111625] text-[#a8997e] outline-none appearance-none cursor-pointer hover:border-[rgba(201,168,76,0.35)]/50 transition-colors"
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
 className="h-8 px-3 text-[11px] font-semibold text-[#B02020] hover:opacity-70 transition-opacity rounded-[3px] border border-[#B02020]/30"
 >
 Reset
 </button>
 )}
 </div>
 )}
 </div>

 {/* Job Grid */}
 {filteredJobs.length === 0 ? (
 <div className="text-center py-16 text-[#a8997e]">
 <p className="text-lg mb-2">No jobs found</p>
 <p className="text-sm">Try adjusting your filters or check back later</p>
 </div>
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
