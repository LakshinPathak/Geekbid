"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils";
import { MessageSquare, Send, Search, ArrowLeft, Users, Hash } from "lucide-react";

export default function InboxPage() {
  const { chatRooms, chatMessages, sendMessage, currentUser, users, mounted } = useApp();
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mounted && !currentUser) router.replace("/login");
  }, [mounted, currentUser, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, selectedRoom]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return chatRooms;
    return chatRooms.filter(r => {
      const otherUser = users.find(u => r.participantIds.includes(u.id ?? u._id ?? "") && (u.id ?? u._id) !== (currentUser?.id ?? currentUser?._id));
      return otherUser?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chatRooms, searchQuery, users, currentUser]);

  const activeRoom = chatRooms.find(r => r.id === selectedRoom);
  const roomMessages = chatMessages.filter(m => m.roomId === selectedRoom);

  const handleSend = async () => {
    if (!text.trim() || !selectedRoom) return;
    await sendMessage(selectedRoom, text);
    setText("");
  };

  const getOtherUser = (room: typeof chatRooms[0]) => {
    return users.find(u => room.participantIds.includes(u.id ?? u._id ?? "") && (u.id ?? u._id) !== (currentUser?.id ?? currentUser?._id));
  };

  if (!mounted) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Inbox</h1>
            <p className="text-xs text-neutral-400">{chatRooms.length} conversations</p>
          </div>
        </div>
      </div>

      {/* Chat layout */}
      <Card className="border-neutral-200 shadow-sm overflow-hidden">
        <div className="flex h-[calc(100vh-200px)] min-h-[500px]">
          {/* Sidebar - Room list */}
          <div className={`${selectedRoom ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-neutral-100`}>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="pl-10 h-10 bg-neutral-50 border-neutral-200 rounded-xl text-sm" />
              </div>
            </div>
            <Separator />
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Users className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                    <p className="text-sm text-neutral-400">No conversations yet</p>
                  </div>
                ) : (
                  filteredRooms.map(room => {
                    const otherUser = getOtherUser(room);
                    const lastMsg = chatMessages.filter(m => m.roomId === room.id).pop();
                    const isSelected = selectedRoom === room.id;
                    return (
                      <button key={room.id} onClick={() => setSelectedRoom(room.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 mb-1 ${
                          isSelected ? "bg-black text-white" : "hover:bg-neutral-50 text-neutral-700"
                        }`}>
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className={`text-sm font-bold ${isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                            {otherUser?.avatarInitial ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-black"}`}>{otherUser?.fullName ?? "Unknown"}</p>
                            {lastMsg && <span className={`text-[10px] shrink-0 ml-2 ${isSelected ? "text-white/50" : "text-neutral-400"}`}>{timeAgo(lastMsg.createdAt)}</span>}
                          </div>
                          {lastMsg && <p className={`text-xs truncate mt-0.5 ${isSelected ? "text-white/60" : "text-neutral-400"}`}>{lastMsg.text}</p>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className={`${selectedRoom ? "flex" : "hidden md:flex"} flex-col flex-1`}>
            {!selectedRoom ? (
              <div className="flex-1 flex items-center justify-center text-center px-4">
                <div>
                  <div className="h-16 w-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-7 w-7 text-neutral-300" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-700 mb-1">Select a conversation</h3>
                  <p className="text-sm text-neutral-400 max-w-sm">Choose a conversation from the sidebar to start chatting</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 bg-white">
                  <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0 rounded-lg" onClick={() => setSelectedRoom(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-black text-white text-sm font-bold">
                      {getOtherUser(activeRoom!)?.avatarInitial ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-black">{getOtherUser(activeRoom!)?.fullName ?? "Unknown"}</p>
                    <p className="text-[11px] text-neutral-400 capitalize">{getOtherUser(activeRoom!)?.role ?? ""}</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {roomMessages.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-neutral-400">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      roomMessages.map(msg => {
                        const isMine = msg.senderId === (currentUser?.id ?? currentUser?._id);
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? "bg-black text-white rounded-br-sm"
                                : "bg-neutral-100 text-neutral-800 rounded-bl-sm"
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.text}</p>
                              <p className={`text-[10px] mt-1 ${isMine ? "text-white/40" : "text-neutral-400"}`}>{timeAgo(msg.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="px-4 py-3 border-t border-neutral-100 bg-white">
                  <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 max-w-2xl mx-auto">
                    <Input value={text} onChange={e => setText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 h-11 bg-neutral-50 border-neutral-200 rounded-xl text-sm" />
                    <Button type="submit" size="sm" className="bg-black hover:bg-neutral-800 text-white h-11 px-5 rounded-xl shadow-sm" disabled={!text.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
