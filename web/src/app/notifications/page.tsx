"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import {
 Bell, CheckCheck, Zap, DollarSign, MessageSquare,
 TrendingDown, Clock, Inbox,
} from "lucide-react";

type FilterType = "all" | "price_drop" | "counter_bid" | "payment" | "job_match";

const ICON_CONFIG: Record<string, { icon: typeof Zap; bg: string; color: string }> = {
 price_drop: { icon: TrendingDown, bg: "bg-[rgba(176,32,32,0.08)]", color: "text-[#B02020]" },
 counter_bid: { icon: MessageSquare, bg: "bg-[rgba(201,168,76,0.12)]", color: "text-[#c9a84c]" },
 payment: { icon: DollarSign, bg: "bg-[rgba(201,168,76,0.12)]", color: "text-[#c9a84c]" },
 job_match: { icon: Zap, bg: "bg-[#111625]", color: "text-[#a8997e]" },
 general: { icon: Bell, bg: "bg-[#111625]", color: "text-[#a8997e]" },
};

const FILTER_TABS: { key: FilterType; label: string }[] = [
 { key: "all", label: "All" },
 { key: "price_drop", label: "Price Drops" },
 { key: "counter_bid", label: "Bids" },
 { key: "payment", label: "Payments" },
 { key: "job_match", label: "Matches" },
];

export default function NotificationsPage() {
 const { notifications, markNotificationRead, markAllRead, currentUser, mounted } = useApp();
 const router = useRouter();
 const [filter, setFilter] = useState<FilterType>("all");

 useEffect(() => {
 if (mounted && !currentUser) router.replace("/login");
 }, [mounted, currentUser, router]);

 const myNotifs = useMemo(
 () => notifications.filter(n => n.userId === (currentUser?.id ?? currentUser?._id)),
 [notifications, currentUser]
 );

 const unreadCount = useMemo(() => myNotifs.filter(n => !n.isRead).length, [myNotifs]);

 const displayNotifs = useMemo(() => {
 if (filter === "all") return myNotifs;
 return myNotifs.filter(n => n.type === filter);
 }, [myNotifs, filter]);

 if (!mounted) return (
 <div className="min-h-screen flex items-center justify-center bg-[#0d1120]">
 <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.22)] border-t-transparent rounded-full animate-spin" />
 </div>
 );

 return (
 <div className="min-h-screen bg-[#0d1120] grid-bg">
 <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
 {/* Header */}
 <div className="flex items-center justify-between mb-6 animate-fade-in-up">
 <div className="flex items-center gap-3">
 <h1 className="font-heading text-2xl font-bold text-[#f0e8d4]">Notifications</h1>
 {unreadCount > 0 && (
 <span className="bg-[#c9a84c] text-[#050810] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center animate-pulse-glow">
 {unreadCount}
 </span>
 )}
 </div>
 {unreadCount > 0 && (
 <button
 onClick={markAllRead}
 className="btn-ghost flex items-center gap-1.5 text-sm px-4 py-2 rounded-[6px]"
 >
 <CheckCheck className="h-4 w-4" />
 Mark all read
 </button>
 )}
 </div>

 {/* Filter Tabs */}
 <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
 <div className="glass-panel-sm p-1 rounded-[6px] inline-flex gap-1">
 {FILTER_TABS.map(tab => (
 <button
 key={tab.key}
 onClick={() => setFilter(tab.key)}
 className={`px-4 py-1.5 rounded-[3px] text-sm font-medium whitespace-nowrap transition-all ${
 filter === tab.key
 ? "bg-[#c9a84c] text-[#050810] border border-transparent"
 : "text-[#a8997e] hover:text-[#f0e8d4]"
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>
 </div>

 {/* Notification List */}
 {displayNotifs.length === 0 ? (
 <div className="glass-panel p-12 text-center animate-fade-in-up">
 <div className="mx-auto h-16 w-16 rounded-[6px] glass-panel-sm flex items-center justify-center mb-4">
 <Bell className="h-7 w-7 text-[#a8997e]" />
 </div>
 <h3 className="text-lg font-heading font-bold text-[#f0e8d4] mb-1">
 {filter !== "all" ? "No notifications in this category" : "You're all caught up!"}
 </h3>
 <p className="text-sm text-[#a8997e]">
 {filter !== "all"
 ? "Try a different filter"
 : "We'll notify you when something happens"}
 </p>
 </div>
 ) : (
 <div className="space-y-2">
 {displayNotifs.map((n, i) => {
 const config = ICON_CONFIG[n.type] || ICON_CONFIG.general;
 const IconComp = config.icon;
 const isUnread = !n.isRead;

 return (
 <div
 key={n.id}
 onClick={() => markNotificationRead(n.id)}
 className={`notif-card p-4 flex items-start gap-4 cursor-pointer hover:border-[rgba(201,168,76,0.35)]/30 animate-fade-in-up ${
 isUnread ? "unread" : ""
 }`}
 style={{ animationDelay: `${i * 50}ms` }}
 >
 {/* Icon */}
 <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0 ${config.bg}`}>
 <IconComp className={`h-5 w-5 ${config.color}`} />
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <p className={`text-sm ${isUnread ? "font-medium text-[#f0e8d4]" : "text-[#a8997e]"}`}>
 {n.title}
 </p>
 {n.body && (
 <p className="text-xs text-[#a8997e] mt-0.5 line-clamp-2">{n.body}</p>
 )}
 <p className="text-[11px] text-[#a8997e] mt-1 flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {timeAgo(n.createdAt)}
 </p>
 </div>

 {/* Unread indicator */}
 {isUnread && (
 <span className="w-2 h-2 bg-[#c9a84c] rounded-full shrink-0 mt-2 unread-dot" />
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}
