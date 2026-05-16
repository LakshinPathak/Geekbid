"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatMoney, getCurrentPrice, timeAgo } from "@/lib/utils";
import { Briefcase, Clock, Zap, TrendingDown, CheckCircle2, PlusCircle } from "lucide-react";
import Link from "next/link";

export default function MyJobsPage() {
  const { jobs, now, currentUser, mounted } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const myJobs = useMemo(() => {
    const all = jobs.filter(j =>
      j.clientId === (currentUser?.id ?? currentUser?._id) ||
      j.acceptedBy === (currentUser?.id ?? currentUser?._id)
    );
    if (filter === "open") return all.filter(j => j.status === "open");
    if (filter === "accepted") return all.filter(j => j.status === "accepted");
    return all;
  }, [jobs, currentUser, filter]);

  if (!mounted) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">My Jobs</h1>
            <p className="text-xs text-neutral-400">{myJobs.length} total</p>
          </div>
        </div>
        {currentUser?.role === "client" && (
          <Link href="/post-job">
            <Button size="sm" className="bg-black hover:bg-neutral-800 text-white rounded-lg gap-1.5">
              <PlusCircle className="h-4 w-4" /> Post Job
            </Button>
          </Link>
        )}
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="bg-white border border-neutral-200 shadow-sm h-10 p-1 rounded-xl">
          <TabsTrigger value="all" className="text-xs rounded-lg px-4">All</TabsTrigger>
          <TabsTrigger value="open" className="text-xs rounded-lg px-4">Open</TabsTrigger>
          <TabsTrigger value="accepted" className="text-xs rounded-lg px-4">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {myJobs.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <Briefcase className="h-7 w-7 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-700 mb-1">No jobs found</h3>
          <p className="text-sm text-neutral-400">{currentUser?.role === "client" ? "Post your first job to get started!" : "Accept a job from the feed to see it here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myJobs.map(job => (
            <Card key={job.id ?? job._id} className="border-neutral-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/jobs/${job.id ?? job._id}`}>
                      <h3 className="text-sm font-semibold text-black hover:underline underline-offset-2 cursor-pointer truncate">{job.title}</h3>
                    </Link>
                    <Badge variant={job.status === "open" ? "default" : "outline"}
                      className={`text-[10px] shrink-0 rounded-full px-2 ${job.status === "open" ? "bg-black text-white" : "border-neutral-300 text-neutral-500"}`}>
                      {job.status === "open" ? "Live" : "Completed"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(job.postedAt)}</span>
                    <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> ${job.decayRatePerHour}/hr</span>
                    {job.skillsRequired.slice(0, 3).map(s => <span key={s} className="text-neutral-400">{s}</span>)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-black">
                    {job.status === "accepted" ? formatMoney(job.finalPrice ?? 0) : formatMoney(getCurrentPrice(job, now))}
                  </p>
                  <p className="text-[10px] text-neutral-400">{job.status === "open" ? "Current price" : "Final price"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
