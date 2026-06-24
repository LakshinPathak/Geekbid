"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { getCurrentPrice, getHoursToFloor, formatHoursToFloor, formatMoney, SKILL_TAXONOMY, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, Plus, X, TrendingDown, Clock, Sparkles,
  DollarSign, Target, ChevronDown, MessageSquare, Timer,
  Code, Inbox, Users,
} from "lucide-react";

type SortOption = "newest" | "highest_price" | "fastest_decay" | "nearest_deadline" | "best_match";

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof Sparkles }[] = [
  { value: "newest", label: "Newest", icon: Sparkles },
  { value: "highest_price", label: "Highest Price", icon: DollarSign },
  { value: "fastest_decay", label: "Hot Decay", icon: TrendingDown },
  { value: "nearest_deadline", label: "Deadline", icon: Clock },
  { value: "best_match", label: "Best Match", icon: Target },
];

export default function FeedPage() {
  const { jobs, now, users, currentUser, acceptJob, toggleWatch, watchedJobIds, mounted } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [showSkillPicker, setShowSkillPicker] = useState(false);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const openJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = jobs
      .filter(j => j.status === "open")
      .filter(j => q ? `${j.title} ${j.skillsRequired.join(" ")}`.toLowerCase().includes(q) : true)
      .filter(j => filterSkills.length > 0 ? filterSkills.some(s => j.skillsRequired.includes(s)) : true);

    switch (sortBy) {
      case "highest_price": filtered.sort((a, b) => getCurrentPrice(b, now) - getCurrentPrice(a, now)); break;
      case "fastest_decay": filtered.sort((a, b) => b.decayRatePerHour - a.decayRatePerHour); break;
      case "nearest_deadline": filtered.sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()); break;
      case "best_match": filtered.sort((a, b) => {
        const sk = currentUser?.skills ?? [];
        return b.skillsRequired.filter(s => sk.includes(s)).length - a.skillsRequired.filter(s => sk.includes(s)).length;
      }); break;
      default: filtered.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }
    return filtered;
  }, [jobs, search, sortBy, filterSkills, now, currentUser?.skills]);

  const totalValue = useMemo(() => openJobs.reduce((s, j) => s + getCurrentPrice(j, now), 0), [openJobs, now]);
  const avgDecay = useMemo(() => {
    if (openJobs.length === 0) return 0;
    return openJobs.reduce((s, j) => s + j.decayRatePerHour, 0) / openJobs.length;
  }, [openJobs]);

  const handleAccept = async (jobId: string) => {
    const r = await acceptJob(jobId);
    r.ok ? toast.success("Job accepted!", { description: r.message }) : toast.error("Cannot accept", { description: r.message });
  };

  const toggleFilterSkill = (skill: string) => setFilterSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* ── Header Strip ── */}
      <div className="bg-[#12121A] border-b border-[#1E1E2A] py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#E8E8EC]">Job Feed</h1>
            <p className="text-[#8A8A9A] text-sm mt-0.5">{openJobs.length} open jobs with live pricing</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                <p className="text-[10px] text-[#55556A] uppercase tracking-wider font-semibold">Value</p>
                <p className="font-heading text-lg font-bold text-[#E8E8EC]">{formatMoney(totalValue)}</p>
              </div>
              <div className="hidden sm:block bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl px-4 py-2.5 text-center min-w-[90px]">
                <p className="text-[10px] text-[#55556A] uppercase tracking-wider font-semibold">Avg Decay</p>
                <p className="font-heading text-lg font-bold text-[#E8E8EC]">${avgDecay.toFixed(0)}<span className="text-[#55556A] text-sm">/hr</span></p>
              </div>
            </div>
            {currentUser?.role === "client" && (
              <Link href="/post-job">
                <button className="flex items-center gap-2 bg-[#00FF88] text-[#0A0A0F] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#00CC6A] transition-all">
                  <Plus className="h-4 w-4" /> Post a Job
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55556A]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] placeholder:text-[#55556A] focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/20 outline-none transition-all text-sm" />
          </div>

          {/* Skill filter */}
          <div className="relative">
            <button onClick={() => setShowSkillPicker(!showSkillPicker)}
              className="flex items-center gap-2 h-11 px-4 border border-[#1E1E2A] rounded-xl text-[#8A8A9A] text-sm hover:border-[#00FF88]/30 transition-colors">
              Skills {filterSkills.length > 0 && <span className="bg-[#00FF88]/10 text-[#00FF88] text-xs px-2 py-0.5 rounded-full">{filterSkills.length}</span>}
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
                  <button onClick={() => setFilterSkills([])} className="text-xs text-[#55556A] hover:text-[#E8E8EC]">Clear all</button>
                  <button onClick={() => setShowSkillPicker(false)} className="text-xs text-[#00FF88] hover:text-[#00CC6A] font-medium">Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
            className="h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#8A8A9A] text-sm outline-none focus:border-[#00FF88]/50 cursor-pointer appearance-none">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Active filter pills */}
        {filterSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {filterSkills.map(s => (
              <span key={s} className="flex items-center gap-1.5 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs">
                {s}
                <button onClick={() => toggleFilterSkill(s)} className="hover:text-white transition-colors"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <button onClick={() => setFilterSkills([])} className="text-xs text-[#55556A] hover:text-[#E8E8EC] ml-2">Clear all</button>
          </div>
        )}
      </div>

      {/* ── Job Grid ── */}
      <div className="max-w-7xl mx-auto px-6 mt-6 pb-12">
        {openJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[#12121A] border border-[#1E1E2A] flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-[#55556A]" />
            </div>
            <h3 className="text-lg font-bold text-[#E8E8EC]">No jobs match your filters</h3>
            <p className="text-sm text-[#8A8A9A] mt-1">Try broadening your search</p>
            <button onClick={() => { setSearch(""); setFilterSkills([]); }}
              className="mt-4 px-6 py-2 border border-[#1E1E2A] text-[#E8E8EC] rounded-xl text-sm hover:bg-[#12121A] transition-colors">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openJobs.map((job, i) => {
              const client = users.find(u => u.id === job.clientId);
              const current = getCurrentPrice(job, now);
              const eta = getHoursToFloor(job, now);
              const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;
              const deadlineMs = new Date(job.deadlineAt).getTime() - now.getTime();
              const deadlineHrs = Math.max(0, Math.floor(deadlineMs / 3600000));
              const jobId = job.id ?? job._id ?? "";

              return (
                <div key={jobId} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <Link href={`/jobs/${jobId}`}>
                    <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-5 hover:border-[#00FF88]/20 transition-all duration-300 group cursor-pointer">
                      {/* Top row */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#00FF88]/10 text-[#00FF88] text-xs font-semibold rounded-full flex items-center justify-center">
                            {client?.avatarInitial ?? "?"}
                          </div>
                          <span className="text-[#8A8A9A] text-xs">{client?.fullName ?? "Client"}</span>
                        </div>
                        <span className="bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-2.5 py-0.5 text-[10px] font-medium">
                          Open
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-heading text-lg font-semibold text-[#E8E8EC] mt-3 line-clamp-2 group-hover:text-[#00FF88] transition-colors">
                        {job.title}
                      </h3>

                      {/* Skills */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.skillsRequired.slice(0, 4).map(s => (
                          <span key={s} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-md px-2 py-0.5 text-[#55556A] text-[10px]">{s}</span>
                        ))}
                        {job.skillsRequired.length > 4 && <span className="text-[#55556A] text-[10px]">+{job.skillsRequired.length - 4}</span>}
                      </div>

                      {/* Price section */}
                      <div className="mt-4 bg-[#0A0A0F] rounded-xl p-3 border border-[#1E1E2A]">
                        <p className="text-[#55556A] text-[10px] uppercase tracking-wider">Current Price</p>
                        <p className="font-heading text-2xl font-bold text-[#00FF88] mt-0.5">{formatMoney(current)}</p>
                        <div className="flex justify-between mt-1">
                          <span className="text-[#55556A] text-xs">Floor: {formatMoney(job.minimumPrice)}</span>
                          <span className="text-red-400/70 text-xs">-${job.decayRatePerHour}/hr</span>
                        </div>
                        <div className="h-1 bg-[#1E1E2A] rounded-full mt-2">
                          <div className="h-1 bg-[#00FF88] rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pricePercent))}%` }} />
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className="mt-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-[#55556A] text-xs">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.estimatedHours}h</span>
                          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {(jobs.length > 0 ? Math.floor(Math.random() * 5) : 0)} bids</span>
                        </div>
                        <span className={`flex items-center gap-1 text-xs ${deadlineHrs < 6 ? "text-red-400" : "text-[#55556A]"}`}>
                          <Timer className="h-3 w-3" /> {deadlineHrs}h left
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
