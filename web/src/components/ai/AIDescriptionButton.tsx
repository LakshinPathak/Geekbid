"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/lib/store";

type DescriptionResult = {
  description: string;
  deliverables: string[];
  suggestedSkills: string[];
  estimatedComplexity: string;
  clarifyingQuestions: string[];
};

type Props = {
  title: string;
  skills: string[];
  category?: string;
  estimatedHours?: number;
  budget?: string;
  onApply?: (description: string, suggestedSkills: string[]) => void;
};

export default function AIDescriptionButton({ title, skills, category, estimatedHours, budget, onApply }: Props) {
  const { getValidToken } = useApp();
  const [result, setResult] = useState<DescriptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!title || title.trim().length < 5) return null;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ title, skills, category, estimatedHours, budget }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
      } else {
        setResult(data);
        setOpen(true);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function copyDescription() {
    if (!result) return;
    await navigator.clipboard.writeText(result.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-[rgba(75,63,143,0.22)] bg-[#ffffff] overflow-hidden">
      <button
        onClick={() => result ? setOpen(o => !o) : generate()}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(75,63,143,0.06)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#4b3f8f]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Description with AI
        </span>
        {result && (open ? <ChevronUp className="h-3.5 w-3.5 text-[#6f6a7d]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#6f6a7d]" />)}
      </button>

      {error && <div className="px-4 pb-3 text-xs text-[#96543f]">{error}</div>}

      {result && open && (
        <div className="border-t border-[rgba(75,63,143,0.12)] px-4 py-4 space-y-4">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider">Generated Description</p>
              <button onClick={copyDescription} className="flex items-center gap-1 text-[10px] text-[#6f6a7d] hover:text-[#4b3f8f]">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-[#3d3a45] leading-relaxed whitespace-pre-wrap">{result.description}</p>
          </div>

          {/* Deliverables */}
          {result.deliverables.length > 0 && (
            <div>
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider mb-2">Deliverables</p>
              <ul className="space-y-1">
                {result.deliverables.map((d, i) => (
                  <li key={i} className="text-xs text-[#3d3a45] flex items-start gap-1.5">
                    <span className="text-[#4b3f8f] mt-0.5">•</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Skills */}
          {result.suggestedSkills.length > 0 && (
            <div>
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider mb-2">Suggested Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.suggestedSkills.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-[#f4f2ee] text-[#6f6a7d] border border-[rgba(75,63,143,0.22)]">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Clarifying Questions */}
          {result.clarifyingQuestions.length > 0 && (
            <div>
              <p className="text-[10px] text-[#6f6a7d] uppercase tracking-wider mb-2">Consider Clarifying</p>
              {result.clarifyingQuestions.map((q, i) => (
                <p key={i} className="text-xs text-[#6f6a7d] mb-1">? {q}</p>
              ))}
            </div>
          )}

          {/* Apply */}
          {onApply && (
            <button
              onClick={() => onApply(result.description, result.suggestedSkills)}
              className="w-full py-2 rounded-full text-sm font-semibold bg-[#4b3f8f] text-[#fbfaf7] hover:bg-[#3d3373] transition-colors"
            >
              Use This Description
            </button>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full py-1.5 rounded-full text-xs text-[#6f6a7d] border border-[rgba(75,63,143,0.22)] hover:border-[#4b3f8f] transition-colors"
          >
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  );
}
