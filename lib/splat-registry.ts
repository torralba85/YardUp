import { type SplatSceneDefinition } from "./splat-scene";

/**
 * Curated registry mapping demo parcels to 3D Gaussian Splatting photoreal scans.
 *
 * Invariants:
 * 1. Feasibility and scene-model calculations remain authoritative (splats provide photoreal visual context only).
 * 2. Scans are explicit lot-local coordinates calibrated to feet (never an inferred survey truth).
 * 3. Parcels without a registry entry do not expose Photoreal Scan mode.
 */
export const CURATED_SPLAT_SCENES: Record<string, SplatSceneDefinition> = {
  "oak-street": {
    id: "oak-street-curated",
    parcelId: "oak-street",
    assetUrl: "/scans/oak-street-curated.spz",
    format: "spz",
    approximateBytes: 1_195_800,
    numSplats: 49_140,
    captureLabel: "Sample scan — not a capture of this property",
    registration: "unmatched-sample",
    transform: {
      positionFt: [0, 0, 15],
      yawRad: 0,
      uniformScale: 1,
    },
  },
};

/** Look up a curated scan definition by parcel id. Returns null if not registered. */
export function getSplatSceneForParcel(parcelId?: string | null): SplatSceneDefinition | null {
  if (!parcelId) return null;
  return Object.hasOwn(CURATED_SPLAT_SCENES, parcelId) ? CURATED_SPLAT_SCENES[parcelId] : null;
}

/** Returns whether a parcel has a registered photoreal scan. */
export function hasSplatSceneForParcel(parcelId?: string | null): boolean {
  return Boolean(getSplatSceneForParcel(parcelId));
}

/** List all parcel IDs with registered photoreal scans. */
export function getRegisteredSplatParcelIds(): string[] {
  return Object.keys(CURATED_SPLAT_SCENES);
}
