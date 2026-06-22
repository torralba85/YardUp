const ALLOWED_CITATION_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Validate and normalize a citation URL, allowing only `http`/`https` to guard
 * against `javascript:` and other unsafe schemes in rendered links.
 *
 * @param value - The candidate URL (unknown type; non-strings are rejected).
 * @returns The normalized absolute URL string, or `null` if missing, malformed,
 *   or using a disallowed protocol.
 */
export function getSafeCitationHref(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return ALLOWED_CITATION_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
