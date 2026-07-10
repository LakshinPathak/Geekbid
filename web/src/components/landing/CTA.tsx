"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

/* Closing section: hook (badge + headline), then one shared pair of CTA buttons. */
export default function CTA() {
  return (
    <section className="py-24 sm:py-32 border-t border-[rgba(75,63,143,0.22)] relative grid-bg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="landing-cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#4b3f8f]/[0.09] rounded-full blur-[160px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(75,63,143,0.4)] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(75,63,143,0.2)] to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-5 text-center relative z-10">
        <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#4b3f8f] border border-[rgba(75,63,143,0.22)] px-3 py-1.5 rounded-full mb-8 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4b3f8f] animate-pulse inline-block" />
          Join 2,400+ engineers on GeekBid
        </div>
        <h2 className="landing-header-glow text-4xl sm:text-6xl md:text-7xl font-serif font-normal text-[#3d3a45] leading-[1.05]">
          Ready to hire<br /><em className="text-[#4b3f8f] not-italic">smarter?</em>
        </h2>
        <p className="text-lg text-[#6f6a7d] mt-6 max-w-lg mx-auto">
          Join thousands of companies using reverse auctions to find the best engineering talent at the right price.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-5 text-center relative z-10 mt-16">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login?tab=register&role=client">
            <button className="group btn-primary text-base px-12 py-4 rounded-full">
              Get Started Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link href="/login?tab=register&role=freelancer">
            <button className="btn-ghost text-base px-12 py-4 rounded-full">
              Apply as Freelancer <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
        <p className="text-xs text-[#6f6a7d] mt-6 opacity-60">No credit card required · Free to post · 10% success fee only</p>
      </div>
    </section>
  );
}
