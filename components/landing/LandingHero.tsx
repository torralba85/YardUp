"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CTAButton } from "./CTAButton";

const HERO_PROOF = [
  { value: "01", label: "Address", detail: "Start with the lot you own" },
  { value: "02", label: "Fit", detail: "Check size, setbacks, and coverage" },
  { value: "03", label: "Income", detail: "Compare rent, cost, and payback" },
];

/**
 * Full-bleed hero. Plays a Remotion-rendered ~6s clip once and holds the final
 * frame (which is also the poster, so the static/reduced-motion view still shows
 * the rent answer). A fixed left editorial scrim guarantees headline/CTA contrast
 * regardless of the playing frame.
 */
export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);

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

  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{ minHeight: "clamp(560px, 80vh, 760px)" }}
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

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
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
            className="mt-3 max-w-[13ch] font-display text-[2.5rem] font-bold leading-[0.98] text-lf-sand sm:text-5xl md:text-7xl"
            style={{ textShadow: "0 2px 24px rgba(38,19,7,0.45)" }}
          >
            Estimate the ADU income your lot could support.
          </motion.h1>

          <motion.p
            initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 0.92, y: 0 }}
            transition={{ ...transition, delay: 0.28 }}
            className="mt-5 max-w-[65ch] text-base leading-7 text-lf-sand/86 sm:text-lg sm:leading-8"
          >
            Start with an address, tune the ADU concept, and leave with a report
            that explains site fit, rent, build range, and payback in plain terms.
          </motion.p>

          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.35 }}
            className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
          >
            <CTAButton href="/studio">Check my address</CTAButton>
            <p className="max-w-sm text-sm leading-6 text-lf-sand/74">
              Uses parcel data where available. Local review is still required
              before design, permit, financing, or investment decisions.
            </p>
          </motion.div>

          <motion.ol
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.5 }}
            className="mt-8 grid gap-3 border-y border-lf-sand/20 py-4 text-lf-sand sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-lf-sand/20"
          >
            {HERO_PROOF.map(({ value, label, detail }) => (
              <li key={label} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 sm:px-4 first:sm:pl-0">
                <span className="font-mono text-xs font-semibold text-lf-taupe">
                  {value}
                </span>
                <span className="text-sm font-semibold text-lf-sand">
                  {label}
                </span>
                <span className="col-start-2 text-xs leading-5 text-lf-sand/72">
                  {detail}
                </span>
              </li>
            ))}
          </motion.ol>
        </motion.div>
      </div>
    </section>
  );
}
