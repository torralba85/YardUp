import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  stripe: null as null | { webhooks: { constructEvent: ReturnType<typeof vi.fn> } },
  grant: vi.fn(),
  adminDb: {
    runTransaction: vi.fn(),
    collection: vi.fn(),
  },
  transaction: {
    get: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
  },
  builderDoc: {
    exists: true,
    data: vi.fn(),
  },
  docRef: {
    collection: vi.fn(),
    doc: vi.fn(),
  }
}));

vi.mock("@/lib/server/lead-unlocks", () => ({
  grantLeadUnlock: (...args: unknown[]) => mocks.grant(...args),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: async () => mocks.stripe,
  LEAD_UNLOCK_PRICE_CENTS: 4900,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => mocks.adminDb,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => "mock-timestamp"),
  }
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
  mocks.adminDb.runTransaction.mockClear();
  mocks.transaction.update.mockClear();
  mocks.transaction.set.mockClear();
  mocks.adminDb.collection.mockReturnValue({ doc: () => mocks.docRef });
  mocks.docRef.collection.mockReturnValue({ doc: () => mocks.docRef });
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
              payment_status: "paid",
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

  it("does not grant when the completed session is not paid", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    mocks.stripe = {
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess_1",
              payment_status: "unpaid",
              amount_total: 4900,
              metadata: { builderId: "b1", requestId: "r1" },
            },
          },
        })),
      },
    };

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
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

  it("processes credit_pack purchases and grants credits", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    mocks.stripe = {
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: "checkout.session.completed",
          data: {
            object: {
              id: "sess_credit",
              payment_status: "paid",
              amount_total: 10000,
              metadata: { purchaseType: "credit_pack", builderId: "b2", creditsToGrant: "5" },
            },
          },
        })),
      },
    };

    mocks.adminDb.runTransaction.mockImplementation(async (cb: (tx: typeof mocks.transaction) => Promise<unknown>) => {
      mocks.transaction.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ credits: 10 }),
      });
      await cb(mocks.transaction);
    });

    const res = await POST(webhookRequest());
    expect(res.status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
    expect(mocks.adminDb.runTransaction).toHaveBeenCalled();
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.docRef,
      expect.objectContaining({ credits: 15, updatedAt: "mock-timestamp" })
    );
    expect(mocks.transaction.set).toHaveBeenCalledWith(
      mocks.docRef,
      expect.objectContaining({
        type: "purchase",
        creditsChange: 5,
        amountPaid: 100,
        stripeSessionId: "sess_credit",
        createdAt: "mock-timestamp",
      })
    );
  });
});
