import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";

const GOOGLE_AUTOCOMPLETE_API =
  "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_METADATA_TOKEN_API =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const TIMEOUT_MS = 4000;
const METADATA_TIMEOUT_MS = 1500;
const MAX_QUERY_LEN = 200;
const MIN_QUERY_LEN = 3;
const MAX_SUGGESTIONS = 5;

let cachedRuntimeAccessToken:
  | { accessToken: string; expiresAt: number }
  | undefined;

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Shape of an `/api/suggest` response. */
export interface AddressSuggestions {
  /** Up to five US address prediction strings (empty when unavailable). */
  suggestions: string[];
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

/**
 * GET /api/suggest?q={partial address}
 *
 * Returns US address predictions for a partial query so the studio's address
 * input can suggest while the user types, without exposing a browser-side
 * Places key. Uses the Cloud Function's OAuth identity against Places API
 * (New), preserving project-wide Places App Check enforcement. A dedicated
 * server key remains available for local or unenforced environments. Degrades
 * to an empty list when neither authentication path is available or the
 * provider fails, so the input can still submit a plain address search.
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, {
    limit: 120,
    namespace: "suggest",
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().slice(0, MAX_QUERY_LEN) ?? "";
  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json({ suggestions: [] } satisfies AddressSuggestions);
  }

  // Google Maps Platform requires OAuth for server-to-server Web Service calls
  // when Places App Check enforcement is enabled. Cloud Functions exposes a
  // short-lived access token through its metadata service. Retain the dedicated
  // server key as a local/non-enforced fallback; never reuse the browser key,
  // which is HTTP-referrer restricted.
  const googleProjectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "";
  const googleKey =
    process.env.GOOGLE_PLACES_SERVER_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_KEY?.trim() ||
    "";
  if (!googleProjectId && !googleKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[/api/suggest] No Google runtime project or server Places key. Set GOOGLE_PLACES_SERVER_KEY for local use. NEXT_PUBLIC_GOOGLE_PLACES_KEY alone cannot power this route when it is HTTP-referrer restricted.",
      );
    }
    return NextResponse.json({ suggestions: [] } satisfies AddressSuggestions);
  }

  try {
    let authHeaders: Record<string, string> | undefined;
    if (googleProjectId) {
      try {
        authHeaders = await getRuntimeOAuthHeaders(googleProjectId);
      } catch (error) {
        console.error("[/api/suggest] runtime OAuth unavailable:", error);
      }
    }
    if (!authHeaders && googleKey) {
      authHeaders = { "X-Goog-Api-Key": googleKey };
    }
    if (!authHeaders) {
      return NextResponse.json({ suggestions: [] } satisfies AddressSuggestions);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(GOOGLE_AUTOCOMPLETE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          // Places API (New) field mask — without it some projects return empty.
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
        },
        body: JSON.stringify({
          input: q,
          includedRegionCodes: ["us"],
          // Same address-only filter the studio's in-browser search uses —
          // "geocode" is the valid token for property addresses.
          includedPrimaryTypes: ["geocode"],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Autocomplete returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }

    const json = (await res.json()) as {
      suggestions?: Array<{ placePrediction?: { text?: { text?: string } } }>;
    };
    const suggestions = (json.suggestions ?? [])
      .map((s) => s.placePrediction?.text?.text?.trim() ?? "")
      .filter(Boolean)
      .slice(0, MAX_SUGGESTIONS);

    return NextResponse.json({ suggestions } satisfies AddressSuggestions, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("[/api/suggest] autocomplete failed:", err);
    return NextResponse.json({ suggestions: [] } satisfies AddressSuggestions);
  }
}
