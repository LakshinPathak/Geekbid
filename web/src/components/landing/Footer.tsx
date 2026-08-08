import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="py-12 sm:py-16 bg-[#ffffff] relative overflow-hidden">
      {/* Crisp gradient hairline — no blurred wash beneath it, per the
          Editorial redesign's "no glow" rule. */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(91,33,182,0.3)] to-transparent" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1600px] px-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-12 mb-12 text-center sm:text-left">
          {/* Brand */}
          <div className="sm:col-span-1 flex flex-col items-center sm:items-start">
            <div className="group flex items-center gap-2.5 mb-4">
              <Logo
                markClassName="h-8 w-8 transition-transform duration-300 ease-[cubic-bezier(0.2,0.78,0.2,1)] group-hover:scale-110"
                textClassName="text-base font-bold tracking-[0.03em]"
              />
            </div>
            <p className="text-sm text-[#46424e] leading-relaxed">
              The reverse-auction marketplace for freelance talent.
            </p>
          </div>

          {/* Platform */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="landing-label text-[#5b21b6] mb-4">Platform</p>
            <div className="flex flex-col items-center sm:items-start gap-0.5 sm:gap-2.5">
              <Link href="/feed" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Browse Jobs</Link>
              <Link href="/post-job" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Post a Job</Link>
              <Link href="/login?role=freelancer" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Find Work</Link>
              <Link href="/pricing" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Pricing</Link>
            </div>
          </div>
          {/* Company */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="landing-label text-[#5b21b6] mb-4">Company</p>
            <div className="flex flex-col items-center sm:items-start gap-0.5 sm:gap-2.5">
              <Link href="/about" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">About Us</Link>
              <Link href="/careers" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Careers</Link>
              <Link href="/blog" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Blog</Link>
              <Link href="/contact" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Contact</Link>
            </div>
          </div>
          {/* Legal */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="landing-label text-[#5b21b6] mb-4">Legal</p>
            <div className="flex flex-col items-center sm:items-start gap-0.5 sm:gap-2.5">
              <Link href="/terms" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Terms of Service</Link>
              <Link href="/privacy" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Privacy Policy</Link>
              <Link href="/cookies" className="text-sm text-[#46424e] hover:text-[#17171f] transition-[color,transform] duration-200 ease-out hover:translate-x-0.5 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-1.5">Cookie Policy</Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[rgba(91,33,182,0.22)]">
          <p className="text-xs text-[#46424e]">&copy; 2026 GeekBid Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
