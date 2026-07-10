"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Briefcase, DollarSign,
  AlertTriangle, Settings, ScrollText, Shield, ArrowLeft,
} from "lucide-react";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/admin/transactions", icon: DollarSign, label: "Transactions" },
  { href: "/admin/disputes", icon: AlertTriangle, label: "Disputes" },
  { href: "/admin/logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/admin/config", icon: Settings, label: "Config" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full bg-[#ffffff] border-r border-[rgba(75,63,143,0.18)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[rgba(75,63,143,0.12)]">
        <div className="h-8 w-8 rounded-xl bg-[rgba(75,63,143,0.12)] flex items-center justify-center">
          <Shield className="h-4 w-4 text-[#4b3f8f]" />
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-[#3d3a45]">GeekBid</p>
          <p className="text-[10px] text-[#6f6a7d]">Admin Console</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                active
                  ? "bg-[rgba(75,63,143,0.12)] text-[#4b3f8f] border border-[rgba(75,63,143,0.22)]"
                  : "text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[rgba(75,63,143,0.12)]">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[rgba(255,255,255,0.03)] transition-all"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to Platform
        </Link>
      </div>
    </aside>
  );
}
