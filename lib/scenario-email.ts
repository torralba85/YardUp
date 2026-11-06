import { isRecord, isValidAduConfig, isValidFinancialAssumptions, isValidPose } from "./scenario-design";
import { normalizeLiveParcel } from "./saved-scenarios";
import type { SavedScenario } from "./saved-scenarios";
import { parcelPresets } from "./feasibility";
import { normalizePlanReference } from "./preapproved-plans";

// Links, email addresses and bare domains (two-plus characters, a dot, then letters).
const LINK_LIKE = /:\/\/|www\.|@|\b[a-z0-9-]{2,}\.[a-z]{2,24}\b/i;
// Control characters (including line breaks) and angle brackets.
const UNSAFE_CHARACTERS = /[\u0000-\u001f\u007f<>]/;

/**
 * Text from the client that is printed into an outbound email, such as the
 * parcel address, must read like a place name: short, one line, and with no
 * links or addresses that would let the email carry someone else's message.
 */
export function isPlainPlaceText(value: string, maxLength: number): boolean {
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength && !UNSAFE_CHARACTERS.test(text) && !LINK_LIKE.test(text);
}

/** Keep only design data; never carry a paid brief, purchase intent, or user profile. */
export function parseEmailScenario(value: unknown): SavedScenario | null {
  if (!isRecord(value) || !isValidAduConfig(value.config) || !isValidFinancialAssumptions(value.assumptions) || !isValidPose(value.pose)) return null;
  if (typeof value.parcelId !== "string" || !parcelPresets.some((p) => p.id === value.parcelId)) return null;
  const preapprovedPlan = normalizePlanReference(value.preapprovedPlan);
  const liveParcel = value.liveParcel === undefined ? undefined : normalizeLiveParcel(value.liveParcel);
  if (liveParcel === null) return null;
  return { version: 2, heightConvention: "wall", id: "emailed-layout", name: "Emailed lot layout", createdAt: new Date().toISOString(), parcelId: value.parcelId,
    config: { width: value.config.width, length: value.config.length, height: value.config.height, footprint: value.config.footprint, roof: value.config.roof, finish: value.config.finish, includeOpenings: value.config.includeOpenings },
    assumptions: { costPerSqft: { cedar: value.assumptions.costPerSqft.cedar, lap: value.assumptions.costPerSqft.lap, stucco: value.assumptions.costPerSqft.stucco, board: value.assumptions.costPerSqft.board }, softCostMultiplier: value.assumptions.softCostMultiplier, operatingExpenseRatio: value.assumptions.operatingExpenseRatio, rentScenario: value.assumptions.rentScenario },
    pose: { x: value.pose.x, z: value.pose.z, rotationDeg: value.pose.rotationDeg }, ...(liveParcel ? { liveParcel } : {}), ...(preapprovedPlan ? { preapprovedPlan } : {}) };
}
