import { type NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/server/api-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";

const GOOGLE_AUTOCOMPLETE_API =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const TIMEOUT_MS = 4000;
const MAX_QUERY_LEN = 200;
const MIN_QUERY_LEN = 3;
const MAX_SUGGESTIONS = 5;

export const runtime = "nodejs";

export interface AddressSuggestions {
  suggestions: string[];
}

/**
 * GET /api/suggest?q={partial address}
 *
 * Returns US address predictions for a partial query so the studio's address
 * input can suggest while the user types, without exposing a browser-side
 * Places key. Uses the server-side Google key (Places Autocomplete API).
 * Degrades to an empty list when no key is configured or the provider fails —
 * the input then falls back to plain submit-to-search.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

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

  const googleKey =
    process.env.GOOGLE_PLACES_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!googleKey) {
    return NextResponse.json({ suggestions: [] } satisfies AddressSuggestions);
  }

  try {
    const url = new URL(GOOGLE_AUTOCOMPLETE_API);
    url.searchParams.set("input", q);
    url.searchParams.set("types", "address");
    url.searchParams.set("components", "country:us");
    url.searchParams.set("key", googleKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error(`Autocomplete returned ${res.status}`);

    const json = (await res.json()) as {
      predictions?: Array<{ description?: string }>;
    };
    const suggestions = (json.predictions ?? [])
      .map((p) => p.description?.trim() ?? "")
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
