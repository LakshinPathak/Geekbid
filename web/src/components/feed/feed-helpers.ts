import { getCurrentPrice, type Job } from "@/lib/utils";
import { getEffectiveDecayRate } from "@/lib/pricing";

// ── Types ─────────────────────────────────────────────────────
export type SortOption =
  | "newest" | "highest_price" | "fastest_decay"
  | "nearest_deadline" | "best_match" | "most_bids"
  | "needs_attention" | "highest_savings";

export type BudgetFilter      = "" | "0-500" | "500-1000" | "1000-2000" | "2000+";
export type CompetitionFilter = "" | "low" | "medium" | "high";
export type HourlyFilter      = "" | "30" | "50" | "75" | "100";

// ── Sort Options ──────────────────────────────────────────────
const SHARED_SORTS: { value: SortOption; label: string }[] = [
  { value: "newest",           label: "Newest"         },
  { value: "highest_price",    label: "Highest Price"  },
  { value: "most_bids",        label: "Most Popular"   },
  { value: "fastest_decay",    label: "Hot Decay"      },
  { value: "nearest_deadline", label: "Deadline"       },
];

export const FREELANCER_SORTS: { value: SortOption; label: string }[] = [
  ...SHARED_SORTS,
  { value: "best_match", label: "Best Match" },
];

export const CLIENT_SORTS: { value: SortOption; label: string }[] = [
  ...SHARED_SORTS,
  { value: "needs_attention", label: "Needs Attention" },
  { value: "highest_savings", label: "Highest Savings" },
];

// ── Badge Helpers ─────────────────────────────────────────────
export function getCompetitionBadge(bidCount: number) {
  if (bidCount === 0) return { label: "Be First", color: "text-[#C8923D]",  bg: "bg-[#C8923D]/10",  border: "border-[#C8923D]/30"  };
  if (bidCount <= 2)  return { label: "LOW",      color: "text-[#C8923D]",  bg: "bg-[#C8923D]/10",  border: "border-[#C8923D]/30"  };
  if (bidCount <= 5)  return { label: "MEDIUM",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" };
  return                     { label: "HIGH",     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20"    };
}

export function getJobHealth(job: Job, now: Date) {
  const deadlineHrs = (new Date(job.deadlineAt).getTime() - now.getTime()) / 3600000;
  const hoursPosted = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
  const bidCount    = job.bidCount ?? 0;

  if (deadlineHrs < 6 && bidCount === 0)
    return { label: "Urgent",          color: "text-red-400",    dot: "bg-red-400"    };
  if (bidCount === 0 && hoursPosted > 6)
    return { label: "Needs Attention", color: "text-yellow-400", dot: "bg-yellow-400" };
  if (bidCount > 0 && deadlineHrs > 12)
    return { label: "Healthy",         color: "text-[#C8923D]",  dot: "bg-[#C8923D]"  };
  return   { label: "Expiring",        color: "text-yellow-400", dot: "bg-yellow-400" };
}

export function getPriceTrajectory(effectiveRate: number) {
  if (effectiveRate > 20) return { label: "Dropping fast",  icon: "⚡", color: "text-red-400"    };
  if (effectiveRate > 10) return { label: "Steady decline", icon: "📉", color: "text-yellow-400" };
  return                         { label: "Holding steady", icon: "🐢", color: "text-[#6E6E85]"  };
}

// ── Sort Logic ────────────────────────────────────────────────
export function sortJobs(
  jobs: Job[], sortBy: SortOption, now: Date, userSkills: string[]
): Job[] {
  const sorted = [...jobs];
  switch (sortBy) {
    case "highest_price":
      sorted.sort((a, b) => getCurrentPrice(b, now) - getCurrentPrice(a, now));
      break;
    case "fastest_decay":
      sorted.sort((a, b) => b.decayRatePerHour - a.decayRatePerHour);
      break;
    case "nearest_deadline":
      sorted.sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());
      break;
    case "best_match":
      sorted.sort((a, b) =>
        b.skillsRequired.filter(s => userSkills.includes(s)).length
        - a.skillsRequired.filter(s => userSkills.includes(s)).length
      );
      break;
    case "most_bids":
      sorted.sort((a, b) => (b.bidCount ?? 0) - (a.bidCount ?? 0));
      break;
    case "needs_attention": {
      sorted.sort((a, b) => {
        const aHrs = (new Date(a.deadlineAt).getTime() - now.getTime()) / 3600000;
        const bHrs = (new Date(b.deadlineAt).getTime() - now.getTime()) / 3600000;
        return ((a.bidCount ?? 0) * 10 + Math.max(0, aHrs))
             - ((b.bidCount ?? 0) * 10 + Math.max(0, bHrs));
      });
      break;
    }
    case "highest_savings":
      sorted.sort((a, b) =>
        (b.startingPrice - getCurrentPrice(b, now))
        - (a.startingPrice - getCurrentPrice(a, now))
      );
      break;
    default:
      sorted.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }
  return sorted;
}

// ── Effective Rate Helper ─────────────────────────────────────
export function getJobEffectiveRate(job: Job, now: Date): number {
  const elapsedHrs = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
  return job.pricingMode !== "fixed"
    ? getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? job.bidCount ?? 0, elapsedHrs)
    : job.decayRatePerHour;
}
