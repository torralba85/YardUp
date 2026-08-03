import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  profileExists: true,
  stripe: null as null | {
    checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
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

      const res = await POST(postRequest({ pack }));

      expect(await res.json()).toEqual({ url: "https://stripe.test/credits" });
      expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
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
});
