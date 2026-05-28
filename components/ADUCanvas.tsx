'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ADUConfig {
  width: number;
  length: number;
  height: number;
  roof: 'flat' | 'pitched';
  material: 'wood' | 'stucco' | 'metal';
  windows: boolean;
  maxCoveragePercentage?: number;
}

const colors = {
  wood: '#a1662f',
  stucco: '#e2dcca',
  metal: '#4b5563',
};

function ADUHouse({ config }: { config: ADUConfig }) {
  const { width, length, height, roof, material, windows } = config;

  // Extrude settings and geometry for Pitch Roof
  const { roofGeo, roofDepth } = useMemo(() => {
    const rDepth = length + 0.5;
    const roofWidth = width + 0.8;
    const roofHeight = width * 0.25;

    const shape = new THREE.Shape();
    shape.moveTo(-roofWidth / 2, 0);
    shape.lineTo(0, roofHeight);
    shape.lineTo(roofWidth / 2, 0);
    shape.lineTo(-roofWidth / 2, 0);

    const extrudeSettings = {
      steps: 1,
      depth: rDepth,
      bevelEnabled: false,
    };

    return {
      roofGeo: new THREE.ExtrudeGeometry(shape, extrudeSettings),
      roofDepth: rDepth,
    };
  }, [width, length]);

  // Width dimension line (X-axis) at the front of the ADU
  const widthGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const wlY = 0.5;
    const wlZ = length / 2 + 2;
    const vertices = new Float32Array([
      -width / 2, wlY, wlZ,
       width / 2, wlY, wlZ,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }, [width, length]);

  // Length dimension line (Z-axis) at the side of the ADU
  const lengthGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const wlY = 0.5;
    const llX = -width / 2 - 2;
    const vertices = new Float32Array([
      llX, wlY, -length / 2,
      llX, wlY,  length / 2,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }, [width, length]);

  const widthLine = useMemo(
    () => new THREE.Line(widthGeo, new THREE.LineBasicMaterial({ color: '#06b6d4' })),
    [widthGeo],
  );
  const lengthLine = useMemo(
    () => new THREE.Line(lengthGeo, new THREE.LineBasicMaterial({ color: '#06b6d4' })),
    [lengthGeo],
  );

  return (
    <group>
      {/* Base main body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, length]} />
        <meshStandardMaterial color={colors[material]} roughness={0.8} />
      </mesh>

      {/* Windows & Door representation */}
      {windows && (
        <group>
          {/* Window Frame (dark border) */}
          <mesh position={[0, height * 0.4, length / 2 + 0.05]} castShadow>
            <boxGeometry args={[width * 0.42, height * 0.62, 0.1]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
          {/* Front Window/Glass */}
          <mesh position={[0, height * 0.4, length / 2 + 0.1]} castShadow>
            <boxGeometry args={[width * 0.4, height * 0.6, 0.2]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} />
          </mesh>
        </group>
      )}

      {/* Roof Logic */}
      {roof === 'pitched' ? (
        <mesh geometry={roofGeo} position={[0, height, -roofDepth / 2]} castShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      ) : (
        /* Flat Roof capping overhang */
        <mesh position={[0, height + 0.2, 0]} castShadow>
          <boxGeometry args={[width + 0.8, 0.4, length + 0.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>
      )}

      {/* Width dimension line */}
      <primitive object={widthLine} />

      {/* Length dimension line */}
      <primitive object={lengthLine} />
    </group>
  );
}

export default function ADUCanvas({ config }: { config: ADUConfig }) {
  // Setback boundary lines setup (Red box)
  const setbackGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -30, 0.1, -40,
       30, 0.1, -40,
       30, 0.1, -40,
       30, 0.1,  40,
       30, 0.1,  40,
      -30, 0.1,  40,
      -30, 0.1,  40,
      -30, 0.1, -40,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }, []);

  const lotWidth = 80;
  const lotLength = 100;
  const lotArea = lotWidth * lotLength;
  const maxCoveragePercentage = config.maxCoveragePercentage ?? 10;
  const maxSqft = (lotArea * maxCoveragePercentage) / 100;
  const currentSqft = config.width * config.length;
  const exceedsCoverage = currentSqft > maxSqft;
  const setbackLines = useMemo(
    () => new THREE.LineSegments(setbackGeo, new THREE.LineBasicMaterial({ color: exceedsCoverage ? '#f97316' : '#ef4444' })),
    [exceedsCoverage, setbackGeo],
  );

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{ position: [40, 30, 40], fov: 45, near: 1, far: 1000 }}
        className="w-full h-full"
        style={{ background: '#0f172a' }}
      >
        <ambientLight intensity={1.5} />
        
        <directionalLight
          position={[30, 50, 30]}
          intensity={3.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={150}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />

        <gridHelper args={[200, 200, '#334155', '#1e293b']} position={[0, -0.05, 0]} />

        {/* Grass lot plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[80, 100]} />
          <meshStandardMaterial color="#064e3b" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Setback line segments */}
        <primitive object={setbackLines} />

        {/* Dynamic ADU */}
        <ADUHouse config={config} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={10}
          maxDistance={150}
        />
      </Canvas>

      {/* Dynamic measurement overlay */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 font-mono text-xs bg-slate-900/90 border border-slate-800 p-4 rounded-xl text-slate-300 pointer-events-none backdrop-blur-md z-10">
        <p className="text-cyan-400 font-bold mb-1">📐 Dynamic Bounds</p>
        <div>Width: <span className="text-white">{config.width} ft</span></div>
        <div>Length: <span className="text-white">{config.length} ft</span></div>
        <div>Height: <span className="text-white">{config.height} ft</span></div>
        <div className="border-t border-slate-800 my-2"></div>
        <div>Footprint: <span className={exceedsCoverage ? "text-orange-400" : "text-emerald-400"}>{config.width * config.length} sq ft</span></div>
        <div>Setback Alert: <span className={exceedsCoverage ? "text-orange-400" : "text-red-400"}>{exceedsCoverage ? `Coverage Exceeds ${maxCoveragePercentage}%` : '10ft boundary'}</span></div>
      </div>
    </div>
  );
}
