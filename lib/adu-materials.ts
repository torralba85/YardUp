import * as THREE from "three";
import { finishColors, type ExteriorFinish } from "@/lib/feasibility";

export interface ProceduralTextures {
  baseColor: Uint8Array<ArrayBuffer>;
  normal: Uint8Array<ArrayBuffer>;
  roughness: Uint8Array<ArrayBuffer>;
}

/**
 * Tile resolution in texels. Paired with `TEXTURE_TILE_SIZE_FT` (4 ft) in
 * `adu-mesh-data.ts` this gives 128 texels per foot of wall, consistent across
 * every finish and every ADU size. Start here and profile before adding larger
 * maps (D7).
 */
const DIM = 512;
const cache = new Map<ExteriorFinish, ProceduralTextures>();
let cachedRoofTextures: { normal: Uint8Array<ArrayBuffer>; roughness: Uint8Array<ArrayBuffer> } | null = null;

function parseHex(hex: string): [number, number, number] {
  const num = parseInt(hex.replace("#", ""), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Deterministic procedural cladding tiles: sRGB base color plus non-color
 * normal and roughness data. Siding direction follows the finish — cedar and
 * lap run horizontally, board-and-batten runs vertically. Cached per finish so
 * repeated mounts reuse one CPU buffer set.
 */
export function generateFinishTextures(finish: ExteriorFinish): ProceduralTextures {
  const hit = cache.get(finish);
  if (hit) return hit;

  const total = DIM * DIM;
  const base = new Uint8Array(total * 4);
  const norm = new Uint8Array(total * 4);
  const rough = new Uint8Array(total * 4);
  const height = new Float32Array(total);
  const [br, bg, bb] = parseHex(finishColors[finish]);

  for (let y = 0; y < DIM; y++) {
    for (let x = 0; x < DIM; x++) {
      const i = y * DIM + x;
      let h = 0.5;
      let shade = 1.0;
      let rVal = 180;

      if (finish === "cedar") {
        const py = y % 64;
        const isSeam = py < 3 || py > 61;
        const grain = Math.sin(x * 0.1 + Math.cos(y * 0.15) * 2.0) * 0.05;
        h = isSeam ? 0.2 : 0.5 + grain;
        shade = isSeam ? 0.68 : 1.0 + grain * 0.8;
        rVal = isSeam ? 215 : 145;
      } else if (finish === "lap") {
        const py = y % 64;
        const isLap = py < 4;
        h = isLap ? 0.1 : (py / 64) * 0.35;
        shade = isLap ? 0.72 : 0.95 + (py / 64) * 0.1;
        rVal = isLap ? 210 : 190;
      } else if (finish === "stucco") {
        const n = Math.sin(x * 0.3) * Math.cos(y * 0.3) + Math.sin(x * 0.8 + y * 0.8) * 0.5;
        h = 0.5 + n * 0.15;
        shade = 0.94 + n * 0.06;
        rVal = 220;
      } else {
        const px = x % 128;
        const isBat = px < 16;
        h = isBat ? 0.75 : 0.4;
        shade = isBat ? 1.08 : 0.96;
        rVal = isBat ? 150 : 175;
      }

      height[i] = h;
      const p = i * 4;
      base[p] = Math.min(255, Math.max(0, Math.round(br * shade)));
      base[p + 1] = Math.min(255, Math.max(0, Math.round(bg * shade)));
      base[p + 2] = Math.min(255, Math.max(0, Math.round(bb * shade)));
      base[p + 3] = 255;

      rough[p] = rVal;
      rough[p + 1] = rVal;
      rough[p + 2] = rVal;
      rough[p + 3] = 255;
    }
  }

  for (let y = 0; y < DIM; y++) {
    const y0 = (y - 1 + DIM) % DIM;
    const y1 = (y + 1) % DIM;
    for (let x = 0; x < DIM; x++) {
      const x0 = (x - 1 + DIM) % DIM;
      const x1 = (x + 1) % DIM;
      const dx = (height[y * DIM + x1] - height[y * DIM + x0]) * 3.5;
      const dy = (height[y1 * DIM + x] - height[y0 * DIM + x]) * 3.5;
      const len = Math.hypot(dx, dy, 1.0);
      const p = (y * DIM + x) * 4;
      norm[p] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      norm[p + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      norm[p + 2] = Math.round(((1.0 / len) * 0.5 + 0.5) * 255);
      norm[p + 3] = 255;
    }
  }

  const res = { baseColor: base, normal: norm, roughness: rough };
  cache.set(finish, res);
  return res;
}

export function createDataTexture(data: Uint8Array<ArrayBuffer>, colorSpace: THREE.ColorSpace = THREE.NoColorSpace): THREE.DataTexture {
  const t = new THREE.DataTexture(data, DIM, DIM, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.colorSpace = colorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Deterministic standing-seam architectural metal roof normal + roughness maps.
 * Ribs run along the slope axis (every 64 texels = 6 inches at 4 ft tile scale)
 * with subtle micro-grain between standing seams.
 */
export function generateRoofTextures(): { normal: Uint8Array<ArrayBuffer>; roughness: Uint8Array<ArrayBuffer> } {
  if (cachedRoofTextures) return cachedRoofTextures;

  const total = DIM * DIM;
  const norm = new Uint8Array(total * 4);
  const rough = new Uint8Array(total * 4);
  const height = new Float32Array(total);

  for (let y = 0; y < DIM; y++) {
    for (let x = 0; x < DIM; x++) {
      const i = y * DIM + x;
      const px = x % 64;
      const isRib = px < 6;
      const ribProfile = isRib ? Math.sin((px / 6) * Math.PI) * 0.45 : 0;
      const micro = Math.sin(x * 0.25 + y * 0.15) * 0.015;
      height[i] = 0.5 + ribProfile + micro;

      const rVal = isRib ? 128 : 168;
      const p = i * 4;
      rough[p] = rVal;
      rough[p + 1] = rVal;
      rough[p + 2] = rVal;
      rough[p + 3] = 255;
    }
  }

  for (let y = 0; y < DIM; y++) {
    const y0 = (y - 1 + DIM) % DIM;
    const y1 = (y + 1) % DIM;
    for (let x = 0; x < DIM; x++) {
      const x0 = (x - 1 + DIM) % DIM;
      const x1 = (x + 1) % DIM;
      const dx = (height[y * DIM + x1] - height[y * DIM + x0]) * 3.0;
      const dy = (height[y1 * DIM + x] - height[y0 * DIM + x]) * 3.0;
      const len = Math.hypot(dx, dy, 1.0);
      const p = (y * DIM + x) * 4;
      norm[p] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      norm[p + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      norm[p + 2] = Math.round(((1.0 / len) * 0.5 + 0.5) * 255);
      norm[p + 3] = 255;
    }
  }

  cachedRoofTextures = { normal: norm, roughness: rough };
  return cachedRoofTextures;
}

export function createAduMaterial(finish: ExteriorFinish): THREE.MeshStandardMaterial {
  const tex = generateFinishTextures(finish);
  return new THREE.MeshStandardMaterial({
    map: createDataTexture(tex.baseColor, THREE.SRGBColorSpace),
    normalMap: createDataTexture(tex.normal, THREE.NoColorSpace),
    roughnessMap: createDataTexture(tex.roughness, THREE.NoColorSpace),
    roughness: 1.0,
    metalness: 0.05,
  });
}

export function createRoofMaterial(): THREE.MeshStandardMaterial {
  const tex = generateRoofTextures();
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#373a3c"),
    normalMap: createDataTexture(tex.normal, THREE.NoColorSpace),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: createDataTexture(tex.roughness, THREE.NoColorSpace),
    roughness: 0.65,
    metalness: 0.22,
  });
}

export function createDoorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color("#2c3437"), roughness: 0.5, metalness: 0.1 });
}

/**
 * Glazing reads as glass rather than dark metal: partially transparent so the
 * opening has depth, with restrained specular response instead of the opaque
 * metallic panel the audit flagged (D7). The scene carries no environment map,
 * so reflections come from the scene lights alone — this is an illustrative
 * material, not a measured glazing spec.
 */
export function createWindowGlassMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#26333d"),
    roughness: 0.18,
    metalness: 0.25,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 0.6,
  });
}

export function createTrimMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color("#dedad2"), roughness: 0.4, metalness: 0.05 });
}

export function disposeMaterial(mat: THREE.Material | THREE.Material[] | null | undefined): void {
  if (!mat) return;
  if (Array.isArray(mat)) {
    mat.forEach(disposeMaterial);
    return;
  }
  if ("map" in mat && mat.map instanceof THREE.Texture) mat.map.dispose();
  if ("normalMap" in mat && mat.normalMap instanceof THREE.Texture) mat.normalMap.dispose();
  if ("roughnessMap" in mat && mat.roughnessMap instanceof THREE.Texture) mat.roughnessMap.dispose();
  mat.dispose();
}
