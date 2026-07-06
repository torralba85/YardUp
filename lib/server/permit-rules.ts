/**
 * Deterministic ADU permit reference data — the same philosophy as
 * `lib/market/*`. These tracks and stage durations are the *source of truth*
 * the AI panel is allowed to cite; the model selects and explains them but must
 * never invent a track, statute, or timeline that isn't returned here. Treat the
 * numbers as planning estimates, not guarantees, and expand per-city over time.
 */

export interface PermitTrack {
  /** Stable id used to fetch this track's stage benchmarks. */
  id: string;
  name: string;
  type: "ministerial" | "discretionary";
  /** Statutory or programmatic basis, surfaced to the homeowner. */
  basis: string;
}

export interface PermitStageBenchmark {
  name: string;
  estWeeksLow: number;
  estWeeksHigh: number;
}

const DISCRETIONARY_DEFAULT: PermitTrack = {
  id: "local-discretionary",
  name: "Local discretionary review",
  type: "discretionary",
  basis:
    "Estimated — no statewide ministerial ADU mandate identified for this location. Confirm the actual process with your local permitting office.",
};

const TRACKS_BY_STATE: Record<string, PermitTrack[]> = {
  CA: [
    {
      id: "ca-state-adu-ministerial",
      name: "California State ADU (ministerial)",
      type: "ministerial",
      basis: "Cal. Gov. Code §65852.2 — 60-day ministerial ADU review, no discretionary hearing.",
    },
  ],
  WA: [
    {
      id: "wa-adu-ministerial",
      name: "Washington ADU (ministerial)",
      type: "ministerial",
      basis: "WA HB 1337 / RCW 36.70A.681 — ministerial ADU permitting in most urban residential zones.",
    },
  ],
  OR: [
    {
      id: "or-adu-ministerial",
      name: "Oregon ADU (ministerial)",
      type: "ministerial",
      basis: "ORS 197.312 — ADUs allowed outright in many single-family residential zones.",
    },
  ],
  TX: [
    {
      id: "tx-local-discretionary",
      name: "Local discretionary review (Texas)",
      type: "discretionary",
      basis: "No Texas statewide ADU mandate — governed by city land-use code (e.g. Austin LDC §25-2).",
    },
  ],
};

const STAGES_BY_TRACK: Record<string, PermitStageBenchmark[]> = {
  "ca-state-adu-ministerial": [
    { name: "Intake & completeness check", estWeeksLow: 1, estWeeksHigh: 2 },
    { name: "Plan check", estWeeksLow: 3, estWeeksHigh: 6 },
    { name: "Corrections & resubmittal", estWeeksLow: 2, estWeeksHigh: 4 },
    { name: "Permit issuance", estWeeksLow: 1, estWeeksHigh: 2 },
  ],
  "wa-adu-ministerial": [
    { name: "Intake & completeness check", estWeeksLow: 1, estWeeksHigh: 3 },
    { name: "Plan check", estWeeksLow: 4, estWeeksHigh: 8 },
    { name: "Corrections & resubmittal", estWeeksLow: 2, estWeeksHigh: 5 },
    { name: "Permit issuance", estWeeksLow: 1, estWeeksHigh: 2 },
  ],
  "or-adu-ministerial": [
    { name: "Intake & completeness check", estWeeksLow: 1, estWeeksHigh: 2 },
    { name: "Plan check", estWeeksLow: 3, estWeeksHigh: 7 },
    { name: "Corrections & resubmittal", estWeeksLow: 2, estWeeksHigh: 4 },
    { name: "Permit issuance", estWeeksLow: 1, estWeeksHigh: 2 },
  ],
  "tx-local-discretionary": [
    { name: "Intake & zoning review", estWeeksLow: 2, estWeeksHigh: 4 },
    { name: "Discretionary / land-use review", estWeeksLow: 4, estWeeksHigh: 10 },
    { name: "Plan check", estWeeksLow: 3, estWeeksHigh: 6 },
    { name: "Corrections & resubmittal", estWeeksLow: 2, estWeeksHigh: 5 },
    { name: "Permit issuance", estWeeksLow: 1, estWeeksHigh: 2 },
  ],
  "local-discretionary": [
    { name: "Intake & zoning review", estWeeksLow: 2, estWeeksHigh: 5 },
    { name: "Discretionary / land-use review", estWeeksLow: 4, estWeeksHigh: 12 },
    { name: "Plan check", estWeeksLow: 3, estWeeksHigh: 8 },
    { name: "Corrections & resubmittal", estWeeksLow: 2, estWeeksHigh: 6 },
    { name: "Permit issuance", estWeeksLow: 1, estWeeksHigh: 3 },
  ],
};

/** Parse a two-letter state code out of a `"City, ST 00000"` string. */
function parseStateCode(jurisdiction: string): string | null {
  const match = jurisdiction.match(/,\s*([A-Za-z]{2})\b/);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Candidate permit tracks for a jurisdiction (parsed from a `"City, ST"`
 * string). Falls back to a single discretionary estimate when the location has
 * no known statewide ADU pathway.
 */
export function lookupPermitTracks(jurisdiction: string): PermitTrack[] {
  const state = parseStateCode(jurisdiction);
  if (state && TRACKS_BY_STATE[state]) return TRACKS_BY_STATE[state];
  return [DISCRETIONARY_DEFAULT];
}

/** Typical stage durations for a track id, or `[]` if the id is unknown. */
export function getStageBenchmarks(trackId: string): PermitStageBenchmark[] {
  return STAGES_BY_TRACK[trackId] ?? [];
}
