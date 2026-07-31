"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

/** Owns the landing page's auth gate: renders nothing (and redirects to
 * /feed) once a logged-in user is detected, exactly as the original
 * monolithic page.tsx did. Isolated here so page.tsx itself can stay
 * pure composition with no hooks of its own. */
export default function LandingGate({ children }: { children: ReactNode }) {
  const { currentUser, mounted } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (mounted && currentUser) router.replace("/feed");
  }, [mounted, currentUser, router]);

  if (!mounted || currentUser) return null;

  return (
    // overflow-x-clip (not overflow-x-hidden) on purpose: setting only
    // overflow-x to a non-"visible" value forces the browser to compute
    // overflow-y as "auto" (CSS overflow spec), which turns this div into
    // a scroll container and breaks `position: sticky` on <Nav> below —
    // "clip" is exempt from that visible/non-visible coupling and still
    // blocks the horizontal bleed from the hero's oversized mesh/glow
    // backgrounds, so the sticky header keeps working.
    <div className="bg-[#fbfaf7] text-[#17171f] overflow-x-clip">
      {children}
    </div>
  );
}
