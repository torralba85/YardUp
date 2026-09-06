import { Vector3 } from "three";
import type { LocalBounds } from "./scene-model";

export type SceneView = "overview" | "adu" | "setbacks";
export interface CameraFitParams {
  bounds: LocalBounds;
  fov: number;
  viewportWidth: number;
  viewportHeight: number;
  insets: { top: number; right: number; bottom: number; left: number };
  mode: SceneView;
}
/** All eight corners, including roof height, overhang, and rotation bounds. */
export function boundsCorners(b: LocalBounds): Vector3[] {
  return [b.minX, b.maxX].flatMap(x => [b.minY, b.maxY].flatMap(y => [b.minZ, b.maxZ].map(z => new Vector3(x,y,z))));
}

/** Gemini T05 extraction, corrected to include per-corner depth and asymmetric insets. */
export function calculateCameraFit({ bounds, fov, viewportWidth: W, viewportHeight: H, insets, mode }: CameraFitParams) {
  if (![...Object.values(bounds), W, H, fov, ...Object.values(insets)].every(Number.isFinite) ||
    W <= 0 || H <= 0 || fov <= 0 || fov >= 170 || Object.values(insets).some(v => v < 0) ||
    bounds.maxX < bounds.minX || bounds.maxY < bounds.minY || bounds.maxZ < bounds.minZ) return null;
  const availableW = W - insets.left - insets.right;
  const availableH = H - insets.top - insets.bottom;
  if (availableW <= 1 || availableH <= 1) return null;
  const pad = Math.min(16, availableW * 0.06, availableH * 0.06);
  const left = -1 + 2 * (insets.left + pad) / W;
  const rightEdge = 1 - 2 * (insets.right + pad) / W;
  const bottom = -1 + 2 * (insets.bottom + pad) / H;
  const top = 1 - 2 * (insets.top + pad) / H;
  const cx = (left + rightEdge) / 2, cy = (bottom + top) / 2;
  const hx = (rightEdge - left) / 2, hy = (top - bottom) / 2;
  const plan = mode === "setbacks";
  const direction = plan ? new Vector3(0,1,0) : new Vector3(1,1.15,1).normalize();
  const right = plan ? new Vector3(1,0,0) : new Vector3().crossVectors(new Vector3(0,1,0), direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const center = new Vector3((bounds.minX+bounds.maxX)/2, (bounds.minY+bounds.maxY)/2, (bounds.minZ+bounds.maxZ)/2);
  const points = boundsCorners(bounds).map(c => {
    c.sub(center); return { x: c.dot(right), y: c.dot(up), depth: c.dot(direction) };
  });
  const diagonal = Math.max(1, Math.hypot(bounds.maxX-bounds.minX, bounds.maxY-bounds.minY, bounds.maxZ-bounds.minZ));
  const ty = Math.tan(fov * Math.PI / 360), tx = ty * W/H;
  let distance = diagonal + 1, zoom = 1;
  let shiftX: number, shiftY: number;
  if (plan) {
    const spanX = Math.max(1, ...points.map(p => Math.abs(p.x)*2));
    const spanY = Math.max(1, ...points.map(p => Math.abs(p.y)*2));
    zoom = Math.min(W*hx/spanX, H*hy/spanY);
    shiftX = cx * W / (2*zoom); shiftY = cy * H / (2*zoom);
  } else {
    distance = Math.max(1, ...points.flatMap(p => [
      p.depth + 1,
      (p.x/tx + rightEdge*p.depth)/hx, (-p.x/tx - left*p.depth)/hx,
      (p.y/ty + top*p.depth)/hy, (-p.y/ty - bottom*p.depth)/hy,
    ]));
    shiftX = cx*distance*tx; shiftY = cy*distance*ty;
  }
  const target = center.clone().addScaledVector(right,-shiftX).addScaledVector(up,-shiftY);
  const position = target.clone().addScaledVector(direction,distance);
  return {
    target: target.toArray() as [number,number,number], position: position.toArray() as [number,number,number],
    up: up.toArray() as [number,number,number], zoom, isOrthographic: plan,
    near: 0.1, far: Math.max(500, distance*6 + diagonal),
    minDistance: Math.max(1, diagonal*0.1), maxDistance: distance*4,
    feetPerPixel: plan ? 1/zoom : 2*distance*ty/H,
  };
}
