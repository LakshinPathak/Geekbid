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
 <div className="glass-panel feed-glass-card p-4">
 <div className="flex items-center gap-2 mb-3">
 <TrendingUp className="h-4 w-4 text-[#4b3f8f]" />
 <h2 className="text-xs font-semibold text-[#46424e] uppercase tracking-wider">
 Market Intelligence
 </h2>
 <span className="text-[10px] text-[#46424e] ml-auto">{categoryLabels}</span>
 </div>

 <div className="flex flex-wrap items-center gap-4 text-sm">
 {/* Avg starting price */}
 <div className="flex items-center gap-2">
 <span className="text-[#46424e]">Avg Starting:</span>
 <span className="font-heading font-normal text-[#3d3a45]">{formatMoney(avgStartingPrice)}</span>
 </div>

 {/* Avg decay */}
 <div className="w-px h-4 bg-[rgba(75,63,143,0.15)]" />
 <div className="flex items-center gap-2">
 <span className="text-[#46424e]">Avg Decay:</span>
 <span className="font-heading font-normal text-[#4b3f8f]">-{formatMoney(avgDecayRate)}/hr</span>
 </div>

 {/* Time to first bid */}
 {avgFirstBidHours !== null && (
 <>
 <div className="w-px h-4 bg-[rgba(75,63,143,0.15)]" />
 <div className="flex items-center gap-2">
 <Clock className="h-3.5 w-3.5 text-[#46424e]" />
 <span className="text-[#46424e]">1st Bid ~</span>
 <span className="font-heading font-normal text-[#3d3a45]">
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
 <div className="w-px h-4 bg-[rgba(75,63,143,0.15)]" />
 <div className="flex items-center gap-2">
 <Tag className="h-3.5 w-3.5 text-[#46424e]" />
 <span className="text-[#46424e]">Hot:</span>
 <div className="flex gap-1.5">
 {topSkills.slice(0, 3).map(s => (
 <span key={s} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border border-[rgba(75,63,143,0.22)]">
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
