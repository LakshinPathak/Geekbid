"use client";

import { useRef } from "react";
import { useInView, useTilt3D, usePointerFine } from "./hooks";
import { FEATURES, type Feature } from "./data";
import SectionDivider from "./SectionDivider";

function FeatureCard({ feature, idx, inView }: { feature: Feature; idx: number; inView: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isPointerFine = usePointerFine();
  useTilt3D(cardRef, isPointerFine);

  return (
    <div
      ref={cardRef}
      className="group job-card landing-glass-card landing-tilt-card p-8 relative hover:border-[rgba(201,168,76,0.32)] transition-all duration-300"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${150 + idx * 80}ms, transform 0.6s ease ${150 + idx * 80}ms` }}
    >
      <div className="relative z-10">
        <div
          className={`h-14 w-14 rounded-[6px] ${feature.iconBg} border ${feature.iconBorder} flex items-center justify-center mb-6 transition-colors ${inView ? "landing-icon-pop" : ""}`}
          style={{ animationDelay: `${150 + idx * 80}ms` }}
        >
          <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
        </div>
        <h3 className="text-lg font-serif font-normal text-[#f0e8d4] mb-2">{feature.title}</h3>
        <p className="text-sm sm:text-base text-[#a8997e] leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  );
}

export default function Features() {
  const featuresSection = useInView(0.08);

  return (
    <section id="features" ref={featuresSection.ref} className="relative py-24 sm:py-32 border-t border-[rgba(201,168,76,0.22)]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="text-center mb-16" style={{ opacity: featuresSection.inView ? 1 : 0, transform: featuresSection.inView ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.7s ease 0ms, transform 0.7s ease 0ms" }}>
          <p className="flex items-center justify-center gap-2 text-[10px] font-sans tracking-[0.14em] uppercase text-[#a8997e] mb-4 before:content-['_'] before:w-3 before:h-px before:bg-[#c9a84c] before:inline-block">Platform Features</p>
          <h2 className="landing-header-glow text-3xl sm:text-5xl font-serif font-normal text-[#f0e8d4] leading-tight max-w-3xl mx-auto">
            Everything you need to hire and deliver, built in
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, fi) => (
            <FeatureCard key={f.title} feature={f} idx={fi} inView={featuresSection.inView} />
          ))}
        </div>
      </div>

      <SectionDivider variant="wave" fill="#080b14" flip />
    </section>
  );
}
