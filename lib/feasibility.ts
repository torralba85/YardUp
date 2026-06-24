/**
 * Core feasibility and financial engine for ADU (accessory dwelling unit) studies.
 *
 * Given a parcel, an ADU design configuration, and a set of financial
 * assumptions, this module computes lot-coverage compliance, a construction
 * cost range, rental income, net operating income, and a simple payback
 * estimate. It also exposes the demo presets, default configurations, and
 * formatting helpers used across the studio UI.
 *
 * @module feasibility
 */
import type { Parcel } from "./parcel-types";
export type { Parcel } from "./parcel-types";

/** Roof geometry of the ADU; affects per-square-foot construction premium. */
export type RoofStyle = "shed" | "gable" | "flat";
/** Exterior cladding option; maps to a base cost-per-square-foot. */
export type ExteriorFinish = "cedar" | "lap" | "stucco" | "board";
/** Rental income scenario used to pick a monthly rent from a rent table. */
export type RentScenario = "conservative" | "market" | "optimistic";

/**
 * A built-in demo parcel with known rent expectations, used when live parcel
 * data is unavailable (demo mode).
 */
export interface ParcelPreset extends Parcel {
  /** Stable identifier (e.g. `"oak-street"`) used for lookup and routing. */
  id: string;
  /** Human-readable label shown in the preset picker. */
  name: string;
  /** Monthly rent for each scenario, used directly instead of an estimate. */
  expectedRent: Record<RentScenario, number>;
}

/**
 * User-adjustable design parameters for the proposed ADU. Drives both the 3D
 * scene geometry and the feasibility calculation.
 */
export interface ADUConfig {
  /** Selected footprint preset value in square feet (e.g. 600). */
  footprint: number;
  /** ADU width in feet. */
  width: number;
  /** ADU length in feet. */
  length: number;
  /** ADU height in feet; values above 16 trigger a review warning. */
  height: number;
  /** Roof geometry, which adds a per-square-foot cost premium. */
  roof: RoofStyle;
  /** Exterior finish, which sets the base cost per square foot. */
  finish: ExteriorFinish;
  /** Whether to include windows/doors, adding a flat openings cost premium. */
  includeOpenings: boolean;
}

/**
 * Cost and income assumptions applied to a feasibility calculation. These are
 * the financial "dials" a user can tune.
 */
export interface FinancialAssumptions {
  /** Base hard cost per square foot, keyed by exterior finish. */
  costPerSqft: Record<ExteriorFinish, number>;
  /** Multiplier applied to hard cost to account for soft costs (e.g. 1.18). */
  softCostMultiplier: number;
  /** Share of gross rent consumed by operating expenses (0–1). */
  operatingExpenseRatio: number;
  /** Which rent scenario to read from the rent table. */
  rentScenario: RentScenario;
}

/**
 * Computed output of {@link calculateFeasibility}: zoning compliance, a cost
 * range, and the income/return summary for the configured ADU.
 */
export interface FeasibilityResult {
  /** ADU floor area in square feet (`width * length`). */
  aduSqft: number;
  /** Combined footprint of the existing house plus the ADU, in square feet. */
  totalFootprint: number;
  /** Maximum buildable footprint allowed by the lot coverage limit. */
  allowedFootprint: number;
  /** Allowed footprint minus total footprint; negative means over-built. */
  remainingCapacity: number;
  /** Total footprint as a percentage of lot area. */
  coveragePercent: number;
  /** The parcel's maximum allowed lot coverage percentage. */
  maxCoveragePercent: number;
  /** Whether the design fits within the coverage allowance. */
  zoningStatus: "Compliant" | "Review needed";
  /** Low end of the all-in construction cost range, rounded to $1,000. */
  costLow: number;
  /** High end of the all-in construction cost range, rounded to $1,000. */
  costHigh: number;
  /** Low cost expressed per square foot of ADU. */
  costPerSqftLow: number;
  /** High cost expressed per square foot of ADU. */
  costPerSqftHigh: number;
  /** Monthly rent selected from the rent table for the chosen scenario. */
  monthlyRent: number;
  /** Annual net operating income after operating expenses. */
  annualNoi: number;
  /** Estimated years to recoup the mid construction cost from NOI. */
  paybackYears: number;
  /** Human-readable cautions (coverage overage, height review, etc.). */
  warnings: string[];
}

/**
 * Built-in demo parcels (Seattle, Portland, Austin) used when no live parcel
 * API key is configured. The first entry is the default fallback.
 */
export const parcelPresets: ParcelPreset[] = [
  {
    id: "oak-street",
    name: "Typical R-1 Lot",
    address: "1234 Oak Street",
    city: "Seattle, WA 98115",
    lotArea: 5000,
    lotWidth: 40,
    lotLength: 125,
    existingHouseSqft: 1380,
    maxLotCoveragePercent: 40,
    setbacks: { front: 20, rear: 25, side: 5 },
    expectedRent: { conservative: 2050, market: 2350, optimistic: 2650 },
  },
  {
    id: "corner-lot",
    name: "Corner Family Lot",
    address: "812 Linden Avenue",
    city: "Portland, OR 97212",
    lotArea: 7200,
    lotWidth: 60,
    lotLength: 120,
    existingHouseSqft: 1720,
    maxLotCoveragePercent: 42,
    setbacks: { front: 18, rear: 20, side: 6 },
    expectedRent: { conservative: 2250, market: 2600, optimistic: 2950 },
  },
  {
    id: "compact-lot",
    name: "Compact Urban Lot",
    address: "44 Mesa Court",
    city: "Austin, TX 78704",
    lotArea: 4200,
    lotWidth: 35,
    lotLength: 120,
    existingHouseSqft: 1500,
    maxLotCoveragePercent: 38,
    setbacks: { front: 15, rear: 15, side: 5 },
    expectedRent: { conservative: 1850, market: 2150, optimistic: 2450 },
  },
];

/**
 * Selectable ADU footprint presets. Each option pairs a square-footage value
 * with the width/length dimensions used to render the 3D massing.
 */
export const footprintOptions = [
  { label: "400 sf", value: 400, width: 20, length: 20, summary: "Studio / office" },
  { label: "600 sf", value: 600, width: 20, length: 30, summary: "1 bed / 1 bath" },
  { label: "800 sf", value: 800, width: 25, length: 32, summary: "Large 1 bed" },
  { label: "1,000 sf", value: 1000, width: 25, length: 40, summary: "2 bed concept" },
];

/** Default ADU configuration the studio starts from (a 600 sf, 1 bed concept). */
export const defaultAduConfig: ADUConfig = {
  footprint: 600,
  width: 20,
  length: 30,
  height: 12,
  roof: "shed",
  finish: "cedar",
  includeOpenings: true,
};

/** Default financial assumptions (mid-market cost and expense inputs). */
export const defaultFinancialAssumptions: FinancialAssumptions = {
  costPerSqft: {
    cedar: 340,
    lap: 315,
    stucco: 330,
    board: 355,
  },
  softCostMultiplier: 1.18,
  operatingExpenseRatio: 0.325,
  rentScenario: "conservative",
};

/** Display labels for each {@link RoofStyle}. */
export const roofLabels: Record<RoofStyle, string> = {
  shed: "Shed",
  gable: "Gable",
  flat: "Flat",
};

/** Display labels for each {@link ExteriorFinish}. */
export const finishLabels: Record<ExteriorFinish, string> = {
  cedar: "Cedar",
  lap: "Lap Siding",
  stucco: "Stucco",
  board: "Board & Batten",
};

/** Approximate render colors (hex) for each {@link ExteriorFinish}. */
export const finishColors: Record<ExteriorFinish, string> = {
  cedar: "#a66a3c",
  lap: "#c8c4b8",
  stucco: "#d8d2c4",
  board: "#2f3437",
};

/**
 * Look up a demo parcel preset by id.
 *
 * @param parcelId - The preset id to find (e.g. `"oak-street"`).
 * @returns The matching preset, or the first preset as a fallback.
 *
 * @remarks
 * Never returns `undefined`: an unknown id resolves to {@link parcelPresets}[0]
 * (the Seattle "Typical R-1 Lot"), so callers can use the result directly.
 *
 * @example
 * getParcelById("compact-lot").city; // "Austin, TX 78704"
 * getParcelById("does-not-exist").id; // "oak-street" (fallback)
 */
export function getParcelById(parcelId: string) {
  return parcelPresets.find((parcel) => parcel.id === parcelId) ?? parcelPresets[0];
}

/**
 * Apply a footprint preset to an existing ADU config, updating the footprint
 * value along with the width and length that match it.
 *
 * @param footprint - Footprint value in square feet to switch to.
 * @param config - The current ADU configuration to extend.
 * @returns A new config with footprint/width/length set; other fields are preserved.
 *   Falls back to the 600 sf option if `footprint` matches no preset.
 *
 * @remarks
 * Returns a new object (the input `config` is not mutated). Only `footprint`,
 * `width`, and `length` change; `height`, `roof`, `finish`, and
 * `includeOpenings` are carried over unchanged.
 *
 * @example
 * const next = configForFootprint(800, defaultAduConfig);
 * next.footprint; // 800
 * next.width;     // 25
 * next.length;    // 32
 * next.finish;    // "cedar" (preserved from defaultAduConfig)
 */
export function configForFootprint(footprint: number, config: ADUConfig): ADUConfig {
  const option = footprintOptions.find((item) => item.value === footprint) ?? footprintOptions[1];
  return {
    ...config,
    footprint: option.value,
    width: option.width,
    length: option.length,
  };
}

/**
 * Run the full feasibility study for a parcel and ADU design.
 *
 * Coverage is checked against the parcel's `maxLotCoveragePercent`. The cost
 * range is built from a hard cost (ADU area times the finish/roof cost, plus a
 * flat openings premium), scaled by the soft-cost multiplier, then spread to a
 * low/high band rounded to the nearest $1,000. Income uses the rent table
 * (passed in, taken from a preset, or estimated from lot size) to derive annual
 * NOI and a simple payback period.
 *
 * @param parcel - The lot being analyzed (dimensions, existing house, coverage limit).
 * @param config - The proposed ADU design parameters.
 * @param assumptions - Cost and income assumptions to apply.
 * @param expectedRent - Optional rent table overriding any preset/estimated rent.
 * @returns A {@link FeasibilityResult} with coverage, cost, income, and warnings.
 *
 * @remarks
 * The monthly rent is resolved by precedence: the explicit `expectedRent`
 * argument, then the parcel's own `expectedRent` (preset parcels only), then a
 * lot-size heuristic for live/estimated parcels. The function is pure and never
 * throws — over-coverage and excessive height surface as entries in
 * {@link FeasibilityResult.warnings} rather than errors, and `zoningStatus`
 * flips to `"Review needed"` when the footprint exceeds the coverage allowance.
 *
 * @example
 * // A demo preset already carries its own rent table.
 * const parcel = getParcelById("oak-street");
 * const result = calculateFeasibility(
 *   parcel,
 *   defaultAduConfig,
 *   defaultFinancialAssumptions,
 * );
 * result.zoningStatus; // "Compliant"
 * result.monthlyRent;  // 2050  (conservative scenario, from the preset)
 * result.paybackYears; // ~15.1
 *
 * @example
 * // Override the rent table for a live parcel and read an optimistic scenario.
 * const result = calculateFeasibility(liveParcel, config, {
 *   ...defaultFinancialAssumptions,
 *   rentScenario: "optimistic",
 * }, { conservative: 2200, market: 2550, optimistic: 2900 });
 * result.monthlyRent; // 2900
 *
 * @see buildReportText — renders a {@link FeasibilityResult} into a certificate.
 */
export function calculateFeasibility(
  parcel: Parcel,
  config: ADUConfig,
  assumptions: FinancialAssumptions,
  expectedRent?: Record<RentScenario, number>,
): FeasibilityResult {
  const aduSqft = config.width * config.length;
  const totalFootprint = parcel.existingHouseSqft + aduSqft;
  const allowedFootprint = Math.round(parcel.lotArea * (parcel.maxLotCoveragePercent / 100));
  const remainingCapacity = allowedFootprint - totalFootprint;
  const coveragePercent = (totalFootprint / parcel.lotArea) * 100;
  const baseCostPerSqft = assumptions.costPerSqft[config.finish];
  const roofPremium = config.roof === "gable" ? 18 : config.roof === "flat" ? 8 : 0;
  const openingPremium = config.includeOpenings ? 9000 : 0;
  const hardCost = aduSqft * (baseCostPerSqft + roofPremium) + openingPremium;
  const costMid = hardCost * assumptions.softCostMultiplier;
  const costLow = Math.round((costMid * 0.92) / 1000) * 1000;
  const costHigh = Math.round((costMid * 1.15) / 1000) * 1000;
  // For live parcels, expectedRent is passed separately or estimated from lotArea.
  const rentTable = expectedRent ?? ("expectedRent" in parcel ? (parcel as ParcelPreset).expectedRent : estimateRent(parcel.lotArea));
  const monthlyRent = rentTable[assumptions.rentScenario];
  const annualNoi = Math.round(monthlyRent * 12 * (1 - assumptions.operatingExpenseRatio));
  const paybackYears = Number((costMid / annualNoi).toFixed(1));
  const warnings: string[] = [];

  if (remainingCapacity < 0) {
    warnings.push(`Footprint exceeds local coverage allowance by ${Math.abs(remainingCapacity).toLocaleString()} sf.`);
  }

  if (config.height > 16) {
    warnings.push("Height should be reviewed against local accessory structure limits.");
  }

  return {
    aduSqft,
    totalFootprint,
    allowedFootprint,
    remainingCapacity,
    coveragePercent,
    maxCoveragePercent: parcel.maxLotCoveragePercent,
    zoningStatus: remainingCapacity >= 0 ? "Compliant" : "Review needed",
    costLow,
    costHigh,
    costPerSqftLow: Math.round(costLow / aduSqft),
    costPerSqftHigh: Math.round(costHigh / aduSqft),
    monthlyRent,
    annualNoi,
    paybackYears,
    warnings,
  };
}

/**
 * Estimate expected rent for a live parcel that doesn't have preset rent data.
 * Uses a simple lot-size heuristic — callers should treat this as a rough estimate.
 */
function estimateRent(lotArea: number): Record<RentScenario, number> {
  const base = lotArea < 5000 ? 1800 : lotArea < 7000 ? 2100 : 2400;
  return {
    conservative: base,
    market: Math.round(base * 1.15),
    optimistic: Math.round(base * 1.3),
  };
}

/**
 * Format a number as whole US dollars (no cents).
 *
 * @param value - The amount to format.
 * @returns A localized currency string, e.g. `"$120,000"`.
 *
 * @example
 * formatCurrency(120000); // "$120,000"
 * formatCurrency(2050);   // "$2,050"
 * formatCurrency(0);      // "$0"
 */
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a dollar amount compactly, abbreviating thousands as `K`.
 *
 * @param value - The amount to format.
 * @returns `"$120K"` for values >= 1,000; otherwise the full currency string.
 *
 * @remarks
 * Thousands are rounded to the nearest whole `K` (e.g. `251340 → "$251K"`),
 * so this is for at-a-glance display, not precise figures. Values below 1,000
 * fall through to {@link formatCurrency}.
 *
 * @example
 * formatCompactCurrency(251340); // "$251K"
 * formatCompactCurrency(2050);   // "$2K"
 * formatCompactCurrency(850);    // "$850"
 */
export function formatCompactCurrency(value: number) {
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }

  return formatCurrency(value);
}
