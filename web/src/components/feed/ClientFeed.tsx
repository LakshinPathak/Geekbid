"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getCurrentPrice, SKILL_TAXONOMY, JOB_CATEGORIES, getCategoryLabel, type Job } from "@/lib/utils";
import { toast } from "sonner";
import { Search, Plus, X, ChevronDown, Settings } from "lucide-react";
import { sortJobs, CLIENT_SORTS, type SortOption, type BudgetFilter } from "./feed-helpers";

import SpendAnalytics from "./SpendAnalytics";
import JobHealthMatrix from "./JobHealthMatrix";
import MarketIntel from "./MarketIntel";
import ClientJobCard, { type TopBidder } from "./ClientJobCard";

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
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBudget, setFilterBudget] = useState<BudgetFilter>("");
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

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
        fetch("/api/client/dashboard",    { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
        fetch("/api/client/market-intel", { headers: { Authorization: `Bearer ${auth.accessToken}` } }),
      ]);
      if (dashRes.ok)  setDashboard(await dashRes.json());
      if (mktRes.ok)   setMarketIntel(await mktRes.json());
    } catch {
      // silent — falls back to local computation
    } finally {
      setLoading(false);
    }
  }, [auth.accessToken]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Derived values ────────────────────────────────────────────
  const uid     = currentUser?.id ?? currentUser?._id ?? "";
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

  // ── Top bidders per job ───────────────────────────────────────
  const topBiddersByJob = useMemo((): Record<string, TopBidder[]> => {
    const map: Record<string, TopBidder[]> = {};
    for (const job of myOpenJobs) {
      const jid = job.id ?? job._id ?? "";
      const jobBids = bids.filter(b => b.jobId === jid).sort((a, b) => a.bidPrice - b.bidPrice);
      map[jid] = jobBids.slice(0, 2).map(b => {
        const user = users.find(u => (u.id ?? u._id) === b.freelancerId);
        return {
          name: user?.fullName?.split(" ")[0] ?? "Bidder",
          geekScore: user?.geekScore ?? 0,
          price: b.bidPrice,
          freelancerId: b.freelancerId,
        };
      });
    }
    return map;
  }, [myOpenJobs, bids, users]);

  // ── Filtered marketplace jobs ─────────────────────────────────
  const marketplaceJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = jobs
      .filter(j => j.status === "open")
      .filter(j => q ? `${j.title} ${j.skillsRequired.join(" ")}`.toLowerCase().includes(q) : true)
      .filter(j => filterSkills.length > 0 ? filterSkills.some(s => j.skillsRequired.includes(s)) : true)
      .filter(j => filterCategory !== "all" ? j.category === filterCategory : true)
      .filter(j => {
        if (!filterBudget) return true;
        const p = getCurrentPrice(j, now);
        if (filterBudget === "0-500")     return p <= 500;
        if (filterBudget === "500-1000")  return p > 500  && p <= 1000;
        if (filterBudget === "1000-2000") return p > 1000 && p <= 2000;
        if (filterBudget === "2000+")     return p > 2000;
        return true;
      });

    const sorted = sortJobs(filtered, sortBy, now, mySkills);
    // Pin own jobs first
    return [...sorted.filter(j => j.clientId === uid), ...sorted.filter(j => j.clientId !== uid)];
  }, [jobs, search, sortBy, filterSkills, filterCategory, filterBudget, now, mySkills, uid]);

  const handleAcceptBest = async (jobId: string) => {
    const r = await acceptJob(jobId);
    r.ok
      ? toast.success("Job accepted!", { description: r.message })
      : toast.error("Cannot accept", { description: r.message });
  };

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#FCFAF4]">
      <div className="h-8 w-8 border-2 border-[#C8923D]/40 border-t-[#C8923D] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFAF4] grid-bg">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="glass-panel border-b border-[#E4DDD0] py-5 px-4 sm:px-6" style={{ borderRadius: 0 }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Settings className="h-5 w-5 text-[#C8923D]" />
              <h1 className="font-heading text-xl font-bold text-[#182739]">Procurement Terminal</h1>
            </div>
            <p className="text-[#3D4E5C] text-sm">
              {kpis.openJobs} active job{kpis.openJobs !== 1 ? "s" : ""}
              {kpis.totalSavings > 0 && ` · $${Math.round(kpis.totalSavings).toLocaleString()} saved from decay`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/post-job">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(200,146,61,0.10)] text-[#C8923D] border border-[#C8923D]/40 hover:bg-[rgba(200,146,61,0.10)] transition-colors text-sm font-semibold">
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

        {/* 2. My Jobs Health Matrix */}
        {myOpenJobs.length > 0 && (
          <JobHealthMatrix jobs={myOpenJobs} now={now} onAccept={handleAcceptBest} />
        )}

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

        {/* 4. Marketplace Browse ─────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#3D4E5C] uppercase tracking-wider">
              Marketplace Browse
            </h2>
            <span className="text-[11px] text-[#7B8694]">{marketplaceJobs.length} jobs</span>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7B8694]" />
              <input
                type="text"
                placeholder="Search jobs or skills..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input w-full h-10 pl-9 pr-4 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-[#7B8694]" />
                </button>
              )}
            </div>

            {/* Category */}
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="glass-input h-10 px-3 text-sm min-w-[140px]"
            >
              <option value="all">All Categories</option>
              {JOB_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            {/* Budget filter */}
            <select
              value={filterBudget}
              onChange={e => setFilterBudget(e.target.value as BudgetFilter)}
              className="glass-input h-10 px-3 text-sm"
            >
              <option value="">All Budgets</option>
              <option value="0-500">Under $500</option>
              <option value="500-1000">$500–$1k</option>
              <option value="1000-2000">$1k–$2k</option>
              <option value="2000+">$2k+</option>
            </select>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(v => !v)}
                className="glass-input h-10 px-3 text-sm flex items-center gap-1.5"
              >
                {CLIENT_SORTS.find(s => s.value === sortBy)?.label ?? "Sort"}
                <ChevronDown className="h-3.5 w-3.5 text-[#7B8694]" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-12 z-50 glass-panel border border-[#E4DDD0] rounded-xl py-1 min-w-[160px] shadow-xl">
                  {CLIENT_SORTS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => { setSortBy(s.value); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F5F2EA] transition-colors ${sortBy === s.value ? "text-[#C8923D]" : "text-[#3D4E5C]"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Skill filter */}
            <div className="relative">
              <button
                onClick={() => setShowSkillPicker(v => !v)}
                className={`glass-input h-10 px-3 text-sm flex items-center gap-1.5 ${filterSkills.length > 0 ? "border-[#C8923D]/50 text-[#C8923D]" : ""}`}
              >
                Skills {filterSkills.length > 0 && `(${filterSkills.length})`}
                <ChevronDown className="h-3.5 w-3.5 text-[#7B8694]" />
              </button>
              {showSkillPicker && (
                <div className="absolute right-0 top-12 z-50 glass-panel border border-[#E4DDD0] rounded-xl p-3 w-[260px] shadow-xl">
                  <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                    {SKILL_TAXONOMY.slice(0, 24).map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                        className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${filterSkills.includes(s) ? "bg-[rgba(200,146,61,0.10)] text-[#C8923D] border-[#C8923D]/40" : "bg-[#F5F2EA] text-[#3D4E5C] border-[#E4DDD0] hover:border-[#3A3A4A]"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {filterSkills.length > 0 && (
                    <button onClick={() => setFilterSkills([])} className="w-full mt-2 text-[11px] text-red-400 hover:text-red-300">
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Job Grid */}
          {marketplaceJobs.length === 0 ? (
            <div className="text-center py-16 text-[#7B8694]">
              <p className="text-lg mb-2">No jobs found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {marketplaceJobs.map(job => {
                const jobId = job.id ?? job._id ?? "";
                return (
                  <ClientJobCard
                    key={jobId}
                    job={job}
                    now={now}
                    topBidders={topBiddersByJob[jobId] ?? []}
                    isOwn={job.clientId === uid}
                    onAcceptBest={handleAcceptBest}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
