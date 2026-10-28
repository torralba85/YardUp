import { buildLeadPreview, validateOwnerContact } from "./marketplace";
import type { ConnectionSnapshot, OwnerContact } from "./marketplace-types";

/**
 * Partner referral networks: an alternative to the LotFoundry builder
 * marketplace where the homeowner asks us to hand their project to an outside
 * matchmaking service. Unlike a marketplace lead (redacted preview, paid
 * unlock), a partner referral sends the homeowner's contact details to the
 * partner as soon as they submit, so it needs its own consent wording, its own
 * server-side ledger (`partnerReferrals`), and its own privacy disclosure.
 *
 * Client-safe: no server imports. The Admin SDK write and the email handoff
 * live in `lib/server/partner-referrals.ts`.
 *
 * @module partner-referrals
 */

export type PartnerNetworkId = "greatbuildz";

/** Which network the homeowner chose in the connect-with-builders panel. */
export type BuilderNetworkChoice = "lotfoundry" | PartnerNetworkId;

export interface PartnerNetwork {
  id: PartnerNetworkId;
  /** Display name, exactly as the partner writes it. */
  name: string;
  /** Partner home page, shown beside the consent so the homeowner can read it. */
  website: string;
  /** Human-readable coverage, used in copy and the legal pages. */
  serviceAreaLabel: string;
  /** Coverage the referral option is offered for: state + county name without "County". */
  counties: ReadonlyArray<{ state: string; county: string }>;
}

export const GREATBUILDZ: PartnerNetwork = {
  id: "greatbuildz",
  name: "GreatBuildz",
  website: "https://www.greatbuildz.com",
  serviceAreaLabel:
    "Los Angeles, Orange, Ventura, San Bernardino, Riverside, San Diego, Alameda, Contra Costa, Santa Clara and San Mateo counties",
  // Coverage GreatBuildz listed on 2026-10-22. Sacramento (expanding) and
  // statewide architecture-only work stay out until GreatBuildz confirms them.
  counties: [
    { state: "CA", county: "Los Angeles" },
    { state: "CA", county: "Orange" },
    { state: "CA", county: "Ventura" },
    { state: "CA", county: "San Bernardino" },
    { state: "CA", county: "Riverside" },
    { state: "CA", county: "San Diego" },
    { state: "CA", county: "Alameda" },
    { state: "CA", county: "Contra Costa" },
    { state: "CA", county: "Santa Clara" },
    { state: "CA", county: "San Mateo" },
  ],
};

export const PARTNER_NETWORKS: Record<PartnerNetworkId, PartnerNetwork> = {
  greatbuildz: GREATBUILDZ,
};

/**
 * Bump whenever the partner consent wording changes. Each referral stores the
 * version and the exact text the homeowner agreed to.
 */
export const PARTNER_REFERRAL_CONSENT_VERSION = "2026-10-27";

/** The consent sentence shown beside the checkbox and stored on the referral. */
export function partnerConsentText(partner: PartnerNetwork): string {
  return `I agree that LotFoundry may send my name, email, optional phone and message, exact property address, and backyard home snapshot to ${partner.name} so ${partner.name} can contact me and introduce contractors. ${partner.name} handles my details under its own privacy policy. LotFoundry may receive a referral fee from ${partner.name}; it does not change what I pay.`;
}

/**
 * Whether the GreatBuildz option is switched on for this build. Off unless
 * `NEXT_PUBLIC_GREATBUILDZ_REFERRAL` is exactly "true", so merging the code
 * does not launch the partnership. The literal `process.env.NEXT_PUBLIC_*`
 * read is required for Next.js to inline it in the client bundle.
 */
export function isGreatBuildzReferralEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GREATBUILDZ_REFERRAL === "true";
}

function normalizeCounty(value: string): string {
  return value.trim().toLowerCase().replace(/\s+county$/, "");
}

/** True when the parcel's state and county fall inside the partner's coverage. */
export function partnerServesLocation(
  partner: PartnerNetwork,
  location: { state?: string | null; county?: string | null },
): boolean {
  const state = location.state?.trim().toUpperCase();
  const county = location.county ? normalizeCounty(location.county) : "";
  if (!state || !county) return false;
  return partner.counties.some(
    (area) => area.state === state && normalizeCounty(area.county) === county,
  );
}

/** County of a parcel when the live lookup resolved one; presets have none. */
export function parcelCounty(parcel: ConnectionSnapshot["parcel"]): string | null {
  return "county" in parcel && typeof parcel.county === "string" && parcel.county
    ? parcel.county
    : null;
}

/**
 * The partner network to offer for this snapshot, or `null` when the flag is
 * off or the lot is outside every partner's coverage.
 */
export function availablePartnerNetwork(
  snapshot: Pick<ConnectionSnapshot, "parcel" | "parcelState">,
): PartnerNetwork | null {
  if (!isGreatBuildzReferralEnabled()) return null;
  return partnerServesLocation(GREATBUILDZ, {
    state: snapshot.parcelState,
    county: parcelCounty(snapshot.parcel),
  })
    ? GREATBUILDZ
    : null;
}

/**
 * Everything LotFoundry sends to a partner for one referral, and nothing more.
 * The same object is stored on the `partnerReferrals` record so the ledger
 * shows exactly what left LotFoundry.
 */
export interface PartnerReferralHandoff {
  homeowner: OwnerContact;
  property: {
    address: string;
    city: string;
    county: string;
    state: string;
    zip: string;
    lotSqft: number;
  };
  project: {
    aduSqft: number;
    widthFt: number;
    lengthFt: number;
    roof: string;
    finish: string;
    /** Build value in $25k bands, the same rounding builders see. */
    buildBandLow: number;
    buildBandHigh: number;
    zoningStatus: string;
  };
}

/** Assemble the handoff from the validated contact and the studio snapshot. */
export function buildPartnerReferralHandoff(
  contact: OwnerContact,
  snapshot: ConnectionSnapshot,
): PartnerReferralHandoff {
  const preview = buildLeadPreview({ snapshot, previewSerial: "partner-referral" });
  return {
    homeowner: contact,
    property: {
      address: snapshot.parcelAddress,
      city: snapshot.parcelCity,
      county: parcelCounty(snapshot.parcel) ?? "",
      state: snapshot.parcelState,
      zip: preview.zip,
      lotSqft: preview.lotSqft,
    },
    project: {
      aduSqft: preview.aduSqft,
      widthFt: snapshot.config.width,
      lengthFt: snapshot.config.length,
      roof: snapshot.config.roof,
      finish: snapshot.config.finish,
      buildBandLow: preview.buildBandLow,
      buildBandHigh: preview.buildBandHigh,
      zoningStatus: preview.zoningStatus,
    },
  };
}

/** Request body for `POST /api/partners/referral`. */
export interface PartnerReferralRequest {
  partnerId: PartnerNetworkId;
  consentVersion: string;
  handoff: PartnerReferralHandoff;
}

export type PartnerReferralValidation =
  | { ok: true; value: PartnerReferralRequest }
  | { ok: false; error: string };

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function boundedNumber(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
    ? value
    : null;
}

/**
 * Server-side validation of a referral request. Rebuilds the handoff from
 * known fields only, so an unexpected client key never reaches the ledger or
 * the partner, and re-checks consent version and partner coverage.
 */
export function validatePartnerReferralRequest(body: unknown): PartnerReferralValidation {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const input = body as Record<string, unknown>;

  const partner = PARTNER_NETWORKS[input.partnerId as PartnerNetworkId];
  if (!partner) return { ok: false, error: "Unknown partner network." };
  if (input.consentVersion !== PARTNER_REFERRAL_CONSENT_VERSION) {
    return { ok: false, error: "Please review and accept the current sharing consent." };
  }

  const handoff = input.handoff as Record<string, unknown> | undefined;
  const homeowner = handoff?.homeowner as Record<string, unknown> | undefined;
  const property = handoff?.property as Record<string, unknown> | undefined;
  const project = handoff?.project as Record<string, unknown> | undefined;
  if (!homeowner || !property || !project) return { ok: false, error: "Invalid request." };

  const name = boundedString(homeowner.name, 120);
  const email = boundedString(homeowner.email, 254);
  const phone = homeowner.phone == null ? "" : boundedString(homeowner.phone, 50);
  const message = homeowner.message == null ? "" : boundedString(homeowner.message, 2000);
  if (name === null || email === null || phone === null || message === null) {
    return { ok: false, error: "Contact details are too long." };
  }
  const contact = validateOwnerContact({ name, email, phone, message, consent: true });
  if (!contact.ok) return contact;

  const address = boundedString(property.address, 300);
  const city = boundedString(property.city, 120);
  const county = boundedString(property.county, 120);
  const state = boundedString(property.state, 2);
  const zip = boundedString(property.zip, 10);
  const lotSqft = boundedNumber(property.lotSqft, 10_000_000);
  if (!address || city === null || !county || !state || zip === null || lotSqft === null) {
    return { ok: false, error: "A resolved property address is required." };
  }
  if (!partnerServesLocation(partner, { state, county })) {
    return { ok: false, error: `${partner.name} does not serve this area yet.` };
  }

  const aduSqft = boundedNumber(project.aduSqft, 10_000);
  const widthFt = boundedNumber(project.widthFt, 500);
  const lengthFt = boundedNumber(project.lengthFt, 500);
  const roof = boundedString(project.roof, 40);
  const finish = boundedString(project.finish, 40);
  const buildBandLow = boundedNumber(project.buildBandLow, 100_000_000);
  const buildBandHigh = boundedNumber(project.buildBandHigh, 100_000_000);
  const zoningStatus = boundedString(project.zoningStatus, 40);
  if (
    aduSqft === null || widthFt === null || lengthFt === null || roof === null ||
    finish === null || buildBandLow === null || buildBandHigh === null || zoningStatus === null
  ) {
    return { ok: false, error: "Invalid project snapshot." };
  }

  return {
    ok: true,
    value: {
      partnerId: partner.id,
      consentVersion: PARTNER_REFERRAL_CONSENT_VERSION,
      handoff: {
        homeowner: contact.contact,
        property: { address, city, county, state: state.toUpperCase(), zip, lotSqft },
        project: {
          aduSqft, widthFt, lengthFt, roof, finish, buildBandLow, buildBandHigh, zoningStatus,
        },
      },
    },
  };
}

/**
 * Lifecycle of a referral in the internal ledger. `queued` and `sent` are set
 * by the API route; the rest are set by ops from partner reports and drive
 * referral-fee reconciliation (see docs/partners/greatbuildz-referral.md).
 */
export type PartnerReferralStatus =
  | "queued"
  | "sent"
  | "introduced"
  | "engaged"
  | "contracted"
  | "closed_lost";
