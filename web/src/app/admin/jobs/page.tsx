"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo, getCurrentPrice, type Job } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase, Search, Loader2, Edit2, Trash2, Star, X,
  ChevronLeft, ChevronRight, MessageSquare,
} from "lucide-react";

export default function AdminJobsPage() {
  const { getValidToken } = useApp();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [editForm, setEditForm] = useState({ title: "", status: "", startingPrice: 0, minimumPrice: 0, decayRatePerHour: 0, featured: false });
  const [actionLoading, setActionLoading] = useState(false);
  const [featuredLoadingId, setFeaturedLoadingId] = useState<string | null>(null);

  // Fetches a fresh header set (with a valid, non-expired token) on every
  // call instead of a plain object frozen with whatever auth.accessToken
  // was at render time.
  const getHeaders = useCallback(async () => {
    const token = await getValidToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getValidToken]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: statusFilter, search });
    const res = await fetch(`/api/admin/jobs?${params}`, { headers: await getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, statusFilter, search, getHeaders]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function openEdit(job: Job) {
    setEditJob(job);
    setEditForm({
      title: job.title,
      status: job.status,
      startingPrice: job.startingPrice,
      minimumPrice: job.minimumPrice,
      decayRatePerHour: job.decayRatePerHour,
      featured: job.featured ?? false,
    });
  }

  async function saveJob() {
    if (!editJob) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs/${editJob.id}`, { method: "PATCH", headers: await getHeaders(), body: JSON.stringify(editForm) });
      if (res.ok) { toast.success("Job updated"); fetchJobs(); setEditJob(null); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleFeatured(job: Job) {
    if (featuredLoadingId) return;
    setFeaturedLoadingId(job.id);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "PATCH", headers: await getHeaders(), body: JSON.stringify({ featured: !job.featured }) });
      if (res.ok) { toast.success(job.featured ? "Unfeatured" : "Featured!"); fetchJobs(); }
      else toast.error("Failed");
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setFeaturedLoadingId(null);
    }
  }

  async function deleteJob() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs/${deleteTarget.id}`, { method: "DELETE", headers: await getHeaders(), body: JSON.stringify({ reason: deleteReason }) });
      if (res.ok) { toast.success("Job removed"); fetchJobs(); setDeleteTarget(null); setDeleteReason(""); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#3d3a45]">Job Management</h1>
          <p className="text-sm text-[#6f6a7d]">{total} total jobs</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6f6a7d]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search jobs..."
            className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm"
          />
        </div>
        <div className="flex gap-1">
          {["all", "open", "accepted", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                statusFilter === s ? "bg-[#4b3f8f] text-[#ffffff]" : "text-[#6f6a7d] hover:text-[#3d3a45]"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(75,63,143,0.22)]">
                <th className="text-left px-5 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Title</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Current Price</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Bids</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Posted</th>
                <th className="text-right px-5 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <Briefcase className="h-8 w-8 text-[#6f6a7d] mx-auto mb-2" />
                  <p className="text-sm text-[#6f6a7d]">No jobs found</p>
                </td></tr>
              ) : jobs.map(job => {
                const currentPrice = getCurrentPrice(job, new Date());
                return (
                  <tr key={job.id} className="border-b border-[rgba(75,63,143,0.08)] hover:bg-[rgba(75,63,143,0.02)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {job.featured && <Star className="h-3.5 w-3.5 text-[#4b3f8f] shrink-0 fill-[#4b3f8f]" />}
                        <div>
                          <p className="text-sm font-medium text-[#3d3a45] max-w-[200px] truncate">{job.title}</p>
                          <div className="flex gap-1 mt-0.5">
                            {(job.skillsRequired ?? []).slice(0, 2).map(s => (
                              <span key={s} className="text-[10px] text-[#6f6a7d] bg-[#f4f2ee] px-1.5 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                        job.status === "open" ? "badge-active" :
                        job.status === "accepted" ? "badge-pending" :
                        job.status === "removed" ? "badge-disputed" : "badge-pending"
                      }`}>{job.status}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-[#4b3f8f] terminal-amount">{formatMoney(currentPrice)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-[#6f6a7d]">
                        <MessageSquare className="h-3 w-3" /> {job.bidCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-[#6f6a7d]">{timeAgo(job.postedAt)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => toggleFeatured(job)}
                          disabled={featuredLoadingId === job.id}
                          title={job.featured ? "Unfeature" : "Feature"}
                          className={`p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${job.featured ? "text-[#4b3f8f] hover:bg-[rgba(75,63,143,0.08)]" : "text-[#6f6a7d] hover:text-[#4b3f8f] hover:bg-[rgba(75,63,143,0.08)]"}`}>
                          <Star className={`h-3.5 w-3.5 ${job.featured ? "fill-[#4b3f8f]" : ""}`} />
                        </button>
                        <button onClick={() => openEdit(job)}
                          className="p-1.5 rounded-xl text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(job)}
                          className="p-1.5 rounded-xl text-[#6f6a7d] hover:text-[#96543f] hover:bg-[rgba(150,84,63,0.08)] transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(75,63,143,0.12)]">
            <span className="text-xs text-[#6f6a7d]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-xl text-[#6f6a7d] hover:text-[#3d3a45] disabled:opacity-30 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-xl text-[#6f6a7d] hover:text-[#3d3a45] disabled:opacity-30 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff]/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-base font-semibold text-[#3d3a45]">Edit Job</h3>
              <button onClick={() => setEditJob(null)} className="p-1 text-[#6f6a7d] hover:text-[#3d3a45]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-[#6f6a7d]">Title</span>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-2xl text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-[#6f6a7d]">Status</span>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-2xl text-sm bg-[#f4f2ee]">
                  <option value="open">Open</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-[#6f6a7d]">Start Price ($)</span>
                  <input type="number" value={editForm.startingPrice} onChange={e => setEditForm(p => ({ ...p, startingPrice: +e.target.value }))}
                    className="glass-input w-full mt-1 px-3 py-2.5 rounded-2xl text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-[#6f6a7d]">Min Price ($)</span>
                  <input type="number" value={editForm.minimumPrice} onChange={e => setEditForm(p => ({ ...p, minimumPrice: +e.target.value }))}
                    className="glass-input w-full mt-1 px-3 py-2.5 rounded-2xl text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-[#6f6a7d]">Decay Rate ($/hr)</span>
                <input type="number" step="0.01" value={editForm.decayRatePerHour} onChange={e => setEditForm(p => ({ ...p, decayRatePerHour: +e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-2xl text-sm" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.featured} onChange={e => setEditForm(p => ({ ...p, featured: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-[#3d3a45]">Featured job</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveJob} disabled={actionLoading}
                className="btn-primary flex-1 py-2.5 rounded-2xl text-sm flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
              </button>
              <button onClick={() => setEditJob(null)} className="btn-ghost px-4 py-2.5 rounded-2xl text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff]/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base font-semibold text-[#3d3a45]">Remove Job</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 text-[#6f6a7d] hover:text-[#3d3a45]"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-[#6f6a7d] mb-3">Remove <span className="text-[#3d3a45] font-medium">{deleteTarget.title}</span>? Job will be marked as removed.</p>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
              placeholder="Reason for removal..." rows={2}
              className="glass-input w-full px-3 py-2.5 rounded-2xl text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={deleteJob} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium bg-[rgba(193,77,58,0.15)] text-[#96543f] border border-[rgba(193,77,58,0.3)] flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove Job
              </button>
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-4 py-2.5 rounded-2xl text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
