import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  stripe: null as null | { webhooks: { constructEvent: ReturnType<typeof vi.fn> } },
  grant: vi.fn(),
}));

vi.mock("@/lib/server/lead-unlocks", () => ({
  grantLeadUnlock: (...args: unknown[]) => mocks.grant(...args),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: async () => mocks.stripe,
  LEAD_UNLOCK_PRICE_CENTS: 4900,
}));

import { POST } from "./route";

function webhookRequest(body = "{}", signature = "sig"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": signature },
  });
}

beforeEach(() => {
  mocks.stripe = null;
  mocks.grant.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/stripe/webhook", () => {
  it("503s when Stripe is not configured", async () => {
    const res = await POST(webhookRequest());
    expect(res.status).toBe(503);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("400s on an invalid signature, without granting", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    mocks.stripe = {
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error("bad signature");
        }),
      },
    };

    const res = await POST(webhookRequest());
    expect(res.status).toBe(400);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("grants the unlock on checkout.session.completed", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    mocks.stripe = {
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess_1",
              amount_total: 4900,
              metadata: { builderId: "b1", requestId: "r1" },
            },
          },
        })),
      },
    };

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mocks.grant).toHaveBeenCalledWith(
      expect.objectContaining({ builderId: "b1", requestId: "r1", stripeSessionId: "sess_1" }),
    );
  });

  it("ignores unrelated event types", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    mocks.stripe = {
      webhooks: {
        constructEvent: vi.fn(() => ({ type: "payment_intent.created", data: { object: {} } })),
      },
    };

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
  });
});
