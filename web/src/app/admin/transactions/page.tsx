"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { formatMoney, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  DollarSign, ChevronLeft, ChevronRight, Loader2,
  Download, CheckCircle, RotateCcw, X,
} from "lucide-react";

type Transaction = {
  _id: string; id: string; jobTitle: string; clientName: string; freelancerName: string;
  grossAmount: number; platformFee: number; netAmount: number;
  escrowStatus: string; createdAt: string; jobId: string;
};

export default function AdminTransactionsPage() {
  const { auth } = useApp();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const headers = {
    "Content-Type": "application/json",
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: filter });
    const res = await fetch(`/api/admin/transactions?${params}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setTxs(data.transactions);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, filter, auth.accessToken]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  async function doAction(txId: string, action: string, reason?: string) {
    setActionLoading(txId);
    const res = await fetch("/api/admin/transactions", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ txId, action, reason }),
    });
    if (res.ok) {
      toast.success(action === "release" ? "Escrow released!" : "Refund processed");
      fetchTxs();
      setRefundTarget(null);
      setRefundReason("");
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Action failed");
    }
    setActionLoading(null);
  }

  const exportCSV = () => {
    const rows = [
      ["Job", "Client", "Freelancer", "Gross", "Fee", "Net", "Status", "Date"],
      ...txs.map(t => [t.jobTitle, t.clientName, t.freelancerName, t.grossAmount, t.platformFee, t.netAmount, t.escrowStatus, t.createdAt]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allTxs = txs;
  const heldTotal = allTxs.filter(t => t.escrowStatus === "held").reduce((s, t) => s + t.grossAmount, 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl text-[#3d3a45]">Transactions</h1>
          <p className="text-sm text-[#6f6a7d]">{total} total records</p>
        </div>
        <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 px-4 py-2 rounded-2xl text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Held in Escrow", value: formatMoney(heldTotal), color: "text-[#4b3f8f]" },
          { label: "Released", value: formatMoney(allTxs.filter(t => t.escrowStatus === "released").reduce((s, t) => s + t.grossAmount, 0)), color: "text-[#4d7245]" },
          { label: "Disputed", value: String(allTxs.filter(t => t.escrowStatus === "disputed").length), color: "text-[#96543f]" },
          { label: "Total (page)", value: formatMoney(allTxs.reduce((s, t) => s + t.grossAmount, 0)), color: "text-[#3d3a45]" },
        ].map(s => (
          <div key={s.label} className="glass-panel-sm rounded-2xl p-4 text-center">
            <p className={`font-heading text-xl terminal-amount ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-[#6f6a7d] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1">
        {["all", "held", "released", "disputed", "refunded"].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
              filter === f ? "bg-[#4b3f8f] text-[#ffffff]" : "text-[#6f6a7d] hover:text-[#3d3a45]"
            }`}>{f}</button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-[rgba(75,63,143,0.22)]">
                {["Job", "Client", "Gross", "Fee", "Net", "Status", "Date", "Action"].map(h => (
                  <th key={h} className={`px-4 py-3 text-[11px] text-[#6f6a7d] uppercase tracking-wider font-semibold ${h === "Action" || h === "Gross" || h === "Fee" || h === "Net" ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center">
                  <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : txs.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center">
                  <DollarSign className="h-8 w-8 text-[#6f6a7d] mx-auto mb-2" />
                  <p className="text-sm text-[#6f6a7d]">No transactions found</p>
                </td></tr>
              ) : txs.map(t => (
                <tr key={t.id} className="border-b border-[rgba(75,63,143,0.08)] tx-row transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-[#3d3a45] max-w-[140px] truncate">{t.jobTitle}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-[#6f6a7d] max-w-[100px] truncate">{t.clientName}</p>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm text-[#3d3a45] terminal-amount">{formatMoney(t.grossAmount)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-xs text-[#6f6a7d] terminal-amount">{formatMoney(t.platformFee)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-medium text-[#4b3f8f] terminal-amount">{formatMoney(t.netAmount)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
                      t.escrowStatus === "released" ? "badge-active" :
                      t.escrowStatus === "held" ? "badge-pending" :
                      t.escrowStatus === "refunded" ? "badge-completed" :
                      "badge-disputed"
                    }`}>{t.escrowStatus}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[#6f6a7d]">{timeAgo(t.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {t.escrowStatus === "held" ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => doAction(t.id, "release")}
                          disabled={actionLoading === t.id}
                          className="flex items-center gap-1 text-[11px] font-medium text-[#4d7245] hover:text-[#4d7245] transition-colors disabled:opacity-40"
                        >
                          {actionLoading === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                          Release
                        </button>
                        <span className="text-[#6f6a7d]/40">|</span>
                        <button
                          onClick={() => setRefundTarget(t)}
                          className="flex items-center gap-1 text-[11px] font-medium text-[#6f6a7d] hover:text-[#96543f] transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Refund
                        </button>
                      </div>
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

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff]/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="h-0.5 w-full bg-[#96543f]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-base text-[#3d3a45]">Issue Refund</h3>
                <button onClick={() => setRefundTarget(null)} className="p-1 text-[#6f6a7d] hover:text-[#3d3a45]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-[#6f6a7d] mb-1">Refunding <span className="text-[#3d3a45]">{refundTarget.jobTitle}</span></p>
              <p className="text-sm font-bold text-[#4b3f8f] terminal-amount mb-4">{formatMoney(refundTarget.grossAmount)}</p>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="Reason for refund (required)..."
                rows={3}
                className="glass-input w-full px-3 py-2.5 rounded-2xl text-sm resize-none mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => doAction(refundTarget.id, "refund", refundReason)}
                  disabled={!refundReason.trim() || !!actionLoading}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-medium bg-[rgba(150,84,63,0.1)] text-[#96543f] border border-[rgba(150,84,63,0.3)] flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Confirm Refund
                </button>
                <button onClick={() => { setRefundTarget(null); setRefundReason(""); }}
                  className="btn-ghost px-4 py-2.5 rounded-2xl text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
