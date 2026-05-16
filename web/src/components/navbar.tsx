"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    <header className="sticky top-0 z-[100] w-full border-b border-neutral-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-sm group-hover:shadow-md transition-shadow">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-base font-extrabold text-black hidden sm:block">
            GeekBid
          </span>
          <Badge variant="outline" className="hidden sm:flex text-[10px] px-1.5 py-0 h-5 border-neutral-200 text-neutral-400 font-medium">
            BETA
          </Badge>
        </Link>

        {/* Center nav */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" size="sm"
                  className={`relative text-sm font-medium h-9 px-3 rounded-lg ${
                    isActive ? "text-black bg-neutral-100" : "text-neutral-400 hover:text-black hover:bg-neutral-50"
                  } transition-colors`}>
                  <item.icon className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.hasBadge && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2 hover:bg-neutral-50 rounded-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                {currentUser.avatarInitial || currentUser.fullName?.slice(0, 2)?.toUpperCase() || "U"}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-black leading-tight">{currentUser.fullName}</span>
                <span className="text-[10px] text-neutral-400 capitalize">{currentUser.role}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[200] bg-white border border-neutral-200 shadow-xl rounded-xl p-1.5" sideOffset={8}>
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-black">{currentUser.fullName}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{currentUser.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-neutral-100" />
            <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
              <User className="h-4 w-4 mr-2.5 text-neutral-400" /> Profile
            </DropdownMenuItem>
            {currentUser.role === "client" && (
              <DropdownMenuItem onClick={() => router.push("/post-job")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
                <PlusCircle className="h-4 w-4 mr-2.5 text-neutral-400" /> Post a Job
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push("/my-jobs")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
              <Briefcase className="h-4 w-4 mr-2.5 text-neutral-400" /> My Jobs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/earnings")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
              <DollarSign className="h-4 w-4 mr-2.5 text-neutral-400" /> Earnings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/payments")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
              <CreditCard className="h-4 w-4 mr-2.5 text-neutral-400" /> Payments
            </DropdownMenuItem>
            {currentUser.role === "admin" && (
              <DropdownMenuItem onClick={() => router.push("/admin")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
                <Shield className="h-4 w-4 mr-2.5 text-neutral-400" /> Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-lg cursor-pointer py-2.5 text-neutral-700 hover:text-black focus:text-black focus:bg-neutral-50">
              <Settings className="h-4 w-4 mr-2.5 text-neutral-400" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-100" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="h-4 w-4 mr-2.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
