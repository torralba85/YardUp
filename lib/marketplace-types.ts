import type {
  ADUConfig,
  FeasibilityResult,
  FinancialAssumptions,
} from "./feasibility";
import type { Parcel } from "./parcel-types";

export interface ServiceArea {
  city: string;
  state: string;
  key: string;
}

export interface BuilderProfile {
  id: string;
  ownerUid: string;
  companyName: string;
  contactEmail: string;
  phone: string | null;
  licenseNumber: string | null;
  serviceAreas: ServiceArea[];
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OwnerContact {
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
}

/**
 * The full feasibility snapshot. This is PII-bearing — `parcelAddress` and the
 * `reportText` certificate both embed the exact street address — so it lives in
 * the gated `private/contact` subcollection, never on the redacted root doc.
 */
export interface ConnectionSnapshot {
  parcel: Parcel;
  parcelKey: string;
  parcelAddress: string;
  parcelCity: string;
  parcelState: string;
  config: ADUConfig;
  assumptions: FinancialAssumptions;
  result: FeasibilityResult;
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

export interface ConnectionRequest {
  id: string;
  ownerUid: string;
  preview: LeadPreview;
  matchedBuilderIds: string[];
  status: "submitted";
  /** Owner authenticated at submit time (always true in v1). */
  ownerVerified: boolean;
  /** 19C head-start window end (ISO). Null until the first unlock (T8). */
  headStartUntil: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * The gated PII payload from `connectionRequests/{id}/private/contact`.
 * Returned ONLY by `fetchUnlockedContact` after a `leadUnlocks` grant (T3),
 * or to the owner. The contact fields do not exist on `LeadPreview`, so
 * rendering them on a locked card is a compile error (7A).
 */
export interface UnlockedLeadContact {
  ownerContact: OwnerContact;
  streetAddress: string;
  exactAPN: string | null;
  /** Full feasibility snapshot incl. the certificate report text. */
  snapshot: ConnectionSnapshot;
}

export type BuilderResponseStatus = "new" | "interested" | "not-a-fit";

export interface BuilderResponse {
  builderId: string;
  status: BuilderResponseStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BuilderInboxItem {
  /** Redacted — no contact, no street address. */
  request: ConnectionRequest;
  response: BuilderResponse;
}
