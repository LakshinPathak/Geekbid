"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";
import { formatMoney, getCurrentPrice } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

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
      handleClose();
    } catch (e: unknown) {
      toast.error("Failed to send message", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-[#ffffff] border-[rgba(75,63,143,0.22)] rounded-2xl p-6 gap-5">
        <DialogHeader className="text-left gap-1">
          <DialogTitle className="font-serif font-normal text-xl text-[#3d3a45]">Message Freelancer</DialogTitle>
          <DialogDescription className="text-[11px] text-[#46424e] mt-0.5">
            Start a conversation with <span className="text-[#4b3f8f]">{freelancerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Job selection */}
        <div className="space-y-2">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">Select a Job Context</span>
          {myOpenJobs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#46424e]">No open jobs available.</p>
              <p className="text-xs text-[#46424e] mt-1 opacity-70">Post a job first to start a conversation.</p>
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
                    className="w-full text-left rounded-2xl px-4 py-3 border transition-all"
                    style={{
                      background: isSelected ? "rgba(75,63,143,0.08)" : "#f4f2ee",
                      borderColor: isSelected ? "rgba(75,63,143,0.35)" : "rgba(75,63,143,0.12)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: isSelected ? "#4b3f8f" : "#46424e" }}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#4b3f8f" }} />}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm text-[#3d3a45] truncate block">{job.title}</span>
                          {freelancerBidJobIds.has(jid) && (
                            <span className="text-[10px] text-[#4d7245] font-medium">✓ Has active bid</span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-serif shrink-0" style={{ color: "#4b3f8f" }}>
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
          <label htmlFor="message-freelancer-text" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">
            Message <span className="text-[#c14d3a]">*</span>
          </label>
          <textarea
            id="message-freelancer-text"
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder={`Hi ${freelancerName}, I'd like to discuss...`}
            rows={3}
            className="glass-input text-sm rounded-full w-full resize-none p-3"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={handleClose} className="btn-ghost flex-1 h-10 text-sm">Cancel</button>
          <button
            onClick={handleSend}
            disabled={submitting || !selectedJobId || myOpenJobs.length === 0 || !messageText.trim()}
            className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Send Message
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
