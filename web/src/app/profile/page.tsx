"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney, getGeekTier, SKILL_TAXONOMY } from "@/lib/utils";
import { toast } from "sonner";
import {
  User, Star, Briefcase, Clock, DollarSign, MessageSquare,
  CheckCircle2, Code, Shield, Pencil, GitBranch, Trash2, ChevronDown,
  X, Save, Loader2, AlertTriangle, Share2, Copy, Users,
} from "lucide-react";

export default function ProfilePage() {
  const { currentUser, jobs, bids, mounted, updateProfile, reviews, users, verifyGithub, referralStats } = useApp();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [company, setCompany] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [hourlyRateMin, setHourlyRateMin] = useState(0);
  const [hourlyRateMax, setHourlyRateMax] = useState(0);
  const [availability, setAvailability] = useState("available");
  const [githubUsername, setGithubUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verifyingGithub, setVerifyingGithub] = useState(false);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName ?? "");
      setBio(currentUser.bio ?? "");
      setCompany(currentUser.company ?? "");
      setSkills(currentUser.skills ?? []);
      setHourlyRateMin(currentUser.hourlyRateMin ?? 0);
      setHourlyRateMax(currentUser.hourlyRateMax ?? 0);
      setAvailability(currentUser.availability ?? "available");
      setGithubUsername(currentUser.githubUsername ?? "");
    }
  }, [currentUser]);

  const wonJobs = useMemo(() => jobs.filter(j => j.status === "accepted" && (j.acceptedBy === currentUser?.id || j.acceptedBy === currentUser?._id)), [jobs, currentUser]);
  const myBids = useMemo(() => bids.filter(b => b.freelancerId === currentUser?.id || b.freelancerId === currentUser?._id), [bids, currentUser]);
  const myPosted = useMemo(() => jobs.filter(j => j.clientId === currentUser?.id || j.clientId === currentUser?._id), [jobs, currentUser]);

  const hasChanges = useMemo(() => {
    if (!currentUser) return false;
    return (
      fullName !== (currentUser.fullName ?? "") ||
      bio !== (currentUser.bio ?? "") ||
      company !== (currentUser.company ?? "") ||
      JSON.stringify(skills) !== JSON.stringify(currentUser.skills ?? []) ||
      hourlyRateMin !== (currentUser.hourlyRateMin ?? 0) ||
      hourlyRateMax !== (currentUser.hourlyRateMax ?? 0) ||
      availability !== (currentUser.availability ?? "available") ||
      githubUsername !== (currentUser.githubUsername ?? "")
    );
  }, [fullName, bio, company, skills, hourlyRateMin, hourlyRateMax, availability, githubUsername, currentUser]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await updateProfile({
      fullName, bio, company, skills,
      hourlyRateMin, hourlyRateMax,
      availability, githubUsername,
    });
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      toast.success("Profile updated");
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast.error("Update failed", { description: result.message });
    }
  }, [fullName, bio, company, skills, hourlyRateMin, hourlyRateMax, availability, githubUsername, updateProfile]);

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  if (!mounted || !currentUser) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-[#0A0A0F]">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  const tier = getGeekTier(currentUser.geekScore ?? 0);
  const isFreelancer = currentUser.role === "freelancer";

  const stats = isFreelancer
    ? [
        { icon: Star, label: "Jobs Won", value: String(wonJobs.length) },
        { icon: MessageSquare, label: "Bids Made", value: String(myBids.length) },
        { icon: DollarSign, label: "Rate", value: `$${currentUser.hourlyRateMin ?? 0}–${currentUser.hourlyRateMax ?? 0}/hr` },
        { icon: Clock, label: "GeekScore™", value: String(currentUser.geekScore ?? 0) },
      ]
    : [
        { icon: Briefcase, label: "Posted", value: String(myPosted.length) },
        { icon: Clock, label: "Active", value: String(myPosted.filter(j => j.status === "open").length) },
        { icon: Star, label: "Completed", value: String(myPosted.filter(j => j.status === "accepted").length) },
        { icon: DollarSign, label: "Spent", value: formatMoney(myPosted.filter(j => j.finalPrice).reduce((s, j) => s + (j.finalPrice ?? 0), 0)) },
      ];

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">

        {/* ── Profile Header Card ── */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#00FF88]/10 flex items-center justify-center shrink-0">
              <span className="font-heading text-3xl font-bold text-[#00FF88]">{currentUser.avatarInitial}</span>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-heading text-3xl font-bold text-[#E8E8EC] flex items-center justify-center sm:justify-start gap-2">
                {currentUser.fullName}
                {currentUser.isVerified && (
                  <CheckCircle2 className="h-5 w-5 text-[#00FF88]" />
                )}
              </h1>
              <p className="text-[#8A8A9A] text-sm mt-0.5">{currentUser.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs font-medium capitalize">
                  {currentUser.role}
                </span>
                {currentUser.averageRating != null && currentUser.averageRating > 0 && (
                  <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full px-3 py-1 text-xs font-medium">
                    <Star className="h-3 w-3 fill-yellow-500" /> {currentUser.averageRating.toFixed(1)} ({currentUser.totalReviews})
                  </span>
                )}
                {currentUser.availability && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium border ${
                    currentUser.availability === "available" ? "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20" :
                    currentUser.availability === "part-time" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {currentUser.availability}
                  </span>
                )}
              </div>
            </div>

            {/* GeekScore (freelancer) */}
            {isFreelancer && currentUser.geekScore > 0 && (
              <div className="text-center sm:text-right shrink-0">
                <p className="font-heading text-3xl font-bold text-[#00FF88]">{currentUser.geekScore}</p>
                <p className="text-[#6E6E85] text-xs font-medium">GeekScore™ · <span style={{ color: tier.color }}>{tier.label}</span></p>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {stats.map(s => (
              <div key={s.label} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-3 text-center">
                <s.icon className="h-4 w-4 text-[#6E6E85] mx-auto mb-1.5" />
                <p className="font-heading text-lg font-bold text-[#E8E8EC]">{s.value}</p>
                <p className="text-[11px] text-[#6E6E85]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reviews Section ── */}
        {(() => {
          const uid = currentUser.id ?? currentUser._id ?? "";
          const myReviews = reviews.filter(r => r.revieweeId === uid);
          if (myReviews.length === 0) return null;
          return (
            <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-yellow-500" />
                <h2 className="font-heading text-lg font-semibold text-[#E8E8EC]">
                  Reviews ({myReviews.length})
                </h2>
                {currentUser.averageRating && (
                  <span className="ml-auto flex items-center gap-1 text-yellow-500 text-sm font-semibold">
                    <Star className="h-4 w-4 fill-yellow-500" /> {currentUser.averageRating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {myReviews.map(review => {
                  const reviewer = users.find(u => u.id === review.reviewerId || u._id === review.reviewerId);
                  return (
                    <div key={review.id} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#00FF88]/10 text-[#00FF88] text-xs font-semibold rounded-full flex items-center justify-center">
                            {reviewer?.avatarInitial ?? "?"}
                          </div>
                          <div>
                            <p className="text-[#E8E8EC] text-sm font-medium">{reviewer?.fullName ?? "User"}</p>
                            <p className="text-[#6E6E85] text-xs capitalize">{review.reviewerRole}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-[#6E6E85]"}`} />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-[#8A8A9A] text-sm">{review.comment}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Referral Section ── */}
        {referralStats && (
          <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-4 w-4 text-[#00FF88]" />
              <h2 className="font-heading text-lg font-semibold text-[#E8E8EC]">Referral Program</h2>
            </div>
            <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4 mb-4">
              <p className="text-[#6E6E85] text-xs uppercase tracking-wider font-semibold mb-2">Your Referral Link</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${referralStats.referralCode}`}
                  className="flex-1 h-10 px-3 bg-[#12121A] border border-[#1E1E2A] rounded-lg text-[#E8E8EC] text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/login?ref=${referralStats.referralCode}`);
                    toast.success("Link copied!");
                  }}
                  className="h-10 px-4 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-lg text-sm hover:bg-[#00CC6A] transition-all flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
              <p className="text-[#6E6E85] text-xs mt-2">Code: <span className="text-[#00FF88] font-mono">{referralStats.referralCode}</span></p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Invites", value: String(referralStats.totalInvites), icon: Users },
                { label: "Signed Up", value: String(referralStats.signedUp), icon: CheckCircle2 },
                { label: "Completed", value: String(referralStats.completed), icon: Star },
                { label: "Credits", value: `$${referralStats.totalCredits}`, icon: DollarSign },
              ].map(s => (
                <div key={s.label} className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-3 text-center">
                  <s.icon className="h-4 w-4 text-[#6E6E85] mx-auto mb-1.5" />
                  <p className="font-heading text-lg font-bold text-[#E8E8EC]">{s.value}</p>
                  <p className="text-[11px] text-[#6E6E85]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Edit Profile Form ── */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 sm:p-8 mt-6">
          <div className="flex items-center gap-2 mb-6">
            <Pencil className="h-4 w-4 text-[#00FF88]" />
            <h2 className="font-heading text-lg font-semibold text-[#E8E8EC]">Edit Profile</h2>
          </div>

          {/* Section 1 — Personal Info */}
          <p className="text-[#00FF88] text-xs uppercase tracking-wider font-semibold mb-4">Personal Info</p>
          <div className="space-y-4">
            <div>
              <label className="text-[#8A8A9A] text-xs font-medium mb-1.5 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E85]" />
                <input
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="text-[#8A8A9A] text-xs font-medium mb-1.5 block">Bio</label>
              <textarea
                value={bio} onChange={e => setBio(e.target.value)} rows={3}
                className="w-full p-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {currentUser.role === "client" && (
              <div>
                <label className="text-[#8A8A9A] text-xs font-medium mb-1.5 block">Company</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E85]" />
                  <input
                    value={company} onChange={e => setCompany(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all"
                    placeholder="Company name"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2 — Professional (freelancer only) */}
          {isFreelancer && (
            <>
              <div className="h-px bg-[#1E1E2A] my-6" />
              <p className="text-[#00FF88] text-xs uppercase tracking-wider font-semibold mb-4">Professional</p>
              <div className="space-y-4">
                {/* Skills */}
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium mb-2 block">Skills</label>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {skills.map(s => (
                        <span key={s} className="inline-flex items-center gap-1 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20 rounded-full px-3 py-1 text-xs">
                          {s}
                          <button onClick={() => toggleSkill(s)} className="hover:text-white transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl">
                    {SKILL_TAXONOMY.filter(s => !skills.includes(s)).map(s => (
                      <button key={s} onClick={() => toggleSkill(s)}
                        className="bg-[#1E1E2A] text-[#8A8A9A] rounded-md px-2.5 py-1 text-xs hover:bg-[#00FF88]/10 hover:text-[#00FF88] transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hourly Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#8A8A9A] text-xs font-medium mb-1.5 block">Min Rate ($/hr)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E85]" />
                      <input type="number" value={hourlyRateMin} onChange={e => setHourlyRateMin(Number(e.target.value))}
                        className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#8A8A9A] text-xs font-medium mb-1.5 block">Max Rate ($/hr)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E85]" />
                      <input type="number" value={hourlyRateMax} onChange={e => setHourlyRateMax(Number(e.target.value))}
                        className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium mb-2 block">Availability</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: "available", label: "Available", dot: "bg-[#00FF88]" },
                      { value: "part-time", label: "Part-time", dot: "bg-yellow-500" },
                      { value: "unavailable", label: "Unavailable", dot: "bg-red-400" },
                    ] as const).map(opt => (
                      <button key={opt.value} onClick={() => setAvailability(opt.value)}
                        className={`p-3 rounded-xl border text-center text-sm transition-all ${
                          availability === opt.value
                            ? "border-[#00FF88] bg-[#00FF88]/5 text-[#E8E8EC]"
                            : "border-[#1E1E2A] bg-[#0A0A0F] text-[#8A8A9A] hover:border-[#8A8A9A]/30"
                        }`}>
                        <div className={`h-2 w-2 rounded-full ${opt.dot} mx-auto mb-1.5`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GitHub */}
                <div>
                  <label className="text-[#8A8A9A] text-xs font-medium mb-1.5 block">GitHub Username</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <GitBranch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6E6E85]" />
                      <input
                        value={githubUsername} onChange={e => setGithubUsername(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 focus:ring-2 focus:ring-[#00FF88]/30 outline-none transition-all"
                        placeholder="your-github-handle"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!githubUsername.trim()) return;
                        setVerifyingGithub(true);
                        const r = await verifyGithub(githubUsername.trim());
                        setVerifyingGithub(false);
                        r.ok ? toast.success(r.message) : toast.error(r.message);
                      }}
                      disabled={verifyingGithub || !githubUsername.trim()}
                      className="h-11 px-4 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl text-sm hover:bg-[#00CC6A] transition-all disabled:opacity-40 shrink-0"
                    >
                      {verifyingGithub ? "Verifying..." : currentUser?.githubVerified ? "Re-verify" : "Verify"}
                    </button>
                  </div>
                  {currentUser?.githubVerified && (
                    <div className="flex items-center gap-3 mt-2 p-3 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl">
                      <CheckCircle2 className="h-4 w-4 text-[#00FF88]" />
                      <span className="text-[#00FF88] text-xs font-medium">Verified</span>
                      <span className="text-[#8A8A9A] text-xs">
                        {currentUser.githubData?.publicRepos ?? 0} repos · {currentUser.githubData?.followers ?? 0} followers
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Section 3 — Account */}
          <div className="h-px bg-[#1E1E2A] my-6" />
          <p className="text-[#00FF88] text-xs uppercase tracking-wider font-semibold mb-4">Account</p>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Delete Account</p>
                <p className="text-xs text-[#8A8A9A] mt-0.5">This action is irreversible. All your data will be permanently removed.</p>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="mt-3 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                    Delete Account
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-3">
                    <button className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors">
                      Confirm Delete
                    </button>
                    <button onClick={() => setShowDeleteConfirm(false)}
                      className="text-[#8A8A9A] text-xs hover:text-[#E8E8EC] transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all ${
              hasChanges && !saving
                ? "bg-[#00FF88] text-[#0A0A0F] hover:bg-[#00CC6A] glow-green cursor-pointer"
                : "bg-[#1E1E2A] text-[#6E6E85] cursor-not-allowed"
            }`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : saved ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved!</>
            ) : (
              <><Save className="h-4 w-4" /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
