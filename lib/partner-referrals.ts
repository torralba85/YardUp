import { bedroomClassForFootprint } from "./market/bedroom";
import { bucketBuildBand, buildLeadPreview, validateOwnerContact } from "./marketplace";
import type { ConnectionSnapshot, OwnerContact } from "./marketplace-types";
import type { LiveParcelData } from "./parcel-types";

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
  /** Legal entity, as named in the consent text and the legal pages. */
  legalName: string;
  /** Partner privacy policy and terms, linked beside the consent. */
  privacyUrl: string;
  termsUrl: string;
  /** Opening line of the introduction email, as the partner asked to be addressed. */
  introSalutation: string;
  /** Human-readable coverage, used in copy and the legal pages. */
  serviceAreaLabel: string;
  /** Coverage the referral option is offered for: state + county name without "County". */
  counties: ReadonlyArray<{ state: string; county: string }>;
  /**
   * Smallest project the partner takes, compared with the top of the $25k
   * build band the homeowner sees. Smaller projects stay with LotFoundry builders.
   */
  minBuildBandHigh: number;
}

export const GREATBUILDZ: PartnerNetwork = {
  id: "greatbuildz",
  name: "GreatBuildz",
  legalName: "GreatBuildz Inc.",
  privacyUrl: "https://www.greatbuildz.com/privacy-policy/",
  termsUrl: "https://www.greatbuildz.com/terms-of-service/",
  introSalutation: "Hi Jon and the GreatBuildz team,",
  serviceAreaLabel:
    "Los Angeles, Orange, Ventura, San Bernardino, Riverside, San Diego, Alameda, Contra Costa, Santa Clara and San Mateo counties",
  // Coverage GreatBuildz confirmed on 2026-11-09: all ten counties with no
  // exclusions inside them, architecture-only requests included. Sacramento
  // stays out until GreatBuildz says otherwise.
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
  // GreatBuildz's suggested minimum budget for an ADU (2026-11-09).
  minBuildBandHigh: 100_000,
};

export const PARTNER_NETWORKS: Record<PartnerNetworkId, PartnerNetwork> = {
  greatbuildz: GREATBUILDZ,
};

/**
 * Bump whenever the partner consent wording changes. Each referral stores the
 * version and the exact text the homeowner agreed to. Re-date to launch day.
 */
export const PARTNER_REFERRAL_CONSENT_VERSION = "2026-11-12";

/**
 * The required consent, shown beside the first checkbox and stored on the
 * referral (pilot agreement Exhibit A, box 1). It covers the advisor's email
 * and phone contact only. Texts have their own optional box, and it never
 * covers contractors or architects, whom the homeowner can't name yet.
 */
export function partnerConsentText(partner: PartnerNetwork): string {
  return `I'm 18 or older, and I ask LotFoundry to email my name, email, phone and message (if I gave them), property address, lot and zoning facts, backyard home design summary and $25k build-cost range to ${partner.legalName}, with a copy to me. It won't include my exact costs, rent figures, photos or Certificate. A ${partner.name} project advisor may contact me about this project by phone or email to set up ${partner.name}'s free consultation. ${partner.name} handles my information under its own privacy policy and terms, may share my project with the contractors or architects I agree to be matched with, and reports the referral's status and any signed contract's price back to LotFoundry. ${partner.name} may pay LotFoundry a referral fee, which doesn't change what I pay. Any contractor or architect screening is done by ${partner.name} alone; LotFoundry doesn't screen, background-check, license-check or endorse anyone.`;
}

/**
 * The optional text-message consent (Exhibit A, box 2). It names only the
 * partner, is never a condition of the referral, and is offered only when the
 * homeowner gave a phone number.
 */
export function partnerSmsConsentText(partner: PartnerNetwork): string {
  return `Optional: ${partner.legalName} may also call and text me about this project at the phone number I provided, including with automated technology. This isn't required to get an introduction or to buy anything. Message and data rates may apply. Reply STOP to opt out.`;
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
 * off, the lot is outside every partner's coverage, or the project is below
 * the partner's minimum.
 */
export function availablePartnerNetwork(
  snapshot: Pick<ConnectionSnapshot, "parcel" | "parcelState" | "result">,
): PartnerNetwork | null {
  if (!isGreatBuildzReferralEnabled()) return null;
  const covered = partnerServesLocation(GREATBUILDZ, {
    state: snapshot.parcelState,
    county: parcelCounty(snapshot.parcel),
  });
  const band = bucketBuildBand(snapshot.result.costLow, snapshot.result.costHigh);
  return covered && band.high >= GREATBUILDZ.minBuildBandHigh ? GREATBUILDZ : null;
}

/**
 * Everything LotFoundry sends to a partner for one referral, and nothing more.
 * The same object is stored on the `partnerReferrals` record so the ledger
 * shows exactly what left LotFoundry.
 */
export interface PartnerReferralHandoff {
  homeowner: OwnerContact;
  /**
   * The homeowner checked the optional text box for the partner. Always false
   * without a phone number. The intro email states it, so the partner knows
   * whether it may text or must collect its own consent first.
   */
  smsConsent: boolean;
  property: {
    address: string;
    city: string;
    county: string;
    state: string;
    zip: string;
    lotSqft: number;
    /** Existing building footprint, only when the parcel data confirmed it. */
    existingFootprintSqft: number | null;
    /** Zoning designation as the parcel source reports it. */
    zoning: string | null;
    /** Raw CAL FIRE class ("high", "none", "unknown", ...). */
    fireHazard: string;
  };
  project: {
    aduSqft: number;
    widthFt: number;
    lengthFt: number;
    roof: string;
    finish: string;
    /** Modeled bedroom count: "studio", "1br" or "2br". */
    bedroomClass: string;
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
  smsConsent: boolean,
): PartnerReferralHandoff {
  const preview = buildLeadPreview({ snapshot, previewSerial: "partner-referral" });
  const live = snapshot.parcel as Partial<LiveParcelData>;
  return {
    homeowner: contact,
    smsConsent: smsConsent && Boolean(contact.phone),
    property: {
      address: snapshot.parcelAddress,
      city: snapshot.parcelCity,
      county: parcelCounty(snapshot.parcel) ?? "",
      state: snapshot.parcelState,
      zip: preview.zip,
      lotSqft: preview.lotSqft,
      existingFootprintSqft: snapshot.advisorIntake?.existingFootprintSqft ?? null,
      zoning: live.zoning || null,
      fireHazard: snapshot.advisorIntake?.fireHazard ?? live.fireHazard?.zone ?? "unknown",
    },
    project: {
      aduSqft: preview.aduSqft,
      widthFt: snapshot.config.width,
      lengthFt: snapshot.config.length,
      roof: snapshot.config.roof,
      finish: snapshot.config.finish,
      bedroomClass: bedroomClassForFootprint(snapshot.config.footprint),
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
 * the partner, and re-checks consent version, partner coverage and minimum.
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
  if (typeof handoff?.smsConsent !== "boolean") return { ok: false, error: "Invalid request." };
  // Text consent needs a number to text.
  const smsConsent = handoff.smsConsent && contact.contact.phone !== null;

  const address = boundedString(property.address, 300);
  const city = boundedString(property.city, 120);
  const county = boundedString(property.county, 120);
  const state = boundedString(property.state, 2);
  const zip = boundedString(property.zip, 10);
  const lotSqft = boundedNumber(property.lotSqft, 10_000_000);
  const existingFootprintSqft =
    property.existingFootprintSqft == null ? null : boundedNumber(property.existingFootprintSqft, 10_000_000);
  const zoning = property.zoning == null ? null : boundedString(property.zoning, 120);
  const fireHazard = boundedString(property.fireHazard, 40);
  if (!address || city === null || !county || !state || zip === null || lotSqft === null) {
    return { ok: false, error: "A resolved property address is required." };
  }
  if (
    (property.existingFootprintSqft != null && existingFootprintSqft === null) ||
    (property.zoning != null && zoning === null) ||
    !fireHazard
  ) {
    return { ok: false, error: "Invalid property details." };
  }
  if (!partnerServesLocation(partner, { state, county })) {
    return { ok: false, error: `${partner.name} does not serve this area yet.` };
  }

  const aduSqft = boundedNumber(project.aduSqft, 10_000);
  const widthFt = boundedNumber(project.widthFt, 500);
  const lengthFt = boundedNumber(project.lengthFt, 500);
  const roof = boundedString(project.roof, 40);
  const finish = boundedString(project.finish, 40);
  const bedroomClass = boundedString(project.bedroomClass, 20);
  const buildBandLow = boundedNumber(project.buildBandLow, 100_000_000);
  const buildBandHigh = boundedNumber(project.buildBandHigh, 100_000_000);
  const zoningStatus = boundedString(project.zoningStatus, 40);
  if (
    aduSqft === null || widthFt === null || lengthFt === null || roof === null ||
    finish === null || !bedroomClass || buildBandLow === null || buildBandHigh === null ||
    zoningStatus === null
  ) {
    return { ok: false, error: "Invalid project snapshot." };
  }
  if (buildBandHigh < partner.minBuildBandHigh) {
    return { ok: false, error: `${partner.name} takes projects from $${partner.minBuildBandHigh.toLocaleString("en-US")}.` };
  }

  return {
    ok: true,
    value: {
      partnerId: partner.id,
      consentVersion: PARTNER_REFERRAL_CONSENT_VERSION,
      handoff: {
        homeowner: contact.contact,
        smsConsent,
        property: {
          address, city, county, state: state.toUpperCase(), zip, lotSqft,
          existingFootprintSqft, zoning, fireHazard,
        },
        project: {
          aduSqft, widthFt, lengthFt, roof, finish, bedroomClass,
          buildBandLow, buildBandHigh, zoningStatus,
        },
      },
    },
  };
}

/**
 * Lifecycle of a referral in the internal ledger. `queued` and `sent` are set
 * by the API route; the rest are set by ops from the shared GreatBuildz sheet
 * and drive referral-fee reconciliation (see docs/partners/greatbuildz-referral.md).
 * `duplicate` marks a homeowner GreatBuildz was already talking to about the
 * same project in the 90 days before our intro, which earns no fee.
 */
export type PartnerReferralStatus =
  | "queued"
  | "sent"
  | "introduced"
  | "engaged"
  | "contracted"
  | "duplicate"
  | "closed_lost";
