"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatMoney, timeAgo, getGeekTier, getCurrentPrice } from "@/lib/utils";
import { toast } from "sonner";
import { Shield, Users, Briefcase, DollarSign, AlertTriangle, CheckCircle, Scale, TrendingUp, TrendingDown, Activity, BarChart3, Zap, Eye, Clock, ArrowRight, Database, UserCheck, UserX } from "lucide-react";

export default function AdminPage() {
  const { jobs, users, disputes, transactions, bids, now, mounted, currentUser, releaseEscrow, seedDatabase } = useApp();
  const [seeding, setSeeding] = useState(false);

  if (!mounted) return null;
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md"><CardContent className="p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-neutral-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Admin Access Required</h2>
          <p className="text-sm text-slate-500">Switch to Admin role from the top menu to access this dashboard.</p>
        </CardContent></Card>
      </div>
    );
  }

  const totalUsers = users.length;
  const freelancers = users.filter(u => u.role === "freelancer");
  const clients = users.filter(u => u.role === "client");
  const openJobs = jobs.filter(j => j.status === "open");
  const acceptedJobs = jobs.filter(j => j.status === "accepted");
  const activeDisputes = disputes.filter(d => d.status !== "resolved");
  const gmv = transactions.reduce((s, t) => s + t.grossAmount, 0);
  const fees = transactions.reduce((s, t) => s + t.platformFee, 0);
  const released = transactions.filter(t => t.escrowStatus === "released");
  const held = transactions.filter(t => t.escrowStatus === "held");
  const avgJobValue = openJobs.length > 0 ? openJobs.reduce((s, j) => s + getCurrentPrice(j, now), 0) / openJobs.length : 0;

  const handleSeed = async () => {
    setSeeding(true);
    const r = await seedDatabase();
    setSeeding(false);
    r.ok ? toast.success("🌱 Database seeded!", { description: r.message }) : toast.error("Seed failed", { description: r.message });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 shadow-sm">
            <Shield className="h-6 w-6 text-neutral-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Platform health, moderation, and analytics</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleSeed} disabled={seeding} className="self-start gap-2">
          <Database className="h-4 w-4" /> {seeding ? "Seeding..." : "Seed Database"}
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign className="h-5 w-5" />} label="GMV" value={formatMoney(gmv)} color="neutral" trend="+12.5%" />
        <KpiCard icon={<Zap className="h-5 w-5" />} label="Platform Revenue" value={formatMoney(fees)} color="blue" trend="+8.3%" />
        <KpiCard icon={<Users className="h-5 w-5" />} label="Total Users" value={String(totalUsers)} color="violet" trend="+24" />
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Active Disputes" value={String(activeDisputes.length)} color="red" trend={activeDisputes.length > 0 ? "Action needed" : "All clear ✅"} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-100/80">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Jobs</TabsTrigger>
          <TabsTrigger value="disputes" className="gap-1.5"><Scale className="h-3.5 w-3.5" /> Disputes ({activeDisputes.length})</TabsTrigger>
          <TabsTrigger value="escrow" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Escrow</TabsTrigger>
        </TabsList>

        {/* ===== Overview Tab ===== */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-neutral-100 to-white border-neutral-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Marketplace Health</p>
                  <Activity className="h-4 w-4 text-neutral-600" />
                </div>
                <div className="space-y-3">
                  <MetricRow label="Open Jobs" value={String(openJobs.length)} />
                  <MetricRow label="Accepted Jobs" value={String(acceptedJobs.length)} />
                  <MetricRow label="Avg Job Value" value={formatMoney(avgJobValue)} />
                  <MetricRow label="Total Bids" value={String(bids.length)} />
                  <MetricRow label="Bid/Job Ratio" value={openJobs.length > 0 ? (bids.length / openJobs.length).toFixed(1) : "0"} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-neutral-100 to-white border-neutral-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">User Breakdown</p>
                  <Users className="h-4 w-4 text-neutral-600" />
                </div>
                <div className="space-y-3">
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Freelancers</span><span className="font-bold text-slate-900">{freelancers.length}</span></div>
                    <Progress value={totalUsers > 0 ? (freelancers.length / totalUsers) * 100 : 0} className="h-2" /></div>
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Clients</span><span className="font-bold text-slate-900">{clients.length}</span></div>
                    <Progress value={totalUsers > 0 ? (clients.length / totalUsers) * 100 : 0} className="h-2" /></div>
                  <MetricRow label="Verified" value={`${users.filter(u => u.isVerified).length}/${totalUsers}`} />
                  <MetricRow label="Avg Geek Score" value={String(Math.round(freelancers.reduce((s, u) => s + u.geekScore, 0) / (freelancers.length || 1)))} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">Revenue</p>
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                </div>
                <div className="space-y-3">
                  <MetricRow label="Gross Volume" value={formatMoney(gmv)} />
                  <MetricRow label="Platform Fees (10%)" value={formatMoney(fees)} />
                  <MetricRow label="Released" value={formatMoney(released.reduce((s, t) => s + t.netAmount, 0))} />
                  <MetricRow label="In Escrow" value={formatMoney(held.reduce((s, t) => s + t.netAmount, 0))} />
                  <MetricRow label="Transactions" value={String(transactions.length)} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== Users Tab ===== */}
        <TabsContent value="users" className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"><UserCheck className="h-5 w-5 text-neutral-600" /></div><div><p className="text-2xl font-black text-neutral-600">{freelancers.length}</p><p className="text-xs text-slate-400">Freelancers</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"><Briefcase className="h-5 w-5 text-neutral-600" /></div><div><p className="text-2xl font-black text-neutral-600">{clients.length}</p><p className="text-xs text-slate-400">Clients</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100"><Shield className="h-5 w-5 text-neutral-500" /></div><div><p className="text-2xl font-black text-neutral-500">{users.filter(u => u.role === "admin").length}</p><p className="text-xs text-slate-400">Admins</p></div></CardContent></Card>
          </div>
          {users.map(u => {
            const tier = getGeekTier(u.geekScore);
            return (
              <Card key={u.id}><CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10"><AvatarFallback className="bg-slate-100 font-bold text-slate-600">{u.avatarInitial}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{u.fullName}</p>
                    {u.isVerified && <Badge variant="outline" className="text-[9px] text-neutral-600 border-neutral-300">✓</Badge>}
                    <Badge variant="secondary" className="text-[9px] capitalize">{u.role}</Badge>
                    {u.role === "freelancer" && <Badge variant="outline" className="text-[9px]" style={{ color: tier.color, borderColor: tier.color }}>{tier.label} ({u.geekScore})</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.email} {u.company ? `• ${u.company}` : ""}</p>
                </div>
                <div className="flex gap-1.5">
                  {u.skills.slice(0, 3).map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
                  {u.skills.length > 3 && <Badge variant="secondary" className="text-[9px]">+{u.skills.length - 3}</Badge>}
                </div>
              </CardContent></Card>
            );
          })}
        </TabsContent>

        {/* ===== Jobs Tab ===== */}
        <TabsContent value="jobs" className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="border-neutral-300 bg-neutral-100/50"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-neutral-600">{openJobs.length}</p><p className="text-xs text-slate-500 mt-1">Open</p></CardContent></Card>
            <Card className="border-neutral-300 bg-neutral-100/50"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-neutral-600">{acceptedJobs.length}</p><p className="text-xs text-slate-500 mt-1">Accepted</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-3xl font-black text-slate-900">{formatMoney(avgJobValue)}</p><p className="text-xs text-slate-500 mt-1">Avg Current Price</p></CardContent></Card>
          </div>
          {jobs.map(job => (
            <Card key={job.id ?? job._id}><CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{job.title}</p>
                  <Badge variant={job.status === "open" ? "default" : "secondary"} className={`text-[9px] ${job.status === "open" ? "bg-neutral-100 text-neutral-600 border-neutral-300" : ""}`}>{job.status}</Badge>
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>{formatMoney(getCurrentPrice(job, now))} current</span>
                  <span>{formatMoney(job.startingPrice)} start → {formatMoney(job.minimumPrice)} floor</span>
                  <span>${job.decayRatePerHour}/hr decay</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">{job.skillsRequired.slice(0, 2).map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}</div>
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* ===== Disputes Tab ===== */}
        <TabsContent value="disputes" className="space-y-3">
          {disputes.length === 0 && (
            <Card><CardContent className="p-12 text-center"><CheckCircle className="mx-auto h-12 w-12 text-neutral-600 mb-3" /><h3 className="text-lg font-semibold text-slate-900">All Clear!</h3><p className="text-sm text-slate-400 mt-1">No disputes to review.</p></CardContent></Card>
          )}
          {disputes.map(d => {
            const tx = transactions.find(t => t.id === d.transactionId);
            const raiser = users.find(u => u.id === d.raisedBy);
            const jobTitle = tx ? jobs.find(j => j.id === tx.jobId || j._id === tx.jobId)?.title : "—";
            return (
              <Card key={d.id} className={d.status !== "resolved" ? "border-l-4 border-l-red-400" : "border-l-4 border-l-neutral-400"}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{jobTitle}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {timeAgo(d.createdAt)} • Raised by <span className="font-medium text-slate-600">{raiser?.fullName ?? d.raisedBy}</span>
                      </p>
                    </div>
                    <Badge variant={d.status === "open" ? "destructive" : d.status === "in_review" ? "secondary" : "default"} className="text-[10px] font-semibold">{d.status.replace("_", " ").toUpperCase()}</Badge>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Dispute Reason</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{d.reason}</p>
                  </div>
                  {tx && (
                    <div className="grid grid-cols-3 gap-2 text-center"><div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Value</p><p className="text-sm font-bold">{formatMoney(tx.grossAmount)}</p></div><div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Escrow</p><p className="text-sm font-bold">{tx.escrowStatus}</p></div><div className="bg-slate-50 rounded-lg p-2"><p className="text-[10px] text-slate-400">Net</p><p className="text-sm font-bold">{formatMoney(tx.netAmount)}</p></div></div>
                  )}
                  {d.status !== "resolved" && (
                    <div className="flex gap-2"><Button variant="outline" size="sm" className="flex-1">🔍 Investigate</Button><Button size="sm" className="flex-1 bg-neutral-100 hover:bg-neutral-100 text-white"><CheckCircle className="mr-1.5 h-4 w-4" /> Resolve</Button></div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ===== Escrow Tab ===== */}
        <TabsContent value="escrow" className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="border-neutral-300 bg-neutral-100/50"><CardContent className="p-4 text-center"><p className="text-2xl font-black text-neutral-500">{formatMoney(held.reduce((s, t) => s + t.grossAmount, 0))}</p><p className="text-xs text-slate-500 mt-1">Held in Escrow</p></CardContent></Card>
            <Card className="border-neutral-300 bg-neutral-100/50"><CardContent className="p-4 text-center"><p className="text-2xl font-black text-neutral-600">{formatMoney(released.reduce((s, t) => s + t.grossAmount, 0))}</p><p className="text-xs text-slate-500 mt-1">Released</p></CardContent></Card>
            <Card className="border-red-200 bg-red-50/50"><CardContent className="p-4 text-center"><p className="text-2xl font-black text-red-500">{transactions.filter(t => t.escrowStatus === "disputed").length}</p><p className="text-xs text-slate-500 mt-1">Disputed</p></CardContent></Card>
          </div>
          {transactions.map(t => {
            const jobTitle = jobs.find(j => j.id === t.jobId || j._id === t.jobId)?.title ?? t.jobId;
            return (
              <Card key={t.id ?? t._id}><CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{jobTitle}</p>
                    <p className="text-xs text-slate-400">{timeAgo(t.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.escrowStatus === "released" ? "default" : t.escrowStatus === "held" ? "secondary" : "destructive"}
                      className={`text-[10px] font-semibold ${t.escrowStatus === "released" ? "bg-neutral-100 text-neutral-600 border-neutral-300" : ""}`}>
                      {t.escrowStatus.toUpperCase()}
                    </Badge>
                    {t.escrowStatus === "held" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={async () => { const r = await releaseEscrow(t.id ?? t._id ?? ""); r.ok ? toast.success("💰 Released!") : toast.error(r.message); }}>
                        Release
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-[10px] text-slate-400">Gross</p><p className="text-sm font-bold">{formatMoney(t.grossAmount)}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-[10px] text-slate-400">Fee (10%)</p><p className="text-sm font-bold text-red-500">-{formatMoney(t.platformFee)}</p></div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-[10px] text-slate-400">Net</p><p className="text-sm font-bold text-neutral-600">{formatMoney(t.netAmount)}</p></div>
                </div>
              </CardContent></Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ icon, label, value, color, trend }: { icon: React.ReactNode; label: string; value: string; color: string; trend: string }) {
  const colors: Record<string, string> = { emerald: "bg-neutral-100 text-neutral-600", blue: "bg-neutral-100 text-neutral-600", violet: "bg-neutral-100 text-neutral-600", red: "bg-red-100 text-red-600" };
  return (
    <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]} mb-3`}>{icon}</div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      <p className="text-[10px] text-neutral-600 font-semibold mt-1">{trend}</p>
    </CardContent></Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between items-center"><span className="text-xs text-slate-500">{label}</span><span className="text-sm font-bold text-slate-900">{value}</span></div>;
}
