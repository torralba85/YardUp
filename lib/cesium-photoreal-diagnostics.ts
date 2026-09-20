/**
 * cesium-photoreal-diagnostics.ts — sanitized error reporting for the
 * photorealistic basemap ladder.
 *
 * `loadPhotorealTileset` (in `lib/cesium-photoreal.ts`) reports inside the
 * ladder itself, so the viewer component stays untouched: one report per
 * failed *configured* route, none when no credential is configured (that case
 * is expected and already covered by `photorealUnavailableReason`).
 *
 * Delivery: `console.warn` in development, and the existing consent-gated
 * GA4 event path (`lib/analytics/*`) in production. Telemetry never throws —
 * a reporting failure must not break the ladder's never-throws contract.
 *
 * Privacy: the report carries the failed route, an allowlisted error
 * category, and a sanitized message only. Raw credentials (verbatim and
 * URL-encoded), and raw request URLs, are redacted before anything leaves
 * this module.
 */

import { trackEvent } from "./analytics/gtag";
import { readConsent } from "./analytics/consent";
import type { PhotorealRoute } from "./cesium-photoreal";

/** GA4 event name for a failed photoreal route (snake_case, under 40 chars). */
export const PHOTOREAL_ERROR_EVENT = "photoreal_tileset_error";

/** Placeholder standing in for redacted secrets and request URLs. */
export const REDACTED = "[redacted]";

/** Sanitized messages are truncated to this length after redaction. */
export const MAX_SANITIZED_MESSAGE_LENGTH = 300;

/**
 * Allowlisted error categories. The category is derived from the message by
 * pattern matching, so an unexpected provider message can only ever surface
 * as `unknown` — never as free-form provider text in a structured field.
 */
export type PhotorealErrorCategory =
  | "auth"
  | "quota"
  | "api-disabled"
  | "network"
  | "sdk"
  | "unknown";

/** What leaves this module per failed configured route. No credentials, no URLs. */
export interface PhotorealErrorReport {
  route: PhotorealRoute;
  category: PhotorealErrorCategory;
  message: string;
}

const CATEGORY_PATTERNS: { category: PhotorealErrorCategory; pattern: RegExp }[] = [
  // Thrown by our own factories before any network work (missing helper in
  // the Cesium build, blank credential reaching a factory directly).
  { category: "sdk", pattern: /no createGooglePhotorealistic3DTileset|cannot load ion-hosted|explicit (browser key|token)/i },
  // The Map Tiles API was never enabled for the key's project.
  { category: "api-disabled", pattern: /api.{0,40}(not enabled|not been used|disabled)|service_disabled|access not configured/i },
  // Rejected key or token.
  { category: "auth", pattern: /\b401\b|\b403\b|forbidden|unauthorized|invalid.{0,12}(key|token)|(key|token).{0,12}invalid|denied|rejected|api key/i },
  // Spent quota or missing billing.
  { category: "quota", pattern: /\b429\b|quota|exceed|resource_exhausted|rate.?limit|billing/i },
  // Transport never completed.
  { category: "network", pattern: /failed to fetch|network|timed ?out|timeout|econn|etimedout|enotfound|offline|err_network|err_internet|err_connection/i },
];

/**
 * Maps a raw error message to an allowlisted category.
 *
 * @param message - The raw error message (any non-string becomes `unknown`).
 * @returns The first matching category, or `unknown`.
 */
export function categorizePhotorealError(message: unknown): PhotorealErrorCategory {
  if (typeof message !== "string" || !message) return "unknown";
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(message)) return category;
  }
  return "unknown";
}

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

/**
 * Sanitizes a raw error message for telemetry.
 *
 * Redacts every occurrence of each supplied secret — verbatim and
 * URL-encoded — then strips raw `http(s)` request URLs (which may carry keys
 * in query strings), and truncates. Non-string input yields `""`.
 *
 * @param message - The raw error message, possibly containing credentials.
 * @param secrets - Credential values to redact (keys, tokens).
 * @returns The sanitized message, at most {@link MAX_SANITIZED_MESSAGE_LENGTH} chars.
 */
export function sanitizePhotorealErrorMessage(message: unknown, secrets: unknown[] = []): string {
  if (typeof message !== "string" || !message) return "";
  let out = message;
  for (const secret of secrets) {
    if (typeof secret !== "string") continue;
    const raw = secret.trim();
    if (!raw) continue;
    // split/join avoids regex-escaping issues with arbitrary key material.
    out = out.split(raw).join(REDACTED);
    const encoded = encodeURIComponent(raw);
    if (encoded !== raw) out = out.split(encoded).join(REDACTED);
  }
  out = out.replace(URL_PATTERN, REDACTED);
  return out.length > MAX_SANITIZED_MESSAGE_LENGTH
    ? out.slice(0, MAX_SANITIZED_MESSAGE_LENGTH)
    : out;
}

/**
 * Builds the telemetry-safe report for one failed route attempt.
 *
 * @param route - The configured route that failed.
 * @param error - The caught error.
 * @param secrets - Credential values that must not appear in the report.
 */
export function buildPhotorealErrorReport(
  route: PhotorealRoute,
  error: unknown,
  secrets: unknown[] = [],
): PhotorealErrorReport {
  const raw = error instanceof Error ? error.message : String(error);
  return {
    route,
    category: categorizePhotorealError(raw),
    message: sanitizePhotorealErrorMessage(raw, secrets),
  };
}

/** Receives one sanitized report per failed configured route. Never throws. */
export type PhotorealErrorReporter = (report: PhotorealErrorReport) => void;

function defaultReporter(report: PhotorealErrorReport): void {
  try {
    if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
      console.warn(`[photoreal] ${report.route} failed (${report.category}): ${report.message}`);
    }
  } catch {
    // Telemetry must never break the ladder.
  }
  try {
    // Consent-gated: `readConsent` is the opt-in decision; `trackEvent` also
    // no-ops until the GA4 tag loads (which itself requires opt-in).
    if (readConsent() === "granted") {
      trackEvent(PHOTOREAL_ERROR_EVENT, {
        route: report.route,
        category: report.category,
        message: report.message,
      });
    }
  } catch {
    // Telemetry must never break the ladder.
  }
}

let reporterOverride: PhotorealErrorReporter | null = null;

/**
 * Overrides the error reporter, primarily for tests. Pass `null` to restore
 * the default console/analytics reporter.
 */
export function setPhotorealErrorReporter(reporter: PhotorealErrorReporter | null): void {
  reporterOverride = reporter;
}

/**
 * Reports one failed configured route. Sanitizes, dispatches to the active
 * reporter, and never throws — even if telemetry itself fails.
 *
 * @param route - The configured route that failed.
 * @param error - The caught error.
 * @param secrets - Credential values that must not appear in the report.
 */
export function reportPhotorealError(route: PhotorealRoute, error: unknown, secrets: unknown[] = []): void {
  try {
    (reporterOverride ?? defaultReporter)(buildPhotorealErrorReport(route, error, secrets));
  } catch {
    // The ladder degrades rather than throwing; so does its telemetry.
  }
}
