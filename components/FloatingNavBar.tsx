"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FloatingNavBar() {
  const { scrollY } = useScroll();

  // Map scroll position to different visual states
  const width = useTransform(scrollY, [0, 100], ["100%", "850px"]);
  const paddingY = useTransform(scrollY, [0, 100], ["16px", "12px"]);
  const top = useTransform(scrollY, [0, 100], ["0px", "24px"]);
  const borderRadius = useTransform(scrollY, [0, 100], ["0px", "100px"]);
  const background = useTransform(
    scrollY,
    [0, 100],
    ["rgba(242, 229, 213, 1)", "rgba(251, 246, 238, 0.85)"] // lf-sand to lf-card
  );
  const backdropFilter = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(12px)"]);
  const borderColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(224, 205, 180, 0.5)", "rgba(224, 205, 180, 0.8)"] // border-lf-hairline
  );
  const boxShadow = useTransform(
    scrollY,
    [0, 100],
    ["none", "0 10px 40px -10px rgba(38, 19, 7, 0.1)"] // subtle espresso shadow
  );

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex justify-center pointer-events-none">
      <motion.header
        style={{
          width,
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
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-lf-espresso transition-colors hover:bg-lf-taupe/10"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-lf-mahogany px-4 py-2 text-sm font-medium text-lf-sand transition-colors hover:bg-lf-clay"
          >
            Estimate my lot
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.header>
    </div>
  );
}
