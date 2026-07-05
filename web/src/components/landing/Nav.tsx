"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useActiveSection } from "./hooks";
import ScrollProgress from "./ScrollProgress";

const NAV_LINKS = [
  { id: "how-it-works", label: "How it Works" },
  { id: "features", label: "Features" },
  { id: "compare", label: "Compare" },
  { id: "testimonials", label: "Testimonials" },
  { id: "faq", label: "FAQ" },
];

export default function Nav() {
  const activeId = useActiveSection(NAV_LINKS.map((l) => l.id));

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    // Scoped smooth-scroll (not a global `html { scroll-behavior: smooth }`
    // rule) so this never affects anchor/scroll behavior on other routes.
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[rgba(201,168,76,0.22)] bg-[#050810]">
      <ScrollProgress />
      <div className="flex h-14 items-center justify-between px-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-[#c9a84c] text-[#050810] text-xs font-black font-sans">G</div>
          <span className="text-sm font-bold tracking-[0.03em] font-sans text-[#f0e8d4]">GeekBid</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[11px] tracking-[0.09em] uppercase text-[#a8997e] font-sans">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => handleNavClick(e, link.id)}
              className={`hover:text-[#c9a84c] transition-colors duration-200 ${activeId === link.id ? "landing-nav-link-active" : ""}`}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="hidden sm:block text-[11px] tracking-[0.06em] uppercase text-[#a8997e] hover:text-[#a8997e] transition-colors font-sans">Sign In</button>
          </Link>
          <Link href="/login?tab=register&role=client">
            <button className="flex items-center gap-2 btn-primary text-[11px] tracking-[0.07em] uppercase px-4 py-2 rounded-[3px]">
              Get Started <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
