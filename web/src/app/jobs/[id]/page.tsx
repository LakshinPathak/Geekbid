"use client";
import { use, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatMoney, getCurrentPrice, getHoursToFloor, formatHoursToFloor, timeAgo, getGeekTier } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, TrendingDown, DollarSign, Zap, ArrowDown, Target, User, Calendar, Eye, Shield, Send, MessageSquare } from "lucide-react";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const { jobs, bids, users, now, currentUser, acceptJob, counterBid, watchedJobIds, toggleWatch } = useApp();
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg, setCounterMsg] = useState("");

  const job = useMemo(() => jobs.find(j => j.id === jobId), [jobs, jobId]);
  const jobBids = useMemo(() => bids.filter(b => b.jobId === jobId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [bids, jobId]);

  if (!job) return <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-lg">Job not found</div>;

  const client = users.find(u => u.id === job.clientId);
  const current = getCurrentPrice(job, now);
  const eta = getHoursToFloor(job, now);
  const isAtFloor = eta <= 0;
  const isFreelancer = currentUser?.role === "freelancer";
  const isOpen = job.status === "open";
  const isWatching = watchedJobIds.includes(job.id);
  const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;

  const handleAccept = async () => {
    const r = await acceptJob(job.id);
    if (r.ok) toast.success("🎉 Job Won!", { description: r.message });
    else toast.error("Cannot accept", { description: r.message });
  };

  const handleCounter = async () => {
    const price = Number(counterPrice);
    if (!price || price <= 0) return toast.error("Enter a valid price");
    const r = await counterBid(job.id, price, counterMsg);
    if (r.ok) { toast.success("✅ Counter-bid sent", { description: r.message }); setCounterPrice(""); setCounterMsg(""); }
    else toast.error("Counter-bid failed", { description: r.message });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Job info */}
        <div className="lg:col-span-2 space-y-5 animate-fade-in">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isOpen ? "default" : "secondary"} className={isOpen ? "bg-neutral-100 text-neutral-600 border-neutral-300" : ""}>
                {job.status.toUpperCase()}
              </Badge>
              {isAtFloor && isOpen && <Badge variant="destructive" className="text-xs">🔻 AT FLOOR</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            {client && (
              <div className="flex items-center gap-2 mt-3">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-100 text-slate-600 text-xs">{client.avatarInitial}</AvatarFallback></Avatar>
                <div>
                  <p className="text-sm font-medium text-slate-700">{client.fullName} {client.isVerified && <span className="text-neutral-600">✓</span>}</p>
                  <p className="text-xs text-slate-400">{client.company ?? "Independent"} • {timeAgo(job.postedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Description</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{job.description}</p>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map(s => {
                  const isMatch = currentUser?.skills.includes(s);
                  return (
                    <Badge key={s} variant="outline" className={isMatch ? "bg-neutral-100 text-neutral-600 border-neutral-300" : "text-slate-600"}>
                      {isMatch && "✓ "}{s}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Est. Hours", value: `${job.estimatedHours}h`, icon: <Clock className="h-4 w-4" /> },
              { label: "Deadline", value: new Date(job.deadlineAt).toLocaleDateString(), icon: <Calendar className="h-4 w-4" /> },
              { label: "Decay Rate", value: `$${job.decayRatePerHour}/hr`, icon: <TrendingDown className="h-4 w-4" /> },
              { label: "Visibility", value: "Public", icon: <Eye className="h-4 w-4" /> },
            ].map(d => (
              <Card key={d.label}><CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <span className="text-slate-400">{d.icon}</span>
                <span className="text-xs text-slate-400">{d.label}</span>
                <span className="text-sm font-semibold text-slate-900">{d.value}</span>
              </CardContent></Card>
            ))}
          </div>

          {/* Bid history */}
          {jobBids.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Bid History ({jobBids.length})</h2>
                <div className="space-y-3">
                  {jobBids.map(bid => {
                    const bidder = users.find(u => u.id === bid.freelancerId);
                    const tier = bidder ? getGeekTier(bidder.geekScore) : null;
                    return (
                      <div key={bid.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-slate-200 text-slate-600 text-xs">{bidder?.avatarInitial ?? "?"}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{bidder?.fullName ?? "Freelancer"}</span>
                            {tier && <Badge variant="outline" className="text-[10px]" style={{ borderColor: tier.color, color: tier.color }}>{tier.label}</Badge>}
                            <Badge variant={bid.bidType === "accept" ? "default" : "secondary"} className="text-[10px] ml-auto">{bid.bidType}</Badge>
                          </div>
                          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatMoney(bid.bidPrice)}</p>
                          {bid.message && <p className="text-xs text-slate-500 mt-1 italic">{bid.message}</p>}
                          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(bid.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar: Price + actions */}
        <div className="space-y-4 animate-slide-up">
          {/* Price card */}
          <Card className="border-neutral-300 shadow-md">
            <CardContent className="p-5 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Current Price</p>
              <p className="text-4xl font-bold text-slate-900 text-center tabular-nums animate-price-pulse">{formatMoney(current)}</p>
              <Progress value={pricePercent} className="h-2" />
              <div className="flex justify-between text-xs text-slate-400">
                <span>Floor: {formatMoney(job.minimumPrice)}</span>
                <span>Start: {formatMoney(job.startingPrice)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400">Decay</p><p className="text-sm font-bold text-slate-700">${job.decayRatePerHour}/hr</p></div>
                <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400">ETA Floor</p><p className="text-sm font-bold text-slate-700">{formatHoursToFloor(eta)}</p></div>
              </div>
              {!isAtFloor && isOpen && <p className="text-xs text-neutral-500 text-center">⏱ Drops to floor in {formatHoursToFloor(eta)}</p>}
            </CardContent>
          </Card>

          {/* Actions */}
          <Button variant={isWatching ? "secondary" : "outline"} className="w-full" onClick={() => toggleWatch(job.id)}>
            <Eye className="mr-2 h-4 w-4" /> {isWatching ? "Watching" : "Watch this Job"}
          </Button>

          {isFreelancer && isOpen && (
            <>
              <Button className="w-full bg-neutral-100 hover:bg-neutral-100 text-white h-12 text-base" onClick={handleAccept}>
                <Zap className="mr-2 h-5 w-5" /> Accept at {formatMoney(current)}
              </Button>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Counter-Bid</h3>
                  <Input type="number" placeholder={`$${job.minimumPrice} - $${Math.floor(current)}`} value={counterPrice} onChange={e => setCounterPrice(e.target.value)} />
                  <Textarea placeholder="Why should the client pick you?" value={counterMsg} onChange={e => setCounterMsg(e.target.value)} rows={3} />
                  <Button variant="outline" className="w-full" onClick={handleCounter}>
                    <Send className="mr-2 h-4 w-4" /> Submit Counter-Bid
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {job.status === "accepted" && (
            <Card className="border-neutral-300 bg-neutral-100">
              <CardContent className="p-4 text-center">
                <p className="text-2xl mb-1">🏆</p>
                <p className="font-semibold text-neutral-600">Job Closed</p>
                <p className="text-sm text-neutral-600">Final: {formatMoney(job.finalPrice ?? current)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
