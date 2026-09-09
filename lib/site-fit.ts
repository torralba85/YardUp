import type { ADUConfig, Parcel } from "./feasibility";
import { buildExistingHouseSceneModel, type Pose2D } from "./scene-model";
import { buildSetbackEnvelope, validatePlacement } from "./placement-validation";
import { parcelConfidence } from "./parcel-confidence";

export function getScenePlacement(parcel: Parcel, config: Pick<ADUConfig, "width" | "length">, pose: Pose2D) {
  return validatePlacement({ aduWidth: config.width, aduLength: config.length, pose,
    envelope: buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, parcel.setbacks),
    existingHouseCorners: buildExistingHouseSceneModel(parcel).corners });
}

/** Feet of breathing room left between the ADU and the existing structure when choosing a starting position. */
const DEFAULT_POSE_CLEARANCE_FT = 3;

/**
 * A starting ADU position: rear-biased, but stepped clear of the existing
 * house when that house's footprint is known.
 *
 * The old rear-biased default was only ever workable because the renderer drew
 * a house far smaller than the recorded area (D1). Now that the modeled house
 * carries its real footprint, a blind rear placement can start the ADU inside
 * it. This tries the rear position first, then the gap behind the house, then
 * the gap in front, and takes the first that sits inside the setback envelope
 * and clears the house.
 *
 * When nothing clears — a genuinely full lot — it returns the rear-biased
 * position anyway rather than inventing room. Placement validation then reports
 * the overlap honestly, which is the intended outcome: a starting position is a
 * convenience, not a claim that the ADU fits.
 */
export function getDefaultAduPose(parcel: Parcel, config: Pick<ADUConfig, "width" | "length">): Pose2D {
  const bounds = getAduPlacementBounds(parcel, config);
  const rearBiased = Math.min(bounds.minZ + 3, bounds.maxZ);
  const house = buildExistingHouseSceneModel(parcel).boundsLocal;
  const halfLength = config.length / 2;
  if (!house || !Number.isFinite(halfLength)) return { x: 0, z: rearBiased, rotationDeg: 0 };

  const clearsHouse = (z: number) =>
    z + halfLength <= house.minZ - DEFAULT_POSE_CLEARANCE_FT ||
    z - halfLength >= house.maxZ + DEFAULT_POSE_CLEARANCE_FT;
  const inEnvelope = (z: number) => z >= bounds.minZ && z <= bounds.maxZ;

  const candidates = [
    rearBiased,
    house.minZ - DEFAULT_POSE_CLEARANCE_FT - halfLength,
    house.maxZ + DEFAULT_POSE_CLEARANCE_FT + halfLength,
  ];
  const clear = candidates.find((z) => inEnvelope(z) && clearsHouse(z));
  return { x: 0, z: clear ?? rearBiased, rotationDeg: 0 };
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
  parcel?: Parcel,
): SiteFitCapacityStatus {
  const confidence = parcel ? parcelConfidence(parcel) : undefined;
  if (confidence?.footprintKnown === false) {
    return { title: "Coverage capacity unknown", action: "Confirm the existing building footprint before calculating remaining capacity.", tone: "warn" };
  }
  if (confidence?.regulationsEstimated) {
    return { title: `${Math.round(remainingCapacity).toLocaleString()} sf estimated coverage capacity`, action: "Maximum coverage and setbacks are assumed. Confirm local planning rules.", tone: "warn" };
  }
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
