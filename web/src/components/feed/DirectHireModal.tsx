"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { X, Zap, Loader2 } from "lucide-react";

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
      onClose();
    } else {
      toast.error("Failed to send offer", { description: result.message });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[6px] border p-6 space-y-5"
        style={{ background: "#0d1120", borderColor: "rgba(201,168,76,0.22)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif font-normal text-xl text-[#f0e8d4]">Direct Hire</h2>
            <p className="text-[11px] text-[#a8997e] mt-0.5">
              Sending offer to <span className="text-[#c9a84c]">{freelancerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-[3px] flex items-center justify-center hover:bg-[#111625] transition-colors"
          >
            <X className="h-4 w-4 text-[#a8997e]" />
          </button>
        </div>

        {/* Info note */}
        <div className="rounded-[3px] px-3 py-2 text-[11px]"
             style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.15)" }}>
          <span style={{ color: "#a8997e" }}>
            Direct offers are available for freelancers with GeekScore 500+
          </span>
        </div>

        {/* Job title */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">
            Job Title <span className="text-[#B02020]">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Build a React dashboard"
            className="glass-input h-10 text-sm rounded-[3px] w-full"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the project scope..."
            rows={3}
            className="glass-input text-sm rounded-[3px] w-full resize-none p-3"
          />
        </div>

        {/* Price + Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">
              Price ($) <span className="text-[#B02020]">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              min={1}
              className="glass-input h-10 text-sm rounded-[3px] w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">Est. Hours</label>
            <input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(Number(e.target.value))}
              min={1}
              className="glass-input h-10 text-sm rounded-[3px] w-full"
            />
          </div>
        </div>

        {/* Rate hint */}
        {(hourlyRateMin || hourlyRateMax) && (
          <p className="text-[11px] text-[#a8997e] -mt-2">
            Freelancer rate: <span className="text-[#c9a84c]">${hourlyRateMin}–${hourlyRateMax}/hr</span>
          </p>
        )}

        {/* Skills (read-only) */}
        {freelancerSkills.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a8997e]">Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {freelancerSkills.slice(0, 8).map(s => (
                <span key={s} className="px-2 py-0.5 rounded-[2px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 h-10 text-sm">
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
      </div>
    </div>
  );
}
