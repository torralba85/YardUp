"use client";

import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { clamp01 } from "@/lib/landing-stages";
import { useStateFromMotionNumber } from "./use-motion-number";
import { HeroSceneContent } from "./HeroSceneContent";

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function SceneOverlay({ progress }: { progress: MotionValue<number> }) {
  const p = useStateFromMotionNumber(progress);
  const conceptOpacity = Math.min(clamp01((p - 0.22) / 0.12), 1 - clamp01((p - 0.58) / 0.1));
  const numbersOpacity = clamp01((p - 0.5) / 0.12);
  const reportOpacity = clamp01((p - 0.76) / 0.1);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute right-6 top-6 rounded-md border border-lf-hairline/80 bg-lf-card/80 px-4 py-3 text-sm text-lf-muted shadow-[0_18px_50px_-30px_rgba(38,19,7,0.65)] backdrop-blur">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Live concept</span>
        <strong className="mt-1 block font-display text-xl text-lf-espresso">Denver backyard sample</strong>
      </div>

      <div
        className="absolute left-8 top-[42%] hidden w-56 rounded-md border border-lf-forest/25 bg-lf-forest px-4 py-3 text-lf-sand shadow-[0_24px_60px_-36px_rgba(38,19,7,0.8)] backdrop-blur lg:block"
        style={{ opacity: conceptOpacity, transform: `translateY(${(1 - conceptOpacity) * 14}px)` }}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-75">Concept fit</p>
        <p className="mt-1 font-display text-xl font-bold">18 x 12 ft ADU</p>
        <p className="mt-1 text-sm opacity-85">Placed inside the visible setback envelope.</p>
      </div>

      <div
        className="absolute bottom-8 right-8 grid w-64 gap-3 rounded-md border border-lf-hairline bg-lf-card/88 p-4 text-lf-muted shadow-[0_24px_70px_-38px_rgba(38,19,7,0.85)] backdrop-blur"
        style={{ opacity: numbersOpacity, transform: `translateY(${(1 - numbersOpacity) * 12}px)` }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm">Estimated rent</span>
          <strong className="font-display text-2xl tabular-nums text-lf-espresso">$2,350/mo</strong>
        </div>
        <div className="flex items-center justify-between border-t border-lf-hairline pt-3 text-sm">
          <span>NOI</span>
          <strong className="text-lf-espresso">$20.6k</strong>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Report readiness</span>
          <strong className="text-lf-forest" style={{ opacity: Math.max(0.5, reportOpacity) }}>Owner packet</strong>
        </div>
      </div>
    </div>
  );
}

export function LotAduScene({
  progress,
  fallback = null,
}: {
  progress: MotionValue<number>;
  fallback?: ReactNode;
}) {
  return (
    <div className="relative h-full overflow-hidden">
      <SceneBoundary fallback={fallback}>
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, 1.5]}
          camera={{ position: [40, 44, 56], fov: 38, near: 1, far: 400 }}
          gl={{ alpha: true, antialias: true }}
          style={{ background: "transparent" }}
        >
          <HeroSceneContent progress={progress} />
        </Canvas>
      </SceneBoundary>
      <SceneOverlay progress={progress} />
    </div>
  );
}
