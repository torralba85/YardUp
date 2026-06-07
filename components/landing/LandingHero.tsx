"use client";

import { useEffect, useRef, useState } from "react";
import { CTAButton } from "./CTAButton";
import { motion, useReducedMotion } from "motion/react";

const HERO_PROOF = [
  { value: "$2,350/mo", label: "sample rent estimate" },
  { value: "31%", label: "lot coverage model" },
  { value: "9.8 yrs", label: "sample payback view" },
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
        {/* H.264 mp4 only — universally decodable. The VP9 webm errored in Chrome. */}
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
          className="max-w-xl"
        >
          <motion.p
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.85 }}
            transition={{ ...transition, delay: 0.1 }}
            className="font-mono text-xs uppercase tracking-[0.2em] text-lf-sand/85"
          >
            From lot to income
          </motion.p>
          <motion.h1
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.2 }}
            className="mt-3 max-w-[11ch] font-display text-4xl font-bold leading-[0.95] tracking-[-0.03em] text-lf-sand sm:text-5xl md:text-7xl"
            style={{ textShadow: "0 2px 24px rgba(38,19,7,0.45)" }}
          >
            See the rent your backyard is hiding.
          </motion.h1>

          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.35 }}
          >
            <CTAButton href="/signup" className="mt-7">
              Estimate my lot
            </CTAButton>
          </motion.div>

          <motion.dl
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transition, delay: 0.5 }}
            className="mt-6 grid gap-3 rounded-2xl border border-lf-sand/20 bg-[#f8f0e41f] px-4 py-4 text-lf-sand shadow-[0_18px_40px_rgba(38,19,7,0.14)] backdrop-blur-sm sm:grid-cols-3 sm:gap-4 sm:px-5"
          >
            {HERO_PROOF.map(({ value, label }) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-[0.2em] text-lf-sand/75">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-2xl font-bold leading-none text-lf-sand sm:text-[1.75rem]">
                  {value}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </section>
  );
}
