"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useActiveSection } from "./hooks";
import ScrollProgress from "./ScrollProgress";
import { Logo } from "@/components/Logo";

const NAV_LINKS = [
  { id: "how-it-works", label: "How it Works" },
  { id: "compare", label: "Compare" },
  { id: "pricing", label: "Pricing" },
  { id: "testimonials", label: "Testimonials" },
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
    <nav className="sticky top-0 z-50 w-full border-b border-[rgba(75,63,143,0.22)] bg-[#ffffff]">
      <ScrollProgress />
      <div className="flex h-14 items-center justify-between px-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2.5">
          <Logo markClassName="h-7 w-7" textClassName="text-sm font-bold tracking-[0.03em] font-sans" />
        </div>
        <div className="hidden md:flex items-center gap-6 text-[11px] tracking-[0.09em] uppercase text-[#6f6a7d] font-sans">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => handleNavClick(e, link.id)}
              className={`hover:text-[#4b3f8f] transition-colors duration-200 ${activeId === link.id ? "landing-nav-link-active" : ""}`}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="hidden sm:block text-[11px] tracking-[0.06em] uppercase text-[#6f6a7d] hover:text-[#4b3f8f] transition-colors font-sans">Sign In</button>
          </Link>
          <Link href="/login?tab=register&role=client">
            <button className="flex items-center gap-2 btn-primary text-[11px] tracking-[0.07em] uppercase px-4 py-2 rounded-full">
              Get Started <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
