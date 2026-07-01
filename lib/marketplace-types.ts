import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";

/**
 * Marketplace domain types for the homeowner→builder lead flow.
 *
 * The split between {@link LeadPreview} (free, redacted, root document) and
 * {@link UnlockedLeadContact} (paid, PII-bearing, gated subcollection) IS the
 * paywall: contact and exact figures simply don't exist on the preview type, so
 * rendering them on a locked card is a compile error rather than a runtime leak.
 *
 * @module marketplace-types
 */

/** A normalized builder service area (city + state) with a lookup key. */
export interface ServiceArea {
  /** Title-cased city name. */
  city: string;
  /** Two-letter uppercase state code. */
  state: string;
  /** Normalized `city-state` key used to match leads to builders. */
  key: string;
}

/** A builder's public marketplace profile. */
export interface BuilderProfile {
  /** Profile document id. */
  id: string;
  /** Firebase Auth uid of the owning builder account. */
  ownerUid: string;
  /** Company / business name. */
  companyName: string;
  /** Contact email shown to matched, unlocked leads. */
  contactEmail: string;
  /** Contact phone, or `null` if not provided. */
  phone: string | null;
  /** Contractor license number, or `null`. */
  licenseNumber: string | null;
  /** Areas this builder serves and is matched against. */
  serviceAreas: ServiceArea[];
  /** Whether the profile is active and eligible for matching. */
  active: boolean;
  /** Credit count for instant lead unlocks. */
  credits: number;
  /** ISO creation timestamp, or `null` if pending a server write. */
  createdAt: string | null;
  /** ISO update timestamp, or `null`. */
  updatedAt: string | null;
}

export interface BuilderLedgerEntry {
  id: string;
  builderId: string;
  type: "purchase" | "unlock" | "credit";
  creditsChange: number;
  amountPaid: number;
  referenceId: string;
  description: string;
  createdAt: string;
}

/** A homeowner's contact details, captured with consent. */
export interface OwnerContact {
  /** Owner's name. */
  name: string;
  /** Owner's email. */
  email: string;
  /** Owner's phone, or `null`. */
  phone: string | null;
  /** Optional message to builders, or `null`. */
  message: string | null;
}

/**
 * The full feasibility snapshot. This is PII-bearing — `parcelAddress` and the
 * `reportText` certificate both embed the exact street address — so it lives in
 * the gated `private/contact` subcollection, never on the redacted root doc.
 */
export interface ConnectionSnapshot {
  /** The full parcel record (includes the exact street address). */
  parcel: Parcel;
  /** Stable key identifying the parcel. */
  parcelKey: string;
  /** Exact street address (PII). */
  parcelAddress: string;
  /** City portion of the address. */
  parcelCity: string;
  /** Two-letter state code. */
  parcelState: string;
  /** The ADU configuration. */
  config: ADUConfig;
  /** The financial assumptions used. */
  assumptions: FinancialAssumptions;
  /** The computed feasibility result (exact figures). */
  result: FeasibilityResult;
  /** Rendered certificate text (embeds the exact address). */
  reportText: string;
}

/**
 * Redacted lead preview — the `connectionRequests/{id}` ROOT doc that matched
 * builders read for free (1A paywall split). Carries NO contact info and NO
 * precise location (no street address, no APN). Money figures are coarse
 * *bands*, not certificate exacts — the exact numbers + contact are the paid
 * unlock. The paywall is the data layout itself.
 */
export interface LeadPreview {
  /** City/state only — e.g. "Seattle, WA". Never the street address. */
  neighborhood: string;
  /** 5-digit ZIP — a coarse location signal that is not the street. */
  zip: string;
  state: string;
  lotSqft: number;
  config: ADUConfig;
  aduSqft: number;
  /** Build value bucketed to $25k bands (2A: never the certificate exact). */
  buildBandLow: number;
  buildBandHigh: number;
  /** Monthly rent bucketed to $250 bands. */
  rentBand: number;
  paybackYears: number;
  zoningStatus: FeasibilityResult["zoningStatus"];
  /** Why this lead matched the builder — service-area / config reasons. */
  matchReasons: string[];
  /** "LF-xxxxxx" — random, NOT derived from the APN (9A). */
  previewSerial: string;
}

/** The redacted root lead document matched builders can read for free. */
export interface ConnectionRequest {
  /** Request document id. */
  id: string;
  /** Firebase Auth uid of the submitting homeowner. */
  ownerUid: string;
  /** The redacted, PII-free lead preview. */
  preview: LeadPreview;
  /** Ids of builder profiles this lead was matched to. */
  matchedBuilderIds: string[];
  /** Lifecycle status (only `submitted` in v1). */
  status: "submitted";
  /** Owner authenticated at submit time (always true in v1). */
  ownerVerified: boolean;
  /** 19C head-start window end (ISO). Null until the first unlock (T8). */
  headStartUntil: string | null;
  /** ISO creation timestamp, or `null`. */
  createdAt: string | null;
  /** ISO update timestamp, or `null`. */
  updatedAt: string | null;
}

/**
 * The gated PII payload from `connectionRequests/{id}/private/contact`.
 * Returned ONLY by `fetchUnlockedContact` after a `leadUnlocks` grant (T3),
 * or to the owner. The contact fields do not exist on `LeadPreview`, so
 * rendering them on a locked card is a compile error (7A).
 */
export interface UnlockedLeadContact {
  /** The homeowner's contact details. */
  ownerContact: OwnerContact;
  /** The exact street address (PII). */
  streetAddress: string;
  /** The parcel's APN, or `null` if unavailable. */
  exactAPN: string | null;
  /** Full feasibility snapshot incl. the certificate report text. */
  snapshot: ConnectionSnapshot;
}

/** A builder's triage status for a lead in their inbox. */
export type BuilderResponseStatus = "new" | "interested" | "not-a-fit";

/** A builder's per-lead response/triage record. */
export interface BuilderResponse {
  /** Id of the responding builder profile. */
  builderId: string;
  /** Current triage status. */
  status: BuilderResponseStatus;
  /** ISO creation timestamp, or `null`. */
  createdAt: string | null;
  /** ISO update timestamp, or `null`. */
  updatedAt: string | null;
}

/** One row in a builder's inbox: the redacted lead plus this builder's state. */
export interface BuilderInboxItem {
  /** Redacted — no contact, no street address. */
  request: ConnectionRequest;
  /** This builder's triage response for the lead. */
  response: BuilderResponse;
  /** True if this builder already holds a `leadUnlocks` grant for the lead. */
  unlocked: boolean;
}
