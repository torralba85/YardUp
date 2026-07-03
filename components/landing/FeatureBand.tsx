"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Bezel } from "@/components/ui/Bezel";
import { CTAButton } from "./CTAButton";
import { TYPICAL_MARKET } from "./LandingHero";

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
                  <span className="lf-kicker-dense text-lf-clay">01</span>
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
                    <span className="lf-kicker-dense text-lf-clay">02</span>
                    <h3 className="lf-card-heading mt-6 text-lf-espresso">
                      See what fits and what does not
                    </h3>
                    <p className="lf-body-sm mt-4 text-lf-muted">
                      Yard setbacks, size limits, and your ADU design stay on screen
                      together so you can spot obvious fit issues before you hire anyone.
                    </p>
                  </div>
                  <figure className="overflow-hidden rounded-lg border border-lf-hairline bg-lf-sand-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/landing/studio-scene-still.png"
                      alt="The LotFoundry studio: an existing house and a proposed ADU on a 3D lot, with the note 'Within declared limits — 20 ft front, 25 ft rear, 5 ft side setbacks.'"
                      className="block w-full"
                      loading="lazy"
                      width={800}
                      height={620}
                    />
                    <figcaption className="border-t border-lf-hairline px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-muted">
                      The studio · setbacks + proposed ADU
                    </figcaption>
                  </figure>
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
                  <span className="lf-kicker-dense text-lf-clay">03</span>
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
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-[0.92fr_1.08fr] md:items-center md:py-32">
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
          {/* A miniature Certificate of Feasibility — the report is the
              product's shareable artifact, so the landing shows the artifact
              itself: serial line, ledger figures, recorded contents, stamp. */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-lg border border-lf-taupe/30 bg-[#2A1A10] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.4)] sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-lf-taupe">
                <span>No. LF-042-0117-118</span>
                <span>Typical · supported markets</span>
              </div>
              <div className="mt-4 border-t border-lf-taupe/25 pt-4">
                <p className="font-display text-2xl font-semibold leading-tight text-lf-sand">
                  Certificate of Feasibility
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
                  Specimen — your address replaces this
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
                  Rent potential
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
                  Build range
                </p>
                <p className="lf-money-sm text-lf-money-on-dark sm:lf-money-md">
                  {TYPICAL_MARKET.rentBand}
                  <span className="ml-1 font-mono text-xs font-normal text-lf-taupe">/mo</span>
                </p>
                <p className="lf-money-sm text-lf-sand sm:lf-money-md">
                  {TYPICAL_MARKET.buildBand}
                </p>
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-4 border-b-4 border-double border-lf-taupe/50 pb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-lf-taupe">
                  Net operating income
                </span>
                <span className="lf-money-md text-lf-money-on-dark">
                  {TYPICAL_MARKET.noi}
                  <span className="ml-1 font-mono text-xs font-normal text-lf-taupe">/yr</span>
                </span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {REPORT.map((item) => (
                  <li key={item} className="flex gap-2.5 font-mono text-xs leading-5 text-lf-sand/85">
                    <span aria-hidden="true" className="shrink-0 text-lf-taupe">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              aria-hidden="true"
              className="absolute -top-3 right-8 rotate-6 rounded-sm border-2 border-lf-brick/80 bg-lf-brick/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-lf-brick"
            >
              Concept · not a permit
            </div>
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
