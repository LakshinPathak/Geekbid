"use client";
import { useMemo, useState, useRef, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { type Job, GEEK_TIERS } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { Users, Star, Zap, Award, Briefcase, CheckCircle2, ArrowRight, MessageSquare, Send, Crown, Sparkles } from "lucide-react";
import DirectHireModal from "./DirectHireModal";
import InviteToBidModal from "./InviteToBidModal";
import MessageFreelancerModal from "./MessageFreelancerModal";
import SmartMatchModal from "./SmartMatchModal";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";
import EmptyState from "./EmptyState";
import { usePointerFine, useTilt3D } from "@/components/landing/hooks";

// ── Types ──────────────────────────────────────────────────────────
interface User {
  id?: string; _id?: string;
  fullName?: string; avatarInitial?: string; avatarUrl?: string; role?: string;
  skills?: string[]; geekScore?: number; averageRating?: number;
  totalReviews?: number; availability?: string;
  hourlyRateMin?: number; hourlyRateMax?: number;
  plan?: string; isVerified?: boolean;
}
interface Bid { freelancerId: string; jobId: string; bidPrice: number; }
interface Props {
  users: User[]; jobs: Job[]; bids: Bid[]; ownClientId: string;
}

// ── Helpers ────────────────────────────────────────────────────────
function getGeekTier(score: number) {
  return GEEK_TIERS.find(t => score >= t.min && score <= t.max) ?? GEEK_TIERS[0];
}
function getTierStyle(label: string) {
  switch (label) {
    case "Newbie":        return { bg: "bg-[#f4f2ee]",    color: "text-[#46424e]", border: "border-[rgba(75,63,143,0.15)]", rawColor: "#46424e" };
    case "Script Kiddie": return { bg: "bg-[#4d7245]/12", color: "text-[#4d7245]", border: "border-[#4d7245]/22",           rawColor: "#4d7245" };
    case "Code Monkey":   return { bg: "bg-[#9c8fd8]/12", color: "text-[#9c8fd8]", border: "border-[#9c8fd8]/22",           rawColor: "#9c8fd8" };
    case "Senior Geek":   return { bg: "bg-[#3d3373]/12", color: "text-[#3d3373]", border: "border-[#3d3373]/22",           rawColor: "#3d3373" };
    case "10x Engineer":
    default:              return { bg: "bg-[#4b3f8f]/12", color: "text-[#4b3f8f]", border: "border-[#4b3f8f]/22",           rawColor: "#4b3f8f" };
  }
}
const EMPTY_BIDS: Bid[] = [];

function availabilityBadge(avail?: string) {
  if (avail === "available") return { text: "Available", bg: "bg-[#4d7245]/12", color: "text-[#4d7245]", border: "border-[#4d7245]/22" };
  if (avail === "part-time") return { text: "Part-time", bg: "bg-[#4b3f8f]/12", color: "text-[#4b3f8f]", border: "border-[#4b3f8f]/22" };
  return { text: "Busy", bg: "bg-[#c14d3a]/12", color: "text-[#96543f]", border: "border-[#c14d3a]/22" };
}

// ── Animated circular GeekScore ring ────────────────────────────────
function GeekScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const [dash, setDash] = useState(c);
  useEffect(() => {
    const t = setTimeout(() => setDash(c * (1 - pct / 100)), 50);
    return () => clearTimeout(t);
  }, [c, pct]);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0 -rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f0edfa" strokeWidth="5" />
      <circle
        className="geekscore-ring"
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={dash}
      />
    </svg>
  );
}

// ── Single Freelancer Card ─────────────────────────────────────────
const FreelancerCard = memo(function FreelancerCard({
  freelancer, bids, myJobSkills,
}: {
  freelancer: User; bids: Bid[]; myJobSkills: string[];
}) {
  const router = useRouter();
  const { currentUser } = useApp();
  const [showHireModal, setShowHireModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useTilt3D(cardRef, isPointerFine);

  const fid = freelancer.id ?? freelancer._id ?? "";
  const myBids = bids;
  const avgBid = myBids.length > 0
    ? myBids.reduce((s, b) => s + b.bidPrice, 0) / myBids.length : null;

  const tier = getGeekTier(freelancer.geekScore ?? 0);
  const tierStyle = getTierStyle(tier.label);
  const avail = availabilityBadge(freelancer.availability);
  const scorePct = Math.min(Math.round(((freelancer.geekScore ?? 0) / 1000) * 100), 100);

  const matchedSkills = (freelancer.skills ?? []).filter(s => myJobSkills.includes(s));
  const otherSkills = (freelancer.skills ?? []).filter(s => !myJobSkills.includes(s)).slice(0, 2);
  const extraCount = (freelancer.skills?.length ?? 0) - matchedSkills.length - otherSkills.length;

  const isClient = currentUser?.role === "client";
  const canHire = isClient && (freelancer.geekScore ?? 0) >= 500;

  return (
    <>
      <div
        ref={cardRef}
        className="glass-panel feed-glass-card feed-tilt-card feed-card-border-rotate rounded-2xl p-5 border border-[rgba(75,63,143,0.22)] hover:border-[rgba(75,63,143,0.35)] transition-all duration-200 flex flex-col gap-4 h-full cursor-pointer group relative"
        onClick={() => router.push(`/profile/${fid}`)}
      >

        {/* ── Header: badges ──────────────────────────────────────── */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tierStyle.bg} ${tierStyle.color} ${tierStyle.border}`}>
                {tier.label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${avail.bg} ${avail.color} ${avail.border}`}>
                {avail.text}
              </span>
              {freelancer.plan === "plus" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#4b3f8f]/12 text-[#4b3f8f] border border-[#4b3f8f]/22">Plus</span>
              )}
              {freelancer.plan === "premium" && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#4b3f8f]/20 to-[#9c8fd8]/20 text-[#a08a3c] border border-[#4b3f8f]/35">
                  <Crown className="h-3 w-3" /> Premium
                </span>
              )}
              {freelancer.isVerified && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#4d7245]/12 text-[#4d7245] border border-[#4d7245]/22">✓ Verified</span>
              )}
            </div>
            {matchedSkills.length > 0 && (
              <CheckCircle2 className="h-4 w-4 text-[#4d7245] shrink-0 mt-0.5" />
            )}
          </div>

          {/* Avatar + Name */}
          <div className="flex items-center gap-3 mb-3">
            <CloudinaryAvatar
              avatarUrl={freelancer.avatarUrl}
              avatarInitial={freelancer.avatarInitial ?? freelancer.fullName?.[0] ?? "?"}
              size="lg"
              showOnlineIndicator
              isOnline={freelancer.availability === "available"}
            />
            <h3 className="font-heading text-base font-normal text-[#3d3a45] leading-snug line-clamp-1 group-hover:text-[#4b3f8f] transition-colors">
              {freelancer.fullName ?? "Freelancer"}
            </h3>
          </div>

          {/* Skill match percentage */}
          {myJobSkills.length > 0 && (freelancer.skills?.length ?? 0) > 0 && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-[10px] text-[#46424e] font-medium">
                <span>Skill Match</span>
                <span className="text-[#4d7245] font-semibold">
                  {Math.round((matchedSkills.length / (freelancer.skills?.length ?? 1)) * 100)}%
                </span>
              </div>
              <div className="h-1 w-full bg-[#f0edfa] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round((matchedSkills.length / (freelancer.skills?.length ?? 1)) * 100)}%`,
                    background: "linear-gradient(to right, #3d3373, #4b3f8f)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Skill chips */}
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.slice(0, 3).map(s => (
              <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] bg-[#4d7245]/12 text-[#4d7245] border border-[#4d7245]/22">✓ {s}</span>
            ))}
            {otherSkills.map(s => (
              <span key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.15)]">{s}</span>
            ))}
            {extraCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.15)]">+{extraCount} more</span>
            )}
          </div>
        </div>

        {/* ── GeekScore ring + Avg Bid ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <GeekScoreRing pct={scorePct} color={tierStyle.rawColor} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-heading text-sm font-normal ${tierStyle.color}`}>{freelancer.geekScore ?? 0}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-[#46424e] font-medium uppercase tracking-wider block">GeekScore</span>
              <span className="text-[11px] font-semibold" style={{ color: tierStyle.rawColor }}>{tier.label}</span>
            </div>
          </div>
          {avgBid && (
            <div className="text-right">
              <span className="text-[10px] text-[#46424e] font-medium uppercase tracking-wider">Avg Bid</span>
              <p className="font-heading text-lg font-normal text-[#3d3a45]">{formatMoney(avgBid)}</p>
            </div>
          )}
        </div>

        {/* ── Hourly rate ──────────────────────────────────────────── */}
        {(freelancer.hourlyRateMin || freelancer.hourlyRateMax) && (
          <div className="flex items-center gap-1.5 text-xs">
            <Zap className="h-3 w-3 text-[#4b3f8f]" />
            <span className="text-[#46424e] font-medium">
              ${freelancer.hourlyRateMin}–${freelancer.hourlyRateMax}/hr
            </span>
            {myBids.length > 0 && (
              <span className="text-[#46424e]">· {myBids.length} bid{myBids.length !== 1 ? "s" : ""} placed</span>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="mt-auto pt-3 border-t border-[rgba(75,63,143,0.15)]">
          <div className="flex items-center gap-3 text-[11px] text-[#46424e] font-medium mb-3">
            {(freelancer.averageRating ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[#46424e]">
                <Star className="h-3 w-3 text-[#4b3f8f] fill-[#4b3f8f]/20" />
                {freelancer.averageRating!.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3 text-[#46424e]" />
              {freelancer.totalReviews ?? 0} review{(freelancer.totalReviews ?? 0) !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3 text-[#46424e]" />
              {myBids.length} bid{myBids.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Action buttons (client only) */}
          {isClient && (
            <div className="flex items-center gap-2">
              <button
                onClick={e => { e.stopPropagation(); setShowMessageModal(true); }}
                className="btn-ghost text-[11px] px-2.5 py-1.5 flex items-center gap-1 flex-1 justify-center"
              >
                <MessageSquare className="h-3 w-3" /> Message
              </button>
              <button
                onClick={e => { e.stopPropagation(); setShowInviteModal(true); }}
                className="btn-ghost text-[11px] px-2.5 py-1.5 flex items-center gap-1 flex-1 justify-center"
              >
                <Send className="h-3 w-3" /> Invite
              </button>
              {canHire && (
                <button
                  onClick={e => { e.stopPropagation(); setShowHireModal(true); }}
                  className="btn-primary text-[11px] px-2.5 py-1.5 flex items-center gap-1 flex-1 justify-center"
                >
                  <Zap className="h-3 w-3" /> Hire
                </button>
              )}
            </div>
          )}

          {/* View profile hover hint */}
          {!isClient && (
            <div className="flex items-center justify-end">
              <span className="text-[11px] text-[#4b3f8f] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                View Profile <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modals — rendered outside the clickable card div */}
      {showHireModal && (
        <DirectHireModal
          freelancerId={fid}
          freelancerName={freelancer.fullName ?? "Freelancer"}
          freelancerSkills={freelancer.skills ?? []}
          hourlyRateMin={freelancer.hourlyRateMin}
          hourlyRateMax={freelancer.hourlyRateMax}
          onClose={() => setShowHireModal(false)}
        />
      )}
      {showInviteModal && (
        <InviteToBidModal
          freelancerId={fid}
          freelancerName={freelancer.fullName ?? "Freelancer"}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      {showMessageModal && (
        <MessageFreelancerModal
          freelancerId={fid}
          freelancerName={freelancer.fullName ?? "Freelancer"}
          onClose={() => setShowMessageModal(false)}
        />
      )}
    </>
  );
});

// ── Main TalentPool ────────────────────────────────────────────────
export default function TalentPool({ users, jobs, bids, ownClientId }: Props) {
  const { currentUser } = useApp();
  const [activeSkill, setActiveSkill] = useState<string>("all");
  const [smartMatchJob, setSmartMatchJob] = useState<{ id: string; title: string } | null>(null);
  const [smartMatchPickId, setSmartMatchPickId] = useState<string>("");

  const isClient = currentUser?.role === "client";
  const myOpenJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          j.clientId === ownClientId &&
          j.status === "open" &&
          j.type !== "direct_offer"
      ),
    [jobs, ownClientId]
  );

  useEffect(() => {
    if (myOpenJobs.length > 0 && !smartMatchPickId) {
      setSmartMatchPickId(myOpenJobs[0].id ?? myOpenJobs[0]._id ?? "");
    }
  }, [myOpenJobs, smartMatchPickId]);

  const freelancers = useMemo(() => users.filter(u => u.role === "freelancer"), [users]);

  const bidsByFreelancer = useMemo(() => {
    const map = new Map<string, Bid[]>();
    bids.forEach(b => {
      const list = map.get(b.freelancerId);
      if (list) list.push(b);
      else map.set(b.freelancerId, [b]);
    });
    return map;
  }, [bids]);

  const myJobSkills = useMemo(() => {
    const myJobs = jobs.filter(j => j.clientId === ownClientId && j.status === "open");
    const skills = new Set<string>();
    myJobs.forEach(j => j.skillsRequired.forEach(s => skills.add(s)));
    return [...skills];
  }, [jobs, ownClientId]);

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

  const displayFreelancers = useMemo(() => {
    const list = activeSkill === "all"
      ? [...freelancers]
      : freelancers.filter(f => (f.skills ?? []).includes(activeSkill));

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
      {smartMatchJob && (
        <SmartMatchModal
          jobId={smartMatchJob.id}
          jobTitle={smartMatchJob.title}
          onClose={() => setSmartMatchJob(null)}
        />
      )}

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-[#46424e] uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4 text-[#4b3f8f]" />
            Talent Pool
          </h2>
          <p className="text-[11px] text-[#46424e] mt-0.5">
            {displayFreelancers.length} freelancer{displayFreelancers.length !== 1 ? "s" : ""} available
            {activeSkill !== "all" ? ` · ${activeSkill}` : " · all skills"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isClient && myOpenJobs.length > 0 && (
            <div className="flex items-center gap-1.5">
              {myOpenJobs.length > 1 && (
                <select
                  value={smartMatchPickId}
                  onChange={(e) => setSmartMatchPickId(e.target.value)}
                  className="text-[10px] rounded-full border border-[rgba(75,63,143,0.22)] bg-[#f4f2ee] px-2 py-1.5 text-[#46424e] max-w-[120px] truncate"
                >
                  {myOpenJobs.map((j) => {
                    const jid = j.id ?? j._id ?? "";
                    return (
                      <option key={jid} value={jid}>
                        {j.title}
                      </option>
                    );
                  })}
                </select>
              )}
              <button
                type="button"
                onClick={() => {
                  const job = myOpenJobs.find(
                    (j) => (j.id ?? j._id) === smartMatchPickId
                  ) ?? myOpenJobs[0];
                  setSmartMatchJob({
                    id: job.id ?? job._id ?? "",
                    title: job.title,
                  });
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold bg-[#4b3f8f] text-[#ffffff] hover:bg-[#3d3373] transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                Smart Match
              </button>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-full bg-[#f4f2ee] border border-[rgba(75,63,143,0.15)] text-right">
            <p className="text-[10px] text-[#46424e] uppercase tracking-wider">Freelancers</p>
            <p className="font-heading text-sm font-normal text-[#3d3a45]">{freelancers.length}</p>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#4b3f8f]/12 border border-[rgba(75,63,143,0.22)] text-right">
            <p className="text-[10px] text-[#46424e] uppercase tracking-wider">Avg GeekScore</p>
            <p className="font-heading text-sm font-normal text-[#4b3f8f]">{avgGeekScore}</p>
          </div>
        </div>
      </div>

      {/* ── Skill filter tabs ─────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveSkill("all")}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border cursor-pointer active:scale-90 feed-chip-bounce ${
            activeSkill === "all"
              ? "bg-[#4b3f8f] text-[#ffffff] border-transparent"
              : "bg-[#f4f2ee] text-[#46424e] border-[rgba(75,63,143,0.15)] hover:border-[#4b3f8f]"
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
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border cursor-pointer active:scale-90 feed-chip-bounce ${
                activeSkill === skill
                  ? "bg-[#4b3f8f] text-[#ffffff] border-transparent"
                  : isMySkill
                  ? "bg-[#4d7245]/12 text-[#4d7245] border-[#4d7245]/22 hover:border-[#4d7245]"
                  : "bg-[#f4f2ee] text-[#46424e] border-[rgba(75,63,143,0.15)] hover:border-[#4b3f8f]"
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
              bids={bidsByFreelancer.get(f.id ?? f._id ?? "") ?? EMPTY_BIDS}
              myJobSkills={myJobSkills}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          variant="talent"
          title={`No freelancers found for ${activeSkill}`}
          ctaLabel="Reset filter"
          onCta={() => setActiveSkill("all")}
        />
      )}
    </div>
  );
}
