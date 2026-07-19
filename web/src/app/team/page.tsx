"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import {
 Users, Plus, Mail, CheckCircle2, ArrowLeft, Briefcase, DollarSign, Activity, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";

type TeamData = {
 id: string; name: string; ownerId: string;
 members: { id: string; fullName: string; avatarInitial: string; avatarUrl?: string; geekScore?: number; role: string }[];
 invites: { email: string; status: string; invitedAt: string }[];
 analytics: { totalJobs: number; activeJobs: number; totalSpend: number };
 status?: "active" | "over_limit" | "frozen";
 seatDeadline?: string;
 frozenReason?: string;
};

type PendingInvite = { teamId: string; teamName: string };

export default function TeamPage() {
 const { currentUser, mounted, getValidToken } = useApp();
 const router = useRouter();
 const [team, setTeam] = useState<TeamData | null>(null);
 const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
 const [loading, setLoading] = useState(true);
 const [teamName, setTeamName] = useState("");
 const [inviteEmail, setInviteEmail] = useState("");
 const [creating, setCreating] = useState(false);
 const [accepting, setAccepting] = useState(false);
 const [removingId, setRemovingId] = useState<string | null>(null);

 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 }, [mounted, currentUser, router]);

 const loadTeam = useCallback(async () => {
 try {
 const token = await getValidToken();
 const res = await fetch("/api/teams", { headers: { Authorization: `Bearer ${token}` } });
 if (res.ok) {
 const data = await res.json();
 if (data && data.id) {
 setTeam(data);
 setPendingInvite(null);
 } else if (data && data.pendingInvite) {
 setTeam(null);
 setPendingInvite(data.pendingInvite);
 } else {
 setTeam(null);
 setPendingInvite(null);
 }
 }
 } catch (err) { console.error("[loadTeam]", err); } finally { setLoading(false); }
 }, [getValidToken]);

 const acceptInvite = async () => {
 if (!pendingInvite) return;
 setAccepting(true);
 const token = await getValidToken();
 const res = await fetch("/api/teams", {
 method: "PATCH",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
 body: JSON.stringify({ action: "accept", teamId: pendingInvite.teamId }),
 });
 const data = await res.json();
 setAccepting(false);
 if (data.error) { toast.error(data.error); return; }
 toast.success("Joined team!");
 await loadTeam();
 };

 const removeMember = async (memberId: string) => {
 setRemovingId(memberId);
 const token = await getValidToken();
 const res = await fetch("/api/teams", {
 method: "PATCH",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
 body: JSON.stringify({ action: "remove_member", memberId }),
 });
 const data = await res.json();
 setRemovingId(null);
 if (data.error) { toast.error(data.error); return; }
 toast.success("Member removed");
 await loadTeam();
 };

 useEffect(() => { if (mounted && currentUser) loadTeam(); }, [mounted, currentUser, loadTeam]);

 const createTeam = async () => {
 if (!teamName.trim()) return;
 setCreating(true);
 const token = await getValidToken();
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
 const token = await getValidToken();
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
 <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center">
 <div className="bg-[#fbfaf7] h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
 </div>
 );

 // No team yet — either a pending invite waiting for a response, or a
 // blank slate to create one.
 if (!team) {
 return (
 <div className="min-h-screen bg-[#fbfaf7] grid-bg">
 <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
 <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#6f6a7d] text-sm hover:text-[#4b3f8f] transition-colors mb-6">
 <ArrowLeft className="h-4 w-4" /> Back to Profile
 </Link>
 {pendingInvite ? (
 <div className="glass-panel p-8 text-center animate-fade-in-up">
 <Mail className="h-12 w-12 text-[#6f6a7d] mx-auto mb-4" />
 <h1 className="font-heading text-2xl font-bold text-[#3d3a45] mb-2">Team invite</h1>
 <p className="text-[#6f6a7d] text-sm mb-6">
 You&apos;ve been invited to join <span className="text-[#3d3a45] font-medium">{pendingInvite.teamName}</span>.
 </p>
 <button onClick={acceptInvite} disabled={accepting}
 className="btn-primary w-full py-3 rounded-2xl text-sm disabled:opacity-40">
 {accepting ? "Joining..." : "Accept invite"}
 </button>
 </div>
 ) : (
 <div className="glass-panel p-8 text-center animate-fade-in-up">
 <Users className="h-12 w-12 text-[#6f6a7d] mx-auto mb-4" />
 <h1 className="font-heading text-2xl font-bold text-[#3d3a45] mb-2">Create a Team</h1>
 <p className="text-[#6f6a7d] text-sm mb-6">Group your organization under a shared billing and job management umbrella.</p>
 <input
 value={teamName} onChange={e => setTeamName(e.target.value)}
 placeholder="Team name"
 className="glass-input rounded-2xl mb-4"
 />
 <button onClick={createTeam} disabled={creating || !teamName.trim()}
 className="btn-primary w-full py-3 rounded-2xl text-sm disabled:opacity-40">
 {creating ? "Creating..." : "Create Team"}
 </button>
 </div>
 )}
 </div>
 </div>
 );
 }

 const isOwner = team.ownerId === (currentUser?.id ?? currentUser?._id);

 return (
 <div className="min-h-screen bg-[#fbfaf7] grid-bg">
 <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
 <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#6f6a7d] text-sm hover:text-[#4b3f8f] transition-colors mb-6">
 <ArrowLeft className="h-4 w-4" /> Back to Profile
 </Link>

 <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#3d3a45] mb-1 animate-fade-in-up">{team.name}</h1>
 <p className="text-[#6f6a7d] text-sm mb-6">{isOwner ? "You're the team owner" : "Team member"}</p>

 {team.status === "over_limit" && (
 <div className="flex items-start gap-3 rounded-2xl border border-[rgba(150,84,63,0.3)] bg-[rgba(150,84,63,0.06)] px-4 py-3 mb-6">
 <AlertTriangle className="h-4 w-4 text-[#96543f] mt-0.5 shrink-0" />
 <div className="text-sm">
 <p className="text-[#96543f] font-medium">Your team is over your plan&apos;s seat limit</p>
 <p className="text-[#6f6a7d] text-xs mt-0.5">
 {isOwner
 ? `Remove members to fit your plan${team.seatDeadline ? ` by ${new Date(team.seatDeadline).toLocaleDateString()}` : ""}, or the most recently added members will be removed automatically.`
 : "The team owner needs to reduce team size to match their current plan."}
 </p>
 </div>
 </div>
 )}
 {team.status === "frozen" && (
 <div className="flex items-start gap-3 rounded-2xl border border-[rgba(150,84,63,0.3)] bg-[rgba(150,84,63,0.06)] px-4 py-3 mb-6">
 <AlertTriangle className="h-4 w-4 text-[#96543f] mt-0.5 shrink-0" />
 <div className="text-sm">
 <p className="text-[#96543f] font-medium">This team is frozen</p>
 <p className="text-[#6f6a7d] text-xs mt-0.5">The owner&apos;s plan no longer includes team seats. Upgrade to Plus or Premium to reactivate.</p>
 </div>
 </div>
 )}

 {/* Analytics */}
 <div className="grid grid-cols-3 gap-4 mb-6">
 {[
 { icon: Briefcase, label: "Total Jobs", value: String(team.analytics.totalJobs) },
 { icon: Activity, label: "Active Jobs", value: String(team.analytics.activeJobs) },
 { icon: DollarSign, label: "Total Spend", value: formatMoney(team.analytics.totalSpend) },
 ].map((s, i) => (
 <div key={s.label} className="finance-card p-4 text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
 <s.icon className="h-5 w-5 text-[#6f6a7d] mx-auto mb-2" />
 <p className="font-heading text-xl font-bold text-[#3d3a45] terminal-amount">{s.value}</p>
 <p className="text-[11px] text-[#6f6a7d]">{s.label}</p>
 </div>
 ))}
 </div>

 {/* Members */}
 <div className="glass-panel p-6 mb-6">
 <h2 className="font-heading text-lg font-semibold text-[#3d3a45] mb-4 flex items-center gap-2">
 <Users className="h-4 w-4 text-[#4b3f8f]" /> Members ({team.members.length})
 </h2>
 <div className="space-y-3">
 {team.members.map(m => (
 <div key={m.id} className="flex items-center gap-3 bg-[#ffffff] border border-[rgba(75,63,143,0.22)] rounded-2xl p-3 tx-row">
 <CloudinaryAvatar
 avatarUrl={m.avatarUrl}
 avatarInitial={m.avatarInitial}
 size="md"
 />
 <div className="flex-1">
 <p className="text-[#3d3a45] text-sm font-medium">{m.fullName}</p>
 {typeof m.geekScore === "number" && (
 <p className="text-[#6f6a7d] text-xs">GeekScore {m.geekScore}</p>
 )}
 </div>
 <span className={`text-xs px-2 py-0.5 rounded-full ${m.id === team.ownerId ? "badge-active" : "text-[#6f6a7d]"}`}>
 {m.id === team.ownerId ? "Owner" : "Member"}
 </span>
 {isOwner && m.id !== team.ownerId && (
 <button
 onClick={() => removeMember(m.id)}
 disabled={removingId === m.id}
 className="text-xs text-[#96543f] hover:underline disabled:opacity-40"
 >
 {removingId === m.id ? "Removing..." : "Remove"}
 </button>
 )}
 </div>
 ))}
 </div>
 </div>

 {/* Invite */}
 {isOwner && (
 <div className="glass-panel p-6">
 <h2 className="font-heading text-lg font-semibold text-[#3d3a45] mb-4 flex items-center gap-2">
 <Mail className="h-4 w-4 text-[#4b3f8f]" /> Invite Members
 </h2>
 <div className="flex gap-2">
 <input
 value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
 placeholder="colleague@company.com"
 className="glass-input flex-1 rounded-2xl"
 />
 <button onClick={inviteMember}
 className="btn-primary h-11 px-4 sm:px-6 rounded-2xl text-sm flex items-center gap-1">
 <Plus className="h-4 w-4" /> Invite
 </button>
 </div>
 {team.invites.length > 0 && (
 <div className="mt-4 space-y-2">
 {team.invites.map((inv, i) => (
 <div key={i} className="flex items-center justify-between glass-panel-sm px-3 py-2 rounded-2xl">
 <span className="text-[#6f6a7d] text-sm">{inv.email}</span>
 <span className={`text-xs ${inv.status === "accepted" ? "text-[#4b3f8f]" : "text-[#4b3f8f]"}`}>
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
