"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle, ChevronLeft, ChevronRight, X,
} from "lucide-react";

type Dispute = {
  _id: string; id: string; reason: string; status: string; raisedByName: string;
  jobTitle: string; amount: number; escrowStatus: string; createdAt: string;
  resolution?: string; resolutionType?: string;
};

const RESOLUTION_TYPES = [
  { value: "refund_client", label: "Refund Client" },
  { value: "pay_freelancer", label: "Pay Freelancer" },
  { value: "split_50_50", label: "Split 50/50" },
  { value: "dismiss", label: "Dismiss" },
];

export default function AdminDisputesPage() {
  const { getValidToken } = useApp();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null);
  const [resolutionType, setResolutionType] = useState("dismiss");
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getHeaders = useCallback(async () => {
    const token = await getValidToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getValidToken]);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: filter });
    const res = await fetch(`/api/admin/disputes?${params}`, { headers: await getHeaders() });
    if (res.ok) {
      const data = await res.json();
      setDisputes(data.disputes);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, filter, getHeaders]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  async function resolveDispute() {
    if (!resolveTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: await getHeaders(),
        body: JSON.stringify({ disputeId: resolveTarget.id, status: "resolved", resolutionType, resolution }),
      });
      if (res.ok) {
        toast.success("Dispute resolved");
        fetchDisputes();
        setResolveTarget(null);
        setResolution("");
        setResolutionType("dismiss");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to resolve");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadge(s: string) {
    if (s === "resolved") return "badge-active";
    if (s === "open" || s === "pending") return "badge-pending";
    return "badge-disputed";
  }

  const activeCount = disputes.filter(d => d.status !== "resolved").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl text-[#3d3a45]">Disputes</h1>
          <p className="text-sm text-[#6f6a7d]">{total} total · {activeCount} active</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${activeCount > 0 ? "bg-[#96543f] animate-pulse" : "bg-[#4d7245]"}`} />
          <span className="text-xs text-[#6f6a7d]">{activeCount > 0 ? `${activeCount} need attention` : "All clear"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Active", value: String(activeCount), color: "text-[#96543f]" },
          { label: "Resolved (page)", value: String(resolvedCount), color: "text-[#4d7245]" },
          { label: "Total (page)", value: String(disputes.length), color: "text-[#3d3a45]" },
        ].map(s => (
          <div key={s.label} className="glass-panel-sm rounded-2xl p-4 text-center">
            <p className={`font-heading text-xl ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-[#6f6a7d] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap">
        {["all", "open", "pending", "resolved"].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-[#4b3f8f] text-[#ffffff]" : "text-[#6f6a7d] hover:text-[#3d3a45]"
            }`}>{f}</button>
        ))}
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-[rgba(75,63,143,0.22)]">
                {["ID", "Reason", "Raised By", "Job", "Amount", "Status", "Date", "Action"].map(h => (
                  <th key={h} className={`px-4 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold ${h === "Amount" || h === "Action" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center">
                  <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : disputes.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-[#6f6a7d] mx-auto mb-2" />
                  <p className="text-sm text-[#6f6a7d]">No disputes found</p>
                </td></tr>
              ) : disputes.map(d => (
                <tr key={d.id} className="border-b border-[rgba(75,63,143,0.08)] tx-row transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] font-mono text-[#6f6a7d]">#{d.id.slice(-6)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-[#3d3a45] max-w-[160px] truncate" title={d.reason}>{d.reason}</p>
                    {d.resolution && <p className="text-[10px] text-[#4d7245] mt-0.5 truncate max-w-[160px]">{d.resolutionType?.replace(/_/g, " ")}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[#6f6a7d] max-w-[100px] truncate block">{d.raisedByName}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[#6f6a7d] max-w-[120px] truncate block">{d.jobTitle}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm text-[#4b3f8f] terminal-amount">{formatMoney(d.amount)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${statusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[#6f6a7d]">{timeAgo(d.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {d.status !== "resolved" ? (
                      <button
                        onClick={() => setResolveTarget(d)}
                        className="text-[11px] font-medium text-[#4b3f8f] hover:text-[#3d3373] transition-colors"
                      >
                        Resolve →
                      </button>
                    ) : <span className="text-[#6f6a7d] text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(75,63,143,0.12)]">
            <span className="text-xs text-[#6f6a7d]">Page {page} of {pages} · {total} records</span>
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

      {resolveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff]/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="h-0.5 w-full bg-[#4b3f8f]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base text-[#3d3a45]">Resolve Dispute</h3>
                <button onClick={() => { setResolveTarget(null); setResolution(""); }} className="p-1 text-[#6f6a7d] hover:text-[#3d3a45]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1 mb-4 p-3 bg-[#f4f2ee] rounded-2xl">
                <p className="text-xs text-[#6f6a7d]">Dispute <span className="font-mono text-[#4b3f8f]">#{resolveTarget.id.slice(-6)}</span></p>
                <p className="text-sm text-[#3d3a45]">{resolveTarget.reason}</p>
                <p className="text-xs text-[#6f6a7d] mt-0.5">Job: {resolveTarget.jobTitle} · <span className="terminal-amount">{formatMoney(resolveTarget.amount)}</span></p>
              </div>

              <div className="mb-4">
                <label className="text-[11px] text-[#6f6a7d] uppercase tracking-wider mb-1.5 block">Resolution Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOLUTION_TYPES.map(r => (
                    <button key={r.value} onClick={() => setResolutionType(r.value)}
                      className={`py-2 px-3 rounded-2xl text-xs font-medium text-left border transition-all ${
                        resolutionType === r.value
                          ? "border-[rgba(75,63,143,0.5)] bg-[rgba(75,63,143,0.08)] text-[#4b3f8f]"
                          : "border-[rgba(75,63,143,0.12)] text-[#6f6a7d] hover:text-[#3d3a45]"
                      }`}
                    >{r.label}</button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="dispute-resolution-notes" className="text-[11px] text-[#6f6a7d] uppercase tracking-wider mb-1.5 block">Resolution Notes</label>
                <textarea
                  id="dispute-resolution-notes"
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="Describe your resolution decision..."
                  rows={3}
                  className="glass-input w-full px-3 py-2.5 rounded-2xl text-sm resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resolveDispute}
                  disabled={!resolution.trim() || submitting}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-medium bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border border-[rgba(75,63,143,0.3)] disabled:opacity-40 transition-all"
                >
                  {submitting ? "Resolving..." : "Confirm Resolution"}
                </button>
                <button onClick={() => { setResolveTarget(null); setResolution(""); }}
                  className="btn-ghost px-4 py-2.5 rounded-2xl text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
