"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
 getCurrentPrice, getHoursToFloor, formatHoursToFloor,
 formatMoney, type Job,
} from "@/lib/utils";
import { getJobHealth, getCompetitionBadge } from "./feed-helpers";
import {
 Briefcase, Users, Clock, TrendingDown, ChevronDown,
 Star, CheckCircle, Plus, AlertCircle, Zap,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
interface User {
 id?: string; _id?: string;
 fullName?: string; avatarInitial?: string;
 geekScore?: number; averageRating?: number;
 totalReviews?: number; plan?: string;
}
interface Bid {
 id?: string; _id?: string;
 jobId: string; freelancerId: string;
 bidPrice: number; message?: string;
 createdAt?: string;
}
interface Props {
 jobs: Job[];
 bids: Bid[];
 users: User[];
 now: Date;
 onAcceptBest: (jobId: string) => void;
}

// ── Demand badge ───────────────────────────────────────────────────
function getDemandBadge(count: number) {
 if (count === 0) return { label: "No Bids", cls: "text-[#e57373] bg-[rgba(192,57,43,0.2)] border-[rgba(201,168,76,0.22)]" };
 if (count <= 2) return { label: "Interested", cls: "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]" };
 if (count <= 5) return { label: "In Demand", cls: "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]" };
 return { label: "🔥 Hot", cls: "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]" };
}

// ── Single bid row inside the expanded panel ───────────────────────
function BidRow({ bid, user, rank }: { bid: Bid; user?: User; rank: number }) {
 const isTop = rank === 1;
 return (
 <div className={`flex items-center gap-3 px-4 py-3 rounded-[3px] border ${
 isTop ? "bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]" : "bg-[#0a0e1a] border-transparent"
 }`}>
 {/* Rank */}
 <span className={`w-6 h-6 rounded-[3px] flex items-center justify-center text-[11px] font-bold shrink-0 ${
 isTop ? "bg-[#c9a84c] text-[#080b14]" : "bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.22)]"
 }`}>
 {rank}
 </span>

 {/* Avatar */}
 <div className="w-7 h-7 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] flex items-center justify-center text-xs font-bold text-[#c9a84c] shrink-0">
 {user?.avatarInitial ?? user?.fullName?.[0] ?? "?"}
 </div>

 {/* Name + GeekScore */}
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold text-[#f0e8d4] truncate">
 {user?.fullName ?? "Unknown"}
 {user?.plan === "pro" && (
 <span className="ml-1.5 px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold bg-[#2980b9] text-white">Pro</span>
 )}
 </p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] text-[#6b5f45]">GS {user?.geekScore ?? 0}</span>
 {(user?.averageRating ?? 0) > 0 && (
 <span className="flex items-center gap-0.5 text-[10px] text-[#c9a84c]">
 <Star className="h-2.5 w-2.5" />
 {user!.averageRating!.toFixed(1)} ({user?.totalReviews ?? 0})
 </span>
 )}
 </div>
 </div>

 {/* Bid message excerpt */}
 {bid.message && (
 <p className="text-[10px] text-[#6b5f45] italic line-clamp-1 max-w-[120px] hidden sm:block">
 &ldquo;{bid.message}&rdquo;
 </p>
 )}

 {/* Price */}
 <div className="text-right shrink-0">
 <p className={`font-heading text-sm ${isTop ? "text-[#c9a84c]" : "text-[#f0e8d4]"}`}>
 {formatMoney(bid.bidPrice)}
 </p>
 {bid.createdAt && (
 <p className="text-[9px] text-[#6b5f45]">
 {new Date(bid.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
 </p>
 )}
 </div>
 </div>
 );
}

// ── Job card with inline bid expansion ────────────────────────────
function MyJobCard({
 job, bids, users, now, onAcceptBest,
}: {
 job: Job; bids: Bid[]; users: User[]; now: Date; onAcceptBest: (id: string) => void;
}) {
 const [bidsOpen, setBidsOpen] = useState(false);
 const jobId = job.id ?? job._id ?? "";
 const current = getCurrentPrice(job, now);
 const savings = Math.max(0, job.startingPrice - current);
 const hoursLeft = getHoursToFloor(job, now);
 const health = getJobHealth(job, now);
 const bidCount = job.bidCount ?? 0;
 const demand = getDemandBadge(bidCount);

 const priceRange = job.startingPrice - job.minimumPrice;
 const decayPct = priceRange > 0
 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

 // Sorted bids for this job (cheapest first — best for client)
 const jobBids = useMemo(() =>
 bids.filter(b => b.jobId === jobId).sort((a, b) => a.bidPrice - b.bidPrice),
 [bids, jobId]
 );

 const handleAccept = (e: React.MouseEvent) => {
 e.preventDefault();
 onAcceptBest(jobId);
 };

 const healthBadgeCls =
 health.label === "Urgent" ? "text-[#e57373] bg-[rgba(192,57,43,0.2)] border-[rgba(201,168,76,0.22)]" :
 health.label === "Needs Attention" ? "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]" :
 "text-[#c9a84c] bg-[rgba(201,168,76,0.12)] border-[rgba(201,168,76,0.22)]";

 return (
 <div className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)] transition-all duration-200 overflow-hidden">

 {/* ── Card body (links to job detail) ───────────────────── */}
 <Link href={`/jobs/${jobId}`} className="block p-5">
 <div className="flex flex-col gap-4">

 {/* Header: badges */}
 <div>
 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex flex-wrap gap-1.5">
 <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${healthBadgeCls}`}>
 <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
 {health.label}
 </span>
 <span className={`px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${demand.cls}`}>
 {demand.label}
 </span>
 <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.22)]">
 My Job
 </span>
 </div>
 </div>

 <h3 className="font-heading text-[15px] text-[#f0e8d4] leading-snug line-clamp-2 hover:text-[#c9a84c] transition-colors">
 {job.title}
 </h3>

 {/* Skills */}
 <div className="flex flex-wrap gap-1 mt-2">
 {job.skillsRequired.slice(0, 4).map(s => (
 <span key={s} className="px-2 py-0.5 rounded-[2px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.22)]">{s}</span>
 ))}
 {job.skillsRequired.length > 4 && (
 <span className="px-2 py-0.5 rounded-[2px] text-[11px] bg-[#111625] text-[#6b5f45] border border-[rgba(201,168,76,0.22)]">
 +{job.skillsRequired.length - 4}
 </span>
 )}
 </div>
 </div>

 {/* Price + Savings */}
 <div>
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <span className="text-[11px] text-[#6b5f45] uppercase tracking-wider">Current Price</span>
 <p className="font-heading text-2xl text-[#f0e8d4]">{formatMoney(current)}</p>
 </div>
 {savings > 0 && (
 <div className="text-right">
 <span className="text-[11px] text-[#6b5f45] uppercase tracking-wider">Saved</span>
 <p className="font-heading text-lg text-[#4caf7d]">-{formatMoney(savings)}</p>
 </div>
 )}
 </div>

 {/* Decay bar */}
 <div className="space-y-1">
 <div className="h-1.5 w-full bg-[#1a1f30] rounded-full overflow-hidden">
 <div
 className="h-full rounded-full bg-[#c9a84c] transition-all duration-500"
 style={{ width: `${decayPct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#6b5f45]">
 <span>Floor {formatMoney(job.minimumPrice)}</span>
 {hoursLeft > 0 && <span className="text-[#c9a84c] font-semibold">⏱ {formatHoursToFloor(hoursLeft)} left</span>}
 <span>Start {formatMoney(job.startingPrice)}</span>
 </div>
 </div>
 </div>

 {/* Footer stats */}
 <div className="flex items-center justify-between pt-3 border-t border-[rgba(201,168,76,0.22)]">
 <div className="flex items-center gap-3 text-[11px] text-[#6b5f45]">
 <span className="flex items-center gap-1">
 <Users className="h-3 w-3" />
 {bidCount} bid{bidCount !== 1 ? "s" : ""}
 </span>
 {job.estimatedHours && (
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {job.estimatedHours}h
 </span>
 )}
 {hoursLeft > 0 && (
 <span className="flex items-center gap-1">
 <TrendingDown className="h-3 w-3" />
 {formatHoursToFloor(hoursLeft)} to floor
 </span>
 )}
 </div>

 {bidCount > 0 && (
 <button
 onClick={handleAccept}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors"
 >
 <CheckCircle className="h-3 w-3" />
 Accept Best
 </button>
 )}
 </div>
 </div>
 </Link>

 {/* ── Bids toggle button ─────────────────────────────────── */}
 {bidCount > 0 && (
 <button
 onClick={() => setBidsOpen(o => !o)}
 className="w-full flex items-center justify-between px-5 py-2.5 border-t border-[rgba(201,168,76,0.15)] bg-[#0a0e1a] hover:bg-[#111625] transition-colors text-xs font-semibold text-[#a8997e]"
 >
 <span className="flex items-center gap-1.5">
 <Zap className="h-3.5 w-3.5 text-[#c9a84c]" />
 {bidsOpen ? "Hide" : "View"} {bidCount} bid{bidCount !== 1 ? "s" : ""}
 </span>
 <ChevronDown className={`h-4 w-4 text-[#6b5f45] transition-transform ${bidsOpen ? "rotate-180" : ""}`} />
 </button>
 )}

 {/* ── Expanded bids feed ─────────────────────────────────── */}
 {bidsOpen && (
 <div className="border-t border-[rgba(201,168,76,0.12)] bg-[#0a0e1a]/50 px-4 py-4 space-y-2">
 <p className="text-[10px] text-[#6b5f45] uppercase tracking-wider font-semibold mb-3">
 Active Bids — sorted by lowest price
 </p>
 {jobBids.slice(0, 8).map((bid, i) => {
 const user = users.find(u => (u.id ?? u._id) === bid.freelancerId);
 return (
 <BidRow key={bid.id ?? bid._id ?? i} bid={bid} user={user} rank={i + 1} />
 );
 })}
 {jobBids.length > 8 && (
 <p className="text-[10px] text-[#6b5f45] text-center pt-1">
 +{jobBids.length - 8} more bids — <Link href={`/jobs/${jobId}`} className="text-[#c9a84c] hover:underline">view all</Link>
 </p>
 )}
 </div>
 )}
 </div>
 );
}

// ── Main: My Posted Jobs section ───────────────────────────────────
export default function MyJobsSection({ jobs, bids, users, now, onAcceptBest }: Props) {
 const [filter, setFilter] = useState<"all" | "hot" | "nobids">("all");

 const filteredJobs = useMemo(() => {
 switch (filter) {
 case "hot": return jobs.filter(j => (j.bidCount ?? 0) > 3);
 case "nobids": return jobs.filter(j => (j.bidCount ?? 0) === 0);
 default: return jobs;
 }
 }, [jobs, filter]);

 const hotCount = jobs.filter(j => (j.bidCount ?? 0) > 3).length;
 const noBidCount = jobs.filter(j => (j.bidCount ?? 0) === 0).length;
 const totalBids = bids.filter(b => jobs.map(j => j.id ?? j._id).includes(b.jobId)).length;

 if (jobs.length === 0) return (
 <div className="space-y-3">
 <h2 className="text-sm font-semibold text-[#a8997e] uppercase tracking-wider flex items-center gap-2">
 <Briefcase className="h-4 w-4 text-[#c9a84c]" />
 My Posted Jobs
 </h2>
 <div className="glass-panel rounded-[6px] border border-dashed border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)] transition-colors p-10 flex flex-col items-center justify-center gap-4 text-center">
 <div className="w-14 h-14 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] flex items-center justify-center">
 <Briefcase className="h-6 w-6 text-[#c9a84c]" />
 </div>
 <div>
 <p className="font-heading text-base text-[#f0e8d4] mb-1">No active jobs yet</p>
 <p className="text-[12px] text-[#6b5f45] max-w-xs">
 Post your first job and freelancers will start bidding immediately. Prices decay over time — the longer you wait, the cheaper it gets.
 </p>
 </div>
 <Link href="/post-job">
 <button className="flex items-center gap-2 px-5 py-2.5 rounded-[3px] text-sm font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors">
 <Plus className="h-4 w-4" />
 Post Your First Job
 </button>
 </Link>
 </div>
 </div>
 );

 return (
 <div className="space-y-4">

 {/* ── Header ─────────────────────────────────────────────── */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-sm font-semibold text-[#a8997e] uppercase tracking-wider flex items-center gap-2">
 <Briefcase className="h-4 w-4 text-[#c9a84c]" />
 My Posted Jobs
 </h2>
 <p className="text-[11px] text-[#6b5f45] mt-0.5">
 {jobs.length} active · {totalBids} total bid{totalBids !== 1 ? "s" : ""} received
 </p>
 </div>

 <div className="flex items-center gap-2">
 {/* KPI chips */}
 {hotCount > 0 && (
 <div className="px-2.5 py-1.5 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[9px] text-[#c9a84c] uppercase tracking-wider">🔥 Hot</p>
 <p className="font-heading text-sm text-[#c9a84c]">{hotCount}</p>
 </div>
 )}
 {noBidCount > 0 && (
 <div className="px-2.5 py-1.5 rounded-[3px] bg-[rgba(192,57,43,0.2)] border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[9px] text-[#e57373] uppercase tracking-wider">No Bids</p>
 <p className="font-heading text-sm text-[#e57373]">{noBidCount}</p>
 </div>
 )}
 <Link href="/post-job">
 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors">
 <Plus className="h-3.5 w-3.5" />
 Post New
 </button>
 </Link>
 </div>
 </div>

 {/* ── Filter tabs ─────────────────────────────────────────── */}
 <div className="flex items-center gap-2">
 {[
 { key: "all", label: `All (${jobs.length})` },
 { key: "hot", label: `🔥 Hot (${hotCount})` },
 { key: "nobids", label: `⚠ No Bids (${noBidCount})` },
 ].map(tab => (
 <button
 key={tab.key}
 onClick={() => setFilter(tab.key as typeof filter)}
 className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold transition-colors border ${
 filter === tab.key
 ? "bg-[#c9a84c] text-[#080b14] border-transparent"
 : "bg-transparent text-[#a8997e] border-[rgba(201,168,76,0.22)] hover:border-[#c9a84c]"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* ── Alert if any job has no bids ────────────────────────── */}
 {noBidCount > 0 && (
 <div className="flex items-start gap-2.5 px-4 py-3 rounded-[3px] bg-[rgba(192,57,43,0.2)] border border-[rgba(201,168,76,0.22)]">
 <AlertCircle className="h-4 w-4 text-[#e57373] shrink-0 mt-0.5" />
 <p className="text-[11px] text-[#e57373] leading-relaxed">
 <strong>{noBidCount} job{noBidCount !== 1 ? "s" : ""}</strong> have received no bids yet.
 Consider lowering the starting price or broadening the required skills.
 </p>
 </div>
 )}

 {/* ── Job cards grid ───────────────────────────────────────── */}
 {filteredJobs.length > 0 ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
 {filteredJobs.map(job => (
 <MyJobCard
 key={job.id ?? job._id}
 job={job}
 bids={bids}
 users={users}
 now={now}
 onAcceptBest={onAcceptBest}
 />
 ))}
 </div>
 ) : (
 <p className="text-center text-sm text-[#6b5f45] py-6">No jobs match this filter.</p>
 )}
 </div>
 );
}
