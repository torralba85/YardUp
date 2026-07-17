import type { MarketData, MarketLocation } from "@/lib/market/market-types";
import { resolveStaticMarket } from "./static-market";
import { fetchLiveRent } from "./live-market";

/**
 * Layered market resolution: live comparable rent (when configured) over the
 * static HUD floor. The cost multiplier and operating-expense ratio always
 * come from the static index — there is no live cost source. Always returns
 * MarketData (the static provider never returns null); a lookup that only
 * reaches the national tier stays marked low-confidence so the client can
 * warn instead of presenting authoritative-looking numbers.
 */
export async function resolveMarketData(loc: MarketLocation): Promise<MarketData> {
  const base = resolveStaticMarket(loc);
  const live = await fetchLiveRent(loc);
  if (live) {
    return {
      ...base,
      rentByBedroom: live.rentByBedroom,
      area: live.area ?? base.area,
      source: "live",
      confidence: "high",
      comparableCount: live.comparableCount,
      sourceUrl: undefined,
      asOf: undefined,
      retrievedAt: new Date().toISOString(),
    };
  }
  return base;
}
