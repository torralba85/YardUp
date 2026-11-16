import type { ADUConfig } from "./feasibility";
import type { Parcel } from "./parcel-types";
import { aduSetbacks, type AduFootprint, type AduSetbacks } from "./adu-setbacks";
import {
  buildSetbackEnvelope,
  describePlacement as describeGeometryPlacement,
  REVIEW_SEPARATION_FT,
  validatePlacement,
  type PlacementFitStatus,
  type PlacementInput,
  type PlacementResult,
} from "./placement-validation";
import {
  buildAduHeightModel,
  buildExistingHouseSceneModel,
  EXISTING_HOUSE_ROOF_OVERHANG_FT,
  rectangleCorners,
  type LocalPoint,
  type Pose2D,
} from "./scene-model";

export interface AduPlacementBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlacementEvidenceStatus extends PlacementFitStatus {
  missingEvidenceNotice?: string;
}

/** How far a starting ADU sits in from the rear setback line when the yard has room to spare. */
const REAR_SETBACK_OFFSET_FT = 3;
const DEFAULT_SNAP_DISTANCE_FT = 0.5;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function placementBounds(
  parcel: Parcel,
  setbacks: AduSetbacks,
  span: Pick<ADUConfig, "width" | "length">,
): AduPlacementBounds {
  const rawMinX = -parcel.lotWidth / 2 + setbacks.side + span.width / 2;
  const rawMaxX = parcel.lotWidth / 2 - setbacks.side - span.width / 2;
  const rawMinZ = -parcel.lotLength / 2 + setbacks.rear + span.length / 2;
  const rawMaxZ = parcel.lotLength / 2 - setbacks.front - span.length / 2;

  const xMidpoint = (rawMinX + rawMaxX) / 2;
  const zMidpoint = (rawMinZ + rawMaxZ) / 2;

  return {
    minX: rawMinX <= rawMaxX ? rawMinX : xMidpoint,
    maxX: rawMinX <= rawMaxX ? rawMaxX : xMidpoint,
    minZ: rawMinZ <= rawMaxZ ? rawMinZ : zMidpoint,
    maxZ: rawMinZ <= rawMaxZ ? rawMaxZ : zMidpoint,
  };
}

function pointBounds(points: LocalPoint[]) {
  return points.reduce(
    (result, point) => ({
      minX: Math.min(result.minX, point.x),
      maxX: Math.max(result.maxX, point.x),
      minZ: Math.min(result.minZ, point.z),
      maxZ: Math.max(result.maxZ, point.z),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );
}

/** Bounded deterministic search of the modeled envelope; not a legal-site assessment. */
export function findBestFitPose(input: PlacementInput): Pose2D | null {
  const { envelope, existingHouseCorners: house, aduWidth, aduLength } = input;
  if (
    !envelope ||
    envelope.length < 3 ||
    !house ||
    house.length !== 4 ||
    ![input.pose.x, input.pose.z, input.pose.rotationDeg].every(Number.isFinite) ||
    ![aduWidth, aduLength].every((n) => Number.isFinite(n) && n > 0) ||
    ![...envelope, ...house].every((p) => Number.isFinite(p.x) && Number.isFinite(p.z))
  ) {
    return null;
  }

  const current = validatePlacement(input);
  if (current.status === "fits" && (current.roofClearanceFt === null || current.roofClearanceFt > 0)) {
    return { ...input.pose };
  }
  // Moving cannot repair an invalid/empty envelope or an unknown obstacle.
  if (
    current.envelopeStatus === "invalid" ||
    current.envelopeStatus === "empty" ||
    current.houseStatus === "unknown"
  ) {
    return null;
  }

  const minX = Math.min(...envelope.map((p) => p.x));
  const maxX = Math.max(...envelope.map((p) => p.x));
  const minZ = Math.min(...envelope.map((p) => p.z));
  const maxZ = Math.max(...envelope.map((p) => p.z));
  const gap = input.reviewSeparationFt ?? REVIEW_SEPARATION_FT;
  let best: { pose: Pose2D; distance: number } | null = null;

  for (const rotationDeg of [0, 90]) {
    const width = rotationDeg === 0 ? aduWidth : aduLength;
    const length = rotationDeg === 0 ? aduLength : aduWidth;
    const left = minX + width / 2;
    const right = maxX - width / 2;
    const rear = minZ + length / 2;
    const front = maxZ - length / 2;
    if (left > right || rear > front) continue;

    const axis = (min: number, max: number, anchors: number[]) =>
      Array.from(
        new Set([
          ...Array.from({ length: 25 }, (_, i) => min + ((max - min) * i) / 24),
          ...anchors.filter((n) => Number.isFinite(n) && n >= min && n <= max),
        ]),
      );
    const xs = axis(left, right, [
      input.pose.x,
      0,
      ...house.flatMap((p) => [p.x - gap - width / 2, p.x + gap + width / 2]),
    ]);
    const zs = axis(rear, front, [
      input.pose.z,
      0,
      ...house.flatMap((p) => [p.z - gap - length / 2, p.z + gap + length / 2]),
    ]);

    for (const z of zs) {
      for (const x of xs) {
        const distance = Math.hypot(x - input.pose.x, z - input.pose.z);
        // Keep traversal/tie order, but skip expensive geometry when this pose
        // cannot replace the best fit under the existing distance tolerance.
        if (best && distance >= best.distance - 0.01) continue;
        const pose = { x, z, rotationDeg };
        const placement = validatePlacement({ ...input, pose });
        if (placement.status !== "fits" || (placement.roofClearanceFt !== null && placement.roofClearanceFt <= 0)) {
          continue;
        }
        best = { pose, distance };
      }
    }
  }

  return best?.pose ?? null;
}

export function getSnapToFitPose(parcel: Parcel, config: ADUConfig, pose: Pose2D): Pose2D | null {
  const height = buildAduHeightModel(config);
  if (!height) return null;
  return findBestFitPose({
    aduWidth: config.width,
    aduLength: config.length,
    pose,
    envelope: buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, aduSetbacks(parcel, config)),
    existingHouseCorners: buildExistingHouseSceneModel(parcel).corners,
    aduRoofOverhangFt: height.roofGeometry.overhangFt,
    existingHouseRoofOverhangFt: EXISTING_HOUSE_ROOF_OVERHANG_FT,
  });
}

/**
 * Validates a pose against the ADU's setbacks (`lib/adu-setbacks.ts`) and the modeled house.
 * Pass `height` and `roof` to also measure the roof-edge gap and apply height-based setbacks.
 */
export function getScenePlacement(
  parcel: Parcel,
  config: AduFootprint,
  pose: Pose2D,
): PlacementResult {
  const heightModel =
    config.height !== undefined && config.roof !== undefined
      ? buildAduHeightModel({
          width: config.width,
          length: config.length,
          height: config.height,
          roof: config.roof,
        })
      : null;
  return validatePlacement({
    aduWidth: config.width,
    aduLength: config.length,
    pose,
    envelope: buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, aduSetbacks(parcel, config)),
    existingHouseCorners: buildExistingHouseSceneModel(parcel).corners,
    ...(heightModel && {
      aduRoofOverhangFt: heightModel.roofGeometry.overhangFt,
      existingHouseRoofOverhangFt: EXISTING_HOUSE_ROOF_OVERHANG_FT,
    }),
  });
}

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
export function getDefaultAduPose(parcel: Parcel, config: AduFootprint): Pose2D {
  const setbacks = aduSetbacks(parcel, config);
  const bounds = placementBounds(parcel, setbacks, config);
  const rearBiased: Pose2D = {
    x: 0,
    z: Math.min(bounds.minZ + REAR_SETBACK_OFFSET_FT, bounds.maxZ),
    rotationDeg: 0,
  };
  const houseModel = buildExistingHouseSceneModel(parcel);
  const house = houseModel.boundsLocal;
  if (!house || !Number.isFinite(config.width) || !Number.isFinite(config.length)) return rearBiased;

  const envelope = buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, setbacks);
  const candidates: { pose: Pose2D; placement: PlacementResult }[] = [];
  for (const rotationDeg of [0, 90]) {
    const turned = rotationDeg === 90;
    const span = {
      width: turned ? config.length : config.width,
      length: turned ? config.width : config.length,
    };
    const b = placementBounds(parcel, setbacks, span);
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
          aduWidth: config.width,
          aduLength: config.length,
          pose,
          envelope,
          existingHouseCorners: houseModel.corners,
        });
        if (placement.envelopeStatus === "fits") candidates.push({ pose, placement });
      }
    }
  }

  const separated = candidates.find((c) => c.placement.houseStatus === "clear");
  if (separated) return separated.pose;
  let best = candidates[0];
  for (const c of candidates) {
    if ((c.placement.houseClearanceFt ?? -Infinity) > (best.placement.houseClearanceFt ?? -Infinity) + 0.01) {
      best = c;
    }
  }
  return best?.pose ?? rearBiased;
}

/** Center-point bounds that keep an ADU footprint inside the drawn setbacks. */
export function getAduPlacementBounds(parcel: Parcel, config: AduFootprint): AduPlacementBounds {
  return placementBounds(parcel, aduSetbacks(parcel, config), config);
}

/**
 * Moves a just-outside ADU back to the nearest modeled ADU setback envelope.
 * Larger conflicts remain visible for deliberate review.
 */
export function snapPoseToSetbackEnvelope(
  parcel: Parcel,
  config: AduFootprint,
  pose: Pose2D,
  snapDistanceFt = DEFAULT_SNAP_DISTANCE_FT,
): Pose2D | null {
  const placement = getScenePlacement(parcel, config, pose);
  if (placement.envelopeStatus !== "overflow") return null;
  if (!Number.isFinite(snapDistanceFt) || snapDistanceFt <= 0) return null;

  const envelope = buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, aduSetbacks(parcel, config));
  if (!envelope || envelope.length !== 4) return null;

  const envelopeBounds = pointBounds(envelope);
  const aduBounds = pointBounds(
    rectangleCorners({ x: pose.x, z: pose.z }, config.width, config.length, pose.rotationDeg),
  );

  let dx = 0;
  let dz = 0;
  if (aduBounds.minX < envelopeBounds.minX) dx = envelopeBounds.minX - aduBounds.minX;
  else if (aduBounds.maxX > envelopeBounds.maxX) dx = envelopeBounds.maxX - aduBounds.maxX;

  if (aduBounds.minZ < envelopeBounds.minZ) dz = envelopeBounds.minZ - aduBounds.minZ;
  else if (aduBounds.maxZ > envelopeBounds.maxZ) dz = envelopeBounds.maxZ - aduBounds.maxZ;

  if (Math.max(Math.abs(dx), Math.abs(dz)) > snapDistanceFt) return null;
  const snapped = { ...pose, x: pose.x + dx, z: pose.z + dz };
  return getScenePlacement(parcel, config, snapped).envelopeStatus === "fits" ? snapped : null;
}

/**
 * Evidence-aware placement summary shared across the 3D scene ring, 2D plan,
 * Studio status panels, and Verdict so every surface reports the same tone
 * and caveats for a Parcel.
 */
export function describePlacement(
  result: PlacementResult,
  parcel?: Parcel,
): PlacementEvidenceStatus {
  const base = describeGeometryPlacement(result);

  const isPreset =
    parcel &&
    (("source" in parcel && parcel.source === "preset") ||
      "expectedRent" in parcel ||
      ("id" in parcel && parcel.id === "demo"));

  if (isPreset) return base;

  const hasRecordedBoundary = parcel && "boundaryGeoJson" in parcel && !!parcel.boundaryGeoJson;
  const boundaryText = hasRecordedBoundary
    ? "Recorded GIS boundary (not a survey)."
    : "Measured boundary is unavailable.";

  const missingNotice = `${boundaryText} House footprint, position, and compass bearing are unverified.`;

  if (result.status === "fits") {
    return {
      ...base,
      title: "Fits the estimated model",
      tone: "review",
      missingEvidenceNotice: `${missingNotice} Fit is not zoning approval. Confirm surveyed boundaries and building separations.`,
    };
  }

  return {
    ...base,
    missingEvidenceNotice: `${missingNotice} Confirm surveyed boundaries and building separations.`,
  };
}
