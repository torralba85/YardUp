import { calculateFinance } from "@/lib/finance";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  type ADUConfig,
  type ExteriorFinish,
  type FinancialAssumptions,
  type RentScenario,
} from "@/lib/feasibility";
import { bedroomClassForFootprint } from "@/lib/market/bedroom";
import type {
  BedroomClass,
  MarketProvenance,
} from "@/lib/market/market-types";

/**
 * Citywide cost/rent/payback aggregates for ADU jurisdiction pages.
 *
 * The Studio's finance engine (`calculateFinance`) is strictly per-parcel:
 * it needs a footprint, a design config, and a rent table resolved for one
 * address. City pages have no parcel, so this module defines the one
 * documented step that turns per-parcel machinery into a citywide figure:
 *
 * - Rent anchor: the HUD Fair Market Rent for the city's county, by bedroom
 *   class. 400 sqft quotes the studio FMR, 600/800 the 1-bedroom FMR, 1200
 *   the 2-bedroom FMR, using the same `bedroomClassForFootprint` mapping and
 *   the same conservative/market/optimistic spreads (1.0 / 1.12 / 1.25) the
 *   Studio applies to a live parcel.
 * - Build cost: `calculateFinance` with the Studio's own defaults (shed
 *   roof, cedar finish, openings included, 1.18 soft-cost multiplier).
 * - Payback: simple cost-mid divided by net operating income at the default
 *   operating-expense ratio.
 *
 * Every figure is therefore computed by the same engine as the Studio, and
 * every surface that shows these numbers must carry the county-FMR
 * provenance line beside them: they are citywide estimates, not a quote for
 * any specific lot. A city with no anchor entry gets no numbers at all —
 * components render nothing rather than a stub.
 *
 * @module adu/market-aggregate
 */

/** Unit sizes quoted on city pages, in square feet. */
export const CITY_MARKET_SIZES = [400, 600, 800, 1200] as const;

/**
 * Rent scenario multipliers applied to a HUD FMR anchor. Conservative is the
 * FMR itself; the Studio applies the same spreads to a live parcel's anchor.
 */
export const RENT_SCENARIO_SPREADS = {
  conservative: 1,
  market: 1.12,
  optimistic: 1.25,
} as const;

/** One city's rent anchor plus the vintage behind it. */
interface CityMarketAnchor {
  /** Human citation, e.g. "San Diego County, CA". */
  area: string;
  /**
   * Monthly HUD Fair Market Rent by bedroom class. Mirrors the matching row
   * of `lib/server/market/data/fmr.json` — update both together.
   */
  rentByBedroom: Record<BedroomClass, number>;
  /**
   * Regional build-cost factor (1.0 = national base). Only a verified
   * regional multiplier belongs here; without one the national base
   * applies and the figures stay labeled estimates.
   */
  costMultiplier: number;
  /** Data vintage, e.g. "HUD FY2026 FMR (effective 2026-05-21; seed extract)". */
  asOf: string;
  /** Public URL for the underlying dataset. */
  sourceUrl: string;
}

/** Vintage and source shared by every HUD FMR county anchor below. */
const HUD_FMR_AS_OF = "HUD FY2026 FMR (effective 2026-05-21; seed extract)";
const HUD_FMR_URL = "https://www.huduser.gov/portal/datasets/fmr.html";

/**
 * California county anchors, keyed by county slug. Each mirrors the
 * matching `CA/<County>` row of `lib/server/market/data/fmr.json`. The
 * regional cost factors in `cost-multipliers.json` are unverified seeds, so
 * every anchor stays on the national cost base (1.0) — the same rule the
 * city pages follow.
 */
const COUNTY_MARKET_ANCHORS: Record<string, CityMarketAnchor> = {
  "los-angeles": {
    area: "Los Angeles County, CA",
    rentByBedroom: { studio: 1979, "1br": 2328, "2br": 2957 },
    costMultiplier: 1,
    asOf: HUD_FMR_AS_OF,
    sourceUrl: HUD_FMR_URL,
  },
  "san-diego": {
    area: "San Diego County, CA",
    rentByBedroom: { studio: 2090, "1br": 2459, "2br": 3123 },
    costMultiplier: 1,
    asOf: HUD_FMR_AS_OF,
    sourceUrl: HUD_FMR_URL,
  },
  "santa-clara": {
    area: "Santa Clara County, CA",
    rentByBedroom: { studio: 2535, "1br": 2982, "2br": 3787 },
    costMultiplier: 1,
    asOf: HUD_FMR_AS_OF,
    sourceUrl: HUD_FMR_URL,
  },
};

/**
 * Per-city anchors. Adding a second city to the program means adding one
 * entry here (plus its content module) — no route or component changes.
 */
const CITY_MARKET_ANCHORS: Record<string, CityMarketAnchor> = {
  "san-diego": COUNTY_MARKET_ANCHORS["san-diego"],
};

/** A California county the cost calculator quotes, in display order. */
export interface CalculatorCounty {
  /** County slug, e.g. "los-angeles". */
  slug: string;
  /** Display name, e.g. "Los Angeles County". */
  name: string;
}

/** Counties with a verified HUD FMR anchor, offered by the cost calculator. */
export const CALCULATOR_COUNTIES: CalculatorCounty[] = [
  { slug: "los-angeles", name: "Los Angeles County" },
  { slug: "san-diego", name: "San Diego County" },
  { slug: "santa-clara", name: "Santa Clara County" },
];

/** Computed figures for one quoted unit size. */
export interface CitySizeAggregate {
  /** Unit size in square feet. */
  size: number;
  /** Bedroom class the rent anchor was taken from. */
  bedroom: BedroomClass;
  /** Monthly rent (conservative scenario) in dollars. */
  monthlyRent: number;
  /** Build-cost range in dollars, from the Studio cost engine. */
  costLow: number;
  costHigh: number;
  /** Annual net operating income in dollars. */
  annualNoi: number;
  /** Simple payback period in years. */
  paybackYears: number;
}

/** Citywide aggregate for one jurisdiction page. */
export interface CityMarketAggregate {
  /** URL city slug, e.g. "san-diego". */
  slug: string;
  /** Provenance citation for every figure, e.g. "HUD FMR · San Diego County, CA". */
  provenance: MarketProvenance;
  /** One row per quoted unit size, ascending. */
  rows: CitySizeAggregate[];
}

/**
 * Compute the citywide aggregate for a jurisdiction slug.
 *
 * @param slug - URL city slug, e.g. "san-diego".
 * @returns The aggregate, or `undefined` when the city has no rent anchor —
 *   callers render nothing in that case, never a stub.
 */
export function cityMarketAggregate(slug: string): CityMarketAggregate | undefined {
  const anchor = CITY_MARKET_ANCHORS[slug];
  if (!anchor) return undefined;
  return aggregateFromAnchor(slug, anchor);
}

/**
 * Compute the countywide aggregate for a calculator county slug.
 *
 * @param slug - County slug from {@link CALCULATOR_COUNTIES}, e.g. "los-angeles".
 * @returns The aggregate, or `undefined` when the county has no rent anchor.
 */
export function countyMarketAggregate(slug: string): CityMarketAggregate | undefined {
  const anchor = COUNTY_MARKET_ANCHORS[slug];
  if (!anchor) return undefined;
  return aggregateFromAnchor(slug, anchor);
}

/** Inputs the cost calculator lets a visitor change. */
export interface AduEstimateInput {
  /** County slug from {@link CALCULATOR_COUNTIES}. */
  county: string;
  /** Unit size in square feet. */
  size: number;
  /** Exterior finish, which sets the base cost per square foot. */
  finish: ExteriorFinish;
  /** Which rent spread to read from the county anchor. */
  rentScenario: RentScenario;
}

/**
 * Estimate one ADU for the cost calculator: the same anchor, spreads, and
 * `calculateFinance` defaults as the city tables, with finish and rent
 * scenario exposed as inputs.
 *
 * @returns The size row, or `undefined` for an unknown county.
 */
export function estimateAdu(input: AduEstimateInput): CitySizeAggregate | undefined {
  const anchor = COUNTY_MARKET_ANCHORS[input.county];
  if (!anchor) return undefined;
  return sizeRow(input.size, anchor, {
    config: { ...defaultAduConfig, footprint: input.size, finish: input.finish },
    assumptions: { ...defaultFinancialAssumptions, rentScenario: input.rentScenario },
  });
}

/** Provenance line data for a calculator county's figures. */
export function countyProvenance(slug: string): MarketProvenance | undefined {
  const anchor = COUNTY_MARKET_ANCHORS[slug];
  return anchor ? provenanceFor(anchor) : undefined;
}

function aggregateFromAnchor(slug: string, anchor: CityMarketAnchor): CityMarketAggregate {
  return {
    slug,
    provenance: provenanceFor(anchor),
    rows: CITY_MARKET_SIZES.map((size) => sizeRow(size, anchor)),
  };
}

function sizeRow(
  size: number,
  anchor: CityMarketAnchor,
  overrides?: { config: ADUConfig; assumptions: FinancialAssumptions },
): CitySizeAggregate {
  const bedroom = bedroomClassForFootprint(size);
  const anchorRent = anchor.rentByBedroom[bedroom];
  // Same spreads calculateFeasibility applies to a live parcel's anchor.
  const rentTable = {
    conservative: anchorRent,
    market: Math.round(anchorRent * RENT_SCENARIO_SPREADS.market),
    optimistic: Math.round(anchorRent * RENT_SCENARIO_SPREADS.optimistic),
  };
  const finance = calculateFinance(
    size,
    overrides?.config ?? { ...defaultAduConfig, footprint: size },
    overrides?.assumptions ?? defaultFinancialAssumptions,
    rentTable,
    { costMultiplier: anchor.costMultiplier },
  );
  return {
    size,
    bedroom,
    monthlyRent: finance.monthlyRent,
    costLow: finance.costLow,
    costHigh: finance.costHigh,
    annualNoi: finance.annualNoi,
    paybackYears: finance.paybackYears,
  };
}

function provenanceFor(anchor: CityMarketAnchor): MarketProvenance {
  return {
    source: "hud-county",
    area: anchor.area,
    asOf: anchor.asOf,
    sourceUrl: anchor.sourceUrl,
    confidence: "medium",
    verified: true,
  };
}
