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
    <div className="min-h-screen bg-[#EDE8DC] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#C8923D]/40 border-t-[#C8923D] rounded-full animate-spin" />
    </div>
  );

  // No team yet — create one
  if (!team) {
    return (
      <div className="min-h-screen bg-[#EDE8DC] grid-bg">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#253444] text-sm hover:text-[#C8923D] transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Profile
          </Link>
          <div className="glass-panel p-8 text-center animate-fade-in-up">
            <Users className="h-12 w-12 text-[#4A5568] mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-[#0F1924] mb-2">Create a Team</h1>
            <p className="text-[#253444] text-sm mb-6">Group your organization under a shared billing and job management umbrella.</p>
            <input
              value={teamName} onChange={e => setTeamName(e.target.value)}
              placeholder="Team name"
              className="glass-input rounded-xl mb-4"
            />
            <button onClick={createTeam} disabled={creating || !teamName.trim()}
              className="btn-primary w-full py-3 rounded-xl text-sm disabled:opacity-40">
              {creating ? "Creating..." : "Create Team"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = team.ownerId === (currentUser?.id ?? currentUser?._id);

  return (
    <div className="min-h-screen bg-[#EDE8DC] grid-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#253444] text-sm hover:text-[#C8923D] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F1924] mb-1 animate-fade-in-up">{team.name}</h1>
        <p className="text-[#253444] text-sm mb-6">{isOwner ? "You're the team owner" : "Team member"}</p>

        {/* Analytics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: Briefcase, label: "Total Jobs", value: String(team.analytics.totalJobs) },
            { icon: Activity, label: "Active Jobs", value: String(team.analytics.activeJobs) },
            { icon: DollarSign, label: "Total Spend", value: formatMoney(team.analytics.totalSpend) },
          ].map((s, i) => (
            <div key={s.label} className="finance-card p-4 text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <s.icon className="h-5 w-5 text-[#4A5568] mx-auto mb-2" />
              <p className="font-heading text-xl font-bold text-[#0F1924] terminal-amount">{s.value}</p>
              <p className="text-[11px] text-[#4A5568]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Members */}
        <div className="glass-panel p-6 mb-6">
          <h2 className="font-heading text-lg font-semibold text-[#0F1924] mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-[#C8923D]" /> Members ({team.members.length})
          </h2>
          <div className="space-y-3">
            {team.members.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-[#EDE8DC] border border-[#BEB5A5] rounded-xl p-3 tx-row">
                <div className="w-9 h-9 bg-[rgba(200,146,61,0.10)] text-[#C8923D] text-xs font-semibold rounded-full flex items-center justify-center border border-[#C8923D]/30">
                  {m.avatarInitial}
                </div>
                <div className="flex-1">
                  <p className="text-[#0F1924] text-sm font-medium">{m.fullName}</p>
                  <p className="text-[#4A5568] text-xs">{m.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.id === team.ownerId ? "badge-active" : "text-[#253444]"}`}>
                  {m.id === team.ownerId ? "Owner" : "Member"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite */}
        {isOwner && (
          <div className="glass-panel p-6">
            <h2 className="font-heading text-lg font-semibold text-[#0F1924] mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#C8923D]" /> Invite Members
            </h2>
            <div className="flex gap-2">
              <input
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="glass-input flex-1 rounded-xl"
              />
              <button onClick={inviteMember}
                className="btn-primary h-11 px-4 sm:px-6 rounded-xl text-sm flex items-center gap-1">
                <Plus className="h-4 w-4" /> Invite
              </button>
            </div>
            {team.invites.length > 0 && (
              <div className="mt-4 space-y-2">
                {team.invites.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between glass-panel-sm px-3 py-2 rounded-lg">
                    <span className="text-[#253444] text-sm">{inv.email}</span>
                    <span className={`text-xs ${inv.status === "accepted" ? "text-[#C8923D]" : "text-[#7A5218]"}`}>
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
