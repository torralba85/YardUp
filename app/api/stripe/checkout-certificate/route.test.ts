import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  purchased: false,
  stripe: null as null | {
    checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
  },
  grant: vi.fn(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => ({ uid: "user-1" }),
}));

vi.mock("@/lib/server/certificate-purchases", () => ({
  grantCertificate: (...args: unknown[]) => mocks.grant(...args),
  hasCertificate: async () => mocks.purchased,
}));

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
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/checkout-certificate", () => {
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
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
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

  it("reuses a key for one attempt and creates a new key for a fresh attempt", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));
    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));
    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-2" }));

    expect(create.mock.calls[0][1].idempotencyKey).toBe(
      create.mock.calls[1][1].idempotencyKey,
    );
    expect(create.mock.calls[2][1].idempotencyKey).not.toBe(
      create.mock.calls[0][1].idempotencyKey,
    );
  });

  it("supports clients loaded before checkoutAttemptId was introduced", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    const res = await POST(postRequest({ certKey: "parcel-1" }));

    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(
          /^lotfoundry:certificate:[a-f0-9]{64}$/,
        ),
      }),
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
