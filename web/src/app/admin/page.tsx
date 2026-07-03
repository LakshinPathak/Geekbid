"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users, Briefcase, DollarSign, AlertTriangle,
  Database, Loader2, Activity, TrendingUp, RefreshCw,
} from "lucide-react";
import Link from "next/link";

type Stats = {
  users: { total: number };
  jobs: { total: number; open: number };
  transactions: { total: number; gmv: number; fees: number; heldEscrow: number; heldCount: number };
  disputes: { total: number; active: number };
  recentActivity: { _id: string; action: string; detail: string; createdAt: string; adminId: string }[];
};

export default function AdminDashboard() {
  const { auth, seedDatabase } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/stats", { headers });
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [auth.accessToken]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSeed = async () => {
    setSeeding(true);
    const r = await seedDatabase();
    setSeeding(false);
    if (r.ok) { toast.success("Database seeded!", { description: r.message }); fetchStats(); }
    else toast.error("Seed failed", { description: r.message });
  };

  const STATS = stats ? [
    { icon: Users, label: "Total Users", value: String(stats.users.total), sub: "registered accounts", color: "text-[#f0e8d4]", href: "/admin/users" },
    { icon: Briefcase, label: "Open Jobs", value: String(stats.jobs.open), sub: `of ${stats.jobs.total} total`, color: "text-[#c9a84c]", href: "/admin/jobs" },
    { icon: AlertTriangle, label: "Active Disputes", value: String(stats.disputes.active), sub: `of ${stats.disputes.total} total`, color: stats.disputes.active > 0 ? "text-[#e57373]" : "text-[#4caf7d]", href: "/admin/disputes" },
    { icon: DollarSign, label: "Platform Revenue", value: formatMoney(stats.transactions.fees), sub: `GMV: ${formatMoney(stats.transactions.gmv)}`, color: "text-[#c9a84c]", href: "/admin/transactions" },
    { icon: TrendingUp, label: "Held in Escrow", value: formatMoney(stats.transactions.heldEscrow), sub: `${stats.transactions.heldCount} transactions`, color: "text-[#f0e8d4]", href: "/admin/transactions" },
    { icon: Activity, label: "Transactions", value: String(stats.transactions.total), sub: "all time", color: "text-[#f0e8d4]", href: "/admin/transactions" },
  ] : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#f0e8d4]">Dashboard</h1>
          <p className="text-sm text-[#a8997e] mt-0.5">Platform health at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs text-[#a8997e] border border-[rgba(201,168,76,0.18)] hover:text-[#f0e8d4] hover:border-[rgba(201,168,76,0.35)] transition-all disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={handleSeed} disabled={seeding}
            className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium disabled:opacity-50">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {seeding ? "Seeding..." : "Seed DB"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel-sm rounded-[6px] p-5 animate-pulse">
              <div className="h-10 w-10 rounded-[6px] bg-[#111625] mb-3" />
              <div className="h-7 w-24 bg-[#111625] rounded mb-1" />
              <div className="h-3 w-32 bg-[#111625]/60 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STATS.map(s => (
            <Link key={s.label} href={s.href}
              className="glass-panel-sm rounded-[6px] p-5 hover:border-[rgba(201,168,76,0.4)] transition-all group block">
              <div className="h-10 w-10 rounded-[6px] bg-[#111625] flex items-center justify-center mb-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className={`font-heading text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#a8997e] mt-0.5 font-medium">{s.label}</p>
              <p className="text-[11px] text-[#a8997e]/60 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <div className="glass-panel rounded-[6px] p-5">
          <h2 className="font-heading text-sm text-[#f0e8d4] mb-4 uppercase tracking-wider text-[11px] text-[#a8997e]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Manage Users", href: "/admin/users", icon: Users },
              { label: "Manage Jobs", href: "/admin/jobs", icon: Briefcase },
              { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
              { label: "Transactions", href: "/admin/transactions", icon: DollarSign },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2.5 px-3 py-3 rounded-[6px] bg-[#111625] hover:bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.12)] hover:border-[rgba(201,168,76,0.3)] text-sm text-[#f0e8d4] transition-all">
                <a.icon className="h-4 w-4 text-[#c9a84c]" />
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="glass-panel rounded-[6px] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Recent Admin Activity</span>
            <Link href="/admin/logs" className="text-[11px] text-[#c9a84c] hover:text-[#d4b55a] transition-colors">View all →</Link>
          </div>
          <div className="space-y-0">
            {!stats || stats.recentActivity.length === 0 ? (
              <p className="text-sm text-[#a8997e] text-center py-4">No admin actions yet</p>
            ) : stats.recentActivity.map(a => (
              <div key={a._id} className="flex items-start gap-2.5 py-2 border-b border-[rgba(201,168,76,0.08)] last:border-0">
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                  a.action.includes("fail") ? "bg-[#e57373]" :
                  a.action.includes("delete") ? "bg-[#e57373]" :
                  a.action.includes("resolve") ? "bg-[#4caf7d]" : "bg-[#c9a84c]"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#f0e8d4] truncate">{a.detail}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-[#c9a84c]/70">{a.action}</span>
                    <span className="text-[10px] text-[#a8997e]">{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
