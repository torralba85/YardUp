"use client";

import { useEffect, useState } from "react";

/**
 * 0→1 scroll progress through a tall "track" section whose child is pinned
 * with `position: sticky`. Measures on scroll/resize via rAF so the hero can
 * scrub the Remotion timeline without layout thrash.
 */
export function useHeroProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const travel = Math.max(1, element.offsetHeight - window.innerHeight);
      setProgress(Math.max(0, Math.min(1, -rect.top / travel)));
    };

    const queueMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    queueMeasure();
    window.addEventListener("scroll", queueMeasure, { passive: true });
    window.addEventListener("resize", queueMeasure, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueMeasure);
      window.removeEventListener("resize", queueMeasure);
    };
  }, [ref]);

  return progress;
}
