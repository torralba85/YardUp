import { calculateFinance } from "@/lib/finance";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
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

/**
 * Per-city anchors. Adding a second city to the program means adding one
 * entry here (plus its content module) — no route or component changes.
 */
const CITY_MARKET_ANCHORS: Record<string, CityMarketAnchor> = {
  "san-diego": {
    area: "San Diego County, CA",
    rentByBedroom: { studio: 2090, "1br": 2459, "2br": 3123 },
    costMultiplier: 1,
    asOf: "HUD FY2026 FMR (effective 2026-05-21; seed extract)",
    sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
  },
};

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

  const rows: CitySizeAggregate[] = CITY_MARKET_SIZES.map((size) => {
    const bedroom = bedroomClassForFootprint(size);
    const anchorRent = anchor.rentByBedroom[bedroom];
    // Same spreads calculateFeasibility applies to a live parcel's anchor.
    const rentTable = {
      conservative: anchorRent,
      market: Math.round(anchorRent * 1.12),
      optimistic: Math.round(anchorRent * 1.25),
    };
    const finance = calculateFinance(
      size,
      { ...defaultAduConfig, footprint: size },
      defaultFinancialAssumptions,
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
  });

  return {
    slug,
    provenance: {
      source: "hud-county",
      area: anchor.area,
      asOf: anchor.asOf,
      sourceUrl: anchor.sourceUrl,
      confidence: "medium",
      verified: true,
    },
    rows,
  };
}
