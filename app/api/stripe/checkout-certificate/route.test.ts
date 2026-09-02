import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type {
  ActiveCheckoutSession,
  ReserveActiveCheckoutInput,
} from "@/lib/server/active-checkout-sessions";

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
  reserve: vi.fn(),
  replace: vi.fn(),
  save: vi.fn(),
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

vi.mock("@/lib/server/active-checkout-sessions", () => ({
  reserveActiveCheckout: (...args: unknown[]) => mocks.reserve(...args),
  replaceExpiredActiveCheckout: (...args: unknown[]) => mocks.replace(...args),
  saveActiveCheckoutSession: (...args: unknown[]) => mocks.save(...args),
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
  mocks.reserve.mockReset();
  mocks.replace.mockReset();
  mocks.save.mockReset();
  mocks.reserve.mockImplementation(
    async (input: ReserveActiveCheckoutInput): Promise<ActiveCheckoutSession> => ({
      attemptId: input.attemptId,
      parameters: input.parameters,
      expiresAtMs: Date.now() + 60_000,
    }),
  );
  mocks.replace.mockImplementation(
    async (input: ReserveActiveCheckoutInput): Promise<ActiveCheckoutSession> => ({
      attemptId: "replacement-attempt",
      parameters: input.parameters,
      expiresAtMs: Date.now() + 60_000,
    }),
  );
  mocks.save.mockImplementation(
    async (
      _input: ReserveActiveCheckoutInput,
      reservation: ActiveCheckoutSession,
      session: { id: string; url: string; expiresAtMs?: number },
    ): Promise<ActiveCheckoutSession> => ({
      ...reservation,
      sessionId: session.id,
      sessionUrl: session.url,
      ...(session.expiresAtMs ? { expiresAtMs: session.expiresAtMs } : {}),
    }),
  );
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

  it("passes the client attempt token to the checkout reservation", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));

    expect(mocks.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: "attempt-1" }),
    );
  });

  it("resumes an open certificate session instead of minting another charge", async () => {
    mocks.reserve.mockResolvedValue({
      attemptId: "attempt-1",
      parameters: { origin: "http://localhost", parcelName: "123 Main Street" },
      sessionId: "cs_open",
      sessionUrl: "https://stripe.test/cert/open",
      expiresAtMs: Date.now() + 60_000,
    });
    const create = vi.fn();
    const retrieve = vi.fn().mockResolvedValue({ status: "open" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    const res = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-2" }),
    );

    expect(await res.json()).toEqual({ url: "https://stripe.test/cert/open" });
    expect(retrieve).toHaveBeenCalledWith("cs_open");
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a replacement only after Stripe reports the stored session expired", async () => {
    mocks.reserve.mockResolvedValue({
      attemptId: "attempt-1",
      parameters: { origin: "http://localhost", parcelName: "123 Main Street" },
      sessionId: "cs_expired",
      sessionUrl: "https://stripe.test/cert/expired",
      expiresAtMs: Date.now() + 60_000,
    });
    mocks.replace.mockResolvedValue({
      attemptId: "replacement-attempt",
      parameters: { origin: "http://localhost", parcelName: "123 Main Street" },
      expiresAtMs: Date.now() + 60_000,
    });
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_replacement", url: "https://stripe.test/cert/new" });
    const retrieve = vi.fn().mockResolvedValue({ status: "expired" });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    const res = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-2" }),
    );

    expect(await res.json()).toEqual({ url: "https://stripe.test/cert/new" });
    expect(mocks.replace).toHaveBeenCalledWith(
      expect.any(Object),
      "attempt-1",
    );
    expect(create).toHaveBeenCalledOnce();
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
