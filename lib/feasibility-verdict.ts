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

export type VerdictLevel = "Likely Feasible" | "Needs Review" | "Unlikely";

export type ConstraintStatus = "clear" | "review" | "blocked" | "info";

export type ConstraintGroup =
  | "Zoning & envelope"
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

/** Usable lot area remaining after applying the recorded setbacks. */
export function buildableArea(parcel: Parcel): number {
  const usableWidth = Math.max(0, parcel.lotWidth - parcel.setbacks.side * 2);
  const usableDepth = Math.max(
    0,
    parcel.lotLength - parcel.setbacks.front - parcel.setbacks.rear,
  );
  return Math.round(usableWidth * usableDepth);
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
    color: "var(--color-lf-forest)",
    onDark: "var(--color-lf-money-on-dark)",
    soft: "var(--color-lf-forest-soft)",
  },
  "Needs Review": {
    color: "var(--color-lf-amber-ink)",
    onDark: "#E0B463",
    soft: "var(--color-lf-amber-soft)",
  },
  Unlikely: {
    color: "var(--color-lf-brick)",
    onDark: "#D98A77",
    soft: "var(--color-lf-brick-soft)",
  },
};

export function verdictTone(level: VerdictLevel): VerdictTone {
  return VERDICT_TONE[level];
}

/** Tone for an individual constraint status. */
export function statusTone(status: ConstraintStatus): VerdictTone {
  switch (status) {
    case "clear":
      return { color: "var(--color-lf-forest)", onDark: "var(--color-lf-money-on-dark)", soft: "var(--color-lf-forest-soft)" };
    case "review":
      return { color: "var(--color-lf-amber-ink)", onDark: "#E0B463", soft: "var(--color-lf-amber-soft)" };
    case "blocked":
      return { color: "var(--color-lf-brick)", onDark: "#D98A77", soft: "var(--color-lf-brick-soft)" };
    default:
      return { color: "var(--color-lf-muted)", onDark: "var(--color-lf-taupe)", soft: "var(--color-lf-taupe-soft)" };
  }
}

function fitsWithinEnvelope(
  parcel: Parcel,
  footprint: Pick<ADUConfig, "width" | "length">,
): boolean {
  const usableWidth = Math.max(0, parcel.lotWidth - parcel.setbacks.side * 2);
  const usableDepth = Math.max(
    0,
    parcel.lotLength - parcel.setbacks.front - parcel.setbacks.rear,
  );
  return (
    (footprint.width <= usableWidth && footprint.length <= usableDepth) ||
    (footprint.length <= usableWidth && footprint.width <= usableDepth)
  );
}

export function summarizeFeasibility(
  parcel: Parcel,
  result: FeasibilityResult,
  config?: Pick<ADUConfig, "width" | "length">,
): FeasibilitySummary {
  const buildableSqft = buildableArea(parcel);
  const compliant = result.zoningStatus === "Compliant";
  const hasCapacity = result.remainingCapacity >= 0;
  // remainingCapacity is the engine's canonical coverage signal and also
  // drives zoningStatus. Reuse it everywhere so the verdict and rows cannot
  // disagree because allowedFootprint is rounded while coveragePercent is not.
  const coverageOk = hasCapacity;
  const envelopeFits = config
    ? fitsWithinEnvelope(parcel, config)
    : buildableSqft >= result.aduSqft;
  const minimumEnvelopeFits = fitsWithinEnvelope(parcel, { width: 20, length: 20 });

  // Live parcels carry a raw zoning code; presets don't.
  const zoneCode = "zoning" in parcel ? String((parcel as { zoning: string }).zoning) : undefined;

  const constraints: ConstraintItem[] = [
    {
      id: "zoning",
      group: "Zoning & envelope",
      label: "Zoning · ADU allowed",
      detail: compliant
        ? `${zoneCode ? zoneCode + " — " : ""}ADU appears permitted under current rules`
        : "Proposed footprint needs review against local limits",
      status: compliant ? "clear" : "review",
    },
    {
      id: "buildable",
      group: "Zoning & envelope",
      label: "Buildable area after setbacks",
      detail: `${parcel.setbacks.side}′ side · ${parcel.setbacks.front}′ front · ${parcel.setbacks.rear}′ rear`,
      status: envelopeFits ? "clear" : "review",
      value: `${buildableSqft.toLocaleString()} sf`,
    },
    {
      id: "capacity",
      group: "Zoning & envelope",
      label: "Remaining build capacity",
      detail: hasCapacity
        ? "Headroom under the lot-coverage allowance"
        : "Exceeds the lot-coverage allowance",
      status: hasCapacity ? "info" : "blocked",
      value: `${result.remainingCapacity.toLocaleString()} sf`,
    },
    {
      id: "coverage",
      group: "Zoning & envelope",
      label: "Lot coverage vs. max",
      detail: "Existing house plus the proposed ADU",
      status: coverageOk ? "clear" : "blocked",
      value: `${Math.round(result.coveragePercent)}% / ${result.maxCoveragePercent}%`,
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

  const cleared = constraints.filter((c) => c.status === "clear").length;

  // Verdict derives from distinct real signals — NOT a naive status count.
  // Coverage and zoning normally describe the same engine result, so count
  // them once. Keep a distinct zoning-review path for future data sources that
  // can flag zoning independently. A selected concept that misses the setback
  // envelope is reviewable; only failure to fit the minimum 20x20 unit makes
  // the lot itself unlikely.
  const overCoverage = !coverageOk;
  const zoningReview = !compliant && !overCoverage;
  const envelopeTooSmall = !minimumEnvelopeFits;
  const envelopeReview = !envelopeTooSmall && !envelopeFits;
  const verifyOpen = 2;

  let verdict: VerdictLevel;
  if (envelopeTooSmall) verdict = "Unlikely";
  else if (overCoverage || zoningReview || envelopeReview) verdict = "Needs Review";
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
        verifyOpen * 9,
    ),
  );

  const open =
    (envelopeTooSmall ? 1 : 0) +
    (overCoverage ? 1 : 0) +
    (zoningReview ? 1 : 0) +
    (envelopeReview ? 1 : 0) +
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
