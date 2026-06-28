"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { formatMoney, getCurrentPrice, getHoursToFloor, formatHoursToFloor, timeAgo, type Job, type User } from "@/lib/utils";
import { Clock, TrendingDown, Eye, Zap, ArrowDown } from "lucide-react";

type Props = {
 job: Job; now: Date; client?: User;
 onAccept?: () => void; onWatch?: () => void;
 isWatching?: boolean; isFreelancer?: boolean;
};

export function JobCard({ job, now, client, onAccept, onWatch, isWatching, isFreelancer }: Props) {
 const current = getCurrentPrice(job, now);
 const eta = getHoursToFloor(job, now);
 const isAtFloor = eta <= 0;
 const pricePercent = ((current - job.minimumPrice) / (job.startingPrice - job.minimumPrice)) * 100;

 return (
 <Card className="group transition-all duration-300 border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)] animate-fade-in bg-[#0d1120] rounded-[6px] shadow-none">
 <CardContent className="p-5">
 {/* Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-2">
 {client && (
 <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(201,168,76,0.12)] text-xs font-semibold text-[#c9a84c] border border-[rgba(201,168,76,0.22)]">
 {client.avatarInitial}
 </div>
 )}
 <div>
 {client && <p className="text-xs text-[#a8997e]">{client.fullName} {client.isVerified && <span className="text-[#c9a84c]">✓</span>}</p>}
 <p className="text-[11px] text-[#a8997e]">{timeAgo(job.postedAt)}</p>
 </div>
 </div>
 <Badge className={`text-[11px] font-body font-semibold px-2 py-0.5 rounded-[3px] border ${
 isAtFloor 
 ? "bg-[rgba(192,57,43,0.15)] text-[#e57373] border-[rgba(192,57,43,0.3)]" 
 : "bg-[#111625] text-[#a8997e] border-[rgba(201,168,76,0.22)]"
 }`}>
 {isAtFloor ? "AT FLOOR" : `⏱ ${formatHoursToFloor(eta)}`}
 </Badge>
 </div>

 {/* Title */}
 <Link href={`/jobs/${job.id}`}>
 <h3 className="text-base font-heading text-[#f0e8d4] font-normal mb-2 group-hover:text-[#c9a84c] transition-colors line-clamp-2 cursor-pointer">
 {job.title}
 </h3>
 </Link>

 {/* Skills */}
 <div className="flex flex-wrap gap-1.5 mb-3">
 {job.skillsRequired.slice(0, 4).map(s => (
 <Badge key={s} className="text-[11px] font-body font-medium bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)] rounded-[2px] px-2 py-0.5">
 {s}
 </Badge>
 ))}
 {job.skillsRequired.length > 4 && (
 <Badge className="text-[11px] font-body font-medium bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)] rounded-[2px] px-2 py-0.5">+{job.skillsRequired.length - 4}</Badge>
 )}
 </div>

 {/* Price */}
 <div className="bg-[#0a0e1a] border border-[rgba(201,168,76,0.15)] rounded-[3px] p-3 mb-3 space-y-2">
 <div className="flex items-baseline justify-between">
 <span className="text-2xl font-heading font-normal text-[#c9a84c] tabular-nums">{formatMoney(current)}</span>
 <span className="text-xs text-[#a8997e]">
 <ArrowDown className="inline h-3 w-3 text-[#a8997e] mr-0.5" />
 ${job.decayRatePerHour}/hr
 </span>
 </div>
 <Progress value={pricePercent} className="h-0.5" />
 <div className="flex justify-between text-[11px] text-[#a8997e]">
 <span>Floor: {formatMoney(job.minimumPrice)}</span>
 <span>Start: {formatMoney(job.startingPrice)}</span>
 </div>
 </div>

 {/* Meta */}
 <div className="flex items-center gap-3 text-[11px] text-[#a8997e] mb-3">
 <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.estimatedHours}h est.</span>
 <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {formatMoney(job.startingPrice)} start</span>
 </div>

 {/* Actions */}
 {job.status === "open" && (
 <div className="flex gap-2">
 {isFreelancer && onAccept && (
 <Button size="sm" className="flex-1 btn-primary" onClick={onAccept}>
 <Zap className="mr-1.5 h-3.5 w-3.5" /> Accept {formatMoney(current)}
 </Button>
 )}
 {onWatch && (
 <Button size="sm" className={isWatching ? "btn-glass" : "btn-ghost"} onClick={onWatch}>
 <Eye className="mr-1 h-3.5 w-3.5" /> {isWatching ? "Watching" : "Watch"}
 </Button>
 )}
 </div>
 )}
 {job.status === "accepted" && (
 <Badge className="badge-completed">✅ Accepted at {formatMoney(job.finalPrice ?? current)}</Badge>
 )}
 </CardContent>
 </Card>
 );
}
