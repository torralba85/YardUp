"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const LAYERS = {
  zoning: { base: 0, explode: 0 },
  foundation: { base: 0, explode: 0.45 },
  structure: { base: 0.23, explode: 1.1 },
  shell: { base: 0.23, explode: 1.95 },
  roof: { base: 1.4, explode: 2.8 },
} as const;

/** Daylight color palette (fog, lights, ground gradient) for the hero scene. */
export const HERO_SCENE_PALETTE = {
  mode: "daylight",
  fog: 0xeadfce,
  skyLight: 0xeaf4f6,
  groundLight: 0xbfa58e,
  groundStops: ["#9aa27b", "#7f8c69", "#eadfce"],
} as const;

type LayerId = keyof typeof LAYERS;
type Fan = [number, number, number];

type BoxOptions = {
  rough?: number;
  metal?: number;
  opacity?: number;
  envIntensity?: number;
  emissive?: { color: THREE.ColorRepresentation; intensity: number };
  fan?: Fan;
  cast?: boolean;
  receive?: boolean;
  edge?: boolean;
};

type ScenePart = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> & {
  userData: { base: THREE.Vector3; fan: Fan; layer: LayerId };
};

type LabelSprite = THREE.Sprite & { userData: { layer: LayerId } };

/**
 * Compute responsive camera/layout parameters for the hero scene from the
 * viewport width (e.g. a `mobile` flag below 820px and the associated framing).
 *
 * @param width - The current viewport width in pixels.
 * @returns A profile object of viewport-dependent scene settings.
 */
export function getSceneViewportProfile(width: number) {
  const mobile = width < 820;
  return {
    mobile,
    antialias: !mobile,
    maxPixelRatio: mobile ? 1.25 : 1.75,
    shadows: !mobile,
    rootScale: mobile ? 0.86 : 1,
    rootY: mobile ? -0.18 : 0,
    cameraRadius: mobile ? ([12.2, 17.8] as const) : ([8.8, 13.5] as const),
    cameraHeight: mobile ? ([3.7, 7.5] as const) : ([2.6, 6.2] as const),
    cameraTargetY: mobile ? ([0.45, 2.1] as const) : ([0.5, 1.9] as const),
  };
}

const W = 5.2;
const D = 3.4;
const SLOPE = 0.14;

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function createLabelTexture(label: string, detail: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 150;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "rgba(251, 246, 238, 0.94)";
  context.strokeStyle = accent;
  context.lineWidth = 2.5;
  context.beginPath();
  context.roundRect(6, 30, 628, 90, 24);
  context.fill();
  context.stroke();
  context.fillStyle = accent;
  context.font = '600 30px "IBM Plex Mono", monospace';
  context.fillText(label, 34, 78);
  context.fillStyle = "rgba(38, 19, 7, 0.62)";
  context.font = '400 20px "IBM Plex Mono", monospace';
  context.fillText(detail, 34, 108);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A production port of the supplied LotFoundry deconstruction prototype.
 * The scene is deliberately built with local Three.js modules rather than the
 * prototype's CDN imports, and receives normalized scroll progress from the
 * landing hero.
 */
export function BlueprintScene({ progress }: { progress: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.dataset.rendererState = "initializing";

    // Browser automation uses software WebGL, which makes full-page screenshots
    // and context teardown unreliable. Keep the daylight SVG fallback active in
    // that environment; real browsers still receive the full Three.js scene.
    const urlParams = new URLSearchParams(window.location.search);
    const force3d = urlParams.get("force_3d") === "true";
    if (navigator.webdriver && !force3d) {
      host.dataset.rendererState = "fallback";
      return;
    }

    if (typeof window.WebGLRenderingContext === "undefined") {
      host.dataset.rendererState = "fallback";
      return;
    }

    let viewportProfile = getSceneViewportProfile(host.clientWidth || window.innerWidth);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: viewportProfile.antialias,
        alpha: true,
        powerPreference: viewportProfile.mobile ? "default" : "high-performance",
      });
    } catch {
      host.dataset.rendererState = "fallback";
      return;
    }

    renderer.domElement.className = "absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, viewportProfile.maxPixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = viewportProfile.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(HERO_SCENE_PALETTE.fog, 0.024);

    const environmentScene = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(environmentScene, 0.04).texture;
    scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
    const root = new THREE.Group();
    scene.add(root);

    const composer = viewportProfile.mobile ? null : new EffectComposer(renderer);
    if (composer) {
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.12, 0.55, 1));
      composer.addPass(new OutputPass());
    }

    scene.add(
      new THREE.HemisphereLight(
        HERO_SCENE_PALETTE.skyLight,
        HERO_SCENE_PALETTE.groundLight,
        1.15,
      ),
    );
    const key = new THREE.DirectionalLight(0xfff6e9, 2.1);
    key.position.set(5, 8.5, 7);
    key.castShadow = true;
    const shadowMapSize = viewportProfile.mobile ? 768 : 1536;
    key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const facadeLight = new THREE.PointLight(0xfff1dd, 0.9, 18, 1.5);
    facadeLight.position.set(1.2, 2.8, 7.5);
    scene.add(facadeLight);

    const emberLight = new THREE.PointLight(0xd8ad78, 0.7, 16, 1.8);
    emberLight.position.set(-4.2, 2.6, -2.4);
    scene.add(emberLight);

    const groundCanvas = document.createElement("canvas");
    groundCanvas.width = groundCanvas.height = 512;
    const groundContext = groundCanvas.getContext("2d");
    if (groundContext) {
      const gradient = groundContext.createRadialGradient(256, 256, 40, 256, 256, 256);
      gradient.addColorStop(0, HERO_SCENE_PALETTE.groundStops[0]);
      gradient.addColorStop(0.5, HERO_SCENE_PALETTE.groundStops[1]);
      gradient.addColorStop(1, HERO_SCENE_PALETTE.groundStops[2]);
      groundContext.fillStyle = gradient;
      groundContext.fillRect(0, 0, 512, 512);
    }
    const groundTexture = new THREE.CanvasTexture(groundCanvas);
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7.6, 96),
      new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.98, envMapIntensity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    root.add(ground);

    const site = new THREE.Group();
    root.add(site);
    const layerGroups = new Map<LayerId, THREE.Group>();
    const parts: ScenePart[] = [];
    const edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>[] = [];
    const labels: LabelSprite[] = [];

    function layer(id: LayerId) {
      const group = new THREE.Group();
      group.position.y = LAYERS[id].base;
      layerGroups.set(id, group);
      root.add(group);
      return group;
    }

    function addEdge(mesh: THREE.Mesh<THREE.BufferGeometry>) {
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 24),
        new THREE.LineBasicMaterial({ color: 0x8c5b3f, transparent: true, opacity: 0 }),
      );
      mesh.add(edge);
      edges.push(edge);
      return edge;
    }

    function box(
      group: THREE.Group,
      id: LayerId,
      size: [number, number, number],
      position: [number, number, number],
      color: THREE.ColorRepresentation,
      options: BoxOptions = {},
    ) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: options.rough ?? 0.7,
        metalness: options.metal ?? 0.06,
        transparent: options.opacity !== undefined,
        opacity: options.opacity ?? 1,
        envMapIntensity: options.envIntensity ?? 0.4,
      });
      if (options.emissive) {
        material.emissive = new THREE.Color(options.emissive.color);
        material.emissiveIntensity = options.emissive.intensity;
      }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material) as unknown as ScenePart;
      mesh.position.set(...position);
      mesh.castShadow = options.cast !== false;
      mesh.receiveShadow = options.receive !== false;
      mesh.userData = {
        base: mesh.position.clone(),
        fan: options.fan ?? [0, 0, 0],
        layer: id,
      };
      group.add(mesh);
      parts.push(mesh);
      if (options.edge !== false) addEdge(mesh);
      return mesh;
    }

    function siteMesh(
      geometry: THREE.BufferGeometry,
      position: [number, number, number],
      color: THREE.ColorRepresentation,
      options: BoxOptions = {},
    ) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: options.rough ?? 0.9,
        metalness: options.metal ?? 0,
        envMapIntensity: options.envIntensity ?? 0.25,
      });
      if (options.emissive) {
        material.emissive = new THREE.Color(options.emissive.color);
        material.emissiveIntensity = options.emissive.intensity;
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = options.cast !== false;
      mesh.receiveShadow = options.receive !== false;
      site.add(mesh);
      return mesh;
    }

    const zoning = layer("zoning");
    const grid = new THREE.GridHelper(7, 20, 0x2f4a38, 0x79907d);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.4;
    });
    zoning.add(grid);
    const envelope = box(zoning, "zoning", [W + 1.2, 0.02, D + 1], [0, 0.02, 0], 0x5f9a78, {
      opacity: 0.09,
      rough: 1,
      edge: false,
    });
    addEdge(envelope);

    const foundation = layer("foundation");
    box(foundation, "foundation", [W, 0.22, D], [0, 0, 0], 0xb6b2aa, { rough: 0.95, metal: 0 });
    box(foundation, "foundation", [W + 0.12, 0.08, D + 0.12], [0, -0.09, 0], 0x9b978f, {
      rough: 0.97,
      metal: 0,
    });
    box(foundation, "foundation", [W - 0.5, 0.06, D - 0.5], [0, 0.15, 0], 0x726e66, {
      rough: 0.98,
      metal: 0,
    });

    const structure = layer("structure");
    const postX = W / 2 - 0.18;
    const postZ = D / 2 - 0.18;
    [
      [-postX, -postZ], [postX, -postZ], [-postX, postZ], [postX, postZ],
      [0, -postZ], [0, postZ], [-postX, 0], [postX, 0],
    ].forEach(([x, z]) => box(structure, "structure", [0.12, 1.34, 0.12], [x, 0.55, z], 0xc6a677));
    box(structure, "structure", [W - 0.2, 0.12, 0.12], [0, 1.1, -postZ], 0xc6a677);
    box(structure, "structure", [W - 0.2, 0.12, 0.12], [0, 1.15, postZ], 0xc6a677);
    [-1.7, -0.55, 0.6, 1.7].forEach((x) => {
      const rafter = box(structure, "structure", [0.1, 0.1, D], [x, 1.18, 0], 0xb5996f);
      rafter.rotation.x = SLOPE;
    });

    const shell = layer("shell");
    const frontZ = D / 2;
    const shellFan: Fan = [0, 0, 0.6];
    box(shell, "shell", [W, 1.34, 0.16], [0, 0.55, -D / 2], 0xe9e6df, { rough: 0.82, fan: [0, 0, -0.6] });
    box(shell, "shell", [W, 0.2, 0.16], [0, 1.26, -D / 2], 0xe9e6df, { rough: 0.82, fan: [0, 0, -0.6] });
    box(shell, "shell", [0.16, 1.34, D], [-W / 2, 0.55, 0], 0xe4e0d8, { rough: 0.82, fan: [-0.6, 0, 0] });
    box(shell, "shell", [0.16, 1.34, D], [W / 2, 0.55, 0], 0xe4e0d8, { rough: 0.82, fan: [0.6, 0, 0] });
    box(shell, "shell", [1, 1.34, 0.16], [-W / 2 + 0.5, 0.55, frontZ], 0xe9e6df, { rough: 0.82, fan: shellFan });
    box(shell, "shell", [0.7, 1.34, 0.16], [W / 2 - 0.35, 0.55, frontZ], 0xe9e6df, { rough: 0.82, fan: shellFan });
    box(shell, "shell", [3.7, 0.3, 0.17], [0.15, 1.22, frontZ], 0xe9e6df, { rough: 0.82, fan: shellFan });

    [-1.4, 0, 1.4].forEach((x) =>
      box(shell, "shell", [0.025, 1.28, 0.025], [x, 0.55, -frontZ - 0.09], 0xb4afa5, {
        rough: 0.9,
        fan: [0, 0, -0.6],
        edge: false,
        cast: false,
      }),
    );
    [-1, 0, 1].forEach((z) =>
      box(shell, "shell", [0.025, 1.28, 0.025], [W / 2 + 0.09, 0.55, z], 0xb4afa5, {
        rough: 0.9,
        fan: [0.6, 0, 0],
        edge: false,
        cast: false,
      }),
    );

    function frontWindow(width: number, height: number, x: number, y: number, split = false) {
      box(shell, "shell", [width, height, 0.05], [x, y, frontZ + 0.02], 0x14161a, {
        rough: 0.45,
        metal: 0.25,
        fan: [0, 0, 0.62],
        cast: false,
        edge: false,
      });
      box(shell, "shell", [width - 0.09, height - 0.09, 0.03], [x, y, frontZ + 0.055], 0x0d141b, {
        rough: 0.08,
        metal: 0.5,
        opacity: 0.42,
        envIntensity: 1.3,
        fan: [0, 0, 0.64],
        cast: false,
        edge: false,
      });
      box(shell, "shell", [width - 0.11, height - 0.11, 0.02], [x, y, frontZ - 0.05], 0xffc488, {
        rough: 1,
        emissive: { color: 0xffc488, intensity: 2.8 },
        fan: shellFan,
        cast: false,
        receive: false,
        edge: false,
      });
      box(shell, "shell", [width + 0.05, 0.04, 0.09], [x, y - height / 2, frontZ + 0.05], 0x14161a, {
        rough: 0.4,
        metal: 0.4,
        fan: [0, 0, 0.62],
        cast: false,
        edge: false,
      });
      if (split) {
        box(shell, "shell", [0.035, height - 0.09, 0.05], [x, y, frontZ + 0.06], 0x14161a, {
          rough: 0.4,
          metal: 0.3,
          fan: [0, 0, 0.64],
          cast: false,
          edge: false,
        });
      }
    }

    frontWindow(0.74, 1.06, -1.05, 0.58);
    frontWindow(0.26, 1.06, -0.55, 0.58);
    frontWindow(1.5, 0.98, 0.7, 0.57, true);
    box(shell, "shell", [0.04, 0.5, 0.05], [-0.78, 0.58, frontZ + 0.075], 0x2a2d31, {
      metal: 0.7,
      fan: [0, 0, 0.66],
      cast: false,
      edge: false,
    });

    const deckColor = 0xb9a17b;
    box(shell, "shell", [2.8, 0.1, 1.6], [-0.1, -0.07, frontZ + 0.78], deckColor, { fan: [0, 0, 0.72] });
    for (let i = 0; i < 6; i += 1) {
      box(shell, "shell", [2.8, 0.012, 0.02], [-0.1, -0.018, frontZ + 0.18 + i * 0.24], 0x8a7553, {
        fan: [0, 0, 0.72],
        cast: false,
        edge: false,
      });
    }
    const railZ = frontZ + 1.5;
    [
      [0.04, 0.06], [0.27, 0.05], [0.5, 0.07],
    ].forEach(([y, height]) =>
      box(shell, "shell", [3.4, height, 0.07], [0, y, railZ], deckColor, {
        fan: [0, 0, 0.78],
        cast: false,
        edge: false,
      }),
    );
    for (let i = 0; i < 8; i += 1) {
      box(shell, "shell", [0.06, 0.46, 0.06], [-1.6 + i * 0.457, 0.27, railZ], deckColor, {
        fan: [0, 0, 0.78],
        cast: false,
        edge: false,
      });
    }
    box(shell, "shell", [1.5, 0.09, 0.42], [-1, -0.2, frontZ + 1.55], deckColor, {
      fan: [0, 0, 0.74],
      edge: false,
    });
    box(shell, "shell", [0.06, 1.46, 0.06], [W / 2 + 0.04, 0.46, frontZ - 0.1], 0x1a1c1f, {
      metal: 0.6,
      fan: [0.55, 0, 0.25],
      cast: false,
      edge: false,
    });
    [-W / 2 + 0.06, W / 2 - 0.06].forEach((x) =>
      box(shell, "shell", [0.08, 0.18, 0.07], [x, 0.72, frontZ - 0.15], 0x1a1410, {
        emissive: { color: 0xffb060, intensity: 1.6 },
        fan: [0, 0, 0.5],
        edge: false,
      }),
    );

    const roof = layer("roof");
    const roofSlab = box(roof, "roof", [W + 0.9, 0.12, D + 1], [0, 0.1, 0], 0x202225, {
      rough: 0.62,
      metal: 0.25,
      envIntensity: 0.7,
    });
    roofSlab.rotation.x = SLOPE;
    for (let i = 0; i < 8; i += 1) {
      const seam = box(roof, "roof", [0.035, 0.05, D + 1], [-2.45 + i * 0.7, 0.17, 0], 0x2b2e33, {
        rough: 0.5,
        metal: 0.35,
        cast: false,
        edge: false,
      });
      seam.rotation.x = SLOPE;
    }
    [
      { size: [W + 0.94, 0.18, 0.1] as [number, number, number], y: 0, z: frontZ + 0.5, color: 0x141414 },
      { size: [W + 0.82, 0.03, 0.55] as [number, number, number], y: 0, z: frontZ + 0.26, color: 0xddd9d0 },
      { size: [W + 0.9, 0.06, 0.08] as [number, number, number], y: -0.07, z: frontZ + 0.52, color: 0x1a1c1f },
    ].forEach(({ size, y, z, color }) => {
      const trim = box(roof, "roof", size, [0, y, z], color, { metal: 0.3, edge: false });
      trim.rotation.x = SLOPE;
    });

    for (let column = 0; column < 4; column += 1) {
      for (let row = 0; row < 3; row += 1) {
        siteMesh(new THREE.BoxGeometry(1.2, 0.05, 0.55), [-1.89 + column * 1.26, -0.035, 3.6 + row * 0.62], 0x938f87, {
          rough: 0.9,
          cast: false,
        });
      }
    }
    [[-2.7, 4.6], [-3.4, 5.05], [-4.05, 5.45]].forEach(([x, z]) =>
      siteMesh(new THREE.BoxGeometry(0.7, 0.05, 0.6), [x, -0.035, z], 0x8c877f, { rough: 0.92, cast: false }),
    );
    siteMesh(new THREE.BoxGeometry(0.9, 0.04, 3.8), [-3.05, -0.05, 0], 0x6b4b36, { rough: 1, cast: false });
    siteMesh(new THREE.BoxGeometry(2.2, 0.04, 0.9), [2.3, -0.05, 3.8], 0x6b4b36, { rough: 1, cast: false });

    [
      [-3.05, -1.3, 0.34], [-3.05, -0.3, 0.3], [-3.05, 0.8, 0.36],
      [-3.05, 1.7, 0.3], [2, 3.8, 0.34], [2.9, 3.95, 0.28],
    ].forEach(([x, z, radius]) => {
      const shrub = siteMesh(new THREE.IcosahedronGeometry(radius, 1), [x, radius * 0.6 - 0.04, z], 0x4f6141, { rough: 0.95, cast: false });
      shrub.scale.set(1, 0.72, 1);
    });

    [[-2.25, 3.25], [2.35, 3.35], [-1.95, 4.7]].forEach(([centerX, centerZ], cluster) => {
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2 + cluster * 0.43;
        const blade = siteMesh(
          new THREE.ConeGeometry(0.035, 0.62 + (i % 3) * 0.08, 5),
          [centerX + Math.cos(angle) * 0.13, 0.27, centerZ + Math.sin(angle) * 0.13],
          0x7a8754,
          { rough: 0.9, cast: false },
        );
        blade.rotation.set((i % 2 ? 1 : -1) * 0.14, angle, (i % 3 - 1) * 0.12);
      }
    });

    function tree(x: number, z: number, trunkHeight: number, canopyRadius: number, canopyY: number) {
      siteMesh(new THREE.CylinderGeometry(0.06, 0.085, trunkHeight, 8), [x, trunkHeight / 2 - 0.04, z], 0x4a3826);
      const canopy = siteMesh(new THREE.IcosahedronGeometry(canopyRadius, 1), [x, canopyY, z], 0x41523a, { rough: 0.95 });
      canopy.scale.set(1, 0.92, 1);
    }
    tree(-3.7, -2.1, 1.7, 0.9, 1.96);
    tree(3.9, 1.1, 1.15, 0.62, 1.31);

    [[-2.6, 3.85], [-3.35, 4.85], [2.55, 3.9]].forEach(([x, z]) =>
      siteMesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), [x, 0.06, z], 0x2a2012, {
        emissive: { color: 0xc8922a, intensity: 0.45 },
        cast: false,
      }),
    );
    const uplight = new THREE.PointLight(0xffe1b8, 0.3, 6.5, 2);
    uplight.position.set(-3.7, 0.4, -2);
    scene.add(uplight);

    function addLabel(id: LayerId, title: string, detail: string, position: [number, number, number]) {
      const texture = createLabelTexture(title, detail, id === "roof" ? "#2f4a38" : "#8c5b3f");
      if (!texture) return;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthTest: false })) as LabelSprite;
      sprite.scale.set(2.5, 0.59, 1);
      sprite.position.set(...position);
      sprite.userData = { layer: id };
      root.add(sprite);
      labels.push(sprite);
    }
    addLabel("foundation", "Foundation", "slab / bearing", [3.3, 0.3, 0.6]);
    addLabel("structure", "Structure", "framing / rafters", [-3.5, 1, 0.7]);
    addLabel("roof", "Finished value", "rentable asset", [3.2, 3.7, -0.2]);

    let displayProgress = progressRef.current;
    let frame = 0;
    let disposed = false;
    let firstFrame = true;
    let visible = true;

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      viewportProfile = getSceneViewportProfile(width);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, viewportProfile.maxPixelRatio));
      renderer.shadowMap.enabled = viewportProfile.shadows;
      renderer.setSize(width, height, false);
      composer?.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      root.scale.setScalar(viewportProfile.rootScale);
      root.position.set(0, viewportProfile.rootY, 0);
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      renderer.domElement.style.opacity = "0";
      host.dataset.rendererState = "lost";
    };
    const onContextRestored = () => {
      renderer.domElement.style.opacity = "1";
      host.dataset.rendererState = "ready";
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    const renderFrame = () => {
      if (disposed || !visible) {
        frame = 0;
        return;
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      displayProgress = lerp(displayProgress, progressRef.current, reduceMotion ? 1 : 0.12);
      const exploded = smoothstep(displayProgress);

      layerGroups.forEach((group, id) => {
        const definition = LAYERS[id];
        group.position.y = lerp(definition.base, definition.base + definition.explode, exploded);
      });
      parts.forEach((part) => {
        part.position.set(
          part.userData.base.x + part.userData.fan[0] * exploded,
          part.userData.base.y + part.userData.fan[1] * exploded,
          part.userData.base.z + part.userData.fan[2] * exploded,
        );
      });
      const edgeOpacity = Math.sin(Math.PI * Math.min(exploded, 1)) * 0.765;
      edges.forEach((edge) => {
        edge.material.opacity = edgeOpacity;
      });

      const labelStarts: Partial<Record<LayerId, number>> = { foundation: 0.22, structure: 0.46, roof: 0.74 };
      labels.forEach((label) => {
        const start = labelStarts[label.userData.layer] ?? 0.3;
        label.material.opacity = THREE.MathUtils.clamp((displayProgress - start) / 0.16, 0, 1);
      });

      const azimuth = lerp(0.6, 0.9, exploded);
      const radius = lerp(viewportProfile.cameraRadius[0], viewportProfile.cameraRadius[1], exploded);
      const height = lerp(viewportProfile.cameraHeight[0], viewportProfile.cameraHeight[1], exploded);
      const idle = reduceMotion ? 0 : Math.sin(performance.now() * 0.00018) * 0.05 * (1 - exploded);
      camera.position.set(
        Math.sin(azimuth + idle) * radius,
        height,
        Math.cos(azimuth + idle) * radius,
      );
      camera.lookAt(
        0,
        lerp(viewportProfile.cameraTargetY[0], viewportProfile.cameraTargetY[1], exploded),
        0.4,
      );
      emberLight.intensity = reduceMotion ? 0.7 : 0.7 + Math.sin(performance.now() * 0.0021) * 0.08;

      if (composer && !viewportProfile.mobile) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      if (firstFrame) {
        renderer.domElement.style.opacity = "1";
        host.dataset.rendererState = "ready";
        firstFrame = false;
      }
      frame = window.requestAnimationFrame(renderFrame);
    };

    resize();
    window.addEventListener("resize", resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      const wasVisible = visible;
      visible = entry.isIntersecting;
      if (visible && !wasVisible && !frame) {
        frame = window.requestAnimationFrame(renderFrame);
      }
    }, { rootMargin: "200px" });
    visibilityObserver.observe(host);
    frame = window.requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      visibilityObserver.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      groundTexture.dispose();
      environment.dispose();
      environmentScene.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="blueprint-scene"
      data-renderer-state="fallback"
      data-scene-palette={HERO_SCENE_PALETTE.mode}
      className="relative h-full w-full overflow-hidden bg-lf-sand-2"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(100%_80%_at_78%_8%,rgba(200,146,42,0.14),transparent_46%),radial-gradient(90%_80%_at_12%_90%,rgba(47,74,56,0.12),transparent_50%),linear-gradient(160deg,#f8f0e4_0%,#f2e5d5_52%,#eadfce_100%)]"
      >
        <svg viewBox="0 0 800 500" className="h-full w-full opacity-45" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="#2f4a38" strokeWidth="1">
            {Array.from({ length: 15 }, (_, index) => (
              <path key={`v-${index}`} d={`M ${120 + index * 40} 130 L ${40 + index * 42} 450`} opacity="0.2" />
            ))}
            {Array.from({ length: 9 }, (_, index) => (
              <path key={`h-${index}`} d={`M 70 ${180 + index * 32} L 730 ${180 + index * 32}`} opacity="0.18" />
            ))}
            <path d="M235 335 L280 205 L585 190 L650 318 Z" stroke="#8c5b3f" opacity="0.75" />
            <path d="M280 205 L365 140 L660 188 L585 190" stroke="#261307" opacity="0.55" />
          </g>
        </svg>
      </div>
    </div>
  );
}
