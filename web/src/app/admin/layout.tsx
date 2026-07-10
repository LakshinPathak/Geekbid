"use client";
import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import AdminKeyGate from "@/components/admin/AdminKeyGate";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Shield, Lock } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, mounted } = useApp();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("admin_verified") === "true") {
      setVerified(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fbfaf7] grid-bg">
        <div className="h-8 w-8 border-2 border-[rgba(75,63,143,0.40)] border-t-[#4b3f8f] rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fbfaf7] grid-bg">
        <div className="glass-panel p-8 text-center max-w-md animate-scale-in">
          <Shield className="mx-auto h-12 w-12 text-[#6f6a7d] mb-3" />
          <h2 className="font-heading text-xl font-bold text-[#3d3a45] mb-2">Admin Access Required</h2>
          <p className="text-sm text-[#6f6a7d]">You must be logged in as an admin to access this area.</p>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] grid-bg">
        <AdminKeyGate onVerified={() => setVerified(true)} />
      </div>
    );
  }

  function lockSession() {
    sessionStorage.removeItem("admin_verified");
    setVerified(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-[#fbfaf7]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Admin top bar */}
        <header className="shrink-0 flex items-center justify-between px-6 py-3 bg-[#ffffff] border-b border-[rgba(75,63,143,0.18)]">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#4d7245] animate-pulse" />
            <span className="text-[11px] text-[#6f6a7d] font-mono tracking-wider">ADMIN SESSION ACTIVE</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6f6a7d]">{currentUser.email}</span>
            <button
              onClick={lockSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-[#6f6a7d] border border-[rgba(75,63,143,0.18)] hover:text-[#3d3a45] hover:border-[rgba(75,63,143,0.35)] transition-all"
            >
              <Lock className="h-3 w-3" />
              Lock
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto grid-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
