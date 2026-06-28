"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { LayoutGrid, Briefcase, PlusCircle, MessageSquare, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
 href: string;
 label: string;
 icon: LucideIcon;
 hasBadge?: boolean;
};

const BASE_ITEMS: NavItem[] = [
 { href: "/feed", label: "Feed", icon: LayoutGrid },
 { href: "/my-jobs", label: "My Jobs", icon: Briefcase },
 { href: "/inbox", label: "Inbox", icon: MessageSquare, hasBadge: true },
 { href: "/profile", label: "Profile", icon: User },
];

const POST_ITEM: NavItem = { href: "/post-job", label: "Post", icon: PlusCircle };

const HIDDEN_ROUTES = ["/", "/login"];

export default function MobileBottomNav() {
 const { currentUser, unreadCount, mounted } = useApp();
 const pathname = usePathname();

 if (!mounted || !currentUser) return null;
 if (HIDDEN_ROUTES.includes(pathname)) return null;

 const isClient = currentUser.role === "client";

 const items: NavItem[] = isClient
 ? [BASE_ITEMS[0], BASE_ITEMS[1], POST_ITEM, BASE_ITEMS[2], BASE_ITEMS[3]]
 : BASE_ITEMS;

 return (
 <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-[#050810] border-t border-[rgba(201,168,76,0.22)] pb-safe">
 <div className="flex h-16 items-center justify-around px-2">
 {items.map((item) => {
 const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
 return (
 <Link
 key={item.href}
 href={item.href}
 className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 rounded-[3px] transition-colors ${
 isActive ? "text-[#c9a84c]" : "text-[#6b5f45] hover:text-[#f0e8d4]"
 }`}
 >
 <item.icon className="h-5 w-5" />
 <span className="text-[10px] font-medium leading-none">{item.label}</span>
 {item.hasBadge && unreadCount > 0 && (
 <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a84c] text-[9px] font-bold text-[#080b14] px-1">
 {unreadCount > 9 ? "9+" : unreadCount}
 </span>
 )}
 </Link>
 );
 })}
 </div>
 </nav>
 );
}
