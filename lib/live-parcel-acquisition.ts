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
        const geocodeZip = geocode.match.components.zip?.slice(0, 5);
        const parcelZip = parcel.zip?.slice(0, 5);
        const reconciliationWarnings: string[] = [];
        if (geocode.match.precision === "range-interpolated") {
          reconciliationWarnings.push(
            "Address coordinates were range-interpolated along the block rather than pinned to a rooftop.",
          );
        }
        if (
          geocodeZip &&
          parcelZip &&
          /^\d{5}$/.test(geocodeZip) &&
          /^\d{5}$/.test(parcelZip) &&
          geocodeZip !== parcelZip
        ) {
          reconciliationWarnings.push(
            `Geocoded ZIP (${geocodeZip}) differs from the parcel record ZIP (${parcelZip}); confirm property location.`,
          );
        }
        if (reconciliationWarnings.length > 0) {
          parcel.dataQuality.warnings = [
            ...parcel.dataQuality.warnings,
            ...reconciliationWarnings,
          ];
        }
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
