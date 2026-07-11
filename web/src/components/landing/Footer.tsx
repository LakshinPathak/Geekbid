import Link from "next/link";
import { Logo } from "@/components/Logo";

/* Fixed, hand-authored dot positions for the footer "constellation"
   background — deterministic (no Math.random at render). */
const CONSTELLATION_DOTS = [
  { top: "10%", left: "8%", delay: "0s" },
  { top: "25%", left: "22%", delay: "0.6s" },
  { top: "15%", left: "40%", delay: "1.2s" },
  { top: "35%", left: "58%", delay: "0.3s" },
  { top: "20%", left: "72%", delay: "1.8s" },
  { top: "40%", left: "88%", delay: "0.9s" },
  { top: "60%", left: "15%", delay: "1.5s" },
  { top: "70%", left: "45%", delay: "0.2s" },
  { top: "55%", left: "80%", delay: "1.1s" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(75,63,143,0.22)] py-12 sm:py-16 bg-[#ffffff] relative overflow-hidden">
      {/* Constellation background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {CONSTELLATION_DOTS.map((d, i) => (
          <span
            key={i}
            className="landing-constellation-dot absolute h-1 w-1 rounded-full bg-[#4b3f8f]"
            style={{ top: d.top, left: d.left, animationDelay: d.delay }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-[1400px] px-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-12 mb-12">
          {/* Brand */}
          <div className="sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Logo markClassName="h-8 w-8" textClassName="text-base font-bold tracking-[0.03em] font-sans" />
            </div>
            <p className="text-sm text-[#6f6a7d] leading-relaxed">
              The reverse-auction marketplace for engineering talent.
            </p>
          </div>

          {/* Platform */}
          <div>
            <p className="landing-label text-[#4b3f8f] mb-4">Platform</p>
            <div className="flex flex-col gap-2.5">
              <Link href="/feed" className="text-sm text-[#6f6a7d] hover:text-[#3d3a45] transition-colors">Browse Jobs</Link>
              <Link href="/post-job" className="text-sm text-[#6f6a7d] hover:text-[#3d3a45] transition-colors">Post a Job</Link>
              <Link href="/login?role=freelancer" className="text-sm text-[#6f6a7d] hover:text-[#3d3a45] transition-colors">Find Work</Link>
              <Link href="/pricing" className="text-sm text-[#6f6a7d] hover:text-[#3d3a45] transition-colors">Pricing</Link>
            </div>
          </div>
          {/* Company */}
          <div>
            <p className="landing-label text-[#4b3f8f] mb-4">Company</p>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-[#6f6a7d]">About Us</span>
              <span className="text-sm text-[#6f6a7d]">Careers</span>
              <span className="text-sm text-[#6f6a7d]">Blog</span>
              <span className="text-sm text-[#6f6a7d]">Contact</span>
            </div>
          </div>
          {/* Legal */}
          <div>
            <p className="landing-label text-[#4b3f8f] mb-4">Legal</p>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-[#6f6a7d]">Terms of Service</span>
              <span className="text-sm text-[#6f6a7d]">Privacy Policy</span>
              <span className="text-sm text-[#6f6a7d]">Cookie Policy</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[rgba(75,63,143,0.22)]">
          <p className="text-xs text-[#6f6a7d]">&copy; 2026 GeekBid Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
