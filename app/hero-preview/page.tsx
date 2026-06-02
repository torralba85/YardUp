"use client";

import { useState } from "react";
import { LotAduScene } from "@/components/landing/LotAduScene";

export default function HeroPreview() {
  const [p, setP] = useState(0.6);
  return (
    <div className="min-h-screen bg-lf-sand p-6">
      <div className="mx-auto h-[70vh] max-w-5xl overflow-hidden rounded-2xl border border-lf-hairline">
        <LotAduScene progress={p} />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={p}
        onChange={(e) => setP(Number(e.target.value))}
        className="mx-auto mt-6 block w-full max-w-5xl"
        aria-label="Hero progress"
      />
      <p className="mt-2 text-center font-mono text-xs text-lf-muted">progress {p.toFixed(2)}</p>
    </div>
  );
}
