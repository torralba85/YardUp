import type { Parcel } from "./feasibility";
import type { ParcelPermitAuthority } from "./parcel-types";

/**
 * Reading and resolving a parcel's permitting jurisdiction: whether a city or
 * the county issues the building permit. /api/parcel sets it
 * (`permitAuthority` on a live parcel); the fee and setback rules read it
 * through {@link parcelPermitAuthority} and fall back to the mailing-address
 * city only when it is absent.
 *
 * @module permit-authority
 */

/** A jurisdiction named by a parcel record or a boundary map. */
export interface PermitJurisdiction {
  kind: ParcelPermitAuthority["kind"];
  name: string;
}

/** Longest name or community kept, matching `isValidPermitAuthority` in firestore.rules. */
const MAX_NAME_LENGTH = 100;

/**
 * The record `isValidPermitAuthority` in firestore.rules accepts, or
 * undefined. Strings are trimmed and capped so a stored value always
 * round-trips through the rules.
 */
export function pickPermitAuthority(value: unknown): ParcelPermitAuthority | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const kind = record.kind === "city" || record.kind === "county" ? record.kind : null;
  const basis = record.basis === "parcel-record" || record.basis === "place-boundary" ? record.basis : null;
  const name = typeof record.name === "string" ? record.name.trim().slice(0, MAX_NAME_LENGTH) : "";
  if (!kind || !basis || !name || typeof record.checkedAt !== "string") return undefined;
  const community = typeof record.community === "string"
    ? record.community.trim().slice(0, MAX_NAME_LENGTH)
    : "";
  return {
    kind,
    name,
    ...(kind === "county" && community ? { community } : {}),
    basis,
    checkedAt: record.checkedAt.slice(0, 40),
  };
}

/**
 * The parcel's permitting jurisdiction, when it carries a well-formed one.
 * Presets, estimates and scenarios saved before the lookup existed carry none.
 */
export function parcelPermitAuthority(parcel: Parcel): ParcelPermitAuthority | null {
  return pickPermitAuthority((parcel as { permitAuthority?: unknown }).permitAuthority) ?? null;
}

/**
 * Decide the permitting jurisdiction from the two signals /api/parcel has.
 *
 * The county parcel layer's own jurisdiction code describes this lot, so it
 * wins. Census incorporated-place boundaries are the fallback everywhere
 * else: a point inside an incorporated place is that city's, and a point in
 * no place is county land, provided the lookup named the county.
 *
 * @param input.parcelRecord - Jurisdiction decoded from the parcel layer, when it publishes one.
 * @param input.census - The Census lookup; null when it failed, which leaves only the parcel record.
 * @param input.checkedAt - ISO timestamp of the lookup.
 * @returns The resolved authority, or undefined when neither signal answered.
 */
export function resolvePermitAuthority(input: {
  parcelRecord?: PermitJurisdiction | null;
  census?: { county?: string; place?: string; community?: string } | null;
  checkedAt: string;
}): ParcelPermitAuthority | undefined {
  const { parcelRecord, census, checkedAt } = input;
  // A community is only meaningful on county land, and only when the Census
  // agrees the point is in no incorporated place.
  const community = census && !census.place ? census.community : undefined;
  if (parcelRecord) {
    return pickPermitAuthority({ ...parcelRecord, community, basis: "parcel-record", checkedAt });
  }
  if (!census) return undefined;
  if (census.place) {
    return pickPermitAuthority({ kind: "city", name: census.place, basis: "place-boundary", checkedAt });
  }
  if (!census.county) return undefined;
  return pickPermitAuthority({ kind: "county", name: census.county, community, basis: "place-boundary", checkedAt });
}

/** Whether a jurisdiction name is San Diego, for the City and the County alike. */
export function isSanDiegoName(name: string): boolean {
  return name.trim().toLowerCase() === "san diego";
}
