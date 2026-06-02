"use client";

import type { MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clamp01, formatHeroNumber } from "@/lib/landing-stages";
import { useStateFromMotionNumber } from "./use-motion-number";

const FADE = 0.025;

function bandOpacity(p: number, start: number, end: number): number {
  if (p <= start - FADE || p > end) return 0;
  if (p < start) return clamp01((p - (start - FADE)) / FADE);
  if (p <= end - FADE) return 1;
  return clamp01((end - p) / FADE);
}

export function StageCaptions({ progress }: { progress: MotionValue<number> }) {
  const p = useStateFromMotionNumber(progress);
  const rent = formatHeroNumber(2350, clamp01((p - 0.5) / 0.12), "currency");

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex h-full w-full max-w-2xl flex-col justify-center px-6 py-10 md:px-10 lg:px-14">
      <div className="absolute max-w-[34rem]" style={{ opacity: bandOpacity(p, 0, 0.3) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">ADU income snapshot</p>
        <h1 className="mt-3 font-display text-5xl font-black leading-[0.98] text-lf-espresso md:text-7xl">
          Know what your lot could earn.
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-lf-muted">
          LotFoundry turns a backyard address into a visual ADU concept, rent estimate, and owner-ready report before you start calling builders.
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
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-lf-hairline bg-lf-card/65 px-6 text-base font-semibold text-lf-espresso backdrop-blur transition-colors hover:bg-lf-card"
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

      <div className="absolute max-w-[32rem]" style={{ opacity: bandOpacity(p, 0.34, 0.56) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Cast an ADU</p>
        <h2 className="mt-3 font-display text-5xl font-black leading-none text-lf-espresso md:text-6xl">
          Place the concept inside the buildable envelope.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          Setbacks, coverage, and a proposed ADU massing stay visible together, so the design story starts with constraints instead of guesswork.
        </p>
      </div>

      <div className="absolute max-w-[32rem]" style={{ opacity: bandOpacity(p, 0.6, 0.78) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See the numbers</p>
        <div className="mt-3 font-display text-7xl font-black tabular-nums leading-none text-lf-espresso md:text-8xl">
          {rent}
        </div>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          estimated monthly rent, paired with NOI, payback, and the assumptions needed for a credible owner conversation.
        </p>
      </div>

      <div
        className="pointer-events-auto absolute max-w-[32rem]"
        style={{ opacity: bandOpacity(p, 0.82, 1.1) }}
      >
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Owner report ready</p>
        <h2 className="mt-3 font-display text-5xl font-black leading-none text-lf-espresso md:text-6xl">
          Leave with a shareable next step.
        </h2>
        <p className="mt-4 max-w-md text-lg leading-8 text-lf-muted">
          Save the scenario, review the caveats, and bring one consistent packet to the people who can validate it locally.
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
