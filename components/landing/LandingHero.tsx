"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Full-bleed hero. Plays a Remotion-rendered ~6s clip once and holds the final
 * frame (which is also the poster, so the static/reduced-motion view still shows
 * the rent answer). A fixed left editorial scrim guarantees headline/CTA contrast
 * regardless of the playing frame.
 */
export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const saveData = connection?.saveData === true;
    if (reduce || saveData) return; // poster stays; do not autoplay
    void video.play().catch(() => {
      /* autoplay blocked (e.g. low-power mode) — poster remains, no error surfaced */
    });
  }, []);

  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{ minHeight: "clamp(560px, 80vh, 760px)" }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        poster="/hero/hero-poster.jpg"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        {/* H.264 mp4 only — universally decodable. The VP9 webm errored in Chrome. */}
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(38,19,7,0.92) 0%, rgba(38,19,7,0.55) 38%, rgba(38,19,7,0.12) 64%, rgba(38,19,7,0) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-sand/85">
            From lot to income
          </p>
          <h1
            className="mt-3 font-display text-5xl font-medium leading-[1.02] tracking-[-0.01em] text-lf-sand md:text-7xl"
            style={{ textShadow: "0 2px 24px rgba(38,19,7,0.45)" }}
          >
            See the rent your backyard is hiding.
          </h1>
          <Link
            href="/signup"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
          >
            Estimate my lot
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
