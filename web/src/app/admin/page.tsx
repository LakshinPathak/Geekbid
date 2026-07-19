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
  const { getValidToken, seedDatabase } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Fetches a fresh header set (with a valid, non-expired token) on every
  // call instead of a plain object frozen with whatever auth.accessToken
  // was at render time — an admin session left open past token expiry
  // silently sent every request as effectively unauthenticated before.
  const getHeaders = useCallback(async () => {
    const token = await getValidToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getValidToken]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/stats", { headers: await getHeaders() });
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, [getHeaders]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSeed = async () => {
    setSeeding(true);
    const r = await seedDatabase();
    setSeeding(false);
    if (r.ok) { toast.success("Database seeded!", { description: r.message }); fetchStats(); }
    else toast.error("Seed failed", { description: r.message });
  };

  const STATS = stats ? [
    { icon: Users, label: "Total Users", value: String(stats.users.total), sub: "registered accounts", color: "text-[#3d3a45]", href: "/admin/users" },
    { icon: Briefcase, label: "Open Jobs", value: String(stats.jobs.open), sub: `of ${stats.jobs.total} total`, color: "text-[#4b3f8f]", href: "/admin/jobs" },
    { icon: AlertTriangle, label: "Active Disputes", value: String(stats.disputes.active), sub: `of ${stats.disputes.total} total`, color: stats.disputes.active > 0 ? "text-[#96543f]" : "text-[#4d7245]", href: "/admin/disputes" },
    { icon: DollarSign, label: "Platform Revenue", value: formatMoney(stats.transactions.fees), sub: `GMV: ${formatMoney(stats.transactions.gmv)}`, color: "text-[#4b3f8f]", href: "/admin/transactions" },
    { icon: TrendingUp, label: "Held in Escrow", value: formatMoney(stats.transactions.heldEscrow), sub: `${stats.transactions.heldCount} transactions`, color: "text-[#3d3a45]", href: "/admin/transactions" },
    { icon: Activity, label: "Transactions", value: String(stats.transactions.total), sub: "all time", color: "text-[#3d3a45]", href: "/admin/transactions" },
  ] : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#3d3a45]">Dashboard</h1>
          <p className="text-sm text-[#6f6a7d] mt-0.5">Platform health at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs text-[#6f6a7d] border border-[rgba(75,63,143,0.18)] hover:text-[#3d3a45] hover:border-[rgba(75,63,143,0.35)] transition-all disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button onClick={handleSeed} disabled={seeding}
            className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium disabled:opacity-50">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {seeding ? "Seeding..." : "Seed DB"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel-sm rounded-2xl p-5 animate-pulse">
              <div className="h-10 w-10 rounded-2xl bg-[#f4f2ee] mb-3" />
              <div className="h-7 w-24 bg-[#f4f2ee] rounded mb-1" />
              <div className="h-3 w-32 bg-[#f4f2ee]/60 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {STATS.map(s => (
            <Link key={s.label} href={s.href}
              className="glass-panel-sm rounded-2xl p-5 hover:border-[rgba(75,63,143,0.4)] transition-all group block">
              <div className="h-10 w-10 rounded-xl bg-[#f4f2ee] flex items-center justify-center mb-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className={`font-heading text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[#6f6a7d] mt-0.5 font-medium">{s.label}</p>
              <p className="text-[11px] text-[#6f6a7d]/60 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Quick Actions */}
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="font-heading text-sm text-[#3d3a45] mb-4 uppercase tracking-wider text-[11px] text-[#6f6a7d]">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Manage Users", href: "/admin/users", icon: Users },
              { label: "Manage Jobs", href: "/admin/jobs", icon: Briefcase },
              { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
              { label: "Transactions", href: "/admin/transactions", icon: DollarSign },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2.5 px-3 py-3 rounded-2xl bg-[#f4f2ee] hover:bg-[rgba(75,63,143,0.06)] border border-[rgba(75,63,143,0.12)] hover:border-[rgba(75,63,143,0.3)] text-sm text-[#3d3a45] transition-all">
                <a.icon className="h-4 w-4 text-[#4b3f8f]" />
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Recent Admin Activity</span>
            <Link href="/admin/logs" className="text-[11px] text-[#4b3f8f] hover:text-[#3d3373] transition-colors">View all →</Link>
          </div>
          <div className="space-y-0">
            {!stats || stats.recentActivity.length === 0 ? (
              <p className="text-sm text-[#6f6a7d] text-center py-4">No admin actions yet</p>
            ) : stats.recentActivity.map(a => (
              <div key={a._id} className="flex items-start gap-2.5 py-2 border-b border-[rgba(75,63,143,0.08)] last:border-0">
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                  a.action.includes("fail") ? "bg-[#96543f]" :
                  a.action.includes("delete") ? "bg-[#96543f]" :
                  a.action.includes("resolve") ? "bg-[#4d7245]" : "bg-[#4b3f8f]"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#3d3a45] truncate">{a.detail}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-[#4b3f8f]/70">{a.action}</span>
                    <span className="text-[10px] text-[#6f6a7d]">{timeAgo(a.createdAt)}</span>
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
