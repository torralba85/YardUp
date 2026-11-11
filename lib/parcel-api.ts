import type { LiveParcelData } from "./parcel-types";

/**
 * Error thrown by {@link fetchParcel} when the parcel lookup fails. Carries a
 * separate user-facing message suitable for display in the UI.
 */
export class ParcelFetchError extends Error {
  /**
   * @param message - Developer-facing message (logged/inspected).
   * @param userMessage - Friendly message safe to show end users.
   */
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
  idToken?: string,
  address?: string,
): Promise<LiveParcelData> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  if (address?.trim()) {
    params.set("address", address.trim());
  }
  const url = `/api/parcel?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
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

  if (res.status === 401) {
    throw new ParcelFetchError(
      `Parcel service authentication failed (${res.status})`,
      "Sign in to search a specific address — or keep exploring with a demo preset.",
    );
  }

  if (!res.ok) {
    throw new ParcelFetchError(
      `Parcel service returned ${res.status}`,
      "Parcel data is unavailable for this address. Please try again.",
    );
  }

  const data: LiveParcelData = await res.json();
  return data;
}
