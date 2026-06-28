"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useState, useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Zap, LayoutGrid, MessageSquare, Bell, User, ChevronDown,
  LogOut, Settings, Briefcase, PlusCircle, DollarSign, Shield,
  CreditCard, X, Menu,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (!mounted || !currentUser) return null;

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <header
        className="nav-glass w-full"
        style={{
          boxShadow: scrolled ? "0 4px 16px rgba(24,39,57,0.10)" : "none",
          transition: "box-shadow 0.3s ease",
        }}
      >
        <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2.5 group">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C8923D] text-white animate-pulse-glow"
              style={{ transition: "box-shadow 0.3s ease" }}
            >
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-base font-extrabold text-[#0F1924] hidden sm:block font-heading">
              Geek<span className="text-[#253444]">Bid</span>
            </span>
            <span className="hidden sm:flex text-[11px] px-1.5 py-0.5 rounded-md border border-[#BEB5A5] text-[#4A5568] font-medium">
              BETA
            </span>
          </Link>

          {/* Center nav — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`relative flex items-center gap-1.5 text-sm font-medium h-9 px-3 rounded-lg transition-all duration-300 ${
                      isActive ? "nav-link-active" : "text-[#5A6775] hover:text-[#0F1924] hover:bg-[#D8D0C0]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.hasBadge && unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C8923D] text-[11px] font-bold text-white px-1 animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* User menu — desktop */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 h-9 px-2 hover:bg-[#D8D0C0] rounded-lg transition-colors outline-none">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#C8923D]"
                      style={{
                        background: "rgba(200,146,61,0.10)",
                        border: "2px solid rgba(200,146,61,0.30)",
                      }}
                    >
                      {currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-semibold text-[#0F1924] leading-tight">{currentUser.fullName}</span>
                      <span className="text-[11px] text-[#4A5568] capitalize">{currentUser.role}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-[#4A5568]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 z-[200] bg-[#EDE8DC] border border-[#BEB5A5] shadow-xl shadow-black/10 rounded-xl p-1.5"
                  sideOffset={8}
                >
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-[#0F1924]">{currentUser.fullName}</p>
                    <p className="text-xs text-[#4A5568] mt-0.5">{currentUser.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-[#BEB5A5]" />
                  <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                    <User className="h-4 w-4 mr-2.5 text-[#4A5568]" /> Profile
                  </DropdownMenuItem>
                  {currentUser.role === "client" && (
                    <DropdownMenuItem onClick={() => router.push("/post-job")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                      <PlusCircle className="h-4 w-4 mr-2.5 text-[#4A5568]" /> Post a Job
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push("/my-jobs")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                    <Briefcase className="h-4 w-4 mr-2.5 text-[#4A5568]" /> My Jobs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/earnings")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                    <DollarSign className="h-4 w-4 mr-2.5 text-[#4A5568]" /> Earnings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/payments")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                    <CreditCard className="h-4 w-4 mr-2.5 text-[#4A5568]" /> Payments
                  </DropdownMenuItem>
                  {currentUser.role === "admin" && (
                    <DropdownMenuItem onClick={() => router.push("/admin")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                      <Shield className="h-4 w-4 mr-2.5 text-[#C8923D]" /> Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-lg cursor-pointer py-2.5 text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] focus:text-[#0F1924] focus:bg-[#D8D0C0]">
                    <Settings className="h-4 w-4 mr-2.5 text-[#4A5568]" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#BEB5A5]" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer py-2.5 text-[#B02020] focus:text-[#B02020] focus:bg-[rgba(176,32,32,0.08)]">
                    <LogOut className="h-4 w-4 mr-2.5" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-in Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[300] md:hidden animate-scale-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute right-0 top-0 h-full w-[85vw] max-w-sm mobile-nav-overlay animate-slide-in-right flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#BEB5A5]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C8923D] text-white">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-base font-extrabold text-[#0F1924] font-heading">GeekBid</span>
              </div>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[#5A6775] hover:text-[#0F1924] hover:bg-[#D8D0C0] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b border-[#BEB5A5]">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-[#C8923D] shrink-0"
                  style={{ background: "rgba(200,146,61,0.1)", border: "2px solid rgba(200,146,61,0.3)" }}
                >
                  {currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F1924]">{currentUser.fullName}</p>
                  <p className="text-xs text-[#4A5568] capitalize">{currentUser.role} · {currentUser.email}</p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div
                      className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#7A5218] text-white border border-transparent"
                          : "text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0]"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                      {item.hasBadge && unreadCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C8923D] text-[11px] font-bold text-white px-1">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}

              <div className="border-t border-[#BEB5A5] my-2 pt-2">
                {[
                  { href: "/profile", label: "Profile", icon: User },
                  { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
                  { href: "/earnings", label: "Earnings", icon: DollarSign },
                  { href: "/payments", label: "Payments", icon: CreditCard },
                  { href: "/settings", label: "Settings", icon: Settings },
                  ...(currentUser.role === "client" ? [{ href: "/post-job", label: "Post a Job", icon: PlusCircle }] : []),
                  ...(currentUser.role === "admin" ? [{ href: "/admin", label: "Admin Panel", icon: Shield }] : []),
                ].map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-[#253444] hover:text-[#0F1924] hover:bg-[#D8D0C0] transition-all duration-200">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Sign out */}
            <div className="px-4 py-4 border-t border-[#BEB5A5]">
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-[#B02020] hover:bg-[rgba(176,32,32,0.08)] transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
