import type { ADUConfig, Parcel } from "./feasibility";
import { buildExistingHouseSceneModel, type Pose2D } from "./scene-model";
import { buildSetbackEnvelope, validatePlacement } from "./placement-validation";

export function getScenePlacement(parcel: Parcel, config: Pick<ADUConfig, "width" | "length">, pose: Pose2D) {
  return validatePlacement({ aduWidth: config.width, aduLength: config.length, pose,
    envelope: buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, parcel.setbacks),
    existingHouseCorners: buildExistingHouseSceneModel(parcel).corners });
}

export function getDefaultAduPose(parcel: Parcel, config: Pick<ADUConfig, "width" | "length">): Pose2D {
  const bounds = getAduPlacementBounds(parcel, config);
  return { x: 0, z: Math.min(bounds.minZ + 3, bounds.maxZ), rotationDeg: 0 };
}

export interface SiteFitCapacityStatus {
  title: string;
  action: string;
  tone: "ok" | "warn";
}

export interface AduPlacementBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Center-point bounds that keep an ADU footprint inside the drawn setbacks. */
export function getAduPlacementBounds(
  parcel: Parcel,
  config: Pick<ADUConfig, "width" | "length">,
): AduPlacementBounds {
  const rawMinX = -parcel.lotWidth / 2 + parcel.setbacks.side + config.width / 2;
  const rawMaxX = parcel.lotWidth / 2 - parcel.setbacks.side - config.width / 2;
  const rawMinZ = -parcel.lotLength / 2 + parcel.setbacks.rear + config.length / 2;
  const rawMaxZ = parcel.lotLength / 2 - parcel.setbacks.front - config.length / 2;

  const xMidpoint = (rawMinX + rawMaxX) / 2;
  const zMidpoint = (rawMinZ + rawMaxZ) / 2;

  return {
    minX: rawMinX <= rawMaxX ? rawMinX : xMidpoint,
    maxX: rawMinX <= rawMaxX ? rawMaxX : xMidpoint,
    minZ: rawMinZ <= rawMaxZ ? rawMinZ : zMidpoint,
    maxZ: rawMinZ <= rawMaxZ ? rawMaxZ : zMidpoint,
  };
}

/** Human-readable modeled coverage capacity for the Studio and certificate. */
export function getSiteFitCapacityStatus(
  remainingCapacity: number,
): SiteFitCapacityStatus {
  const squareFeet = Math.round(Math.abs(remainingCapacity)).toLocaleString();

  if (remainingCapacity < 0) {
    return {
      title: `${squareFeet} sf over modeled coverage allowance`,
      action: `Reduce the ADU footprint by at least ${squareFeet} sf, then confirm local requirements.`,
      tone: "warn",
    };
  }

  return {
    title: `${squareFeet} sf of modeled coverage remains`,
    action: "Confirm utilities, access, and local requirements before proceeding.",
    tone: "ok",
  };
}
