"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Animated counter hook (moved verbatim from page.tsx) ──────── */
export function useCountUp(end: number, duration = 2000, start = 0, enabled = true) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    if (!enabled) return;
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (end - start) * ease));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start, enabled]);
  return value;
}

/* ─── Intersection observer hook (moved verbatim from page.tsx) ─── */
export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Observer: tries to observe the element. On first render the component
  // may return null (mounted=false), so ref.current is null and the effect
  // exits early. The observer is still set up correctly if the element
  // exists (e.g. on subsequent renders that change threshold).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold, rootMargin: "100px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  // Safety net (separate effect, always runs on mount regardless of el):
  // If the observer never fires — because the element wasn't available on
  // the first render (deferred mount via useApp) or the user fast-scrolled
  // — force every section visible after 800 ms so nothing stays hidden.
  useEffect(() => {
    const t = setTimeout(() => setInView(true), 800);
    return () => clearTimeout(t);
  }, []);

  return { ref, inView };
}

/* ─── rAF-throttle: collapse rapid-fire events (mousemove/scroll) to
   at most one handler invocation per animation frame ─────────────── */
export function useRafThrottle<T extends (...args: never[]) => void>(fn: T): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const pendingRef = useRef(false);

  return useCallback((...args: Parameters<T>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    requestAnimationFrame(() => {
      pendingRef.current = false;
      fnRef.current(...args);
    });
  }, []) as T;
}

/* ─── Detects a real mouse (fine pointer + hover support) so touch
   devices never pay the cost of attaching mousemove listeners at all
   — checked once, and re-checked if the device's input mode changes
   (e.g. a hybrid touchscreen laptop switching between mouse/touch) ── */
const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export function usePointerFine(): boolean {
  const [isFine, setIsFine] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(FINE_POINTER_QUERY);
    setIsFine(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsFine(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isFine;
}

/* ─── Writes cursor position as CSS custom properties directly onto a
   ref'd element (imperative DOM write, not React state) so the
   mouse-follow glow repaints without triggering a React re-render on
   every frame. Never attaches the listener unless `enabled` — callers
   pass `usePointerFine()` so touch devices attach nothing at all. ─── */
export function useMousePosition<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  varNames: { x: string; y: string } = { x: "--mx", y: "--my" },
  enabled = true
) {
  const handleMove = useRafThrottle((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty(varNames.x, `${x}%`);
    el.style.setProperty(varNames.y, `${y}%`);
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.addEventListener("mousemove", handleMove);
    return () => el.removeEventListener("mousemove", handleMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ref.current]);
}

/* ─── 3D tilt-on-hover: writes --rx/--ry (rotation degrees, derived from
   cursor offset vs. card center) directly onto the card's own style —
   imperative, not React state, so it stays smooth at 60fps. Never
   attaches a listener when `enabled` is false (touch devices). ────── */
export function useTilt3D<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  enabled = true,
  maxDeg = 8
) {
  const handleMove = useRafThrottle((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--ry", `${(px * maxDeg * 2).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * maxDeg * 2).toFixed(2)}deg`);
  });

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ref.current]);
}

/* ─── Magnetic-hover buttons: small offset toward the cursor within the
   button's bounds, snapping back on mouseleave via CSS transition. ─── */
export function useMagneticHover<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  enabled = true,
  strength = 0.25
) {
  const handleMove = useRafThrottle((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
  });

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--mx", "0px");
    el.style.setProperty("--my", "0px");
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ref.current]);
}

/* ─── Single shared IntersectionObserver tracking which section anchor
   is currently most in view, for nav scroll-spy highlighting ───────── */
export function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids]);

  return active;
}

/* ─── Splits a target number into per-digit "slot machine" values.
   Each digit is rendered by the caller as a small overflow-hidden
   column whose inner strip translateY's to the right digit — this
   hook only supplies which digit (0-9) each position should show,
   driven by the same rAF count-up easing as useCountUp so the whole
   number still animates smoothly, just rendered digit-by-digit. ──── */
export function useSlotDigits(end: number, duration = 1600, enabled = true): number[] {
  const value = useCountUp(end, duration, 0, enabled);
  return String(Math.max(0, Math.round(value)))
    .split("")
    .map((d) => Number(d));
}
