const ALLOWED_REDIRECT_PATHS = [
  "/studio",
  "/builder",
  "/certificates",
  "/settings",
  "/delete-account",
  "/feedback",
] as const;

/**
 * Validate a `?next=` query parameter to prevent open redirects.
 * Only permits known internal product routes (preserving search/hash).
 */
export function safeRedirectPath(value: string | null, buildersAllowed: boolean): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/studio";
  }

  try {
    const parsed = new URL(value, "https://lotfoundry.local");
    if (parsed.origin !== "https://lotfoundry.local") {
      return "/studio";
    }
    if (
      !(ALLOWED_REDIRECT_PATHS as readonly string[]).includes(parsed.pathname) ||
      (!buildersAllowed && parsed.pathname === "/builder")
    ) {
      return "/studio";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/studio";
  }
}
