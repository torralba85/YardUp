"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FileText, MapPinned, Ruler, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { CTAButton } from "./CTAButton";
import { Bezel } from "@/components/ui/Bezel";

const PROOF = [
  ["$2,350/mo", "sample rent estimate"],
  ["31%", "lot coverage model"],
  ["9.8 yrs", "sample payback view"],
];

const REPORT = [
  "Your ADU's size, style, and placement",
  "Estimated rent, income, payback, and lot coverage",
  "Honest fine print instead of empty promises",
  "Notes to share with your builder or contractor",
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.32, 0.72, 0, 1] as const,
      delay: i * 0.08,
    },
  }),
};

export function FeatureBand() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const reducedMotion = useReducedMotion();
  const shouldAnimate = mounted && !reducedMotion;

  return (
    <>
      {/* Why owners use it */}
      <section className="border-y border-lf-hairline/50 bg-lf-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:py-24 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-muted">Why owners use it</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight text-lf-espresso md:text-5xl">
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

      {/* How it works: Bento Grid */}
      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-32 md:py-40">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-muted">How it works</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-lf-espresso md:text-5xl">
              A complete owner flow, not a pretty rendering with no next step.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3" key={shouldAnimate ? "animated" : "static"}>
            {/* Card 1: Start with address */}
            <motion.div
              custom={0}
              initial={shouldAnimate ? "hidden" : false}
              whileInView={shouldAnimate ? "visible" : undefined}
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="col-span-1"
            >
              <Bezel className="h-full" innerClassName="h-full p-8 flex flex-col justify-between min-h-[280px]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-lf-clay">01</span>
                    <MapPinned className="h-7 w-7 text-lf-clay" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">Start with your address</h3>
                  <p className="mt-4 leading-7 text-lf-muted text-sm">
                    Everything is based on your actual property — not a one-size-fits-all unit someone pulled from a catalog.
                  </p>
                </div>
              </Bezel>
            </motion.div>

            {/* Card 2: Wide Bento Hero - 3D Visualizer */}
            <motion.div
              custom={1}
              initial={shouldAnimate ? "hidden" : false}
              whileInView={shouldAnimate ? "visible" : undefined}
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="col-span-1 md:col-span-2"
            >
              <Bezel className="h-full" innerClassName="h-full p-8 flex flex-col justify-between min-h-[280px]">
                <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-lf-clay">02</span>
                      <Ruler className="h-7 w-7 text-lf-clay" />
                    </div>
                    <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">See what fits — and what doesn&apos;t</h3>
                    <p className="mt-4 leading-7 text-lf-muted text-sm">
                      Yard setbacks, size limits, and your ADU design stay on screen together in a 3D lot builder so nothing catches you off guard.
                    </p>
                  </div>
                  <div className="relative h-36 overflow-hidden rounded-xl border border-dashed border-lf-hairline/60 bg-lf-sand-2/50 flex flex-col justify-center items-center text-center p-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-lf-mahogany/5 to-lf-espresso/10 pointer-events-none" />
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-clay font-bold">3D Visual Studio</div>
                    <div className="mt-2 text-xs text-lf-muted max-w-[18ch]">Dashed setbacks, driveways & landscape elements live visualizers</div>
                  </div>
                </div>
              </Bezel>
            </motion.div>

            {/* Card 3: Get report */}
            <motion.div
              custom={2}
              initial={shouldAnimate ? "hidden" : false}
              whileInView={shouldAnimate ? "visible" : undefined}
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="col-span-1 md:col-span-3"
            >
              <Bezel innerClassName="p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-lf-clay">03</span>
                    <FileText className="h-7 w-7 text-lf-clay" />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-bold text-lf-espresso">Get a report you can actually use</h3>
                  <p className="mt-3 leading-7 text-lf-muted text-sm">
                    Save your rent estimate, build cost range, and key regulatory assumptions in one tidy concept report you can share with contractors or lenders.
                  </p>
                </div>
                <div className="shrink-0">
                  <CTAButton href="/signup" size="md">
                    Generate report
                  </CTAButton>
                </div>
              </Bezel>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Owner report list */}
      <section className="bg-lf-espresso text-lf-sand">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-32 md:py-40 md:grid-cols-[0.92fr_1.08fr] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-taupe">Owner report</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
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

      {/* Final call to action section */}
      <section id="start">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-32 md:py-40 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-lf-muted">Ready when the owner is</p>
            <h2 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-lf-espresso md:text-5xl">
              Find out what your backyard is worth.
            </h2>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row md:flex-col items-center">
            <CTAButton href="/signup" size="lg">
              Estimate my lot
            </CTAButton>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-lf-hairline bg-lf-card/65 px-8 font-semibold text-lf-espresso transition-colors duration-300 hover:bg-lf-card hover:border-lf-taupe active:scale-[0.98]"
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
