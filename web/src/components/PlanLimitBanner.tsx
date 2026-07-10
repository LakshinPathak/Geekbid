"use client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

type Props = {
  used: number;
  limit: number;
  label: string;
  planName: string;
};

// Shows nothing below 80% usage — appears only when a user is close to or at
// their monthly cap for a given resource (jobs, bids, AI calls, etc).
export default function PlanLimitBanner({ used, limit, label, planName }: Props) {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const pct = used / limit;
  if (pct < 0.8) return null;

  const atLimit = used >= limit;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-xs animate-fade-in-up ${
        atLimit
          ? "bg-[#96543f]/10 border-[#96543f]/30 text-[#96543f]"
          : "bg-[#4b3f8f]/10 border-[#4b3f8f]/30 text-[#4b3f8f]"
      }`}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {atLimit
          ? `You've used all ${limit} ${label} on your ${planName} plan this month.`
          : `You've used ${used} of ${limit} ${label} on your ${planName} plan this month.`}
      </span>
      <Link href="/pricing" className="shrink-0 font-semibold underline hover:no-underline">
        Upgrade
      </Link>
    </div>
  );
}
