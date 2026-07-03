"use client";

import Link from "next/link";
import { Target, Code, CheckCircle2, ArrowRight, ChevronRight } from "lucide-react";
import MagneticButton from "./MagneticButton";

const CLIENT_BENEFITS = [
  "Post jobs with custom decay rates",
  "Escrow protects every payment",
  "Browse verified freelancer profiles",
  "Real-time chat with candidates",
];

const FREELANCER_BENEFITS = [
  "Watch job prices and bid at your target rate",
  "Build your GeekScore™ reputation",
  "Get matched to jobs by skills",
  "Guaranteed payment via escrow",
];

function DualCTA() {
  return (
    <section className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* For Clients */}
          <div className="group glass-card landing-glass-card hover:border-[rgba(201,168,76,0.40)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#c9a84c]/[0.05] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.35)] flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-[#c9a84c]" />
              </div>
              <h3 className="text-2xl font-serif font-normal text-[#f0e8d4] mb-3">For Clients</h3>
              <ul className="space-y-3 mb-8">
                {CLIENT_BENEFITS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#a8997e]">
                    <CheckCircle2 className="h-4 w-4 text-[#c9a84c] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <MagneticButton>
                <Link href="/login?tab=register&role=client">
                  <button className="btn-primary text-sm px-8 py-3.5 rounded-[3px] w-full justify-center">
                    Start Hiring <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </MagneticButton>
            </div>
          </div>

          {/* For Freelancers */}
          <div className="group glass-card landing-glass-card hover:border-[rgba(201,168,76,0.30)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/[0.05] rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="h-12 w-12 rounded-[3px] bg-[rgba(201,168,76,0.10)] border border-[rgba(201,168,76,0.35)] flex items-center justify-center mb-6">
                <Code className="h-6 w-6 text-[#c9a84c]" />
              </div>
              <h3 className="text-2xl font-serif font-normal text-[#f0e8d4] mb-3">For Freelancers</h3>
              <ul className="space-y-3 mb-8">
                {FREELANCER_BENEFITS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#a8997e]">
                    <CheckCircle2 className="h-4 w-4 text-[#c9a84c] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <MagneticButton>
                <Link href="/login?tab=register&role=freelancer">
                  <button className="btn-ghost text-sm px-8 py-3.5 rounded-[3px] w-full justify-center">
                    Join as Freelancer <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)] relative grid-bg overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="landing-cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-[#c9a84c]/[0.09] rounded-full blur-[160px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.4)] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.2)] to-transparent" />
      </div>
      <div className="mx-auto max-w-4xl px-5 text-center relative z-10">
        <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.14em] uppercase text-[#c9a84c] border border-[rgba(201,168,76,0.22)] px-3 py-1.5 rounded-[2px] mb-8 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse inline-block" />
          Join 2,400+ engineers on GeekBid
        </div>
        <h2 className="landing-header-glow text-4xl sm:text-6xl md:text-7xl font-serif font-normal text-[#f0e8d4] leading-[1.05]">
          Ready to hire<br /><em className="text-[#c9a84c] not-italic">smarter?</em>
        </h2>
        <p className="text-lg text-[#a8997e] mt-6 max-w-lg mx-auto">
          Join thousands of companies using reverse auctions to find the best engineering talent at the right price.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <MagneticButton>
            <Link href="/login?tab=register&role=client">
              <button className="group btn-primary text-base px-12 py-4 rounded-[3px]">
                Get Started Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </MagneticButton>
          <MagneticButton>
            <Link href="/login?tab=register&role=freelancer">
              <button className="btn-ghost text-base px-12 py-4 rounded-[3px]">
                Apply as Freelancer <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
          </MagneticButton>
        </div>
        <p className="text-xs text-[#a8997e] mt-6 opacity-60">No credit card required · Free to post · 10% success fee only</p>
      </div>
    </section>
  );
}

export default function CTA() {
  return (
    <>
      <DualCTA />
      <FinalCTA />
    </>
  );
}
