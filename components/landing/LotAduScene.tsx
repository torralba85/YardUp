"use client";

import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
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

/**
 * WebGL canvas wrapper. Renders on demand: the scene's `useFrame` is woken by
 * the `progress` MotionValue (see HeroSceneContent), so the GPU only works
 * while the user scrolls. The camera and build are driven entirely from
 * `progress` inside the scene — no OrbitControls in v1 (scroll owns the camera).
 */
export function LotAduScene({
  progress,
  fallback = null,
}: {
  progress: MotionValue<number>;
  fallback?: ReactNode;
}) {
  return (
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
  );
}
