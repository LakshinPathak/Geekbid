"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney, getCurrentPrice, timeAgo, getCategoryLabel } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase, Clock, TrendingDown, CheckCircle2, PlusCircle,
  Calendar, MessageSquare, ArrowRight, Inbox, Star, X, Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function MyJobsPage() {
  const { jobs, bids, now, currentUser, mounted, transactions, reviews, users, submitReview, toggleFeatured } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [reviewModal, setReviewModal] = useState<{ jobId: string; revieweeId: string; revieweeName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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
    <div className="min-h-screen bg-[#EDE8DC] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#C8923D]/40 border-t-[#C8923D] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EDE8DC] grid-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F1924]">My Jobs</h1>
            <p className="text-[#253444] text-sm mt-1">
              {isClient ? "Jobs you've posted" : "Jobs you've accepted or bid on"}
            </p>
          </div>
          {isClient && (
            <Link href="/post-job">
              <button className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5">
                <PlusCircle className="h-4 w-4" /> Post Job
              </button>
            </Link>
          )}
        </div>

        {/* Tab switcher */}
        <div className="inline-flex w-full overflow-x-auto scrollbar-hide glass-panel-sm rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === t.key
                  ? "bg-[#C8923D] text-white"
                  : "text-[#253444] hover:text-[#0F1924]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Job list */}
        {myJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl glass-panel-sm flex items-center justify-center mb-4">
              <Briefcase className="h-7 w-7 text-[#4A5568]" />
            </div>
            <h3 className="text-lg font-bold text-[#0F1924] mb-1">No jobs found</h3>
            <p className="text-sm text-[#253444] mb-4">
              {isClient ? "Post your first job to get started!" : "Accept a job from the feed to see it here."}
            </p>
            <Link href={isClient ? "/post-job" : "/feed"}>
              <button className="bg-[#C8923D] text-white font-semibold text-sm px-4 sm:px-6 py-2.5 rounded-xl hover:bg-[#E0A33E] transition-all">
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
                  className="job-card card-reveal p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#C8923D]/40"
                  style={{ borderRadius: '16px', animationDelay: `${i * 0.06}s` }}
                >
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/jobs/${jid}`}>
                        <h3 className="text-[#0F1924] font-medium text-base hover:text-[#C8923D] transition-colors cursor-pointer truncate">
                          {job.title}
                        </h3>
                      </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[#4A5568] text-xs mt-1">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {timeAgo(job.postedAt)}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {bidCount} bids</span>
                      <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> ${job.decayRatePerHour}/hr</span>
                      {job.status === "accepted" && job.acceptedBy && (
                        <span className="flex items-center gap-1 text-[#C8923D]"><CheckCircle2 className="h-3 w-3" /> Accepted</span>
                      )}
                    </div>
                  </div>

                  {/* Center: Price */}
                  <div className="text-right sm:text-center shrink-0">
                    <p className="font-heading text-xl font-bold text-[#C8923D]">{formatMoney(price)}</p>
                    <p className="text-[#4A5568] text-[11px]">{isOpen ? "Current price" : "Final price"}</p>
                  </div>

                  {/* Right: Status + Action */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    <span className={`rounded-full text-[11px] font-medium px-3 py-1 border ${
                      isOpen
                        ? "bg-[#7A5218] text-white border-transparent"
                        : "bg-[#8A8A9A]/10 text-[#253444] border-[#8A8A9A]/20"
                    }`}>
                      {isOpen ? "Live" : "Completed"}
                    </span>
                    <Link href={`/jobs/${jid}`}>
                      <button className="border border-[#BEB5A5] text-[#0F1924] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#D8D0C0] transition-all">
                        View
                      </button>
                    </Link>
                    {isOpen && isClient && (
                      <>
                        <button
                          onClick={async () => {
                            const r = await toggleFeatured(jid, !job.featured);
                            r.ok ? toast.success(r.message) : toast.error(r.message);
                          }}
                          className={`flex items-center gap-1 border text-xs font-medium px-3 py-2 rounded-lg transition-all ${
                            job.featured ? "border-yellow-500/30 text-[#7A5218] hover:bg-[rgba(122,82,24,0.12)]" : "border-[#BEB5A5] text-[#253444] hover:bg-[#D8D0C0]"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" /> {job.featured ? "Featured" : "Feature"}
                        </button>
                        <Link href="/inbox">
                          <button className="border border-[#BEB5A5] text-[#253444] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#D8D0C0] transition-all">
                            Chat
                          </button>
                        </Link>
                      </>
                    )}
                    {!isOpen && (() => {
                      const tx = transactions.find(t => t.jobId === jid && t.escrowStatus === "released");
                      const uid = currentUser?.id ?? currentUser?._id ?? "";
                      const alreadyReviewed = reviews.some(r => r.jobId === jid && r.reviewerId === uid);
                      if (tx && !alreadyReviewed) {
                        const revieweeId = isClient ? (job.acceptedBy ?? "") : job.clientId;
                        const reviewee = users.find(u => u.id === revieweeId || u._id === revieweeId);
                        return (
                          <button
                            onClick={() => { setReviewModal({ jobId: jid, revieweeId, revieweeName: reviewee?.fullName ?? "User" }); setReviewRating(5); setReviewComment(""); }}
                            className="flex items-center gap-1 border border-yellow-500/30 text-[#7A5218] text-xs font-medium px-4 py-2 rounded-lg hover:bg-[rgba(122,82,24,0.12)] transition-all"
                          >
                            <Star className="h-3 w-3" /> Review
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel animate-scale-in p-6 w-full max-w-md" style={{ borderRadius: '16px' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-[#0F1924]">Review {reviewModal.revieweeName}</h3>
              <button onClick={() => setReviewModal(null)} className="text-[#4A5568] hover:text-[#0F1924]"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-4">
              <label className="text-[#253444] text-xs font-medium block mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setReviewRating(star)} className="transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 ${star <= reviewRating ? "text-[#7A5218] fill-[#7A5218]" : "text-[#4A5568]"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[#253444] text-xs font-medium block mb-1.5">Comment (optional)</label>
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Share your experience..."
                className="glass-input w-full p-3 rounded-xl text-sm resize-none"
              />
              <p className="text-[#4A5568] text-xs mt-1">{reviewComment.length}/1000</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="flex-1 h-10 border border-[#BEB5A5] text-[#0F1924] font-medium rounded-xl text-sm hover:bg-[#D8D0C0] transition-all">
                Cancel
              </button>
              <button
                onClick={async () => {
                  setReviewSubmitting(true);
                  const r = await submitReview(reviewModal.jobId, reviewModal.revieweeId, reviewRating, reviewComment);
                  setReviewSubmitting(false);
                  if (r.ok) { toast.success("Review submitted!"); setReviewModal(null); }
                  else toast.error(r.message);
                }}
                disabled={reviewSubmitting}
                className="flex-1 h-10 btn-primary rounded-xl text-sm disabled:opacity-50"
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
