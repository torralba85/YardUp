import type { MarketData } from "./market-types";

const baselineRetrievedAt = new Date().toISOString();

/**
 * Client-safe national HUD FMR baseline. Used ONLY when a live parcel carries
 * no resolved `marketData` (scenarios saved before market resolution existed).
 * It replaces the retired lot-size rent heuristic for live parcels: a public
 * benchmark with explicit low-confidence provenance, never a fabricated
 * lot-area guess. Mirrors the `national` row of
 * `lib/server/market/data/fmr.json` — update both together.
 */
export const NATIONAL_MARKET_BASELINE: MarketData = {
  rentByBedroom: { studio: 1400, "1br": 1500, "2br": 1750 },
  costMultiplier: 1,
  operatingExpenseRatio: 0.325,
  source: "national",
  area: "U.S. average",
  asOf: "HUD FY2026 FMR (effective 2026-05-21; seed extract)",
  sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
  confidence: "low",
  components: {
    rent: {
      status: "observed",
      source: {
        provider: "HUD",
        dataset: "Fair Market Rents",
        sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
      },
      sourceAsOf: "HUD FY2026 FMR (effective 2026-05-21; seed extract)",
      retrievedAt: baselineRetrievedAt,
      confidence: "low",
      warnings: ["No local market record was available; this is the U.S. benchmark."],
    },
    constructionCost: {
      status: "derived",
      source: {
        provider: "LotFoundry",
        dataset: "National construction cost baseline",
      },
      sourceAsOf: "2026 planning baseline",
      retrievedAt: baselineRetrievedAt,
      confidence: "low",
      warnings: ["Planning assumption; verify against current local bids."],
    },
    operatingExpenses: {
      status: "derived",
      source: {
        provider: "LotFoundry",
        dataset: "National operating-expense baseline",
      },
      sourceAsOf: "2026 planning baseline",
      retrievedAt: baselineRetrievedAt,
      confidence: "low",
      warnings: ["Planning assumption; actual ownership expenses vary by project."],
    },
  },
};
