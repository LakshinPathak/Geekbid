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
 transition: "border-color 0.3s ease",
 }}
 >
 <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4 sm:px-6">
 {/* Logo */}
 <Link href="/feed" className="flex items-center gap-2.5 group">
 <div
 className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#c9a84c] text-[#080b14]"
 >
 <Zap className="h-4 w-4" />
 </div>
 <span className="text-base font-extrabold text-[#f0e8d4] hidden sm:block font-heading">
 Geek<span className="text-[#a8997e]">Bid</span>
 </span>
 </Link>

 {/* Center nav — desktop */}
 <nav className="hidden md:flex items-center gap-1">
 {NAV_ITEMS.map((item) => {
 const isActive = pathname === item.href;
 return (
 <Link key={item.href} href={item.href}>
 <button
 className={`relative flex items-center gap-1.5 text-sm font-medium h-9 px-3 rounded-[3px] transition-all duration-300 ${
 isActive ? "nav-link-active" : "text-[#6b5f45] hover:text-[#f0e8d4] hover:bg-[#111625]"
 }`}
 >
 <item.icon className="h-4 w-4" />
 <span>{item.label}</span>
 {item.hasBadge && unreadCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a84c] text-[11px] font-bold text-[#080b14] px-1 animate-pulse">
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
 <button className="flex items-center gap-2 h-9 px-2 hover:bg-[#111625] rounded-[3px] transition-colors outline-none">
 <div
 className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#c9a84c]"
 style={{
 background: "rgba(201,168,76,0.12)",
 border: "0.5px solid rgba(201,168,76,0.22)",
 }}
 >
 {currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
 </div>
 <div className="hidden md:flex flex-col items-start">
 <span className="text-sm font-semibold text-[#f0e8d4] leading-tight">{currentUser.fullName}</span>
 <span className="text-[11px] text-[#6b5f45] capitalize">{currentUser.role}</span>
 </div>
 <ChevronDown className="h-3.5 w-3.5 text-[#6b5f45]" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent
 align="end"
 className="w-56 z-[200] bg-[#0d1120] border border-[rgba(201,168,76,0.22)] rounded-[6px] p-1.5"
 sideOffset={8}
 >
 <div className="px-3 py-2.5">
 <p className="text-sm font-semibold text-[#f0e8d4]">{currentUser.fullName}</p>
 <p className="text-xs text-[#6b5f45] mt-0.5">{currentUser.email}</p>
 </div>
 <DropdownMenuSeparator className="bg-[rgba(201,168,76,0.15)]" />
 <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <User className="h-4 w-4 mr-2.5 text-[#6b5f45]" /> Profile
 </DropdownMenuItem>
 {currentUser.role === "client" && (
 <DropdownMenuItem onClick={() => router.push("/post-job")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <PlusCircle className="h-4 w-4 mr-2.5 text-[#6b5f45]" /> Post a Job
 </DropdownMenuItem>
 )}
 <DropdownMenuItem onClick={() => router.push("/my-jobs")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <Briefcase className="h-4 w-4 mr-2.5 text-[#6b5f45]" /> My Jobs
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => router.push("/earnings")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <DollarSign className="h-4 w-4 mr-2.5 text-[#6b5f45]" /> Earnings
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => router.push("/payments")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <CreditCard className="h-4 w-4 mr-2.5 text-[#6b5f45]" /> Payments
 </DropdownMenuItem>
 {currentUser.role === "admin" && (
 <DropdownMenuItem onClick={() => router.push("/admin")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <Shield className="h-4 w-4 mr-2.5 text-[#c9a84c]" /> Admin Panel
 </DropdownMenuItem>
 )}
 <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-[3px] cursor-pointer py-2.5 text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] focus:text-[#f0e8d4] focus:bg-[#111625]">
 <Settings className="h-4 w-4 mr-2.5 text-[#6b5f45]" /> Settings
 </DropdownMenuItem>
 <DropdownMenuSeparator className="bg-[rgba(201,168,76,0.15)]" />
 <DropdownMenuItem onClick={handleLogout} className="rounded-[3px] cursor-pointer py-2.5 text-[#e57373] focus:text-[#e57373] focus:bg-[rgba(192,57,43,0.2)]">
 <LogOut className="h-4 w-4 mr-2.5" /> Sign Out
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Mobile hamburger */}
 <button
 className="md:hidden flex items-center justify-center h-9 w-9 rounded-[3px] text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] transition-colors"
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
 className="absolute inset-0 bg-black/60 "
 onClick={() => setMobileOpen(false)}
 />
 {/* Drawer panel */}
 <div className="absolute right-0 top-0 h-full w-[85vw] max-w-sm mobile-nav-overlay animate-slide-in-right flex flex-col">
 {/* Drawer header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(201,168,76,0.22)]">
 <div className="flex items-center gap-2.5">
 <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-[#c9a84c] text-[#080b14]">
 <Zap className="h-3.5 w-3.5" />
 </div>
 <span className="text-base font-extrabold text-[#f0e8d4] font-heading">GeekBid</span>
 </div>
 <button
 className="h-8 w-8 flex items-center justify-center rounded-[3px] text-[#6b5f45] hover:text-[#f0e8d4] hover:bg-[#111625] transition-colors"
 onClick={() => setMobileOpen(false)}
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 {/* User info */}
 <div className="px-6 py-4 border-b border-[rgba(201,168,76,0.22)]">
 <div className="flex items-center gap-3">
 <div
 className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-[#c9a84c] shrink-0"
 style={{ background: "rgba(201,168,76,0.12)", border: "0.5px solid rgba(201,168,76,0.22)" }}
 >
 {currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
 </div>
 <div>
 <p className="text-sm font-semibold text-[#f0e8d4]">{currentUser.fullName}</p>
 <p className="text-xs text-[#6b5f45] capitalize">{currentUser.role} · {currentUser.email}</p>
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
 className={`relative flex items-center gap-3 px-4 py-3.5 rounded-[3px] text-sm font-medium transition-all duration-200 ${
 isActive
 ? "bg-[#c9a84c] text-[#080b14] border border-transparent"
 : "text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625]"
 }`}
 >
 <item.icon className="h-5 w-5" />
 {item.label}
 {item.hasBadge && unreadCount > 0 && (
 <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c9a84c] text-[11px] font-bold text-[#080b14] px-1">
 {unreadCount > 9 ? "9+" : unreadCount}
 </span>
 )}
 </div>
 </Link>
 );
 })}

 <div className="border-t border-[rgba(201,168,76,0.22)] my-2 pt-2">
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
 <div className="flex items-center gap-3 px-4 py-3.5 rounded-[3px] text-sm font-medium text-[#a8997e] hover:text-[#f0e8d4] hover:bg-[#111625] transition-all duration-200">
 <item.icon className="h-5 w-5" />
 {item.label}
 </div>
 </Link>
 ))}
 </div>
 </nav>

 {/* Sign out */}
 <div className="px-4 py-4 border-t border-[rgba(201,168,76,0.22)]">
 <button
 onClick={() => { setMobileOpen(false); handleLogout(); }}
 className="flex items-center gap-3 w-full px-4 py-3.5 rounded-[3px] text-sm font-medium text-[#e57373] hover:bg-[rgba(192,57,43,0.2)] transition-colors"
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
