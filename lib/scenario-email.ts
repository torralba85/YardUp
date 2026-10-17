import { isRecord, isValidAduConfig, isValidFinancialAssumptions, isValidPose } from "./scenario-design";
import { normalizeLiveParcel } from "./saved-scenarios";
import type { SavedScenario } from "./saved-scenarios";
import { parcelPresets } from "./feasibility";

/** Keep only design data; never carry a paid brief, purchase intent, or user profile. */
export function parseEmailScenario(value: unknown): SavedScenario | null {
  if (!isRecord(value) || !isValidAduConfig(value.config) || !isValidFinancialAssumptions(value.assumptions) || !isValidPose(value.pose)) return null;
  if (typeof value.parcelId !== "string" || !parcelPresets.some((p) => p.id === value.parcelId)) return null;
  const liveParcel = value.liveParcel === undefined ? undefined : normalizeLiveParcel(value.liveParcel);
  if (liveParcel === null) return null;
  return { version: 2, heightConvention: "wall", id: "emailed-layout", name: "Emailed lot layout", createdAt: new Date().toISOString(), parcelId: value.parcelId,
    config: { width: value.config.width, length: value.config.length, height: value.config.height, footprint: value.config.footprint, roof: value.config.roof, finish: value.config.finish, includeOpenings: value.config.includeOpenings },
    assumptions: { costPerSqft: { cedar: value.assumptions.costPerSqft.cedar, lap: value.assumptions.costPerSqft.lap, stucco: value.assumptions.costPerSqft.stucco, board: value.assumptions.costPerSqft.board }, softCostMultiplier: value.assumptions.softCostMultiplier, operatingExpenseRatio: value.assumptions.operatingExpenseRatio, rentScenario: value.assumptions.rentScenario },
    pose: { x: value.pose.x, z: value.pose.z, rotationDeg: value.pose.rotationDeg }, ...(liveParcel ? { liveParcel } : {}) };
}

export function validLayoutToken(token: string): boolean { return /^[a-f0-9]{48}$/.test(token); }
