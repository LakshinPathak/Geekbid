"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useActiveSection } from "./hooks";
import ScrollProgress from "./ScrollProgress";
import { Logo } from "@/components/Logo";

// In-page sections (scroll-spy + smooth-scroll-to-anchor).
const NAV_LINKS = [
  { id: "how-it-works", label: "How it Works" },
  { id: "live", label: "Live Auctions" },
  { id: "trust", label: "Trust" },
];

// Real standalone pages, not landing-page sections — Compare, Pricing
// (full plan-management page, auth-aware), and FAQ each got too
// substantial to be an in-page table/card-row/accordion competing with
// the landing page's pitch narrative, so they're linked here instead of
// anchor-scrolled to.
const PAGE_LINKS = [
  { href: "/compare", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export default function Nav() {
  const activeId = useActiveSection(NAV_LINKS.map((l) => l.id));
  const [menuOpen, setMenuOpen] = useState(false);

  // Below `lg` the link row and "Sign In" that the desktop layout hides
  // move into this drawer instead of just disappearing with nothing to
  // replace them. Close it automatically if the viewport grows back past
  // the breakpoint where the full desktop row takes over. (The switchover
  // is `lg`, not `md` — at 768–1023px the six text links + Sign In +
  // Get Started don't have room to lay out on one line without wrapping.)
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setMenuOpen(false); };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    // Scoped smooth-scroll (not a global `html { scroll-behavior: smooth }`
    // rule) so this never affects anchor/scroll behavior on other routes.
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (menuOpen) {
      // The drawer's 300ms collapse shifts everything below it — starting
      // scrollIntoView in the same tick as closing it means the target's
      // position moves mid-animation and the native smooth-scroll stalls
      // partway. Let the collapse finish first.
      setMenuOpen(false);
      setTimeout(scroll, 320);
    } else {
      scroll();
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[rgba(91,33,182,0.22)] bg-[#ffffff]">
      <ScrollProgress />
      <div className="flex h-14 items-center justify-between px-5 sm:px-8 max-w-[1600px] mx-auto">
        <div className="group flex items-center gap-2.5">
          <Logo
            markClassName="h-7 w-7 transition-transform duration-[180ms] ease-out group-hover:translate-y-[2px]"
            textClassName="text-sm font-bold tracking-[0.03em]"
          />
        </div>
        <div className="hidden lg:flex items-center gap-1 landing-label text-[#46424e]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => handleNavClick(e, link.id)}
              className={`px-3 py-2 rounded-full hover:bg-[rgba(91,33,182,0.06)] hover:text-[#5b21b6] transition-colors duration-200 ${activeId === link.id ? "landing-nav-link-active bg-[rgba(91,33,182,0.08)]" : ""}`}
            >
              {link.label}
            </a>
          ))}
          {PAGE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-full hover:bg-[rgba(91,33,182,0.06)] hover:text-[#5b21b6] transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="hidden lg:block px-3 py-2 rounded-full landing-label text-[#46424e] hover:bg-[rgba(91,33,182,0.06)] hover:text-[#5b21b6] transition-colors">Sign In</button>
          </Link>
          <Link href="/login?tab=register&role=client">
            <button className="flex items-center gap-2 btn-primary landing-label px-4 py-2 rounded-full">
              Get Started <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            className="lg:hidden flex items-center justify-center h-10 w-10 -mr-2 text-[#46424e] hover:text-[#5b21b6] transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer: the same section links + Sign In the desktop row
          hides below `lg`, given an actual way back in. Native-<details>-
          style grid-rows collapse (same mechanism FAQ.tsx uses) rather than
          height/max-height, so it animates smoothly regardless of content
          height and skips the transition under prefers-reduced-motion. */}
      <div
        id="mobile-nav-menu"
        className={`lg:hidden grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.78,0.2,1)] motion-reduce:transition-none ${menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden border-t border-[rgba(91,33,182,0.22)]">
          <div className="flex flex-col px-5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => handleNavClick(e, link.id)}
                className={`flex items-center h-12 landing-label text-[#46424e] hover:text-[#5b21b6] transition-colors border-b border-[rgba(91,33,182,0.12)] ${activeId === link.id ? "landing-nav-link-active" : ""}`}
              >
                {link.label}
              </a>
            ))}
            {PAGE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center h-12 landing-label text-[#46424e] hover:text-[#5b21b6] transition-colors border-b border-[rgba(91,33,182,0.12)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center h-12 landing-label text-[#46424e] hover:text-[#5b21b6] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
