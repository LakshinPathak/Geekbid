interface SectionDividerProps {
  variant?: "wave" | "diagonal";
  fill?: string;
  flip?: boolean;
  className?: string;
}

/** Reusable SVG divider rendered between landing-page sections. Pure/stateless. */
export default function SectionDivider({
  variant = "wave",
  fill = "#ffffff",
  flip = false,
  className = "",
}: SectionDividerProps) {
  return (
    <div
      className={`landing-divider overflow-hidden leading-[0] ${flip ? "rotate-180" : ""} ${className}`}
      aria-hidden="true"
    >
      {variant === "wave" ? (
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M0,32 C240,80 480,0 720,24 C960,48 1200,88 1440,40 L1440,80 L0,80 Z"
            fill={fill}
          />
        </svg>
      ) : (
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,80 L1440,0 L1440,80 Z" fill={fill} />
        </svg>
      )}
    </div>
  );
}
