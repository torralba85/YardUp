import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  purchased: false,
  stripe: null as null | {
    checkout: {
      sessions: {
        create: ReturnType<typeof vi.fn>;
        retrieve?: ReturnType<typeof vi.fn>;
      };
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
  requireApiAuth: async () => ({ uid: "user-1" }),
}));

vi.mock("@/lib/server/certificate-purchases", () => ({
  grantCertificate: (...args: unknown[]) => mocks.grant(...args),
  hasCertificate: async () => mocks.purchased,
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
}));

import { POST } from "./route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout-certificate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  });
}

beforeEach(() => {
  mocks.purchased = false;
  mocks.stripe = null;
  mocks.grant.mockClear();
  mocks.reservations.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/checkout-certificate", () => {
  it("retries an uncertain creation with the original presentation parameters", async () => {
    const create = vi.fn()
      .mockRejectedValueOnce(new Error("Connection lost after Stripe accepted creation"))
      .mockResolvedValueOnce({ id: "cs_retry", url: "https://stripe.test/retry" });
    mocks.stripe = { checkout: { sessions: { create } } };
    await POST(postRequest({ certKey: "parcel-1", parcelName: "Original", checkoutAttemptId: "attempt-1" }));
    const retry = await POST(postRequest({ certKey: "parcel-1", parcelName: "Renamed", checkoutAttemptId: "attempt-2" }));
    expect(retry.status).toBe(200);
    expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
  });

  it("400s without a valid certKey", async () => {
    expect((await POST(postRequest({}))).status).toBe(400);
    expect((await POST(postRequest({ certKey: "x".repeat(201) }))).status).toBe(
      400,
    );
  });

  it("returns an idempotent success for an existing purchase", async () => {
    mocks.purchased = true;
    const res = await POST(postRequest({ certKey: "parcel-1" }));

    expect(await res.json()).toMatchObject({
      status: "granted",
      alreadyPurchased: true,
    });
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("creates the $29 certificate Checkout with fulfilment metadata", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/cert" }),
        },
      },
    };

    const res = await POST(
      postRequest({
        certKey: "parcel-1",
        parcelName: "123 Main Street",
        checkoutAttemptId: "attempt-1",
      }),
    );

    expect(await res.json()).toEqual({ url: "https://stripe.test/cert" });
    expect(mocks.stripe.checkout.sessions.create.mock.calls[0][0]).not.toHaveProperty(
      "payment_method_types",
    );
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        integration_identifier: "lotfoundry_certificate_wndqkplz",
        metadata: {
          purchaseType: "certificate",
          uid: "user-1",
          certKey: "parcel-1",
        },
        payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: "usd",
              unit_amount: 2900,
            }),
          }),
        ],
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^lotfoundry:certificate:[a-f0-9]{64}$/,
        ),
      }),
    );
  });

  it("resumes one Session across attempts instead of minting a second", async () => {
    // The reservation, not the supplied attempt id, decides the Session. A
    // second tab with its own attempt id must not become a second charge.
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/cert/1" });
    const retrieve = vi.fn().mockResolvedValue({ status: "open" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    const first = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
    );
    const sameTab = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
    );
    const secondTab = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-2" }),
    );

    expect(create).toHaveBeenCalledTimes(1);
    for (const res of [first, sameTab, secondTab]) {
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://stripe.test/cert/1" });
    }
  });

  it("keeps a separate reservation per certificate key", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "cs_1", url: "https://stripe.test/cert/1" })
      .mockResolvedValueOnce({ id: "cs_2", url: "https://stripe.test/cert/2" });
    const retrieve = vi.fn().mockResolvedValue({ status: "open" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    const one = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
    );
    const two = await POST(
      postRequest({ certKey: "parcel-2", checkoutAttemptId: "attempt-1" }),
    );

    expect(create).toHaveBeenCalledTimes(2);
    expect(await one.json()).toEqual({ url: "https://stripe.test/cert/1" });
    expect(await two.json()).toEqual({ url: "https://stripe.test/cert/2" });
  });

  it("supports clients loaded before checkoutAttemptId was introduced", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    const res = await POST(postRequest({ certKey: "parcel-1" }));
    const retry = await POST(postRequest({ certKey: "parcel-1" }));

    expect(res.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^lotfoundry:certificate:[a-f0-9]{64}$/,
        ),
      }),
    );
    expect(create.mock.calls[1][1].idempotencyKey).toBe(
      create.mock.calls[0][1].idempotencyKey,
    );
  });

  it("fails closed in production when Stripe is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOTFOUNDRY_DEMO_UNLOCKS", "false");

    const res = await POST(postRequest({ certKey: "parcel-1" }));

    expect(res.status).toBe(503);
    expect(mocks.grant).not.toHaveBeenCalled();
  });
});
