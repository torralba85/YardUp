import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const mocks = vi.hoisted(() => ({
  uid: "b1",
  leadDoc: {
    exists: true,
    data: () => ({
      status: "submitted",
      matchedBuilderIds: ["b1"],
      preview: { previewSerial: "LF-X" },
    }),
  } as { exists: boolean; data: () => Record<string, unknown> },
  unlocked: false,
  stripe: null as null | {
    checkout: {
      sessions: {
        create: ReturnType<typeof vi.fn>;
        retrieve?: ReturnType<typeof vi.fn>;
      };
    };
    paymentIntents?: {
      retrieve?: ReturnType<typeof vi.fn>;
    };
  },
  grant: vi.fn(),
  reservations: new Map<
    string,
    {
      attemptId: string;
      parameters: Record<string, string>;
      sessionId?: string;
      sessionUrl?: string;
      expiresAtMs: number;
    }
  >(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => ({ uid: mocks.uid }),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: () => ({ doc: () => ({ get: async () => mocks.leadDoc }) }),
  }),
}));

vi.mock("@/lib/server/lead-unlocks", () => ({
  grantLeadUnlock: (...args: unknown[]) => mocks.grant(...args),
  isLeadUnlocked: async () => mocks.unlocked,
}));

type FakeReservation = {
  attemptId: string;
  parameters: Record<string, string>;
  sessionId?: string;
  sessionUrl?: string;
  expiresAtMs: number;
};

type FakeReservationInput = {
  purchaseType: string;
  accountId: string;
  purchaseId: string;
  attemptId: string;
  parameters: Record<string, string>;
};

/**
 * In-memory stand-in for the reservation store. It mirrors the real module's
 * contract (one live reservation per entitlement, replacement only for the
 * attempt that expired) so these route tests exercise resume behaviour without
 * a Firestore transaction. The store itself is covered in
 * `lib/server/active-checkout-sessions.test.ts`.
 */
vi.mock("@/lib/server/active-checkout-sessions", () => {
  const keyOf = (input: FakeReservationInput) =>
    `${input.purchaseType}:${input.accountId}:${input.purchaseId}`;

  return {
    reserveActiveCheckout: async (input: FakeReservationInput) => {
      const key = keyOf(input);
      const existing = mocks.reservations.get(key);
      if (existing && existing.expiresAtMs > Date.now()) return existing;
      const created: FakeReservation = {
        attemptId: input.attemptId,
        parameters: input.parameters,
        expiresAtMs: Date.now() + 86_400_000,
      };
      mocks.reservations.set(key, created);
      return created;
    },
    replaceExpiredActiveCheckout: async (
      input: FakeReservationInput,
      expiredAttemptId: string,
    ) => {
      const key = keyOf(input);
      const existing = mocks.reservations.get(key);
      if (existing && existing.attemptId !== expiredAttemptId) return existing;
      const replacement: FakeReservation = {
        attemptId: `${expiredAttemptId}-replaced`,
        parameters: input.parameters,
        expiresAtMs: Date.now() + 86_400_000,
      };
      mocks.reservations.set(key, replacement);
      return replacement;
    },
    saveActiveCheckoutSession: async (
      input: FakeReservationInput,
      reservation: FakeReservation,
      session: { id: string; url: string; expiresAtMs?: number },
    ) => {
      const key = keyOf(input);
      const current = mocks.reservations.get(key);
      if (!current || current.attemptId !== reservation.attemptId) {
        return current ?? reservation;
      }
      const updated: FakeReservation = {
        ...current,
        sessionId: session.id,
        sessionUrl: session.url,
        expiresAtMs: session.expiresAtMs ?? current.expiresAtMs,
      };
      mocks.reservations.set(key, updated);
      return updated;
    },
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripe: async () => mocks.stripe,
  LEAD_UNLOCK_PRICE_CENTS: 4900,
}));

import { POST } from "./route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  });
}

beforeEach(() => {
  mocks.uid = "b1";
  mocks.unlocked = false;
  mocks.stripe = null;
  mocks.leadDoc = {
    exists: true,
    data: () => ({
      status: "submitted",
      matchedBuilderIds: ["b1"],
      preview: { previewSerial: "LF-X" },
    }),
  };
  mocks.grant.mockClear();
  mocks.reservations.clear();
  resetRateLimitBuckets();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/checkout", () => {
  it("400s without a requestId", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
  });

  it("404s when the lead does not exist", async () => {
    mocks.leadDoc = { exists: false, data: () => ({}) };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(404);
  });

  it("409s when the lead has been withdrawn", async () => {
    mocks.leadDoc = {
      exists: true,
      data: () => ({ status: "withdrawn", matchedBuilderIds: ["b1"] }),
    };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(409);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("403s when the builder is not matched to the lead", async () => {
    mocks.leadDoc = {
      exists: true,
      data: () => ({
        status: "submitted",
        matchedBuilderIds: ["someone-else"],
      }),
    };
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(403);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("grants immediately in demo mode (no Stripe key)", async () => {
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "granted", demo: true });
    expect(mocks.grant).toHaveBeenCalledWith(
      expect.objectContaining({ builderId: "b1", requestId: "r1", demo: true }),
    );
  });

  it("retries an uncertain creation with the original preview serial", async () => {
    const create = vi.fn()
      .mockRejectedValueOnce(new Error("Connection lost after Stripe accepted creation"))
      .mockResolvedValueOnce({ id: "cs_retry", url: "https://stripe.test/retry" });
    mocks.stripe = { checkout: { sessions: { create } } };
    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    mocks.leadDoc.data = () => ({ status: "submitted", matchedBuilderIds: ["b1"], preview: { previewSerial: "LF-RENAMED" } });
    const retry = await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-2" }));
    expect(retry.status).toBe(200);
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
  });

  it("creates an idempotent, explicitly typed Stripe Checkout session", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/checkout/x" }),
        },
      },
    };
    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/checkout/x" });
    expect(mocks.grant).not.toHaveBeenCalled();
    expect(mocks.stripe.checkout.sessions.create.mock.calls[0][0]).not.toHaveProperty(
      "payment_method_types",
    );
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        integration_identifier: "lotfoundry_lead_unlock_qmvdjrxn",
        metadata: {
          purchaseType: "lead_unlock",
          builderId: "b1",
          requestId: "r1",
        },
        payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^lotfoundry:lead_unlock:[a-f0-9]{64}$/,
        ),
      }),
    );
  });

  it("resumes one Session across attempts instead of minting a second", async () => {
    // The reservation, not the supplied attempt id, decides the Session. A
    // second tab with its own attempt id must not become a second charge.
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/checkout/1" });
    const retrieve = vi.fn().mockResolvedValue({ status: "open" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    const first = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );
    const sameTab = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );
    const secondTab = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-2" }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    for (const res of [first, sameTab, secondTab]) {
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://stripe.test/checkout/1" });
    }
  });

  it("mints a replacement once Stripe confirms the reserved Session expired", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "cs_1", url: "https://stripe.test/checkout/1" })
      .mockResolvedValueOnce({ id: "cs_2", url: "https://stripe.test/checkout/2" });
    const retrieve = vi.fn().mockResolvedValue({ status: "expired" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/checkout/2" });
    expect(create).toHaveBeenCalledTimes(2);
    // A replacement is a distinct attempt, so Stripe must not dedupe it away.
    expect(create.mock.calls[1][1].idempotencyKey).not.toBe(
      create.mock.calls[0][1].idempotencyKey,
    );
  });

  it("reconciles a paid Session whose webhook never fulfilled it", async () => {
    // The reservation keeps returning a completed Session, so without this the
    // builder retries into the same 409 forever and never receives the lead
    // they paid for. Nothing else in the system heals a missed webhook.
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/checkout/1" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "paid",
      mode: "payment",
      currency: "usd",
      amount_total: 4900,
      metadata: { builderId: "b1", requestId: "r1" },
    });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "granted", reconciled: true });
    expect(mocks.grant).toHaveBeenCalledWith({
      builderId: "b1",
      requestId: "r1",
      stripeSessionId: "cs_1",
      amount: 4900,
    });
    // Reconciling must never mint a second payable Session.
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("refuses to reconcile a paid Session that underpaid the catalog price", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/checkout/1" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "paid",
      mode: "payment",
      currency: "usd",
      amount_total: 1,
      metadata: { builderId: "b1", requestId: "r1" },
    });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(res.status).toBe(409);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("refuses to reconcile a Session belonging to another entitlement", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/checkout/1" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "paid",
      mode: "payment",
      currency: "usd",
      amount_total: 4900,
      metadata: { builderId: "someone-else", requestId: "r1" },
    });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(res.status).toBe(409);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("409s while a completed Session is still being confirmed", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/checkout/1" });
    const retrieve = vi.fn().mockResolvedValue({ status: "complete" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(res.status).toBe(409);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("supports clients loaded before checkoutAttemptId was introduced", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ url: "https://stripe.test/checkout/x" });
    mocks.stripe = { checkout: { sessions: { create } } };

    const res = await POST(postRequest({ requestId: "r1" }));
    const retry = await POST(postRequest({ requestId: "r1" }));

    expect(res.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^lotfoundry:lead_unlock:[a-f0-9]{64}$/,
        ),
      }),
    );
    expect(create.mock.calls[1][1].idempotencyKey).toBe(
      create.mock.calls[0][1].idempotencyKey,
    );
  });

  it("does not use the request Origin for production Stripe return URLs", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/checkout/x" }),
        },
      },
    };

    const res = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://lotfoundry.net/builder?lead=r1&unlocked=1",
        cancel_url: "https://lotfoundry.net/builder?lead=r1",
      }),
      expect.any(Object),
    );
  });

  it("is an idempotent success when already unlocked", async () => {
    mocks.unlocked = true;
    const res = await POST(postRequest({ requestId: "r1" }));
    expect(await res.json()).toMatchObject({
      status: "granted",
      alreadyUnlocked: true,
    });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("rotates a completed Session whose payment failed instead of 409 lockout", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "cs_1", url: "https://stripe.test/checkout/1" })
      .mockResolvedValueOnce({ id: "cs_2", url: "https://stripe.test/checkout/2" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "unpaid",
      payment_intent: "pi_1",
    });
    const retrievePi = vi.fn().mockResolvedValue({
      id: "pi_1",
      status: "requires_payment_method",
    });
    mocks.stripe = {
      checkout: { sessions: { create, retrieve } },
      paymentIntents: { retrieve: retrievePi },
    };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const retry = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ url: "https://stripe.test/checkout/2" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("rotates an expired completed Session instead of 409 lockout", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "cs_1", url: "https://stripe.test/checkout/1" })
      .mockResolvedValueOnce({ id: "cs_2", url: "https://stripe.test/checkout/2" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "unpaid",
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });
    mocks.stripe = {
      checkout: { sessions: { create, retrieve } },
    };

    await POST(postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }));
    const retry = await POST(
      postRequest({ requestId: "r1", checkoutAttemptId: "attempt-1" }),
    );

    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ url: "https://stripe.test/checkout/2" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("disables adaptive pricing to ensure USD billing", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/checkout/x" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(
      postRequest({
        requestId: "r1",
        checkoutAttemptId: "attempt-1",
      }),
    );

    expect(create.mock.calls[0][0].adaptive_pricing).toEqual({ enabled: false });
  });
});
