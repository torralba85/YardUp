"use client";

import { useState } from "react";
import { useMotionValue } from "motion/react";
import { LotAduScene } from "@/components/landing/LotAduScene";

export default function HeroPreview() {
  const progress = useMotionValue(0.6);
  const [label, setLabel] = useState(0.6);
  return (
    <div className="min-h-screen bg-lf-sand p-6">
      <div className="mx-auto h-[70vh] max-w-5xl overflow-hidden rounded-2xl border border-lf-hairline">
        <LotAduScene progress={progress} />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        defaultValue={0.6}
        onChange={(e) => {
          const v = Number(e.target.value);
          progress.set(v);
          setLabel(v);
        }}
        className="mx-auto mt-6 block w-full max-w-5xl"
        aria-label="Hero progress"
      />
      <p className="mt-2 text-center font-mono text-xs text-lf-muted">progress {label.toFixed(2)}</p>
    </div>
  );
}
