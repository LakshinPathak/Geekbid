"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import {
  Settings, Save, RefreshCw, Shield, Zap, Users,
  CheckCircle, XCircle,
} from "lucide-react";

type Config = {
  platformFeePercent: number;
  defaultDecayRate: number;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  aiEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

const defaults: Config = {
  platformFeePercent: 10,
  defaultDecayRate: 5,
  maintenanceMode: false,
  registrationOpen: true,
  aiEnabled: true,
  updatedAt: null,
  updatedBy: null,
};

const API_KEYS = [
  { label: "Razorpay Key ID", envVar: "RAZORPAY_KEY_ID" },
  { label: "Cloudinary Cloud", envVar: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" },
  { label: "Gemini API Key", envVar: "GEMINI_API_KEY" },
  { label: "Google Client ID", envVar: "GOOGLE_CLIENT_ID" },
  { label: "MongoDB URI", envVar: "MONGODB_URI" },
  { label: "NextAuth Secret", envVar: "NEXTAUTH_SECRET" },
];

export default function AdminConfigPage() {
  const { auth } = useApp();
  const [config, setConfig] = useState<Config>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});

  const headers = {
    "Content-Type": "application/json",
    ...(auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/config", { headers });
    if (res.ok) {
      const data = await res.json();
      setConfig({ ...defaults, ...data });
    }
    // Fetch env key status
    const envRes = await fetch("/api/admin/config/env-status", { headers });
    if (envRes.ok) setEnvStatus(await envRes.json());
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.accessToken]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function saveConfig() {
    setSaving(true);
    const { platformFeePercent, defaultDecayRate, maintenanceMode, registrationOpen, aiEnabled } = config;
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ platformFeePercent, defaultDecayRate, maintenanceMode, registrationOpen, aiEnabled }),
    });
    if (res.ok) toast.success("Configuration saved");
    else toast.error("Save failed");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#f0e8d4]">Platform Config</h1>
          <p className="text-sm text-[#a8997e]">
            {config.updatedAt
              ? `Last saved ${new Date(config.updatedAt).toLocaleString()}`
              : "No config saved yet — showing defaults"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchConfig} className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs text-[#a8997e] border border-[rgba(201,168,76,0.18)] hover:text-[#f0e8d4] hover:border-[rgba(201,168,76,0.35)] transition-all">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button onClick={saveConfig} disabled={saving}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Economics */}
      <div className="glass-panel rounded-[6px] p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[rgba(201,168,76,0.12)] pb-3">
          <Zap className="h-4 w-4 text-[#c9a84c]" />
          <span className="text-sm font-medium text-[#f0e8d4]">Economics</span>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="text-[11px] text-[#a8997e] uppercase tracking-wider mb-2 block">Platform Fee %</label>
            <div className="relative">
              <input
                type="number" min={0} max={50} step={0.5}
                value={config.platformFeePercent}
                onChange={e => setConfig(c => ({ ...c, platformFeePercent: parseFloat(e.target.value) || 0 }))}
                className="glass-input w-full px-3 py-2.5 rounded-[6px] text-sm pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a8997e]">%</span>
            </div>
            <p className="text-[11px] text-[#a8997e] mt-1">Deducted from each transaction</p>
          </div>
          <div>
            <label className="text-[11px] text-[#a8997e] uppercase tracking-wider mb-2 block">Bid Decay Rate %</label>
            <div className="relative">
              <input
                type="number" min={0} max={50} step={0.5}
                value={config.defaultDecayRate}
                onChange={e => setConfig(c => ({ ...c, defaultDecayRate: parseFloat(e.target.value) || 0 }))}
                className="glass-input w-full px-3 py-2.5 rounded-[6px] text-sm pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a8997e]">%</span>
            </div>
            <p className="text-[11px] text-[#a8997e] mt-1">Per-period decay for dynamic bidding</p>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="glass-panel rounded-[6px] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[rgba(201,168,76,0.12)] pb-3">
          <Settings className="h-4 w-4 text-[#c9a84c]" />
          <span className="text-sm font-medium text-[#f0e8d4]">Feature Flags</span>
        </div>

        {[
          { key: "maintenanceMode" as const, label: "Maintenance Mode", desc: "Blocks all user logins and shows maintenance message", danger: true },
          { key: "registrationOpen" as const, label: "Open Registration", desc: "Allow new users to sign up", danger: false },
          { key: "aiEnabled" as const, label: "AI Features", desc: "Enable AI Bid Strategist, Evaluator, Description Writer", danger: false },
        ].map(f => (
          <div key={f.key} className={`flex items-center justify-between p-3 rounded-[6px] border ${
            f.key === "maintenanceMode" && config.maintenanceMode
              ? "border-[rgba(229,115,115,0.3)] bg-[rgba(229,115,115,0.05)]"
              : "border-[rgba(201,168,76,0.12)] bg-[#111625]"
          }`}>
            <div>
              <p className={`text-sm font-medium ${f.danger && config[f.key] ? "text-[#e57373]" : "text-[#f0e8d4]"}`}>{f.label}</p>
              <p className="text-[11px] text-[#a8997e] mt-0.5">{f.desc}</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, [f.key]: !c[f.key] }))}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                config[f.key]
                  ? f.danger ? "bg-[#e57373]" : "bg-[#c9a84c]"
                  : "bg-[rgba(201,168,76,0.18)]"
              }`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                config[f.key] ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* API Key Status */}
      <div className="glass-panel rounded-[6px] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[rgba(201,168,76,0.12)] pb-3">
          <Shield className="h-4 w-4 text-[#c9a84c]" />
          <span className="text-sm font-medium text-[#f0e8d4]">API Key Status</span>
          <span className="text-[11px] text-[#a8997e] ml-auto">Read from .env.local — edit file directly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {API_KEYS.map(k => {
            const present = envStatus[k.envVar] ?? false;
            return (
              <div key={k.envVar} className={`flex items-center gap-2.5 p-2.5 rounded-[6px] border ${
                present ? "border-[rgba(76,175,125,0.2)] bg-[rgba(76,175,125,0.04)]" : "border-[rgba(229,115,115,0.2)] bg-[rgba(229,115,115,0.04)]"
              }`}>
                {present
                  ? <CheckCircle className="h-3.5 w-3.5 text-[#4caf7d] shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-[#e57373] shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs text-[#f0e8d4] font-medium truncate">{k.label}</p>
                  <p className="text-[10px] font-mono text-[#a8997e] truncate">{k.envVar}</p>
                </div>
                <span className={`ml-auto text-[10px] font-medium shrink-0 ${present ? "text-[#4caf7d]" : "text-[#e57373]"}`}>
                  {present ? "SET" : "MISSING"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Info */}
      <div className="glass-panel rounded-[6px] p-5">
        <div className="flex items-center gap-2 border-b border-[rgba(201,168,76,0.12)] pb-3 mb-4">
          <Users className="h-4 w-4 text-[#c9a84c]" />
          <span className="text-sm font-medium text-[#f0e8d4]">Platform Info</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: "Platform", value: "GeekBid v10" },
            { label: "Environment", value: process.env.NODE_ENV ?? "development" },
            { label: "Admin Key", value: "lakshin123 (masked)" },
          ].map(i => (
            <div key={i.label} className="p-2.5 bg-[#111625] rounded-[6px]">
              <p className="text-[#a8997e] mb-0.5">{i.label}</p>
              <p className="text-[#f0e8d4] font-mono">{i.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
