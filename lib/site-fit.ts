import type { ADUConfig, Parcel } from "./feasibility";
import {
  buildAduHeightModel,
  buildExistingHouseSceneModel,
  EXISTING_HOUSE_ROOF_OVERHANG_FT,
  type Pose2D,
} from "./scene-model";
import { buildSetbackEnvelope, REVIEW_SEPARATION_FT, validatePlacement, type PlacementResult } from "./placement-validation";
import { parcelConfidence } from "./parcel-confidence";

/** Validates a pose against the parcel's setbacks and modeled house. Pass `height` and `roof` to also measure the roof-edge gap. */
export function getScenePlacement(
  parcel: Parcel,
  config: Pick<ADUConfig, "width" | "length"> & Partial<Pick<ADUConfig, "height" | "roof">>,
  pose: Pose2D,
) {
  const heightModel =
    config.height !== undefined && config.roof !== undefined
      ? buildAduHeightModel({ width: config.width, length: config.length, height: config.height, roof: config.roof })
      : null;
  return validatePlacement({ aduWidth: config.width, aduLength: config.length, pose,
    envelope: buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, parcel.setbacks),
    existingHouseCorners: buildExistingHouseSceneModel(parcel).corners,
    ...(heightModel && {
      aduRoofOverhangFt: heightModel.roofGeometry.overhangFt,
      existingHouseRoofOverhangFt: EXISTING_HOUSE_ROOF_OVERHANG_FT,
    }) });
}

/** How far a starting ADU sits in from the rear setback line when the yard has room to spare. */
const REAR_SETBACK_OFFSET_FT = 3;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * A starting ADU position with as much room from the existing house as the
 * lot allows.
 *
 * The modeled house carries its full recorded footprint (D1), so on narrow
 * lots a blind rear placement lands a few feet from it, or inside it. This
 * searches both orientations (the ADU as entered and turned 90°), behind and
 * beside the house, and keeps only positions inside the setback envelope. It
 * prefers the first that clears the house by {@link REVIEW_SEPARATION_FT},
 * favoring the entered orientation and a centered position, and keeps up to
 * 3 ft of rear-yard margin when that doesn't cost separation. If none reach
 * that distance, it takes the position with the most room.
 *
 * It never enlarges the lot or shrinks the house to make room. When nothing
 * fits the envelope at all — a genuinely full lot — it returns the rear-biased
 * position and placement validation reports the conflict: a starting position
 * is a convenience, not a claim that the ADU fits.
 */
export function getDefaultAduPose(parcel: Parcel, config: Pick<ADUConfig, "width" | "length">): Pose2D {
  const bounds = getAduPlacementBounds(parcel, config);
  const rearBiased: Pose2D = { x: 0, z: Math.min(bounds.minZ + REAR_SETBACK_OFFSET_FT, bounds.maxZ), rotationDeg: 0 };
  const houseModel = buildExistingHouseSceneModel(parcel);
  const house = houseModel.boundsLocal;
  if (!house || !Number.isFinite(config.width) || !Number.isFinite(config.length)) return rearBiased;

  const envelope = buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, parcel.setbacks);
  const candidates: { pose: Pose2D; placement: PlacementResult }[] = [];
  for (const rotationDeg of [0, 90]) {
    const turned = rotationDeg === 90;
    const span = { width: turned ? config.length : config.width, length: turned ? config.width : config.length };
    const b = getAduPlacementBounds(parcel, span);
    const xs = [clamp(0, b.minX, b.maxX), b.minX, b.maxX];
    const behindHouse = house.minZ - REVIEW_SEPARATION_FT - span.length / 2;
    const zs = [
      clamp(Math.min(b.minZ + REAR_SETBACK_OFFSET_FT, behindHouse), b.minZ, b.maxZ),
      b.minZ,
      clamp((house.minZ + house.maxZ) / 2, b.minZ, b.maxZ),
    ];
    for (const z of zs) {
      for (const x of xs) {
        const pose = { x, z, rotationDeg };
        const placement = validatePlacement({
          aduWidth: config.width, aduLength: config.length, pose, envelope, existingHouseCorners: houseModel.corners,
        });
        if (placement.envelopeStatus === "fits") candidates.push({ pose, placement });
      }
    }
  }

  const separated = candidates.find((c) => c.placement.houseStatus === "clear");
  if (separated) return separated.pose;
  let best = candidates[0];
  for (const c of candidates) {
    if ((c.placement.houseClearanceFt ?? -Infinity) > (best.placement.houseClearanceFt ?? -Infinity) + 0.01) best = c;
  }
  return best?.pose ?? rearBiased;
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

  const squareFeet = Math.round(Math.abs(remainingCapacity)).toLocaleString();
  if (remainingCapacity < 0) {
    return {
      title: `${squareFeet} sf over ${confidence?.regulationsEstimated ? "assumed" : "modeled"} coverage allowance`,
      action: confidence?.regulationsEstimated
        ? `The concept exceeds the assumed allowance by ${squareFeet} sf. Reduce the footprint and confirm local planning rules.`
        : `Reduce the ADU footprint by at least ${squareFeet} sf, then confirm local requirements.`,
      tone: "warn",
    };
  }

  if (confidence?.regulationsEstimated) {
    return { title: `${Math.round(remainingCapacity).toLocaleString()} sf estimated coverage capacity`, action: "Maximum coverage and setbacks are assumed. Confirm local planning rules.", tone: "warn" };
  }

  return {
    title: `${squareFeet} sf of modeled coverage remains`,
    action: "Confirm utilities, access, and local requirements before proceeding.",
    tone: "ok",
  };
}
