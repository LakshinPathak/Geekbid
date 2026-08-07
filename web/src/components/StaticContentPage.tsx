import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

/** Shared shell for the footer's low-traffic static pages (About, Careers,
 *  Blog, Contact, Terms, Privacy, Cookies) so they share one consistent
 *  header/typography treatment instead of duplicating markup seven times. */
export default function StaticContentPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#17171f]">
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[#46424e] text-sm hover:text-[#5b21b6] transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="flex items-center gap-2.5 mb-8">
          <Logo markClassName="h-7 w-7" textClassName="text-sm font-bold tracking-[0.03em] font-sans" />
        </div>
        <h1 className="landing-h2 text-3xl sm:text-4xl text-[#17171f] mb-8">{title}</h1>
        <div className="prose-static text-[15px] leading-relaxed text-[#46424e] space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
