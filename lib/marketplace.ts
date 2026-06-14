import { buildReportText } from "./report";
import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";
import type {
  BuilderProfile,
  ConnectionSnapshot,
  LeadPreview,
  OwnerContact,
  ServiceArea,
} from "./marketplace-types";

export interface OwnerContactFormInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export type OwnerContactValidation =
  | { ok: true; contact: OwnerContact }
  | { ok: false; error: string };

export function normalizeServiceArea(city: string, state: string): ServiceArea {
  const normalizedCity = city.trim().replace(/\s+/g, " ");
  const normalizedState = state.trim().slice(0, 2).toUpperCase();

  return {
    city: toTitleCase(normalizedCity),
    state: normalizedState,
    key: `${normalizedCity.toLowerCase()}-${normalizedState.toLowerCase()}`,
  };
}

export function parseParcelCityState(value: string): ServiceArea | null {
  const [cityPart, statePart] = value.split(",");
  if (!cityPart || !statePart) return null;

  const state = statePart.trim().split(/\s+/)[0];
  if (!state) return null;

  return normalizeServiceArea(cityPart, state);
}

export function getMatchedBuilders(
  builders: BuilderProfile[],
  parcelCity: string,
): BuilderProfile[] {
  const area = parseParcelCityState(parcelCity);
  if (!area) return [];

  return builders.filter(
    (builder) =>
      builder.active &&
      builder.serviceAreas.some((serviceArea) => serviceArea.key === area.key),
  );
}

export function validateOwnerContact(
  input: OwnerContactFormInput,
): OwnerContactValidation {
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  const message = input.message.trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!input.consent) {
    return { ok: false, error: "Consent is required before sharing with builders." };
  }

  return {
    ok: true,
    contact: {
      name,
      email,
      phone: phone || null,
      message: message || null,
    },
  };
}

export function buildConnectionSnapshot(input: {
  parcelKey: string;
  parcel: Parcel;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
}): ConnectionSnapshot {
  const area = parseParcelCityState(input.parcel.city);

  return {
    parcel: input.parcel,
    parcelKey: input.parcelKey,
    parcelAddress: input.parcel.address,
    parcelCity: area?.city ?? input.parcel.city,
    parcelState: area?.state ?? "",
    config: input.config,
    assumptions: input.assumptions,
    result: input.result,
    reportText: buildReportText({
      parcel: input.parcel,
      config: input.config,
      result: input.result,
    }),
  };
}

/** Bucket an exact build range into $25k bands so the free preview never
 * reveals the certificate-exact cost (2A). */
export function bucketBuildBand(
  low: number,
  high: number,
): { low: number; high: number } {
  const STEP = 25000;
  return {
    low: Math.floor(low / STEP) * STEP,
    high: Math.max(Math.ceil(high / STEP) * STEP, Math.floor(low / STEP) * STEP + STEP),
  };
}

/** Bucket monthly rent to the nearest $250 band for the free preview. */
export function bucketRentBand(rent: number): number {
  return Math.round(rent / 250) * 250;
}

/** Pull a 5-digit ZIP out of a street address — coarse location that is safe
 * to show on the redacted preview (the street itself is not). */
export function extractZip(address: string): string {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : "";
}

function defaultMatchReasons(snapshot: ConnectionSnapshot): string[] {
  const reasons: string[] = [];
  if (snapshot.parcelCity && snapshot.parcelState) {
    reasons.push(`In your service area: ${snapshot.parcelCity}, ${snapshot.parcelState}`);
  }
  reasons.push(
    `${snapshot.result.aduSqft.toLocaleString()} sf ADU · ${snapshot.result.zoningStatus} zoning`,
  );
  return reasons;
}

/**
 * Derive the redacted lead preview from a full snapshot. The output contains
 * no contact info and no street address — only banded money figures, ZIP, and
 * city/state — so it is safe to write to the public `connectionRequests` root.
 * `previewSerial` is supplied by the caller (random, not the APN — 9A).
 */
export function buildLeadPreview(input: {
  snapshot: ConnectionSnapshot;
  previewSerial: string;
  matchReasons?: string[];
}): LeadPreview {
  const { snapshot, previewSerial } = input;
  const band = bucketBuildBand(snapshot.result.costLow, snapshot.result.costHigh);
  const neighborhood = [snapshot.parcelCity, snapshot.parcelState]
    .filter(Boolean)
    .join(", ");

  return {
    neighborhood,
    zip: extractZip(snapshot.parcelAddress),
    state: snapshot.parcelState,
    lotSqft: snapshot.parcel.lotArea,
    config: snapshot.config,
    aduSqft: snapshot.result.aduSqft,
    buildBandLow: band.low,
    buildBandHigh: band.high,
    rentBand: bucketRentBand(snapshot.result.monthlyRent),
    paybackYears: snapshot.result.paybackYears,
    zoningStatus: snapshot.result.zoningStatus,
    matchReasons: input.matchReasons ?? defaultMatchReasons(snapshot),
    previewSerial,
  };
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
