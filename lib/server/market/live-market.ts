import type { BedroomClass, MarketLocation } from "@/lib/market/market-types";

/** A live rent reading from the vendor, keyed by bedroom class. */
export interface LiveRent {
  rentByBedroom: Record<BedroomClass, number>;
  area?: string;
  comparableCount?: number;
}

/**
 * Map a vendor response to our bedroom row. Pure + vendor-shaped so the
 * specific API can change without touching the resolver. Returns null if the
 * payload is unusable.
 */
export function mapVendorRent(payload: unknown): Record<BedroomClass, number> | null {
  const r = (payload as { rentByBedroom?: Record<string, number> } | null)?.rentByBedroom;
  if (!r) return null;
  const studio = Number(r[0]);
  const oneBr = Number(r[1]);
  const twoBr = Number(r[2]);
  if (![studio, oneBr, twoBr].every((n) => Number.isFinite(n) && n > 0)) return null;
  return { studio, "1br": oneBr, "2br": twoBr };
}

/**
 * Key-gated live rent provider (rental AVM / comparable listings). Requests
 * are keyed by the address geography — lat/lng — never lot area. Returns null
 * when no RENT_API_KEY is set (demo mode) or on any failure, so the resolver
 * falls back to the static HUD floor. Vendor selection is behind this seam;
 * the fetch block is the only vendor-specific code.
 */
export async function fetchLiveRent(loc: MarketLocation): Promise<LiveRent | null> {
  const key = process.env.RENT_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.rentcast.io/v1/avm/rent/long-term");
    url.searchParams.set("latitude", String(loc.lat));
    url.searchParams.set("longitude", String(loc.lng));
    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { comparableCount?: number } | null;
    const rentByBedroom = mapVendorRent(payload);
    if (!rentByBedroom) return null;
    return {
      rentByBedroom,
      area: loc.zip ? `ZIP ${loc.zip}` : undefined,
      comparableCount:
        typeof payload?.comparableCount === "number" ? payload.comparableCount : undefined,
    };
  } catch {
    return null;
  }
}
