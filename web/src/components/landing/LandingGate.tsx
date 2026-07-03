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
    <div className="bg-[#080b14] text-[#f0e8d4] overflow-x-hidden">
      {children}
    </div>
  );
}
