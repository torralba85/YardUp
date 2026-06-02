"use client";

import type { MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clamp01, formatHeroNumber } from "@/lib/landing-stages";
import { useStateFromMotionNumber } from "./use-motion-number";

const FADE = 0.06; // fade width at each band edge

/**
 * Pure opacity for a caption whose band is [start, end]: fades in over
 * [start-FADE, start], holds at 1 through [start, end-FADE], fades out over
 * [end-FADE, end]. Always returns a value in [0, 1] — no WAAPI, no motion
 * value, so there are no keyframe-offset constraints to violate.
 */
function bandOpacity(p: number, start: number, end: number): number {
  if (p <= start - FADE || p > end) return 0;
  if (p < start) return clamp01((p - (start - FADE)) / FADE);
  if (p <= end - FADE) return 1;
  return clamp01((end - p) / FADE);
}

export function StageCaptions({ progress }: { progress: MotionValue<number> }) {
  // The overlay re-renders per frame (cheap DOM work, outside the WebGL tree).
  const p = useStateFromMotionNumber(progress);
  const rent = formatHeroNumber(2350, clamp01((p - 0.5) / 0.12), "currency");

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-xl flex-col justify-center px-6">
      <div className="absolute" style={{ opacity: bandOpacity(p, 0.0, 0.25) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Start with a lot</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          Every lot holds an answer.
        </h2>
        <p className="mt-3 text-lg text-lf-muted">Begin with the land you already own.</p>
      </div>

      <div className="absolute" style={{ opacity: bandOpacity(p, 0.25, 0.5) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Cast an ADU</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          Watch the concept rise.
        </h2>
        <p className="mt-3 text-lg text-lf-muted">A site-fit ADU, placed inside your setbacks.</p>
      </div>

      <div className="absolute" style={{ opacity: bandOpacity(p, 0.5, 0.78) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See the numbers</p>
        <div className="mt-3 font-display text-6xl font-black tabular-nums text-lf-espresso md:text-7xl">
          {rent}
        </div>
        <p className="mt-2 text-lg text-lf-muted">estimated monthly rent — NOI $20.6k · payback 9.8 yrs</p>
      </div>

      <div
        className="pointer-events-auto absolute"
        style={{ opacity: bandOpacity(p, 0.75, 1.1) }}
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Owner report ready</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          See what your lot could earn.
        </h2>
        <Link
          href="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-lf-mahogany px-6 py-3.5 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
        >
          Estimate my lot
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
