"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FloatingNavBar() {
  const { scrollY } = useScroll();

  // Map scroll position to different visual states.
  // Width is kept at 100% (static) and maxWidth transitions from a large value
  // to 850px — both values share the px unit so Framer Motion interpolates cleanly.
  // Using ["100%","850px"] directly breaks because Framer Motion strips the "%"
  // suffix and treats it as px, collapsing the bar to 100px at scroll 0.
  const maxWidth = useTransform(scrollY, [0, 100], [9999, 850]);
  const paddingY = useTransform(scrollY, [0, 100], ["16px", "12px"]);
  const top = useTransform(scrollY, [0, 100], ["0px", "24px"]);
  const borderRadius = useTransform(scrollY, [0, 100], ["0px", "100px"]);
  // scroll-0 was "rgba(242,229,213,1)" = lf-sand, identical to the body — the bar
  // was invisible at the top (the "two boxes" bug). Starting at lf-card (slightly
  // lighter/warmer) with a faint blur gives the pill a readable surface at rest.
  const background = useTransform(
    scrollY,
    [0, 100],
    ["rgba(251, 246, 238, 0.92)", "rgba(251, 246, 238, 0.85)"]
  );
  const backdropFilter = useTransform(scrollY, [0, 100], ["blur(4px)", "blur(12px)"]);
  const borderColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(224, 205, 180, 0.6)", "rgba(224, 205, 180, 0.8)"]
  );
  const boxShadow = useTransform(
    scrollY,
    [0, 100],
    [
      "0 2px 12px -4px rgba(38, 19, 7, 0.06)",
      "0 10px 40px -10px rgba(38, 19, 7, 0.1)",
    ]
  );

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none">
      <motion.header
        style={{
          width: "100%",
          maxWidth,
          paddingTop: paddingY,
          paddingBottom: paddingY,
          marginTop: top,
          borderRadius,
          background,
          backdropFilter,
          borderColor,
          borderWidth: "1px",
          borderStyle: "solid",
          boxShadow,
        }}
        className="pointer-events-auto px-6 max-w-7xl mx-auto flex items-center justify-between"
      >
        <Link href="/" aria-label="LotFoundry home" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lotfoundry-lockup-horizontal.svg"
            alt="LotFoundry"
            className="h-7 w-auto sm:h-8"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium sm:px-4 text-lf-espresso transition-colors hover:bg-lf-taupe/10"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="group inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-lf-mahogany py-1.5 pl-4 pr-1.5 text-sm font-medium text-lf-sand transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-lf-clay active:scale-[0.98]"
          >
            Estimate my lot
            <span
              aria-hidden="true"
              className="grid h-7 w-7 place-items-center rounded-full bg-lf-sand/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </motion.header>
    </div>
  );
}
