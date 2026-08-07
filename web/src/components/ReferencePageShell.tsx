import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

/** Shared shell for the standalone reference pages linked from the
 *  landing Nav (Compare, Pricing, FAQ) — one header, one background,
 *  one container width, so a visitor bouncing between them doesn't see
 *  three differently-built pages. The width (1152px) matches Compare's
 *  table, the widest of the three; Pricing's cards and FAQ's narrower
 *  accordion both center comfortably inside it without needing their
 *  own separate max-width to line up against. */
export default function ReferencePageShell({ children }: { children: ReactNode }) {
  return (
    // overflow-x-clip (not overflow-x-hidden) — the landing page's own
    // wrapper uses the same fix for the same reason: some section
    // decoration (e.g. Comparison's ambient blur blob) is intentionally
    // wider than the viewport, contained on the full landing page by
    // its overflow-x-clip wrapper. These standalone pages need the same
    // containment since they reuse those components directly.
    <div className="landing-scope min-h-screen bg-[#fbfaf7] overflow-x-clip">
      <div className="max-w-[1152px] mx-auto px-5 sm:px-8 pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[#46424e] text-sm hover:text-[#5b21b6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="flex items-center gap-2.5 mt-6 mb-10 sm:mb-14">
          <Logo markClassName="h-7 w-7" textClassName="text-sm font-bold tracking-[0.03em]" />
        </div>
      </div>
      {children}
    </div>
  );
}
