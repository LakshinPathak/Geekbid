"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Zap, LayoutGrid, MessageSquare, Bell, User, ChevronDown,
  LogOut, Settings, Briefcase, PlusCircle, DollarSign, Shield, CreditCard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: LayoutGrid },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell, hasBadge: true },
];

export default function Navbar() {
  const { currentUser, unreadCount, logout, mounted } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  if (!mounted || !currentUser) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-[#1E1E2A] bg-[#0A0A0F]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00FF88] text-[#0A0A0F] group-hover:shadow-[0_0_12px_rgba(0,255,136,0.3)] transition-shadow">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-base font-extrabold text-[#E8E8EC] hidden sm:block">
            Geek<span className="text-[#8A8A9A]">Bid</span>
          </span>
          <span className="hidden sm:flex text-[10px] px-1.5 py-0.5 rounded-md border border-[#1E1E2A] text-[#55556A] font-medium">
            BETA
          </span>
        </Link>

        {/* Center nav */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`relative flex items-center gap-1.5 text-sm font-medium h-9 px-3 rounded-lg transition-colors ${
                    isActive
                      ? "text-[#00FF88] bg-[#00FF88]/10"
                      : "text-[#55556A] hover:text-[#E8E8EC] hover:bg-[#12121A]"
                  }`}>
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.hasBadge && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00FF88] text-[10px] font-bold text-[#0A0A0F] px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 hover:bg-[#12121A] rounded-lg transition-colors outline-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00FF88]/10 text-sm font-bold text-[#00FF88]">
                {currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-[#E8E8EC] leading-tight">{currentUser.fullName}</span>
                <span className="text-[10px] text-[#55556A] capitalize">{currentUser.role}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#55556A]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[200] bg-[#12121A] border border-[#1E1E2A] shadow-xl shadow-black/50 rounded-xl p-1.5" sideOffset={8}>
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-[#E8E8EC]">{currentUser.fullName}</p>
              <p className="text-xs text-[#55556A] mt-0.5">{currentUser.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-[#1E1E2A]" />
            <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
              <User className="h-4 w-4 mr-2.5 text-[#55556A]" /> Profile
            </DropdownMenuItem>
            {currentUser.role === "client" && (
              <DropdownMenuItem onClick={() => router.push("/post-job")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
                <PlusCircle className="h-4 w-4 mr-2.5 text-[#55556A]" /> Post a Job
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push("/my-jobs")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
              <Briefcase className="h-4 w-4 mr-2.5 text-[#55556A]" /> My Jobs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/earnings")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
              <DollarSign className="h-4 w-4 mr-2.5 text-[#55556A]" /> Earnings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/payments")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
              <CreditCard className="h-4 w-4 mr-2.5 text-[#55556A]" /> Payments
            </DropdownMenuItem>
            {currentUser.role === "admin" && (
              <DropdownMenuItem onClick={() => router.push("/admin")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
                <Shield className="h-4 w-4 mr-2.5 text-[#00FF88]" /> Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-lg cursor-pointer py-2.5 text-[#8A8A9A] hover:text-[#E8E8EC] focus:text-[#E8E8EC] focus:bg-[#1A1A24]">
              <Settings className="h-4 w-4 mr-2.5 text-[#55556A]" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1E1E2A]" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer py-2.5 text-red-400 focus:text-red-400 focus:bg-red-500/10">
              <LogOut className="h-4 w-4 mr-2.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
