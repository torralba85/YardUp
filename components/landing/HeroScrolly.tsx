"use client";

import { useRef } from "react";
import { useScroll, useSpring } from "motion/react";
import { LotAduScene } from "./LotAduScene";
import { StageCaptions } from "./StageCaptions";
import { HeroStaticFrame } from "./HeroStory2D";

/**
 * Pinned 3D scrollytelling hero. A tall section provides the scroll runway; the
 * inner grid sticks to the viewport. `scrollYProgress` (0→1) is the single
 * source of truth, passed as a MotionValue to both the caption overlay and the
 * WebGL scene.
 */
export default function HeroScrolly() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 72,
    damping: 28,
    mass: 0.42,
    restDelta: 0.001,
  });

  return (
    <section ref={ref} className="relative h-[360vh]">
      <div className="sticky top-0 grid h-svh grid-cols-1 overflow-hidden lg:grid-cols-[0.92fr_1.08fr]">
        <StageCaptions progress={smoothProgress} />
        <div className="relative h-full">
          <LotAduScene progress={smoothProgress} fallback={<HeroStaticFrame />} />
        </div>
      </div>
    </section>
  );
}
