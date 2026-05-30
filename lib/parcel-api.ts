import type { LiveParcelData } from "./parcel-types";

export class ParcelFetchError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "ParcelFetchError";
  }
}

/**
 * Fetches parcel data from the LotFoundry /api/parcel route.
 * Throws ParcelFetchError with a user-facing message on failure.
 */
export async function fetchParcel(
  lat: number,
  lng: number,
): Promise<LiveParcelData> {
  const url = `/api/parcel?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      // Avoid Next.js fetch caching so different addresses always fetch fresh
      cache: "no-store",
    });
  } catch {
    throw new ParcelFetchError(
      "Network error fetching parcel",
      "Could not reach the parcel service. Check your connection and try again.",
    );
  }

  if (res.status === 503) {
    throw new ParcelFetchError(
      `Parcel service rate-limited (${res.status})`,
      "The parcel service is busy — please wait a moment and try again.",
    );
  }

  if (!res.ok) {
    throw new ParcelFetchError(
      `Parcel service returned ${res.status}`,
      "Parcel data is unavailable for this address. Demo mode will be used instead.",
    );
  }

  const data: LiveParcelData = await res.json();
  return data;
}
