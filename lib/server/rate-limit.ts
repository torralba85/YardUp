import { NextResponse, type NextRequest } from "next/server";

interface RateLimitOptions {
  limit: number;
  namespace: string;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function getRateLimitClientKey(request: NextRequest, namespace: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const ip =
    forwardedFor?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
  return `${namespace}:${ip}`;
}

export function createRateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}

export function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const key = getRateLimitClientKey(request, options.namespace);
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

function cleanupBuckets(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
