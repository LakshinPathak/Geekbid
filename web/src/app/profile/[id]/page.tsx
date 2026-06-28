"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { GEEK_TIERS, formatMoney } from "@/lib/utils";
import {
  ArrowLeft, Star, Award, Briefcase, Zap,
  CheckCircle2, MessageSquare, Shield, Send,
} from "lucide-react";
import DirectHireModal from "@/components/feed/DirectHireModal";
import InviteToBidModal from "@/components/feed/InviteToBidModal";

interface PublicUser {
  _id: string; id: string;
  fullName?: string; avatarInitial?: string; role?: string;
  skills?: string[]; geekScore?: number; averageRating?: number;
  totalReviews?: number; availability?: string; bio?: string;
  hourlyRateMin?: number; hourlyRateMax?: number;
  plan?: string; isVerified?: boolean; joinedAt?: string;
  totalJobsCompleted?: number;
}

function getGeekTier(score: number) {
  return GEEK_TIERS.find(t => score >= t.min && score <= t.max) ?? GEEK_TIERS[0];
}

function getTierStyle(label: string) {
  switch (label) {
    case "Script Kiddie": return { bg: "bg-[#2e7d52]/12", color: "text-[#4caf7d]", border: "border-[#2e7d52]/22", raw: "#4caf7d" };
    case "Code Monkey":   return { bg: "bg-[#3b82f6]/12", color: "text-[#60a5fa]", border: "border-[#3b82f6]/22", raw: "#60a5fa" };
    case "Senior Geek":  return { bg: "bg-[#8b5cf6]/12", color: "text-[#a78bfa]", border: "border-[#8b5cf6]/22", raw: "#a78bfa" };
    case "10x Engineer": return { bg: "bg-[#c9a84c]/12", color: "text-[#c9a84c]", border: "border-[#c9a84c]/22", raw: "#c9a84c" };
    default:             return { bg: "bg-[#111625]",    color: "text-[#a8997e]", border: "border-[rgba(201,168,76,0.15)]", raw: "#a8997e" };
  }
}

function availBadge(avail?: string) {
  if (avail === "available") return { text: "Available", bg: "bg-[#2e7d52]/12", color: "text-[#4caf7d]", border: "border-[#2e7d52]/22" };
  if (avail === "part-time") return { text: "Part-time", bg: "bg-[#c9a84c]/12", color: "text-[#c9a84c]", border: "border-[#c9a84c]/22" };
  return { text: "Busy", bg: "bg-[#c0392b]/12", color: "text-[#e57373]", border: "border-[#c0392b]/22" };
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentUser, mounted } = useApp();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHire, setShowHire] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setUser(data); })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.4)] border-t-[#c9a84c] rounded-full animate-spin" />
    </div>
  );

  if (error || !user) return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-4">
      <p className="text-[#a8997e]">{error || "User not found"}</p>
      <Link href="/feed" className="btn-ghost text-sm px-4 py-2">← Back to Feed</Link>
    </div>
  );

  const tier = getGeekTier(user.geekScore ?? 0);
  const tierStyle = getTierStyle(tier.label);
  const avail = availBadge(user.availability);
  const scorePct = Math.min(Math.round(((user.geekScore ?? 0) / 1000) * 100), 100);

  const ownProfile = (currentUser?.id ?? currentUser?._id) === id;
  const isClient = currentUser?.role === "client";
  const isFreelancer = user.role === "freelancer";
  const showActions = isClient && isFreelancer && !ownProfile;

  return (
    <div className="min-h-screen bg-[#080b14] grid-bg pb-16 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-8">

        {/* Back */}
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-[#a8997e] text-sm hover:text-[#c9a84c] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        {/* Profile card */}
        <div className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] p-6 mb-4">

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">

            {/* Avatar */}
            <div className="h-16 w-16 rounded-[6px] flex items-center justify-center text-2xl font-bold text-[#050810] shrink-0"
                 style={{ background: "linear-gradient(135deg, #c9a84c, #8a6e2f)" }}>
              {user.avatarInitial ?? user.fullName?.[0]?.toUpperCase() ?? "?"}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="font-serif font-normal text-2xl text-[#f0e8d4]">
                  {user.fullName ?? "Freelancer"}
                </h1>
                {user.isVerified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#2e7d52]/12 text-[#4caf7d] border border-[#2e7d52]/22">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                )}
                {user.plan === "pro" && (
                  <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#c9a84c]/12 text-[#c9a84c] border border-[#c9a84c]/22">Pro</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${tierStyle.bg} ${tierStyle.color} ${tierStyle.border}`}>
                  {tier.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold border ${avail.bg} ${avail.color} ${avail.border}`}>
                  {avail.text}
                </span>
                {(user.averageRating ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-[#a8997e]">
                    <Star className="h-3 w-3 text-[#c9a84c] fill-[#c9a84c]/20" />
                    {user.averageRating!.toFixed(1)} ({user.totalReviews ?? 0} reviews)
                  </span>
                )}
                {(user.totalJobsCompleted ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-[#a8997e]">
                    <Briefcase className="h-3 w-3" />
                    {user.totalJobsCompleted} jobs done
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {showActions && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push("/inbox")}
                  className="btn-ghost text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <MessageSquare className="h-4 w-4" /> Message
                </button>
                <button
                  onClick={() => setShowInvite(true)}
                  className="btn-ghost text-sm px-4 py-2 flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" /> Invite
                </button>
                {(user.geekScore ?? 0) >= 500 && (
                  <button
                    onClick={() => setShowHire(true)}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
                  >
                    <Zap className="h-4 w-4" /> Direct Hire
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "GeekScore", value: user.geekScore ?? 0, color: tierStyle.raw },
            { label: "Rating", value: (user.averageRating ?? 0) > 0 ? `${user.averageRating!.toFixed(1)} ★` : "—", color: "#c9a84c" },
            { label: "Reviews", value: user.totalReviews ?? 0, color: "#f0e8d4" },
            { label: "Hourly Rate", value: (user.hourlyRateMin || user.hourlyRateMax) ? `$${user.hourlyRateMin}–$${user.hourlyRateMax}` : "—", color: "#f0e8d4" },
          ].map(stat => (
            <div key={stat.label} className="glass-panel-sm rounded-[6px] border border-[rgba(201,168,76,0.15)] p-4 text-center">
              <p className="font-serif font-normal text-2xl" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#a8997e] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* GeekScore bar */}
        <div className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">GeekScore Progress</span>
            <span className="text-[11px] font-semibold" style={{ color: tierStyle.raw }}>{tier.label}</span>
          </div>
          <div className="h-1.5 w-full bg-[#1a1f30] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${scorePct}%`, background: `linear-gradient(to right, ${tierStyle.raw}88, ${tierStyle.raw})` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-[#a8997e]">
            <span>0</span><span>{user.geekScore ?? 0} / 1000</span>
          </div>
        </div>

        {/* About */}
        <div className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] p-5 mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a8997e] mb-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> About
          </h2>
          <p className="text-sm text-[#f0e8d4] leading-relaxed">
            {user.bio?.trim() || <span className="text-[#a8997e] italic">No bio yet.</span>}
          </p>
        </div>

        {/* Skills */}
        {(user.skills?.length ?? 0) > 0 && (
          <div className="glass-panel rounded-[6px] border border-[rgba(201,168,76,0.22)] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a8997e] mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {user.skills!.map(s => (
                <span key={s} className="px-3 py-1 rounded-[3px] text-xs border bg-[#111625] text-[#a8997e] border-[rgba(201,168,76,0.22)] hover:border-[rgba(201,168,76,0.35)] hover:text-[#f0e8d4] transition-colors">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showHire && user && (
        <DirectHireModal
          freelancerId={id}
          freelancerName={user.fullName ?? "Freelancer"}
          freelancerSkills={user.skills ?? []}
          onClose={() => setShowHire(false)}
        />
      )}
      {showInvite && user && (
        <InviteToBidModal
          freelancerId={id}
          freelancerName={user.fullName ?? "Freelancer"}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
