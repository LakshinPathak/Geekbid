"use client";

import { useEffect, useState } from "react";

/** rAF-eased count-up, same technique as the landing page's useCountUp.
 * No "only play once" guard — that pattern breaks under React Strict
 * Mode's dev-time mount→cleanup→mount cycle, which cancels the very
 * first scheduled frame before it ever fires and then a `played` guard
 * blocks the second (real) mount from ever scheduling another one,
 * permanently stalling the value at 0. Letting the effect simply re-run
 * on its own dependencies is what makes it Strict-Mode-safe. */
export function useCountUp(end: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(end * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, enabled]);

  return value;
}

interface AnimatedCounterProps {
  value: number;
  enabled?: boolean;
  format?: (n: number) => string;
  className?: string;
}

/** Wraps a numeric KPI value with a count-up-on-mount animation plus a
 * brief glow once it settles. Formatting (currency/percent/etc.) is left
 * to the caller via `format` so this stays display-shape-agnostic. */
export default function AnimatedCounter({ value, enabled = true, format, className }: AnimatedCounterProps) {
  const animated = useCountUp(value, 1200, enabled);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setSettled(true), 1250);
    return () => clearTimeout(t);
  }, [enabled]);

  const display = format ? format(animated) : Math.round(animated).toLocaleString();

  return (
    <span className={`${className ?? ""} ${settled ? "feed-kpi-glow" : ""}`}>
      {display}
    </span>
  );
}
