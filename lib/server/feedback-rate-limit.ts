import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import {
  createRateLimitResponse,
  getRateLimitClientKey,
} from "@/lib/server/rate-limit";

const WINDOW_MS = 60 * 60 * 1000;
const PER_CLIENT_LIMIT = 3;
const GLOBAL_LIMIT = 60;

interface RateLimitDoc {
  count?: number;
  resetAt?: number;
  namespace?: string;
  updatedAt?: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();

/**
 * Atomically enforce both feedback quotas. A rejected per-client request does
 * not consume the global write ceiling, and a saturated global bucket does not
 * create a new client document for rotating forwarded addresses. Production
 * fails closed when Firestore is unavailable instead of widening the global
 * ceiling independently on each serverless instance.
 */
export async function checkFeedbackRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.AI_RATE_LIMIT_BACKEND === "memory"
  ) {
    return checkMemoryFeedbackRateLimit(request);
  }

  try {
    return await checkFirestoreFeedbackRateLimit(request);
  } catch (err) {
    console.error("[feedback-rate-limit] backend unavailable:", err);
    return NextResponse.json(
      { error: "Feedback is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}

function checkMemoryFeedbackRateLimit(request: NextRequest): NextResponse | null {
  const now = Date.now();
  const globalKey = "feedback-global:all";
  const clientKey = getRateLimitClientKey(request, "feedback");
  const global = currentBucket(memoryBuckets.get(globalKey), now);
  const client = currentBucket(memoryBuckets.get(clientKey), now);

  if (client.count + 1 > PER_CLIENT_LIMIT) {
    return createRateLimitResponse(secondsUntil(client.resetAt, now));
  }
  if (global.count + 1 > GLOBAL_LIMIT) {
    return createRateLimitResponse(secondsUntil(global.resetAt, now));
  }

  memoryBuckets.set(clientKey, {
    count: client.count + 1,
    resetAt: client.resetAt || now + WINDOW_MS,
  });
  memoryBuckets.set(globalKey, {
    count: global.count + 1,
    resetAt: global.resetAt || now + WINDOW_MS,
  });
  return null;
}

async function checkFirestoreFeedbackRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  const now = Date.now();
  const db = getAdminDb();
  const collection = db.collection("aiRateLimits");
  const globalRef = collection.doc(documentIdForKey("feedback-global:all"));
  const clientKey = getRateLimitClientKey(request, "feedback");
  const clientRef = collection.doc(documentIdForKey(clientKey));
  let retryAfter = 0;

  await db.runTransaction(async (transaction) => {
    const globalSnapshot = await transaction.get(globalRef);
    const clientSnapshot = await transaction.get(clientRef);
    const global = currentBucket(
      globalSnapshot.exists ? (globalSnapshot.data() as RateLimitDoc) : undefined,
      now,
    );
    const client = currentBucket(
      clientSnapshot.exists ? (clientSnapshot.data() as RateLimitDoc) : undefined,
      now,
    );

    // Check both before writing either bucket. This is the load-bearing part:
    // rejected requests perform transaction reads only and consume no quota.
    if (client.count + 1 > PER_CLIENT_LIMIT) {
      retryAfter = secondsUntil(client.resetAt, now);
      return;
    }
    if (global.count + 1 > GLOBAL_LIMIT) {
      retryAfter = secondsUntil(global.resetAt, now);
      return;
    }

    transaction.set(
      clientRef,
      {
        count: client.count + 1,
        namespace: "feedback",
        resetAt: client.resetAt || now + WINDOW_MS,
        updatedAt: now,
      },
      { merge: true },
    );
    transaction.set(
      globalRef,
      {
        count: global.count + 1,
        namespace: "feedback-global",
        resetAt: global.resetAt || now + WINDOW_MS,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  return retryAfter > 0 ? createRateLimitResponse(retryAfter) : null;
}

function currentBucket(
  value: RateLimitDoc | Bucket | undefined,
  now: number,
): Bucket {
  const resetAt = typeof value?.resetAt === "number" ? value.resetAt : 0;
  if (resetAt <= now) return { count: 0, resetAt: 0 };
  return {
    count: typeof value?.count === "number" ? value.count : 0,
    resetAt,
  };
}

function secondsUntil(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil(((resetAt || now + WINDOW_MS) - now) / 1000));
}

function documentIdForKey(key: string): string {
  return Buffer.from(key).toString("base64url");
}

/** Test-only reset to keep fixed-window cases isolated. */
export function resetFeedbackRateLimitBuckets() {
  memoryBuckets.clear();
}
