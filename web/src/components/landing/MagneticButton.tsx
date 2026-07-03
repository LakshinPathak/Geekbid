"use client";

import { useRef, type ReactNode } from "react";
import { usePointerFine, useMagneticHover } from "./hooks";

/** Wraps a button/link so it subtly follows the cursor on hover, then
 * snaps back — disabled entirely on touch/coarse-pointer devices. */
export default function MagneticButton({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useMagneticHover(ref, isPointerFine);

  return (
    <div ref={ref} className={`landing-magnetic-btn ${className}`}>
      {children}
    </div>
  );
}
