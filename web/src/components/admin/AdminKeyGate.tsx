"use client";
import { useState } from "react";
import { Shield, Lock, Loader2, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";

interface Props {
  onVerified: () => void;
}

export default function AdminKeyGate({ onVerified }: Props) {
  const { auth } = useApp();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
        },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        sessionStorage.setItem("admin_verified", "true");
        onVerified();
      } else {
        setError(data.error ?? "Invalid admin key");
        setKey("");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff]/95 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm mx-4 overflow-hidden animate-scale-in">
        {/* Gold accent top strip */}
        <div className="h-0.5 w-full bg-[#4b3f8f]" />
        <div className="p-8">
        <div className="flex flex-col items-center text-center mb-6">
          {/* GeekBid Logo */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4b3f8f] text-[#ffffff] text-sm font-black font-sans">
              G
            </div>
            <span className="text-lg font-bold tracking-[0.03em] font-sans text-[#3d3a45]">
              GeekBid
            </span>
          </div>
          <div className="h-14 w-14 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.22)] flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-[#4b3f8f]" />
          </div>
          <h2 className="font-heading text-xl text-[#3d3a45]">Admin Access Required</h2>
          <p className="text-sm text-[#6f6a7d] mt-1.5">Enter your admin access key to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2.5 glass-input rounded-2xl px-3 py-3">
            <Lock className="h-4 w-4 text-[#6f6a7d] shrink-0" />
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Enter your secret admin key"
              autoFocus
              className="flex-1 bg-transparent text-sm text-[#3d3a45] placeholder:text-[#6f6a7d]/50 outline-none border-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[rgba(193,77,58,0.08)] border border-[rgba(193,77,58,0.2)]">
              <AlertTriangle className="h-4 w-4 text-[#96543f] shrink-0" />
              <p className="text-xs text-[#96543f]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="btn-primary w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? "Verifying..." : "Enter Admin Panel"}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#6f6a7d]/60 mt-4">
          This key is separate from your login password. Session expires on browser close.
        </p>
        </div>
      </div>
    </div>
  );
}
