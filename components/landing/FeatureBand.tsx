"use client";

import { motion, useReducedMotion } from "motion/react";
import { FileText, MapPinned, Ruler, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { CTAButton } from "./CTAButton";

const PROOF = [
  ["$2,350/mo", "sample rent estimate"],
  ["31%", "lot coverage model"],
  ["9.8 yrs", "sample payback view"],
];

const STEPS = [
  {
    icon: MapPinned,
    title: "Start with your address",
    body: "Everything is based on your actual property — not a one-size-fits-all unit someone pulled from a catalog.",
  },
  {
    icon: Ruler,
    title: "See what fits — and what doesn't",
    body: "Yard setbacks, size limits, and your ADU design stay on screen together so nothing sneaks up on you later.",
  },
  {
    icon: FileText,
    title: "Get a report you can actually use",
    body: "Save your rent estimate, build cost range, and key assumptions in one tidy report you can share.",
  },
];

const REPORT = [
  "Your ADU's size, style, and placement",
  "Estimated rent, income, payback, and lot coverage",
  "Honest fine print instead of empty promises",
  "Notes to share with your builder or contractor",
];

export function FeatureBand() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <section className="border-y border-lf-hairline/50 bg-lf-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Why owners use it</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-lf-espresso md:text-5xl">
              Make the ADU conversation specific before money changes hands.
            </h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-lf-hairline border-y border-lf-hairline py-5 text-center">
            {PROOF.map(([value, label]) => (
              <div key={label} className="px-3">
                <strong className="block font-display text-2xl text-lf-espresso md:text-3xl">{value}</strong>
                <span className="mt-1 block text-sm leading-5 text-lf-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">How it works</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight text-lf-espresso md:text-5xl">
              A complete owner flow, not a pretty rendering with no next step.
            </h2>
          </div>
          <div className="mt-12 grid gap-0 border-y border-lf-hairline md:grid-cols-3 md:divide-x md:divide-lf-hairline">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                className="py-8 md:px-8"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs tabular-nums text-lf-clay">{String(i + 1).padStart(2, "0")}</span>
                  <Icon className="h-7 w-7 text-lf-clay" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-2xl font-bold text-lf-espresso">{title}</h3>
                <p className="mt-3 max-w-sm leading-7 text-lf-muted">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lf-espresso text-lf-sand">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-taupe">Owner report</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              The output is built for the next conversation.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-lf-taupe">
              This is not a permit or a promise. It is a starting point, specific enough to have a real conversation with a builder, planner, or your family.
            </p>
          </div>
          <div className="grid gap-4">
            {REPORT.map((item) => (
              <div key={item} className="flex items-start gap-4 border-t border-lf-taupe/25 pt-4">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-lf-amber" aria-hidden="true" />
                <span className="text-lg leading-7 text-lf-sand">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="start">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-24 md:grid-cols-[1fr_auto] md:items-center md:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-lf-muted">Ready when the owner is</p>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-lf-espresso md:text-5xl">
              Find out what your backyard is worth.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <CTAButton href="/signup" size="lg">
              Estimate my lot
            </CTAButton>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-lf-hairline bg-lf-card/65 px-6 font-semibold text-lf-espresso transition-colors hover:bg-lf-card"
            >
              <Users className="h-5 w-5" aria-hidden="true" />
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
