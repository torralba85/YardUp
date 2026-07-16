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
  /**
   * When true, a Firestore-backed check that cannot reach its backend rejects
   * the request (fail closed) instead of degrading to the per-instance memory
   * limiter. Use for hard global ceilings whose bound must not widen under a
   * backend outage. Only consulted by the Firestore-backed limiter.
   */
  failClosed?: boolean;
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

/**
 * Apply several fixed-window limits atomically against the in-memory store:
 * every bucket is peeked first, and the counters are incremented only when the
 * request would pass all of them. A request rejected by one bucket therefore
 * consumes none of the others — a caller over its per-client limit cannot burn
 * a shared global bucket, and a saturated global bucket rejects without minting
 * fresh per-client entries.
 *
 * @returns `null` if allowed, or a 429 {@link NextResponse} (with the longest
 *   applicable `Retry-After`) when any bucket is exceeded.
 */
export function checkCombinedRateLimit(
  request: NextRequest,
  optionsList: RateLimitOptions[],
): NextResponse | null {
  const now = Date.now();
  const keyed = optionsList.map((options) => ({
    options,
    key: resolveRateLimitKey(request, options),
  }));

  // Peek pass: would this request exceed any bucket? Do not mutate yet.
  let retryAfter = 0;
  for (const { options, key } of keyed) {
    const bucket = buckets.get(key);
    const active = bucket && bucket.resetAt > now ? bucket : null;
    if ((active?.count ?? 0) + 1 > options.limit) {
      const resetAt = active ? active.resetAt : now + options.windowMs;
      retryAfter = Math.max(retryAfter, Math.ceil((resetAt - now) / 1000));
    }
  }
  if (retryAfter > 0) return createRateLimitResponse(retryAfter);

  // Commit pass: all buckets have headroom, so charge each one.
  for (const { options, key } of keyed) {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    } else {
      bucket.count += 1;
    }
  }
  cleanupBuckets(now);
  return null;
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
