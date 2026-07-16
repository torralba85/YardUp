import { NextResponse, type NextRequest } from "next/server";

interface RateLimitOptions {
  limit: number;
  namespace: string;
  windowMs: number;
  /**
   * Fixed bucket identity, used instead of the request-derived client key. Set
   * this to enforce a global (all-clients) ceiling that a caller cannot escape
   * by rotating forwarding headers.
   */
  clientKey?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Builds the stable per-client bucket key from proxy headers and route namespace.
 *
 * @param request - Incoming request with forwarding headers from Hosting/Functions.
 * @param namespace - Route-specific namespace to avoid sharing buckets.
 * @returns A namespace-prefixed client key.
 */
export function getRateLimitClientKey(request: NextRequest, namespace: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip =
    forwardedFor?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
  return `${namespace}:${ip}`;
}

/**
 * Resolves the bucket key for a limiter call: a caller-supplied fixed
 * {@link RateLimitOptions.clientKey} (for global ceilings) takes precedence
 * over the request-derived, forwarding-header-based client key.
 */
export function resolveRateLimitKey(
  request: NextRequest,
  options: RateLimitOptions,
): string {
  return options.clientKey
    ? `${options.namespace}:${options.clientKey}`
    : getRateLimitClientKey(request, options.namespace);
}

/**
 * Creates the common 429 response returned by rate limiters.
 *
 * @param retryAfter - Seconds until the current bucket resets.
 * @returns A JSON 429 response with a `Retry-After` header.
 */
export function createRateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

/**
 * Apply a fixed-window, in-memory rate limit keyed by client IP and namespace.
 *
 * Note: state is per-process, so limits are approximate across multiple
 * serverless instances. Suitable as a lightweight abuse guard, not a hard quota.
 *
 * @param request - The incoming request (its client IP forms the key).
 * @param options - The `limit`, `namespace`, and `windowMs` for this limiter.
 * @returns `null` if the request is allowed, or a 429 {@link NextResponse} (with
 *   a `Retry-After` header) the route should return when the limit is exceeded.
 */
export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const key = resolveRateLimitKey(request, options);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    cleanupBuckets(now);
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= options.limit) {
    return null;
  }

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  return createRateLimitResponse(retryAfter);
}

/** Clear the in-memory buckets. Test-only: keeps limiter cases isolated. */
export function resetRateLimitBuckets() {
  buckets.clear();
}

function cleanupBuckets(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
