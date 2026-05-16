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
    <Card className="group hover:shadow-lg transition-all duration-300 border-neutral-200 hover:border-neutral-400 animate-fade-in bg-white">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {client && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                {client.avatarInitial}
              </div>
            )}
            <div>
              {client && <p className="text-xs text-neutral-600">{client.fullName} {client.isVerified && <span className="text-neutral-400">✓</span>}</p>}
              <p className="text-[11px] text-neutral-400">{timeAgo(job.postedAt)}</p>
            </div>
          </div>
          <Badge variant={isAtFloor ? "destructive" : "outline"} className={`text-[10px] ${!isAtFloor ? "border-neutral-300 text-neutral-500" : ""}`}>
            {isAtFloor ? "AT FLOOR" : `⏱ ${formatHoursToFloor(eta)}`}
          </Badge>
        </div>

        {/* Title */}
        <Link href={`/jobs/${job.id}`}>
          <h3 className="text-base font-semibold text-black mb-2 group-hover:text-neutral-600 transition-colors line-clamp-2 cursor-pointer">
            {job.title}
          </h3>
        </Link>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skillsRequired.slice(0, 4).map(s => (
            <Badge key={s} variant="secondary" className="text-[10px] font-medium bg-neutral-100 text-neutral-600 border-neutral-200">
              {s}
            </Badge>
          ))}
          {job.skillsRequired.length > 4 && (
            <Badge variant="secondary" className="text-[10px] bg-neutral-100">+{job.skillsRequired.length - 4}</Badge>
          )}
        </div>

        {/* Price */}
        <div className="bg-neutral-50 rounded-xl p-3 mb-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-black tabular-nums">{formatMoney(current)}</span>
            <span className="text-xs text-neutral-400">
              <ArrowDown className="inline h-3 w-3 text-neutral-400 mr-0.5" />
              ${job.decayRatePerHour}/hr
            </span>
          </div>
          <Progress value={pricePercent} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>Floor: {formatMoney(job.minimumPrice)}</span>
            <span>Start: {formatMoney(job.startingPrice)}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-400 mb-3">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.estimatedHours}h est.</span>
          <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {formatMoney(job.startingPrice)} start</span>
        </div>

        {/* Actions */}
        {job.status === "open" && (
          <div className="flex gap-2">
            {isFreelancer && onAccept && (
              <Button size="sm" className="flex-1 bg-black hover:bg-neutral-800 text-white" onClick={onAccept}>
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Accept {formatMoney(current)}
              </Button>
            )}
            {onWatch && (
              <Button size="sm" variant={isWatching ? "secondary" : "outline"}
                className={isWatching ? "bg-neutral-100 text-black border-neutral-300" : ""}
                onClick={onWatch}>
                <Eye className="mr-1 h-3.5 w-3.5" /> {isWatching ? "Watching" : "Watch"}
              </Button>
            )}
          </div>
        )}
        {job.status === "accepted" && (
          <Badge className="bg-neutral-100 text-black border-neutral-300">✅ Accepted at {formatMoney(job.finalPrice ?? current)}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
