import { getParcelById, type ADUConfig, type FinancialAssumptions, type Parcel } from "./feasibility";
import { getDefaultAduPose } from "./site-fit";
import type { Pose2D } from "./scene-model";

export const SCENARIO_VERSION = 2 as const;
/** Legacy config.height is wall height in feet, not total roof height. */
export const HEIGHT_CONVENTION = "wall" as const;
export interface CommittedDesign {
  version: typeof SCENARIO_VERSION;
  heightConvention: typeof HEIGHT_CONVENTION;
  config: ADUConfig;
  pose: Pose2D;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finiteRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

export function isValidAduConfig(value: unknown): value is ADUConfig {
  if (!isRecord(value)) return false;
  return finiteRange(value.width, 1, 80) && finiteRange(value.length, 1, 80) &&
    finiteRange(value.footprint, 1, 2000) &&
    Math.abs(value.width * value.length - value.footprint) <= 0.000001 &&
    finiteRange(value.height, 1, 30) &&
    ["shed", "gable", "flat"].includes(value.roof as string) &&
    ["cedar", "lap", "stucco", "board"].includes(value.finish as string) &&
    typeof value.includeOpenings === "boolean";
}

export function isValidFinancialAssumptions(value: unknown): value is FinancialAssumptions {
  if (!isRecord(value) || !isRecord(value.costPerSqft)) return false;
  const costs = value.costPerSqft;
  return ["cedar", "lap", "stucco", "board"].every((key) => finiteRange(costs[key], 100, 1000)) &&
    finiteRange(value.softCostMultiplier, 1, 3) && finiteRange(value.operatingExpenseRatio, 0, 1) &&
    ["conservative", "market", "optimistic"].includes(value.rentScenario as string);
}

export function isValidPose(value: unknown): value is Pose2D {
  return isRecord(value) && finiteRange(value.x, -10000, 10000) &&
    finiteRange(value.z, -10000, 10000) && finiteRange(value.rotationDeg, -360, 360);
}

/**
 * Re-exported so scenario hydration and the scene cannot drift apart on where a
 * new ADU starts. Both used to carry their own identical copy of the formula.
 */
export const defaultPose = getDefaultAduPose;

/** Only legacy area labels are repaired; dimensions are never invented for storage records. */
export function migrateDesign(value: unknown, parcel?: Parcel): CommittedDesign | null {
  if (!isRecord(value) || !isRecord(value.config)) return null;
  const legacy = value.version === undefined || value.version === 1;
  if (!legacy && value.version !== SCENARIO_VERSION) return null;
  const raw = value.config;
  const config = legacy ? {
    ...raw,
    footprint: typeof raw.width === "number" && typeof raw.length === "number" ? raw.width * raw.length : raw.footprint,
    roof: raw.roof ?? raw.roofStyle,
    finish: raw.finish ?? raw.exteriorFinish,
  } : raw;
  if (!isValidAduConfig(config)) return null;
  if (!legacy && value.heightConvention !== HEIGHT_CONVENTION) return null;
  const pose = legacy && value.pose === undefined
    ? defaultPose(parcel ?? getParcelById(typeof value.parcelId === "string" ? value.parcelId : ""), config)
    : value.pose;
  if (!isValidPose(pose)) return null;
  // Pick only supported fields: caller-supplied metadata cannot leak into public links.
  return {
    version: SCENARIO_VERSION, heightConvention: HEIGHT_CONVENTION,
    config: { width: config.width, length: config.length, footprint: config.footprint,
      height: config.height, roof: config.roof, finish: config.finish, includeOpenings: config.includeOpenings },
    pose: { x: pose.x, z: pose.z, rotationDeg: ((pose.rotationDeg % 360) + 360) % 360 },
  };
}
