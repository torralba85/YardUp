import type {
  BedroomClass,
  MarketData,
  MarketGeography,
  MarketLocation,
  MarketSource,
  OperatingExpenseBreakdown,
} from "@/lib/market/market-types";
import fmr from "./data/fmr.json";
import costs from "./data/cost-multipliers.json";
import opex from "./data/operating-expenses.json";

type RentRow = Record<BedroomClass, number>;

const STATE_NAME: Record<string, string> = {
  WA: "Washington",
  OR: "Oregon",
  TX: "Texas",
  CA: "California",
};

interface RentTier {
  rent: RentRow;
  area: string;
  source: MarketSource;
}

function rentTier(loc: MarketLocation): RentTier {
  const zip = loc.zip?.trim();
  const state = loc.state?.trim().toUpperCase();
  const county = loc.county?.trim();

  const zipRow = zip
    ? (fmr.zips as Record<string, (RentRow & { area?: string }) | undefined>)[zip]
    : undefined;
  if (zipRow) {
    return {
      rent: { studio: zipRow.studio, "1br": zipRow["1br"], "2br": zipRow["2br"] },
      area: zipRow.area ?? `ZIP ${zip}`,
      source: "hud-zip",
    };
  }
  const countyRow =
    state && county
      ? (fmr.counties as Record<string, RentRow | undefined>)[`${state}/${county}`]
      : undefined;
  if (countyRow && state) {
    return { rent: countyRow, area: `${county} County, ${state}`, source: "hud-county" };
  }
  const stateRow = state
    ? (fmr.states as Record<string, RentRow | undefined>)[state]
    : undefined;
  if (stateRow && state) {
    return { rent: stateRow, area: STATE_NAME[state] ?? state, source: "state" };
  }
  return { rent: fmr.national as RentRow, area: "U.S. average", source: "national" };
}

function costMultiplier(loc: MarketLocation): number {
  const zip = loc.zip?.trim();
  const state = loc.state?.trim().toUpperCase();
  const county = loc.county?.trim();
  const zips = costs.zips as Record<string, number | undefined>;
  const counties = costs.counties as Record<string, number | undefined>;
  const states = costs.states as Record<string, number | undefined>;
  if (zip && zips[zip] != null) return zips[zip];
  if (state && county && counties[`${state}/${county}`] != null) {
    return counties[`${state}/${county}`]!;
  }
  if (state && states[state] != null) return states[state];
  return costs.national;
}

interface OpexRow {
  ratio: number;
  breakdown: OperatingExpenseBreakdown;
}

function operatingExpenses(loc: MarketLocation): OpexRow {
  const state = loc.state?.trim().toUpperCase();
  const states = opex.states as Record<string, OpexRow | undefined>;
  if (state && states[state]) return states[state];
  return opex.national as OpexRow;
}

const CONFIDENCE: Record<MarketSource, MarketData["confidence"]> = {
  live: "high",
  "hud-zip": "high",
  "hud-county": "medium",
  state: "low",
  national: "low",
  preset: "medium",
  heuristic: "low",
};

function geography(loc: MarketLocation): MarketGeography {
  const geo: MarketGeography = {};
  const state = loc.state?.trim().toUpperCase();
  if (state) geo.state = state;
  if (loc.county?.trim()) geo.county = loc.county.trim();
  if (loc.zip?.trim()) geo.zip = loc.zip.trim();
  return geo;
}

/**
 * The always-on static floor: HUD FMR rents (ZIP → county → state → national),
 * a regional construction-cost multiplier, and a localized operating-expense
 * ratio with its component breakdown. Always returns MarketData — the national
 * tier is the final fallback, marked low-confidence so the UI can warn that no
 * verified local source resolved.
 */
export function resolveStaticMarket(loc: MarketLocation): MarketData {
  const { rent, area, source } = rentTier(loc);
  const expenses = operatingExpenses(loc);
  return {
    rentByBedroom: rent,
    costMultiplier: costMultiplier(loc),
    operatingExpenseRatio: expenses.ratio,
    opexBreakdown: expenses.breakdown,
    source,
    area,
    asOf: fmr.asOf,
    sourceUrl: fmr.sourceUrl,
    retrievedAt: new Date().toISOString(),
    geography: geography(loc),
    confidence: CONFIDENCE[source],
  };
}
