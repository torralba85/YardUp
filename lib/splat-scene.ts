/** Visual registration only. Never an input to feasibility or parcel geometry. */
export interface SplatTransform {
  positionFt: [number, number, number];
  yawRad: number;
  uniformScale: number;
}

export const DEFAULT_SPLAT_TRANSFORM: SplatTransform = {
  positionFt: [0, 0, 0], yawRad: 0, uniformScale: 1,
};

export function isValidSplatTransform(value: SplatTransform): boolean {
  return value.positionFt.length === 3 && value.positionFt.every(Number.isFinite)
    && Number.isFinite(value.yawRad) && Number.isFinite(value.uniformScale)
    && value.uniformScale > 0;
}

export interface SplatSource {
  fileName: string;
  bytes?: Uint8Array;
  url?: string;
  /** Fit an arbitrary sample to the workbench, without claiming real-world scale. */
  normalizeForInspection: boolean;
}

export interface SplatSceneDefinition {
  id: string;
  parcelId: string;
  assetUrl: string;
  transform: SplatTransform;
  format: "spz" | "splat" | "ply" | "ksplat";
  approximateBytes?: number;
  captureLabel: string;
  /** Unmatched samples must never be described as captures of the selected parcel. */
  registration?: "unmatched-sample" | "visually-aligned";
  numSplats?: number;
}

export const MAX_LOCAL_SPLAT_BYTES = 32 * 1024 * 1024;
/** Conservative renderer budget until full-size scans are profiled on devices. */
export const MAX_WORKBENCH_SPLATS = 100_000;

export function validateLocalSplat(file: { name: string; size: number }): string | null {
  if (!/\.(spz|splat|ply|ksplat)$/i.test(file.name)) return "Choose an SPZ, SPLAT, PLY or KSPLAT file.";
  if (file.size <= 0 || file.size > MAX_LOCAL_SPLAT_BYTES) return "Choose a non-empty scan no larger than 32 MiB for this workbench.";
  return null;
}

/** Original deterministic fixture: blue splat wall, 44 ft wide and 18 ft high.
 * Standard .splat records: xyz, scale xyz, RGBA, quaternion wxyz (32 bytes).
 * Synthetic test data; not a captured property or a feasibility input.
 */
export function createSplatDepthFixture(): SplatSource & { bytes: Uint8Array } {
  const columns = 111;
  const rows = 46;
  const bytes = new Uint8Array(columns * rows * 32);
  const view = new DataView(bytes.buffer);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const offset = (row * columns + column) * 32;
      [-22 + column * 0.4, row * 0.4, 0, 0.28, 0.28, 0.08].forEach((value, index) => {
        view.setFloat32(offset + index * 4, value, true);
      });
      bytes.set([55, 110, 160, 245, 255, 128, 128, 128], offset + 24);
    }
  }
  return { fileName: "synthetic-depth-wall.splat", bytes, normalizeForInspection: false };
}
