import { type NextRequest, type NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import {
  checkCombinedRateLimit,
  checkRateLimit,
  createRateLimitResponse,
  resolveRateLimitKey,
} from "@/lib/server/rate-limit";

interface RateLimitOptions {
  limit: number;
  namespace: string;
  windowMs: number;
  /** Fixed bucket identity for a global ceiling; see {@link resolveRateLimitKey}. */
  clientKey?: string;
  /** Reject rather than fall back to the memory limiter if Firestore is unreachable. */
  failClosed?: boolean;
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

/**
 * Enforce several limits together as one atomic decision (Firestore-backed in
 * production, in-memory in tests/dev). Counters advance only when the request
 * passes every bucket, so a rejection by one never consumes another. If the
 * Firestore path fails and any bucket is `failClosed`, the request is rejected
 * rather than degraded to per-instance memory limits (which would widen a hard
 * global ceiling exactly when it is needed).
 */
export async function checkCombinedAIRateLimit(
  request: NextRequest,
  optionsList: RateLimitOptions[],
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === "test" || process.env.AI_RATE_LIMIT_BACKEND === "memory") {
    return checkCombinedRateLimit(request, optionsList);
  }

  try {
    return await checkCombinedFirestoreRateLimit(request, optionsList);
  } catch (err) {
    console.warn("[ai-rate-limit] Combined limiter backend unavailable:", err);
    if (optionsList.some((options) => options.failClosed)) {
      const windowSeconds = Math.ceil(
        Math.max(...optionsList.map((options) => options.windowMs)) / 1000,
      );
      return createRateLimitResponse(windowSeconds);
    }
    return checkCombinedRateLimit(request, optionsList);
  }
}

async function checkCombinedFirestoreRateLimit(
  request: NextRequest,
  optionsList: RateLimitOptions[],
): Promise<NextResponse | null> {
  const now = Date.now();
  const db = getAdminDb();
  const refs = optionsList.map((options) =>
    db.collection("aiRateLimits").doc(documentIdForKey(resolveRateLimitKey(request, options))),
  );
  let retryAfter = 0;

  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const plans = optionsList.map((options, index) => {
      const data = snapshots[index].exists
        ? (snapshots[index].data() as RateLimitDoc)
        : null;
      const resetAt = typeof data?.resetAt === "number" ? data.resetAt : 0;
      const count =
        resetAt > now && typeof data?.count === "number" ? data.count : 0;
      const nextResetAt = resetAt > now ? resetAt : now + options.windowMs;
      return { nextCount: count + 1, nextResetAt };
    });

    // Reject without writing if any bucket would be exceeded.
    retryAfter = plans.reduce((worst, plan, index) => {
      if (plan.nextCount > optionsList[index].limit) {
        return Math.max(worst, Math.ceil((plan.nextResetAt - now) / 1000));
      }
      return worst;
    }, 0);
    if (retryAfter > 0) return;

    plans.forEach((plan, index) => {
      transaction.set(
        refs[index],
        {
          count: plan.nextCount,
          namespace: optionsList[index].namespace,
          resetAt: plan.nextResetAt,
          updatedAt: now,
        },
        { merge: true },
      );
    });
  });

  return retryAfter > 0 ? createRateLimitResponse(retryAfter) : null;
}

async function checkFirestoreRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  const now = Date.now();
  const key = resolveRateLimitKey(request, options);
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
