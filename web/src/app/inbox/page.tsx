"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import {
  MessageSquare, Send, Search, ArrowLeft, Users, ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function InboxPage() {
  const { chatRooms, chatMessages, sendMessage, currentUser, users, jobs, mounted, fetchChatMessages } = useApp();
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

  useEffect(() => {
    if (selectedRoom) {
      fetchChatMessages(selectedRoom);
    }
  }, [selectedRoom, fetchChatMessages]);

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

  const getJobTitle = (jobId: string) => {
    const job = jobs.find(j => (j.id ?? j._id) === jobId);
    return job?.title ?? "Unknown Job";
  };

  if (!mounted) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-[#00FF88]/30 border-t-[#00FF88] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar — Room List */}
        <div className={`${selectedRoom ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-[#1E1E2A] bg-[#12121A]`}>
          {/* Header */}
          <div className="p-4 border-b border-[#1E1E2A]">
            <h2 className="font-heading text-xl font-bold text-[#E8E8EC] mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55556A]" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-10 pl-10 pr-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#55556A] focus:border-[#00FF88]/50 outline-none transition-all"
              />
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-[#0A0A0F] border border-[#1E1E2A] flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-[#55556A]" />
                </div>
                <p className="text-sm text-[#8A8A9A] font-medium">No conversations yet</p>
                <p className="text-xs text-[#55556A] mt-1">Start chatting by accepting a job</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1E1E2A]">
                {filteredRooms.map(room => {
                  const otherUser = getOtherUser(room);
                  const lastMsg = chatMessages.filter(m => m.roomId === room.id).pop();
                  const isSelected = selectedRoom === room.id;
                  const jobTitle = getJobTitle(room.jobId);

                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room.id)}
                      className={`w-full text-left px-4 py-3 transition-all ${
                        isSelected
                          ? "bg-[#1A1A24] border-l-2 border-l-[#00FF88]"
                          : "hover:bg-[#1A1A24] border-l-2 border-l-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                          isSelected ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-[#0A0A0F] text-[#8A8A9A] border border-[#1E1E2A]"
                        }`}>
                          {otherUser?.avatarInitial ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium truncate ${isSelected ? "text-[#E8E8EC]" : "text-[#E8E8EC]"}`}>
                              {otherUser?.fullName ?? "Unknown"}
                            </p>
                            {lastMsg && (
                              <span className="text-[10px] text-[#55556A] shrink-0 ml-2">{timeAgo(lastMsg.createdAt)}</span>
                            )}
                          </div>
                          <p className="text-[#55556A] text-[10px] truncate mt-0.5">{jobTitle}</p>
                          {lastMsg && (
                            <p className="text-[#8A8A9A] text-xs truncate mt-0.5">{lastMsg.text}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Chat Area */}
        <div className={`${selectedRoom ? "flex" : "hidden md:flex"} flex-col flex-1`}>
          {!selectedRoom ? (
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <div>
                <div className="h-16 w-16 rounded-2xl bg-[#12121A] border border-[#1E1E2A] flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-7 w-7 text-[#55556A]" />
                </div>
                <h3 className="text-lg font-bold text-[#E8E8EC] mb-1">Select a conversation</h3>
                <p className="text-sm text-[#8A8A9A] max-w-sm">Choose a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2A] bg-[#12121A]">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden h-8 w-8 rounded-lg border border-[#1E1E2A] flex items-center justify-center text-[#8A8A9A] hover:bg-[#1A1A24] transition-colors"
                    onClick={() => setSelectedRoom(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-10 w-10 rounded-full bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center text-sm font-bold">
                    {getOtherUser(activeRoom!)?.avatarInitial ?? "?"}
                  </div>
                  <div>
                    <p className="font-heading text-base font-semibold text-[#E8E8EC]">
                      {getOtherUser(activeRoom!)?.fullName ?? "Unknown"}
                    </p>
                    <p className="text-[#55556A] text-xs">
                      {getJobTitle(activeRoom!.jobId)}
                    </p>
                  </div>
                </div>
                <Link href={`/jobs/${activeRoom!.jobId}`} className="text-[#00FF88] text-sm hover:underline flex items-center gap-1">
                  View Job <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-6 py-4" ref={scrollRef}>
                <div className="space-y-4 max-w-2xl mx-auto">
                  {roomMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-[#55556A]">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    roomMessages.map(msg => {
                      const isMine = msg.senderId === (currentUser?.id ?? currentUser?._id);
                      const sender = users.find(u => (u.id ?? u._id) === msg.senderId);

                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] ${
                            isMine
                              ? "bg-[#00FF88] text-[#0A0A0F] rounded-2xl rounded-br-md"
                              : "bg-[#12121A] border border-[#1E1E2A] text-[#E8E8EC] rounded-2xl rounded-bl-md"
                          } px-4 py-2.5`}>
                            {!isMine && (
                              <p className="text-[#00FF88] text-[10px] font-medium mb-0.5">
                                {sender?.fullName ?? "Unknown"}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <p className={`text-[10px] mt-1 ${isMine ? "text-[#0A0A0F]/50" : "text-[#55556A]"} ${isMine ? "text-right" : ""}`}>
                              {timeAgo(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Message input bar */}
              <div className="px-6 py-4 border-t border-[#1E1E2A] bg-[#12121A]">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-center gap-3 max-w-2xl mx-auto"
                >
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-11 px-4 bg-[#0A0A0F] border border-[#1E1E2A] rounded-xl text-[#E8E8EC] text-sm placeholder:text-[#55556A] focus:border-[#00FF88]/50 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="w-11 h-11 bg-[#00FF88] rounded-xl flex items-center justify-center hover:bg-[#00CC6A] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send className="h-[18px] w-[18px] text-[#0A0A0F]" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
