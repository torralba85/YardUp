"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION = 350;

// Cubic ease-out — fast start, gentle settle.
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof requestAnimationFrame !== "function" ||
    typeof performance === "undefined"
  );
}

/**
 * Animate a number from its previously displayed value to `value`.
 *
 * Snaps immediately (no tween) under SSR, in jsdom (no matchMedia), when the
 * user prefers reduced motion, or when rAF/performance are unavailable. This
 * keeps component tests deterministic and honors accessibility without extra
 * wiring at the call site.
 *
 * Retargets cleanly: a value change mid-tween continues from wherever the
 * number currently sits, so rapid slider drags never queue tweens.
 */
export function useCountUp(value: number, duration = DEFAULT_DURATION, enabled = true): number {
  const [display, setDisplay] = useState(value);
  const [target, setTarget] = useState(value);

  // displayRef tracks the last rendered display value so the tween can
  // retarget mid-animation. Updated in tick (not during render) to satisfy
  // the react-hooks/refs rule.
  const displayRef = useRef(display);

  // Render-phase snap: synchronously adjust display when motion should be
  // skipped. This avoids calling setState inside an effect body for the
  // reduced-motion path, and keeps the snap synchronous so tests can assert
  // immediately after rerender.
  if (value !== target) {
    setTarget(value);
    if (!enabled || prefersReducedMotion()) {
      setDisplay(value);
    }
  }
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      displayRef.current = value;
      return;
    }

    const from = displayRef.current;
    if (from === value) return;

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * easeOutCubic(t);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, enabled]);

  return enabled ? display : value;
}
