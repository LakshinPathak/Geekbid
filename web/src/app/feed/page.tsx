"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import {
  getCurrentPrice, getHoursToFloor, formatHoursToFloor, formatMoney,
  SKILL_TAXONOMY, JOB_CATEGORIES, getCategoryLabel, type Job,
} from "@/lib/utils";
import { getDemandLevel, getEffectiveDecayRate } from "@/lib/pricing";
import { toast } from "sonner";
import {
  Search, Plus, X, Clock, Target, ChevronDown,
  MessageSquare, Timer, Inbox, Briefcase, TrendingDown,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────
type SortOption =
  | "newest" | "highest_price" | "fastest_decay"
  | "nearest_deadline" | "best_match" | "most_bids"
  | "needs_attention" | "highest_savings";

type BudgetFilter      = "" | "0-500" | "500-1000" | "1000-2000" | "2000+";
type CompetitionFilter = "" | "low" | "medium" | "high";
type HourlyFilter      = "" | "30" | "50" | "75" | "100";

// ── Sort option lists ────────────────────────────────────────────────────────
const SHARED_SORTS: { value: SortOption; label: string }[] = [
  { value: "newest",           label: "Newest"         },
  { value: "highest_price",    label: "Highest Price"  },
  { value: "most_bids",        label: "Most Popular"   },
  { value: "fastest_decay",    label: "Hot Decay"      },
  { value: "nearest_deadline", label: "Deadline"       },
];

const FREELANCER_SORTS: { value: SortOption; label: string }[] = [
  ...SHARED_SORTS,
  { value: "best_match",       label: "Best Match"     },
];

const CLIENT_SORTS: { value: SortOption; label: string }[] = [
  ...SHARED_SORTS,
  { value: "needs_attention",  label: "Needs Attention" },
  { value: "highest_savings",  label: "Highest Savings" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function getCompetitionBadge(bidCount: number) {
  if (bidCount === 0) return { label: "Be First", color: "text-[#00FF88]",  bg: "bg-[#00FF88]/10",  border: "border-[#00FF88]/20"  };
  if (bidCount <= 2)  return { label: "LOW",      color: "text-[#00FF88]",  bg: "bg-[#00FF88]/10",  border: "border-[#00FF88]/20"  };
  if (bidCount <= 5)  return { label: "MEDIUM",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
  return                     { label: "HIGH",     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    };
}

function getJobHealth(job: Job, now: Date) {
  const deadlineHrs = (new Date(job.deadlineAt).getTime() - now.getTime()) / 3600000;
  const hoursPosted = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
  const bidCount    = job.bidCount ?? 0;

  if (deadlineHrs < 6 && bidCount === 0)
    return { label: "Urgent",          color: "text-red-400",    dot: "bg-red-400"    };
  if (bidCount === 0 && hoursPosted > 6)
    return { label: "Needs Attention", color: "text-yellow-400", dot: "bg-yellow-400" };
  if (bidCount > 0 && deadlineHrs > 12)
    return { label: "Healthy",         color: "text-[#00FF88]",  dot: "bg-[#00FF88]"  };
  // has bids but expiring soon
  return   { label: "Expiring",        color: "text-yellow-400", dot: "bg-yellow-400" };
}

function getPriceTrajectory(effectiveRate: number) {
  if (effectiveRate > 20) return { label: "Dropping fast",  icon: "⚡", color: "text-red-400"    };
  if (effectiveRate > 10) return { label: "Steady decline", icon: "📉", color: "text-yellow-400" };
  return                         { label: "Holding steady", icon: "🐢", color: "text-[#6E6E85]"  };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const {
    jobs, bids, now, users, currentUser,
    acceptJob, toggleWatch, watchedJobIds, mounted, recommendedJobs,
  } = useApp();

  const router = useRouter();

  // base filters
  const [search,         setSearch]         = useState("");
  const [sortBy,         setSortBy]         = useState<SortOption>("newest");
  const [filterSkills,   setFilterSkills]   = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showSkillPicker, setShowSkillPicker] = useState(false);

  // freelancer-specific filters
  const [filterBudget,      setFilterBudget]      = useState<BudgetFilter>("");
  const [filterCompetition, setFilterCompetition] = useState<CompetitionFilter>("");
  const [filterHourlyRate,  setFilterHourlyRate]  = useState<HourlyFilter>("");

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const uid          = currentUser?.id ?? currentUser?._id ?? "";
  const isFreelancer = currentUser?.role === "freelancer";
  const isClient     = currentUser?.role === "client";
  const mySkills     = currentUser?.skills ?? [];

  const sortOptions = isClient ? CLIENT_SORTS : FREELANCER_SORTS;

  // ── Filtered & sorted feed ─────────────────────────────────────────────────
  const openJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = jobs
      .filter(j => j.status === "open")
      .filter(j => q ? `${j.title} ${j.skillsRequired.join(" ")}`.toLowerCase().includes(q) : true)
      .filter(j => filterSkills.length > 0 ? filterSkills.some(s => j.skillsRequired.includes(s)) : true)
      .filter(j => filterCategory !== "all" ? j.category === filterCategory : true)
      // ── Freelancer-only filters ───────────────────────────────────────────
      .filter(j => {
        if (!isFreelancer || !filterBudget) return true;
        const p = getCurrentPrice(j, now);
        if (filterBudget === "0-500")     return p <= 500;
        if (filterBudget === "500-1000")  return p > 500  && p <= 1000;
        if (filterBudget === "1000-2000") return p > 1000 && p <= 2000;
        if (filterBudget === "2000+")     return p > 2000;
        return true;
      })
      .filter(j => {
        if (!isFreelancer || !filterCompetition) return true;
        const bc = j.bidCount ?? 0;
        if (filterCompetition === "low")    return bc < 3;
        if (filterCompetition === "medium") return bc >= 3 && bc <= 5;
        if (filterCompetition === "high")   return bc > 5;
        return true;
      })
      .filter(j => {
        if (!isFreelancer || !filterHourlyRate || !j.estimatedHours) return true;
        const rate = getCurrentPrice(j, now) / j.estimatedHours;
        return rate >= Number(filterHourlyRate);
      });

    switch (sortBy) {
      case "highest_price":
        filtered.sort((a, b) => getCurrentPrice(b, now) - getCurrentPrice(a, now));
        break;
      case "fastest_decay":
        filtered.sort((a, b) => b.decayRatePerHour - a.decayRatePerHour);
        break;
      case "nearest_deadline":
        filtered.sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());
        break;
      case "best_match":
        filtered.sort((a, b) => {
          const sk = currentUser?.skills ?? [];
          return b.skillsRequired.filter(s => sk.includes(s)).length
               - a.skillsRequired.filter(s => sk.includes(s)).length;
        });
        break;
      case "most_bids":
        filtered.sort((a, b) => (b.bidCount ?? 0) - (a.bidCount ?? 0));
        break;
      case "needs_attention":
        filtered.sort((a, b) => {
          const aHrs = (new Date(a.deadlineAt).getTime() - now.getTime()) / 3600000;
          const bHrs = (new Date(b.deadlineAt).getTime() - now.getTime()) / 3600000;
          const aScore = (a.bidCount ?? 0) * 10 + Math.max(0, aHrs);
          const bScore = (b.bidCount ?? 0) * 10 + Math.max(0, bHrs);
          return aScore - bScore; // ascending: low bids + near deadline first
        });
        break;
      case "highest_savings":
        filtered.sort((a, b) => {
          const aSavings = Math.max(0, a.startingPrice - getCurrentPrice(a, now));
          const bSavings = Math.max(0, b.startingPrice - getCurrentPrice(b, now));
          return bSavings - aSavings;
        });
        break;
      default:
        filtered.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }

    // Pin client's own jobs to the top of the grid
    if (isClient && uid) {
      return [...filtered.filter(j => j.clientId === uid), ...filtered.filter(j => j.clientId !== uid)];
    }
    return filtered;
  }, [
    jobs, search, sortBy, filterSkills, filterCategory, now,
    currentUser?.skills, isFreelancer, isClient, uid, filterBudget, filterCompetition, filterHourlyRate,
  ]);

  // ── Client KPIs ────────────────────────────────────────────────────────────
  const clientKPIs = useMemo(() => {
    if (!isClient) return null;
    const myOpen = jobs.filter(j => j.status === "open" && j.clientId === uid);
    return {
      myJobs:      myOpen.length,
      totalSavings: myOpen.reduce((s, j) => s + Math.max(0, j.startingPrice - getCurrentPrice(j, now)), 0),
      totalBids:   myOpen.reduce((s, j) => s + (j.bidCount ?? 0), 0),
      avgDecay:    myOpen.length > 0 ? myOpen.reduce((s, j) => s + j.decayRatePerHour, 0) / myOpen.length : 0,
      myOpenJobs:  myOpen,
    };
  }, [jobs, now, isClient, uid]);

  // ── Freelancer KPIs ────────────────────────────────────────────────────────
  const freelancerKPIs = useMemo(() => {
    if (!isFreelancer) return null;
    const matched     = jobs.filter(j => j.status === "open" && mySkills.some(s => j.skillsRequired.includes(s)));
    const wonJobs     = jobs.filter(j => j.acceptedBy === uid).length;
    const myBidsCount = bids.filter(b => b.freelancerId === uid).length;
    const bidLimit    = currentUser?.plan === "pro" ? 50 : currentUser?.plan === "enterprise" ? 200 : 10;
    return {
      matches:        matched.length,
      bidsThisMonth:  currentUser?.planLimits?.bidsPlacedThisMonth ?? 0,
      bidLimit,
      winRate:        myBidsCount > 0 ? Math.round((wonJobs / myBidsCount) * 100) : 0,
      earningPotential: matched.reduce((s, j) => s + getCurrentPrice(j, now), 0),
    };
  }, [jobs, bids, now, isFreelancer, uid, mySkills, currentUser?.plan, currentUser?.planLimits]);

  // ── Market Intelligence (client only) ────────────────────────────────────
  const marketIntel = useMemo(() => {
    if (!isClient || !uid) return null;
    const myOpen = jobs.filter(j => j.status === "open" && j.clientId === uid);
    if (myOpen.length === 0) return null;
    const cats = [...new Set(myOpen.map(j => j.category).filter(Boolean))] as string[];
    if (cats.length === 0) return null;
    const mktJobs = jobs.filter(j => j.status === "open" && j.clientId !== uid && j.category != null && cats.includes(j.category));
    if (mktJobs.length === 0) return null;

    const avgStarting = mktJobs.reduce((s, j) => s + j.startingPrice, 0) / mktJobs.length;
    const avgDecay    = mktJobs.reduce((s, j) => s + j.decayRatePerHour, 0) / mktJobs.length;

    const firstBidHours: number[] = [];
    for (const job of mktJobs) {
      const jid = job.id ?? job._id ?? "";
      const first = bids
        .filter(b => b.jobId === jid)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
      if (first) {
        const hrs = (new Date(first.createdAt).getTime() - new Date(job.postedAt).getTime()) / 3600000;
        if (hrs >= 0) firstBidHours.push(hrs);
      }
    }
    const avgFirstBid = firstBidHours.length > 0
      ? firstBidHours.reduce((s, h) => s + h, 0) / firstBidHours.length
      : null;

    const skillFreq: Record<string, number> = {};
    for (const job of mktJobs)
      for (const s of job.skillsRequired) skillFreq[s] = (skillFreq[s] ?? 0) + 1;
    const topSkills = Object.entries(skillFreq).sort(([, a], [, b]) => b - a).slice(0, 4).map(([s]) => s);

    return { avgStarting, avgDecay, avgFirstBid, topSkills, catLabels: cats.map(c => getCategoryLabel(c)).join(", "), count: mktJobs.length };
  }, [jobs, bids, isClient, uid]);

  const toggleFilterSkill = (skill: string) =>
    setFilterSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  const clearAllFilters = () => {
    setSearch(""); setFilterSkills([]); setFilterCategory("all");
    setFilterBudget(""); setFilterCompetition(""); setFilterHourlyRate("");
  };

  const handleAcceptFromCard = async (jobId: string) => {
    const r = await acceptJob(jobId);
    r.ok
      ? toast.success("Job accepted!", { description: r.message })
      : toast.error("Cannot accept", { description: r.message });
  };

  const hasFreelancerFiltersActive = filterBudget || filterCompetition || filterHourlyRate;

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">

      {/* ── Header Strip ─────────────────────────────────────────────────── */}
      <div className="bg-[#12121A] border-b border-[#1E1E2A] py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#E8E8EC]">
              {isClient ? "My Marketplace" : "Job Feed"}
            </h1>
            <p className="text-[#8A8A9A] text-sm mt-0.5">
              {isClient
                ? `${clientKPIs?.myJobs ?? 0} active job${(clientKPIs?.myJobs ?? 0) !== 1 ? "s" : ""} · monitor and manage`
                : `${freelancerKPIs?.matches ?? 0} open jobs matching your skills`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Client KPI boxes */}
            {isClient && clientKPIs && (
              <div className="flex gap-2">
                <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">My Jobs</p>
                  <p className="font-heading text-lg font-bold text-[#E8E8EC]">{clientKPIs.myJobs}</p>
                </div>
                <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Savings</p>
                  <p className="font-heading text-lg font-bold text-[#00FF88]">{formatMoney(clientKPIs.totalSavings)}</p>
                </div>
                <div className="hidden sm:block bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Total Bids</p>
                  <p className="font-heading text-lg font-bold text-[#E8E8EC]">{clientKPIs.totalBids}</p>
                </div>
                <div className="hidden sm:block bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Avg Decay</p>
                  <p className="font-heading text-lg font-bold text-[#E8E8EC]">${clientKPIs.avgDecay.toFixed(0)}<span className="text-[#6E6E85] text-sm">/hr</span></p>
                </div>
              </div>
            )}

            {/* Freelancer KPI boxes */}
            {isFreelancer && freelancerKPIs && (
              <div className="flex gap-2">
                <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Matches</p>
                  <p className="font-heading text-lg font-bold text-[#00FF88]">{freelancerKPIs.matches}</p>
                </div>
                <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Bids Used</p>
                  <p className="font-heading text-lg font-bold text-[#E8E8EC]">
                    {freelancerKPIs.bidsThisMonth}<span className="text-[#6E6E85] text-sm">/{freelancerKPIs.bidLimit}</span>
                  </p>
                </div>
                <div className="hidden sm:block bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Win Rate</p>
                  <p className="font-heading text-lg font-bold text-[#E8E8EC]">{freelancerKPIs.winRate}%</p>
                </div>
                <div className="hidden sm:block bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[76px]">
                  <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Potential</p>
                  <p className="font-heading text-lg font-bold text-[#00FF88]">{formatMoney(freelancerKPIs.earningPotential)}</p>
                </div>
              </div>
            )}

            {isClient && (
              <Link href="/post-job">
                <button className="flex items-center gap-2 bg-[#00FF88] text-[#0A0A0F] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#00CC6A] transition-all">
                  <Plus className="h-4 w-4" /> Post a Job
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── My Jobs at a Glance (client only) ─────────────────────────────── */}
      {isClient && clientKPIs && clientKPIs.myOpenJobs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-3 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#00FF88]" /> Your Jobs — Live Status
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {clientKPIs.myOpenJobs.map(job => {
              const current      = getCurrentPrice(job, now);
              const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;
              const health       = getJobHealth(job, now);
              const jid          = job.id ?? job._id ?? "";
              const savings      = Math.max(0, job.startingPrice - current);

              // Top 2 counter-bids sorted by lowest price
              const topBids = bids
                .filter(b => b.jobId === jid && b.bidType === "counter")
                .sort((a, b) => a.bidPrice - b.bidPrice)
                .slice(0, 2);
              const hasActiveBids = topBids.length > 0;

              return (
                <div key={jid} className="shrink-0 min-w-[280px] max-w-[320px]">
                  <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-4 hover:border-[#00FF88]/20 transition-all flex flex-col gap-3">
                    {/* Health + savings */}
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 text-[11px] font-bold ${health.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${health.dot} animate-pulse`} />
                        {health.label}
                      </span>
                      {savings > 0 && (
                        <span className="text-[11px] text-[#00FF88] font-semibold">Saving {formatMoney(savings)}</span>
                      )}
                    </div>

                    {/* Title + price */}
                    <div>
                      <h3 className="font-heading text-sm font-semibold text-[#E8E8EC] line-clamp-1">{job.title}</h3>
                      <p className="font-heading text-lg font-bold text-[#00FF88] mt-0.5">{formatMoney(current)}</p>
                      <p className="text-[#6E6E85] text-[11px]">Floor: {formatMoney(job.minimumPrice)}</p>
                      <div className="h-1 bg-[#1E1E2A] rounded-full mt-1.5">
                        <div className="h-1 bg-[#00FF88] rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pricePercent))}%` }} />
                      </div>
                    </div>

                    {/* Bid previews */}
                    {topBids.length > 0 ? (
                      <div className="border-t border-[#1E1E2A] pt-2 space-y-1.5">
                        {topBids.map(bid => {
                          const bidder = users.find(u => u.id === bid.freelancerId || u._id === bid.freelancerId);
                          return (
                            <div key={bid.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-[#00FF88]/10 text-[#00FF88] text-[9px] font-bold flex items-center justify-center">
                                  {bidder?.avatarInitial ?? "?"}
                                </div>
                                <span className="text-[#8A8A9A] text-[11px]">
                                  {bidder?.fullName?.split(" ")[0] ?? "Freelancer"}
                                  <span className="text-[#6E6E85]"> · GS {bidder?.geekScore ?? "—"}</span>
                                </span>
                              </div>
                              <span className="text-[#00FF88] text-[11px] font-bold">{formatMoney(bid.bidPrice)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[#6E6E85] text-[11px] border-t border-[#1E1E2A] pt-2">
                        {(job.bidCount ?? 0) > 0 ? `${job.bidCount} interest${(job.bidCount ?? 0) !== 1 ? "s" : ""}` : "No bids yet"}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {hasActiveBids && (
                        <button
                          onClick={() => handleAcceptFromCard(jid)}
                          className="flex-1 text-xs bg-[#00FF88] text-[#0A0A0F] font-bold px-3 py-1.5 rounded-lg hover:bg-[#00CC6A] transition-colors"
                        >
                          Accept Best
                        </button>
                      )}
                      <Link
                        href={`/jobs/${jid}`}
                        className={`text-xs font-semibold hover:text-[#00CC6A] transition-colors ${hasActiveBids ? "text-[#8A8A9A] hover:text-[#E8E8EC]" : "text-[#00FF88]"}`}
                      >
                        {hasActiveBids ? "View All →" : "View Bids →"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Market Intelligence (client only) ────────────────────────────────── */}
      {isClient && marketIntel && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-sm font-semibold text-[#E8E8EC]">
                🔍 Market Activity — <span className="text-[#8A8A9A] font-normal">{marketIntel.catLabels}</span>
              </h2>
              <span className="text-[#6E6E85] text-xs">{marketIntel.count} similar job{marketIntel.count !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Avg Starting</p>
                <p className="font-heading text-base font-bold text-[#E8E8EC] mt-0.5">{formatMoney(marketIntel.avgStarting)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Avg Decay</p>
                <p className="font-heading text-base font-bold text-[#E8E8EC] mt-0.5">${marketIntel.avgDecay.toFixed(0)}/hr</p>
              </div>
              <div>
                <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Time to 1st Bid</p>
                <p className="font-heading text-base font-bold text-[#E8E8EC] mt-0.5">
                  {marketIntel.avgFirstBid != null ? `~${Math.round(marketIntel.avgFirstBid)}h` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6E6E85] uppercase tracking-wider font-semibold">Most Wanted</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {marketIntel.topSkills.map(s => (
                    <span key={s} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded px-1.5 py-0.5 text-[9px] text-[#8A8A9A]">{s}</span>
                  ))}
                  {marketIntel.topSkills.length === 0 && <span className="text-[#6E6E85] text-[11px]">—</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E85]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all text-sm" />
          </div>

          <div className="relative">
            <button onClick={() => setShowSkillPicker(!showSkillPicker)}
              className="flex items-center gap-2 h-11 px-4 border border-[#1E1E2A] rounded-xl text-[#8A8A9A] text-sm hover:border-[#00FF88]/30 transition-colors">
              Skills {filterSkills.length > 0 && (
                <span className="bg-[#00FF88]/10 text-[#00FF88] text-xs px-2 py-0.5 rounded-full">{filterSkills.length}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showSkillPicker && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-[#12121A] border border-[#1E1E2A] rounded-xl p-4 z-50 shadow-xl max-h-64 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_TAXONOMY.map(skill => (
                    <button key={skill} onClick={() => toggleFilterSkill(skill)}
                      className={`px-3 py-1 rounded-lg text-xs transition-all ${
                        filterSkills.includes(skill)
                          ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20"
                          : "bg-[#0A0A0F] border border-[#1E1E2A] text-[#8A8A9A] hover:text-[#E8E8EC]"
                      }`}>{skill}</button>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-[#1E1E2A]">
                  <button onClick={() => setFilterSkills([])} className="text-xs text-[#6E6E85] hover:text-[#E8E8EC]">Clear all</button>
                  <button onClick={() => setShowSkillPicker(false)} className="text-xs text-[#00FF88] hover:text-[#00CC6A] font-medium">Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Role-aware sort select */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
            className="h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#8A8A9A] text-sm outline-none focus:border-[#00FF88]/50 cursor-pointer appearance-none">
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {filterSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {filterSkills.map(s => (
              <span key={s} className="flex items-center gap-1.5 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs">
                {s}
                <button onClick={() => toggleFilterSkill(s)} className="hover:text-white transition-colors"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <button onClick={() => setFilterSkills([])} className="text-xs text-[#6E6E85] hover:text-[#E8E8EC] ml-2">Clear all</button>
          </div>
        )}
      </div>

      {/* ── Freelancer-specific filters ───────────────────────────────────────── */}
      {isFreelancer && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#6E6E85] text-xs font-medium shrink-0">Filters:</span>

            <select value={filterBudget} onChange={e => setFilterBudget(e.target.value as BudgetFilter)}
              className={`h-9 px-3 border rounded-lg text-xs outline-none cursor-pointer appearance-none transition-colors ${
                filterBudget ? "bg-[#00FF88]/5 border-[#00FF88]/30 text-[#00FF88]" : "bg-[#0A0A0F] border-[#1E1E2A] text-[#8A8A9A]"
              }`}>
              <option value="">Budget: Any</option>
              <option value="0-500">$0 – $500</option>
              <option value="500-1000">$500 – $1k</option>
              <option value="1000-2000">$1k – $2k</option>
              <option value="2000+">$2k+</option>
            </select>

            <select value={filterCompetition} onChange={e => setFilterCompetition(e.target.value as CompetitionFilter)}
              className={`h-9 px-3 border rounded-lg text-xs outline-none cursor-pointer appearance-none transition-colors ${
                filterCompetition ? "bg-[#00FF88]/5 border-[#00FF88]/30 text-[#00FF88]" : "bg-[#0A0A0F] border-[#1E1E2A] text-[#8A8A9A]"
              }`}>
              <option value="">Competition: Any</option>
              <option value="low">Low (&lt; 3 bids)</option>
              <option value="medium">Medium (3–5)</option>
              <option value="high">High (6+)</option>
            </select>

            <select value={filterHourlyRate} onChange={e => setFilterHourlyRate(e.target.value as HourlyFilter)}
              className={`h-9 px-3 border rounded-lg text-xs outline-none cursor-pointer appearance-none transition-colors ${
                filterHourlyRate ? "bg-[#00FF88]/5 border-[#00FF88]/30 text-[#00FF88]" : "bg-[#0A0A0F] border-[#1E1E2A] text-[#8A8A9A]"
              }`}>
              <option value="">Hourly Rate: Any</option>
              <option value="30">&gt; $30/hr</option>
              <option value="50">&gt; $50/hr</option>
              <option value="75">&gt; $75/hr</option>
              <option value="100">&gt; $100/hr</option>
            </select>

            {hasFreelancerFiltersActive && (
              <button
                onClick={() => { setFilterBudget(""); setFilterCompetition(""); setFilterHourlyRate(""); }}
                className="flex items-center gap-1 text-xs text-[#6E6E85] hover:text-[#E8E8EC] transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Category Tabs ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <div className="flex overflow-x-auto scrollbar-hide gap-2 flex-nowrap pb-1">
          <button onClick={() => setFilterCategory("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filterCategory === "all"
                ? "bg-[#00FF88] text-[#0A0A0F] border-[#00FF88]"
                : "bg-[#12121A] border-[#1E1E2A] text-[#8A8A9A] hover:text-[#E8E8EC] hover:border-[#00FF88]/30"
            }`}
          >All</button>
          {JOB_CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setFilterCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filterCategory === cat.value
                  ? "bg-[#00FF88] text-[#0A0A0F] border-[#00FF88]"
                  : "bg-[#12121A] border-[#1E1E2A] text-[#8A8A9A] hover:text-[#E8E8EC] hover:border-[#00FF88]/30"
              }`}
            >{cat.label}</button>
          ))}
        </div>
      </div>

      {/* ── Enhanced Recommended for You (freelancer only) ─────────────────────── */}
      {isFreelancer && recommendedJobs.length > 0 && filterCategory === "all" && !search && filterSkills.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#00FF88]" /> Recommended for You
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {recommendedJobs.slice(0, 5).map(job => {
              const current        = getCurrentPrice(job, now);
              const jid            = job.id ?? job._id ?? "";
              const matched        = job.skillsRequired.filter(s => mySkills.includes(s));
              const unmatched      = job.skillsRequired.filter(s => !mySkills.includes(s));
              const competition    = getCompetitionBadge(job.bidCount ?? 0);
              const effectiveHourly = job.estimatedHours > 0 ? current / job.estimatedHours : 0;
              const hoursToFloor   = getHoursToFloor(job, now);
              const elapsedHrs     = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
              const effectiveRate  = job.pricingMode !== "fixed"
                ? getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? job.bidCount ?? 0, elapsedHrs)
                : job.decayRatePerHour;
              const trajectory     = getPriceTrajectory(effectiveRate);
              const suggestedPrice = Math.max(job.minimumPrice, Math.round(current * 0.80));

              return (
                <div key={jid} className="shrink-0 min-w-[280px] max-w-[320px]">
                  <div className="job-card-hover bg-[#12121A] border border-[#00FF88]/20 rounded-2xl hover:border-[#00FF88]/40 overflow-hidden">
                    {/* Clickable content area */}
                    <Link href={`/jobs/${jid}`} className="block p-4 pb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                          {job.matchScore}% Match
                        </span>
                        <span className={`${competition.bg} ${competition.color} border ${competition.border} rounded-full px-2.5 py-0.5 text-[11px] font-bold`}>
                          {competition.label}
                        </span>
                      </div>

                      <h3 className="font-heading text-sm font-semibold text-[#E8E8EC] line-clamp-2">{job.title}</h3>

                      <p className="font-heading text-lg font-bold text-[#00FF88] mt-2">{formatMoney(current)}</p>
                      {effectiveHourly > 0 && (
                        <p className="text-[#8A8A9A] text-xs">{formatMoney(effectiveHourly)}/hr effective</p>
                      )}

                      {/* Time to floor + trajectory */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[#6E6E85] text-[11px]">
                          ⏱ {hoursToFloor <= 0 ? "At floor" : `${formatHoursToFloor(hoursToFloor)} to floor`}
                        </span>
                        <span className={`text-[11px] font-medium ${trajectory.color}`}>
                          · {trajectory.icon} {trajectory.label}
                        </span>
                      </div>

                      {/* Skill checklist */}
                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                        {matched.slice(0, 3).map(s => (
                          <span key={s} className="text-[11px] text-[#00FF88]">✓ {s}</span>
                        ))}
                        {unmatched.slice(0, 2).map(s => (
                          <span key={s} className="text-[11px] text-[#6E6E85]">✗ {s}</span>
                        ))}
                      </div>
                    </Link>

                    {/* Quick Bid row */}
                    <div className="px-4 pb-4">
                      <Link href={`/jobs/${jid}`} className="block">
                        <button className="w-full flex items-center justify-between bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] text-xs font-semibold px-3 py-2 rounded-xl hover:bg-[#00FF88]/20 transition-all">
                          <span>Quick Bid</span>
                          <span className="font-heading">{formatMoney(suggestedPrice)} suggested</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Job Grid ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl 2xl:max-w-screen-xl mx-auto px-4 sm:px-6 mt-6 pb-12">
        {openJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[#12121A] border border-[#1E1E2A] flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-[#6E6E85]" />
            </div>
            <h3 className="text-lg font-bold text-[#E8E8EC]">No jobs match your filters</h3>
            <p className="text-sm text-[#8A8A9A] mt-1">Try broadening your search</p>
            <button onClick={clearAllFilters}
              className="mt-4 px-4 sm:px-6 py-2 border border-[#1E1E2A] text-[#E8E8EC] rounded-xl text-sm hover:bg-[#12121A] transition-colors">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openJobs.map((job, i) => {
              const client   = users.find(u => u.id === job.clientId);
              const current  = getCurrentPrice(job, now);
              const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;
              const deadlineMs   = new Date(job.deadlineAt).getTime() - now.getTime();
              const deadlineHrs  = Math.max(0, Math.floor(deadlineMs / 3600000));
              const jobId        = job.id ?? job._id ?? "";
              const elapsedHrs   = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
              const effectiveRate = job.pricingMode !== "fixed"
                ? getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? job.bidCount ?? 0, elapsedHrs)
                : job.decayRatePerHour;

              // Role-specific card data
              const bidCount      = job.bidCount ?? 0;
              const matchScore    = isFreelancer && mySkills.length > 0 && job.skillsRequired.length > 0
                ? Math.round((job.skillsRequired.filter(s => mySkills.includes(s)).length / job.skillsRequired.length) * 100)
                : 0;
              const competition   = isFreelancer ? getCompetitionBadge(bidCount) : null;
              const demand        = !isFreelancer ? getDemandLevel(job.uniqueBidderCount ?? bidCount) : null;
              const effectiveHourly = isFreelancer && job.estimatedHours > 0 ? current / job.estimatedHours : 0;

              // Price trajectory
              const trajectory = getPriceTrajectory(effectiveRate);
              const trajectoryCtx = job.pricingMode !== "fixed"
                ? effectiveRate < job.decayRatePerHour * 0.7  ? " · demand slowing"
                : effectiveRate > job.decayRatePerHour * 1.2  ? " · no interest"
                : ""
                : "";

              // Savings badge (client's own jobs)
              const isMine   = isClient && job.clientId === uid;
              const jobSavings = Math.max(0, job.startingPrice - current);

              // Bid cooldown (30-minute per-job per-user)
              const myLastBidOnJob = isFreelancer
                ? bids
                    .filter(b => b.freelancerId === uid && b.jobId === jobId)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                : undefined;
              const cooldownMinsLeft = myLastBidOnJob
                ? Math.max(0, 30 - (now.getTime() - new Date(myLastBidOnJob.createdAt).getTime()) / 60000)
                : 0;
              const isOnCooldown = cooldownMinsLeft > 0;

              return (
                <div key={jobId} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  {/* Card: outer div with border, NOT a Link — avoids nested <a> */}
                  <div className={`job-card-hover bg-[#12121A] border rounded-2xl overflow-hidden transition-all duration-200 group ${
                    job.featured ? "border-l-[3px] border-l-[#F59E0B] border-yellow-500/20" : "border-[#1E1E2A]"
                  } hover:border-[#00FF88]/20`}>

                    {/* Clickable content area */}
                    <Link href={`/jobs/${jobId}`} className="block p-5 pb-4">
                      {/* Top row */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#00FF88]/10 text-[#00FF88] text-xs font-semibold rounded-full flex items-center justify-center shrink-0">
                            {client?.avatarInitial ?? "?"}
                          </div>
                          <div>
                            <p className="text-[#8A8A9A] text-xs leading-tight">{client?.fullName ?? "Client"}</p>
                            {client?.averageRating ? (
                              <p className="text-[11px] text-[#6E6E85] leading-tight">
                                ⭐ {client.averageRating.toFixed(1)} ({client.totalReviews ?? 0})
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {isFreelancer && matchScore > 0 && (
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                              matchScore >= 70
                                ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>{matchScore}% Match</span>
                          )}
                          {competition && (
                            <span className={`${competition.bg} ${competition.color} border ${competition.border} rounded-full px-2.5 py-0.5 text-[11px] font-bold`}>
                              {competition.label}
                            </span>
                          )}
                          {demand && (
                            <span className={`${demand.bgColor} ${demand.color} border ${demand.borderColor} rounded-full px-2.5 py-0.5 text-[11px] font-bold`}>
                              {demand.label}
                            </span>
                          )}
                          {job.featured && (
                            <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full px-2.5 py-0.5 text-[11px] font-bold">Featured</span>
                          )}
                          {isMine && (
                            <span className="bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                              {jobSavings > 0 ? `Saving ${formatMoney(jobSavings)}` : "My Job"}
                            </span>
                          )}
                          {job.category && (
                            <span className="bg-[#1A1A24] text-[#8A8A9A] border border-[#1E1E2A] rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                              {getCategoryLabel(job.category)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-heading text-lg font-semibold text-[#E8E8EC] mt-3 line-clamp-2 group-hover:text-[#00FF88] transition-colors">
                        {job.title}
                      </h3>

                      {/* Skills — ✓/✗ for freelancers, plain tags for clients */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.skillsRequired.slice(0, 4).map(s => {
                          const isMatched = mySkills.includes(s);
                          return isFreelancer ? (
                            <span key={s} className={`flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] border ${
                              isMatched
                                ? "bg-[#00FF88]/5 border-[#00FF88]/20 text-[#00FF88]"
                                : "bg-[#0A0A0F] border-[#1E1E2A] text-[#6E6E85]"
                            }`}>
                              <span>{isMatched ? "✓" : "✗"}</span>&nbsp;{s}
                            </span>
                          ) : (
                            <span key={s} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-md px-2 py-0.5 text-[#6E6E85] text-[11px]">{s}</span>
                          );
                        })}
                        {job.skillsRequired.length > 4 && (
                          <span className="text-[#6E6E85] text-[11px]">+{job.skillsRequired.length - 4}</span>
                        )}
                      </div>

                      {/* Price section */}
                      <div className="mt-4 bg-[#0A0A0F] rounded-xl p-3 border border-[#1E1E2A]">
                        <p className="text-[#6E6E85] text-[11px] uppercase tracking-wider">Current Price</p>
                        <p className="font-heading text-2xl font-bold text-[#00FF88] mt-0.5">{formatMoney(current)}</p>
                        <div className="flex justify-between mt-1">
                          <span className="text-[#6E6E85] text-xs">Floor: {formatMoney(job.minimumPrice)}</span>
                          <span className="text-red-400/70 text-xs">-${effectiveRate.toFixed(1)}/hr{job.pricingMode !== "fixed" ? " ⚡" : ""}</span>
                        </div>
                        {isFreelancer && effectiveHourly > 0 && (
                          <p className="text-[#8A8A9A] text-[11px] mt-1">{formatMoney(effectiveHourly)}/hr effective · {job.estimatedHours}h est.</p>
                        )}
                        <div className="h-1 bg-[#1E1E2A] rounded-full mt-2">
                          <div className="h-1 bg-[#00FF88] rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pricePercent))}%` }} />
                        </div>
                        <p className={`text-[11px] mt-1.5 ${trajectory.color}`}>
                          {trajectory.icon} {trajectory.label}{trajectoryCtx}
                        </p>
                      </div>
                    </Link>

                    {/* Bottom action row — outside the Link to allow nested interactions */}
                    <div className="px-5 pb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[#6E6E85] text-xs">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.estimatedHours}h</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {bidCount} bids</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-xs ${deadlineHrs < 6 ? "text-red-400" : "text-[#6E6E85]"}`}>
                          <Timer className="h-3 w-3" /> {deadlineHrs}h left
                        </span>

                        {/* Cooldown status + CTA — freelancer only */}
                        {isFreelancer && (
                          isOnCooldown ? (
                            <span className="flex items-center gap-1 text-[11px] text-[#6E6E85] bg-[#1A1A24] border border-[#1E1E2A] px-2.5 py-1 rounded-lg cursor-not-allowed">
                              ⏳ {Math.ceil(cooldownMinsLeft)}m cooldown
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#00FF88]">✓ Bid available</span>
                              <Link href={`/jobs/${jobId}`}>
                                <button className="text-[11px] font-semibold bg-[#00FF88]/10 border border-[#00FF88]/20 text-[#00FF88] px-2.5 py-1 rounded-lg hover:bg-[#00FF88]/20 transition-all whitespace-nowrap">
                                  Counter Bid →
                                </button>
                              </Link>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
