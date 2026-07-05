"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll-reveal wrapper: stamps `data-revealed` when the element enters the
 * viewport so the `.ln-reveal` CSS (globals.css) can settle it in. All motion
 * lives in CSS behind `prefers-reduced-motion`, so reduced-motion users (and
 * environments without IntersectionObserver) see content immediately.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      element.dataset.revealed = "true";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.dataset.revealed = "true";
            observer.disconnect();
          }
        }
      },
      { rootMargin: "-60px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-revealed="false"
      className={`ln-reveal ${className}`}
      style={{ "--ln-reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
