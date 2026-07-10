"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

type AuditLog = {
  _id: string; adminId: string; action: string; detail: string; createdAt: string;
};

export default function AdminLogsPage() {
  const { auth } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    const res = await fetch(`/api/admin/logs?${params}`, {
      headers: {
        "Content-Type": "application/json",
        ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, auth.accessToken]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const ACTION_COLOR: Record<string, string> = {
    admin_key_verified: "text-[#4d7245]",
    admin_key_fail: "text-[#96543f]",
    create_admin: "text-[#4b3f8f]",
    update_user: "text-[#3d3a45]",
    delete_user: "text-[#96543f]",
    update_job: "text-[#3d3a45]",
    delete_job: "text-[#96543f]",
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#3d3a45]">Audit Log</h1>
        <p className="text-sm text-[#6f6a7d]">{total} events recorded · Append-only</p>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center">
            <ScrollText className="h-8 w-8 text-[#6f6a7d] mx-auto mb-2" />
            <p className="text-sm text-[#6f6a7d]">No audit events yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(75,63,143,0.08)]">
            {logs.map(log => (
              <div key={log._id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-[rgba(75,63,143,0.02)] transition-colors">
                <div className="shrink-0 w-40">
                  <span className={`text-xs font-mono font-medium ${ACTION_COLOR[log.action] ?? "text-[#6f6a7d]"}`}>
                    {log.action}
                  </span>
                </div>
                <p className="text-sm text-[#3d3a45] flex-1 min-w-0 truncate">{log.detail}</p>
                <span className="text-[11px] text-[#6f6a7d] shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(75,63,143,0.12)]">
            <span className="text-xs text-[#6f6a7d]">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-xl text-[#6f6a7d] hover:text-[#3d3a45] disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-xl text-[#6f6a7d] hover:text-[#3d3a45] disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
