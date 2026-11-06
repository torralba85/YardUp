import type { Parcel } from "./parcel-types";
import { certificateKey } from "./certificate-key";
import { preapprovedPlans, preapprovedPrograms } from "./preapproved-plans-data";

/** IDs only: a saved choice is a reference, never evidence of approval. */
export interface PreapprovedPlanReference {
  planId: string;
  jurisdictionId: string;
}

export interface PreapprovedProgram {
  id: string;
  city: string;
  state: string;
  authority: "city" | "county";
  status: "verified" | "unavailable" | "needs-verification";
  sourceUrl: string;
  catalogUrl?: string;
  reviewedAt: string;
  verifiedAt?: string;
  notes: string;
}

export interface PreapprovedPlan {
  id: string;
  jurisdictionId: string;
  name: string;
  provider: string;
  sqft?: number;
  bedrooms?: number;
  sourceUrl: string;
  documentUrl?: string;
  verifiedAt: string;
  restrictions: string;
  feeNote?: string;
  status: "active" | "withdrawn";
}

const safeId = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

/** Strip metadata and retain well-formed retired IDs so old studies remain readable. */
export function normalizePlanReference(value: unknown): PreapprovedPlanReference | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return safeId(record.planId) && safeId(record.jurisdictionId)
    ? { planId: record.planId, jurisdictionId: record.jurisdictionId }
    : undefined;
}

export function findPreapprovedPlan(reference: PreapprovedPlanReference): PreapprovedPlan | undefined {
  return preapprovedPlans.find(plan => plan.id === reference.planId && plan.jurisdictionId === reference.jurisdictionId);
}

const normalizeCity = (city: string) => city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Suggest a postal match; the homeowner must still confirm the permitting authority. */
export function suggestPlanJurisdiction(parcel: Pick<Parcel, "city"> & { state?: string }): PreapprovedProgram | undefined {
  const [city, suffix] = parcel.city.split(",");
  const suffixState = suffix?.trim().match(/^([A-Z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/i)?.[1].toUpperCase();
  const explicitState = parcel.state?.trim().toUpperCase();
  if (explicitState && suffixState && explicitState !== suffixState) return undefined;
  const state = explicitState || suffixState;
  if (!state) return undefined;
  return preapprovedPrograms.find(program => program.state === state && normalizeCity(program.city) === normalizeCity(city));
}

/** Non-authoritative identity hint: prevent a URL choice from moving to another lot.
 * No raw address enters the URL. This checksum is not an access-control token.
 */
export function planScopeForLot(lot: Pick<Parcel, "address" | "city">, mode: "preset" | "live" | "estimated"): string {
  let first = 2166136261;
  let second = 0x9e3779b9;
  for (const character of `${mode}:${certificateKey(lot)}`) {
    first = Math.imul(first ^ character.charCodeAt(0), 16777619);
    second = Math.imul(second ^ character.charCodeAt(0), 16777619);
  }
  return (first >>> 0).toString(16).padStart(8, "0") + (second >>> 0).toString(16).padStart(8, "0");
}
