"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { defaultAduConfig } from "@/lib/feasibility";
import type { SplatSource, SplatTransform } from "@/lib/splat-scene";
import { AduArchitecture } from "./AduArchitecture";
import GaussianSplatLayer, { type SplatLayerStatus } from "./GaussianSplatLayer";
import { COLOR } from "@/lib/design-tokens";


interface Props {
  source: SplatSource;
  transform: SplatTransform;
  visible: boolean;
  generation: number;
  orthographic: boolean;
  aduZ: number;
  onStatus: (status: SplatLayerStatus) => void;
  sampleDiagnostics: RefObject<(() => string) | null>;
}

function Diagnostics({ sampleRef }: { sampleRef: Props["sampleDiagnostics"] }) {
  const { gl, scene } = useThree();
  const frames = useRef(0);
  useFrame(() => { frames.current++; });
  useEffect(() => {
    sampleRef.current = () => JSON.stringify({
      frameSubmissions: frames.current,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      sceneChildren: scene.children.length,
      canvasCount: gl.domElement.parentElement?.querySelectorAll("canvas").length,
      crossOriginIsolated: window.crossOriginIsolated,
      viewport: [gl.domElement.width, gl.domElement.height],
      note: "CPU frame submissions and Three resource counts; not GPU memory or FPS.",
    }, null, 2);
    return () => { sampleRef.current = null; };
  }, [gl, scene, sampleRef]);
  return null;
}

export default function SplatWorkbenchScene(props: Props) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} gl={{ antialias: false }} aria-label="Scan and ADU depth scene">
      <color attach="background" args={[COLOR["lot-chalk"]]} />
      {props.orthographic
        ? <OrthographicCamera makeDefault position={[0, 18, 85]} zoom={8} near={0.1} far={500} />
        : <PerspectiveCamera makeDefault position={[0, 18, 85]} fov={45} near={0.1} far={500} />}
      <OrbitControls makeDefault target={[0, 9, 0]} enableDamping={false} minDistance={8} maxDistance={180} />
      <ambientLight intensity={1.8} />
      <directionalLight position={[30, 50, 40]} intensity={2.5} />
      <gridHelper args={[100, 20, COLOR["lot-stone"], COLOR["lot-line"]]} />
      <group position={[0, 0, props.aduZ]}><AduArchitecture config={defaultAduConfig} /></group>
      {props.visible && <GaussianSplatLayer key={props.generation} source={props.source} transform={props.transform} onStatus={props.onStatus} />}
      <Diagnostics sampleRef={props.sampleDiagnostics} />
    </Canvas>
  );
}
