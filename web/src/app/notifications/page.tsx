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
  price_drop: { icon: TrendingDown, bg: "bg-red-500/10", color: "text-red-400" },
  counter_bid: { icon: MessageSquare, bg: "bg-blue-500/10", color: "text-blue-400" },
  payment: { icon: DollarSign, bg: "bg-[#00FF88]/10", color: "text-[#00FF88]" },
  job_match: { icon: Zap, bg: "bg-purple-500/10", color: "text-purple-400" },
  general: { icon: Bell, bg: "bg-[#1A1A24]", color: "text-[#55556A]" },
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
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
      <div className="h-8 w-8 border-2 border-[#55556A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-[#E8E8EC]">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-[#00FF88] text-[#0A0A0F] text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-[#00FF88] text-sm hover:underline font-medium"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === tab.key
                  ? "bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20"
                  : "text-[#8A8A9A] hover:text-[#E8E8EC]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {displayNotifs.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-[#12121A] border border-[#1E1E2A] flex items-center justify-center mb-4">
              <Bell className="h-7 w-7 text-[#55556A]" />
            </div>
            <h3 className="text-lg font-heading font-bold text-[#E8E8EC] mb-1">
              {filter !== "all" ? "No notifications in this category" : "You're all caught up!"}
            </h3>
            <p className="text-sm text-[#8A8A9A]">
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
                  className={`bg-[#12121A] border rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all hover:border-[#00FF88]/10 ${
                    isUnread
                      ? "border-l-2 border-l-[#00FF88] border-t border-r border-b border-[#1E1E2A] bg-[#1A1A24]/30"
                      : "border-[#1E1E2A]"
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}>
                    <IconComp className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isUnread ? "font-medium text-[#E8E8EC]" : "text-[#8A8A9A]"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-[#8A8A9A] mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-[#55556A] mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {isUnread && (
                    <span className="w-2 h-2 bg-[#00FF88] rounded-full shrink-0 mt-2" />
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
