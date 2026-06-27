"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import {
  Key, Plus, Trash2, ArrowLeft, Copy, AlertTriangle, Clock, Code2,
} from "lucide-react";
import Link from "next/link";

type ApiKeyItem = { id: string; name: string; prefix: string; lastUsedAt?: string; createdAt: string };

export default function SettingsPage() {
  const { currentUser, mounted } = useApp();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const loadKeys = useCallback(async () => {
    const token = localStorage.getItem("gb_access_token");
    const res = await fetch("/api/keys", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setKeys(await res.json());
  }, []);

  useEffect(() => { if (mounted && currentUser) loadKeys(); }, [mounted, currentUser, loadKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const token = localStorage.getItem("gb_access_token");
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newKeyName }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.error) { toast.error(data.error); return; }
    setNewKeyValue(data.key);
    setNewKeyName("");
    toast.success("API key created! Copy it now — you won't see it again.");
    await loadKeys();
  };

  const revokeKey = async (id: string) => {
    const token = localStorage.getItem("gb_access_token");
    const res = await fetch(`/api/keys?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    toast.success("Key revoked");
    await loadKeys();
  };

  if (!mounted) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#8A8A9A] text-sm hover:text-[#00FF88] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#E8E8EC]">API Settings</h1>
        <p className="text-[#8A8A9A] text-sm mt-1">Manage your API keys for programmatic access</p>

        {/* Create key */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 mt-8">
          <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#00FF88]" /> Generate API Key
          </h2>
          <div className="flex gap-2">
            <input
              value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production, CI/CD)"
              className="flex-1 h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#6E6E85] focus:border-[#00FF88]/50 outline-none transition-all"
            />
            <button onClick={createKey} disabled={creating || !newKeyName.trim()}
              className="h-11 px-6 bg-[#00FF88] text-[#0A0A0F] font-semibold rounded-xl text-sm hover:bg-[#00CC6A] transition-all disabled:opacity-40">
              {creating ? "Generating..." : "Generate"}
            </button>
          </div>

          {newKeyValue && (
            <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <p className="text-yellow-500 text-xs font-semibold">Copy this key now — it won't be shown again</p>
              </div>
              <div className="flex gap-2">
                <code className="flex-1 bg-[#0A0A0F] border border-[#1E1E2A] rounded-lg p-3 text-[#00FF88] text-sm font-mono break-all">
                  {newKeyValue}
                </code>
                <button onClick={() => { navigator.clipboard.writeText(newKeyValue); toast.success("Copied!"); }}
                  className="h-10 px-3 border border-[#1E1E2A] text-[#8A8A9A] rounded-lg hover:bg-[#1A1A24] transition-all self-start">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing keys */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 mt-6">
          <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-4 flex items-center gap-2">
            <Key className="h-4 w-4 text-[#00FF88]" /> Active Keys ({keys.length})
          </h2>

          {keys.length === 0 ? (
            <p className="text-[#6E6E85] text-sm">No API keys yet. Generate one above.</p>
          ) : (
            <div className="space-y-3">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4">
                  <div>
                    <p className="text-[#E8E8EC] text-sm font-medium">{k.name}</p>
                    <p className="text-[#6E6E85] text-xs font-mono mt-0.5">{k.prefix}</p>
                    <div className="flex items-center gap-3 mt-1 text-[#6E6E85] text-xs">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Created {new Date(k.createdAt).toLocaleDateString()}</span>
                      {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button onClick={() => revokeKey(k.id)}
                    className="text-red-400 hover:text-red-300 transition-colors p-2">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Docs */}
        <div className="bg-[#12121A] border border-[#1E1E2A] rounded-2xl p-6 mt-6">
          <h2 className="font-heading text-lg font-semibold text-[#E8E8EC] mb-4 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[#00FF88]" /> API Documentation
          </h2>
          <div className="space-y-4">
            <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4">
              <p className="text-[#00FF88] text-xs font-mono mb-1">GET /api/v1/jobs</p>
              <p className="text-[#8A8A9A] text-sm">List jobs. Query params: status, category, page, limit</p>
              <code className="block mt-2 text-[#6E6E85] text-xs font-mono">
                curl -H &quot;X-API-Key: gbk_your_key&quot; /api/v1/jobs?status=open&limit=10
              </code>
            </div>
            <div className="bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl p-4">
              <p className="text-[#00FF88] text-xs font-mono mb-1">POST /api/v1/jobs</p>
              <p className="text-[#8A8A9A] text-sm">Create a new job. Body: title, startingPrice, minimumPrice, etc.</p>
              <code className="block mt-2 text-[#6E6E85] text-xs font-mono">
                curl -X POST -H &quot;X-API-Key: gbk_your_key&quot; -d &#123;&quot;title&quot;:&quot;...&quot;&#125; /api/v1/jobs
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
