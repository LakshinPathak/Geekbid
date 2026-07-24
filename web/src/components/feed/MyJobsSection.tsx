"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
 getCurrentPrice, getHoursToFloor, formatHoursToFloor,
 formatMoney, type Job,
} from "@/lib/utils";
import { getJobHealth, getCompetitionBadge } from "./feed-helpers";
import {
 Users, Clock, TrendingDown, ChevronDown,
 Star, CheckCircle, Plus, AlertCircle, Zap, Crown, Sparkles,
} from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";
import EmptyState from "./EmptyState";
import SmartMatchModal from "./SmartMatchModal";
import { usePointerFine, useTilt3D } from "@/components/landing/hooks";

// ── Types ──────────────────────────────────────────────────────────
interface User {
 id?: string; _id?: string;
 fullName?: string; avatarInitial?: string; avatarUrl?: string;
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
 if (count === 0) return { label: "No Bids", cls: "text-[#96543f] bg-[rgba(193,77,58,0.2)] border-[rgba(75,63,143,0.22)]" };
 if (count <= 2) return { label: "Interested", cls: "text-[#4b3f8f] bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]" };
 if (count <= 5) return { label: "In Demand", cls: "text-[#4b3f8f] bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]" };
 return { label: "🔥 Hot", cls: "text-[#4b3f8f] bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]" };
}

// ── Single bid row inside the expanded panel ───────────────────────
function BidRow({ bid, user, rank }: { bid: Bid; user?: User; rank: number }) {
 const isTop = rank === 1;
 return (
 <div className={`flex items-center gap-3 px-4 py-3 rounded-full border ${
 isTop ? "bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]" : "bg-[#ffffff] border-transparent"
 }`}>
 {/* Rank */}
 <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 ${
 isTop ? "bg-[#4b3f8f] text-[#fbfaf7]" : "bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.22)]"
 }`}>
 {rank}
 </span>

 {/* Avatar */}
 <CloudinaryAvatar
 avatarUrl={user?.avatarUrl}
 avatarInitial={user?.avatarInitial ?? user?.fullName?.[0] ?? "?"}
 size="xs"
 />

 {/* Name + GeekScore */}
 <div className="flex-1 min-w-0 overflow-hidden">
 <p className="text-xs font-semibold text-[#3d3a45] truncate">
 {user?.fullName ?? "Unknown"}
 {user?.plan === "plus" && (
 <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#4b3f8f] text-[#ffffff]">Plus</span>
 )}
 {user?.plan === "premium" && (
 <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-[#4b3f8f] to-[#9c8fd8] text-[#ffffff]">
 <Crown className="h-2.5 w-2.5" /> Premium
 </span>
 )}
 </p>
 <div className="flex items-center gap-2 mt-0.5 truncate">
 <span className="text-[10px] text-[#46424e]">GS {user?.geekScore ?? 0}</span>
 {(user?.averageRating ?? 0) > 0 && (
 <span className="flex items-center gap-0.5 text-[10px] text-[#4b3f8f]">
 <Star className="h-2.5 w-2.5" />
 {user!.averageRating!.toFixed(1)} ({user?.totalReviews ?? 0})
 </span>
 )}
 </div>
 </div>

 {/* Bid message excerpt */}
 {bid.message && (
 <div className="hidden sm:block max-w-[120px] min-w-0">
 <p className="text-[10px] text-[#46424e] italic line-clamp-1">
 &ldquo;{bid.message}&rdquo;
 </p>
 </div>
 )}

 {/* Price */}
 <div className="text-right shrink-0">
 <p className={`font-heading text-sm ${isTop ? "text-[#4b3f8f]" : "text-[#3d3a45]"}`}>
 {formatMoney(bid.bidPrice)}
 </p>
 {bid.createdAt && (
 <p className="text-[9px] text-[#46424e]">
 {new Date(bid.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
 </p>
 )}
 </div>
 </div>
 );
}

// ── Job card with inline bid expansion ────────────────────────────
function MyJobCard({
 job, bids, users, now, onAcceptBest, onSmartMatch,
}: {
 job: Job; bids: Bid[]; users: User[]; now: Date;
 onAcceptBest: (id: string) => void;
 onSmartMatch: (jobId: string, jobTitle: string) => void;
}) {
 const [bidsOpen, setBidsOpen] = useState(false);
 const cardRef = useRef<HTMLDivElement>(null);
 const isPointerFine = usePointerFine();
 useTilt3D(cardRef, isPointerFine);
 const router = useRouter();
 const jobId = job.id ?? job._id ?? "";
 const isSmartMatchEligible =
   job.status === "open" && job.type !== "direct_offer";
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
 e.stopPropagation();
 onAcceptBest(jobId);
 };

 const healthBadgeCls =
 health.label === "Urgent" ? "text-[#96543f] bg-[rgba(193,77,58,0.2)] border-[rgba(75,63,143,0.22)]" :
 health.label === "Needs Attention" ? "text-[#4b3f8f] bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]" :
 "text-[#4b3f8f] bg-[rgba(75,63,143,0.12)] border-[rgba(75,63,143,0.22)]";

 return (
 <div
 ref={cardRef}
 className="glass-panel feed-glass-card feed-tilt-card feed-card-border-rotate rounded-2xl border border-[rgba(75,63,143,0.22)] hover:border-[rgba(75,63,143,0.35)] transition-all duration-200 overflow-hidden relative"
 >
 {job.status === "open" && (
 <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#4d7245] animate-pulse z-10" title="Price actively decaying" aria-hidden="true" />
 )}

 {/* ── Card body (navigates to job detail) ───────────────── */}
 <div
 onClick={() => router.push(`/jobs/${jobId}`)}
 className="block p-5 cursor-pointer"
 >
 <div className="flex flex-col gap-4">

 {/* Header: badges */}
 <div>
 <div className="flex items-start justify-between gap-2 mb-2">
 <div className="flex flex-wrap gap-1.5">
 <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${healthBadgeCls}`}>
 <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
 {health.label}
 </span>
 <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${demand.cls}`}>
 {demand.label}
 </span>
 <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.22)]">
 My Job
 </span>
 </div>
 </div>

 <h3 className="font-heading text-[15px] text-[#3d3a45] leading-snug line-clamp-2 hover:text-[#4b3f8f] transition-colors">
 {job.title}
 </h3>

 {/* Skills */}
 <div className="flex flex-wrap gap-1 mt-2">
 {job.skillsRequired.slice(0, 4).map(s => (
 <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.22)]">{s}</span>
 ))}
 {job.skillsRequired.length > 4 && (
 <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.22)]">
 +{job.skillsRequired.length - 4}
 </span>
 )}
 </div>
 </div>

 {/* Price + Savings */}
 <div>
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <span className="text-[11px] text-[#46424e] uppercase tracking-wider">Current Price</span>
 <p className="font-heading text-2xl text-[#3d3a45]">{formatMoney(current)}</p>
 </div>
 {savings > 0 && (
 <div className="text-right">
 <span className="text-[11px] text-[#46424e] uppercase tracking-wider">Saved</span>
 <p className="font-heading text-lg text-[#4d7245]">-{formatMoney(savings)}</p>
 </div>
 )}
 </div>

 {/* Decay bar */}
 <div className="space-y-1">
 <div className="h-0.5 w-full bg-[#f0edfa]">
 <div
 className="h-full rounded-full bg-[#4b3f8f] transition-all duration-500"
 style={{ width: `${decayPct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#46424e]">
 <span>Floor {formatMoney(job.minimumPrice)}</span>
 {hoursLeft > 0 && <span className="text-[#4b3f8f] font-semibold">⏱ {formatHoursToFloor(hoursLeft)} left</span>}
 <span>Start {formatMoney(job.startingPrice)}</span>
 </div>
 </div>
 </div>

 {/* Footer stats */}
 <div className="flex items-center justify-between pt-3 border-t border-[rgba(75,63,143,0.22)]">
 <div className="flex items-center gap-3 text-[11px] text-[#46424e]">
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

 {bidCount > 0 ? (
 <button
 onClick={handleAccept}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors"
 >
 <CheckCircle className="h-3 w-3" />
 Accept Best
 </button>
 ) : (
 <span className="text-[11px] text-[#46424e]/60 italic">Waiting for bids…</span>
 )}
 </div>
 </div>
 </div>

 {isSmartMatchEligible && (
 <div className="px-5 pb-3 border-t border-[rgba(75,63,143,0.12)] bg-[#ffffff]">
 <button
 type="button"
 onClick={() => onSmartMatch(jobId, job.title)}
 className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold bg-[rgba(75,63,143,0.08)] text-[#4b3f8f] border border-[rgba(75,63,143,0.22)] hover:bg-[rgba(75,63,143,0.14)] transition-colors"
 >
 <Sparkles className="h-3.5 w-3.5" />
 Smart Match
 </button>
 </div>
 )}

 {/* ── Bids toggle button (or an equal-height placeholder when there are
 no bids yet, so cards in the same row don't end up with mismatched
 empty space beneath them) ─────────────────────────────────── */}
 {bidCount > 0 ? (
 <button
 onClick={() => setBidsOpen(o => !o)}
 className="w-full flex items-center justify-between px-5 py-2.5 border-t border-[rgba(75,63,143,0.15)] bg-[#ffffff] hover:bg-[#f4f2ee] transition-colors text-xs font-semibold text-[#46424e]"
 >
 <span className="flex items-center gap-1.5">
 <Zap className="h-3.5 w-3.5 text-[#4b3f8f]" />
 {bidsOpen ? "Hide" : "View"} {bidCount} bid{bidCount !== 1 ? "s" : ""}
 </span>
 <ChevronDown className={`h-4 w-4 text-[#46424e] transition-transform ${bidsOpen ? "rotate-180" : ""}`} />
 </button>
 ) : (
 <div className="w-full flex items-center gap-1.5 px-5 py-2.5 border-t border-[rgba(75,63,143,0.15)] bg-[#ffffff] text-xs font-medium text-[#46424e]/60">
 <AlertCircle className="h-3.5 w-3.5" />
 No bids yet — consider lowering the price or broadening required skills
 </div>
 )}

 {/* ── Expanded bids feed ─────────────────────────────────── */}
 {bidsOpen && (
 <div className="border-t border-[rgba(75,63,143,0.12)] bg-[#ffffff]/50 px-4 py-4 space-y-2">
 <p className="text-[10px] text-[#46424e] uppercase tracking-wider font-semibold mb-3">
 Active Bids — sorted by lowest price
 </p>
 {jobBids.slice(0, 8).map((bid, i) => {
 const user = users.find(u => (u.id ?? u._id) === bid.freelancerId);
 return (
 <BidRow key={bid.id ?? bid._id ?? i} bid={bid} user={user} rank={i + 1} />
 );
 })}
 {jobBids.length > 8 && (
 <p className="text-[10px] text-[#46424e] text-center pt-1">
 +{jobBids.length - 8} more bids — <Link href={`/jobs/${jobId}`} className="text-[#4b3f8f] hover:underline">view all</Link>
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
 const [smartMatchJob, setSmartMatchJob] = useState<{ id: string; title: string } | null>(null);
 const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
 const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

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

 useEffect(() => {
 const el = tabRefs.current[filter];
 if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
 }, [filter, jobs.length]);

 if (jobs.length === 0) return (
 <div className="space-y-3">
 <h2 className="text-[11px] font-sans tracking-[0.14em] uppercase text-[#46424e] flex items-center gap-2">
 <span className="w-3 h-px bg-[#4b3f8f] inline-block" />
 My Posted Jobs
 </h2>
 <div className="card border-dashed flex flex-col items-center gap-2 pb-8">
 <EmptyState
 variant="jobs"
 title="No active jobs yet"
 subtitle="Post your first job and freelancers will start bidding immediately."
 />
 <Link href="/post-job">
 <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors font-sans">
 <Plus className="h-4 w-4" />
 Post Your First Job
 </button>
 </Link>
 </div>
 </div>
 );

 return (
 <div className="space-y-4">
 {smartMatchJob && (
 <SmartMatchModal
 jobId={smartMatchJob.id}
 jobTitle={smartMatchJob.title}
 onClose={() => setSmartMatchJob(null)}
 />
 )}

 {/* ── Header row ─────────────────────────────────────────── */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-[11px] font-sans tracking-[0.14em] uppercase text-[#46424e] flex items-center gap-2">
 <span className="w-3 h-px bg-[#4b3f8f] inline-block" />
 My Posted Jobs
 </h2>
 <p className="text-[11px] text-[#46424e] mt-0.5 font-sans">
 {jobs.length} active · {totalBids} total bid{totalBids !== 1 ? "s" : ""} received
 </p>
 </div>

 <div className="flex items-center gap-2">
 {hotCount > 0 && (
 <div className="px-2.5 py-1.5 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.22)] text-right">
 <p className="text-[9px] text-[#4b3f8f] uppercase tracking-wider font-sans">🔥 Hot</p>
 <p className="font-serif text-sm text-[#4b3f8f]">{hotCount}</p>
 </div>
 )}
 {noBidCount > 0 && (
 <div className="px-2.5 py-1.5 rounded-full bg-[rgba(193,77,58,0.2)] border border-[rgba(75,63,143,0.22)] text-right">
 <p className="text-[9px] text-[#96543f] uppercase tracking-wider font-sans">No Bids</p>
 <p className="font-serif text-sm text-[#96543f]">{noBidCount}</p>
 </div>
 )}
 <Link href="/post-job">
 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors font-sans">
 <Plus className="h-3.5 w-3.5" />
 Post New
 </button>
 </Link>
 </div>
 </div>

 {/* ── Filter tabs ─────────────────────────────────────────── */}
 <div className="relative flex items-center gap-2">
 <span
 className="feed-tab-indicator absolute rounded-full bg-[#4b3f8f] -z-0"
 style={{ left: indicator.left, width: indicator.width, top: 0, bottom: 0 }}
 aria-hidden="true"
 />
 {[
 { key: "all", label: `All (${jobs.length})` },
 { key: "hot", label: `🔥 Hot (${hotCount})` },
 { key: "nobids", label: `⚠ No Bids (${noBidCount})` },
 ].map(tab => (
 <button
 key={tab.key}
 ref={(el) => { tabRefs.current[tab.key] = el; }}
 onClick={() => setFilter(tab.key as typeof filter)}
 className={`relative z-10 px-3 py-1.5 rounded-full text-[11px] font-sans font-semibold transition-colors border ${
 filter === tab.key
 ? "text-[#fbfaf7] border-transparent"
 : "bg-transparent text-[#46424e] border-[rgba(75,63,143,0.22)] hover:border-[#4b3f8f]"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* ── No-bids alert ───────────────────────────────────────── */}
 {noBidCount > 0 && (
 <div className="flex items-start gap-2.5 px-4 py-3 rounded-full bg-[rgba(193,77,58,0.2)] border border-[rgba(75,63,143,0.22)]">
 <AlertCircle className="h-4 w-4 text-[#96543f] shrink-0 mt-0.5" />
 <p className="text-[11px] text-[#96543f] leading-relaxed font-sans">
 <strong>{noBidCount} job{noBidCount !== 1 ? "s" : ""}</strong> have received no bids yet.
 Consider lowering the starting price or broadening required skills.
 </p>
 </div>
 )}

 {/* ── Job grid — wraps instead of scrolling so a small job count
 doesn't leave dead space in an unfilled horizontal track ────── */}
 {filteredJobs.length > 0 ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
 {filteredJobs.map(job => (
 <MyJobCard
 key={job.id ?? job._id}
 job={job}
 bids={bids}
 users={users}
 now={now}
 onAcceptBest={onAcceptBest}
 onSmartMatch={(id, title) => setSmartMatchJob({ id, title })}
 />
 ))}
 </div>
 ) : (
 <EmptyState
 variant="jobs"
 title="No jobs match this filter"
 ctaLabel="Reset filter"
 onCta={() => setFilter("all")}
 />
 )}
 </div>
 );
}
