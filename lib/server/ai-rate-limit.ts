import { type NextRequest, type NextResponse } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import {
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
}

const OPENAI_GLOBAL_LIMIT = 6;
const OPENAI_GLOBAL_WINDOW_MS = 60_000;
const OPENAI_GLOBAL_KEY = "ai-provider:openai.com";

interface ProviderBucket {
  count: number;
  resetAt: number;
}

let memoryProviderBucket: ProviderBucket | null = null;

export class OpenAIProviderRateLimitError extends Error {
  constructor(
    public readonly status: 429 | 503,
    public readonly retryAfter: number,
    message: string,
  ) {
    super(message);
    this.name = "OpenAIProviderRateLimitError";
  }
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
 * Consume one unit from the shared provider ceiling immediately before an
 * outbound OpenAI request. Counting here, rather than at an API route, means
 * multi-round tool calls and the two-stage image flow consume their real cost
 * while malformed inbound payloads consume none.
 */
export async function consumeOpenAIProviderQuota(): Promise<void> {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.AI_RATE_LIMIT_BACKEND === "memory"
  ) {
    consumeMemoryOpenAIProviderQuota();
    return;
  }

  try {
    await consumeFirestoreOpenAIProviderQuota();
  } catch (err) {
    if (err instanceof OpenAIProviderRateLimitError) throw err;
    console.error("[ai-rate-limit] Shared provider limiter unavailable:", err);
    throw new OpenAIProviderRateLimitError(
      503,
      60,
      "AI rate limiting is temporarily unavailable.",
    );
  }
}

function consumeMemoryOpenAIProviderQuota(): void {
  const now = Date.now();
  if (!memoryProviderBucket || memoryProviderBucket.resetAt <= now) {
    memoryProviderBucket = {
      count: 1,
      resetAt: now + OPENAI_GLOBAL_WINDOW_MS,
    };
    return;
  }

  if (memoryProviderBucket.count + 1 > OPENAI_GLOBAL_LIMIT) {
    throw new OpenAIProviderRateLimitError(
      429,
      secondsUntil(memoryProviderBucket.resetAt, now),
      "The shared OpenAI request limit was reached.",
    );
  }
  memoryProviderBucket.count += 1;
}

async function consumeFirestoreOpenAIProviderQuota(): Promise<void> {
  const now = Date.now();
  const db = getAdminDb();
  const ref = db
    .collection("aiRateLimits")
    .doc(documentIdForKey(OPENAI_GLOBAL_KEY));
  let retryAfter = 0;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists ? (snapshot.data() as RateLimitDoc) : null;
    const resetAt = typeof data?.resetAt === "number" ? data.resetAt : 0;
    const count =
      resetAt > now && typeof data?.count === "number" ? data.count : 0;
    const nextResetAt = resetAt > now ? resetAt : now + OPENAI_GLOBAL_WINDOW_MS;

    if (count + 1 > OPENAI_GLOBAL_LIMIT) {
      retryAfter = secondsUntil(nextResetAt, now);
      return;
    }

    transaction.set(
      ref,
      {
        count: count + 1,
        namespace: "ai-provider",
        resetAt: nextResetAt,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  if (retryAfter > 0) {
    throw new OpenAIProviderRateLimitError(
      429,
      retryAfter,
      "The shared OpenAI request limit was reached.",
    );
  }
}

function secondsUntil(resetAt: number, now: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

/** Test-only reset for deterministic provider-quota cases. */
export function resetOpenAIProviderQuotaForTests(): void {
  memoryProviderBucket = null;
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
