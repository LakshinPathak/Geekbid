"use client";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import { getCurrentPrice, formatMoney, type Job } from "@/lib/utils";
import { getCompetitionBadge, getPriceTrajectory } from "./feed-helpers";
import { getEffectiveDecayRate } from "@/lib/pricing";
import { Zap, ChevronLeft, ChevronRight } from "lucide-react";

interface RecommendedCarouselProps {
  jobs: Job[];
  now: Date;
  mySkills?: string[];
  onQuickBid?: (jobId: string) => void;
}

export default function RecommendedCarousel({ jobs, now, mySkills = [], onQuickBid }: RecommendedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const CARD_W = 284; // card width + gap

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    setActiveDot(Math.round(el.scrollLeft / CARD_W));
  }, [CARD_W]);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateScrollState); ro.disconnect(); };
  }, [updateScrollState, jobs.length]);

  if (jobs.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? CARD_W * 2 : -CARD_W * 2, behavior: "smooth" });
  };

  // Mouse drag-to-scroll
  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.pageX, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    const dx = e.pageX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  };
  const onMouseUp = () => {
    setIsDragging(false);
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "";
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-sans tracking-[0.14em] uppercase text-[#a8997e] flex items-center gap-2">
          <span className="w-3 h-px bg-[#c9a84c] inline-block" />
          Recommended For You
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#a8997e]">Top {Math.min(jobs.length, 5)} matches</span>
          {/* Arrow buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`h-7 w-7 flex items-center justify-center rounded-[3px] border transition-all duration-150 ${
                canScrollLeft
                  ? "border-[rgba(201,168,76,0.35)] text-[#c9a84c] hover:bg-[rgba(201,168,76,0.10)] bg-[#0d1120]"
                  : "border-[rgba(201,168,76,0.12)] text-[#a8997e]/30 bg-[#0d1120] cursor-not-allowed"
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`h-7 w-7 flex items-center justify-center rounded-[3px] border transition-all duration-150 ${
                canScrollRight
                  ? "border-[rgba(201,168,76,0.35)] text-[#c9a84c] hover:bg-[rgba(201,168,76,0.10)] bg-[#0d1120]"
                  : "border-[rgba(201,168,76,0.12)] text-[#a8997e]/30 bg-[#0d1120] cursor-not-allowed"
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll track with fade edges */}
      <div className="relative">
        {/* Left fade */}
        <div
          className="absolute left-0 top-0 bottom-2 w-12 z-10 pointer-events-none transition-opacity duration-200"
          style={{
            background: "linear-gradient(to right, #080b14, transparent)",
            opacity: canScrollLeft ? 1 : 0,
          }}
        />
        {/* Right fade */}
        <div
          className="absolute right-0 top-0 bottom-2 w-16 z-10 pointer-events-none transition-opacity duration-200"
          style={{
            background: "linear-gradient(to left, #080b14, transparent)",
            opacity: canScrollRight ? 1 : 0,
          }}
        />

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="flex gap-3 overflow-x-auto pb-2 select-none"
          style={{
            cursor: "grab",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x mandatory",
          }}
        >
          {jobs.slice(0, 5).map(job => {
            const jobId = job.id ?? job._id ?? "";
            const current = getCurrentPrice(job, now);
            const bidCount = job.bidCount ?? 0;
            const comp = getCompetitionBadge(bidCount);

            const matchedSkills = job.skillsRequired.filter(s => mySkills.includes(s));
            const matchScore = job.skillsRequired.length > 0
              ? Math.round((matchedSkills.length / job.skillsRequired.length) * 100) : 0;

            const elapsedHrs = (now.getTime() - new Date(job.postedAt).getTime()) / 3600000;
            const effectiveRate = getEffectiveDecayRate(job.decayRatePerHour, job.uniqueBidderCount ?? bidCount, elapsedHrs);
            const trajectory = getPriceTrajectory(effectiveRate);
            const hourlyRate = job.estimatedHours && job.estimatedHours > 0
              ? Math.round(current / job.estimatedHours) : null;

            const isHighMatch = matchScore >= 75;
            const isMidMatch = matchScore >= 50;

            // Decay progress
            const priceRange = job.startingPrice - job.minimumPrice;
            const decayPct = priceRange > 0 ? Math.round(((current - job.minimumPrice) / priceRange) * 100) : 0;

            return (
              <Link
                key={jobId}
                href={`/jobs/${jobId}`}
                className="shrink-0 group"
                style={{ width: 272, scrollSnapAlign: "start" }}
                draggable={false}
              >
                <div className="card h-full flex flex-col gap-3 p-4 hover:border-[rgba(201,168,76,0.40)] transition-colors duration-200">

                  {/* Row 1: match badge + comp label */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-[2px] font-sans ${
                      isHighMatch
                        ? "bg-[#c9a84c] text-[#050810]"
                        : isMidMatch
                        ? "bg-[rgba(201,168,76,0.15)] text-[#c9a84c] border border-[rgba(201,168,76,0.35)]"
                        : "bg-[#111625] text-[#a8997e] border border-[rgba(201,168,76,0.15)]"
                    }`}>
                      {matchScore}% Match
                    </span>
                    <span className={`text-[9px] font-bold tracking-[0.09em] uppercase px-2 py-0.5 rounded-[2px] font-sans ${comp.color} ${comp.bg} border ${comp.border}`}>
                      {comp.label}
                    </span>
                  </div>

                  {/* Row 2: title */}
                  <p className="text-sm font-serif font-normal text-[#f0e8d4] leading-snug line-clamp-2 group-hover:text-[#c9a84c] transition-colors">
                    {job.title}
                  </p>

                  {/* Row 3: price + hourly */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-serif font-normal text-[#f0e8d4] tabular-nums">
                      {formatMoney(current)}
                    </span>
                    {hourlyRate && (
                      <span className="text-xs text-[#c9a84c] font-sans">${hourlyRate}/hr</span>
                    )}
                  </div>

                  {/* Row 4: flat progress bar */}
                  <div className="h-0.5 bg-[#1a1f30]">
                    <div className="h-0.5 bg-[#c9a84c]" style={{ width: `${decayPct}%` }} />
                  </div>

                  {/* Row 5: trajectory */}
                  <div className="flex items-center gap-1.5 text-[11px] font-sans">
                    <span className={trajectory.color}>{trajectory.icon}</span>
                    <span className="text-[#a8997e]">{trajectory.label}</span>
                    <span className="text-[#a8997e] ml-auto">{bidCount} bid{bidCount !== 1 ? "s" : ""}</span>
                  </div>

                  {/* QuickBid */}
                  <button
                    onClick={e => {
                      e.preventDefault();
                      if (onQuickBid) onQuickBid(jobId);
                    }}
                    className="mt-auto btn-primary w-full justify-center text-[11px] tracking-[0.06em] uppercase py-2 rounded-[3px]"
                  >
                    <Zap className="h-3 w-3" />
                    QuickBid
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      {jobs.length > 1 && (
        <div className="flex items-center gap-1.5 mt-3 justify-center">
          {jobs.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                scrollRef.current?.scrollTo({ left: i * CARD_W, behavior: "smooth" });
              }}
              className="h-px rounded-none transition-all duration-300"
              style={{
                width: i === activeDot ? 24 : 8,
                background: i === activeDot ? "#c9a84c" : "rgba(201,168,76,0.25)",
              }}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
