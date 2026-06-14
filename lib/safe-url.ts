const ALLOWED_CITATION_PROTOCOLS = new Set(["http:", "https:"]);

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
