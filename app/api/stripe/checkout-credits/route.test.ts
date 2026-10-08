import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  profileExists: true,
  stripe: null as null | {
    checkout: {
      sessions: {
        create: ReturnType<typeof vi.fn>;
        retrieve?: ReturnType<typeof vi.fn>;
      };
    };
  },
  runTransaction: vi.fn(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => ({ uid: "builder-1" }),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    doc: () => ({ get: async () => ({ exists: mocks.profileExists }) }),
    runTransaction: mocks.runTransaction,
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: async () => mocks.stripe,
}));

import { POST } from "./route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout-credits", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost" },
  });
}

beforeEach(() => {
  mocks.profileExists = true;
  mocks.stripe = null;
  mocks.runTransaction.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/checkout-credits", () => {
  it("rejects unsupported pack sizes", async () => {
    expect((await POST(postRequest({ pack: 3 }))).status).toBe(400);
  });

  it("rejects malformed checkout attempt ids", async () => {
    expect(
      (await POST(postRequest({ pack: 5, checkoutAttemptId: "" }))).status,
    ).toBe(400);
    expect(
      (
        await POST(
          postRequest({ pack: 5, checkoutAttemptId: "x".repeat(101) }),
        )
      ).status,
    ).toBe(400);
  });

  it("requires an existing builder profile", async () => {
    mocks.profileExists = false;
    expect((await POST(postRequest({ pack: 5 }))).status).toBe(403);
  });

  it.each([
    [5, 17_500],
    [10, 30_000],
  ])(
    "creates the %i-credit Checkout for %i cents",
    async (pack, amountCents) => {
      mocks.stripe = {
        checkout: {
          sessions: {
            create: vi
              .fn()
              .mockResolvedValue({ url: "https://stripe.test/credits" }),
          },
        },
      };

      const res = await POST(
        postRequest({ pack, checkoutAttemptId: `attempt-${pack}` }),
      );

      expect(await res.json()).toEqual({ url: "https://stripe.test/credits" });
      expect(mocks.stripe.checkout.sessions.create.mock.calls[0][0]).not.toHaveProperty(
        "payment_method_types",
      );
      expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          integration_identifier: "lotfoundry_credit_pack_hscytrve",
          metadata: {
            builderId: "builder-1",
            purchaseType: "credit_pack",
            creditsToGrant: String(pack),
          },
          payment_intent_data: { statement_descriptor_suffix: "LOTFOUNDRY" },
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: "usd",
                unit_amount: amountCents,
              }),
            }),
          ],
        }),
        expect.objectContaining({
          idempotencyKey: expect.stringMatching(
            /^lotfoundry:credit_pack:[a-f0-9]{64}$/,
          ),
        }),
      );
    },
  );

  it("uses different idempotency keys for separate legacy purchase attempts", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/credits" }),
        },
      },
    };

    await POST(postRequest({ pack: 5 }));
    await POST(postRequest({ pack: 5 }));

    const firstKey = mocks.stripe.checkout.sessions.create.mock.calls[0][1]
      .idempotencyKey;
    const secondKey = mocks.stripe.checkout.sessions.create.mock.calls[1][1]
      .idempotencyKey;
    expect(firstKey).not.toBe(secondKey);
  });

  it("returns to the dashboard with the Session id so the purchase can be confirmed", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_new",
            url: "https://stripe.test/credits",
            created: Math.floor(Date.now() / 1000),
          }),
          retrieve: vi.fn(),
        },
      },
    };

    const res = await POST(postRequest({ pack: 5, checkoutAttemptId: "attempt-5" }));

    expect(await res.json()).toEqual({ url: "https://stripe.test/credits" });
    expect(mocks.stripe.checkout.sessions.create.mock.calls[0][0].success_url).toBe(
      "http://localhost/builder?credits_added=1&session_id={CHECKOUT_SESSION_ID}",
    );
    // A freshly minted Session needs no second round trip.
    expect(mocks.stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("resumes a replayed Session that is still open", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            id: "cs_test_open",
            url: "https://stripe.test/open",
            created: Math.floor(Date.now() / 1000) - 600,
          }),
          retrieve: vi.fn().mockResolvedValue({ id: "cs_test_open", status: "open" }),
        },
      },
    };

    const res = await POST(postRequest({ pack: 5, checkoutAttemptId: "attempt-5" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/open" });
    expect(mocks.stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_test_open");
  });

  it.each(["complete", "expired"])(
    "asks the client to rotate its attempt when the replayed Session is %s",
    async (status) => {
      mocks.stripe = {
        checkout: {
          sessions: {
            create: vi.fn().mockResolvedValue({
              id: "cs_test_done",
              url: "https://stripe.test/done",
              created: Math.floor(Date.now() / 1000) - 3600,
            }),
            retrieve: vi.fn().mockResolvedValue({ id: "cs_test_done", status }),
          },
        },
      };

      const res = await POST(postRequest({ pack: 5, checkoutAttemptId: "attempt-5" }));

      expect(res.status).toBe(409);
      expect(await res.json()).toEqual(
        expect.objectContaining({ retryWithNewAttempt: true }),
      );
    },
  );

  it("fails closed in production when Stripe is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOTFOUNDRY_DEMO_UNLOCKS", "false");

    const res = await POST(postRequest({ pack: 5 }));

    expect(res.status).toBe(503);
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });

  it("disables adaptive pricing to ensure USD billing", async () => {
    mocks.stripe = {
      checkout: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://stripe.test/credits" }),
        },
      },
    };

    await POST(postRequest({ pack: 5, checkoutAttemptId: "attempt-5" }));

    expect(mocks.stripe.checkout.sessions.create.mock.calls[0][0].adaptive_pricing).toEqual({
      enabled: false,
    });
  });
});
