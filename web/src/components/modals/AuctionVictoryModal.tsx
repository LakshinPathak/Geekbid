"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Star, X, TrendingDown } from "lucide-react";
import Link from "next/link";

interface VictoryData {
 jobId: string;
 jobTitle: string;
 finalPrice: number;
 startingPrice: number;
 freelancerName: string;
 freelancerScore?: number;
 clientName: string;
}

interface Props {
 data: VictoryData;
 onClose: () => void;
}

const CONFETTI_COLORS = ["#c9a84c", "#3b3bd4", "#ff6b35", "#d4b55a", "#2f7d54", "#f0e8d4"];

function ConfettiParticle({ index }: { index: number }) {
 const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
 const left = `${(index * 37 + 5) % 95}%`;
 const delay = `${(index * 0.15) % 2}s`;
 const size = index % 3 === 0 ? 8 : index % 3 === 1 ? 6 : 10;

 return (
 <div
 className="confetti fixed pointer-events-none"
 style={{
 left,
 top: "-20px",
 width: `${size}px`,
 height: `${size}px`,
 background: color,
 borderRadius: index % 2 === 0 ? "50%" : "2px",
 animationDelay: delay,
 animationDuration: `${2.5 + (index % 5) * 0.3}s`,
 }}
 />
 );
}

export default function AuctionVictoryModal({ data, onClose }: Props) {
 const [mounted, setMounted] = useState(false);
 const savings = Math.max(0, data.startingPrice - data.finalPrice);
 const savingsPct = data.startingPrice > 0 ? Math.round((savings / data.startingPrice) * 100) : 0;

 useEffect(() => {
 setMounted(true);
 const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
 document.addEventListener("keydown", handler);
 document.body.style.overflow = "hidden";
 return () => {
 document.removeEventListener("keydown", handler);
 document.body.style.overflow = "";
 };
 }, [onClose]);

 if (!mounted) return null;

 return (
 <div className="victory-overlay fixed inset-0 z-[500] flex items-center justify-center px-4">
 {/* Confetti */}
 {Array.from({ length: 20 }).map((_, i) => (
 <ConfettiParticle key={i} index={i} />
 ))}

 {/* Modal */}
 <div className="glass-panel-lg p-8 w-full max-w-lg relative animate-scale-in scanline">
 {/* Close */}
 <button
 onClick={onClose}
 className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-[3px] text-[#6b5f45] hover:text-[#f0e8d4] hover:bg-[#111625] transition-colors border border-[rgba(201,168,76,0.22)]"
 >
 <X className="h-4 w-4" />
 </button>

 {/* Success badge */}
 <div className="flex flex-col items-center text-center mb-8">
 <div
 className="flex h-20 w-20 items-center justify-center rounded-full mb-4 animate-pulse-glow"
 style={{
 background: "rgba(201,168,76,0.12)",
 border: "0.5px solid rgba(201,168,76,0.22)",
 }}
 >
 <CheckCircle2 className="h-10 w-10 text-[#c9a84c]" />
 </div>
 <h2 className="text-2xl font-normal text-[#f0e8d4] font-heading">Match Found!</h2>
 <p className="text-[#a8997e] text-sm mt-1">Your auction has a winner</p>
 </div>

 {/* Job title */}
 <div className="text-center mb-6">
 <p className="text-xs text-[#6b5f45] uppercase tracking-wider font-semibold mb-1">Project</p>
 <p className="text-[#f0e8d4] font-normal font-heading">{data.jobTitle}</p>
 </div>

 {/* Match card: client ↔ freelancer */}
 <div className="glass-panel-sm p-4 mb-6">
 <div className="flex items-center justify-between gap-4">
 <div className="flex-1 text-center">
 <div className="h-10 w-10 rounded-full bg-[rgba(201,168,76,0.12)] border-[0.5px] border-[rgba(201,168,76,0.22)] flex items-center justify-center text-sm font-bold text-[#c9a84c] mx-auto mb-1">
 {data.clientName.slice(0, 2).toUpperCase()}
 </div>
 <p className="text-xs text-[#f0e8d4] font-medium">{data.clientName}</p>
 <p className="text-[10px] text-[#6b5f45]">Client</p>
 </div>

 <div className="flex flex-col items-center gap-1">
 <div className="text-[#c9a84c] text-xs font-bold tracking-wider">↔ MATCHED</div>
 <div className="h-[0.5px] w-16 bg-[rgba(201,168,76,0.22)]" />
 </div>

 <div className="flex-1 text-center">
 <div className="h-10 w-10 rounded-full bg-[rgba(201,168,76,0.12)] border-[0.5px] border-[rgba(201,168,76,0.22)] flex items-center justify-center text-sm font-bold text-[#c9a84c] mx-auto mb-1">
 {data.freelancerName.slice(0, 2).toUpperCase()}
 </div>
 <p className="text-xs text-[#f0e8d4] font-medium">{data.freelancerName}</p>
 {data.freelancerScore !== undefined && (
 <p className="text-[10px] text-[#c9a84c]">GS {data.freelancerScore}</p>
 )}
 </div>
 </div>
 </div>

 {/* Price display */}
 <div className="glass-panel-sm p-4 mb-6">
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs text-[#6b5f45] uppercase tracking-wider font-semibold">Final Price</span>
 <span className="text-2xl font-normal text-[#c9a84c] font-heading terminal-amount">
 ${data.finalPrice.toLocaleString()}
 </span>
 </div>

 {/* Savings bar */}
 {savings > 0 && (
 <>
 <div className="h-2 bg-[#1a1f30] rounded-[3px] overflow-hidden mb-2">
 <div
 className="h-2 decay-bar"
 style={{ width: `${savingsPct}%` }}
 />
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-[#6b5f45]">Started at ${data.startingPrice.toLocaleString()}</span>
 <span className="flex items-center gap-1 text-[#c9a84c] font-semibold">
 <TrendingDown className="h-3 w-3" />
 Saved ${savings.toLocaleString()} ({savingsPct}%)
 </span>
 </div>
 </>
 )}
 </div>

 {/* Action buttons */}
 <div className="flex gap-3">
 <Link href={`/jobs/${data.jobId}`} className="flex-1">
 <button className="btn-primary w-full py-3 text-sm rounded-[3px]">
 View Contract
 </button>
 </Link>
 <Link href="/inbox" className="flex-1">
 <button className="btn-glass w-full py-3 text-sm rounded-[3px]">
 <MessageSquare className="h-4 w-4" />
 Message
 </button>
 </Link>
 </div>

 <div className="mt-3 text-center">
 <Link href={`/jobs/${data.jobId}`}>
 <button className="text-xs text-[#6b5f45] hover:text-[#c9a84c] transition-colors flex items-center gap-1 mx-auto">
 <Star className="h-3 w-3" /> Leave a Review
 </button>
 </Link>
 </div>
 </div>
 </div>
 );
}
