"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { clamp01, formatHeroNumber } from "@/lib/landing-stages";
import { useStateFromMotionNumber } from "./use-motion-number";

/** Opacity that fades a caption in over its band and out as the next begins. */
function useBandOpacity(progress: MotionValue<number>, start: number, end: number) {
  const f = 0.06; // fade width
  return useTransform(progress, [start - f, start, end - f, end], [0, 1, 1, 0]);
}

export function StageCaptions({ progress }: { progress: MotionValue<number> }) {
  const lotO = useBandOpacity(progress, 0.0, 0.25);
  const riseO = useBandOpacity(progress, 0.25, 0.5);
  const numbersO = useBandOpacity(progress, 0.5, 0.78);
  const reportO = useBandOpacity(progress, 0.75, 1.0);

  // The count-up number is HTML overlay text, so a per-frame re-render is fine.
  const p = useStateFromMotionNumber(progress);
  const rent = formatHeroNumber(2350, clamp01((p - 0.5) / 0.12), "currency");

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-xl flex-col justify-center px-6">
      <motion.div style={{ opacity: lotO }} className="absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Start with a lot</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          Every lot holds an answer.
        </h2>
        <p className="mt-3 text-lg text-lf-muted">Begin with the land you already own.</p>
      </motion.div>

      <motion.div style={{ opacity: riseO }} className="absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Cast an ADU</p>
        <h2 className="mt-3 font-display text-4xl font-black text-lf-espresso md:text-5xl">
          Watch the concept rise.
        </h2>
        <p className="mt-3 text-lg text-lf-muted">A site-fit ADU, placed inside your setbacks.</p>
      </motion.div>

      <motion.div style={{ opacity: numbersO }} className="absolute">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">See the numbers</p>
        <div className="mt-3 font-display text-6xl font-black tabular-nums text-lf-espresso md:text-7xl">
          {rent}
        </div>
        <p className="mt-2 text-lg text-lf-muted">estimated monthly rent — NOI $20.6k · payback 9.8 yrs</p>
      </motion.div>

      <motion.div style={{ opacity: reportO }} className="pointer-events-auto absolute">
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
      </motion.div>
    </div>
  );
}
