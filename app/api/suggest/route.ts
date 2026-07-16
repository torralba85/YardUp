import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/server/rate-limit";

const GOOGLE_AUTOCOMPLETE_API =
  "https://places.googleapis.com/v1/places:autocomplete";
const TIMEOUT_MS = 4000;
const MAX_QUERY_LEN = 200;
const MIN_QUERY_LEN = 3;
const MAX_SUGGESTIONS = 5;

/** Next.js route segment config: run on the Node.js runtime (not Edge). */
export const runtime = "nodejs";

/** Shape of an `/api/suggest` response. */
export interface AddressSuggestions {
  /** Up to five US address prediction strings (empty when unavailable). */
  suggestions: string[];
}

/**
 * GET /api/suggest?q={partial address}
 *
 * Returns US address predictions for a partial query so the studio's address
 * input can suggest while the user types, without exposing a browser-side
 * Places key. Uses the server-side Google key against Places API (New) —
 * the legacy `maps/api/place/autocomplete` endpoint silently fails for new
 * Cloud projects, which left this route returning `[]` in production.
 * Degrades to an empty list when no key is configured or the provider fails —
 * the input then falls back to plain submit-to-search.
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

  // Prefer a server key (no HTTP-referrer restriction). The browser Places
  // key is referrer-locked and will 403 from this route if reused.
  const googleKey =
    process.env.GOOGLE_PLACES_SERVER_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_KEY?.trim() ||
    "";
  if (!googleKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[/api/suggest] No server Places key. Set GOOGLE_PLACES_SERVER_KEY or GOOGLE_MAPS_API_KEY (IP/unrestricted application restriction, Places API New enabled). NEXT_PUBLIC_GOOGLE_PLACES_KEY alone cannot power this route when it is HTTP-referrer restricted.",
      );
    }
    return NextResponse.json({ suggestions: [] } satisfies AddressSuggestions);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(GOOGLE_AUTOCOMPLETE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Key travels in a header, never the URL, so it stays out of
          // request logs.
          "X-Goog-Api-Key": googleKey,
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
