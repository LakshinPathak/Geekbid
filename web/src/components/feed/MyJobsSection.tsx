"use client";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
 getCurrentPrice, getHoursToFloor, formatHoursToFloor,
 formatMoney, type Job,
} from "@/lib/utils";
import { getJobHealth, getCompetitionBadge } from "./feed-helpers";
import {
 Briefcase, Users, Clock, TrendingDown, ChevronDown,
 Star, CheckCircle, Plus, AlertCircle, Zap, ChevronLeft, ChevronRight,
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
 <span className="ml-1.5 px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold bg-[#2980b9] text-[#f0e8d4]">Pro</span>
 )}
 </p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-[10px] text-[#a8997e]">GS {user?.geekScore ?? 0}</span>
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
 <p className="text-[10px] text-[#a8997e] italic line-clamp-1 max-w-[120px] hidden sm:block">
 &ldquo;{bid.message}&rdquo;
 </p>
 )}

 {/* Price */}
 <div className="text-right shrink-0">
 <p className={`font-heading text-sm ${isTop ? "text-[#c9a84c]" : "text-[#f0e8d4]"}`}>
 {formatMoney(bid.bidPrice)}
 </p>
 {bid.createdAt && (
 <p className="text-[9px] text-[#a8997e]">
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
 <span className="px-2 py-0.5 rounded-[2px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.22)]">
 +{job.skillsRequired.length - 4}
 </span>
 )}
 </div>
 </div>

 {/* Price + Savings */}
 <div>
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <span className="text-[11px] text-[#a8997e] uppercase tracking-wider">Current Price</span>
 <p className="font-heading text-2xl text-[#f0e8d4]">{formatMoney(current)}</p>
 </div>
 {savings > 0 && (
 <div className="text-right">
 <span className="text-[11px] text-[#a8997e] uppercase tracking-wider">Saved</span>
 <p className="font-heading text-lg text-[#4caf7d]">-{formatMoney(savings)}</p>
 </div>
 )}
 </div>

 {/* Decay bar */}
 <div className="space-y-1">
 <div className="h-0.5 w-full bg-[#1a1f30]">
 <div
 className="h-full rounded-full bg-[#c9a84c] transition-all duration-500"
 style={{ width: `${decayPct}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#a8997e]">
 <span>Floor {formatMoney(job.minimumPrice)}</span>
 {hoursLeft > 0 && <span className="text-[#c9a84c] font-semibold">⏱ {formatHoursToFloor(hoursLeft)} left</span>}
 <span>Start {formatMoney(job.startingPrice)}</span>
 </div>
 </div>
 </div>

 {/* Footer stats */}
 <div className="flex items-center justify-between pt-3 border-t border-[rgba(201,168,76,0.22)]">
 <div className="flex items-center gap-3 text-[11px] text-[#a8997e]">
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
 <ChevronDown className={`h-4 w-4 text-[#a8997e] transition-transform ${bidsOpen ? "rotate-180" : ""}`} />
 </button>
 )}

 {/* ── Expanded bids feed ─────────────────────────────────── */}
 {bidsOpen && (
 <div className="border-t border-[rgba(201,168,76,0.12)] bg-[#0a0e1a]/50 px-4 py-4 space-y-2">
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider font-semibold mb-3">
 Active Bids — sorted by lowest price
 </p>
 {jobBids.slice(0, 8).map((bid, i) => {
 const user = users.find(u => (u.id ?? u._id) === bid.freelancerId);
 return (
 <BidRow key={bid.id ?? bid._id ?? i} bid={bid} user={user} rank={i + 1} />
 );
 })}
 {jobBids.length > 8 && (
 <p className="text-[10px] text-[#a8997e] text-center pt-1">
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
 const scrollRef = useRef<HTMLDivElement>(null);
 const [canScrollLeft, setCanScrollLeft] = useState(false);
 const [canScrollRight, setCanScrollRight] = useState(false);
 const [activeDot, setActiveDot] = useState(0);
 const [isDragging, setIsDragging] = useState(false);
 const dragStart = useRef({ x: 0, scrollLeft: 0 });

 const CARD_W = 320;

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

 const updateScrollState = useCallback(() => {
 const el = scrollRef.current;
 if (!el) return;
 setCanScrollLeft(el.scrollLeft > 4);
 setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
 setActiveDot(Math.round(el.scrollLeft / CARD_W));
 }, [CARD_W]);

 useEffect(() => {
 updateScrollState();
 const el = scrollRef.current;
 if (!el) return;
 el.addEventListener("scroll", updateScrollState, { passive: true });
 const ro = new ResizeObserver(updateScrollState);
 ro.observe(el);
 return () => { el.removeEventListener("scroll", updateScrollState); ro.disconnect(); };
 }, [updateScrollState, filteredJobs.length]);

 const scroll = (dir: "left" | "right") => {
 scrollRef.current?.scrollBy({ left: dir === "right" ? CARD_W * 2 : -CARD_W * 2, behavior: "smooth" });
 };

 const onMouseDown = (e: React.MouseEvent) => {
 const el = scrollRef.current; if (!el) return;
 setIsDragging(true);
 dragStart.current = { x: e.pageX, scrollLeft: el.scrollLeft };
 el.style.cursor = "grabbing"; el.style.userSelect = "none";
 };
 const onMouseMove = (e: React.MouseEvent) => {
 if (!isDragging || !scrollRef.current) return;
 scrollRef.current.scrollLeft = dragStart.current.scrollLeft - (e.pageX - dragStart.current.x);
 };
 const onMouseUp = () => {
 setIsDragging(false);
 if (scrollRef.current) { scrollRef.current.style.cursor = "grab"; scrollRef.current.style.userSelect = ""; }
 };

 if (jobs.length === 0) return (
 <div className="space-y-3">
 <h2 className="text-[11px] font-sans tracking-[0.14em] uppercase text-[#a8997e] flex items-center gap-2">
 <span className="w-3 h-px bg-[#c9a84c] inline-block" />
 My Posted Jobs
 </h2>
 <div className="card border-dashed p-10 flex flex-col items-center justify-center gap-4 text-center">
 <div className="w-14 h-14 rounded-full bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] flex items-center justify-center">
 <Briefcase className="h-6 w-6 text-[#c9a84c]" />
 </div>
 <div>
 <p className="font-serif font-normal text-base text-[#f0e8d4] mb-1">No active jobs yet</p>
 <p className="text-[12px] text-[#a8997e] max-w-xs font-sans">
 Post your first job and freelancers will start bidding immediately.
 </p>
 </div>
 <Link href="/post-job">
 <button className="flex items-center gap-2 px-5 py-2.5 rounded-[3px] text-sm font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors font-sans">
 <Plus className="h-4 w-4" />
 Post Your First Job
 </button>
 </Link>
 </div>
 </div>
 );

 return (
 <div className="space-y-4">

 {/* ── Header row ─────────────────────────────────────────── */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-[11px] font-sans tracking-[0.14em] uppercase text-[#a8997e] flex items-center gap-2">
 <span className="w-3 h-px bg-[#c9a84c] inline-block" />
 My Posted Jobs
 </h2>
 <p className="text-[11px] text-[#a8997e] mt-0.5 font-sans">
 {jobs.length} active · {totalBids} total bid{totalBids !== 1 ? "s" : ""} received
 </p>
 </div>

 <div className="flex items-center gap-2">
 {hotCount > 0 && (
 <div className="px-2.5 py-1.5 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[9px] text-[#c9a84c] uppercase tracking-wider font-sans">🔥 Hot</p>
 <p className="font-serif text-sm text-[#c9a84c]">{hotCount}</p>
 </div>
 )}
 {noBidCount > 0 && (
 <div className="px-2.5 py-1.5 rounded-[3px] bg-[rgba(192,57,43,0.2)] border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[9px] text-[#e57373] uppercase tracking-wider font-sans">No Bids</p>
 <p className="font-serif text-sm text-[#e57373]">{noBidCount}</p>
 </div>
 )}
 {/* Arrow buttons */}
 <div className="flex items-center gap-1">
 <button
 onClick={() => scroll("left")}
 disabled={!canScrollLeft}
 className={`h-7 w-7 flex items-center justify-center rounded-[3px] border transition-all ${
 canScrollLeft
 ? "border-[rgba(201,168,76,0.35)] text-[#c9a84c] hover:bg-[rgba(201,168,76,0.10)] bg-[#0d1120]"
 : "border-[rgba(201,168,76,0.12)] text-[#a8997e]/30 bg-[#0d1120] cursor-not-allowed"
 }`}
 >
 <ChevronLeft className="h-4 w-4" />
 </button>
 <button
 onClick={() => scroll("right")}
 disabled={!canScrollRight}
 className={`h-7 w-7 flex items-center justify-center rounded-[3px] border transition-all ${
 canScrollRight
 ? "border-[rgba(201,168,76,0.35)] text-[#c9a84c] hover:bg-[rgba(201,168,76,0.10)] bg-[#0d1120]"
 : "border-[rgba(201,168,76,0.12)] text-[#a8997e]/30 bg-[#0d1120] cursor-not-allowed"
 }`}
 >
 <ChevronRight className="h-4 w-4" />
 </button>
 </div>
 <Link href="/post-job">
 <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-[11px] font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors font-sans">
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
 onClick={() => { setFilter(tab.key as typeof filter); scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" }); }}
 className={`px-3 py-1.5 rounded-[3px] text-[11px] font-sans font-semibold transition-colors border ${
 filter === tab.key
 ? "bg-[#c9a84c] text-[#080b14] border-transparent"
 : "bg-transparent text-[#a8997e] border-[rgba(201,168,76,0.22)] hover:border-[#c9a84c]"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* ── No-bids alert ───────────────────────────────────────── */}
 {noBidCount > 0 && (
 <div className="flex items-start gap-2.5 px-4 py-3 rounded-[3px] bg-[rgba(192,57,43,0.2)] border border-[rgba(201,168,76,0.22)]">
 <AlertCircle className="h-4 w-4 text-[#e57373] shrink-0 mt-0.5" />
 <p className="text-[11px] text-[#e57373] leading-relaxed font-sans">
 <strong>{noBidCount} job{noBidCount !== 1 ? "s" : ""}</strong> have received no bids yet.
 Consider lowering the starting price or broadening required skills.
 </p>
 </div>
 )}

 {/* ── Carousel ────────────────────────────────────────────── */}
 {filteredJobs.length > 0 ? (
 <div className="relative">
 {/* Left fade */}
 <div
 className="absolute left-0 top-0 bottom-2 w-12 z-10 pointer-events-none transition-opacity duration-200"
 style={{ background: "linear-gradient(to right, #080b14, transparent)", opacity: canScrollLeft ? 1 : 0 }}
 />
 {/* Right fade */}
 <div
 className="absolute right-0 top-0 bottom-2 w-16 z-10 pointer-events-none transition-opacity duration-200"
 style={{ background: "linear-gradient(to left, #080b14, transparent)", opacity: canScrollRight ? 1 : 0 }}
 />

 <div
 ref={scrollRef}
 onMouseDown={onMouseDown}
 onMouseMove={onMouseMove}
 onMouseUp={onMouseUp}
 onMouseLeave={onMouseUp}
 className="flex gap-3 overflow-x-auto pb-2 select-none"
 style={{ cursor: "grab", scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
 >
 {filteredJobs.map(job => (
 <div key={job.id ?? job._id} className="shrink-0" style={{ width: CARD_W, scrollSnapAlign: "start" }}>
 <MyJobCard job={job} bids={bids} users={users} now={now} onAcceptBest={onAcceptBest} />
 </div>
 ))}
 </div>

 {/* Dot indicators */}
 {filteredJobs.length > 1 && (
 <div className="flex items-center gap-1.5 mt-3 justify-center">
 {filteredJobs.map((_, i) => (
 <button
 key={i}
 onClick={() => scrollRef.current?.scrollTo({ left: i * CARD_W, behavior: "smooth" })}
 className="h-px rounded-none transition-all duration-300"
 style={{
 width: i === activeDot ? 24 : 8,
 background: i === activeDot ? "#c9a84c" : "rgba(201,168,76,0.25)",
 }}
 aria-label={`Go to job ${i + 1}`}
 />
 ))}
 </div>
 )}
 </div>
 ) : (
 <p className="text-center text-sm text-[#a8997e] py-6 font-sans">No jobs match this filter.</p>
 )}
 </div>
 );
}
