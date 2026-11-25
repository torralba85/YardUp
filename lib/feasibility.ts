import type { PlacementResult } from "./placement-validation";
import type { Pose2D } from "./scene-model";
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
import { calculateZoning, type CapacityBasis } from "./zoning";
import { calculateFinance, type ConstructionBudget } from "./finance";
import type {
  BedroomClass,
  MarketData,
  MarketProvenance,
  OperatingExpenseBreakdown,
} from "./market/market-types";
import { bedroomClassForFootprint } from "./market/bedroom";
import { marketBasisLabel } from "./market/market-basis";
import { NATIONAL_MARKET_BASELINE } from "./market/national-baseline";

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
  /** Bedroom mix applied to the curated 1BR demo table; not observed comps. */
  rentBedroomRatios?: Record<BedroomClass, number>;
  /** Bedroom-specific market anchors, when the demo uses a published rent source. */
  marketData?: MarketData;
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
  /** Wall height in feet. Roof rise is added by the shared scene model. */
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
  /** Absent only on historical saved results. Components reconcile to the engine's central estimate. */
  costBreakdown?: ConstructionBudget;
  /** False means coverage arithmetic omits an unknown existing footprint. */
  footprintKnown?: boolean;
  /** True means the regulatory limits are assumptions, not confirmed rules. */
  regulationsEstimated?: boolean;
  /** Current committed placement; coverage remains an independent calculation. */
  placement?: PlacementResult;
  placementPose?: Pose2D;
  /** ADU floor area in square feet (`width * length`). */
  aduSqft: number;
  /** Combined footprint of the existing house plus the ADU, in square feet. */
  totalFootprint: number;
  /** Maximum buildable footprint allowed by the lot coverage limit. */
  allowedFootprint: number;
  /**
   * Room left for the ADU under {@link capacityBasis}: the coverage allowance
   * minus the total footprint, or 800 sq ft minus the ADU. Negative means over.
   */
  remainingCapacity: number;
  /** What sets the room: the coverage limit, or California's 800 sq ft protection. Absent on older saves. */
  capacityBasis?: CapacityBasis;
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
  /** Conservative through optimistic rent scenarios; not a confidence interval. */
  rentRange?: { low: number; high: number };
  /** Annual net operating income after operating expenses. */
  annualNoi: number;
  /** Estimated years to recoup the mid construction cost from NOI. */
  paybackYears: number;
  /** Human-readable cautions (coverage overage, height review, etc.). */
  warnings: string[];
  /** True when the design exceeds the model’s height screening threshold. */
  heightReviewRequired?: boolean;
  /** One-line citation for the rent figure (source + area + bedroom). */
  rentBasis: string;
  /** Provenance of the financial figures: source, freshness, confidence. */
  market: MarketProvenance;
  /** The operating-expense ratio actually applied to gross rent (0–1). */
  operatingExpenseRatio: number;
  /** Component shares behind {@link operatingExpenseRatio}, when localized. */
  opexBreakdown?: OperatingExpenseBreakdown;
}

/**
 * Built-in demo parcels (Seattle, Portland, Austin, San Diego) used when no live parcel
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
    // Bedroom mix from the matching ZIP seed in lib/server/market/data/fmr.json.
    rentBedroomRatios: { studio: 1820 / 2000, "1br": 1, "2br": 2430 / 2000 },
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
    // Bedroom mix from the matching ZIP seed in lib/server/market/data/fmr.json.
    rentBedroomRatios: { studio: 1550 / 1720, "1br": 1, "2br": 2060 / 1720 },
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
    // Bedroom mix from the matching ZIP seed in lib/server/market/data/fmr.json.
    rentBedroomRatios: { studio: 1500 / 1700, "1br": 1, "2br": 2050 / 1700 },
  },
  {
    id: "coyote-brush",
    name: "San Diego RS-1-7 Lot",
    address: "1234 Coyote Brush Court", // Fictional; no such county street in OpenStreetMap (2026-10-17).
    city: "San Diego, CA 92117",
    lotArea: 5000, // SDMC § 131.0431 Table 131-04D: RS-1-7 minimum 5,000 sf, 50 ft wide, 95 ft deep.
    lotWidth: 50,
    lotLength: 100,
    existingHouseSqft: 1400, // Illustrative; no primary source.
    maxLotCoveragePercent: 60, // Modeling proxy from 0.60 FAR (Table 131-04J), not a flat-lot coverage cap.
    regulationsEstimated: true,
    setbacks: { front: 15, rear: 13, side: 4 }, // RS-1-7 base zone (Table 131-04D); ADU side/rear: lib/adu-setbacks.ts.
    expectedRent: { conservative: 2335, market: 2615, optimistic: 2919 }, // HUD FY2027 San Diego County 1BR FMR; standard 1.0/1.12/1.25 spreads.
    marketData: {
      rentByBedroom: { studio: 2192, "1br": 2335, "2br": 2823 }, // Mirrors content/adu/ca/rent.ts (HUD FY2027, verified 2026-10-28).
      costMultiplier: 1,
      source: "hud-county",
      area: "San Diego County, CA",
      asOf: "HUD FY2027 FMR (effective 2026-10-01)",
      sourceUrl: "https://www.huduser.gov/datasets/fmr/fmr2027",
      confidence: "medium",
    },
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
 * The demo lot the Studio opens on: San Diego, because every marketing surface
 * sells California and San Diego lots. `parcelPresets[0]` (Seattle) stays the
 * internal fallback for unknown ids and estimated parcels.
 */
export const DEFAULT_PARCEL_ID = "coyote-brush";

/** The Studio's default demo parcel. */
export const defaultParcelPreset: ParcelPreset = getParcelById(DEFAULT_PARCEL_ID);

/** The demo lots in the order the Studio offers them: the default first. */
export const demoPresets: ParcelPreset[] = [
  defaultParcelPreset,
  ...parcelPresets.filter((preset) => preset.id !== DEFAULT_PARCEL_ID),
];

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
  const zoning = calculateZoning(parcel, config);
  const bedroom = bedroomClassForFootprint(config.footprint);

  // A parcel resolved from a real address (Regrid or fallback geometry).
  const isLiveParcel = "source" in parcel;
  const attachedMarket =
    "marketData" in parcel ? (parcel as { marketData?: MarketData }).marketData : undefined;
  // Live parcels without resolved market data (scenarios saved before market
  // resolution existed) get the national public benchmark — never the retired
  // lot-size heuristic, and never another metro's preset economics.
  const marketData = attachedMarket ?? (isLiveParcel ? NATIONAL_MARKET_BASELINE : undefined);

  // Rent resolution, most specific wins: explicit preset rent → localized
  // market data → parcel-embedded preset rent → lot-size heuristic (demo-only
  // estimated parcels; live parcels can never reach it).
  let rentTable: Record<RentScenario, number>;
  let market: MarketProvenance;
  if (expectedRent) {
    rentTable = expectedRent;
    market = presetProvenance();
  } else if (marketData) {
    const anchor = marketData.rentByBedroom[bedroom];
    rentTable = {
      conservative: anchor,
      market: Math.round(anchor * 1.12),
      optimistic: Math.round(anchor * 1.25),
    };
    market = provenanceFromMarketData(marketData);
  } else if ("expectedRent" in parcel) {
    const preset = parcel as ParcelPreset;
    const scale = preset.rentBedroomRatios?.[bedroom] ?? 1;
    rentTable = {
      conservative: Math.round(preset.expectedRent.conservative * scale),
      market: Math.round(preset.expectedRent.market * scale),
      optimistic: Math.round(preset.expectedRent.optimistic * scale),
    };
    market = presetProvenance();
  } else {
    rentTable = estimateRent(parcel.lotArea);
    market = {
      source: "heuristic",
      area: "Lot-size heuristic",
      confidence: "low",
      verified: false,
    };
  }
  const rentBasis = marketBasisLabel({ source: market.source, area: market.area, bedroom });

  // A user-tuned expense ratio wins; otherwise the localized ratio replaces
  // the nationwide default when market data carries one.
  const userTunedOpex =
    assumptions.operatingExpenseRatio !== defaultFinancialAssumptions.operatingExpenseRatio;
  const finance = calculateFinance(zoning.aduSqft, config, assumptions, rentTable, {
    costMultiplier: marketData?.costMultiplier,
    operatingExpenseRatio: userTunedOpex ? undefined : marketData?.operatingExpenseRatio,
  });

  const warnings = [...zoning.warnings];
  if (isLiveParcel && !market.verified) {
    warnings.push(
      `Verified local market data is unavailable for this address — rent, cost, and payback use the ${market.area} benchmark. Confirm local comps before acting.`,
    );
  }

  return {
    ...zoning,
    ...finance,
    rentRange: { low: rentTable.conservative, high: rentTable.optimistic },
    heightReviewRequired: config.height > 16,
    warnings,
    rentBasis,
    market,
    opexBreakdown: userTunedOpex ? undefined : marketData?.opexBreakdown,
  };
}

/** Provenance for curated demo-preset rent tables. */
function presetProvenance(): MarketProvenance {
  return {
    source: "preset",
    area: "Curated demo estimate",
    confidence: "medium",
    verified: false,
  };
}

/** Provenance summary derived from resolved market data. */
function provenanceFromMarketData(data: MarketData): MarketProvenance {
  const verified =
    data.source === "live" || data.source === "hud-zip" || data.source === "hud-county";
  return {
    source: data.source,
    area: data.area,
    asOf: data.asOf,
    sourceUrl: data.sourceUrl,
    retrievedAt: data.retrievedAt,
    comparableCount: data.comparableCount,
    confidence: data.confidence,
    verified,
    components: data.components,
  };
}

/**
 * Estimate expected rent from lot size. Retired for live parcels (they always
 * resolve a market source or the national benchmark); retained only for the
 * anonymous wizard's estimated parcels, which have no address to localize.
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
