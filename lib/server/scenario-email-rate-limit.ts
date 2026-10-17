import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/server/firebase-admin";
import {
  createRateLimitResponse,
  getRateLimitClientKey,
} from "@/lib/server/rate-limit";

const WINDOW_MS = 60 * 60 * 1000;
const PER_CLIENT_LIMIT = 2;
const GLOBAL_LIMIT = 30;
// Client keys come from forwarding headers a script can rotate, so each inbox
// also has its own ceiling: nobody can flood one address with layout emails.
const RECIPIENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PER_RECIPIENT_LIMIT = 3;

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
 * Atomically enforce the client, recipient and global scenario-email quotas. A rejected per-client request does
 * not consume the global write ceiling, and a saturated global bucket does not
 * create a new client document for rotating forwarded addresses. Production
 * fails closed when Firestore is unavailable instead of widening the global
 * ceiling independently on each serverless instance.
 */
export async function checkScenarioEmailRateLimit(
  request: NextRequest,
  recipientEmail: string,
): Promise<NextResponse | null> {
  const recipientKey = recipientKeyFor(recipientEmail);
  if (
    process.env.NODE_ENV === "test" ||
    process.env.AI_RATE_LIMIT_BACKEND === "memory"
  ) {
    return checkMemoryScenarioEmailRateLimit(request, recipientKey);
  }

  try {
    return await checkFirestoreScenarioEmailRateLimit(request, recipientKey);
  } catch (err) {
    console.error("[scenario-email-rate-limit] backend unavailable:", err);
    return NextResponse.json(
      { error: "Layout email is temporarily unavailable. Please try again shortly." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}

function checkMemoryScenarioEmailRateLimit(request: NextRequest, recipientKey: string): NextResponse | null {
  const now = Date.now();
  const globalKey = "scenario-email-global:all";
  const clientKey = getRateLimitClientKey(request, "scenario-email");
  const global = currentBucket(memoryBuckets.get(globalKey), now);
  const client = currentBucket(memoryBuckets.get(clientKey), now);
  const recipient = currentBucket(memoryBuckets.get(recipientKey), now);

  if (client.count + 1 > PER_CLIENT_LIMIT) {
    return createRateLimitResponse(secondsUntil(client.resetAt, now));
  }
  if (recipient.count + 1 > PER_RECIPIENT_LIMIT) {
    return createRateLimitResponse(secondsUntil(recipient.resetAt, now, RECIPIENT_WINDOW_MS));
  }
  if (global.count + 1 > GLOBAL_LIMIT) {
    return createRateLimitResponse(secondsUntil(global.resetAt, now));
  }

  memoryBuckets.set(clientKey, {
    count: client.count + 1,
    resetAt: client.resetAt || now + WINDOW_MS,
  });
  memoryBuckets.set(recipientKey, {
    count: recipient.count + 1,
    resetAt: recipient.resetAt || now + RECIPIENT_WINDOW_MS,
  });
  memoryBuckets.set(globalKey, {
    count: global.count + 1,
    resetAt: global.resetAt || now + WINDOW_MS,
  });
  return null;
}

async function checkFirestoreScenarioEmailRateLimit(
  request: NextRequest,
  recipientKey: string,
): Promise<NextResponse | null> {
  const now = Date.now();
  const db = getAdminDb();
  const collection = db.collection("aiRateLimits");
  const globalRef = collection.doc(documentIdForKey("scenario-email-global:all"));
  const clientKey = getRateLimitClientKey(request, "scenario-email");
  const clientRef = collection.doc(documentIdForKey(clientKey));
  const recipientRef = collection.doc(documentIdForKey(recipientKey));
  let retryAfter = 0;

  await db.runTransaction(async (transaction) => {
    // Firestore may retry this callback after a concurrent quota update.
    retryAfter = 0;
    const globalSnapshot = await transaction.get(globalRef);
    const clientSnapshot = await transaction.get(clientRef);
    const recipientSnapshot = await transaction.get(recipientRef);
    const global = currentBucket(
      globalSnapshot.exists ? (globalSnapshot.data() as RateLimitDoc) : undefined,
      now,
    );
    const client = currentBucket(
      clientSnapshot.exists ? (clientSnapshot.data() as RateLimitDoc) : undefined,
      now,
    );
    const recipient = currentBucket(
      recipientSnapshot.exists ? (recipientSnapshot.data() as RateLimitDoc) : undefined,
      now,
    );

    // Check every bucket before writing any. This is the load-bearing part:
    // rejected requests perform transaction reads only and consume no quota.
    if (client.count + 1 > PER_CLIENT_LIMIT) {
      retryAfter = secondsUntil(client.resetAt, now);
      return;
    }
    if (recipient.count + 1 > PER_RECIPIENT_LIMIT) {
      retryAfter = secondsUntil(recipient.resetAt, now, RECIPIENT_WINDOW_MS);
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
        namespace: "scenario-email",
        resetAt: client.resetAt || now + WINDOW_MS,
        updatedAt: now,
      },
      { merge: true },
    );
    transaction.set(
      recipientRef,
      {
        count: recipient.count + 1,
        namespace: "scenario-email-recipient",
        resetAt: recipient.resetAt || now + RECIPIENT_WINDOW_MS,
        updatedAt: now,
      },
      { merge: true },
    );
    transaction.set(
      globalRef,
      {
        count: global.count + 1,
        namespace: "scenario-email-global",
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

function secondsUntil(resetAt: number, now: number, windowMs = WINDOW_MS): number {
  return Math.max(1, Math.ceil(((resetAt || now + windowMs) - now) / 1000));
}

/** Rate-limit documents hold a one-way hash, never the address itself. */
function recipientKeyFor(email: string): string {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `scenario-email-recipient:${hash}`;
}

function documentIdForKey(key: string): string {
  return Buffer.from(key).toString("base64url");
}

/** Test-only reset to keep fixed-window cases isolated. */
export function resetScenarioEmailRateLimitBuckets() {
  memoryBuckets.clear();
}
