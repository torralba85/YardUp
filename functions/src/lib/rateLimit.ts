import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export type LimitedService = "getRegulationGuide" | "generateDesignConcept" | "searchPropertyHistory" | "submitQuoteRequest" | "deliverQuoteRequest" | "submitFeedback";

export function buildRateLimitKey(service: LimitedService, uid?: string): string {
  return uid ? `${service}:user:${uid}` : `${service}:anonymous`;
}

export function isRateLimitExceeded(count: number, limit: number): boolean {
  return count >= limit;
}

export async function enforceRateLimit(service: LimitedService, uid: string | undefined, limit: number): Promise<void> {
  const key = buildRateLimitKey(service, uid);
  const db = getFirestore();
  const ref = db.collection("rateLimits").doc(key);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Timestamp.now();
    const windowStartedAt = snapshot.get("windowStartedAt") as Timestamp | undefined;
    const count = (snapshot.get("count") as number | undefined) ?? 0;
    const expired = !windowStartedAt || now.seconds - windowStartedAt.seconds >= 3600;

    if (expired) {
      transaction.set(ref, { count: 1, windowStartedAt: now, updatedAt: now }, { merge: true });
      return;
    }

    if (isRateLimitExceeded(count, limit)) {
      throw new HttpsError("resource-exhausted", "Too many requests. Try again later.");
    }

    transaction.set(ref, { count: count + 1, updatedAt: now }, { merge: true });
  });
}
