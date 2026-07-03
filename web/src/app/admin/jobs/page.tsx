"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase, Search, Loader2, Edit2, Trash2, Star, X,
  ChevronLeft, ChevronRight, MessageSquare,
} from "lucide-react";

type Job = {
  _id: string; id: string; title: string; description?: string;
  status: string; startingPrice: number; minimumPrice: number;
  decayRatePerHour: number; skillsRequired: string[]; category?: string;
  featured?: boolean; createdAt: string; clientId?: string;
};

export default function AdminJobsPage() {
  const { auth, bids } = useApp();
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

  const headers = {
    "Content-Type": "application/json",
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: statusFilter, search });
    const res = await fetch(`/api/admin/jobs?${params}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, statusFilter, search, auth.accessToken]);

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
    const res = await fetch(`/api/admin/jobs/${editJob.id}`, { method: "PATCH", headers, body: JSON.stringify(editForm) });
    if (res.ok) { toast.success("Job updated"); fetchJobs(); setEditJob(null); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    setActionLoading(false);
  }

  async function toggleFeatured(job: Job) {
    const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "PATCH", headers, body: JSON.stringify({ featured: !job.featured }) });
    if (res.ok) { toast.success(job.featured ? "Unfeatured" : "Featured!"); fetchJobs(); }
    else toast.error("Failed");
  }

  async function deleteJob() {
    if (!deleteTarget) return;
    setActionLoading(true);
    const res = await fetch(`/api/admin/jobs/${deleteTarget.id}`, { method: "DELETE", headers, body: JSON.stringify({ reason: deleteReason }) });
    if (res.ok) { toast.success("Job removed"); fetchJobs(); setDeleteTarget(null); setDeleteReason(""); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    setActionLoading(false);
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#f0e8d4]">Job Management</h1>
          <p className="text-sm text-[#a8997e]">{total} total jobs</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search jobs..."
            className="glass-input w-full pl-10 pr-4 py-2.5 rounded-[6px] text-sm"
          />
        </div>
        <div className="flex gap-1">
          {["all", "open", "accepted", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                statusFilter === s ? "bg-[#c9a84c] text-[#050810]" : "text-[#a8997e] hover:text-[#f0e8d4]"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.22)]">
                <th className="text-left px-5 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Title</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Current Price</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Bids</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Posted</th>
                <th className="text-right px-5 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <Briefcase className="h-8 w-8 text-[#a8997e] mx-auto mb-2" />
                  <p className="text-sm text-[#a8997e]">No jobs found</p>
                </td></tr>
              ) : jobs.map(job => {
                const jobBids = bids.filter(b => b.jobId === (job.id ?? job._id));
                const currentPrice = job.startingPrice;
                return (
                  <tr key={job.id} className="border-b border-[rgba(201,168,76,0.08)] hover:bg-[rgba(201,168,76,0.02)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {job.featured && <Star className="h-3.5 w-3.5 text-[#c9a84c] shrink-0 fill-[#c9a84c]" />}
                        <div>
                          <p className="text-sm font-medium text-[#f0e8d4] max-w-[200px] truncate">{job.title}</p>
                          <div className="flex gap-1 mt-0.5">
                            {(job.skillsRequired ?? []).slice(0, 2).map(s => (
                              <span key={s} className="text-[10px] text-[#a8997e] bg-[#111625] px-1.5 py-0.5 rounded-[3px]">{s}</span>
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
                      <span className="text-sm font-bold text-[#c9a84c] terminal-amount">{formatMoney(currentPrice)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-xs text-[#a8997e]">
                        <MessageSquare className="h-3 w-3" /> {jobBids.length}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-[#a8997e]">{timeAgo(job.createdAt)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => toggleFeatured(job)}
                          title={job.featured ? "Unfeature" : "Feature"}
                          className={`p-1.5 rounded-[4px] transition-all ${job.featured ? "text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)]" : "text-[#a8997e] hover:text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)]"}`}>
                          <Star className={`h-3.5 w-3.5 ${job.featured ? "fill-[#c9a84c]" : ""}`} />
                        </button>
                        <button onClick={() => openEdit(job)}
                          className="p-1.5 rounded-[4px] text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(job)}
                          className="p-1.5 rounded-[4px] text-[#a8997e] hover:text-[#e57373] hover:bg-[rgba(229,115,115,0.08)] transition-all">
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(201,168,76,0.12)]">
            <span className="text-xs text-[#a8997e]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-[4px] text-[#a8997e] hover:text-[#f0e8d4] disabled:opacity-30 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-[4px] text-[#a8997e] hover:text-[#f0e8d4] disabled:opacity-30 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-base font-semibold text-[#f0e8d4]">Edit Job</h3>
              <button onClick={() => setEditJob(null)} className="p-1 text-[#a8997e] hover:text-[#f0e8d4]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-[#a8997e]">Title</span>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm" />
              </label>
              <label className="block">
                <span className="text-xs text-[#a8997e]">Status</span>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm bg-[#111625]">
                  <option value="open">Open</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-[#a8997e]">Start Price ($)</span>
                  <input type="number" value={editForm.startingPrice} onChange={e => setEditForm(p => ({ ...p, startingPrice: +e.target.value }))}
                    className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-[#a8997e]">Min Price ($)</span>
                  <input type="number" value={editForm.minimumPrice} onChange={e => setEditForm(p => ({ ...p, minimumPrice: +e.target.value }))}
                    className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-[#a8997e]">Decay Rate ($/hr)</span>
                <input type="number" step="0.01" value={editForm.decayRatePerHour} onChange={e => setEditForm(p => ({ ...p, decayRatePerHour: +e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.featured} onChange={e => setEditForm(p => ({ ...p, featured: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm text-[#f0e8d4]">Featured job</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveJob} disabled={actionLoading}
                className="btn-primary flex-1 py-2.5 rounded-[6px] text-sm flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
              </button>
              <button onClick={() => setEditJob(null)} className="btn-ghost px-4 py-2.5 rounded-[6px] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base font-semibold text-[#f0e8d4]">Remove Job</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 text-[#a8997e] hover:text-[#f0e8d4]"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-[#a8997e] mb-3">Remove <span className="text-[#f0e8d4] font-medium">{deleteTarget.title}</span>? Job will be marked as removed.</p>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
              placeholder="Reason for removal..." rows={2}
              className="glass-input w-full px-3 py-2.5 rounded-[6px] text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={deleteJob} disabled={actionLoading}
                className="flex-1 py-2.5 rounded-[6px] text-sm font-medium bg-[rgba(176,32,32,0.15)] text-[#e57373] border border-[rgba(176,32,32,0.3)] flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Remove Job
              </button>
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-4 py-2.5 rounded-[6px] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
