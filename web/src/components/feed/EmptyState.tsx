interface EmptyStateProps {
  variant?: "jobs" | "bids" | "talent";
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

function JobsIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true">
      <rect x="10" y="14" width="68" height="48" rx="4" stroke="#4b3f8f" strokeOpacity="0.35" strokeWidth="1.5" />
      <line x1="18" y1="28" x2="52" y2="28" stroke="#6f6a7d" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="38" x2="70" y2="38" stroke="#6f6a7d" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="48" x2="60" y2="48" stroke="#6f6a7d" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <circle cx="44" cy="8" r="6" fill="#4b3f8f" fillOpacity="0.18" />
      <path d="M41 8h6M44 5v6" stroke="#4b3f8f" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BidsIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true">
      <path d="M14 52 L30 34 L44 42 L60 20 L76 30" stroke="#4b3f8f" strokeOpacity="0.4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="76" cy="30" r="4" fill="#4b3f8f" fillOpacity="0.5" />
      <circle cx="14" cy="52" r="3" fill="#6f6a7d" fillOpacity="0.4" />
    </svg>
  );
}

function TalentIllustration() {
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true">
      <circle cx="30" cy="26" r="10" stroke="#6f6a7d" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M14 58c0-9 7-15 16-15s16 6 16 15" stroke="#6f6a7d" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="62" cy="20" r="7" stroke="#4b3f8f" strokeOpacity="0.3" strokeWidth="1.5" />
      <path d="M50 46c0-6.5 5.4-11 12-11s12 4.5 12 11" stroke="#4b3f8f" strokeOpacity="0.3" strokeWidth="1.5" />
    </svg>
  );
}

const ILLUSTRATIONS = { jobs: JobsIllustration, bids: BidsIllustration, talent: TalentIllustration };

export default function EmptyState({ variant = "jobs", title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  const Illustration = ILLUSTRATIONS[variant];
  return (
    <div className="text-center py-14 px-4 flex flex-col items-center gap-3">
      <Illustration />
      <p className="text-[#3d3a45] text-base font-medium mt-1">{title}</p>
      {subtitle && <p className="text-[#6f6a7d] text-sm max-w-sm">{subtitle}</p>}
      {ctaLabel && onCta && (
        <button onClick={onCta} className="btn-ghost text-xs px-4 py-2 mt-2">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
