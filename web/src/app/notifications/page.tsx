"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/utils";
import { Bell, CheckCheck, Zap, DollarSign, MessageSquare, AlertCircle, Star, Inbox } from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, typeof Zap> = {
  bid: Zap,
  payment: DollarSign,
  message: MessageSquare,
  alert: AlertCircle,
  review: Star,
};

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllRead, currentUser, mounted } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  const myNotifs = useMemo(
    () => notifications.filter(n => n.userId === (currentUser?.id ?? currentUser?._id)),
    [notifications, currentUser]
  );

  const unreadNotifs = useMemo(() => myNotifs.filter(n => !n.isRead), [myNotifs]);
  const displayNotifs = tab === "unread" ? unreadNotifs : myNotifs;

  if (!mounted) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Notifications</h1>
            <p className="text-xs text-neutral-400">
              {unreadNotifs.length > 0 ? `${unreadNotifs.length} unread` : "All caught up!"}
            </p>
          </div>
        </div>
        {unreadNotifs.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs rounded-lg border-neutral-200 gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="bg-white border border-neutral-200 shadow-sm h-10 p-1 rounded-xl">
          <TabsTrigger value="all" className="text-xs rounded-lg gap-1.5 px-4">
            All <Badge className="ml-1 text-[10px] bg-neutral-100 text-neutral-600 border-0 rounded-full px-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">{myNotifs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="text-xs rounded-lg gap-1.5 px-4">
            Unread {unreadNotifs.length > 0 && <Badge className="ml-1 text-[10px] bg-black text-white border-0 rounded-full px-1.5">{unreadNotifs.length}</Badge>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notification list */}
      {displayNotifs.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <Inbox className="h-7 w-7 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-700 mb-1">
            {tab === "unread" ? "No unread notifications" : "No notifications yet"}
          </h3>
          <p className="text-sm text-neutral-400">
            {tab === "unread" ? "You're all caught up!" : "Notifications will appear here when you receive them."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayNotifs.map(n => {
            const IconComp = ICON_MAP[n.type] ?? Bell;
            return (
              <Card key={n.id}
                className={`border transition-all cursor-pointer hover:shadow-sm ${
                  !n.isRead
                    ? "border-neutral-300 bg-white shadow-sm"
                    : "border-neutral-100 bg-neutral-50/50 hover:bg-white"
                }`}
                onClick={() => markNotificationRead(n.id)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    !n.isRead ? "bg-black text-white" : "bg-neutral-100 text-neutral-400"
                  }`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-relaxed ${!n.isRead ? "font-semibold text-black" : "text-neutral-600"}`}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{n.body}</p>}
                        <p className="text-[11px] text-neutral-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <span className="h-2.5 w-2.5 rounded-full bg-black shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
