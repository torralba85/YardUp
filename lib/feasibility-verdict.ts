/**
 * Feasibility verdict + constraint derivation.
 *
 * The redesigned studio leads with a *feasibility verdict* and the lot's real
 * constraints rather than the income figure. This module turns the existing
 * engine output (`calculateFeasibility`) plus the parcel into the shape the
 * verdict band and constraints panel render.
 *
 * IMPORTANT — honesty boundary:
 *   The engine knows zoning headroom, coverage, buildable envelope, rent and
 *   cost. It does NOT know sewer/utility capacity or easements/overlays.
 *   Those two items are surfaced as permanent "verify locally" review lines so
 *   the verdict never over-promises. If/when the engine gains that data, set
 *   their status from it and the readiness score updates automatically.
 */

import {
  formatCompactCurrency,
  formatCurrency,
  type ADUConfig,
  type FeasibilityResult,
  type Parcel,
} from "./feasibility";
import { type PlacementResult } from "./placement-validation";
import { describePlacementWithEvidence } from "./placement-evidence";
import { parcelConfidence } from "./parcel-confidence";
import { modeledSetbackAreaSqft } from "./parcel-geometry";
import type { GeoJsonPolygon } from "./parcel-types";
import { aduSetbackNote, aduSetbacks, type AduFootprint, type AduSetbacks } from "./adu-setbacks";

export type VerdictLevel = "Likely Feasible" | "Needs Review" | "Unlikely";

export type ConstraintStatus = "clear" | "review" | "blocked" | "info";

export type ConstraintGroup =
  | "Zoning & setbacks"
  | "Site & utilities"
  | "Economics";

export interface ConstraintItem {
  id: string;
  group: ConstraintGroup;
  label: string;
  detail: string;
  status: ConstraintStatus;
  /** Mono value shown on the right (used instead of a chip for info rows). */
  value?: string;
}

export interface FeasibilitySummary {
  verdict: VerdictLevel;
  /** 0–100. 100 minus penalties for open review items and blockers. */
  readiness: number;
  /** e.g. "2 items to confirm before permit". */
  reviewNote: string;
  /** Usable area inside the setback envelope, sq ft. */
  buildableSqft: number;
  constraints: ConstraintItem[];
  clearedCount: number;
  openCount: number;
}

/**
 * Usable lot area remaining after applying the ADU's setbacks
 * (`lib/adu-setbacks.ts`). Pass the config so height-based rules apply.
 */
export function buildableArea(
  parcel: Parcel & { boundaryGeoJson?: GeoJsonPolygon | null },
  config?: AduFootprint,
): number {
  const setbacks = aduSetbacks(parcel, config);
  const usableWidth = Math.max(0, parcel.lotWidth - setbacks.side * 2);
  const usableDepth = Math.max(
    0,
    parcel.lotLength - setbacks.front - setbacks.rear,
  );
  const area = parcel.boundaryGeoJson
    ? modeledSetbackAreaSqft(parcel.boundaryGeoJson, setbacks)
    : usableWidth * usableDepth;
  // An invalid polygon cannot establish usable land. Published lot area is a
  // final upper bound because geometry and assessor area can differ.
  return Math.max(0, Math.min(Math.round(area ?? 0), Math.floor(parcel.lotArea)));
}

/**
 * Verdict tone as raw CSS-variable values (not Tailwind classes) so components
 * apply them via inline `style` — robust regardless of whether the project's
 * Tailwind theme registers the `-soft` / `-money-on-dark` color utilities.
 */
export interface VerdictTone {
  /** Foreground on light surfaces. */
  color: string;
  /** Foreground on the dark espresso band. */
  onDark: string;
  /** Faint fill for chips. */
  soft: string;
}

const VERDICT_TONE: Record<VerdictLevel, VerdictTone> = {
  "Likely Feasible": {
    color: "var(--color-status-eligible)",
    onDark: "var(--color-status-eligible-on-dark)",
    soft: "var(--color-status-eligible-soft)",
  },
  "Needs Review": {
    color: "var(--color-status-review)",
    onDark: "var(--color-status-review-on-dark)",
    soft: "var(--color-status-review-soft)",
  },
  Unlikely: {
    color: "var(--color-status-blocked)",
    onDark: "var(--color-status-blocked-on-dark)",
    soft: "var(--color-status-blocked-soft)",
  },
};

export function verdictTone(level: VerdictLevel): VerdictTone {
  return VERDICT_TONE[level];
}

/** Tone for an individual constraint status. */
export function statusTone(status: ConstraintStatus): VerdictTone {
  switch (status) {
    case "clear":
      return { color: "var(--color-status-eligible)", onDark: "var(--color-status-eligible-on-dark)", soft: "var(--color-status-eligible-soft)" };
    case "review":
      return { color: "var(--color-status-review)", onDark: "var(--color-status-review-on-dark)", soft: "var(--color-status-review-soft)" };
    case "blocked":
      return { color: "var(--color-status-blocked)", onDark: "var(--color-status-blocked-on-dark)", soft: "var(--color-status-blocked-soft)" };
    default:
      return { color: "var(--color-lot-stone)", onDark: "var(--color-lot-stone-on-dark)", soft: "var(--color-lot-stone-soft)" };
  }
}

function fitsWithinEnvelope(
  parcel: Parcel,
  setbacks: AduSetbacks,
  footprint: Pick<ADUConfig, "width" | "length">,
): boolean {
  const usableWidth = Math.max(0, parcel.lotWidth - setbacks.side * 2);
  const usableDepth = Math.max(
    0,
    parcel.lotLength - setbacks.front - setbacks.rear,
  );
  return (
    (footprint.width <= usableWidth && footprint.length <= usableDepth) ||
    (footprint.length <= usableWidth && footprint.width <= usableDepth)
  );
}

export function summarizeFeasibility(
  parcel: Parcel,
  result: FeasibilityResult,
  config?: AduFootprint,
  placement: PlacementResult | undefined = result.placement,
): FeasibilitySummary {
  const setbacks = aduSetbacks(parcel, config);
  const setbackNote = aduSetbackNote(setbacks.rule);
  const buildableSqft = buildableArea(parcel, config);
  const { footprintKnown, regulationsEstimated } = parcelConfidence(parcel);
  const coverageUnverified = !footprintKnown || regulationsEstimated;
  const compliant = result.zoningStatus === "Compliant";
  const hasCapacity = result.remainingCapacity >= 0;
  // Room set by California's 800 sq ft protection, not the coverage limit.
  const stateFloor = result.capacityBasis === "california-800";
  const overCoverageButProtected = stateFloor && hasCapacity && result.coveragePercent > result.maxCoveragePercent;
  // remainingCapacity is the engine's canonical coverage signal and also
  // drives zoningStatus. Reuse it everywhere so the verdict and rows cannot
  // disagree because allowedFootprint is rounded while coveragePercent is not.
  const coverageOk = hasCapacity;
  const envelopeFits = placement ? placement.envelopeStatus === "fits" : config
    ? config.width <= parcel.lotWidth - setbacks.side * 2 && config.length <= parcel.lotLength - setbacks.front - setbacks.rear
    : buildableSqft >= result.aduSqft;
  const minimumEnvelopeFits = fitsWithinEnvelope(parcel, setbacks, { width: 20, length: 20 });

  // Live parcels carry a raw zoning code; presets don't.
  const zoneCode = "zoning" in parcel ? String((parcel as { zoning: string }).zoning) : undefined;

  const constraints: ConstraintItem[] = [
    {
      id: "zoning",
      group: "Zoning & setbacks",
      label: "Zoning · ADU allowed",
      detail: regulationsEstimated
        ? "Zoning and ADU permission are unverified — confirm local planning rules"
        : compliant
        ? `${zoneCode ? zoneCode + " — " : ""}ADU appears permitted under current rules`
        : "Proposed footprint needs review against local limits",
      status: compliant && !regulationsEstimated ? "clear" : "review",
    },
    {
      id: "buildable",
      group: "Zoning & setbacks",
      label: "Estimated area after modeled setbacks",
      detail: `${regulationsEstimated ? "Assumed setbacks: " : ""}${setbacks.side}′ side · ${setbacks.front}′ front · ${setbacks.rear}′ rear${setbackNote ? `. ${setbackNote.replace(/\.$/, "")}` : ""}${"source" in parcel ? ". Frontage and setback-axis alignment are unverified." : ""}`,
      status: envelopeFits && !regulationsEstimated && !("source" in parcel) ? "clear" : "review",
      value: `${buildableSqft.toLocaleString()} sf`,
    },
    {
      id: "capacity",
      group: "Zoning & setbacks",
      label: "Remaining build capacity",
      detail: !footprintKnown ? "Existing building footprint is unknown"
        : stateFloor ? (hasCapacity ? "Room up to the 800 sf California protects from lot-coverage limits" : "Over the 800 sf California protects from lot-coverage limits")
        : regulationsEstimated ? "Estimate using an unverified coverage limit"
        : hasCapacity
        ? "Headroom under the lot-coverage allowance"
        : "Exceeds the lot-coverage allowance",
      status: coverageUnverified ? "review" : hasCapacity ? "info" : "blocked",
      value: !footprintKnown ? "Unknown" : `${result.remainingCapacity.toLocaleString()} sf${regulationsEstimated ? " (assumed)" : ""}`,
    },
    {
      id: "coverage",
      group: "Zoning & setbacks",
      label: "Lot coverage vs. max",
      detail: !footprintKnown ? "Existing building footprint is unknown"
        : overCoverageButProtected ? `Over the ${regulationsEstimated ? "assumed " : ""}limit, but California doesn't let coverage block an ADU up to 800 sf (Gov. Code § 66321(b)(3))`
        : regulationsEstimated ? "Maximum coverage is assumed — verify locally"
        : "Existing house plus the proposed ADU",
      status: coverageUnverified ? "review" : coverageOk ? "clear" : "blocked",
      value: !footprintKnown ? "Unknown" : `${Math.round(result.coveragePercent)}% / ${result.maxCoveragePercent}%${regulationsEstimated ? " (assumed max)" : ""}`,
    },
    // ── Not in the engine — honest, always-verify lines ──────────────
    {
      id: "utilities",
      group: "Site & utilities",
      label: "Sewer / utility access",
      detail: "Not in this estimate — confirm lateral capacity locally",
      status: "review",
    },
    {
      id: "easements",
      group: "Site & utilities",
      label: "Easements & overlays",
      detail: "Not in this estimate — check title and flood / fire maps",
      status: "review",
    },
    // ── Economics (info, never a pass/fail) ──────────────────────────
    {
      id: "rent",
      group: "Economics",
      label: "Estimated rent",
      detail: `${formatCurrency(result.annualNoi)} annual NOI`,
      status: "info",
      value: `${formatCurrency(result.monthlyRent)}/mo`,
    },
    {
      id: "cost",
      group: "Economics",
      label: "Build cost & payback",
      detail: `~${result.paybackYears} yr payback at mid-range`,
      status: "info",
      value: `${formatCompactCurrency(result.costLow)}–${formatCompactCurrency(result.costHigh)}`,
    },
  ];

  const feedback = placement ? describePlacementWithEvidence(placement, parcel) : undefined;
  // Model geometry can fit while its real-world alignment remains unverified.
  // Count the same evidence-aware status shown in the row in the aggregate.
  const placementReview = feedback !== undefined && feedback.tone !== "clear";
  if (feedback) {
    constraints.push({
      id: "placement",
      group: "Site & utilities",
      label: "Modeled ADU placement",
      detail: feedback.missingEvidenceNotice ? `${feedback.detail} ${feedback.missingEvidenceNotice}` : feedback.detail,
      status: feedback.tone,
    });
  }
  const cleared = constraints.filter((c) => c.status === "clear").length;

  // Verdict derives from distinct real signals — NOT a naive status count.
  // Coverage and zoning normally describe the same engine result, so count
  // them once. Keep a distinct zoning-review path for future data sources that
  // can flag zoning independently. A selected concept that misses the setback
  // envelope is reviewable; only failure to fit the minimum 20x20 unit makes
  // the lot itself unlikely.
  const overCoverage = !coverageOk && !coverageUnverified;
  const zoningReview = coverageUnverified || (!compliant && !overCoverage);
  const envelopeTooSmall = !minimumEnvelopeFits;
  const envelopeReview = !envelopeTooSmall && !envelopeFits;
  const verifyOpen = 2;

  let verdict: VerdictLevel;
  if (envelopeTooSmall) verdict = "Unlikely";
  else if (overCoverage || zoningReview || envelopeReview || placementReview) verdict = "Needs Review";
  else verdict = "Likely Feasible";

  // Readiness — 100 minus weighted penalties. Default preset (compliant, the
  // two verify items) lands at 82.
  const readiness = Math.max(
    0,
    Math.min(
      100,
      100 -
        (envelopeTooSmall ? 55 : 0) -
        (overCoverage ? 25 : 0) -
        (zoningReview ? 9 : 0) -
        (envelopeReview ? 15 : 0) -
        (placementReview ? 15 : 0) -
        verifyOpen * 9,
    ),
  );

  const open =
    (envelopeTooSmall ? 1 : 0) +
    (overCoverage ? 1 : 0) +
    (zoningReview ? 1 : 0) +
    (envelopeReview ? 1 : 0) +
    (placementReview ? 1 : 0) +
    verifyOpen;

  const reviewNote =
    open === 0
      ? "All checked items clear"
      : `${open} item${open > 1 ? "s" : ""} to confirm before permit`;

  return {
    verdict,
    readiness,
    reviewNote,
    buildableSqft,
    constraints,
    clearedCount: cleared,
    openCount: open,
  };
}
