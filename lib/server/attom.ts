/** Server-only ATTOM address lookup. Never import into client bundles. */
import type { ProviderAttempt, ProviderOutcome } from "@/lib/data-evidence";
import type { GeocodeMatch, GeocodeResult } from "@/lib/geocode-api";
import {
  compareSitus,
  delimitStreetAddress,
  parseStreetAddress,
  parseStreetAddressWithConfidence,
  US_STATE_NAMES,
} from "@/lib/server/address-match";

const ATTOM_API = "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile";
const SOURCE_URL = "https://api.developer.attomdata.com/docs";
const TIMEOUT_MS = 5000;

export interface AttomLookup {
  result: (GeocodeResult & { match: GeocodeMatch }) | null;
  attempt: ProviderAttempt;
}

function outcome(outcome: ProviderOutcome): AttomLookup {
  return {
    result: null,
    attempt: { provider: "ATTOM", dataset: "Property Basic Profile", sourceUrl: SOURCE_URL, outcome },
  };
}

/** Only numbered, reliably parsed US addresses with a locality can spend quota. */
export function canLookUpAttomAddress(query: string): boolean {
  const parsed = parseStreetAddressWithConfidence(query);
  return Boolean(parsed?.confidence.street &&
    (parsed.address.zip || (parsed.address.city && parsed.address.state)));
}

/**
 * Accept exactly one property whose street and all entered locality agree.
 * ATTOM is supplemental: missing keys, ambiguity, malformed data and outages
 * never prevent the existing geocoder/parcel providers from answering.
 * Only allowlisted address fields leave this module; no owner/tax/sale data.
 */
export async function fetchAttomAddress(query: string): Promise<AttomLookup> {
  const key = process.env.ATTOM_API_KEY?.trim();
  const requested = parseStreetAddress(query);
  if (!key || !requested || !canLookUpAttomAddress(query)) return outcome("unsupported");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = new URL(ATTOM_API);
    url.searchParams.set("address1", delimitStreetAddress(query).split(",")[0].trim());
    url.searchParams.set("address2", [requested.city, [requested.state, requested.zip].filter(Boolean).join(" ")]
      .filter(Boolean).join(", "));
    const response = await fetch(url.toString(), {
      headers: { apikey: key, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (response.status === 401 || response.status === 403) return outcome("auth-failed");
    if (response.status === 404 || response.status === 204) return outcome("no-match");
    // ATTOM documents HTTP 400 + SuccessWithoutResult for an unmatched address.
    if (!response.ok && response.status !== 400) return outcome("provider-error");

    const json = record(await response.json());
    const status = record(json.status);
    if (status.code === 400 || status.code === 1) return outcome("no-match");
    if (!response.ok) return outcome("provider-error");
    if (status.code !== 0) return outcome("invalid-response");
    if (!Array.isArray(json.property)) return outcome("invalid-response");
    if (json.property.length === 0) return outcome("no-match");
    // Multiple records can represent units or duplicate property identities.
    if (json.property.length !== 1 || (status.total != null && Number(status.total) !== 1)) {
      return outcome("invalid-response");
    }
    const property = record(json.property[0]);
    const address = record(property.address);
    const location = record(property.location);
    // A complete address record can still carry an area centroid. Do not use
    // explicitly coarse coordinates to select or contradict a parcel.
    const accuracy = textValue(location.accuracy)?.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (accuracy && /^(?:zip|postal|city|county|state|country|locality)/.test(accuracy)) {
      return outcome("invalid-response");
    }
    const line = textValue(address.line1);
    const city = textValue(address.locality);
    const state = textValue(address.countrySubd)?.toUpperCase();
    const zip = /^(\d{5})(?:-\d{4})?$/.exec(textValue(address.postal1) ?? "")?.[1];
    const country = textValue(address.country)?.toUpperCase();
    if (!line || !city || !state || !US_STATE_NAMES[state] || !zip ||
      (country && !["US", "USA", "UNITED STATES"].includes(country))) {
      return outcome("invalid-response");
    }
    const comparison = compareSitus(requested, { line, cities: [city], state, zip });
    if (comparison.verdict !== "match" || !comparison.localityConfirmed) return outcome("no-match");

    const lat = coordinate(location.latitude, 90);
    const lng = coordinate(location.longitude, 180);
    const published = /^\s*(\d+[A-Za-z]?)\s+(\S.*)$/.exec(line);
    if (lat === null || lng === null || !published || (lat === 0 && lng === 0)) {
      return outcome("invalid-response");
    }
    const rawId = record(property.identifier).attomId;
    const providerId = typeof rawId === "number" && Number.isSafeInteger(rawId) && rawId > 0
      ? String(rawId)
      : typeof rawId === "string" && /^\d+$/.test(rawId) && Number(rawId) > 0 ? rawId : undefined;
    if (!providerId) return outcome("invalid-response");
    // ATTOM reserves this ID for addresses not matched to an existing property.
    if (providerId === "999999999") return outcome("no-match");

    const matched = outcome("matched");
    // Only a rooftop point is precise enough to select a parcel; street,
    // missing or unrecognized accuracy follows the geocoder fallback.
    const streetPoint = accuracy !== "rooftop";
    matched.result = {
      lat, lng,
      formattedAddress: `${line}, ${city}, ${state} ${zip}`,
      match: {
        provider: "attom",
        providerId,
        matchType: "property-address",
        // An address match is not proof of rooftop positional accuracy.
        precision: streetPoint ? "street" : "address",
        partialMatch: false,
        components: { houseNumber: published[1], road: published[2], city, state, zip, country: "US" },
        evidence: {
          status: "observed",
          source: { provider: "ATTOM", dataset: "Property Basic Profile", sourceUrl: SOURCE_URL, recordId: providerId },
          retrievedAt: new Date().toISOString(),
          confidence: streetPoint ? "low" : "medium",
          warnings: [
            "ATTOM confirms the property address; its point is not proof of a surveyed boundary or rooftop location.",
            ...(accuracy === "street" ? ["ATTOM places this address at street-level precision; verify the property against county records."] : []),
            ...(streetPoint && accuracy !== "street" ? ["ATTOM does not report rooftop precision for this address point; verify the property against county records."] : []),
          ],
        },
      },
    };
    return matched;
  } catch {
    // Do not log request URLs, headers or provider error bodies: they can
    // contain credentials, searched addresses or unrelated property data.
    return outcome(controller.signal.aborted ? "timeout" : "provider-error");
  } finally {
    clearTimeout(timer);
  }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function coordinate(value: unknown, max: number): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= max ? number : null;
}
