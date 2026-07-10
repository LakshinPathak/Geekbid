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
 LayoutGrid, MessageSquare, Bell, User, ChevronDown,
 LogOut, Settings, Briefcase, PlusCircle, DollarSign, Shield,
 CreditCard, X, Menu, Repeat,
} from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";
import { toast } from "sonner";

const NAV_ITEMS = [
 { href: "/feed", label: "Feed", icon: LayoutGrid },
 { href: "/inbox", label: "Inbox", icon: MessageSquare },
 { href: "/notifications", label: "Notifications", icon: Bell, hasBadge: true },
];

export default function Navbar() {
 const { currentUser, unreadCount, logout, mounted, switchRole } = useApp();
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

 const otherRoles = (currentUser.roles ?? [currentUser.role]).filter(r => r !== currentUser.role && r !== "admin");

 const handleSwitchRole = async (role: "freelancer" | "client") => {
 const result = await switchRole(role);
 if (result.ok) {
 toast.success(`Switched to ${role}`);
 router.push("/feed");
 router.refresh();
 } else {
 toast.error("Couldn't switch role", { description: result.message });
 }
 };

 return (
 <>
 <header
 className="nav-glass w-full"
 style={{
 transition: "border-color 0.3s ease",
 }}
 >
 <div className="mx-auto max-w-[1600px] flex h-14 items-center justify-between px-4 sm:px-6">
 {/* Logo */}
 <Link href="/feed" className="flex items-center gap-2.5">
 <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4b3f8f] text-[#ffffff] text-xs font-black font-sans">
 G
 </div>
 <span className="text-sm font-bold tracking-[0.03em] font-sans text-[#3d3a45] hidden sm:block">
 GeekBid
 </span>
 </Link>

 {/* Center nav — desktop */}
 <nav className="hidden md:flex items-center gap-6">
 {NAV_ITEMS.map((item) => {
 const isActive = pathname === item.href;
 return (
 <Link key={item.href} href={item.href}>
 <span
 className={`relative text-[11px] tracking-[0.09em] uppercase font-sans transition-colors duration-200 pb-0.5 ${
 isActive
 ? "text-[#4b3f8f] border-b border-[#4b3f8f]"
 : "text-[#6f6a7d] hover:text-[#6f6a7d]"
 }`}
 >
 {item.label}
 {item.hasBadge && unreadCount > 0 && (
 <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4b3f8f] text-[9px] font-bold text-[#ffffff] px-1">
 {unreadCount > 9 ? "9+" : unreadCount}
 </span>
 )}
 </span>
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
 <button className="flex items-center gap-2 h-9 px-2 hover:bg-[#f4f2ee] rounded-full transition-colors outline-none">
 <CloudinaryAvatar
 avatarUrl={currentUser.avatarUrl}
 avatarInitial={currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
 size="sm"
 />
 <div className="hidden md:flex flex-col items-start">
 <span className="text-sm font-semibold text-[#3d3a45] leading-tight">{currentUser.fullName}</span>
 <span className="text-[11px] text-[#6f6a7d] capitalize">{currentUser.role}</span>
 </div>
 <ChevronDown className="h-3.5 w-3.5 text-[#6f6a7d]" />
 </button>
 </DropdownMenuTrigger>
 <DropdownMenuContent
 align="end"
 className="w-56 z-[200] bg-[#ffffff] border border-[rgba(75,63,143,0.22)] rounded-2xl p-1.5"
 sideOffset={8}
 >
 <div className="px-3 py-2.5">
 <p className="text-sm font-semibold text-[#3d3a45]">{currentUser.fullName}</p>
 <p className="text-xs text-[#6f6a7d] mt-0.5">{currentUser.email}</p>
 </div>
 <DropdownMenuSeparator className="bg-[rgba(75,63,143,0.15)]" />
 {otherRoles.length > 0 && (
 <>
 {otherRoles.map((r) => (
 <DropdownMenuItem
 key={r}
 onClick={() => handleSwitchRole(r as "freelancer" | "client")}
 className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]"
 >
 <Repeat className="h-4 w-4 mr-2.5 text-[#4b3f8f]" /> Switch to {r}
 </DropdownMenuItem>
 ))}
 <DropdownMenuSeparator className="bg-[rgba(75,63,143,0.15)]" />
 </>
 )}
 <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <User className="h-4 w-4 mr-2.5 text-[#6f6a7d]" /> Profile
 </DropdownMenuItem>
 {currentUser.role === "client" && (
 <DropdownMenuItem onClick={() => router.push("/post-job")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <PlusCircle className="h-4 w-4 mr-2.5 text-[#6f6a7d]" /> Post a Job
 </DropdownMenuItem>
 )}
 <DropdownMenuItem onClick={() => router.push("/my-jobs")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <Briefcase className="h-4 w-4 mr-2.5 text-[#6f6a7d]" /> My Jobs
 </DropdownMenuItem>
 {currentUser.role === "freelancer" && (
 <DropdownMenuItem onClick={() => router.push("/earnings")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <DollarSign className="h-4 w-4 mr-2.5 text-[#6f6a7d]" /> Earnings
 </DropdownMenuItem>
 )}
 <DropdownMenuItem onClick={() => router.push("/payments")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <CreditCard className="h-4 w-4 mr-2.5 text-[#6f6a7d]" /> Payments
 </DropdownMenuItem>
 {currentUser.role === "admin" && (
 <DropdownMenuItem onClick={() => router.push("/admin")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <Shield className="h-4 w-4 mr-2.5 text-[#4b3f8f]" /> Admin Panel
 </DropdownMenuItem>
 )}
 <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-xl cursor-pointer py-2.5 text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] focus:text-[#3d3a45] focus:bg-[#f4f2ee]">
 <Settings className="h-4 w-4 mr-2.5 text-[#6f6a7d]" /> Settings
 </DropdownMenuItem>
 <DropdownMenuSeparator className="bg-[rgba(75,63,143,0.15)]" />
 <DropdownMenuItem onClick={handleLogout} className="rounded-xl cursor-pointer py-2.5 text-[#96543f] focus:text-[#96543f] focus:bg-[rgba(193,77,58,0.12)]">
 <LogOut className="h-4 w-4 mr-2.5" /> Sign Out
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </div>

 {/* Mobile hamburger */}
 <button
 className="md:hidden flex items-center justify-center h-9 w-9 rounded-full text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] transition-colors"
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
 <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(75,63,143,0.22)]">
 <div className="flex items-center gap-2.5">
 <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4b3f8f] text-[#ffffff] text-xs font-black font-sans">
 G
 </div>
 <span className="text-sm font-bold tracking-[0.03em] font-sans text-[#3d3a45]">GeekBid</span>
 </div>
 <button
 className="h-8 w-8 flex items-center justify-center rounded-full text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] transition-colors"
 onClick={() => setMobileOpen(false)}
 aria-label="Close menu"
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 {/* User info */}
 <div className="px-6 py-4 border-b border-[rgba(75,63,143,0.22)]">
 <div className="flex items-center gap-3">
 <CloudinaryAvatar
 avatarUrl={currentUser.avatarUrl}
 avatarInitial={currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
 size="md"
 />
 <div>
 <p className="text-sm font-semibold text-[#3d3a45]">{currentUser.fullName}</p>
 <p className="text-xs text-[#6f6a7d] capitalize">{currentUser.role} · {currentUser.email}</p>
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
 ? "bg-[#4b3f8f] text-[#ffffff] border border-transparent"
 : "text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee]"
 }`}
 >
 <item.icon className="h-5 w-5" />
 {item.label}
 {item.hasBadge && unreadCount > 0 && (
 <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4b3f8f] text-[11px] font-bold text-[#ffffff] px-1">
 {unreadCount > 9 ? "9+" : unreadCount}
 </span>
 )}
 </div>
 </Link>
 );
 })}

 <div className="border-t border-[rgba(75,63,143,0.22)] my-2 pt-2">
 {[
 { href: "/profile", label: "Profile", icon: User },
 { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
 ...(currentUser.role === "freelancer" ? [{ href: "/earnings", label: "Earnings", icon: DollarSign }] : []),
 { href: "/payments", label: "Payments", icon: CreditCard },
 { href: "/settings", label: "Settings", icon: Settings },
 ...(currentUser.role === "client" ? [{ href: "/post-job", label: "Post a Job", icon: PlusCircle }] : []),
 ...(currentUser.role === "admin" ? [{ href: "/admin", label: "Admin Panel", icon: Shield }] : []),
 ].map((item) => (
 <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
 <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-[#6f6a7d] hover:text-[#3d3a45] hover:bg-[#f4f2ee] transition-all duration-200">
 <item.icon className="h-5 w-5" />
 {item.label}
 </div>
 </Link>
 ))}
 </div>
 </nav>

 {/* Sign out */}
 <div className="px-4 py-4 border-t border-[rgba(75,63,143,0.22)]">
 <button
 onClick={() => { setMobileOpen(false); handleLogout(); }}
 className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-medium text-[#96543f] hover:bg-[rgba(193,77,58,0.12)] transition-colors"
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
