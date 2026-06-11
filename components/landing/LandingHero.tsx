"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  formatCurrency,
  parcelPresets,
} from "@/lib/feasibility";

// Instrument rail proof points come from the real engine on the Seattle
// preset, so the landing page and the studio can never disagree.
const SAMPLE_PARCEL = parcelPresets[0];
const SAMPLE_RESULT = calculateFeasibility(
  SAMPLE_PARCEL,
  defaultAduConfig,
  defaultFinancialAssumptions,
);

const RAIL_CELLS = [
  {
    label: "Rent potential",
    value: `${formatCurrency(SAMPLE_PARCEL.expectedRent.conservative)}–${formatCurrency(
      SAMPLE_PARCEL.expectedRent.optimistic,
    ).replace("$", "")}`,
    unit: "/mo",
    money: true,
  },
  {
    label: "Est. net operating income",
    value: formatCurrency(SAMPLE_RESULT.annualNoi),
    unit: "/yr",
    money: true,
  },
  {
    label: "Payback estimate",
    value: SAMPLE_RESULT.paybackYears.toFixed(1),
    unit: "yrs",
    money: false,
  },
];

/**
 * Poster hero (DESIGN.md v2). Full-bleed Remotion clip plays once and holds the
 * final frame; a left editorial scrim guarantees contrast. The headline sits
 * left and low, the address search is a survey instrument, and a financial
 * instrument rail docks to the bottom edge — value before features.
 */
export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    const saveData = connection?.saveData === true;
    if (reduce) {
      console.log("Hero video blocked: prefers-reduced-motion is active.");
      return;
    }
    if (saveData) {
      console.log("Hero video blocked: saveData is active.");
      return;
    }
    void video.play().catch((err) => {
      console.warn("Hero video autoplay blocked by browser (e.g., low-power mode):", err);
    });
  }, []);

  const reducedMotion = useReducedMotion();
  const shouldAnimate = mounted && !reducedMotion;

  const transition = { duration: 0.8, ease: [0.32, 0.72, 0, 1] as const };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/studio?q=${encodeURIComponent(trimmed)}` : "/studio");
  }

  return (
    <section
      className="relative flex items-end overflow-hidden"
      style={{ minHeight: "clamp(620px, 92vh, 860px)" }}
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
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(38,19,7,0.92) 0%, rgba(38,19,7,0.55) 38%, rgba(38,19,7,0.12) 64%, rgba(38,19,7,0) 100%)",
        }}
      />

      {/* Headline block: left and low, clear of the bottom-docked rail. */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-80 pt-28 sm:pb-40">
        <motion.div
          key={shouldAnimate ? "animated" : "static"}
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="max-w-2xl"
        >
          <motion.p
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.85 }}
            transition={{ ...transition, delay: 0.1 }}
            className="font-mono text-xs font-semibold uppercase leading-4 tracking-normal text-lf-sand/85"
          >
            From lot to income
          </motion.p>

          <motion.h1
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.2 }}
            className="mt-3 max-w-[12ch] font-display text-5xl font-semibold leading-[1.02] text-lf-sand sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ textShadow: "0 2px 24px rgba(38,19,7,0.45)" }}
          >
            Your backyard is{" "}
            <em className="italic text-lf-money-on-dark">an asset.</em>
          </motion.h1>

          <motion.p
            initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 0.92, y: 0 }}
            transition={{ ...transition, delay: 0.28 }}
            className="mt-5 max-w-[52ch] text-base leading-7 text-lf-sand/86 sm:text-lg sm:leading-8"
          >
            Search your address and leave with a feasibility concept: site fit,
            rent, build range, and payback in plain terms.
          </motion.p>

          {/* Survey-instrument address search. */}
          <motion.form
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.35 }}
            onSubmit={handleSubmit}
            className="mt-7 flex max-w-md items-stretch border-[1.5px] border-lf-espresso bg-lf-card"
            style={{ boxShadow: "4px 4px 0 rgba(38,19,7,0.35)" }}
          >
            <label htmlFor="hero-address" className="sr-only">
              Property address
            </label>
            <input
              id="hero-address"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter your property address"
              autoComplete="street-address"
              className="min-h-11 w-full flex-1 bg-transparent px-4 font-mono text-sm text-lf-espresso placeholder:text-lf-muted focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 bg-lf-forest px-5 text-sm font-semibold text-lf-sand transition-colors hover:bg-lf-forest/90"
            >
              Run feasibility
            </button>
          </motion.form>

          <motion.p
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.74 }}
            transition={{ ...transition, delay: 0.42 }}
            className="mt-3 max-w-md text-xs leading-5 text-lf-sand/74"
          >
            Uses parcel data where available. Local review is still required
            before design, permit, financing, or investment decisions.
          </motion.p>
        </motion.div>
      </div>

      {/* Financial instrument rail, docked to the bottom edge. */}
      <motion.dl
        initial={shouldAnimate ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.5 }}
        className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-1 border-t border-lf-taupe/35 bg-lf-espresso/95 sm:grid-cols-3"
      >
        {RAIL_CELLS.map(({ label, value, unit, money }) => (
          <div
            key={label}
            className="border-b border-lf-taupe/20 px-6 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:py-5 sm:last:border-r-0"
          >
            <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.17em] text-lf-taupe">
              {label}
            </dt>
            <dd
              className={`mt-1 whitespace-nowrap font-display text-2xl font-semibold leading-none sm:text-[1.7rem] lg:text-3xl ${
                money ? "text-lf-money-on-dark" : "text-lf-sand"
              }`}
            >
              {value}
              <span className="ml-1.5 font-mono text-xs font-normal text-lf-taupe">
                {unit}
              </span>
            </dd>
          </div>
        ))}
        <div className="pointer-events-none absolute right-6 top-0 hidden -translate-y-1/2 sm:block">
          <span className="border border-lf-taupe/40 bg-lf-espresso px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.17em] text-lf-taupe">
            Sample lot · {SAMPLE_PARCEL.city}
          </span>
        </div>
      </motion.dl>
    </section>
  );
}
