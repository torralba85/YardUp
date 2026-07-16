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

/** Raw owner contact form values, prior to validation/normalization. */
export interface OwnerContactFormInput {
  /** Owner's name. */
  name: string;
  /** Owner's email. */
  email: string;
  /** Owner's phone (may be blank). */
  phone: string;
  /** Optional message to builders (may be blank). */
  message: string;
  /** Whether the owner consented to sharing details with builders. */
  consent: boolean;
}

/** Result of validating an owner contact form: either a contact or an error. */
export type OwnerContactValidation =
  | { ok: true; contact: OwnerContact }
  | { ok: false; error: string };

/**
 * Normalize a free-form city and state into a {@link ServiceArea} with a stable
 * lookup key (title-cased city, two-letter uppercase state).
 *
 * @param city - The city name.
 * @param state - The state (first two letters are used).
 * @returns The normalized service area.
 */
export function normalizeServiceArea(city: string, state: string): ServiceArea {
  const normalizedCity = city.trim().replace(/\s+/g, " ");
  const normalizedState = state.trim().slice(0, 2).toUpperCase();

  return {
    city: toTitleCase(normalizedCity),
    state: normalizedState,
    key: `${normalizedCity.toLowerCase()}-${normalizedState.toLowerCase()}`,
  };
}

/**
 * Parse a `"City, ST ..."` string (e.g. a parcel's `city` field) into a
 * normalized {@link ServiceArea}.
 *
 * @param value - The combined city/state string.
 * @returns The normalized service area, or `null` if it can't be parsed.
 */
export function parseParcelCityState(value: string): ServiceArea | null {
  const [cityPart, statePart] = value.split(",");
  if (!cityPart || !statePart) return null;

  const state = statePart.trim().split(/\s+/)[0];
  if (!state) return null;

  return normalizeServiceArea(cityPart, state);
}

/**
 * Find active builders whose service areas include a parcel's city/state.
 *
 * @param builders - Candidate builder profiles.
 * @param parcelCity - The parcel's `"City, ST"` string.
 * @returns Matching active builders; empty if the location can't be parsed.
 */
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

/**
 * Validate and normalize owner contact form input, requiring a name, a
 * well-formed email, and explicit consent.
 *
 * @param input - The raw form values.
 * @returns `{ ok: true, contact }` on success, or `{ ok: false, error }` with
 *   a user-facing message.
 */
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

/**
 * Assemble a full {@link ConnectionSnapshot} (the PII-bearing, gated payload)
 * from a parcel, config, assumptions, and result, including a rendered
 * certificate `reportText`.
 *
 * @param input - The parcel key, parcel, config, assumptions, and result.
 * @returns The complete connection snapshot.
 */
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
 *
 * @param input.snapshot - The full (PII-bearing) connection snapshot to redact.
 * @param input.previewSerial - Caller-supplied random serial (never PII-derived).
 * @param input.matchReasons - Optional override for the "why this matched" lines;
 *   defaults to a service-area + size/zoning summary.
 * @returns A {@link LeadPreview} safe to expose on the public root document.
 *
 * @remarks
 * The redaction is enforced by the return type, not by trust: {@link LeadPreview}
 * has no `ownerContact` or `streetAddress` field, so a locked card physically
 * cannot render them. Money figures are bucketed — build cost to $25k bands via
 * {@link bucketBuildBand} and rent to $250 bands via {@link bucketRentBand} — so
 * the free preview never leaks the certificate-exact numbers.
 *
 * @example
 * const preview = buildLeadPreview({ snapshot, previewSerial: "LF-AB12CD" });
 * preview.neighborhood; // "Seattle, WA" — city/state only, never the street
 * preview.zip;          // "98115" — a coarse signal, not the address
 * preview.buildBandLow; // bucketed to $25k, e.g. 225000
 * preview.rentBand;     // bucketed to $250, e.g. 2000
 *
 * @see buildConnectionSnapshot — produces the snapshot this redacts.
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
    rentBasis: snapshot.result.rentBasis,
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
