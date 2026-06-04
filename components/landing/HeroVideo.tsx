"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Full-bleed video-background hero. A looping, muted, autoplaying clip sits
 * behind the headline and CTA; warm scrims keep the copy legible over any
 * frame of the footage. Reduced-motion users never reach this component —
 * LandingHero routes them to the static HeroStory2D instead — so the autoplay
 * is always safe for the visitors who see it.
 */
export function HeroVideo() {
  return (
    <section className="relative isolate flex min-h-[88svh] items-center overflow-hidden">
      <video
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero-poster.jpg"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/hero-background.mp4" type="video/mp4" />
      </video>

      {/* Readability scrims: a darkening wash plus a left-anchored gradient so
          the copy column always sits on enough contrast regardless of frame. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(38,19,7,0.82)_0%,rgba(38,19,7,0.62)_42%,rgba(38,19,7,0.28)_70%,rgba(38,19,7,0.12)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-[linear-gradient(180deg,transparent,rgba(38,19,7,0.55))]"
      />

      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="lf-reveal font-mono text-xs uppercase tracking-[0.18em] text-lf-sand/80">
            ADU income snapshot
          </p>
          <h1 className="lf-reveal mt-3 font-display text-5xl font-black leading-[0.98] tracking-[-0.03em] text-lf-sand md:text-7xl">
            Know what your lot could earn.
          </h1>
          <p className="lf-reveal mt-5 max-w-lg text-lg leading-8 text-lf-sand/85">
            LotFoundry turns a backyard address into a visual ADU concept, rent
            estimate, and owner-ready report before you start calling builders.
          </p>
          <Link
            href="/signup"
            className="lf-reveal mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-lf-mahogany px-6 text-base font-semibold text-lf-sand transition-colors hover:bg-lf-clay"
          >
            Estimate my lot
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
