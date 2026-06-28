"use client";
import { useMemo, useState } from "react";
import { type Job, GEEK_TIERS } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";
import { Users, Star, Zap, Award, Briefcase, CheckCircle2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
interface User {
 id?: string; _id?: string;
 fullName?: string; avatarInitial?: string; role?: string;
 skills?: string[]; geekScore?: number; averageRating?: number;
 totalReviews?: number; availability?: string;
 hourlyRateMin?: number; hourlyRateMax?: number;
 plan?: string; isVerified?: boolean;
}
interface Bid { freelancerId: string; jobId: string; bidPrice: number; }
interface Props {
 users: User[]; jobs: Job[]; bids: Bid[]; now: Date; ownClientId: string;
}

// ── Helpers ────────────────────────────────────────────────────────
function getGeekTier(score: number) {
 return GEEK_TIERS.find(t => score >= t.min && score <= t.max) ?? GEEK_TIERS[0];
}
function getTierStyle(label: string) {
 switch (label) {
 case "Newbie":
 return {
 bg: "bg-[#111625]",
 color: "text-[#a8997e]",
 border: "border-[rgba(201,168,76,0.15)]",
 rawColor: "#a8997e"
 };
 case "Script Kiddie":
 return {
 bg: "bg-[#2e7d52]/12",
 color: "text-[#4caf7d]",
 border: "border-[#2e7d52]/22",
 rawColor: "#4caf7d"
 };
 case "Code Monkey":
 return {
 bg: "bg-[#3b82f6]/12",
 color: "text-[#60a5fa]",
 border: "border-[#3b82f6]/22",
 rawColor: "#60a5fa"
 };
 case "Senior Geek":
 return {
 bg: "bg-[#8b5cf6]/12",
 color: "text-[#a78bfa]",
 border: "border-[#8b5cf6]/22",
 rawColor: "#a78bfa"
 };
 case "10x Engineer":
 default:
 return {
 bg: "bg-[#c9a84c]/12",
 color: "text-[#c9a84c]",
 border: "border-[#c9a84c]/22",
 rawColor: "#c9a84c"
 };
 }
}
function availabilityBadge(avail?: string) {
 if (avail === "available") return { text: "Available", bg: "bg-[#2e7d52]/12", color: "text-[#4caf7d]", border: "border-[#2e7d52]/22" };
 if (avail === "part-time") return { text: "Part-time", bg: "bg-[#c9a84c]/12", color: "text-[#c9a84c]", border: "border-[#c9a84c]/22" };
 return { text: "Busy", bg: "bg-[#c0392b]/12", color: "text-[#e57373]", border: "border-[#c0392b]/22" };
}

// ── Single Freelancer Card — mirrors FreelancerJobCard layout ──────
function FreelancerCard({
 freelancer, bids, myJobSkills,
}: {
 freelancer: User; bids: Bid[]; myJobSkills: string[];
}) {
 const fid = freelancer.id ?? freelancer._id ?? "";
 const myBids = bids.filter(b => b.freelancerId === fid);
 const avgBid = myBids.length > 0
 ? myBids.reduce((s, b) => s + b.bidPrice, 0) / myBids.length : null;

 const tier = getGeekTier(freelancer.geekScore ?? 0);
 const tierStyle = getTierStyle(tier.label);
 const avail = availabilityBadge(freelancer.availability);
 const scorePct = Math.min(Math.round(((freelancer.geekScore ?? 0) / 1000) * 100), 100);

 const matchedSkills = (freelancer.skills ?? []).filter(s => myJobSkills.includes(s));
 const otherSkills = (freelancer.skills ?? []).filter(s => !myJobSkills.includes(s)).slice(0, 2);
 const extraCount = (freelancer.skills?.length ?? 0) - matchedSkills.length - otherSkills.length;

 return (
 <div className="glass-panel rounded-[3px] p-5 border border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)] transition-all duration-200 flex flex-col gap-4 h-full">

 {/* ── Header: badges ──────────────────────────────────────── */}
 <div>
 <div className="flex items-start justify-between gap-2 mb-3">
 <div className="flex flex-wrap gap-1.5">
 {/* Tier */}
 <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${tierStyle.bg} ${tierStyle.color} ${tierStyle.border}`}>
 {tier.label}
 </span>
 {/* Availability */}
 <span className={`px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${avail.bg} ${avail.color} ${avail.border}`}>
 {avail.text}
 </span>
 {freelancer.plan === "pro" && (
 <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#c9a84c]/12 text-[#c9a84c] border border-[#c9a84c]/22">Pro</span>
 )}
 {freelancer.isVerified && (
 <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#2e7d52]/12 text-[#4caf7d] border border-[#2e7d52]/22">✓ Verified</span>
 )}
 </div>
 {matchedSkills.length > 0 && (
 <CheckCircle2 className="h-4 w-4 text-[#4caf7d] shrink-0 mt-0.5" />
 )}
 </div>

 {/* Avatar + Name */}
 <div className="flex items-center gap-2.5 mb-3">
 <div className="w-8 h-8 rounded-[3px] from-[#c9a84c] to-[#8a6e2f] flex items-center justify-center text-sm font-bold text-[#050810] shrink-0">
 {freelancer.avatarInitial ?? freelancer.fullName?.[0] ?? "?"}
 </div>
 <h3 className="font-heading text-[15px] font-normal text-[#f0e8d4] leading-snug line-clamp-1">
 {freelancer.fullName ?? "Freelancer"}
 </h3>
 </div>

 {/* Skill chips */}
 <div className="flex flex-wrap gap-1.5">
 {matchedSkills.slice(0, 3).map(s => (
 <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-[3px] text-[11px] bg-[#2e7d52]/12 text-[#4caf7d] border border-[#2e7d52]/22">✓ {s}</span>
 ))}
 {otherSkills.map(s => (
 <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-[3px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]">{s}</span>
 ))}
 {extraCount > 0 && (
 <span className="px-2 py-0.5 rounded-[3px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]">+{extraCount} more</span>
 )}
 </div>
 </div>

 {/* ── GeekScore + Avg Bid ──────────────────────────────────── */}
 <div>
 <div className="flex items-baseline justify-between mb-2">
 <div>
 <span className="text-[10px] text-[#a8997e] font-medium uppercase tracking-wider">GeekScore</span>
 <p className={`font-heading text-2xl font-normal ${tierStyle.color}`}>
 {freelancer.geekScore ?? 0}
 </p>
 </div>
 {avgBid && (
 <div className="text-right">
 <span className="text-[10px] text-[#a8997e] font-medium uppercase tracking-wider">Avg Bid</span>
 <p className="font-heading text-lg font-normal text-[#f0e8d4]">{formatMoney(avgBid)}</p>
 </div>
 )}
 </div>

 {/* Score bar */}
 <div className="space-y-1">
 <div className="h-0.5 w-full bg-[#1a1f30]">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{ width: `${scorePct}%`, background: `linear-gradient(to right, ${tierStyle.rawColor}88, ${tierStyle.rawColor})` }}
 />
 </div>
 <div className="flex justify-between text-[10px] text-[#a8997e] font-medium">
 <span>0</span>
 <span className="font-semibold" style={{ color: tierStyle.rawColor }}>{tier.label}</span>
 <span>1000</span>
 </div>
 </div>
 </div>

 {/* ── Hourly rate ──────────────────────────────────────────── */}
 {(freelancer.hourlyRateMin || freelancer.hourlyRateMax) && (
 <div className="flex items-center gap-1.5 text-xs">
 <Zap className="h-3 w-3 text-[#c9a84c]" />
 <span className="text-[#a8997e] font-medium">
 ${freelancer.hourlyRateMin}–${freelancer.hourlyRateMax}/hr
 </span>
 {myBids.length > 0 && (
 <span className="text-[#a8997e]">· {myBids.length} bid{myBids.length !== 1 ? "s" : ""} placed</span>
 )}
 </div>
 )}

 {/* ── Footer ───────────────────────────────────────────────── */}
 <div className="mt-auto pt-3 border-t border-[rgba(201,168,76,0.15)]">
 <div className="flex items-center gap-3 text-[11px] text-[#a8997e] font-medium">
 {(freelancer.averageRating ?? 0) > 0 && (
 <span className="flex items-center gap-1 text-[#a8997e]">
 <Star className="h-3 w-3 text-[#c9a84c] fill-[#c9a84c]/20" />
 {freelancer.averageRating!.toFixed(1)}
 </span>
 )}
 <span className="flex items-center gap-1">
 <Award className="h-3 w-3 text-[#a8997e]" />
 {freelancer.totalReviews ?? 0} review{(freelancer.totalReviews ?? 0) !== 1 ? "s" : ""}
 </span>
 <span className="flex items-center gap-1">
 <Briefcase className="h-3 w-3 text-[#a8997e]" />
 {myBids.length} bid{myBids.length !== 1 ? "s" : ""}
 </span>
 </div>
 </div>
 </div>
 );
}

// ── Main TalentPool ────────────────────────────────────────────────
export default function TalentPool({ users, jobs, bids, ownClientId }: Props) {
 const [activeSkill, setActiveSkill] = useState<string>("all");

 const freelancers = useMemo(() => users.filter(u => u.role === "freelancer"), [users]);

 // Client's posted jobs → relevant skills
 const myJobSkills = useMemo(() => {
 const myJobs = jobs.filter(j => j.clientId === ownClientId && j.status === "open");
 const skills = new Set<string>();
 myJobs.forEach(j => j.skillsRequired.forEach(s => skills.add(s)));
 return [...skills];
 }, [jobs, ownClientId]);

 // All unique skills across freelancers (sorted by frequency)
 const allSkills = useMemo(() => {
 const freq: Record<string, number> = {};
 freelancers.forEach(f => (f.skills ?? []).forEach(s => { freq[s] = (freq[s] ?? 0) + 1; }));
 return Object.entries(freq)
 .sort((a, b) => {
 const aR = myJobSkills.includes(a[0]) ? 1 : 0;
 const bR = myJobSkills.includes(b[0]) ? 1 : 0;
 if (bR !== aR) return bR - aR;
 return b[1] - a[1];
 })
 .slice(0, 10)
 .map(([s]) => s);
 }, [freelancers, myJobSkills]);

 // Filtered + sorted freelancers
 const displayFreelancers = useMemo(() => {
 let list = activeSkill === "all"
 ? [...freelancers]
 : freelancers.filter(f => (f.skills ?? []).includes(activeSkill));

 // Sort: most matched skills first, then by geekScore
 return list.sort((a, b) => {
 const aM = (a.skills ?? []).filter(s => myJobSkills.includes(s)).length;
 const bM = (b.skills ?? []).filter(s => myJobSkills.includes(s)).length;
 if (bM !== aM) return bM - aM;
 return (b.geekScore ?? 0) - (a.geekScore ?? 0);
 });
 }, [freelancers, activeSkill, myJobSkills]);

 const avgGeekScore = freelancers.length > 0
 ? Math.round(freelancers.reduce((s, f) => s + (f.geekScore ?? 0), 0) / freelancers.length)
 : 0;

 if (freelancers.length === 0) return null;

 return (
 <div className="space-y-4">

 {/* ── Header ────────────────────────────────────────────── */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xs font-semibold text-[#a8997e] uppercase tracking-wider flex items-center gap-2">
 <Users className="h-4 w-4 text-[#c9a84c]" />
 Talent Pool
 </h2>
 <p className="text-[11px] text-[#a8997e] mt-0.5">
 {displayFreelancers.length} freelancer{displayFreelancers.length !== 1 ? "s" : ""} available
 {activeSkill !== "all" ? ` · ${activeSkill}` : " · all skills"}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <div className="px-3 py-1.5 rounded-[3px] bg-[#111625] border border-[rgba(201,168,76,0.15)] text-right">
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Freelancers</p>
 <p className="font-heading text-sm font-normal text-[#f0e8d4]">{freelancers.length}</p>
 </div>
 <div className="px-3 py-1.5 rounded-[3px] bg-[#c9a84c]/12 border border-[rgba(201,168,76,0.22)] text-right">
 <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Avg GeekScore</p>
 <p className="font-heading text-sm font-normal text-[#c9a84c]">{avgGeekScore}</p>
 </div>
 </div>
 </div>

 {/* ── Skill filter tabs ─────────── */}
 <div className="flex items-center gap-2 flex-wrap">
 <button
 onClick={() => setActiveSkill("all")}
 className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold transition-colors border cursor-pointer ${
 activeSkill === "all"
 ? "bg-[#c9a84c] text-[#050810] border-transparent"
 : "bg-[#111625] text-[#a8997e] border-[rgba(201,168,76,0.15)] hover:border-[#c9a84c]"
 }`}
 >
 All ({freelancers.length})
 </button>
 {allSkills.map(skill => {
 const count = freelancers.filter(f => (f.skills ?? []).includes(skill)).length;
 const isMySkill = myJobSkills.includes(skill);
 return (
 <button
 key={skill}
 onClick={() => setActiveSkill(skill)}
 className={`px-3 py-1.5 rounded-[3px] text-[11px] font-semibold transition-colors border cursor-pointer ${
 activeSkill === skill
 ? "bg-[#c9a84c] text-[#050810] border-transparent"
 : isMySkill
 ? "bg-[#2e7d52]/12 text-[#4caf7d] border-[#2e7d52]/22 hover:border-[#4caf7d]"
 : "bg-[#111625] text-[#a8997e] border-[rgba(201,168,76,0.15)] hover:border-[#c9a84c]"
 }`}
 >
 {isMySkill ? "✓ " : ""}{skill} ({count})
 </button>
 );
 })}
 </div>

 {/* ── Cards grid ─────────── */}
 {displayFreelancers.length > 0 ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
 {displayFreelancers.map(f => (
 <FreelancerCard
 key={f.id ?? f._id}
 freelancer={f}
 bids={bids}
 myJobSkills={myJobSkills}
 />
 ))}
 </div>
 ) : (
 <div className="text-center py-10 text-[#a8997e] text-sm">
 No freelancers found for <strong className="text-[#a8997e]">{activeSkill}</strong>.
 </div>
 )}
 </div>
 );
}
