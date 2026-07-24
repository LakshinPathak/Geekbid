"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { Zap, Loader2 } from "lucide-react";
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
  freelancerSkills: string[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  onClose: () => void;
}

export default function DirectHireModal({ freelancerId, freelancerName, freelancerSkills, hourlyRateMin, hourlyRateMax, onClose }: Props) {
  const { createDirectOffer } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const defaultHours = 20;
  const defaultPrice = Math.round((hourlyRateMax || hourlyRateMin || 50) * defaultHours);
  const [price, setPrice] = useState(defaultPrice);
  const [estimatedHours, setEstimatedHours] = useState(defaultHours);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Job title required"); return; }
    if (price <= 0) { toast.error("Price must be positive"); return; }

    setSubmitting(true);
    const result = await createDirectOffer({
      title,
      description,
      skillsRequired: freelancerSkills,
      price,
      freelancerId,
      estimatedHours,
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success("Direct offer sent!", { description: `${freelancerName} will be notified.` });
      handleClose();
    } else {
      toast.error("Failed to send offer", { description: result.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg bg-[#ffffff] border-[rgba(75,63,143,0.22)] rounded-2xl p-6 gap-5">
        <DialogHeader className="text-left gap-1">
          <DialogTitle className="font-serif font-normal text-xl text-[#3d3a45]">Direct Hire</DialogTitle>
          <DialogDescription className="text-[11px] text-[#46424e] mt-0.5">
            Sending offer to <span className="text-[#4b3f8f]">{freelancerName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Info note */}
        <div className="rounded-full px-3 py-2 text-[11px]"
             style={{ background: "rgba(75,63,143,0.06)", border: "0.5px solid rgba(75,63,143,0.15)" }}>
          <span style={{ color: "#46424e" }}>
            Direct offers are available for freelancers with GeekScore 500+
          </span>
        </div>

        {/* Job title */}
        <div className="space-y-1.5">
          <label htmlFor="direct-hire-title" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">
            Job Title <span className="text-[#c14d3a]">*</span>
          </label>
          <input
            id="direct-hire-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Build a React dashboard"
            className="glass-input h-10 text-sm rounded-full w-full"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="direct-hire-description" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">Description</label>
          <textarea
            id="direct-hire-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the project scope..."
            rows={3}
            className="glass-input text-sm rounded-full w-full resize-none p-3"
          />
        </div>

        {/* Price + Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="direct-hire-price" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">
              Price ($) <span className="text-[#c14d3a]">*</span>
            </label>
            <input
              id="direct-hire-price"
              type="number"
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              min={1}
              className="glass-input h-10 text-sm rounded-full w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="direct-hire-hours" className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">Est. Hours</label>
            <input
              id="direct-hire-hours"
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(Number(e.target.value))}
              min={1}
              className="glass-input h-10 text-sm rounded-full w-full"
            />
          </div>
        </div>

        {/* Rate hint */}
        {(hourlyRateMin || hourlyRateMax) && (
          <p className="text-[11px] text-[#46424e] -mt-2">
            Freelancer rate: <span className="text-[#4b3f8f]">${hourlyRateMin}–${hourlyRateMax}/hr</span>
          </p>
        )}

        {/* Skills (read-only) */}
        {freelancerSkills.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#46424e]">Skills</span>
            <div className="flex flex-wrap gap-1.5">
              {freelancerSkills.slice(0, 8).map(s => (
                <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#46424e] border border-[rgba(75,63,143,0.15)]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button onClick={handleClose} className="btn-ghost flex-1 h-10 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Send Offer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
