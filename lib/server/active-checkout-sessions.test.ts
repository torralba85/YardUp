import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const docs = new Map<string, Record<string, unknown>>();
  const Timestamp = {
    fromMillis: (millis: number) => ({ toMillis: () => millis }),
  };
  const db = {
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async <T>(
      callback: (transaction: {
        get: (ref: { id: string }) => Promise<{
          data: () => Record<string, unknown> | undefined;
        }>;
        set: (ref: { id: string }, data: Record<string, unknown>) => void;
        update: (ref: { id: string }, data: Record<string, unknown>) => void;
      }) => Promise<T>,
    ) =>
      callback({
        get: async (ref) => ({ data: () => docs.get(ref.id) }),
        set: (ref, data) => docs.set(ref.id, data),
        update: (ref, data) => docs.set(ref.id, { ...docs.get(ref.id), ...data }),
      }),
  };
  return { docs, Timestamp, db };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "server-timestamp" },
  Timestamp: mocks.Timestamp,
}));

vi.mock("./firebase-admin", () => ({ getAdminDb: () => mocks.db }));

import {
  replaceExpiredActiveCheckout,
  reserveActiveCheckout,
  rotateFailedActiveCheckout,
  saveActiveCheckoutSession,
} from "./active-checkout-sessions";

const input = {
  purchaseType: "lead_unlock" as const,
  accountId: "builder-1",
  purchaseId: "lead-1",
  attemptId: "attempt-1",
  parameters: { origin: "https://lotfoundry.net", previewSerial: "LF-X" },
};

beforeEach(() => {
  mocks.docs.clear();
});

describe("active checkout sessions", () => {
  it("rotates the attempt when a failed Session is cleared", async () => {
    // Clearing the Session alone would not free the buyer: their
    // checkoutAttemptId persists in the browser for 24 hours, so the next
    // request would rebuild the same Stripe idempotency key and Stripe would
    // replay the dead Session. Only a new attempt id mints a payable one.
    const reservation = await reserveActiveCheckout(input);
    await saveActiveCheckoutSession(input, reservation, {
      id: "cs_async_failed",
      url: "https://stripe.test/checkout/dead",
    });

    await rotateFailedActiveCheckout(input, "cs_async_failed");
    const next = await reserveActiveCheckout(input);

    expect(next.attemptId).not.toBe(input.attemptId);
    expect(next.sessionId).toBeUndefined();
    expect(next.sessionUrl).toBeUndefined();
    // The presentation parameters must survive so the replacement Session is
    // built the same way the original was.
    expect(next.parameters).toEqual(input.parameters);
  });

  it("leaves a newer attempt alone when a late failure event arrives", async () => {
    const reservation = await reserveActiveCheckout(input);
    await saveActiveCheckoutSession(input, reservation, {
      id: "cs_current",
      url: "https://stripe.test/checkout/current",
    });

    await rotateFailedActiveCheckout(input, "cs_some_older_session");

    const next = await reserveActiveCheckout(input);
    expect(next.attemptId).toBe(input.attemptId);
    expect(next.sessionId).toBe("cs_current");
  });

  it("retains a saved session past local expiry for Stripe status verification", async () => {
    const reservation = await reserveActiveCheckout(input);
    await saveActiveCheckoutSession(input, reservation, {
      id: "cs_pending_webhook",
      url: "https://stripe.test/checkout/paid",
      expiresAtMs: Date.now() - 1000,
    });
    const resumed = await reserveActiveCheckout({ ...input, attemptId: "attempt-2" });
    expect(resumed.sessionId).toBe("cs_pending_webhook");
    expect(resumed.attemptId).toBe(reservation.attemptId);
  });

  it("keeps one active reservation when a second tab supplies a new attempt", async () => {
    const first = await reserveActiveCheckout(input);
    const second = await reserveActiveCheckout({ ...input, attemptId: "attempt-2" });

    expect(first.attemptId).toBe("attempt-1");
    expect(second).toEqual(first);
    expect(Array.from(mocks.docs.values())[0]).toEqual(
      expect.objectContaining({ accountId: "builder-1" }),
    );
  });

  it("persists the returned Stripe session for later resumptions", async () => {
    const reservation = await reserveActiveCheckout(input);
    const saved = await saveActiveCheckoutSession(input, reservation, {
      id: "cs_open",
      url: "https://stripe.test/checkout/open",
      expiresAtMs: Date.now() + 60_000,
    });
    const resumed = await reserveActiveCheckout({ ...input, attemptId: "attempt-2" });

    expect(saved.sessionId).toBe("cs_open");
    expect(resumed.sessionUrl).toBe("https://stripe.test/checkout/open");
    expect(resumed.attemptId).toBe("attempt-1");
  });

  it("creates one fresh reservation only after the stored session is expired", async () => {
    const reservation = await reserveActiveCheckout(input);
    const replacement = await replaceExpiredActiveCheckout(input, reservation.attemptId);
    const concurrentRetry = await replaceExpiredActiveCheckout(
      { ...input, attemptId: "attempt-2" },
      reservation.attemptId,
    );

    expect(replacement.attemptId).not.toBe(reservation.attemptId);
    expect(concurrentRetry).toEqual(replacement);
  });
});
