"use client";
import { useMemo, useState, useCallback } from "react";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo, getGeekTier, getCurrentPrice } from "@/lib/utils";
import { toast } from "sonner";
import {
  Shield, Users, Briefcase, DollarSign, AlertTriangle, CheckCircle,
  TrendingDown, Clock, Database, Zap, Eye, Loader2, X,
  MessageSquare, ChevronDown,
} from "lucide-react";

export default function AdminPage() {
  const { jobs, users, disputes, transactions, bids, now, mounted, currentUser, releaseEscrow, seedDatabase } = useApp();
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<"disputes" | "users" | "jobs" | "transactions">("disputes");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [txFilter, setTxFilter] = useState("all");

  if (!mounted) return null;
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#EDE8DC] grid-bg">
        <div className="glass-panel p-8 text-center max-w-md animate-scale-in">
          <Shield className="mx-auto h-12 w-12 text-[#4A5568] mb-3" />
          <h2 className="font-heading text-xl font-bold text-[#0F1924] mb-2">Admin Access Required</h2>
          <p className="text-sm text-[#253444]">Switch to Admin role from the top menu to access this dashboard.</p>
        </div>
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

  const filteredUsers = userRoleFilter === "all" ? users : users.filter(u => u.role === userRoleFilter);
  const filteredJobs = jobStatusFilter === "all" ? jobs : jobs.filter(j => j.status === jobStatusFilter);
  const filteredTx = txFilter === "all" ? transactions : transactions.filter(t => t.escrowStatus === txFilter);

  const handleSeed = async () => {
    setSeeding(true);
    const r = await seedDatabase();
    setSeeding(false);
    r.ok ? toast.success("Database seeded!", { description: r.message }) : toast.error("Seed failed", { description: r.message });
  };

  const handleRelease = async (txId: string) => {
    const r = await releaseEscrow(txId);
    r.ok ? toast.success("Escrow released!") : toast.error(r.message);
  };

  const TABS = [
    { key: "disputes" as const, label: "Disputes", count: activeDisputes.length },
    { key: "users" as const, label: "Users", count: totalUsers },
    { key: "jobs" as const, label: "Jobs", count: jobs.length },
    { key: "transactions" as const, label: "Transactions", count: transactions.length },
  ];

  return (
    <div className="min-h-screen bg-[#EDE8DC] grid-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="admin-header rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[rgba(200,146,61,0.10)] flex items-center justify-center">
              <Shield className="h-6 w-6 text-[#C8923D]" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F1924]">Admin Dashboard</h1>
              <p className="text-sm text-[#253444]">Platform overview and dispute management</p>
            </div>
          </div>
          <button onClick={handleSeed} disabled={seeding}
            className="btn-ghost flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium self-start disabled:opacity-50">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {seeding ? "Seeding..." : "Seed Database"}
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Users", value: String(totalUsers), color: "text-[#0F1924]", iconBg: "bg-[#D8D0C0]", delay: 0 },
            { icon: Briefcase, label: "Open Jobs", value: String(openJobs.length), color: "text-[#C8923D]", iconBg: "bg-[rgba(200,146,61,0.10)]", delay: 100 },
            { icon: AlertTriangle, label: "Active Disputes", value: String(activeDisputes.length), color: activeDisputes.length > 0 ? "text-[#B02020]" : "text-[#0F1924]", iconBg: activeDisputes.length > 0 ? "bg-[rgba(176,32,32,0.08)]" : "bg-[#D8D0C0]", delay: 200 },
            { icon: DollarSign, label: "Revenue (Fees)", value: formatMoney(fees), color: "text-[#C8923D]", iconBg: "bg-[rgba(200,146,61,0.10)]", delay: 300 },
          ].map(s => (
            <div key={s.label} className="glass-panel-sm rounded-2xl p-5 stat-counter" style={{ animationDelay: `${s.delay}ms` }}>
              <div className={`h-10 w-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#4A5568] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Tab Bar ── */}
        <div className="inline-flex overflow-x-auto scrollbar-hide glass-panel-sm rounded-xl p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-[#7A5218] text-white border border-transparent"
                  : "text-[#253444] hover:text-[#0F1924]"
              }`}>
              {t.label}
              <span className={`text-[11px] font-bold rounded-full px-1.5 py-0.5 ${
                activeTab === t.key ? "bg-[#C8923D]/20 text-[#C8923D]" : "bg-[#D8D0C0] text-[#4A5568]"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── DISPUTES TAB ── */}
        {activeTab === "disputes" && (
          <div className="space-y-3">
            {disputes.length === 0 ? (
              <div className="glass-panel p-12 text-center animate-fade-in-up">
                <CheckCircle className="mx-auto h-12 w-12 text-[#C8923D] mb-3" />
                <h3 className="font-heading text-lg font-semibold text-[#0F1924]">All Clear!</h3>
                <p className="text-sm text-[#253444] mt-1">No disputes to review.</p>
              </div>
            ) : (
              disputes.map(d => {
                const tx = transactions.find(t => t.id === d.transactionId);
                const raiser = users.find(u => u.id === d.raisedBy);
                const jobTitle = tx ? jobs.find(j => j.id === tx.jobId || j._id === tx.jobId)?.title : "—";
                const isOpen = d.status !== "resolved";
                const severityClass = tx
                  ? tx.grossAmount > 500 ? "dispute-high" : tx.grossAmount > 100 ? "dispute-medium" : "dispute-low"
                  : "dispute-medium";
                return (
                  <div key={d.id} className={`glass-card space-y-3 ${severityClass} animate-fade-in-up`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-[#0F1924]">
                          Dispute #{d.id.slice(-6)} — {jobTitle}
                        </h3>
                        <p className="text-xs text-[#4A5568] flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" /> {timeAgo(d.createdAt)} · Raised by{" "}
                          <span className="text-[#253444] font-medium">{raiser?.fullName ?? d.raisedBy}</span>
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        d.status === "open" ? "badge-disputed" :
                        d.status === "in_review" ? "badge-pending" :
                        "badge-active"
                      }`}>
                        {d.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                      <p className="text-[11px] font-bold text-[#B02020] uppercase tracking-wider mb-1">Reason</p>
                      <p className="text-sm text-[#253444] leading-relaxed">{d.reason}</p>
                    </div>

                    {tx && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Amount", value: formatMoney(tx.grossAmount) },
                          { label: "Escrow", value: tx.escrowStatus },
                          { label: "Net", value: formatMoney(tx.netAmount) },
                        ].map(s => (
                          <div key={s.label} className="glass-panel-sm rounded-lg p-2.5 text-center">
                            <p className="text-[11px] text-[#4A5568]">{s.label}</p>
                            <p className="text-sm font-bold text-[#0F1924] terminal-amount">{s.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {isOpen && (
                      resolvingId === d.id ? (
                        <div className="space-y-3 border-t border-[#BEB5A5] pt-3">
                          <textarea
                            value={resolution} onChange={e => setResolution(e.target.value)}
                            rows={2} placeholder="Resolution notes..."
                            className="glass-input w-full rounded-xl text-sm resize-none"
                          />
                          <div className="flex gap-2">
                            <button className="flex-1 btn-primary py-2 rounded-lg text-sm">
                              <CheckCircle className="inline h-4 w-4 mr-1" /> Confirm Resolution
                            </button>
                            <button onClick={() => { setResolvingId(null); setResolution(""); }}
                              className="btn-ghost px-4 py-2 rounded-lg text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setResolvingId(d.id)}
                          className="btn-glass px-4 py-2 rounded-lg text-sm">
                          Resolve Dispute
                        </button>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {["all", "client", "freelancer", "admin"].map(f => (
                <button key={f} onClick={() => setUserRoleFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                    userRoleFilter === f
                      ? "bg-[#7A5218] text-white border border-transparent"
                      : "text-[#253444] hover:text-[#0F1924]"
                  }`}>
                  {f === "all" ? `All (${users.length})` : f}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
            <div className="glass-panel overflow-hidden min-w-[600px]">
              <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#BEB5A5] text-[11px] text-[#4A5568] uppercase tracking-wider font-semibold">
                <span>Name</span><span>Email</span><span>Role</span><span>Score</span><span>Verified</span>
              </div>
              {filteredUsers.map(u => {
                const tier = getGeekTier(u.geekScore);
                return (
                  <div key={u.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[#BEB5A5]/50 tx-row transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-[rgba(200,146,61,0.10)] flex items-center justify-center text-[#C8923D] text-xs font-bold shrink-0">
                        {u.avatarInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0F1924] truncate">{u.fullName}</p>
                        <div className="flex gap-1 mt-0.5">
                          {u.skills.slice(0, 2).map(s => (
                            <span key={s} className="text-[11px] text-[#4A5568] bg-[#D8D0C0] px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                          {u.skills.length > 2 && <span className="text-[11px] text-[#4A5568]">+{u.skills.length - 2}</span>}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#253444] truncate">{u.email}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border capitalize ${
                      u.role === "admin" ? "bg-[#D8D0C0] text-[#253444] border-[#BEB5A5]" :
                      u.role === "freelancer" ? "badge-active" :
                      "bg-[rgba(200,146,61,0.10)] text-[#7A5218] border-[#C8923D]/20"
                    }`}>{u.role}</span>
                    <span className="text-xs font-bold text-[#0F1924] text-center w-12 terminal-amount" style={{ color: tier.color }}>
                      {u.geekScore}
                    </span>
                    <span className="text-center w-16">
                      {u.isVerified
                        ? <CheckCircle className="h-4 w-4 text-[#C8923D] mx-auto" />
                        : <X className="h-4 w-4 text-[#4A5568] mx-auto" />}
                    </span>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {/* ── JOBS TAB ── */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {["all", "open", "accepted"].map(f => (
                <button key={f} onClick={() => setJobStatusFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                    jobStatusFilter === f
                      ? "bg-[#7A5218] text-white border border-transparent"
                      : "text-[#253444] hover:text-[#0F1924]"
                  }`}>
                  {f === "all" ? `All (${jobs.length})` : f}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
            <div className="glass-panel overflow-hidden min-w-[550px]">
              <div className="grid grid-cols-[2fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#BEB5A5] text-[11px] text-[#4A5568] uppercase tracking-wider font-semibold">
                <span>Title</span><span>Status</span><span>Current</span><span>Decay</span><span>Bids</span>
              </div>
              {filteredJobs.map(job => {
                const jobBids = bids.filter(b => b.jobId === (job.id ?? job._id));
                return (
                  <div key={job.id ?? job._id} className="grid grid-cols-[2fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[#BEB5A5]/50 tx-row transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F1924] truncate">{job.title}</p>
                      <div className="flex gap-1 mt-0.5">
                        {job.skillsRequired.slice(0, 3).map(s => (
                          <span key={s} className="text-[11px] text-[#4A5568] bg-[#D8D0C0] px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                      job.status === "open" ? "badge-active" : "badge-pending"
                    }`}>{job.status}</span>
                    <span className="font-heading text-sm font-bold text-[#C8923D] w-20 text-right terminal-amount">
                      {formatMoney(getCurrentPrice(job, now))}
                    </span>
                    <span className="text-xs text-[#B02020]/70 w-16 text-right">-${job.decayRatePerHour}/hr</span>
                    <span className="flex items-center gap-1 text-xs text-[#253444] w-10 justify-end">
                      <MessageSquare className="h-3 w-3" /> {jobBids.length}
                    </span>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Held in Escrow", value: formatMoney(held.reduce((s, t) => s + t.grossAmount, 0)), color: "text-[#7A5218]" },
                { label: "Released", value: formatMoney(released.reduce((s, t) => s + t.grossAmount, 0)), color: "text-[#C8923D]" },
                { label: "Disputed", value: String(transactions.filter(t => t.escrowStatus === "disputed").length), color: "text-[#B02020]" },
              ].map(s => (
                <div key={s.label} className="glass-panel-sm rounded-2xl p-4 text-center">
                  <p className={`font-heading text-2xl font-bold terminal-amount ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-[#4A5568] mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              {["all", "held", "released", "disputed"].map(f => (
                <button key={f} onClick={() => setTxFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                    txFilter === f
                      ? "bg-[#7A5218] text-white border border-transparent"
                      : "text-[#253444] hover:text-[#0F1924]"
                  }`}>
                  {f}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-[#BEB5A5] text-[11px] text-[#4A5568] uppercase tracking-wider font-semibold">
                <span>Job</span><span>Gross</span><span>Fee</span><span>Net</span><span>Status</span><span>Action</span>
              </div>
              {filteredTx.map(t => {
                const jobTitle = jobs.find(j => j.id === t.jobId || j._id === t.jobId)?.title ?? `#${(t.jobId ?? "").slice(-6)}`;
                return (
                  <div key={t.id ?? t._id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-[#BEB5A5]/50 tx-row transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F1924] truncate">{jobTitle}</p>
                      <p className="text-[11px] text-[#4A5568]">{timeAgo(t.createdAt)}</p>
                    </div>
                    <span className="font-heading text-sm text-[#0F1924] w-20 text-right terminal-amount">{formatMoney(t.grossAmount)}</span>
                    <span className="text-xs text-[#4A5568] w-16 text-right terminal-amount">{formatMoney(t.platformFee)}</span>
                    <span className="text-sm font-medium text-[#C8923D] w-20 text-right terminal-amount">{formatMoney(t.netAmount)}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border w-20 text-center ${
                      t.escrowStatus === "released" ? "badge-active" :
                      t.escrowStatus === "held" ? "badge-pending" :
                      "badge-disputed"
                    }`}>{t.escrowStatus}</span>
                    <div className="w-16 text-right">
                      {t.escrowStatus === "held" ? (
                        <button onClick={() => handleRelease(t.id ?? t._id ?? "")}
                          className="text-[#C8923D] text-xs font-medium hover:text-[#E0A33E] transition-colors">
                          Release
                        </button>
                      ) : (
                        <span className="text-[#4A5568] text-xs">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredTx.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <DollarSign className="h-8 w-8 text-[#4A5568] mx-auto mb-2" />
                  <p className="text-sm text-[#253444]">No transactions match this filter</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
