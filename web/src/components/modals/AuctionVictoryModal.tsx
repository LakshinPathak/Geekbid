"use client";
import { useEffect, useRef, useState } from "react";
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

const CONFETTI_COLORS = ["#4b3f8f", "#9c8fd8", "#e0a23e", "#3d3373", "#4d7245", "#3d3a45"];

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
 const panelRef = useRef<HTMLDivElement>(null);
 const closeButtonRef = useRef<HTMLButtonElement>(null);

 useEffect(() => {
 setMounted(true);
 }, []);

 // Hand-rolled overlay (not the Radix ui/dialog.tsx primitives used
 // elsewhere) — needs its own focus trap + dialog semantics so a
 // keyboard user can't Tab out into the page behind it while it's open,
 // matching what Radix gives the other modals for free. Also restores
 // focus to whatever triggered the modal once it closes. Split into its
 // own effect gated on `mounted` — the panel/close-button refs are null
 // until the mounted=true render actually commits the dialog markup.
 useEffect(() => {
 if (!mounted) return;
 const previouslyFocused = document.activeElement as HTMLElement | null;
 closeButtonRef.current?.focus();

 const handler = (e: KeyboardEvent) => {
 if (e.key === "Escape") { onClose(); return; }
 if (e.key !== "Tab") return;
 const panel = panelRef.current;
 if (!panel) return;
 const focusable = panel.querySelectorAll<HTMLElement>(
 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
 );
 if (focusable.length === 0) return;
 const first = focusable[0];
 const last = focusable[focusable.length - 1];
 if (e.shiftKey && document.activeElement === first) {
 e.preventDefault();
 last.focus();
 } else if (!e.shiftKey && document.activeElement === last) {
 e.preventDefault();
 first.focus();
 }
 };
 document.addEventListener("keydown", handler);
 document.body.style.overflow = "hidden";
 return () => {
 document.removeEventListener("keydown", handler);
 document.body.style.overflow = "";
 previouslyFocused?.focus();
 };
 }, [mounted, onClose]);

 if (!mounted) return null;

 return (
 <div className="victory-overlay fixed inset-0 z-[500] flex items-center justify-center px-4">
 {/* Confetti */}
 {Array.from({ length: 20 }).map((_, i) => (
 <ConfettiParticle key={i} index={i} />
 ))}

 {/* Modal */}
 <div
 ref={panelRef}
 role="dialog"
 aria-modal="true"
 aria-labelledby="victory-modal-title"
 className="glass-panel-lg p-8 w-full max-w-lg relative animate-scale-in scanline"
 >
 {/* Close */}
 <button
 ref={closeButtonRef}
 onClick={onClose}
 aria-label="Close"
 className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-xl text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] transition-colors border border-[rgba(75,63,143,0.22)]"
 >
 <X className="h-4 w-4" />
 </button>

 {/* Success badge */}
 <div className="flex flex-col items-center text-center mb-8">
 <div
 className="flex h-20 w-20 items-center justify-center rounded-full mb-4 animate-pulse-glow"
 style={{
 background: "rgba(75,63,143,0.12)",
 border: "0.5px solid rgba(75,63,143,0.22)",
 }}
 >
 <CheckCircle2 className="h-10 w-10 text-[#4b3f8f]" />
 </div>
 <h2 id="victory-modal-title" className="text-2xl font-normal text-[#3d3a45] font-heading">Match Found!</h2>
 <p className="text-[#6f6a7d] text-sm mt-1">Your auction has a winner</p>
 </div>

 {/* Job title */}
 <div className="text-center mb-6">
 <p className="text-xs text-[#6f6a7d] uppercase tracking-wider font-semibold mb-1">Project</p>
 <p className="text-[#3d3a45] font-normal font-heading">{data.jobTitle}</p>
 </div>

 {/* Match card: client ↔ freelancer */}
 <div className="glass-panel-sm p-4 mb-6">
 <div className="flex items-center justify-between gap-4">
 <div className="flex-1 text-center">
 <div className="h-10 w-10 rounded-full bg-[rgba(75,63,143,0.12)] border-[0.5px] border-[rgba(75,63,143,0.22)] flex items-center justify-center text-sm font-bold text-[#4b3f8f] mx-auto mb-1">
 {data.clientName.slice(0, 2).toUpperCase()}
 </div>
 <p className="text-xs text-[#3d3a45] font-medium">{data.clientName}</p>
 <p className="text-[10px] text-[#6f6a7d]">Client</p>
 </div>

 <div className="flex flex-col items-center gap-1">
 <div className="text-[#4b3f8f] text-xs font-bold tracking-wider">↔ MATCHED</div>
 <div className="h-[0.5px] w-16 bg-[rgba(75,63,143,0.22)]" />
 </div>

 <div className="flex-1 text-center">
 <div className="h-10 w-10 rounded-full bg-[rgba(75,63,143,0.12)] border-[0.5px] border-[rgba(75,63,143,0.22)] flex items-center justify-center text-sm font-bold text-[#4b3f8f] mx-auto mb-1">
 {data.freelancerName.slice(0, 2).toUpperCase()}
 </div>
 <p className="text-xs text-[#3d3a45] font-medium">{data.freelancerName}</p>
 {data.freelancerScore !== undefined && (
 <p className="text-[10px] text-[#4b3f8f]">GS {data.freelancerScore}</p>
 )}
 </div>
 </div>
 </div>

 {/* Price display */}
 <div className="glass-panel-sm p-4 mb-6">
 <div className="flex items-center justify-between mb-3">
 <span className="text-xs text-[#6f6a7d] uppercase tracking-wider font-semibold">Final Price</span>
 <span className="text-2xl font-normal text-[#4b3f8f] font-heading terminal-amount">
 ${data.finalPrice.toLocaleString()}
 </span>
 </div>

 {/* Savings bar */}
 {savings > 0 && (
 <>
 <div className="h-0.5 bg-[#f0edfa] mb-2">
 <div
 className="h-0.5 decay-bar"
 style={{ width: `${savingsPct}%` }}
 />
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-[#6f6a7d]">Started at ${data.startingPrice.toLocaleString()}</span>
 <span className="flex items-center gap-1 text-[#4b3f8f] font-semibold">
 <TrendingDown className="h-3 w-3" />
 Saved ${savings.toLocaleString()} ({savingsPct}%)
 </span>
 </div>
 </>
 )}
 </div>

 {/* Action buttons */}
 <div className="flex gap-3">
 <Link href={`/jobs/${data.jobId}`} className="flex-1" onClick={onClose}>
 <button className="btn-primary w-full py-3 text-sm rounded-full">
 View Contract
 </button>
 </Link>
 <Link href="/inbox" className="flex-1" onClick={onClose}>
 <button className="btn-glass w-full py-3 text-sm rounded-full">
 <MessageSquare className="h-4 w-4" />
 Message
 </button>
 </Link>
 </div>

 <div className="mt-3 text-center">
 <Link href={`/jobs/${data.jobId}`} onClick={onClose}>
 <button className="text-xs text-[#6f6a7d] hover:text-[#4b3f8f] transition-colors flex items-center gap-1 mx-auto">
 <Star className="h-3 w-3" /> Leave a Review
 </button>
 </Link>
 </div>
 </div>
 </div>
 );
}
