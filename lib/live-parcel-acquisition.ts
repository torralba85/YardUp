import { fetchParcel } from "./parcel-api";
import { geocodeAddress } from "./geocode-api";
import { enrichStreetAddress } from "./server/address-match";
import { startParcelLookupTracking } from "./analytics/events";
import type { LiveParcelData } from "./parcel-types";

export type LiveParcelLookup =
  | { kind: "address"; query: string }
  | { kind: "coords"; lat: number; lng: number; address?: string };

/** Resolve one accepted lookup. Guest allowance and workspace state belong to callers. */
export async function acquireLiveParcel(
  lookup: LiveParcelLookup,
  user?: { getIdToken: () => Promise<string> } | null,
): Promise<LiveParcelData> {
  const tracker = startParcelLookupTracking(user ? "signed_in" : "guest");
  try {
    const idToken = await user?.getIdToken();
    let parcel: LiveParcelData;
    if (lookup.kind === "coords") {
      parcel = await fetchParcel(lookup.lat, lookup.lng, idToken, lookup.address);
    } else {
      const query = lookup.query.trim();
      const geocode = await geocodeAddress(query, idToken);
      const address = enrichStreetAddress(query, geocode.formattedAddress);
      parcel = await fetchParcel(geocode.lat, geocode.lng, idToken, address);
      if (geocode.match && parcel.dataQuality) {
        parcel.dataQuality.geocode = {
          requestedAddress: query,
          formattedAddress: geocode.formattedAddress,
          match: geocode.match,
        };
      }
    }
    tracker.settle({ ok: true, parcel });
    return parcel;
  } catch (error) {
    tracker.settle({ ok: false, error });
    throw error;
  }
}
