"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { JobCard } from "@/components/job-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCurrentPrice, SKILL_TAXONOMY, formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, SlidersHorizontal, Zap, TrendingDown, Clock, Target, Sparkles, X,
  BarChart3, ArrowUpRight, Layers, Activity, DollarSign
} from "lucide-react";

type SortOption = "newest" | "highest_price" | "fastest_decay" | "nearest_deadline" | "best_match";

export default function FeedPage() {
  const { jobs, now, users, currentUser, acceptJob, toggleWatch, watchedJobIds, mounted } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
    r.ok ? toast.success("🎉 Job Won!", { description: r.message }) : toast.error("Cannot accept", { description: r.message });
  };

  const toggleFilterSkill = (skill: string) => setFilterSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50/50">
      {/* ── Hero Banner ── */}
      <div className="bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Reverse Auction Feed</h1>
                  <p className="text-xs text-white/40 mt-0.5">Prices decay in real-time • Accept when the price is right</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px]">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Open</p>
                <p className="text-2xl font-black text-white">{openJobs.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px]">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Value</p>
                <p className="text-2xl font-black text-white">{formatMoney(totalValue)}</p>
              </div>
              <div className="hidden sm:block bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-center min-w-[100px]">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Avg Decay</p>
                <p className="text-2xl font-black text-white">${avgDecay.toFixed(0)}<span className="text-sm text-white/40">/hr</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or skill..."
              className="pl-11 h-11 bg-white border-neutral-200 shadow-sm rounded-xl focus:ring-2 focus:ring-black/5" />
          </div>
          {/* Mobile: Sheet filter, Desktop: Dialog */}
          <div className="hidden sm:block">
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 h-11 shadow-sm border-neutral-200 rounded-xl px-4">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter {filterSkills.length > 0 && <Badge className="ml-1 text-[10px] bg-black text-white border-0 rounded-full px-2">{filterSkills.length}</Badge>}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="text-lg font-bold">Filter by Skills</DialogTitle></DialogHeader>
                <Separator className="my-3" />
                <ScrollArea className="max-h-[300px]">
                  <div className="flex flex-wrap gap-2">
                    {SKILL_TAXONOMY.map(skill => (
                      <Badge key={skill} variant={filterSkills.includes(skill) ? "default" : "outline"}
                        className={`cursor-pointer transition-all text-xs rounded-lg py-1.5 px-3 ${filterSkills.includes(skill) ? "bg-black text-white hover:bg-neutral-800" : "hover:bg-neutral-50 hover:border-neutral-400 text-neutral-600"}`}
                        onClick={() => toggleFilterSkill(skill)}>{skill}</Badge>
                    ))}
                  </div>
                </ScrollArea>
                <Separator className="my-3" />
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setFilterSkills([])} className="text-neutral-500">Clear All</Button>
                  <Button size="sm" className="bg-black hover:bg-neutral-800 text-white rounded-lg px-6" onClick={() => setShowFilters(false)}>Apply</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 h-11 w-full shadow-sm border-neutral-200 rounded-xl">
                  <SlidersHorizontal className="h-4 w-4" /> Filter
                  {filterSkills.length > 0 && <Badge className="ml-1 text-[10px] bg-black text-white border-0 rounded-full px-2">{filterSkills.length}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader><SheetTitle>Filter by Skills</SheetTitle></SheetHeader>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SKILL_TAXONOMY.map(skill => (
                    <Badge key={skill} variant={filterSkills.includes(skill) ? "default" : "outline"}
                      className={`cursor-pointer text-xs rounded-lg py-1.5 px-3 ${filterSkills.includes(skill) ? "bg-black text-white" : "text-neutral-600"}`}
                      onClick={() => toggleFilterSkill(skill)}>{skill}</Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => setFilterSkills([])}>Clear</Button>
                  <Button className="flex-1 bg-black text-white">Apply</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Active filters */}
        {filterSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {filterSkills.map(s => (
              <Badge key={s} variant="secondary" className="gap-1.5 pr-1.5 bg-neutral-100 text-black border-neutral-200 rounded-lg">
                {s}
                <button onClick={() => toggleFilterSkill(s)} className="hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            <button onClick={() => setFilterSkills([])} className="text-xs text-neutral-400 hover:text-black transition-colors ml-2">Clear all</button>
          </div>
        )}

        {/* Sort tabs */}
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)} className="mb-6">
          <TabsList className="bg-white border border-neutral-200 shadow-sm h-10 p-1 rounded-xl">
            <TabsTrigger value="newest" className="text-xs rounded-lg gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Newest
            </TabsTrigger>
            <TabsTrigger value="highest_price" className="text-xs rounded-lg gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Highest
            </TabsTrigger>
            <TabsTrigger value="fastest_decay" className="text-xs rounded-lg gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" /> Hot Decay
            </TabsTrigger>
            <TabsTrigger value="nearest_deadline" className="text-xs rounded-lg gap-1.5 hidden sm:flex">
              <Clock className="h-3.5 w-3.5" /> Deadline
            </TabsTrigger>
            <TabsTrigger value="best_match" className="text-xs rounded-lg gap-1.5 hidden sm:flex">
              <Target className="h-3.5 w-3.5" /> Best Match
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Job grid */}
        {openJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-neutral-300" />
            </div>
            <h3 className="text-lg font-bold text-neutral-700">No matching jobs</h3>
            <p className="text-sm text-neutral-400 mt-1 max-w-xs mx-auto">Try adjusting your filters or check back soon for new opportunities.</p>
            <Button variant="outline" className="mt-4 rounded-lg" onClick={() => { setSearch(""); setFilterSkills([]); }}>Clear Filters</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openJobs.map((job, i) => {
              const client = users.find(u => u.id === job.clientId);
              return (
                <div key={job.id ?? job._id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-slide-up">
                  <JobCard job={job} now={now} client={client}
                    isFreelancer={currentUser?.role === "freelancer"}
                    isWatching={watchedJobIds.includes(job.id ?? job._id ?? "")}
                    onAccept={() => handleAccept(job.id ?? job._id ?? "")}
                    onWatch={() => toggleWatch(job.id ?? job._id ?? "")} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
