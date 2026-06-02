"use client";

import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { lerp } from "@/lib/landing-stages";
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

export function LotAduScene({
  progress,
  fallback = null,
}: {
  progress: number;
  fallback?: ReactNode;
}) {
  // Slow cinematic orbit derived from progress: ~38°→~18° azimuth as it builds.
  const azimuth = lerp(0.66, 0.32, progress);
  const camX = Math.sin(azimuth) * 70;
  const camZ = Math.cos(azimuth) * 70;

  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        shadows
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [camX, 44, camZ], fov: 38, near: 1, far: 400 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
        key={Math.round(progress * 240)}
      >
        <HeroSceneContent progress={progress} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </SceneBoundary>
  );
}
