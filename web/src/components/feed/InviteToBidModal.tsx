"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { X, Send, Loader2 } from "lucide-react";
import { formatMoney, getCurrentPrice } from "@/lib/utils";

interface Props {
  freelancerId: string;
  freelancerName: string;
  onClose: () => void;
}

export default function InviteToBidModal({ freelancerId, freelancerName, onClose }: Props) {
  const { jobs, currentUser, auth, bids, now } = useApp();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const uid = currentUser?.id ?? currentUser?._id ?? "";
  const myOpenJobs = jobs.filter(j =>
    (j.clientId === uid) &&
    j.status === "open" &&
    j.pricingMode !== "direct" as never
  );

  const freelancerBidJobIds = new Set(
    bids.filter(b => b.freelancerId === freelancerId).map(b => b.jobId)
  );

  const handleInvite = async () => {
    if (!selectedJobId) { toast.error("Select a job first"); return; }
    const job = myOpenJobs.find(j => (j.id ?? j._id) === selectedJobId);
    if (!job || !auth.accessToken) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          freelancerId,
          jobId: selectedJobId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Invite sent!", { description: `${freelancerName} has been notified.` });
      onClose();
    } catch {
      toast.error("Failed to send invite");
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
            <h2 className="font-serif font-normal text-xl text-[#f0e8d4]">Invite to Bid</h2>
            <p className="text-[11px] text-[#a8997e] mt-0.5">
              Invite <span className="text-[#c9a84c]">{freelancerName}</span> to one of your open jobs
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-[3px] flex items-center justify-center hover:bg-[#111625] transition-colors"
          >
            <X className="h-4 w-4 text-[#a8997e]" />
          </button>
        </div>

        {myOpenJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#a8997e]">No open jobs available.</p>
            <p className="text-xs text-[#a8997e] mt-1 opacity-70">Post a job first, then invite freelancers to bid.</p>
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
                  className="w-full text-left rounded-[6px] px-4 py-3 border transition-all"
                  style={{
                    background: isSelected ? "rgba(201,168,76,0.08)" : "#111625",
                    borderColor: isSelected ? "rgba(201,168,76,0.35)" : "rgba(201,168,76,0.12)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0"
                           style={{ borderColor: isSelected ? "#c9a84c" : "#a8997e" }}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#c9a84c" }} />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-[#f0e8d4] truncate block">{job.title}</span>
                        {freelancerBidJobIds.has(jid) && (
                          <span className="text-[10px] text-[#4caf7d] font-medium">✓ Already bid on this job</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-serif shrink-0" style={{ color: "#c9a84c" }}>
                      {formatMoney(getCurrentPrice(job, now))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 h-10 text-sm">Cancel</button>
          <button
            onClick={handleInvite}
            disabled={submitting || !selectedJobId || myOpenJobs.length === 0}
            className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
