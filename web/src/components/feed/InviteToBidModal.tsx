"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
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

export default function InviteToBidModal({ freelancerId, freelancerName, onClose }: Props) {
  const { jobs, currentUser, bids, now, refreshCurrentUser, getValidToken } = useApp();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const uid = currentUser?.id ?? currentUser?._id ?? "";
  // Direct-offer jobs are exclusive to whichever freelancer they were sent
  // to (via offeredTo) and go through /api/jobs/offer-response, not the
  // general invite/bid flow — this used to check pricingMode !== "direct",
  // a value that doesn't exist on Job (the field is type: "direct_offer"),
  // so the filter never actually excluded anything.
  const myOpenJobs = jobs.filter(j =>
    (j.clientId === uid) &&
    j.status === "open" &&
    j.type !== "direct_offer"
  );

  const freelancerBidJobIds = new Set(
    bids.filter(b => b.freelancerId === freelancerId).map(b => b.jobId)
  );

  const handleInvite = async () => {
    if (!selectedJobId) { toast.error("Select a job first"); return; }
    const job = myOpenJobs.find(j => (j.id ?? j._id) === selectedJobId);
    if (!job) return;
    const token = await getValidToken();
    if (!token) { toast.error("Please log in again"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          freelancerId,
          jobId: selectedJobId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Invite sent!", { description: `${freelancerName} has been notified.` });
      // Invites consume the monthly invites quota server-side — refresh so
      // planUsage reflects it immediately instead of only after next login.
      refreshCurrentUser();
      handleClose();
    } catch (e: unknown) {
      toast.error("Failed to send invite", { description: e instanceof Error ? e.message : "Try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-[#ffffff] border-[rgba(75,63,143,0.22)] rounded-2xl p-6 gap-5">
        <DialogHeader className="text-left gap-1">
          <DialogTitle className="font-serif font-normal text-xl text-[#3d3a45]">Invite to Bid</DialogTitle>
          <DialogDescription className="text-[11px] text-[#46424e] mt-0.5">
            Invite <span className="text-[#4b3f8f]">{freelancerName}</span> to one of your open jobs
          </DialogDescription>
        </DialogHeader>

        {myOpenJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#46424e]">No open jobs available.</p>
            <p className="text-xs text-[#46424e] mt-1 opacity-70">Post a job first, then invite freelancers to bid.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {myOpenJobs.map(job => {
              const jid = job.id ?? job._id ?? "";
              const isSelected = selectedJobId === jid;
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
                      <div className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                           style={{ borderColor: isSelected ? "#4b3f8f" : "#46424e" }}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#4b3f8f" }} />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-[#3d3a45] truncate block">{job.title}</span>
                        {freelancerBidJobIds.has(jid) && (
                          <span className="text-[10px] text-[#4d7245] font-medium">✓ Already bid on this job</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-serif shrink-0" style={{ color: "#4b3f8f" }}>
                      {formatMoney(getCurrentPrice(job, now))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={handleClose} className="btn-ghost flex-1 h-10 text-sm">Cancel</button>
          <button
            onClick={handleInvite}
            disabled={submitting || !selectedJobId || myOpenJobs.length === 0}
            className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Invite
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
