"use client";

import { useRef } from "react";
import { useScroll } from "motion/react";
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

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 grid h-screen grid-cols-1 lg:grid-cols-2">
        <StageCaptions progress={scrollYProgress} />
        <div className="relative h-full">
          <LotAduScene progress={scrollYProgress} fallback={<HeroStaticFrame />} />
        </div>
      </div>
    </section>
  );
}
