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
    const retrievedAt = new Date().toISOString();
    const comparableCount = live.comparableCount;
    const confidence = comparableCount != null && comparableCount >= 10
      ? "high"
      : comparableCount != null && comparableCount >= 5
        ? "medium"
        : "low";
    const warnings = confidence === "high"
      ? []
      : comparableCount == null
        ? ["The live provider did not publish a comparable count."]
        : [`Only ${comparableCount} comparable listings support this estimate.`];
    return {
      ...base,
      rentByBedroom: live.rentByBedroom,
      area: live.area ?? base.area,
      source: "live",
      confidence,
      comparableCount,
      sourceUrl: "https://developers.rentcast.io/reference/rental-avm",
      asOf: "Live rental estimate",
      retrievedAt,
      components: {
        ...base.components!,
        rent: {
          status: "observed",
          source: {
            provider: "RentCast",
            dataset: "Long-Term Rent AVM",
            sourceUrl: "https://developers.rentcast.io/reference/rental-avm",
          },
          retrievedAt,
          confidence,
          warnings,
        },
      },
    };
  }
  return base;
}
