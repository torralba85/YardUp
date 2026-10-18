"use client";
/* eslint-disable react-hooks/immutability -- R3F cameras and OrbitControls are imperative Three.js objects; effects own their projection and flight updates. */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { OrthographicCamera as Ortho, PerspectiveCamera as Perspective, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";
import type { LocalBounds } from "@/lib/scene-model";
import { calculateCameraFit, type SceneView } from "@/lib/scene-camera-fit";

export function SceneCameras({ mode }: { mode: SceneView }) {
  return mode === "setbacks"
    ? <OrthographicCamera makeDefault position={[0,150,0]} up={[0,0,-1]} near={0.1} far={2000} />
    : <PerspectiveCamera makeDefault position={[58,58,72]} fov={42} near={0.1} far={2000} />;
}

export function SceneCameraController({ commandId, mode, bounds, geometryRevision, reducedMotion = false }: {
  commandId: number; mode: SceneView; bounds: LocalBounds; geometryRevision: string; reducedMotion?: boolean;
}) {
  const { camera, size, invalidate, controls: rawControls } = useThree();
  const controls = rawControls as OrbitControls | null;
  const latest = useRef(bounds);
  const flight = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  useEffect(() => { latest.current = bounds; }, [bounds]);
  useEffect(() => {
    if (!controls) return;
    const cancel = () => { flight.current = null; };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);
  useEffect(() => {
    if (!controls || !(camera instanceof Perspective || camera instanceof Ortho)) return;
    const fit = calculateCameraFit({ bounds: latest.current, fov: 42, viewportWidth: size.width, viewportHeight: size.height,
      insets: { top: 12, bottom: 64, left: 12, right: 12 }, mode });
    if (!fit) return;
    camera.near = fit.near; camera.far = fit.far;
    camera.up.fromArray(mode === "setbacks" ? [0,0,-1] : [0,1,0]);
    if (camera instanceof Ortho) {
      camera.left = -size.width/2; camera.right = size.width/2;
      camera.top = size.height/2; camera.bottom = -size.height/2; camera.zoom = fit.zoom;
      controls.minZoom = fit.zoom*0.2; controls.maxZoom = fit.zoom*10;
    }
    camera.updateProjectionMatrix();
    controls.minDistance = fit.minDistance; controls.maxDistance = fit.maxDistance;
    const position = new Vector3().fromArray(fit.position), target = new Vector3().fromArray(fit.target);
    // Projection switches and reduced motion snap; ordinary pose changes never enter this effect.
    if (reducedMotion || mode === "setbacks") {
      flight.current = null; camera.position.copy(position); controls.target.copy(target); controls.update();
    } else flight.current = { position, target };
    invalidate();
    return () => { flight.current = null; };
  }, [commandId, mode, geometryRevision, size.width, size.height, camera, controls, reducedMotion, invalidate]);
  useFrame((_, delta) => {
    const current = flight.current;
    if (!current || !controls) return;
    const step = 1 - Math.exp(-4.8 * Math.min(delta, 0.1));
    camera.position.lerp(current.position, step); controls.target.lerp(current.target, step);
    if (camera.position.distanceToSquared(current.position)<0.001 && controls.target.distanceToSquared(current.target)<0.001) {
      camera.position.copy(current.position); controls.target.copy(current.target); flight.current = null;
    }
    controls.update(); invalidate();
  });
  return null;
}
