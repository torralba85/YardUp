"use client";

import type { MotionValue } from "motion/react";
import { clamp01, formatHeroNumber } from "@/lib/landing-stages";
import { CTAButton } from "@/components/ui/CTAButton";
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
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">ADU income snapshot</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[1.03] tracking-[-0.02em] text-lf-espresso md:text-7xl">
          Know what your lot could earn.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-lf-muted">
          LotFoundry turns a backyard address into a visual ADU concept, rent estimate, and owner-ready report before you start calling builders.
        </p>
        <div className="pointer-events-auto mt-7 flex flex-col gap-3 sm:flex-row">
          <CTAButton href="/signup">Estimate my lot</CTAButton>
          <a
            href="#how-it-works"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-lf-hairline bg-lf-card/65 px-6 text-base font-semibold text-lf-espresso backdrop-blur transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-lf-taupe hover:bg-lf-card active:scale-[0.98]"
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
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Cast an ADU</p>
        <h2 className="mt-3 font-display text-5xl font-extrabold leading-[1.03] tracking-[-0.02em] text-lf-espresso md:text-6xl">
          Place the concept inside the buildable envelope.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          Setbacks, coverage, and a proposed ADU massing stay visible together, so the design story starts with constraints instead of guesswork.
        </p>
      </div>

      <div className="absolute max-w-[26rem]" style={bandStyle(bandOpacity(p, 0.56, 0.8))}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See the numbers</p>
        <div className="mt-3 font-display text-7xl font-black tabular-nums leading-[0.95] tracking-[-0.02em] text-lf-espresso md:text-8xl">
          {rent}
        </div>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          estimated monthly rent, paired with NOI, payback, and the assumptions needed for a credible owner conversation.
        </p>
      </div>

      <div
        className="pointer-events-auto absolute max-w-[26rem]"
        style={bandStyle(bandOpacity(p, 0.8, 1.12))}
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Owner report ready</p>
        <h2 className="mt-3 font-display text-5xl font-extrabold leading-[1.03] tracking-[-0.02em] text-lf-espresso md:text-6xl">
          Leave with a shareable next step.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          Save the scenario, review the caveats, and bring one consistent packet to the people who can validate it locally.
        </p>
        <CTAButton href="/signup" className="mt-7">
          Estimate my lot
        </CTAButton>
      </div>
    </div>
  );
}
