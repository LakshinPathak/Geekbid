"use client";
import { formatMoney } from "@/lib/utils";
import { TrendingUp, Clock, Tag } from "lucide-react";

interface MarketIntelProps {
  avgStartingPrice: number;
  avgDecayRate: number;
  avgFirstBidHours: number | null;
  topSkills: string[];
  categoryLabels: string;
  jobCount: number;
}

export default function MarketIntel({
  avgStartingPrice,
  avgDecayRate,
  avgFirstBidHours,
  topSkills,
  categoryLabels,
  jobCount,
}: MarketIntelProps) {
  if (jobCount === 0) return null;

  return (
    <div className="glass-panel rounded-xl p-4 border border-[#E4DDD0]">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-[#A67628]" />
        <h2 className="text-sm font-semibold text-[#3D4E5C] uppercase tracking-wider">
          Market Intelligence
        </h2>
        <span className="text-[10px] text-[#7B8694] ml-auto">{categoryLabels}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* Avg starting price */}
        <div className="flex items-center gap-2">
          <span className="text-[#7B8694]">Avg Starting:</span>
          <span className="font-heading font-semibold text-[#3D4E5C]">{formatMoney(avgStartingPrice)}</span>
        </div>

        {/* Avg decay */}
        <div className="w-px h-4 bg-[#E4DDD0]" />
        <div className="flex items-center gap-2">
          <span className="text-[#7B8694]">Avg Decay:</span>
          <span className="font-heading font-semibold text-orange-400">-{formatMoney(avgDecayRate)}/hr</span>
        </div>

        {/* Time to first bid */}
        {avgFirstBidHours !== null && (
          <>
            <div className="w-px h-4 bg-[#E4DDD0]" />
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[#7B8694]" />
              <span className="text-[#7B8694]">1st Bid ~</span>
              <span className="font-heading font-semibold text-[#3D4E5C]">
                {avgFirstBidHours < 1
                  ? `${Math.round(avgFirstBidHours * 60)}m`
                  : `${avgFirstBidHours.toFixed(1)}h`}
              </span>
            </div>
          </>
        )}

        {/* Hot skills */}
        {topSkills.length > 0 && (
          <>
            <div className="w-px h-4 bg-[#E4DDD0]" />
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-[#7B8694]" />
              <span className="text-[#7B8694]">Hot:</span>
              <div className="flex gap-1.5">
                {topSkills.slice(0, 3).map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[rgba(200,146,61,0.10)] text-[#A67628] border border-[#C8923D]/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
