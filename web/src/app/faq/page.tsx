import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import FAQ from "@/components/landing/FAQ";

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[900px] mx-auto px-5 sm:px-8 pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[#46424e] text-sm hover:text-[#5b21b6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="flex items-center gap-2.5 mt-6">
          <Logo markClassName="h-7 w-7" textClassName="text-sm font-bold tracking-[0.03em] font-sans" />
        </div>
      </div>
      <FAQ />
    </div>
  );
}
