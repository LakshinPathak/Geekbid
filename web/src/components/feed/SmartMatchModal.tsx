"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { X, Send, Loader2, Sparkles, Crown, CheckCircle2 } from "lucide-react";
import CloudinaryAvatar from "@/components/CloudinaryAvatar";

interface MatchRow {
  freelancerId: string;
  fullName: string;
  geekScore: number;
  score: number;
  breakdown: { skills: number; winRate: number; bidHistory: number };
}

interface Props {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}

export default function SmartMatchModal({ jobId, jobTitle, onClose }: Props) {
  const { auth, users } = useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [topN, setTopN] = useState(0);
  const [canAutoInvite, setCanAutoInvite] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 180);
  };

  const loadMatches = useCallback(async () => {
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/smart-match`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load matches");
      const list: MatchRow[] = data.matches ?? [];
      setMatches(list);
      setTopN(data.topN ?? 0);
      setCanAutoInvite(Boolean(data.canAutoInvite));
      const defaultIds = list.slice(0, data.topN ?? 0).map((m) => m.freelancerId);
      setSelected(new Set(defaultIds));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [auth.accessToken, jobId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const selectedCount = selected.size;
  const atSelectionCap = topN > 0 && selectedCount >= topN;

  const toggleSelect = (freelancerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(freelancerId)) {
        next.delete(freelancerId);
      } else if (!atSelectionCap || topN === 0) {
        if (topN > 0 && next.size >= topN) return prev;
        next.add(freelancerId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!canAutoInvite || selectedCount === 0 || !auth.accessToken) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/smart-match/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ freelancerIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invites");
      toast.success("Invites sent!", { description: data.message });
      handleClose();
    } catch (e: unknown) {
      toast.error("Failed to send invites", {
        description: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const userById = useMemo(() => {
    const map = new Map<string, (typeof users)[number]>();
    users.forEach((u) => map.set(u.id ?? u._id ?? "", u));
    return map;
  }, [users]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 max-h-[90vh] flex flex-col ${isClosing ? "animate-scale-out" : "animate-scale-in"}`}
        style={{ background: "#ffffff", borderColor: "rgba(75,63,143,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-serif font-normal text-xl text-[#3d3a45] flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#4b3f8f]" />
              Smart Match
            </h2>
            <p className="text-[11px] text-[#46424e] mt-0.5 line-clamp-2">
              Ranked freelancers for <span className="text-[#4b3f8f]">{jobTitle}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-[#f4f2ee] transition-colors"
          >
            <X className="h-4 w-4 text-[#46424e]" />
          </button>
        </div>

        {!canAutoInvite && !loading && (
          <div className="rounded-2xl border border-[rgba(75,63,143,0.22)] bg-[rgba(75,63,143,0.06)] px-4 py-3 flex items-start gap-2">
            <Crown className="h-4 w-4 text-[#4b3f8f] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#3d3a45]">Preview mode</p>
              <p className="text-[11px] text-[#46424e] mt-0.5">
                Upgrade to Plus or Premium to invite top matches in one click.
              </p>
              <Link href="/pricing" className="text-[11px] text-[#4b3f8f] font-semibold hover:underline mt-1 inline-block">
                View plans →
              </Link>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#46424e] text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading matches…
            </div>
          ) : error ? (
            <p className="text-sm text-[#c14d3a] text-center py-8">{error}</p>
          ) : matches.length === 0 ? (
            <p className="text-sm text-[#46424e] text-center py-8">
              No eligible freelancers found. Try again after more talent joins or adjust job skills.
            </p>
          ) : (
            matches.map((m, i) => {
              const user = userById.get(m.freelancerId);
              const isSelected = selected.has(m.freelancerId);
              const disabled = canAutoInvite && !isSelected && atSelectionCap;
              return (
                <button
                  key={m.freelancerId}
                  type="button"
                  disabled={!canAutoInvite ? false : disabled}
                  onClick={() => canAutoInvite && toggleSelect(m.freelancerId)}
                  className={`w-full text-left rounded-2xl px-4 py-3 border transition-all ${
                    isSelected && canAutoInvite
                      ? "bg-[rgba(75,63,143,0.08)] border-[rgba(75,63,143,0.35)]"
                      : "bg-[#f4f2ee] border-[rgba(75,63,143,0.12)]"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : canAutoInvite ? "cursor-pointer hover:border-[rgba(75,63,143,0.25)]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {canAutoInvite && (
                      <div
                        className="h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 mt-1"
                        style={{ borderColor: isSelected ? "#4b3f8f" : "#46424e" }}
                      >
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-[#4b3f8f]" />}
                      </div>
                    )}
                    <CloudinaryAvatar
                      avatarUrl={user?.avatarUrl}
                      avatarInitial={user?.avatarInitial ?? m.fullName[0] ?? "?"}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[#3d3a45] truncate">
                          #{i + 1} {m.fullName}
                        </span>
                        <span className="text-sm font-serif text-[#4b3f8f] shrink-0">{m.score}%</span>
                      </div>
                      <p className="text-[10px] text-[#46424e] mt-0.5">
                        GS {m.geekScore} · Skills {m.breakdown.skills}% · Win {m.breakdown.winRate}% · History {m.breakdown.bidHistory}%
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3 pt-1 shrink-0">
          <button onClick={handleClose} className="btn-ghost flex-1 h-10 text-sm">
            {canAutoInvite ? "Cancel" : "Close"}
          </button>
          {canAutoInvite && (
            <button
              onClick={handleConfirm}
              disabled={submitting || selectedCount === 0 || loading}
              className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Invite {selectedCount || topN} selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
