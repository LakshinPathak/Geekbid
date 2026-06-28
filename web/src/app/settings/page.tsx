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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(newKeyValue);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
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
    <div className="min-h-screen bg-[#EDE8DC] grid-bg flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#C8923D]/40 border-t-[#C8923D] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#EDE8DC] grid-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-[#253444] text-sm hover:text-[#C8923D] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <div className="animate-fade-in-up">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#0F1924]">API Settings</h1>
          <p className="text-[#253444] text-sm mt-1">Manage your API keys for programmatic access</p>
        </div>

        {/* Create key */}
        <div className="glass-card mt-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <h2 className="font-heading text-lg font-semibold text-[#0F1924] mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#C8923D]" /> Generate API Key
          </h2>
          <div className="flex gap-2">
            <input
              value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createKey()}
              placeholder="Key name (e.g. Production, CI/CD)"
              className="glass-input flex-1 h-11 rounded-xl text-sm"
            />
            <button onClick={createKey} disabled={creating || !newKeyName.trim()}
              className="btn-primary h-11 px-4 sm:px-6 rounded-xl text-sm payment-ready disabled:opacity-40">
              {creating ? "Generating..." : "Generate"}
            </button>
          </div>

          {newKeyValue && (
            <div className="mt-4 bg-yellow-500/5 border border-[rgba(122,82,24,0.25)] rounded-xl p-4 animate-fade-in-up">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-[#7A5218]" />
                <p className="text-[#7A5218] text-xs font-semibold">Copy this key now — it won&apos;t be shown again</p>
              </div>
              <div className="flex gap-2">
                <code className="settings-key-display flex-1 break-all">
                  {newKeyValue}
                </code>
                <button onClick={handleCopy}
                  className={`h-10 px-3 rounded-lg transition-all self-start ${
                    copied ? "bg-[#C8923D]/20 text-[#C8923D] border border-[#C8923D]/40" : "btn-glass"
                  }`}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing keys */}
        <div className="glass-card mt-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h2 className="font-heading text-lg font-semibold text-[#0F1924] mb-4 flex items-center gap-2">
            <Key className="h-4 w-4 text-[#C8923D]" /> Active Keys
            <span className="text-xs font-normal text-[#4A5568] bg-[#D8D0C0] px-2 py-0.5 rounded-full">{keys.length}</span>
          </h2>

          {keys.length === 0 ? (
            <div className="py-6 text-center">
              <Key className="h-8 w-8 text-[#4A5568] mx-auto mb-2" />
              <p className="text-[#4A5568] text-sm">No API keys yet. Generate one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map(k => (
                <div key={k.id} className="tx-row flex items-center justify-between rounded-xl p-4 transition-colors">
                  <div>
                    <p className="text-[#0F1924] text-sm font-medium">{k.name}</p>
                    <p className="text-[#4A5568] text-xs font-mono mt-0.5 terminal-amount">{k.prefix}•••••••</p>
                    <div className="flex items-center gap-3 mt-1 text-[#4A5568] text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Created {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                      {k.lastUsedAt && (
                        <span className="text-[#253444]">Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => revokeKey(k.id)}
                    className="text-[#B02020]/60 hover:text-[#B02020] transition-colors p-2 rounded-lg hover:bg-[rgba(176,32,32,0.08)]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Docs */}
        <div className="glass-card mt-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <h2 className="font-heading text-lg font-semibold text-[#0F1924] mb-4 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[#C8923D]" /> API Documentation
          </h2>
          <div className="space-y-3">
            <div className="glass-panel-sm rounded-xl p-4">
              <p className="text-[#C8923D] text-xs font-mono mb-1 terminal-amount">GET /api/v1/jobs</p>
              <p className="text-[#253444] text-sm">List jobs. Query params: status, category, page, limit</p>
              <code className="block mt-2 text-[#4A5568] text-xs font-mono bg-[#EDE8DC]/50 rounded-lg px-3 py-2">
                curl -H &quot;X-API-Key: gbk_your_key&quot; /api/v1/jobs?status=open&amp;limit=10
              </code>
            </div>
            <div className="glass-panel-sm rounded-xl p-4">
              <p className="text-[#C8923D] text-xs font-mono mb-1 terminal-amount">POST /api/v1/jobs</p>
              <p className="text-[#253444] text-sm">Create a new job. Body: title, startingPrice, minimumPrice, etc.</p>
              <code className="block mt-2 text-[#4A5568] text-xs font-mono bg-[#EDE8DC]/50 rounded-lg px-3 py-2">
                curl -X POST -H &quot;X-API-Key: gbk_your_key&quot; -d &#123;&quot;title&quot;:&quot;...&quot;&#125; /api/v1/jobs
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
