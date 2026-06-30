"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

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
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    <div className="rounded-[6px] border border-[rgba(201,168,76,0.22)] bg-[#0d1120] overflow-hidden">
      <button
        onClick={() => result ? setOpen(o => !o) : generate()}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(201,168,76,0.06)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[#c9a84c]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Description with AI
        </span>
        {result && (open ? <ChevronUp className="h-3.5 w-3.5 text-[#a8997e]" /> : <ChevronDown className="h-3.5 w-3.5 text-[#a8997e]" />)}
      </button>

      {error && <div className="px-4 pb-3 text-xs text-[#e57373]">{error}</div>}

      {result && open && (
        <div className="border-t border-[rgba(201,168,76,0.12)] px-4 py-4 space-y-4">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider">Generated Description</p>
              <button onClick={copyDescription} className="flex items-center gap-1 text-[10px] text-[#a8997e] hover:text-[#c9a84c]">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-[#f0e8d4] leading-relaxed whitespace-pre-wrap">{result.description}</p>
          </div>

          {/* Deliverables */}
          {result.deliverables.length > 0 && (
            <div>
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider mb-2">Deliverables</p>
              <ul className="space-y-1">
                {result.deliverables.map((d, i) => (
                  <li key={i} className="text-xs text-[#f0e8d4] flex items-start gap-1.5">
                    <span className="text-[#c9a84c] mt-0.5">•</span>{d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Skills */}
          {result.suggestedSkills.length > 0 && (
            <div>
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider mb-2">Suggested Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.suggestedSkills.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-[2px] text-[11px] bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.22)]">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Clarifying Questions */}
          {result.clarifyingQuestions.length > 0 && (
            <div>
              <p className="text-[10px] text-[#a8997e] uppercase tracking-wider mb-2">Consider Clarifying</p>
              {result.clarifyingQuestions.map((q, i) => (
                <p key={i} className="text-xs text-[#a8997e] mb-1">? {q}</p>
              ))}
            </div>
          )}

          {/* Apply */}
          {onApply && (
            <button
              onClick={() => onApply(result.description, result.suggestedSkills)}
              className="w-full py-2 rounded-[3px] text-sm font-semibold bg-[#c9a84c] text-[#080b14] hover:bg-[#d4b55a] transition-colors"
            >
              Use This Description
            </button>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="w-full py-1.5 rounded-[3px] text-xs text-[#a8997e] border border-[rgba(201,168,76,0.22)] hover:border-[#c9a84c] transition-colors"
          >
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      )}
    </div>
  );
}
