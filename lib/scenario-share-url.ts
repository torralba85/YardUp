import { CANONICAL_ORIGIN } from "./canonical-origin";
import { serializeScenarioParams, type ScenarioState } from "./scenario-url";

export function validLayoutToken(token: string): boolean {
  return /^[a-f0-9]{48}$/.test(token);
}

/** Keep the established design serializer; the opaque ID restores the real parcel and all assumptions. */
export function buildScenarioShareUrl(scenario: ScenarioState, token?: string): string {
  const url = new URL("/studio", CANONICAL_ORIGIN);
  url.search = serializeScenarioParams(scenario);
  if (token) {
    if (!validLayoutToken(token)) throw new Error("Invalid layout link.");
    url.searchParams.set("layout", token);
  }
  url.searchParams.set("utm_source", "studio_email");
  url.searchParams.set("utm_medium", "transactional");
  url.searchParams.set("utm_campaign", "saved_3d_link");
  return url.toString();
}

/** Check the parsed origin, not a string prefix that also accepts attacker domains. */
export function isAllowedScenarioUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4000) return false;
  try {
    const url = new URL(value);
    const local = process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost";
    return (url.origin === CANONICAL_ORIGIN || local) && url.pathname === "/studio" && !url.username && !url.password && !url.hash;
  } catch { return false; }
}
