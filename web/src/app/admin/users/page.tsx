"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { getGeekTier, timeAgo } from "@/lib/utils";
import { toast } from "sonner";
import {
  Users, Search, CheckCircle, X, Shield, Loader2,
  Edit2, Trash2, Ban, UserPlus, ChevronLeft, ChevronRight,
} from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";

type User = {
  _id: string; id: string; fullName: string; email: string;
  role: string; geekScore: number; isVerified: boolean;
  suspended?: boolean; createdAt: string; skills: string[];
  avatarUrl?: string; avatarInitial?: string;
};

type EditState = { userId: string; field: string; value: string | boolean | number } | null;

export default function AdminUsersPage() {
  const { auth } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", adminKey: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), role: roleFilter, search });
    const res = await fetch(`/api/admin/users?${params}`, { headers });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    }
    setLoading(false);
  }, [page, roleFilter, search, auth.accessToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setActionLoading(true);
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
    if (res.ok) { toast.success("User updated"); fetchUsers(); setEditUser(null); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    setActionLoading(false);
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setActionLoading(true);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE", headers, body: JSON.stringify({ reason: deleteReason }) });
    if (res.ok) { toast.success("User removed"); fetchUsers(); setDeleteTarget(null); setDeleteReason(""); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    setActionLoading(false);
  }

  async function suspendUser() {
    if (!suspendTarget) return;
    await updateUser(suspendTarget.id, { suspended: !suspendTarget.suspended });
    setSuspendTarget(null);
    setSuspendReason("");
  }

  async function createAdmin() {
    setActionLoading(true);
    const res = await fetch("/api/admin/users", { method: "POST", headers, body: JSON.stringify(createForm) });
    if (res.ok) { toast.success("Admin user created"); setShowCreateAdmin(false); setCreateForm({ name: "", email: "", password: "", adminKey: "" }); fetchUsers(); }
    else { const d = await res.json(); toast.error(d.error ?? "Failed"); }
    setActionLoading(false);
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#f0e8d4]">User Management</h1>
          <p className="text-sm text-[#a8997e]">{total} total users</p>
        </div>
        <button onClick={() => setShowCreateAdmin(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-medium">
          <UserPlus className="h-4 w-4" /> Create Admin
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email..."
            className="glass-input w-full pl-10 pr-4 py-2.5 rounded-[6px] text-sm"
          />
        </div>
        <div className="flex gap-1">
          {["all", "freelancer", "client", "admin"].map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                roleFilter === r ? "bg-[#c9a84c] text-[#050810]" : "text-[#a8997e] hover:text-[#f0e8d4]"
              }`}>{r}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.22)]">
                <th className="text-left px-5 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">User</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Role</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Score</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Joined</th>
                <th className="text-left px-4 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Status</th>
                <th className="text-right px-5 py-3 text-[11px] text-[#a8997e] uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <Users className="h-8 w-8 text-[#a8997e] mx-auto mb-2" />
                  <p className="text-sm text-[#a8997e]">No users found</p>
                </td></tr>
              ) : users.map(u => {
                const tier = getGeekTier(u.geekScore);
                return (
                  <tr key={u.id} className="border-b border-[rgba(201,168,76,0.08)] hover:bg-[rgba(201,168,76,0.02)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <CloudinaryAvatar avatarUrl={u.avatarUrl} avatarInitial={u.avatarInitial ?? ""} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-[#f0e8d4]">{u.fullName}</p>
                          <p className="text-[11px] text-[#a8997e]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border capitalize ${
                        u.role === "admin" ? "bg-[rgba(201,168,76,0.12)] text-[#c9a84c] border-[rgba(201,168,76,0.22)]" :
                        u.role === "freelancer" ? "badge-active" : "badge-pending"
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold" style={{ color: tier.color }}>{u.geekScore}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-[#a8997e]">{timeAgo(u.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {u.isVerified
                          ? <CheckCircle className="h-3.5 w-3.5 text-[#4caf7d]" />
                          : <X className="h-3.5 w-3.5 text-[#a8997e]" />}
                        <span className="text-[11px] text-[#a8997e]">{u.isVerified ? "Verified" : "Unverified"}</span>
                        {u.suspended && <span className="text-[11px] text-[#e57373] ml-1">• Suspended</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => updateUser(u.id, { isVerified: !u.isVerified })}
                          title={u.isVerified ? "Unverify" : "Verify"}
                          className="p-1.5 rounded-[4px] text-[#a8997e] hover:text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)] transition-all">
                          <Shield className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-[4px] text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setSuspendTarget(u)}
                          className={`p-1.5 rounded-[4px] transition-all ${u.suspended ? "text-[#4caf7d] hover:bg-[rgba(76,175,61,0.08)]" : "text-[#a8997e] hover:text-[#e57373] hover:bg-[rgba(229,115,115,0.08)]"}`}>
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(u)}
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

        {/* Pagination */}
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
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-[#a8997e]">Full Name</span>
              <input defaultValue={editUser.fullName} id="edit-name"
                className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-[#a8997e]">Role</span>
              <select id="edit-role" defaultValue={editUser.role}
                className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm bg-[#111625]">
                <option value="freelancer">Freelancer</option>
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[#a8997e]">GeekScore</span>
              <input type="number" defaultValue={editUser.geekScore} id="edit-score"
                className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm" />
            </label>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  const name = (document.getElementById("edit-name") as HTMLInputElement).value;
                  const role = (document.getElementById("edit-role") as HTMLSelectElement).value;
                  const score = parseInt((document.getElementById("edit-score") as HTMLInputElement).value);
                  updateUser(editUser.id, { fullName: name, role, geekScore: score });
                }}
                disabled={actionLoading}
                className="btn-primary flex-1 py-2.5 rounded-[6px] text-sm flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes
              </button>
              <button onClick={() => setEditUser(null)} className="btn-ghost px-4 py-2.5 rounded-[6px] text-sm">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-[#a8997e] mb-3">Remove <span className="text-[#f0e8d4] font-medium">{deleteTarget.fullName}</span>? This is a soft delete — data is retained.</p>
          <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)}
            placeholder="Reason for deletion..." rows={2}
            className="glass-input w-full px-3 py-2.5 rounded-[6px] text-sm resize-none mb-3" />
          <div className="flex gap-2">
            <button onClick={deleteUser} disabled={actionLoading}
              className="flex-1 py-2.5 rounded-[6px] text-sm font-medium bg-[rgba(176,32,32,0.15)] text-[#e57373] border border-[rgba(176,32,32,0.3)] hover:bg-[rgba(176,32,32,0.25)] transition-all flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete User
            </button>
            <button onClick={() => setDeleteTarget(null)} className="btn-ghost px-4 py-2.5 rounded-[6px] text-sm">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Suspend Modal */}
      {suspendTarget && (
        <Modal title={suspendTarget.suspended ? "Unsuspend User" : "Suspend User"} onClose={() => setSuspendTarget(null)}>
          <p className="text-sm text-[#a8997e] mb-4">
            {suspendTarget.suspended
              ? `Restore access for ${suspendTarget.fullName}?`
              : `Suspend ${suspendTarget.fullName}? They will not be able to log in.`}
          </p>
          <div className="flex gap-2">
            <button onClick={suspendUser} disabled={actionLoading}
              className={`flex-1 py-2.5 rounded-[6px] text-sm font-medium flex items-center justify-center gap-2 ${
                suspendTarget.suspended
                  ? "bg-[rgba(76,175,61,0.12)] text-[#4caf7d] border border-[rgba(76,175,61,0.3)]"
                  : "bg-[rgba(229,115,115,0.1)] text-[#e57373] border border-[rgba(229,115,115,0.3)]"
              }`}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {suspendTarget.suspended ? "Restore Access" : "Suspend Account"}
            </button>
            <button onClick={() => setSuspendTarget(null)} className="btn-ghost px-4 py-2.5 rounded-[6px] text-sm">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <Modal title="Create Admin User" onClose={() => setShowCreateAdmin(false)}>
          <div className="space-y-3">
            {[
              { key: "name", label: "Full Name", type: "text", placeholder: "Admin Name" },
              { key: "email", label: "Email", type: "email", placeholder: "admin@geekbid.com" },
              { key: "password", label: "Password", type: "password", placeholder: "Min 6 characters" },
              { key: "adminKey", label: "Admin Key (required)", type: "password", placeholder: "Your admin access key" },
            ].map(f => (
              <label key={f.key} className="block">
                <span className="text-xs text-[#a8997e]">{f.label}</span>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={createForm[f.key as keyof typeof createForm]}
                  onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="glass-input w-full mt-1 px-3 py-2.5 rounded-[6px] text-sm"
                />
              </label>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={createAdmin} disabled={actionLoading}
                className="btn-primary flex-1 py-2.5 rounded-[6px] text-sm flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} Create Admin
              </button>
              <button onClick={() => setShowCreateAdmin(false)} className="btn-ghost px-4 py-2.5 rounded-[6px] text-sm">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-sm p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base font-semibold text-[#f0e8d4]">{title}</h3>
          <button onClick={onClose} className="p-1 text-[#a8997e] hover:text-[#f0e8d4] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
