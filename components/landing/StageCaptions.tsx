"use client";

import type { MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clamp01, formatHeroNumber } from "@/lib/landing-stages";
import { useStateFromMotionNumber } from "./use-motion-number";

const FADE = 0.05;

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

// Eased crossfade for a stage occupying [start, end] of scroll progress. Stages
// are contiguous (band N's end == band N+1's start) so the fade-out of one and
// the fade-in of the next overlap into a clean handoff with no blank gap.
function bandOpacity(p: number, start: number, end: number): number {
  if (p <= start - FADE || p > end) return 0;
  if (p < start) return smoothstep((p - (start - FADE)) / FADE);
  if (p <= end - FADE) return 1;
  return smoothstep((end - p) / FADE);
}

// Rise + settle + de-blur tied to the stage's own opacity, so headlines settle
// into place instead of blinking. Mirrors the scene HUD cards' entrance motion.
function bandStyle(op: number) {
  const out = 1 - op;
  return {
    opacity: op,
    transform: `translateY(${(out * 18).toFixed(2)}px)`,
    filter: op > 0.999 ? "none" : `blur(${(out * 5).toFixed(2)}px)`,
    willChange: "transform, opacity, filter",
  };
}

export function StageCaptions({ progress }: { progress: MotionValue<number> }) {
  const p = useStateFromMotionNumber(progress);
  // Count-up runs while the numbers stage is fully visible (~0.58 -> 0.71),
  // not during its fade-in, so the figure is seen climbing.
  const rent = formatHeroNumber(2350, clamp01((p - 0.58) / 0.13), "currency");

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-2xl flex-col justify-center px-6 py-10 md:px-10 lg:px-14">
      <div className="absolute max-w-[27rem]" style={bandStyle(bandOpacity(p, 0, 0.3))}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">What your backyard could earn</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.03] tracking-[-0.01em] text-lf-espresso md:text-7xl">
          Know what your lot could earn.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-lf-muted">
          LotFoundry turns your backyard address into a visual ADU concept, rent estimate, and a report you can share — before you start calling anyone.
        </p>
        <div className="pointer-events-auto mt-7 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
          >
            Estimate my lot
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-lf-hairline bg-lf-card px-6 text-base font-semibold text-lf-espresso transition-colors hover:bg-lf-sand-2"
          >
            See the flow
          </a>
        </div>
        <div className="mt-7 grid max-w-md grid-cols-3 border-y border-lf-hairline/70 py-4 text-sm text-lf-muted">
          <span>
            <strong className="block font-display text-xl text-lf-espresso">$2,350</strong>
            rent estimate
          </span>
          <span>
            <strong className="block font-display text-xl text-lf-espresso">31%</strong>
            lot coverage
          </span>
          <span>
            <strong className="block font-display text-xl text-lf-espresso">9.8 yrs</strong>
            payback model
          </span>
        </div>
      </div>

      <div className="absolute max-w-[26rem]" style={bandStyle(bandOpacity(p, 0.3, 0.56))}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See it in your yard</p>
        <h2 className="mt-3 font-display text-5xl font-semibold leading-[1.03] tracking-[-0.01em] text-lf-espresso md:text-6xl">
          See exactly where an ADU fits on your lot.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          Yard lines, size limits, and your ADU sit side by side, so you are working with real boundaries from the start, not wishful thinking.
        </p>
      </div>

      <div className="absolute max-w-[26rem]" style={bandStyle(bandOpacity(p, 0.56, 0.8))}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See the numbers</p>
        <div className="mt-3 font-display text-7xl font-semibold tabular-nums leading-[0.95] tracking-[-0.01em] text-lf-espresso md:text-8xl">
          {rent}
        </div>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          estimated monthly rent — with projected income, build payback, and the honest assumptions behind every number.
        </p>
      </div>

      <div
        className="pointer-events-auto absolute max-w-[26rem]"
        style={bandStyle(bandOpacity(p, 0.8, 1.12))}
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Owner report ready</p>
        <h2 className="mt-3 font-display text-5xl font-semibold leading-[1.03] tracking-[-0.01em] text-lf-espresso md:text-6xl">
          Walk away with something to show people.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          Save your numbers, read the fine print, and share a clean summary with your builder, planner, or spouse before anyone spends a dime.
        </p>
        <Link
          href="/signup"
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
        >
          Estimate my lot
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
