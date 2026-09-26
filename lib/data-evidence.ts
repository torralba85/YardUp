/** How directly a returned value is supported by its cited source. */
export type EvidenceStatus =
  | "observed"
  | "derived"
  | "defaulted"
  | "unavailable";

/** Coarse confidence for one value, not for an entire mixed-source response. */
export type EvidenceConfidence = "high" | "medium" | "low" | "unknown";

/** Stable, user-safe lineage for a value. Never include credentialed URLs. */
export interface EvidenceSource {
  provider: string;
  dataset: string;
  recordId?: string;
  sourceUrl?: string;
}

/** Field-level provenance carried alongside the existing value contract. */
export interface DataEvidence {
  status: EvidenceStatus;
  source: EvidenceSource;
  /** Provider/source-data vintage, when the provider publishes one. */
  sourceAsOf?: string;
  /** Provider record-update time, distinct from source-data vintage. */
  sourceUpdatedAt?: string;
  /** ISO timestamp for this resolution attempt. */
  retrievedAt: string;
  confidence: EvidenceConfidence;
  warnings: string[];
}

export type ProviderOutcome =
  | "matched"
  | "no-match"
  | "unsupported"
  | "timeout"
  | "provider-error"
  | "invalid-response";

/** One provider's observable outcome during a lookup. */
export interface ProviderAttempt {
  provider: string;
  dataset: string;
  sourceUrl?: string;
  outcome: ProviderOutcome;
  detail?: string;
}
