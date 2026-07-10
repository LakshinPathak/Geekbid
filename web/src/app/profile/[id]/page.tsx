"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { GEEK_TIERS, formatMoney } from "@/lib/utils";
import {
  ArrowLeft, Star, Award, Briefcase, Zap,
  CheckCircle2, MessageSquare, Shield, Send, Crown,
} from "lucide-react";
import DirectHireModal from "@/components/feed/DirectHireModal";
import InviteToBidModal from "@/components/feed/InviteToBidModal";
import MessageFreelancerModal from "@/components/feed/MessageFreelancerModal";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";

interface PublicUser {
  _id: string; id: string;
  fullName?: string; avatarInitial?: string; avatarUrl?: string; role?: string;
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
    case "Script Kiddie": return { bg: "bg-[#4d7245]/12", color: "text-[#4d7245]", border: "border-[#4d7245]/22", raw: "#4d7245" };
    case "Code Monkey":   return { bg: "bg-[#9c8fd8]/12", color: "text-[#9c8fd8]", border: "border-[#9c8fd8]/22", raw: "#9c8fd8" };
    case "Senior Geek":  return { bg: "bg-[#3d3373]/12", color: "text-[#9c8fd8]", border: "border-[#3d3373]/22", raw: "#9c8fd8" };
    case "10x Engineer": return { bg: "bg-[#4b3f8f]/12", color: "text-[#4b3f8f]", border: "border-[#4b3f8f]/22", raw: "#4b3f8f" };
    default:             return { bg: "bg-[#f4f2ee]",    color: "text-[#6f6a7d]", border: "border-[rgba(75,63,143,0.15)]", raw: "#6f6a7d" };
  }
}

function availBadge(avail?: string) {
  if (avail === "available") return { text: "Available", bg: "bg-[#4d7245]/12", color: "text-[#4d7245]", border: "border-[#4d7245]/22" };
  if (avail === "part-time") return { text: "Part-time", bg: "bg-[#4b3f8f]/12", color: "text-[#4b3f8f]", border: "border-[#4b3f8f]/22" };
  return { text: "Busy", bg: "bg-[#c14d3a]/12", color: "text-[#96543f]", border: "border-[#c14d3a]/22" };
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
  const [showMessage, setShowMessage] = useState(false);

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
    <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.4)] border-t-[#4b3f8f] rounded-full animate-spin" />
    </div>
  );

  if (error || !user) return (
    <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center gap-4">
      <p className="text-[#6f6a7d]">{error || "User not found"}</p>
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
    <div className="min-h-screen bg-[#fbfaf7] grid-bg pb-16 md:pb-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-20 pb-8">

        {/* Back */}
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-[#6f6a7d] text-sm hover:text-[#4b3f8f] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Feed
        </Link>

        {/* Profile card */}
        <div className="glass-panel rounded-2xl border border-[rgba(75,63,143,0.22)] p-6 mb-4">

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">

            {/* Avatar */}
            <CloudinaryAvatar
              avatarUrl={user.avatarUrl}
              avatarInitial={user.avatarInitial ?? user.fullName?.[0]?.toUpperCase() ?? "?"}
              size="lg"
            />

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="font-serif font-normal text-2xl text-[#3d3a45]">
                  {user.fullName ?? "Freelancer"}
                </h1>
                {user.isVerified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#4d7245]/12 text-[#4d7245] border border-[#4d7245]/22">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                )}
                {user.plan === "plus" && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#4b3f8f]/12 text-[#4b3f8f] border border-[#4b3f8f]/22">Plus</span>
                )}
                {user.plan === "premium" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#4b3f8f]/20 to-[#9c8fd8]/20 text-[#a08a3c] border border-[#4b3f8f]/35">
                    <Crown className="h-3 w-3" /> Premium
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tierStyle.bg} ${tierStyle.color} ${tierStyle.border}`}>
                  {tier.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${avail.bg} ${avail.color} ${avail.border}`}>
                  {avail.text}
                </span>
                {(user.averageRating ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-[#6f6a7d]">
                    <Star className="h-3 w-3 text-[#4b3f8f] fill-[#4b3f8f]/20" />
                    {user.averageRating!.toFixed(1)} ({user.totalReviews ?? 0} reviews)
                  </span>
                )}
                {(user.totalJobsCompleted ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-[#6f6a7d]">
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
                  onClick={() => setShowMessage(true)}
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
            { label: "Rating", value: (user.averageRating ?? 0) > 0 ? `${user.averageRating!.toFixed(1)} ★` : "—", color: "#4b3f8f" },
            { label: "Reviews", value: user.totalReviews ?? 0, color: "#3d3a45" },
            { label: "Hourly Rate", value: (user.hourlyRateMin || user.hourlyRateMax) ? `$${user.hourlyRateMin}–$${user.hourlyRateMax}` : "—", color: "#3d3a45" },
          ].map(stat => (
            <div key={stat.label} className="glass-panel-sm rounded-2xl border border-[rgba(75,63,143,0.15)] p-4 text-center">
              <p className="font-serif font-normal text-2xl" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#6f6a7d] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* GeekScore bar */}
        <div className="glass-panel rounded-2xl border border-[rgba(75,63,143,0.22)] p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6f6a7d]">GeekScore Progress</span>
            <span className="text-[11px] font-semibold" style={{ color: tierStyle.raw }}>{tier.label}</span>
          </div>
          <div className="h-1.5 w-full bg-[#f0edfa] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${scorePct}%`, background: `linear-gradient(to right, ${tierStyle.raw}88, ${tierStyle.raw})` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-[#6f6a7d]">
            <span>0</span><span>{user.geekScore ?? 0} / 1000</span>
          </div>
        </div>

        {/* About */}
        <div className="glass-panel rounded-2xl border border-[rgba(75,63,143,0.22)] p-5 mb-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f6a7d] mb-3 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> About
          </h2>
          <p className="text-sm text-[#3d3a45] leading-relaxed">
            {user.bio?.trim() || <span className="text-[#6f6a7d] italic">No bio yet.</span>}
          </p>
        </div>

        {/* Skills */}
        {(user.skills?.length ?? 0) > 0 && (
          <div className="glass-panel rounded-2xl border border-[rgba(75,63,143,0.22)] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f6a7d] mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {user.skills!.map(s => (
                <span key={s} className="px-3 py-1 rounded-full text-xs border bg-[#f4f2ee] text-[#6f6a7d] border-[rgba(75,63,143,0.22)] hover:border-[rgba(75,63,143,0.35)] hover:text-[#3d3a45] transition-colors">
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
      {showMessage && user && (
        <MessageFreelancerModal
          freelancerId={id}
          freelancerName={user.fullName ?? "Freelancer"}
          onClose={() => setShowMessage(false)}
        />
      )}
    </div>
  );
}
