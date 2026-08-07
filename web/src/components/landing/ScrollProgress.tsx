"use client";

import { useEffect, useRef } from "react";
import { useRafThrottle } from "./hooks";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  const handleScroll = useRafThrottle(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
    if (barRef.current) barRef.current.style.width = `${pct}%`;
  });

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={barRef} className="landing-scroll-progress" style={{ width: "0%" }} aria-hidden="true" />;
}
