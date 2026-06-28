"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, MapPinned, Ruler, ShieldCheck, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Bezel } from "@/components/ui/Bezel";
import { CTAButton } from "./CTAButton";

const PROOF = [
  ["Address-first", "grounded in the parcel"],
  ["Estimate-honest", "clear assumptions and caveats"],
  ["Builder-ready", "shareable report output"],
];

const REPORT = [
  "Your ADU's size, style, and placement",
  "Estimated rent, income, payback, and lot coverage",
  "Honest fine print instead of empty promises",
  "Notes to share when you are ready for local review",
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

/**
 * Landing "what you get" section: animated proof points and a report-contents
 * card, with a closing CTA. Honors reduced-motion preferences.
 */
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
      <section className="border-y border-lf-hairline/50 bg-lf-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-24 md:grid-cols-[1.1fr_1fr] md:items-center md:py-32">
          <div>
            <span className="inline-flex items-center rounded-full bg-lf-clay/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-lf-clay">
              Why owners use it
            </span>
            <h2 className="lf-section-heading mt-3 max-w-2xl text-lf-espresso">
              See whether the lot, money, and next step line up before you spend on plans.
            </h2>
          </div>
          <div className="grid gap-0 divide-y divide-lf-hairline border-y border-lf-hairline py-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PROOF.map(([value, label]) => (
              <div key={label} className="px-3 py-4 text-left sm:text-center">
                <strong className="block text-sm font-semibold text-lf-espresso">
                  {value}
                </strong>
                <span className="lf-caption mt-1 block text-lf-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 py-32 md:py-40">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-lf-clay/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-lf-clay">
              How it works
            </span>
            <h2 className="lf-section-heading mt-3 text-lf-espresso">
              A complete owner path, not a rendering that leaves you guessing.
            </h2>
          </div>

          <div
            className="mt-16 grid gap-6 md:grid-cols-3"
            key={shouldAnimate ? "animated" : "static"}
          >
            <motion.div
              custom={0}
              initial={shouldAnimate ? "hidden" : false}
              whileInView={shouldAnimate ? "visible" : undefined}
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="col-span-1"
            >
              <Bezel
                className="h-full"
                innerClassName="flex h-full min-h-[280px] flex-col justify-between p-8"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="lf-kicker-dense text-lf-clay">01</span>
                    <MapPinned className="h-7 w-7 text-lf-clay" />
                  </div>
                  <h3 className="lf-card-heading mt-6 text-lf-espresso">
                    Start with your address
                  </h3>
                  <p className="lf-body-sm mt-4 text-lf-muted">
                    Start with your actual property so the estimate reflects the lot
                    you own, not a generic ADU example from a catalog.
                  </p>
                </div>
              </Bezel>
            </motion.div>

            <motion.div
              custom={1}
              initial={shouldAnimate ? "hidden" : false}
              whileInView={shouldAnimate ? "visible" : undefined}
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="col-span-1 md:col-span-2"
            >
              <Bezel
                className="h-full"
                innerClassName="flex h-full min-h-[280px] flex-col justify-between p-8"
              >
                <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="lf-kicker-dense text-lf-clay">02</span>
                      <Ruler className="h-7 w-7 text-lf-clay" />
                    </div>
                    <h3 className="lf-card-heading mt-6 text-lf-espresso">
                      See what fits and what does not
                    </h3>
                    <p className="lf-body-sm mt-4 text-lf-muted">
                      Yard setbacks, size limits, and your ADU design stay on screen
                      together so you can spot obvious fit issues before you hire anyone.
                    </p>
                  </div>
                  <div className="relative flex h-36 flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-lf-hairline/60 bg-lf-sand-2/50 p-4 text-center">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-lf-mahogany/5 to-lf-espresso/10" />
                    <div className="lf-kicker-dense text-lf-clay">
                      3D Visual Studio
                    </div>
                    <div className="lf-caption mt-2 max-w-[20ch] text-lf-muted">
                      Parcel lines, setbacks, driveways, and the proposed ADU stay
                      visible together.
                    </div>
                  </div>
                </div>
              </Bezel>
            </motion.div>

            <motion.div
              custom={2}
              initial={shouldAnimate ? "hidden" : false}
              whileInView={shouldAnimate ? "visible" : undefined}
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="col-span-1 md:col-span-3"
            >
              <Bezel innerClassName="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="lf-kicker-dense text-lf-clay">03</span>
                    <FileText className="h-7 w-7 text-lf-clay" />
                  </div>
                  <h3 className="lf-card-heading mt-6 text-lf-espresso">
                    Get a report you can actually use
                  </h3>
                  <p className="lf-body-sm mt-3 max-w-[62ch] text-lf-muted">
                    Save rent, build range, payback, and key assumptions in one
                    concept report you can review yourself or share when you are ready.
                  </p>
                </div>
                <div className="shrink-0">
                  <CTAButton href="/studio" size="md">
                    Check my address
                  </CTAButton>
                </div>
              </Bezel>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-lf-espresso text-lf-sand">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-32 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-40">
          <div>
            <span className="inline-flex items-center rounded-full bg-lf-taupe/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-lf-taupe">
              Owner report
            </span>
            <h2 className="lf-section-heading mt-3">
              The output is built for the next conversation.
            </h2>
            <p className="lf-body-lg mt-5 max-w-xl text-lf-taupe">
              This is not a permit approval or an investment guarantee. It is a
              clear starting point for a real conversation with your family,
              planner, lender, or builder.
            </p>
          </div>
          <div className="grid gap-4">
            {REPORT.map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 border-t border-lf-taupe/25 pt-4"
              >
                <ShieldCheck
                  className="mt-1 h-5 w-5 shrink-0 text-lf-taupe"
                  aria-hidden="true"
                />
                <span className="lf-body-lg text-lf-sand">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="start" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <Bezel innerClassName="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <span className="inline-flex items-center rounded-full bg-lf-clay/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-lf-clay">
              Ready when the owner is
            </span>
            <h2 className="lf-section-heading mt-3 max-w-3xl text-lf-espresso">
              Know what to ask before you spend on plans.
            </h2>
          </div>
          <div className="flex flex-col items-center gap-4 sm:flex-row md:flex-col">
            <CTAButton href="/studio" size="lg">
              Check my address
            </CTAButton>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-lf-hairline bg-lf-card/65 px-8 font-semibold text-lf-espresso transition-colors duration-300 hover:border-lf-taupe hover:bg-lf-card active:scale-[0.98]"
            >
              <Users className="h-5 w-5" aria-hidden="true" />
              Sign in
            </Link>
          </div>
        </Bezel>
      </section>
    </>
  );
}
