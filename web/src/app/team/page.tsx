"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users, Plus, Mail, CheckCircle2, ArrowLeft, Briefcase, DollarSign, Activity,
} from "lucide-react";
import Link from "next/link";

type TeamData = {
  id: string; name: string; ownerId: string;
  members: { id: string; fullName: string; avatarInitial: string; email: string; role: string }[];
  invites: { email: string; status: string; invitedAt: string }[];
  analytics: { totalJobs: number; activeJobs: number; totalSpend: number };
};

export default function TeamPage() {
  const { currentUser, mounted } = useApp();
  const router = useRouter();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const loadTeam = useCallback(async () => {
    try {
      const token = localStorage.getItem("gb_access_token");
      const res = await fetch("/api/teams", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTeam(data);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (mounted && currentUser) loadTeam(); }, [mounted, currentUser, loadTeam]);

  const createTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    const token = localStorage.getItem("gb_access_token");
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: teamName }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.error) { toast.error(data.error); return; }
    toast.success("Team created!");
    await loadTeam();
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    const token = localStorage.getItem("gb_access_token");
    const res = await fetch("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "invite", email: inviteEmail }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    toast.success("Invite sent!");
    setInviteEmail("");
    await loadTeam();
  };

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  // No team yet — create one
  if (!team) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <div className="max-w-lg mx-auto px-6 py-12">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#8A8A9A] text-sm hover:text-[#00FF88] transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Link>
          <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-8 text-center">
            <Users className="h-12 w-12 text-[#6E6E85] mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-[#E8E8EC] mb-2">Create a Team</h1>
            <p className="text-[#8A8A9A] text-sm mb-6">Group your organization under a shared billing and job management umbrella.</p>
            <input
              value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="Team name"
              className="w-full h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 outline-none transition-all mb-4"
            />
            <button onClick={createTeam} disabled={creating || !teamName.trim()}
              className="w-full py-3 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl text-sm hover:bg-[#00CC6A] transition-all disabled:opacity-40">
              {creating ? "Creating..." : "Create Team"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = team.ownerId === (currentUser?.id ?? currentUser?._id);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#8A8A9A] text-sm hover:text-[#00FF88] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#E8E8EC] mb-1">{team.name}</h1>
        <p className="text-[#8A8A9A] text-sm mb-6">{isOwner ? "You're the team owner" : "Team member"}</p>

        {/* Analytics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: Briefcase, label: "Total Jobs", value: String(team.analytics.totalJobs) },
            { icon: Activity, label: "Active Jobs", value: String(team.analytics.activeJobs) },
            { icon: DollarSign, label: "Total Spend", value: formatMoney(team.analytics.totalSpend) },
          ].map(s => (
            <div key={s.label} className="bg-[#12121A] border border-[#1E1E2A] rounded-xl p-4 text-center">
              <s.icon className="h-5 w-5 text-[#6E6E85] mx-auto mb-2" />
              <p className="font-heading text-xl font-bold text-[#E8E8EC]">{s.value}</p>
              <p className="text-[11px] text-[#6E6E85]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Members */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#00FF88]" /> Members ({team.members.length})
          </h2>
          <div className="space-y-3">
            {team.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-3">
                <div className="w-9 h-9 bg-[#00FF88]/10 text-[#00FF88] text-xs font-semibold rounded-full flex items-center justify-center">
                  {m.avatarInitial}
                </div>
                <div className="flex-1">
                  <p className="text-[#E8E8EC] text-sm font-medium">{m.fullName}</p>
                  <p className="text-[#6E6E85] text-xs">{m.email}</p>
                </div>
                <span className="text-[#8A8A9A] text-xs capitalize">{m.id === team.ownerId ? "Owner" : "Member"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite */}
        {isOwner && (
          <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6">
            <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#00FF88]" /> Invite Members
            </h2>
            <div className="flex gap-2">
              <input
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 outline-none transition-all"
              />
              <button onClick={inviteMember}
                className="h-11 px-6 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl text-sm hover:bg-[#00CC6A] transition-all flex items-center gap-1">
                <Plus className="h-4 w-4" /> Invite
              </button>
            </div>
            {team.invites.length > 0 && (
              <div className="mt-4 space-y-2">
                {team.invites.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg px-3 py-2">
                    <span className="text-[#8A8A9A] text-sm">{inv.email}</span>
                    <span className={`text-xs ${inv.status === "accepted" ? "text-[#00FF88]" : "text-yellow-500"}`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
