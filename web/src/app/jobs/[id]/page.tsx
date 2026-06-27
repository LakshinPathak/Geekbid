"use client";
import { use, useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { formatMoney, getCurrentPrice, getHoursToFloor, formatHoursToFloor, timeAgo, getGeekTier, getCategoryLabel } from "@/lib/utils";
import { getDemandLevel, getEffectiveDecayRate, getDemandMultiplier, getAdaptivePrice } from "@/lib/pricing";
import { toast } from "sonner";
import {
  Clock, TrendingDown, DollarSign, Zap, ArrowLeft, Eye, Shield, Send,
  MessageSquare, BarChart3, Timer, Calendar, CheckCircle2, User, Activity,
} from "lucide-react";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { jobs, bids, users, now, currentUser, acceptJob, counterBid, milestones, fetchMilestones, updateMilestone } = useApp();
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg, setCounterMsg] = useState("");
  const [counterError, setCounterError] = useState("");

  // ── P0: Price ticker delta tracking ──────────────────────────────────────
  const [priceDelta, setPriceDelta] = useState(0);
  const [priceFlash, setPriceFlash] = useState<"drop" | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const price30sRef  = useRef<{ price: number; at: number } | null>(null);

  // ── P0: 1-second countdown display ───────────────────────────────────────
  const [countdownDisplay, setCountdownDisplay] = useState("");

  // ── P0: Bid cooldown ──────────────────────────────────────────────────────
  const [cooldownMinsLeft, setCooldownMinsLeft] = useState(0);
  const prevCooldownRef = useRef(0);
  const uid = currentUser?.id ?? currentUser?._id ?? "";

  // ── P2: New-bid flash notification ───────────────────────────────────────
  const prevBidCountRef = useRef<number>(-1);
  const [newBidFlash, setNewBidFlash] = useState(false);

  const job = useMemo(() => jobs.find(j => (j.id === jobId) || (j._id === jobId)), [jobs, jobId]);
  const jobMilestones = useMemo(() => milestones.filter(m => m.jobId === jobId).sort((a, b) => a.order - b.order), [milestones, jobId]);
  useEffect(() => { fetchMilestones(jobId); }, [jobId, fetchMilestones]);
  const jobBids = useMemo(() => bids.filter(b => b.jobId === jobId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [bids, jobId]);

  const myLastBid = useMemo(() => {
    if (!uid) return null;
    return bids.filter(b => b.jobId === jobId && b.freelancerId === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
  }, [bids, jobId, uid]);

  // Sparkline points (must stay before early return)
  const sparklinePoints = useMemo(() => {
    if (!job) return "";
    const elapsedH = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
    const isAdapt = job.pricingMode !== "fixed";
    const totalHrs = Math.max(elapsedH, 1);
    const steps = 40;
    const points: string[] = [];
    const chartW = 200, chartH = 50;
    for (let i = 0; i <= steps; i++) {
      const h = (i / steps) * totalHrs;
      const t = new Date(new Date(job.postedAt).getTime() + h * 3600000);
      const p = isAdapt ? getAdaptivePrice(job, t) : getCurrentPrice(job, t);
      const x = (i / steps) * chartW;
      const y = chartH - ((p - job.minimumPrice) / Math.max(job.startingPrice - job.minimumPrice, 1)) * chartH;
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  }, [job, now]);

  // P0 effect: price flash + 30s delta (fires on each 5s `now` tick)
  useEffect(() => {
    if (!job) return;
    const cur = getCurrentPrice(job, now);
    const nowT = now.getTime();
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (prevPriceRef.current !== null && cur < prevPriceRef.current - 0.001) {
      setPriceFlash("drop");
      timer = setTimeout(() => setPriceFlash(null), 650);
    }
    prevPriceRef.current = cur;
    if (!price30sRef.current) {
      price30sRef.current = { price: cur, at: nowT };
    } else if (nowT - price30sRef.current.at >= 30000) {
      setPriceDelta(price30sRef.current.price - cur);
      price30sRef.current = { price: cur, at: nowT };
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [job, now]);

  // P0 effect: 1-second countdown ticker
  useEffect(() => {
    if (!job?.deadlineAt) return;
    const tick = () => {
      const ms = new Date(job.deadlineAt).getTime() - Date.now();
      if (ms <= 0) { setCountdownDisplay("Expired"); return; }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (s > 86400) setCountdownDisplay(`${d}d ${h}h remaining`);
      else if (s < 600) setCountdownDisplay(`${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
      else setCountdownDisplay(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [job?.deadlineAt]);

  // P0 effect: cooldown countdown (1-second)
  useEffect(() => {
    if (!myLastBid) { setCooldownMinsLeft(0); return; }
    const update = () => {
      const minsLeft = Math.max(0, 30 - (Date.now() - new Date(myLastBid.createdAt).getTime()) / 60000);
      setCooldownMinsLeft(minsLeft);
      prevCooldownRef.current = minsLeft;
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [myLastBid]);

  // P2 effect: detect new bids from store's 5s polling cycle
  useEffect(() => {
    if (prevBidCountRef.current === -1) {
      prevBidCountRef.current = jobBids.length;
      return;
    }
    if (jobBids.length > prevBidCountRef.current) {
      const newest = jobBids[0];
      const bidder = users.find(u => u.id === newest?.freelancerId);
      toast(`⚡ New bid! ${bidder?.fullName ?? "Someone"} bid ${formatMoney(newest?.bidPrice ?? 0)}`);
      setNewBidFlash(true);
      const t = setTimeout(() => setNewBidFlash(false), 2000);
      prevBidCountRef.current = jobBids.length;
      return () => clearTimeout(t);
    }
    prevBidCountRef.current = jobBids.length;
  }, [jobBids, users]);

  if (!job) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
      <p className="text-[#6E6E85] text-lg">Job not found</p>
    </div>
  );

  const client       = users.find(u => u.id === job.clientId);
  const current      = getCurrentPrice(job, now);
  const eta          = getHoursToFloor(job, now);
  const isAtFloor    = eta <= 0;
  const isFreelancer = currentUser?.role === "freelancer";
  const isClient     = currentUser?.role === "client" && (currentUser.id === job.clientId || currentUser._id === job.clientId);
  const isOpen       = job.status === "open";
  const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;
  const deadlineDate = new Date(job.deadlineAt);
  const deadlineMs   = deadlineDate.getTime() - now.getTime();
  const deadlineHrs  = Math.max(0, deadlineMs / 3600000);

  // Pricing intelligence
  const elapsedHrs      = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
  const bidderCount     = job.uniqueBidderCount ?? job.bidCount ?? 0;
  const isAdaptive      = job.pricingMode !== "fixed";
  const demandMultiplier = isAdaptive ? getDemandMultiplier(bidderCount, elapsedHrs) : 1;
  const effectiveRate   = isAdaptive ? getEffectiveDecayRate(job.decayRatePerHour, bidderCount, elapsedHrs) : job.decayRatePerHour;
  const demand          = getDemandLevel(bidderCount);
  const isHot           = bidderCount >= 5;

  // P2: Forward projection for adaptive chart
  const projectionData = (() => {
    if (!isAdaptive || eta <= 0) return null;
    const chartW = 200, projW = 70, chartH = 50;
    const capHrs = Math.min(eta, 24);
    const curY = chartH - ((current - job.minimumPrice) / Math.max(job.startingPrice - job.minimumPrice, 1)) * chartH;
    const genPoints = (extraBidders: number): string => {
      const mock = extraBidders > 0
        ? { ...job, uniqueBidderCount: bidderCount + extraBidders, bidCount: (job.bidCount ?? 0) + extraBidders }
        : job;
      const pts = [`${chartW},${curY.toFixed(1)}`];
      for (const h of [0.5, 1, 2, 4, 8, capHrs]) {
        if (h > capHrs + 0.05) break;
        const futureT = new Date(now.getTime() + h * 3600000);
        const p = Math.max(getAdaptivePrice(mock, futureT), job.minimumPrice);
        const x = chartW + (h / capHrs) * projW;
        const y = Math.max(0, Math.min(chartH, chartH - ((p - job.minimumPrice) / Math.max(job.startingPrice - job.minimumPrice, 1)) * chartH));
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return pts.join(" ");
    };
    const rate3 = getEffectiveDecayRate(job.decayRatePerHour, bidderCount + 3, elapsedHrs);
    const eta3 = rate3 > 0 ? (current - job.minimumPrice) / rate3 : eta * 1.5;
    return { pts0: genPoints(0), pts3: genPoints(3), eta0: eta, eta3 };
  })();

  // P2: Best-value bid for client comparison
  const bestValueBid = isClient && jobBids.length > 0
    ? [...jobBids]
        .filter(b => { const u = users.find(u2 => u2.id === b.freelancerId); return u != null && u.geekScore > 500; })
        .sort((a, b) => a.bidPrice - b.bidPrice)[0] ?? null
    : null;

  // P1: Bid statistics
  const bidPrices   = jobBids.map(b => b.bidPrice);
  const minBid      = bidPrices.length > 0 ? Math.min(...bidPrices) : null;
  const maxBid      = bidPrices.length > 0 ? Math.max(...bidPrices) : null;
  const avgBid      = bidPrices.length > 0 ? bidPrices.reduce((s, p) => s + p, 0) / bidPrices.length : null;
  const myBidsOnJob = jobBids.filter(b => b.freelancerId === uid);
  const myLowestBid = myBidsOnJob.length > 0 ? Math.min(...myBidsOnJob.map(b => b.bidPrice)) : null;
  const myRank      = myLowestBid !== null ? jobBids.filter(b => b.bidPrice < myLowestBid).length + 1 : null;

  // P1: Smart bid suggestions
  const aggressiveBid  = Math.round(job.minimumPrice + (current - job.minimumPrice) * 0.3);
  const competitiveBid = Math.round(job.minimumPrice + (current - job.minimumPrice) * 0.6);

  // P0: Cooldown SVG ring
  const RING_R   = 28;
  const RING_C   = 2 * Math.PI * RING_R;
  const isOnCooldown   = cooldownMinsLeft > 0;
  const ringOffset     = isOnCooldown ? RING_C * (1 - cooldownMinsLeft / 30) : RING_C;
  const cooldownExpiresAt = myLastBid ? new Date(myLastBid.createdAt).getTime() + 30 * 60000 : 0;
  const justUnlocked   = !isOnCooldown && cooldownExpiresAt > 0 && (now.getTime() - cooldownExpiresAt) < 120000;

  // P0: Countdown urgency class
  const countdownClass = deadlineHrs > 24
    ? "text-[#6E6E85] text-sm"
    : deadlineHrs > 6
    ? "text-yellow-400 font-mono text-sm tabular-nums"
    : deadlineHrs > 1
    ? "text-orange-400 font-mono text-sm tabular-nums animate-pulse"
    : deadlineHrs > (10 / 60)
    ? "text-red-400 font-mono text-sm tabular-nums animate-shake"
    : "text-red-400 font-mono text-2xl font-bold tabular-nums animate-shake";

  // P8: Demand-scaled glow on price
  const priceGlow = `0 0 ${20 + Math.min(bidderCount * 10, 50)}px rgba(0,255,136,${(0.15 + Math.min(bidderCount * 0.04, 0.3)).toFixed(2)})`;

  // P1: Slider / position helpers
  const sliderNum      = Number(counterPrice);
  const sliderVal      = sliderNum > 0 ? sliderNum : aggressiveBid;
  const sliderHourly   = job.estimatedHours > 0 ? sliderVal / job.estimatedHours : 0;
  const bidsBelow      = sliderNum > 0 ? jobBids.filter(b => b.bidPrice < sliderNum).length : 0;
  const posFloor       = 0;
  const posCurrent     = 100;
  const posMyBid       = sliderNum > 0
    ? Math.max(2, Math.min(98, ((sliderNum - job.minimumPrice) / Math.max(current - job.minimumPrice, 1)) * 100))
    : null;
  const posMinBid      = minBid != null
    ? Math.max(2, Math.min(98, ((minBid - job.minimumPrice) / Math.max(current - job.minimumPrice, 1)) * 100))
    : null;

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
                        <p className="text-xs text-[#6E6E85] flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(job.postedAt)}</p>
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
              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.skillsRequired.map(s => {
                  const isMatch = currentUser?.skills?.includes(s);
                  return (
                    <span key={s} className={`px-2.5 py-1 rounded-md text-xs border ${
                      isMatch ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20" : "bg-[#0A0A0F] border-[#1E1E2A] text-[#6E6E85]"
                    }`}>{isMatch && "✓ "}{s}</span>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8">
              <p className="text-[#6E6E85] text-xs uppercase tracking-wider font-semibold mb-3">Description</p>
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
                  <p className="text-[#6E6E85] text-xs">Starting Price</p>
                  <p className="font-heading text-xl font-bold text-[#E8E8EC] mt-1">{formatMoney(job.startingPrice)}</p>
                </div>
                <div>
                  <p className="text-[#6E6E85] text-xs">Current Price</p>
                  <p className="font-heading text-xl font-bold text-[#00FF88] mt-1 animate-price-pulse">{formatMoney(current)}</p>
                </div>
                <div>
                  <p className="text-[#6E6E85] text-xs">Floor Price</p>
                  <p className="font-heading text-xl font-bold text-[#E8E8EC] mt-1">{formatMoney(job.minimumPrice)}</p>
                </div>
                <div>
                  <p className="text-[#6E6E85] text-xs">Decay Rate</p>
                  <p className="font-heading text-xl font-bold text-red-400/70 mt-1">-${job.decayRatePerHour}/hr</p>
                </div>
              </div>
              <div className="h-2 bg-[#1E1E2A] rounded-full mt-4 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#00FF88] to-[#00CC6A] rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pricePercent))}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-xs text-[#6E6E85]">
                <span>Floor: {formatMoney(job.minimumPrice)}</span>
                <span>Start: {formatMoney(job.startingPrice)}</span>
              </div>
            </div>

            {/* ─── Bids: P2 comparison table (client) or P1 animated feed (others) ─── */}
            <div className={`bg-[#12121A] border rounded-2xl p-6 relative overflow-hidden transition-[border-color] ${isHot ? "border-[#00FF88]/20" : "border-[#1E1E2A]"} ${newBidFlash ? "animate-border-flash" : ""}`}>
              {/* P8: Ember particles for hot jobs */}
              {isHot && (
                <div className="absolute top-3 right-16 flex gap-2 pointer-events-none">
                  <span className="text-[8px] text-orange-400 animate-ember opacity-70">✦</span>
                  <span className="text-[8px] text-yellow-400 animate-ember opacity-50 [animation-delay:0.4s]">✦</span>
                  <span className="text-[8px] text-orange-400 animate-ember opacity-60 [animation-delay:0.9s]">✦</span>
                </div>
              )}

              {isClient ? (
                /* ── P2: Client Bid Comparison Matrix ── */
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-[#00FF88]" />
                    <p className="text-[#E8E8EC] text-sm font-semibold">Bid Comparison ({jobBids.length})</p>
                    {isHot && <span className="text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-2 py-0.5 font-bold">🔥 Hot</span>}
                  </div>
                  {jobBids.length === 0 ? (
                    <p className="text-[#6E6E85] text-sm">No bids yet.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="border-b border-[#1E1E2A]">
                              {["Freelancer", "Price", "GeekScore", "Skills", "When", ""].map(h => (
                                <th key={h} className={`py-2 px-2 text-[#6E6E85] font-semibold uppercase tracking-wider text-[11px] ${h === "Price" || h === "When" || h === "" ? "text-right" : h === "GeekScore" || h === "Skills" ? "text-center" : "text-left"}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {jobBids.map(bid => {
                              const bidder = users.find(u => u.id === bid.freelancerId);
                              const tier   = bidder ? getGeekTier(bidder.geekScore) : null;
                              const skillMatches = bidder ? bidder.skills.filter(s => job.skillsRequired.includes(s)).length : 0;
                              const isBest = bid.id === bestValueBid?.id;
                              const isNew  = (now.getTime() - new Date(bid.createdAt).getTime()) < 300000;
                              return (
                                <tr key={bid.id} className={`border-b border-[#1E1E2A]/40 transition-colors ${isBest ? "bg-[#00FF88]/[0.04]" : "hover:bg-[#00FF88]/[0.02]"}`}>
                                  <td className="py-3 px-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 bg-[#0A0A0F] border border-[#1E1E2A] text-[#8A8A9A] text-[11px] font-bold rounded-full flex items-center justify-center shrink-0">
                                        {bidder?.avatarInitial ?? "?"}
                                      </div>
                                      <span className="text-[#E8E8EC] font-medium truncate max-w-[90px]">{bidder?.fullName ?? "Freelancer"}</span>
                                      {isBest && <span className="text-[9px] bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-1 font-bold shrink-0">★</span>}
                                      {isNew && <span className="text-[9px] bg-[#00FF88]/10 text-[#00FF88] rounded-full px-1 font-bold animate-pulse shrink-0">NEW</span>}
                                    </div>
                                  </td>
                                  <td className="py-3 px-2 text-right font-heading font-bold text-[#00FF88]">{formatMoney(bid.bidPrice)}</td>
                                  <td className="py-3 px-2 text-center text-[#8A8A9A]">
                                    {bidder ? `${bidder.geekScore}${tier ? ` · ${tier.label}` : ""}` : "—"}
                                  </td>
                                  <td className="py-3 px-2 text-center">
                                    <span className={`font-medium ${skillMatches === job.skillsRequired.length ? "text-[#00FF88]" : skillMatches > 0 ? "text-yellow-400" : "text-[#6E6E85]"}`}>
                                      {skillMatches}/{job.skillsRequired.length} ✓
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 text-right text-[#6E6E85]">{timeAgo(bid.createdAt)}</td>
                                  <td className="py-3 px-2 text-right">
                                    {isOpen && (
                                      <button onClick={handleAccept}
                                        className="text-[11px] font-semibold bg-[#00FF88] text-[#0A0A0F] px-2.5 py-1.5 rounded-lg hover:bg-[#00CC6A] transition-colors whitespace-nowrap">
                                        Accept
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Best value recommendation */}
                      {bestValueBid && (() => {
                        const bidder = users.find(u => u.id === bestValueBid.freelancerId);
                        return (
                          <div className="mt-4 bg-[#0A0A0F] border border-[#00FF88]/20 rounded-xl p-3 flex items-center gap-3">
                            <span className="text-lg shrink-0">💡</span>
                            <div>
                              <p className="text-[#00FF88] text-xs font-semibold">Best value</p>
                              <p className="text-[#8A8A9A] text-xs mt-0.5">
                                {bidder?.fullName ?? "Freelancer"} — {formatMoney(bestValueBid.bidPrice)} — lowest price among GeekScore &gt; 500 bidders
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </>
              ) : (
                /* ── P1: Animated Bid Activity Feed (freelancers / viewers) ── */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-[#00FF88]" />
                      <p className="text-[#E8E8EC] text-sm font-semibold">Live Bids ({jobBids.length})</p>
                      {isHot && <span className="text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-2 py-0.5 font-bold">🔥 Hot</span>}
                    </div>
                    {isFreelancer && myRank !== null && (
                      <span className="text-[11px] text-[#00FF88] bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-full px-2.5 py-0.5">
                        Your bid #{myRank} of {jobBids.length}
                      </span>
                    )}
                    {isFreelancer && myRank === null && jobBids.length > 0 && (
                      <span className="text-[11px] text-[#6E6E85]">You haven't bid yet</span>
                    )}
                  </div>

                  {jobBids.length === 0 ? (
                    <p className="text-[#6E6E85] text-sm">No bids yet. Be the first!</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {jobBids.map((bid, i) => {
                          const bidder  = users.find(u => u.id === bid.freelancerId);
                          const tier    = bidder ? getGeekTier(bidder.geekScore) : null;
                          const isNew   = (now.getTime() - new Date(bid.createdAt).getTime()) < 300000;
                          const isMyBid = bid.freelancerId === uid;
                          return (
                            <div
                              key={bid.id}
                              className={`bg-[#0A0A0F] rounded-xl p-4 border transition-colors animate-slide-up ${
                                isMyBid ? "border-[#00FF88]/20" : "border-[#1E1E2A] hover:border-[#00FF88]/10"
                              }`}
                              style={{ animationDelay: `${i * 0.07}s`, animationFillMode: "both" }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-9 h-9 bg-[#12121A] border border-[#1E1E2A] text-[#8A8A9A] text-xs font-bold rounded-full flex items-center justify-center shrink-0 relative">
                                    {bidder?.avatarInitial ?? "?"}
                                    {isNew && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#00FF88] rounded-full animate-pulse" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-medium text-[#E8E8EC]">{bidder?.fullName ?? "Freelancer"}</span>
                                      {isNew && <span className="text-[9px] font-bold bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/30 rounded-full px-1.5 py-0.5 animate-pulse">NEW</span>}
                                      {tier && <span className="bg-[#00FF88]/10 text-[#00FF88] text-[11px] px-2 py-0.5 rounded-full">GS: {bidder?.geekScore}</span>}
                                      {isMyBid && <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-1.5 py-0.5">You</span>}
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${bid.bidType === "accept" ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-blue-500/10 text-blue-400"}`}>{bid.bidType}</span>
                                    </div>
                                    {bid.message && <p className="text-xs text-[#8A8A9A] italic mt-1">{bid.message}</p>}
                                    <p className="text-[11px] text-[#6E6E85] mt-1">{timeAgo(bid.createdAt)}</p>
                                  </div>
                                </div>
                                <p className="font-heading text-lg font-bold text-[#00FF88] shrink-0">{formatMoney(bid.bidPrice)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bid statistics bar */}
                      {minBid !== null && maxBid !== null && avgBid !== null && (
                        <div className="mt-4 bg-[#0A0A0F] rounded-xl p-4 border border-[#1E1E2A]">
                          <p className="text-[#6E6E85] text-[11px] uppercase tracking-wider font-semibold mb-3">Bid Range</p>
                          <div className="relative h-2 bg-[#1E1E2A] rounded-full mb-3">
                            <div
                              className="absolute h-2 bg-gradient-to-r from-[#00FF88]/40 to-[#00FF88]/80 rounded-full"
                              style={{
                                left:  `${Math.max(0, ((minBid - job.minimumPrice) / Math.max(current - job.minimumPrice, 1)) * 100)}%`,
                                right: `${100 - Math.min(100, ((maxBid - job.minimumPrice) / Math.max(current - job.minimumPrice, 1)) * 100)}%`,
                              }}
                            />
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#00FF88] rounded-full border-2 border-[#0A0A0F] -ml-1"
                              style={{ left: `${((avgBid - job.minimumPrice) / Math.max(current - job.minimumPrice, 1)) * 100}%` }}
                              title={`Avg: ${formatMoney(avgBid)}`}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-[#6E6E85]">
                            <span>Min: <span className="text-[#00FF88] font-medium">{formatMoney(minBid)}</span></span>
                            <span>Avg: <span className="text-[#8A8A9A] font-medium">{formatMoney(avgBid)}</span></span>
                            <span>Max: <span className="text-red-400/80 font-medium">{formatMoney(maxBid)}</span></span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
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
                      pending:     "text-[#6E6E85] bg-[#6E6E85]/10 border-[#6E6E85]/20",
                      in_progress: "text-blue-400 bg-blue-500/10 border-blue-500/20",
                      submitted:   "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
                      approved:    "text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20",
                      disputed:    "text-red-400 bg-red-500/10 border-red-500/20",
                    };
                    return (
                      <div key={ms.id} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#6E6E85] text-xs font-mono">#{ms.order}</span>
                            <span className="text-[#E8E8EC] text-sm font-medium">{ms.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${statusColors[ms.status] ?? statusColors.pending}`}>
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
                              Approve &amp; Release
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
            {/* Pricing Intelligence Card */}
            {isAdaptive && (
              <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-[#00FF88]" />
                  <p className="text-[#E8E8EC] text-sm font-semibold">Pricing Intelligence</p>
                  <span className="text-[11px] bg-[#00FF88]/20 text-[#00FF88] px-1.5 py-0.5 rounded-full font-medium ml-auto">Adaptive</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6E6E85] text-xs">Base Decay</span>
                    <span className="text-[#8A8A9A] text-xs font-medium">-${job.decayRatePerHour}/hr</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#6E6E85] text-xs">Effective Decay</span>
                    <span className="text-[#00FF88] text-xs font-bold">-${effectiveRate.toFixed(1)}/hr ({demandMultiplier.toFixed(2)}×)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#6E6E85] text-xs">Demand</span>
                    {demand ? (
                      <span className={`${demand.bgColor} ${demand.color} border ${demand.borderColor} rounded-full px-2 py-0.5 text-[11px] font-bold`}>
                        {demand.label} ({bidderCount} bidder{bidderCount !== 1 ? "s" : ""})
                      </span>
                    ) : (
                      <span className="text-[#6E6E85] text-xs">No bids yet</span>
                    )}
                  </div>
                  {job.lowestCounterBid && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#6E6E85] text-xs">Lowest Counter</span>
                      <span className="text-blue-400 text-xs font-medium">{formatMoney(job.lowestCounterBid)}</span>
                    </div>
                  )}
                  {job.lastBidAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#6E6E85] text-xs">Last Activity</span>
                      <span className="text-[#8A8A9A] text-xs">{timeAgo(job.lastBidAt)}</span>
                    </div>
                  )}
                </div>

                {/* Price Trajectory Chart (history + P2 projection) */}
                <div className="mt-4 bg-[#0A0A0F] rounded-xl p-4 border border-[#1E1E2A]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#6E6E85] text-[11px] uppercase tracking-wider">Price Trajectory</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                      <span className="text-[9px] text-[#00FF88]/60">LIVE</span>
                    </div>
                  </div>
                  {/* Extended viewBox 0 0 270 60: 0-200 history, 200-270 projection */}
                  <svg viewBox="0 0 270 60" className="w-full h-16" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00FF88" stopOpacity="0.35" />
                        <stop offset="50%" stopColor="#00FF88" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
                      </linearGradient>
                      <filter id="sparkGlow">
                        <feGaussianBlur stdDeviation="1.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {/* Floor reference line at y=50 (minimumPrice level) across full width */}
                    <line x1="0" y1="50" x2="270" y2="50" stroke="#8A8A9A" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.35" />
                    <text x="202" y="48" fontSize="5" fill="#8A8A9A" opacity="0.6" fontFamily="monospace">FLOOR</text>
                    {/* Historical sparkline */}
                    {sparklinePoints && (
                      <>
                        <polygon points={`0,60 ${sparklinePoints} 200,60`} fill="url(#sparkGrad)" />
                        <polyline points={sparklinePoints} fill="none" stroke="#00FF88" strokeWidth="1.5" strokeLinejoin="round" filter="url(#sparkGlow)" />
                        {/* Vertical "now" divider */}
                        <line x1="200" y1="0" x2="200" y2="60" stroke="#00FF88" strokeWidth="0.5" opacity="0.2" />
                        {/* P2: Projection lines */}
                        {projectionData && (
                          <>
                            {/* 0 more bids (faster decay) */}
                            <polyline
                              points={projectionData.pts0}
                              fill="none"
                              stroke="#00FF88"
                              strokeWidth="1.2"
                              strokeDasharray="4,3"
                              opacity="0.5"
                              strokeLinejoin="round"
                            />
                            {/* +3 more bids (slower decay) */}
                            <polyline
                              points={projectionData.pts3}
                              fill="none"
                              stroke="#00FF88"
                              strokeWidth="1.2"
                              strokeDasharray="4,3"
                              opacity="0.25"
                              strokeLinejoin="round"
                            />
                          </>
                        )}
                        {(() => {
                          const lastPt = sparklinePoints.split(" ").pop()?.split(",");
                          if (!lastPt || lastPt.length < 2) return null;
                          const cx = parseFloat(lastPt[0]), cy = parseFloat(lastPt[1]);
                          return (
                            <>
                              <circle cx={cx} cy={cy} r={2} fill="none" stroke="#00FF88" strokeWidth="0.5" opacity="0.4">
                                <animate attributeName="r" from="2" to="8" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                              </circle>
                              <circle cx={cx} cy={cy} r={2.5} fill="#00FF88" filter="url(#sparkGlow)" />
                            </>
                          );
                        })()}
                      </>
                    )}
                  </svg>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[#6E6E85] text-[9px]">Posted</span>
                    <span className="text-[#00FF88]/50 text-[9px]">Now ↑</span>
                    {!isAtFloor && <span className="text-[#6E6E85] text-[9px]">Floor ETA →</span>}
                  </div>
                  {/* P2: Scenario labels */}
                  {projectionData && (
                    <div className="mt-2 pt-2 border-t border-[#1E1E2A] space-y-1">
                      <div className="flex items-center gap-1.5">
                        <svg width={16} height={4}><line x1="0" y1="2" x2="16" y2="2" stroke="#00FF88" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.5" /></svg>
                        <span className="text-[9px] text-[#6E6E85]">0 more bids → Floor in ~{Math.round(projectionData.eta0)}h</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width={16} height={4}><line x1="0" y1="2" x2="16" y2="2" stroke="#00FF88" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.25" /></svg>
                        <span className="text-[9px] text-[#6E6E85]">+3 more bids → Floor in ~{Math.round(projectionData.eta3)}h</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── P0: Live price card ─── */}
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 relative overflow-hidden hover:border-[#00FF88]/15 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00FF88]/50 to-transparent" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 bg-[#00FF88] rounded-full animate-glow-ring" />
                <p className="text-[#8A8A9A] text-sm font-medium">Live Price</p>
              </div>

              {/* P1: Demand-scaled glow; P0: price-flash animation */}
              <p
                className={`font-heading text-4xl font-bold text-[#00FF88] ${priceFlash === "drop" ? "animate-price-flash" : "animate-price-pulse"}`}
                style={{ textShadow: priceGlow }}
              >
                {formatMoney(current)}
              </p>

              {/* P0: 30s delta indicator */}
              {priceDelta > 0.01 && (
                <p className="text-red-400/80 text-xs mt-1 font-medium">↓ -{formatMoney(priceDelta)} in last 30s</p>
              )}

              <p className="text-[#6E6E85] text-xs line-through mt-1">Started at {formatMoney(job.startingPrice)}</p>

              {/* P0: Urgency countdown */}
              <div className="flex items-center gap-1.5 mt-2">
                <Timer className={`h-4 w-4 ${deadlineHrs < 1 ? "text-red-400" : deadlineHrs < 6 ? "text-orange-400" : "text-[#8A8A9A]"}`} />
                {isAtFloor ? (
                  <span className="text-[#8A8A9A] text-sm">At floor price</span>
                ) : (
                  <span className={countdownClass}>{countdownDisplay || formatHoursToFloor(eta)}</span>
                )}
              </div>
              <p className="text-[#6E6E85] text-xs mt-1">Closes {deadlineDate.toLocaleDateString()}</p>
            </div>

            {/* ─── P0: Freelancer Actions / Cooldown ─── */}
            {isFreelancer && isOpen && (
              isOnCooldown ? (
                /* P0: Cooldown ring */
                <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 flex flex-col items-center gap-3">
                  <svg width={72} height={72} viewBox="0 0 72 72">
                    {/* Background ring */}
                    <circle cx={36} cy={36} r={RING_R} fill="none" stroke="#1E1E2A" strokeWidth={5} />
                    {/* Depleting ring — starts full, depletes clockwise */}
                    <circle
                      cx={36} cy={36} r={RING_R}
                      fill="none"
                      stroke="#00FF88"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeDasharray={RING_C}
                      strokeDashoffset={ringOffset}
                      transform="rotate(-90 36 36)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                    <text x={36} y={40} textAnchor="middle" fontSize={11} fill="#E8E8EC" fontFamily="monospace">
                      {Math.ceil(cooldownMinsLeft)}m
                    </text>
                  </svg>
                  <div className="text-center">
                    <p className="text-[#8A8A9A] text-sm font-medium">⏳ Cooldown active</p>
                    <p className="text-[#6E6E85] text-xs mt-1">
                      Bid again at {new Date((myLastBid ? new Date(myLastBid.createdAt).getTime() : 0) + 30 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ) : (
                /* Normal bid actions */
                <div className="space-y-3">
                  <button onClick={handleAccept}
                    className={`w-full bg-[#00FF88] text-[#0A0A0F] font-semibold py-3 rounded-xl hover:bg-[#00CC6A] transition-all glow-green flex items-center justify-center gap-2 text-sm ${justUnlocked ? "animate-glow-ring" : ""}`}>
                    <Zap className="h-4 w-4" /> Accept at {formatMoney(current)}
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#1E1E2A]" />
                    <span className="text-xs text-[#6E6E85]">or</span>
                    <div className="flex-1 h-px bg-[#1E1E2A]" />
                  </div>

                  {/* ─── P1 + P5 + P10: Enhanced Counter-Bid Form ─── */}
                  <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-5 space-y-4">
                    <p className="text-[#E8E8EC] text-sm font-semibold flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-[#00FF88]" /> Counter-Bid
                    </p>

                    {/* P5: Smart bid suggestion chips */}
                    <div>
                      <p className="text-[#6E6E85] text-[11px] uppercase tracking-wider font-semibold mb-2">Suggested</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setCounterPrice(String(aggressiveBid))}
                          className={`text-left p-2.5 rounded-xl border transition-all ${Number(counterPrice) === aggressiveBid ? "border-[#00FF88]/50 bg-[#00FF88]/5" : "border-[#1E1E2A] bg-[#0A0A0F] hover:border-[#00FF88]/30"}`}
                        >
                          <p className="text-[11px] text-[#6E6E85] font-semibold">Aggressive</p>
                          <p className="font-heading text-base font-bold text-[#00FF88]">{formatMoney(aggressiveBid)}</p>
                          <p className="text-[9px] text-[#6E6E85] mt-0.5">30% above floor · below {jobBids.filter(b => b.bidPrice > aggressiveBid).length} bidders</p>
                        </button>
                        <button
                          onClick={() => setCounterPrice(String(competitiveBid))}
                          className={`text-left p-2.5 rounded-xl border transition-all ${Number(counterPrice) === competitiveBid ? "border-blue-500/50 bg-blue-500/5" : "border-[#1E1E2A] bg-[#0A0A0F] hover:border-blue-500/20"}`}
                        >
                          <p className="text-[11px] text-[#6E6E85] font-semibold">Competitive</p>
                          <p className="font-heading text-base font-bold text-blue-400">{formatMoney(competitiveBid)}</p>
                          <p className="text-[9px] text-[#6E6E85] mt-0.5">60% above floor · below {jobBids.filter(b => b.bidPrice > competitiveBid).length} bidders</p>
                        </button>
                      </div>
                    </div>

                    {/* P10: Price slider */}
                    <div>
                      <div className="flex justify-between text-[11px] text-[#6E6E85] mb-1.5">
                        <span>Floor {formatMoney(job.minimumPrice)}</span>
                        <span>Current {formatMoney(current)}</span>
                      </div>
                      <input
                        type="range"
                        min={job.minimumPrice}
                        max={Math.floor(current)}
                        step={5}
                        value={sliderNum > 0 ? sliderNum : aggressiveBid}
                        onChange={e => setCounterPrice(e.target.value)}
                        className="w-full h-2 bg-[#1E1E2A] rounded-full appearance-none cursor-pointer"
                      />
                      {sliderHourly > 0 && (
                        <p className="text-[11px] text-[#8A8A9A] mt-1.5">
                          Effective rate: <span className="text-[#00FF88] font-medium">{formatMoney(sliderHourly)}/hr</span>
                          {bidsBelow > 0 && <span className="text-[#6E6E85]"> · below {bidsBelow} of {jobBids.length} bids</span>}
                        </p>
                      )}
                    </div>

                    {/* P5: Position bar */}
                    {posMyBid !== null && (
                      <div>
                        <p className="text-[#6E6E85] text-[11px] uppercase tracking-wider font-semibold mb-1.5">Your bid vs market</p>
                        <div className="relative h-2 bg-[#1E1E2A] rounded-full">
                          {/* Min bid marker */}
                          {posMinBid !== null && (
                            <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 bg-[#00FF88]/40 rounded-sm -ml-0.5" style={{ left: `${posMinBid}%` }} title={`Lowest: ${formatMoney(minBid!)}`} />
                          )}
                          {/* Your bid marker */}
                          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#00FF88] rounded-full border-2 border-[#12121A] -ml-1.5 shadow-[0_0_8px_rgba(0,255,136,0.5)]" style={{ left: `${posMyBid}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-[#6E6E85] mt-1">
                          <span>Floor</span>
                          <span className="text-[#00FF88]">↑ you</span>
                          <span>Current</span>
                        </div>
                      </div>
                    )}

                    {/* Price text input */}
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6E85] text-sm">$</span>
                      <input
                        type="number"
                        placeholder={`${job.minimumPrice} – ${Math.floor(current)}`}
                        value={counterPrice}
                        onChange={e => { setCounterPrice(e.target.value); setCounterError(""); }}
                        className="w-full h-11 pl-8 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] font-heading text-lg placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 outline-none transition-all"
                      />
                    </div>
                    <textarea
                      placeholder="Why should the client pick you?"
                      value={counterMsg}
                      onChange={e => setCounterMsg(e.target.value)}
                      rows={3}
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 outline-none transition-all px-4 py-2.5 resize-none"
                    />
                    {counterError && <p className="text-red-400 text-xs">{counterError}</p>}
                    <button onClick={handleCounter}
                      className="w-full border border-[#00FF88] text-[#00FF88] font-semibold py-3 rounded-xl hover:bg-[#00FF88]/5 transition-all flex items-center justify-center gap-2 text-sm">
                      <Send className="h-4 w-4" /> Submit Counter-Bid
                    </button>
                  </div>
                </div>
              )
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
                { icon: Clock,       label: "Estimated Hours", value: `${job.estimatedHours}h` },
                { icon: Calendar,    label: "Posted",          value: new Date(job.postedAt).toLocaleDateString() },
                { icon: Timer,       label: "Deadline",        value: deadlineDate.toLocaleDateString() },
                { icon: Eye,         label: "Visibility",      value: "Public" },
                { icon: DollarSign,  label: "Platform Fee",    value: "10%" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-[#6E6E85]" />
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
