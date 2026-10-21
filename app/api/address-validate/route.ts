import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";
import {
  GMP_SOLUTION_ATTRIBUTION_ID,
  ValidationAction,
  evaluateClientInputReadiness,
  evaluateGoogleAddressValidationResponse,
  evaluatePlacesAddress,
  type AddressValidationResult,
  type GoogleAddressValidationPayload,
  type PlacesAddressComponentLike,
} from "@/lib/address-validation";

const GOOGLE_PLACES_TEXT_SEARCH_API =
  "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_DETAILS_API_BASE =
  "https://places.googleapis.com/v1/places/";
const GOOGLE_ADDRESS_VALIDATION_API =
  "https://addressvalidation.googleapis.com/v1:validateAddress";
const GOOGLE_METADATA_TOKEN_API =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

const TIMEOUT_MS = 4500;
const METADATA_TIMEOUT_MS = 1500;
const MAX_ADDRESS_LEN = 240;

let cachedRuntimeAccessToken:
  | { accessToken: string; expiresAt: number }
  | undefined;

export const runtime = "nodejs";

export interface AddressValidateRequestBody {
  address?: string;
  placeId?: string;
}

async function getRuntimeOAuthHeaders(
  projectId: string,
): Promise<Record<string, string>> {
  if (
    cachedRuntimeAccessToken &&
    cachedRuntimeAccessToken.expiresAt > Date.now()
  ) {
    return {
      Authorization: `Bearer ${cachedRuntimeAccessToken.accessToken}`,
      "X-Goog-User-Project": projectId,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(GOOGLE_METADATA_TOKEN_API, {
      cache: "no-store",
      headers: { "Metadata-Flavor": "Google" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`Google metadata token endpoint returned ${response.status}`);
  }

  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!token.access_token) {
    throw new Error("Google metadata token endpoint returned no access token");
  }

  const usableSeconds = Math.max(60, (token.expires_in ?? 300) - 60);
  cachedRuntimeAccessToken = {
    accessToken: token.access_token,
    expiresAt: Date.now() + usableSeconds * 1000,
  };
  return {
    Authorization: `Bearer ${token.access_token}`,
    "X-Goog-User-Project": projectId,
  };
}

function buildFallbackValidation(rawAddress: string): AddressValidationResult {
  const readiness = evaluateClientInputReadiness(rawAddress);
  return {
    status: readiness.isCompleteCandidate ? "deliverable" : "incomplete",
    action: readiness.isCompleteCandidate
      ? ValidationAction.ACCEPT
      : readiness.needsUnitNumber
        ? ValidationAction.ADD_SUBPREMISES
        : ValidationAction.FIX,
    deliverable: readiness.isCompleteCandidate,
    formattedAddress: rawAddress,
    granularity: readiness.isCompleteCandidate ? "PREMISE" : "OTHER",
    components: {},
    missingComponents: readiness.missingLabels,
    unconfirmedComponents: [],
    message: readiness.summaryLabel,
    source: "client_heuristic",
  };
}

interface PlacesRestPlace {
  id?: string;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: PlacesAddressComponentLike[];
  types?: string[];
}

async function validateWithPlaceDetails(
  placeId: string,
  rawAddress: string,
  authHeaders: Record<string, string>,
): Promise<AddressValidationResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${GOOGLE_PLACES_DETAILS_API_BASE}${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          ...authHeaders,
          "X-Goog-Maps-Solution-ID": GMP_SOLUTION_ATTRIBUTION_ID,
          "X-Goog-FieldMask":
            "id,formattedAddress,location,addressComponents,types",
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const place = (await res.json()) as PlacesRestPlace;
    if (!place.formattedAddress) return null;
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    return evaluatePlacesAddress({
      rawQuery: rawAddress || place.formattedAddress,
      formattedAddress: place.formattedAddress,
      placeId: place.id ?? placeId,
      location:
        typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
      addressComponents: place.addressComponents ?? null,
      types: place.types ?? null,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function validateWithPlacesTextSearch(
  rawAddress: string,
  authHeaders: Record<string, string>,
): Promise<AddressValidationResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GOOGLE_PLACES_TEXT_SEARCH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        "X-Goog-Maps-Solution-ID": GMP_SOLUTION_ATTRIBUTION_ID,
        "X-Goog-FieldMask":
          "places.id,places.formattedAddress,places.location,places.addressComponents,places.types",
      },
      body: JSON.stringify({
        textQuery: rawAddress,
        regionCode: "US",
        pageSize: 1,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: PlacesRestPlace[] };
    const place = data.places?.[0];
    if (!place?.formattedAddress) return null;
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    return evaluatePlacesAddress({
      rawQuery: rawAddress,
      formattedAddress: place.formattedAddress,
      placeId: place.id,
      location:
        typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
      addressComponents: place.addressComponents ?? null,
      types: place.types ?? null,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function validateWithAddressValidationApi(
  rawAddress: string,
  authHeaders: Record<string, string>,
): Promise<AddressValidationResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(GOOGLE_ADDRESS_VALIDATION_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        "X-Goog-Maps-Solution-ID": GMP_SOLUTION_ATTRIBUTION_ID,
      },
      body: JSON.stringify({
        address: {
          regionCode: "US",
          addressLines: [rawAddress],
        },
        enableUspsCass: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as GoogleAddressValidationPayload;
    return evaluateGoogleAddressValidationResponse(payload, rawAddress);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /api/address-validate
 *
 * Real-time server-side address deliverability validation using Google Places API (New)
 * and Google Address Validation API. Verifies street number, street name, locality,
 * state, and ZIP code so users enter accurate, deliverable property addresses.
 */
export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, {
    limit: 60,
    namespace: "address-validate",
    windowMs: 60_000,
  });
  if (limited) return limited;

  let body: AddressValidateRequestBody;
  try {
    body = (await request.json()) as AddressValidateRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 },
    );
  }

  const rawAddress = body.address?.trim().slice(0, MAX_ADDRESS_LEN) ?? "";
  const placeId = body.placeId?.trim().slice(0, MAX_ADDRESS_LEN) ?? "";

  if (!rawAddress && !placeId) {
    return NextResponse.json(
      { error: "address or placeId is required" },
      { status: 400 },
    );
  }

  const googleProjectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "";
  const viteFallbackKey =
    process.env.NODE_ENV === "test"
      ? ""
      : process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
  const googleKey =
    process.env.GOOGLE_PLACES_SERVER_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_KEY?.trim() ||
    viteFallbackKey;

  if (!googleProjectId && !googleKey) {
    return NextResponse.json(buildFallbackValidation(rawAddress));
  }

  let authHeaders: Record<string, string> | undefined;
  if (googleProjectId) {
    try {
      authHeaders = await getRuntimeOAuthHeaders(googleProjectId);
    } catch (err) {
      console.error("[/api/address-validate] runtime OAuth unavailable:", err);
    }
  }
  if (!authHeaders && googleKey) {
    authHeaders = { "X-Goog-Api-Key": googleKey };
  }
  if (!authHeaders) {
    return NextResponse.json(buildFallbackValidation(rawAddress));
  }

  // 1. When a Place ID is provided from Places Autocomplete (New), validate via Place Details (New).
  if (placeId) {
    const placeResult = await validateWithPlaceDetails(
      placeId,
      rawAddress,
      authHeaders,
    );
    if (placeResult) {
      return NextResponse.json(placeResult, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }
  }

  // 2. Validate via Places API (New) Text Search (`places:searchText`) for rich component & coordinate lookup.
  if (rawAddress) {
    const placesSearchResult = await validateWithPlacesTextSearch(
      rawAddress,
      authHeaders,
    );
    if (placesSearchResult) {
      return NextResponse.json(placesSearchResult, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }

    // 3. Fallback to Address Validation API (`v1:validateAddress`) when enabled on the project.
    const addressValidationResult = await validateWithAddressValidationApi(
      rawAddress,
      authHeaders,
    );
    if (addressValidationResult) {
      return NextResponse.json(addressValidationResult, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }
  }

  return NextResponse.json(buildFallbackValidation(rawAddress));
}
