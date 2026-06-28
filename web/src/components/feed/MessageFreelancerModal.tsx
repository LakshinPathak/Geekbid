"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { X, MessageSquare, Loader2 } from "lucide-react";
import { formatMoney, getCurrentPrice } from "@/lib/utils";

interface Props {
  freelancerId: string;
  freelancerName: string;
  onClose: () => void;
}

export default function MessageFreelancerModal({ freelancerId, freelancerName, onClose }: Props) {
  const router = useRouter();
  const { jobs, currentUser, bids, now, createChatRoom, sendMessage } = useApp();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const uid = currentUser?.id ?? currentUser?._id ?? "";
  const myOpenJobs = jobs.filter(j => j.clientId === uid && j.status === "open");

  const freelancerBidJobIds = new Set(
    bids.filter(b => b.freelancerId === freelancerId).map(b => b.jobId)
  );

  const handleSend = async () => {
    if (!selectedJobId) { toast.error("Select a job first"); return; }
    if (!messageText.trim()) { toast.error("Write a message first"); return; }

    setSubmitting(true);
    try {
      const result = await createChatRoom(selectedJobId, [uid, freelancerId]);
      if (!result.ok || !result.roomId) {
        throw new Error(result.error ?? "Failed to create room");
      }
      const msgResult = await sendMessage(result.roomId, messageText.trim());
      if (!msgResult.ok) throw new Error(msgResult.message);

      toast.success("Message sent!", { description: `${freelancerName} will see your message in inbox.` });
      router.push(`/inbox?room=${result.roomId}`);
      onClose();
    } catch (e: unknown) {
      toast.error("Failed to send message", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[6px] border p-6 space-y-5"
        style={{ background: "#0d1120", borderColor: "rgba(201,168,76,0.22)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif font-normal text-xl text-[#f0e8d4]">Message Freelancer</h2>
            <p className="text-[11px] text-[#a8997e] mt-0.5">
              Start a conversation with <span className="text-[#c9a84c]">{freelancerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-[3px] flex items-center justify-center hover:bg-[#111625] transition-colors"
          >
            <X className="h-4 w-4 text-[#a8997e]" />
          </button>
        </div>

        {/* Job selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">Select a Job Context</label>
          {myOpenJobs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#a8997e]">No open jobs available.</p>
              <p className="text-xs text-[#a8997e] mt-1 opacity-70">Post a job first to start a conversation.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {myOpenJobs.map(job => {
                const jid = job.id ?? job._id ?? "";
                const isSelected = selectedJobId === jid;
                const currentPrice = getCurrentPrice(job, now);
                return (
                  <button
                    key={jid}
                    onClick={() => setSelectedJobId(jid)}
                    className="w-full text-left rounded-[6px] px-4 py-3 border transition-all"
                    style={{
                      background: isSelected ? "rgba(201,168,76,0.08)" : "#111625",
                      borderColor: isSelected ? "rgba(201,168,76,0.35)" : "rgba(201,168,76,0.12)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: isSelected ? "#c9a84c" : "#a8997e" }}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#c9a84c" }} />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm text-[#f0e8d4] truncate block">{job.title}</span>
                          {freelancerBidJobIds.has(jid) && (
                            <span className="text-[10px] text-[#4caf7d] font-medium">✓ Has active bid</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-serif shrink-0" style={{ color: "#c9a84c" }}>
                        {formatMoney(currentPrice)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message textarea */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">
            Message <span className="text-[#B02020]">*</span>
          </label>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder={`Hi ${freelancerName}, I'd like to discuss...`}
            rows={3}
            className="glass-input text-sm rounded-[3px] w-full resize-none p-3"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 h-10 text-sm">Cancel</button>
          <button
            onClick={handleSend}
            disabled={submitting || !selectedJobId || myOpenJobs.length === 0 || !messageText.trim()}
            className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
