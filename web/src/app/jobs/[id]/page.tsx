"use client";
import { use, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { formatMoney, getCurrentPrice, getHoursToFloor, formatHoursToFloor, timeAgo, getGeekTier, getCategoryLabel } from "@/lib/utils";
import { toast } from "sonner";
import {
  Clock, TrendingDown, DollarSign, Zap, ArrowLeft, Eye, Shield, Send,
  MessageSquare, BarChart3, Timer, Calendar, CheckCircle2, User,
} from "lucide-react";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { jobs, bids, users, now, currentUser, acceptJob, counterBid, milestones, fetchMilestones, updateMilestone } = useApp();
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg, setCounterMsg] = useState("");
  const [counterError, setCounterError] = useState("");

  const job = useMemo(() => jobs.find(j => (j.id === jobId) || (j._id === jobId)), [jobs, jobId]);
  const jobMilestones = useMemo(() => milestones.filter(m => m.jobId === jobId).sort((a, b) => a.order - b.order), [milestones, jobId]);

  useEffect(() => { fetchMilestones(jobId); }, [jobId, fetchMilestones]);
  const jobBids = useMemo(() => bids.filter(b => b.jobId === jobId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [bids, jobId]);

  if (!job) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
      <p className="text-[#55556A] text-lg">Job not found</p>
    </div>
  );

  const client = users.find(u => u.id === job.clientId);
  const current = getCurrentPrice(job, now);
  const eta = getHoursToFloor(job, now);
  const isAtFloor = eta <= 0;
  const isFreelancer = currentUser?.role === "freelancer";
  const isClient = currentUser?.role === "client" && (currentUser.id === job.clientId || currentUser._id === job.clientId);
  const isOpen = job.status === "open";
  const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;
  const deadlineDate = new Date(job.deadlineAt);
  const deadlineMs = deadlineDate.getTime() - now.getTime();
  const deadlineHrs = Math.max(0, deadlineMs / 3600000);

  const handleAccept = async () => {
    const r = await acceptJob(job.id ?? job._id ?? "");
    if (r.ok) toast.success("Job accepted!", { description: r.message });
    else toast.error("Cannot accept", { description: r.message });
  };

  const handleCounter = async () => {
    setCounterError("");
    const price = Number(counterPrice);
    if (!price || price <= 0) { setCounterError("Enter a valid price"); return; }
    if (price > current) { setCounterError(`Price must be at most ${formatMoney(current)}`); return; }
    if (price < job.minimumPrice) { setCounterError(`Price must be at least ${formatMoney(job.minimumPrice)}`); return; }
    const r = await counterBid(job.id ?? job._id ?? "", price, counterMsg);
    if (r.ok) { toast.success("Counter-bid sent!", { description: r.message }); setCounterPrice(""); setCounterMsg(""); }
    else toast.error("Counter-bid failed", { description: r.message });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-[#8A8A9A] text-sm hover:text-[#00FF88] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left Column ─── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Job header */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#E8E8EC]">{job.title}</h1>
                  {client && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-8 h-8 bg-[#00FF88]/10 text-[#00FF88] text-xs font-semibold rounded-full flex items-center justify-center">
                        {client.avatarInitial}
                      </div>
                      <div>
                        <p className="text-sm text-[#8A8A9A]">Posted by <span className="text-[#E8E8EC] font-medium">{client.fullName}</span></p>
                        <p className="text-xs text-[#55556A] flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(job.postedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium shrink-0 ${
                  isOpen
                    ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20"
                    : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                }`}>{job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
              </div>

              {/* Skills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.skillsRequired.map(s => {
                  const isMatch = currentUser?.skills?.includes(s);
                  return (
                    <span key={s} className={`px-2.5 py-1 rounded-md text-xs border ${
                      isMatch
                        ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20"
                        : "bg-[#0A0A0F] border-[#1E1E2A] text-[#55556A]"
                    }`}>{isMatch && "&#10003; "}{s}</span>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8">
              <p className="text-[#55556A] text-xs uppercase tracking-wider font-semibold mb-3">Description</p>
              <p className="text-[#8A8A9A] text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Price Analytics */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-[#00FF88]" />
                <p className="text-[#E8E8EC] text-sm font-semibold">Price Analytics</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[#55556A] text-xs">Starting Price</p>
                  <p className="font-heading text-xl font-bold text-[#E8E8EC] mt-1">{formatMoney(job.startingPrice)}</p>
                </div>
                <div>
                  <p className="text-[#55556A] text-xs">Current Price</p>
                  <p className="font-heading text-xl font-bold text-[#00FF88] mt-1 animate-price-pulse">{formatMoney(current)}</p>
                </div>
                <div>
                  <p className="text-[#55556A] text-xs">Floor Price</p>
                  <p className="font-heading text-xl font-bold text-[#E8E8EC] mt-1">{formatMoney(job.minimumPrice)}</p>
                </div>
                <div>
                  <p className="text-[#55556A] text-xs">Decay Rate</p>
                  <p className="font-heading text-xl font-bold text-red-400/70 mt-1">-${job.decayRatePerHour}/hr</p>
                </div>
              </div>
              <div className="h-2 bg-[#1E1E2A] rounded-full mt-4 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pricePercent))}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-[#55556A]">
                <span>Floor: {formatMoney(job.minimumPrice)}</span>
                <span>Start: {formatMoney(job.startingPrice)}</span>
              </div>
            </div>

            {/* Bids */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-4 w-4 text-[#00FF88]" />
                <p className="text-[#E8E8EC] text-sm font-semibold">Bids ({jobBids.length})</p>
              </div>

              {jobBids.length === 0 ? (
                <p className="text-[#55556A] text-sm">No bids yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {jobBids.map(bid => {
                    const bidder = users.find(u => u.id === bid.freelancerId);
                    const tier = bidder ? getGeekTier(bidder.geekScore) : null;
                    return (
                      <div key={bid.id} className="bg-[#0A0A0F] rounded-xl p-4 border border-[#1E1E2A] hover:border-[#00FF88]/10 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 bg-[#12121A] border border-[#1E1E2A] text-[#8A8A9A] text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                              {bidder?.avatarInitial ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-[#E8E8EC]">{bidder?.fullName ?? "Freelancer"}</span>
                                {tier && (
                                  <span className="bg-[#00FF88]/10 text-[#00FF88] text-[10px] px-2 py-0.5 rounded-full">Score: {bidder?.geekScore}</span>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  bid.bidType === "accept" ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-blue-500/10 text-blue-400"
                                }`}>{bid.bidType}</span>
                              </div>
                              {bid.message && <p className="text-xs text-[#8A8A9A] italic mt-1">{bid.message}</p>}
                              <p className="text-[10px] text-[#55556A] mt-1">{timeAgo(bid.createdAt)}</p>
                            </div>
                          </div>
                          <p className="font-heading text-lg font-bold text-[#00FF88] shrink-0">{formatMoney(bid.bidPrice)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Milestones */}
            {jobMilestones.length > 0 && (
              <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-[#00FF88]" />
                  <p className="text-[#E8E8EC] text-sm font-semibold">Milestones ({jobMilestones.filter(m => m.status === "approved").length}/{jobMilestones.length} completed)</p>
                </div>
                <div className="h-2 bg-[#1E1E2A] rounded-full mb-4 overflow-hidden">
                  <div className="h-2 bg-[#00FF88] rounded-full transition-all" style={{ width: `${(jobMilestones.filter(m => m.status === "approved").length / jobMilestones.length) * 100}%` }} />
                </div>
                <div className="space-y-3">
                  {jobMilestones.map(ms => {
                    const statusColors: Record<string, string> = {
                      pending: "text-[#55556A] bg-[#55556A]/10 border-[#55556A]/20",
                      in_progress: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                      submitted: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
                      approved: "text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20",
                      disputed: "text-red-400 bg-red-500/10 border-red-500/20",
                    };
                    return (
                      <div key={ms.id} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#55556A] text-xs font-mono">#{ms.order}</span>
                            <span className="text-[#E8E8EC] text-sm font-medium">{ms.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${statusColors[ms.status] ?? statusColors.pending}`}>
                              {ms.status.replace("_", " ")}
                            </span>
                            <span className="text-[#00FF88] text-sm font-semibold">{formatMoney(ms.amount)}</span>
                          </div>
                        </div>
                        {ms.description && <p className="text-[#8A8A9A] text-xs mt-1">{ms.description}</p>}
                        <div className="flex gap-2 mt-2">
                          {isFreelancer && ms.status === "in_progress" && (
                            <button onClick={async () => { const r = await updateMilestone(ms.id, "submit"); r.ok ? toast.success(r.message) : toast.error(r.message); }}
                              className="text-xs bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 px-3 py-1 rounded-lg hover:bg-[#00FF88]/20 transition-colors">
                              Submit
                            </button>
                          )}
                          {isClient && ms.status === "submitted" && (
                            <button onClick={async () => { const r = await updateMilestone(ms.id, "approve"); r.ok ? toast.success(r.message) : toast.error(r.message); }}
                              className="text-xs bg-[#00FF88] text-[#0A0A0F] font-semibold px-3 py-1 rounded-lg hover:bg-[#00CC6A] transition-colors">
                              Approve & Release
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ─── Right Column ─── */}
          <div className="space-y-4 lg:sticky lg:top-20 self-start">
            {/* Live price card */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
                <p className="text-[#8A8A9A] text-sm font-medium">Live Price</p>
              </div>
              <p className="font-heading text-4xl font-bold text-[#00FF88] animate-price-pulse">{formatMoney(current)}</p>
              <p className="text-[#55556A] text-xs line-through mt-1">Started at {formatMoney(job.startingPrice)}</p>
              <div className="flex items-center gap-1.5 text-[#8A8A9A] text-sm mt-2">
                <Timer className="h-4 w-4" />
                {isAtFloor ? "At floor price" : `${formatHoursToFloor(eta)} remaining`}
              </div>
              <p className="text-[#55556A] text-xs mt-1">Closes {deadlineDate.toLocaleDateString()}</p>
            </div>

            {/* Actions */}
            {isFreelancer && isOpen && (
              <div className="space-y-3">
                <button onClick={handleAccept}
                  className="w-full bg-[#00FF88] text-[#0A0A0F] font-semibold py-3 rounded-xl hover:bg-[#00CC6A] transition-all glow-green flex items-center justify-center gap-2 text-sm">
                  <Zap className="h-4 w-4" /> Accept at {formatMoney(current)}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#1E1E2A]" />
                  <span className="text-xs text-[#55556A]">or</span>
                  <div className="flex-1 h-px bg-[#1E1E2A]" />
                </div>

                <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-5 space-y-3">
                  <p className="text-[#E8E8EC] text-sm font-semibold flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-[#00FF88]" /> Counter-Bid</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#55556A] text-sm">$</span>
                    <input type="number" placeholder={`${job.minimumPrice} - ${Math.floor(current)}`}
                      value={counterPrice} onChange={e => { setCounterPrice(e.target.value); setCounterError(""); }}
                      className="w-full h-11 pl-8 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] font-heading text-lg placeholder:text-[#55556A] focus:border-[#00FF88]/50 outline-none transition-all" />
                  </div>
                  <textarea placeholder="Why should the client pick you?"
                    value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={3}
                    className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#55556A] focus:border-[#00FF88]/50 outline-none transition-all px-4 py-2.5 resize-none" />
                  {counterError && <p className="text-red-400 text-xs">{counterError}</p>}
                  <button onClick={handleCounter}
                    className="w-full border border-[#00FF88] text-[#00FF88] font-semibold py-3 rounded-xl hover:bg-[#00FF88]/5 transition-all flex items-center justify-center gap-2 text-sm">
                    <Send className="h-4 w-4" /> Submit Counter-Bid
                  </button>
                </div>
              </div>
            )}

            {isClient && isOpen && (
              <div className="space-y-3">
                <Link href={`/post-job`}>
                  <button className="w-full border border-[#1E1E2A] text-[#E8E8EC] font-semibold py-3 rounded-xl hover:bg-[#12121A] transition-all text-sm">
                    Edit Job
                  </button>
                </Link>
              </div>
            )}

            {job.status === "accepted" && (
              <div className="bg-[#12121A] border border-[#00FF88]/20 rounded-2xl p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-[#00FF88] mx-auto mb-2" />
                <p className="font-heading text-lg font-bold text-[#E8E8EC]">Job Accepted</p>
                <p className="font-heading text-2xl font-bold text-[#00FF88] mt-1">{formatMoney(job.finalPrice ?? current)}</p>
                {job.acceptedBy && (
                  <p className="text-[#8A8A9A] text-xs mt-2">
                    Accepted by {users.find(u => u.id === job.acceptedBy)?.fullName ?? "Freelancer"}
                  </p>
                )}
              </div>
            )}

            {/* Job details sidebar */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 space-y-3">
              {[
                { icon: Clock, label: "Estimated Hours", value: `${job.estimatedHours}h` },
                { icon: Calendar, label: "Posted", value: new Date(job.postedAt).toLocaleDateString() },
                { icon: Timer, label: "Deadline", value: deadlineDate.toLocaleDateString() },
                { icon: Eye, label: "Visibility", value: "Public" },
                { icon: DollarSign, label: "Platform Fee", value: "10%" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-[#55556A]" />
                    <span className="text-[#8A8A9A] text-sm">{item.label}</span>
                  </div>
                  <span className="text-[#E8E8EC] text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
