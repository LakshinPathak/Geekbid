"use client";
import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import {
  Settings, Save, RefreshCw, Shield, Zap, Users,
  CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";

type PlanFees = { free: number; plus: number; premium: number };

type Config = {
  planFees: PlanFees;
  defaultDecayRate: number;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  aiEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

const defaults: Config = {
  planFees: { free: 10, plus: 7, premium: 5 },
  defaultDecayRate: 5,
  maintenanceMode: false,
  registrationOpen: true,
  aiEnabled: true,
  updatedAt: null,
  updatedBy: null,
};

const FEE_TIERS: { key: keyof PlanFees; label: string }[] = [
  { key: "free", label: "Free" },
  { key: "plus", label: "Plus" },
  { key: "premium", label: "Premium" },
];

const API_KEYS = [
  { label: "Razorpay Key ID", envVar: "RAZORPAY_KEY_ID" },
  { label: "Cloudinary Cloud", envVar: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" },
  { label: "Gemini API Key", envVar: "GEMINI_API_KEY" },
  { label: "Google Client ID", envVar: "GOOGLE_CLIENT_ID" },
  { label: "MongoDB URI", envVar: "MONGODB_URI" },
  { label: "NextAuth Secret", envVar: "NEXTAUTH_SECRET" },
];

export default function AdminConfigPage() {
  const { getValidToken } = useApp();
  const [config, setConfig] = useState<Config>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({});

  const getHeaders = useCallback(async () => {
    const token = await getValidToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getValidToken]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const headers = await getHeaders();
    const res = await fetch("/api/admin/config", { headers });
    if (res.ok) {
      const data = await res.json();
      setConfig({ ...defaults, ...data, planFees: { ...defaults.planFees, ...data.planFees } });
    }
    // Fetch env key status
    const envRes = await fetch("/api/admin/config/env-status", { headers });
    if (envRes.ok) setEnvStatus(await envRes.json());
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getHeaders]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function saveConfig() {
    setSaving(true);
    const { planFees, defaultDecayRate, maintenanceMode, registrationOpen, aiEnabled } = config;
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: await getHeaders(),
      body: JSON.stringify({ planFees, defaultDecayRate, maintenanceMode, registrationOpen, aiEnabled }),
    });
    if (res.ok) toast.success("Configuration saved");
    else toast.error("Save failed");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#3d3a45]">Platform Config</h1>
          <p className="text-sm text-[#6f6a7d]">
            {config.updatedAt
              ? `Last saved ${new Date(config.updatedAt).toLocaleString()}`
              : "No config saved yet — showing defaults"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchConfig} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs text-[#6f6a7d] border border-[rgba(75,63,143,0.18)] hover:text-[#3d3a45] hover:border-[rgba(75,63,143,0.35)] transition-all">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button onClick={saveConfig} disabled={saving}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium disabled:opacity-50">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Economics */}
      <div className="glass-panel rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2 border-b border-[rgba(75,63,143,0.12)] pb-3">
          <Zap className="h-4 w-4 text-[#4b3f8f]" />
          <span className="text-sm font-medium text-[#3d3a45]">Economics</span>
        </div>

        <div>
          <label className="text-[11px] text-[#6f6a7d] uppercase tracking-wider mb-2 block">Platform Fee % by Tier</label>
          <div className="grid grid-cols-3 gap-3">
            {FEE_TIERS.map(({ key, label }) => {
              const value = config.planFees[key];
              const outOfRange = value < 3 || value > 15;
              return (
                <div key={key}>
                  <p className="text-[11px] text-[#6f6a7d] mb-1.5">{label}</p>
                  <div className="relative">
                    <input
                      type="number" min={0} max={50} step={0.5}
                      value={value}
                      onChange={e => {
                        const next = parseFloat(e.target.value) || 0;
                        setConfig(c => ({ ...c, planFees: { ...c.planFees, [key]: next } }));
                      }}
                      className={`glass-input w-full px-3 py-2.5 rounded-2xl text-sm pr-8 ${outOfRange ? "border-[rgba(150,84,63,0.4)]" : ""}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6f6a7d]">%</span>
                  </div>
                  {outOfRange && (
                    <p className="flex items-center gap-1 text-[11px] text-[#96543f] mt-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> Outside typical 3–15% range
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#6f6a7d] mt-2">Deducted from each transaction, locked in per job at creation time</p>
        </div>

        <div>
          <label className="text-[11px] text-[#6f6a7d] uppercase tracking-wider mb-2 block">Bid Decay Rate %</label>
          <div className="relative max-w-[200px]">
            <input
              type="number" min={0} max={50} step={0.5}
              value={config.defaultDecayRate}
              onChange={e => setConfig(c => ({ ...c, defaultDecayRate: parseFloat(e.target.value) || 0 }))}
              className="glass-input w-full px-3 py-2.5 rounded-2xl text-sm pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6f6a7d]">%</span>
          </div>
          <p className="text-[11px] text-[#6f6a7d] mt-1">Per-period decay for dynamic bidding</p>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[rgba(75,63,143,0.12)] pb-3">
          <Settings className="h-4 w-4 text-[#4b3f8f]" />
          <span className="text-sm font-medium text-[#3d3a45]">Feature Flags</span>
        </div>

        {[
          { key: "maintenanceMode" as const, label: "Maintenance Mode", desc: "Blocks all user logins and shows maintenance message", danger: true },
          { key: "registrationOpen" as const, label: "Open Registration", desc: "Allow new users to sign up", danger: false },
          { key: "aiEnabled" as const, label: "AI Features", desc: "Enable AI Bid Strategist, Evaluator, Description Writer", danger: false },
        ].map(f => (
          <div key={f.key} className={`flex items-center justify-between p-3 rounded-2xl border ${
            f.key === "maintenanceMode" && config.maintenanceMode
              ? "border-[rgba(150,84,63,0.3)] bg-[rgba(150,84,63,0.05)]"
              : "border-[rgba(75,63,143,0.12)] bg-[#f4f2ee]"
          }`}>
            <div>
              <p className={`text-sm font-medium ${f.danger && config[f.key] ? "text-[#96543f]" : "text-[#3d3a45]"}`}>{f.label}</p>
              <p className="text-[11px] text-[#6f6a7d] mt-0.5">{f.desc}</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, [f.key]: !c[f.key] }))}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                config[f.key]
                  ? f.danger ? "bg-[#96543f]" : "bg-[#4b3f8f]"
                  : "bg-[rgba(75,63,143,0.18)]"
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
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[rgba(75,63,143,0.12)] pb-3">
          <Shield className="h-4 w-4 text-[#4b3f8f]" />
          <span className="text-sm font-medium text-[#3d3a45]">API Key Status</span>
          <span className="text-[11px] text-[#6f6a7d] ml-auto">Read from .env.local — edit file directly</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {API_KEYS.map(k => {
            const present = envStatus[k.envVar] ?? false;
            return (
              <div key={k.envVar} className={`flex items-center gap-2.5 p-2.5 rounded-2xl border ${
                present ? "border-[rgba(77,114,69,0.2)] bg-[rgba(77,114,69,0.04)]" : "border-[rgba(150,84,63,0.2)] bg-[rgba(150,84,63,0.04)]"
              }`}>
                {present
                  ? <CheckCircle className="h-3.5 w-3.5 text-[#4d7245] shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-[#96543f] shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs text-[#3d3a45] font-medium truncate">{k.label}</p>
                  <p className="text-[10px] font-mono text-[#6f6a7d] truncate">{k.envVar}</p>
                </div>
                <span className={`ml-auto text-[10px] font-medium shrink-0 ${present ? "text-[#4d7245]" : "text-[#96543f]"}`}>
                  {present ? "SET" : "MISSING"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Info */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex items-center gap-2 border-b border-[rgba(75,63,143,0.12)] pb-3 mb-4">
          <Users className="h-4 w-4 text-[#4b3f8f]" />
          <span className="text-sm font-medium text-[#3d3a45]">Platform Info</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: "Platform", value: "GeekBid v12" },
            { label: "Environment", value: process.env.NODE_ENV ?? "development" },
            { label: "Admin Key", value: "••••••••" },
          ].map(i => (
            <div key={i.label} className="p-2.5 bg-[#f4f2ee] rounded-2xl">
              <p className="text-[#6f6a7d] mb-0.5">{i.label}</p>
              <p className="text-[#3d3a45] font-mono">{i.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
