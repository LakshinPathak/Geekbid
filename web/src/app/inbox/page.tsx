"use client";
import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import {
 MessageSquare, Send, Search, ArrowLeft, Users, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";

function InboxContent() {
 const { chatRooms, chatMessages, sendMessage, currentUser, users, jobs, mounted, fetchChatMessages } = useApp();
 const router = useRouter();
 const searchParams = useSearchParams();
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

 useEffect(() => {
 const roomParam = searchParams.get("room");
 if (roomParam && chatRooms.length > 0) {
 const roomExists = chatRooms.find(r => r.id === roomParam);
 if (roomExists) {
 setSelectedRoom(roomExists.id);
 }
 }
 }, [searchParams, chatRooms]);

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
 <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
 <div className="bg-[#080b14] h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin" />
 </div>
 );

 return (
 <div className="min-h-screen bg-[#080b14] grid-bg">
 <div className="flex h-[calc(100vh-64px)]">
 {/* Left Sidebar — Room List */}
 <div className={`${selectedRoom ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-[rgba(201,168,76,0.22)] glass-panel`} style={{ borderRadius: 0 }}>
 {/* Header */}
 <div className="glass-panel-sm p-4" style={{ borderRadius: 0, borderBottom: '1px solid rgba(59,75,61,0.3)' }}>
 <h2 className="font-heading text-xl font-bold text-[#f0e8d4] mb-3">Messages</h2>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8997e]" />
 <input
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 placeholder="Search conversations..."
 className="glass-input pl-10 h-10 text-sm rounded-[6px]"
 />
 </div>
 </div>

 {/* Room list */}
 <div className="flex-1 overflow-y-auto">
 {filteredRooms.length === 0 ? (
 <div className="text-center py-16 px-4">
 <div className="mx-auto h-14 w-14 rounded-[6px] glass-panel-sm flex items-center justify-center mb-3">
 <Users className="h-6 w-6 text-[#a8997e]" />
 </div>
 <p className="text-sm text-[#a8997e] font-medium">No conversations yet</p>
 <p className="text-xs text-[#a8997e] mt-1">Start chatting by accepting a job</p>
 </div>
 ) : (
 <div className="divide-y divide-[rgba(201,168,76,0.22)]">
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
 ? "bg-[#111625] border-l-2 border-l-[#c9a84c]"
 : "hover:bg-[#111625] border-l-2 border-l-transparent"
 }`}
 >
 <div className="flex items-start gap-3">
 {/* Avatar */}
 <CloudinaryAvatar
 avatarUrl={otherUser?.avatarUrl}
 avatarInitial={otherUser?.avatarInitial ?? "?"}
 size="md"
 />
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <p className="text-sm font-medium truncate text-[#f0e8d4]">
 {otherUser?.fullName ?? "Unknown"}
 </p>
 {lastMsg && (
 <span className="text-[11px] text-[#a8997e] shrink-0 ml-2">{timeAgo(lastMsg.createdAt)}</span>
 )}
 </div>
 <p className="text-[#a8997e] text-[11px] truncate mt-0.5">{jobTitle}</p>
 {lastMsg && (
 <p className="text-[#a8997e] text-xs truncate mt-0.5">{lastMsg.text}</p>
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
 <div className="h-16 w-16 rounded-[6px] glass-panel-sm flex items-center justify-center mx-auto mb-4">
 <MessageSquare className="h-7 w-7 text-[#a8997e]" />
 </div>
 <h3 className="text-lg font-heading font-bold text-[#f0e8d4] mb-1">Select a conversation</h3>
 <p className="text-sm text-[#a8997e] max-w-sm">Choose a conversation from the sidebar to start chatting</p>
 </div>
 </div>
 ) : (
 <>
 {/* Chat header */}
 <div className="glass-panel-sm p-4 flex items-center justify-between px-4 sm:px-6" style={{ borderRadius: 0, borderBottom: '1px solid rgba(59,75,61,0.3)' }}>
 <div className="flex items-center gap-3">
 <button
 className="md:hidden h-8 w-8 rounded-[3px] border border-[rgba(201,168,76,0.22)] flex items-center justify-center text-[#a8997e] hover:bg-[#111625] transition-colors"
 onClick={() => setSelectedRoom(null)}
 >
 <ArrowLeft className="h-4 w-4" />
 </button>
 <CloudinaryAvatar
 avatarUrl={getOtherUser(activeRoom!)?.avatarUrl}
 avatarInitial={getOtherUser(activeRoom!)?.avatarInitial ?? "?"}
 size="md"
 />
 <div>
 <p className="font-heading text-base font-semibold text-[#f0e8d4]">
 {getOtherUser(activeRoom!)?.fullName ?? "Unknown"}
 </p>
 <p className="text-[#a8997e] text-xs">
 {getJobTitle(activeRoom!.jobId)}
 </p>
 </div>
 </div>
 <Link href={`/jobs/${activeRoom!.jobId}`} className="text-[#c9a84c] text-sm hover:text-[#c9a84c] transition-colors flex items-center gap-1">
 View Job <ExternalLink className="h-3 w-3" />
 </Link>
 </div>

 {/* Messages area */}
 <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4" ref={scrollRef}>
 <div className="space-y-4 max-w-2xl mx-auto">
 {roomMessages.length === 0 ? (
 <div className="text-center py-12">
 <p className="text-sm text-[#a8997e]">No messages yet. Start the conversation!</p>
 </div>
 ) : (
 roomMessages.map(msg => {
 const isMine = msg.senderId === (currentUser?.id ?? currentUser?._id);
 const sender = users.find(u => (u.id ?? u._id) === msg.senderId);

 return (
 <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
 <div className={`max-w-[70%] ${
 isMine
 ? "chat-bubble-self text-[#f0e8d4]"
 : "chat-bubble-other text-[#f0e8d4]"
 } px-4 py-2.5`}>
 {!isMine && (
 <p className="text-[#c9a84c] text-[11px] font-medium mb-0.5">
 {sender?.fullName ?? "Unknown"}
 </p>
 )}
 <p className="text-sm leading-relaxed">{msg.text}</p>
 <p className={`text-[11px] mt-1 text-[#a8997e] ${isMine ? "text-right" : ""}`}>
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
 <div className="glass-panel-sm px-4 sm:px-6 py-4 pb-4" style={{ borderRadius: 0, borderTop: '1px solid rgba(59,75,61,0.3)' }}>
 <form
 onSubmit={(e) => { e.preventDefault(); handleSend(); }}
 className="flex items-center gap-3 max-w-2xl mx-auto"
 >
 <input
 value={text}
 onChange={e => setText(e.target.value)}
 placeholder="Type a message..."
 className="glass-input flex-1 h-11 text-sm rounded-[6px]"
 />
 <button
 type="submit"
 disabled={!text.trim()}
 className="btn-primary w-11 h-11 rounded-[6px] flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shrink-0 p-0"
 >
 <Send className="h-[18px] w-[18px]" />
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

export default function InboxPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
 <div className="h-8 w-8 border-2 border-[rgba(201,168,76,0.40)] border-t-[#c9a84c] rounded-full animate-spin" />
 </div>
 }>
 <InboxContent />
 </Suspense>
 );
}
