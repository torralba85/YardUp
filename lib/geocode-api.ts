/** A resolved geocode: coordinates plus the canonical formatted address. */
export interface GeocodeResult {
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** The provider's normalized, human-readable address. */
  formattedAddress: string;
}

/**
 * Error thrown by {@link geocodeAddress} when address resolution fails,
 * including the "no match" case. Carries a user-facing message for display.
 */
export class GeocodeError extends Error {
  /**
   * @param message - Developer-facing message (logged/inspected).
   * @param userMessage - Friendly message safe to show end users.
   */
  constructor(
    message: string,
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "GeocodeError";
  }
}

/**
 * Resolves a free-text address to coordinates via the LotFoundry /api/geocode
 * route. Throws GeocodeError with a user-facing message on failure (including
 * "no match", so the caller can show a clear "couldn't find that address").
 */
export async function geocodeAddress(
  query: string,
  idToken?: string,
): Promise<GeocodeResult> {
  const url = `/api/geocode?q=${encodeURIComponent(query)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
    });
  } catch {
    throw new GeocodeError(
      "Network error during geocode",
      "Could not reach the address service. Check your connection and try again.",
    );
  }

  if (res.status === 404) {
    throw new GeocodeError(
      "Address not found",
      "We couldn't find that address. Try adding the city and state.",
    );
  }

  if (res.status === 401) {
    throw new GeocodeError(
      `Geocode authentication failed (${res.status})`,
      "Sign in to search a specific address — or keep exploring with a demo preset.",
    );
  }

  if (res.status === 429 || res.status === 503) {
    throw new GeocodeError(
      `Geocode rate-limited (${res.status})`,
      "The address service is busy. Please wait a moment and try again.",
    );
  }

  if (!res.ok) {
    throw new GeocodeError(
      `Geocode service returned ${res.status}`,
      "Address lookup is unavailable right now. Please try again shortly.",
    );
  }

  return (await res.json()) as GeocodeResult;
}
