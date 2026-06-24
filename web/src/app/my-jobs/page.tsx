"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney, getCurrentPrice, timeAgo } from "@/lib/utils";
import {
  Briefcase, Clock, TrendingDown, CheckCircle2, PlusCircle,
  Calendar, MessageSquare, ArrowRight, Inbox,
} from "lucide-react";
import Link from "next/link";

export default function MyJobsPage() {
  const { jobs, bids, now, currentUser, mounted } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const isClient = currentUser?.role === "client";

  const myJobs = useMemo(() => {
    const uid = currentUser?.id ?? currentUser?._id;
    const all = jobs.filter(j =>
      j.clientId === uid || j.acceptedBy === uid
    );
    if (filter === "open") return all.filter(j => j.status === "open");
    if (filter === "accepted") return all.filter(j => j.status === "accepted");
    return all;
  }, [jobs, currentUser, filter]);

  const jobBidCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    bids.forEach(b => {
      const jid = b.jobId;
      counts[jid] = (counts[jid] || 0) + 1;
    });
    return counts;
  }, [bids]);

  const openCount = useMemo(() => {
    const uid = currentUser?.id ?? currentUser?._id;
    return jobs.filter(j => (j.clientId === uid || j.acceptedBy === uid) && j.status === "open").length;
  }, [jobs, currentUser]);

  const acceptedCount = useMemo(() => {
    const uid = currentUser?.id ?? currentUser?._id;
    return jobs.filter(j => (j.clientId === uid || j.acceptedBy === uid) && j.status === "accepted").length;
  }, [jobs, currentUser]);

  const tabs = [
    { key: "all", label: `All (${myJobs.length})` },
    { key: "open", label: `Open (${openCount})` },
    { key: "accepted", label: `Completed (${acceptedCount})` },
  ];

  if (!mounted) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#E8E8EC]">My Jobs</h1>
            <p className="text-[#8A8A9A] text-sm mt-1">
              {isClient ? "Jobs you've posted" : "Jobs you've accepted or bid on"}
            </p>
          </div>
          {isClient && (
            <Link href="/post-job">
              <button className="flex items-center gap-2 bg-[#00FF88] text-[#0A0A0F] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#00CC6A] transition-all">
                <PlusCircle className="h-4 w-4" /> Post Job
              </button>
            </Link>
          )}
        </div>

        {/* Tab switcher */}
        <div className="inline-flex bg-[#12121A] rounded-xl p-1 border border-[#1E1E2A] mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === t.key
                  ? "bg-[#00FF88] text-[#0A0A0F]"
                  : "text-[#8A8A9A] hover:text-[#E8E8EC]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Job list */}
        {myJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[#12121A] border border-[#1E1E2A] flex items-center justify-center mb-4">
              <Briefcase className="h-7 w-7 text-[#55556A]" />
            </div>
            <h3 className="text-lg font-bold text-[#E8E8EC] mb-1">No jobs found</h3>
            <p className="text-sm text-[#8A8A9A] mb-4">
              {isClient ? "Post your first job to get started!" : "Accept a job from the feed to see it here."}
            </p>
            <Link href={isClient ? "/post-job" : "/feed"}>
              <button className="bg-[#00FF88] text-[#0A0A0F] font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#00CC6A] transition-all">
                {isClient ? "Post a Job" : "Browse Feed"} <ArrowRight className="inline h-4 w-4 ml-1" />
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myJobs.map((job, i) => {
              const jid = job.id ?? job._id ?? "";
              const bidCount = jobBidCounts[jid] || 0;
              const isOpen = job.status === "open";
              const price = isOpen ? getCurrentPrice(job, now) : (job.finalPrice ?? 0);

              return (
                <div
                  key={jid}
                  className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-5 hover:border-[#00FF88]/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/jobs/${jid}`}>
                        <h3 className="text-[#E8E8EC] font-medium text-base hover:text-[#00FF88] transition-colors cursor-pointer truncate">
                          {job.title}
                        </h3>
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[#55556A] text-xs mt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {timeAgo(job.postedAt)}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {bidCount} bids</span>
                      <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> ${job.decayRatePerHour}/hr</span>
                      {job.status === "accepted" && job.acceptedBy && (
                        <span className="flex items-center gap-1 text-[#00FF88]"><CheckCircle2 className="h-3 w-3" /> Accepted</span>
                      )}
                    </div>
                  </div>

                  {/* Center: Price */}
                  <div className="text-right sm:text-center shrink-0">
                    <p className="font-heading text-xl font-bold text-[#00FF88]">{formatMoney(price)}</p>
                    <p className="text-[#55556A] text-[10px]">{isOpen ? "Current price" : "Final price"}</p>
                  </div>

                  {/* Right: Status + Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`rounded-full text-[10px] font-medium px-3 py-1 border ${
                      isOpen
                        ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20"
                        : "bg-[#8A8A9A]/10 text-[#8A8A9A] border-[#8A8A9A]/20"
                    }`}>
                      {isOpen ? "Live" : "Completed"}
                    </span>
                    <Link href={`/jobs/${jid}`}>
                      <button className="border border-[#1E1E2A] text-[#E8E8EC] text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#1A1A24] transition-all">
                        View
                      </button>
                    </Link>
                    {isOpen && isClient && (
                      <Link href="/inbox">
                        <button className="border border-[#1E1E2A] text-[#8A8A9A] text-xs font-medium px-4 py-2 rounded-lg hover:bg-[#1A1A24] transition-all">
                          Chat
                        </button>
                      </Link>
                    )}
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
