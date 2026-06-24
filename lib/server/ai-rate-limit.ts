import { type NextRequest, type NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitClientKey,
} from "@/lib/server/rate-limit";

interface RateLimitOptions {
  limit: number;
  namespace: string;
  windowMs: number;
}

interface RateLimitDoc {
  count?: number;
  resetAt?: number;
  namespace?: string;
  updatedAt?: number;
}

export async function checkAIRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === "test" || process.env.AI_RATE_LIMIT_BACKEND === "memory") {
    return checkRateLimit(request, options);
  }

  try {
    return await checkFirestoreRateLimit(request, options);
  } catch (err) {
    console.warn("[ai-rate-limit] Falling back to in-memory rate limit:", err);
    return checkRateLimit(request, options);
  }
}

async function checkFirestoreRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const now = Date.now();
  const key = getRateLimitClientKey(request, options.namespace);
  const ref = getAdminDb().collection("aiRateLimits").doc(documentIdForKey(key));
  let retryAfter = 0;

  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? (snapshot.data() as RateLimitDoc) : null;
    const resetAt = typeof data?.resetAt === "number" ? data.resetAt : 0;
    const count =
      resetAt > now && typeof data?.count === "number" ? data.count : 0;
    const nextResetAt = resetAt > now ? resetAt : now + options.windowMs;
    const nextCount = count + 1;

    if (nextCount > options.limit) {
      retryAfter = Math.ceil((nextResetAt - now) / 1000);
      return;
    }

    transaction.set(
      ref,
      {
        count: nextCount,
        namespace: options.namespace,
        resetAt: nextResetAt,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  return retryAfter > 0 ? createRateLimitResponse(retryAfter) : null;
}

function documentIdForKey(key: string): string {
  return Buffer.from(key).toString("base64url");
}
