// Single source of truth for the GeekBid logo mark (circular "< >" bracket
// icon + green online dot) and wordmark, sourced from the brand SVG. Every
// nav/footer/branding surface composes these two pieces instead of
// hand-duplicating the icon markup, so the mark stays pixel-identical
// everywhere it appears.

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="30" cy="30" r="20" fill="#453B78" />
      <path
        d="M25 21 L18 30 L25 39"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 21 L42 30 L35 39"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="30" cy="30" r="2.6" fill="#4ADE80" />
    </svg>
  );
}

export function LogoWordmark({ className = "text-sm font-bold tracking-[0.03em] font-sans" }: { className?: string }) {
  return (
    <span className={className}>
      <span style={{ color: "#26243A" }}>Geek</span>
      <span style={{ color: "#453B78" }}>Bid</span>
    </span>
  );
}

// Convenience wrapper for the common icon+wordmark pairing. Renders as a
// fragment (no wrapping element) so it drops into each call site's existing
// flex/gap container without disturbing layout.
export function Logo({
  markClassName,
  textClassName,
}: {
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <>
      <LogoMark className={markClassName} />
      <LogoWordmark className={textClassName} />
    </>
  );
}
