/**
 * Server-only Google auth headers for Maps Platform APIs that accept OAuth.
 *
 * On Firebase Functions the metadata server issues a short-lived token for the
 * Function's runtime service account, so production calls need no API key.
 * Off Google Cloud, or if the metadata server fails, callers fall back to the
 * API key they pass in.
 */
const GOOGLE_METADATA_TOKEN_API =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const METADATA_TIMEOUT_MS = 1500;

let cachedRuntimeAccessToken:
  | { accessToken: string; expiresAt: number }
  | undefined;

async function getRuntimeAccessToken(): Promise<string> {
  if (
    cachedRuntimeAccessToken &&
    cachedRuntimeAccessToken.expiresAt > Date.now()
  ) {
    return cachedRuntimeAccessToken.accessToken;
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
  return token.access_token;
}

/**
 * Resolve auth headers for a Google API call: the runtime service account when
 * a Google Cloud project is present, otherwise the given API key.
 *
 * @param apiKey Key used when runtime OAuth is unavailable.
 * @returns Headers to spread into the request, or `null` with no usable auth.
 */
export async function getGoogleAuthHeaders(
  apiKey?: string,
): Promise<Record<string, string> | null> {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    "";

  if (projectId) {
    try {
      const accessToken = await getRuntimeAccessToken();
      return {
        Authorization: `Bearer ${accessToken}`,
        "X-Goog-User-Project": projectId,
      };
    } catch (error) {
      console.error("[google-runtime-auth] runtime OAuth unavailable:", error);
    }
  }

  return apiKey ? { "X-Goog-Api-Key": apiKey } : null;
}
