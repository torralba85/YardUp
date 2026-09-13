import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  stripe: null as null | {
    webhooks: { constructEvent: ReturnType<typeof vi.fn> };
  },
  grant: vi.fn(),
  grantCertificate: vi.fn(),
  release: vi.fn(),
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
  },
}));

vi.mock("@/lib/server/lead-unlocks", () => ({
  grantLeadUnlock: (...args: unknown[]) => mocks.grant(...args),
}));

vi.mock("@/lib/server/certificate-purchases", () => ({
  grantCertificate: (...args: unknown[]) => mocks.grantCertificate(...args),
}));

vi.mock("@/lib/server/active-checkout-sessions", () => ({
  releaseActiveCheckout: (...args: unknown[]) => mocks.release(...args),
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
  },
}));

import { POST } from "./route";

function webhookRequest(body = "{}", signature = "sig"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": signature },
  });
}

function installEvent(
  object: Record<string, unknown>,
  type = "checkout.session.completed",
) {
  mocks.stripe = {
    webhooks: {
      constructEvent: vi.fn(() => ({ type, data: { object } })),
    },
  };
}

function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess_1",
    mode: "payment",
    payment_status: "paid",
    amount_total: 4900,
    currency: "usd",
    metadata: {
      purchaseType: "lead_unlock",
      builderId: "b1",
      requestId: "r1",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
  mocks.stripe = null;
  mocks.grant.mockClear();
  mocks.grantCertificate.mockClear();
  mocks.release.mockClear();
  mocks.adminDb.runTransaction.mockClear();
  mocks.transaction.get.mockReset();
  mocks.transaction.update.mockClear();
  mocks.transaction.set.mockClear();
  mocks.adminDb.collection.mockReturnValue({ doc: () => mocks.docRef });
  mocks.docRef.collection.mockReturnValue({ doc: () => mocks.docRef });
  mocks.builderDoc.data.mockReturnValue({ credits: 10 });
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

  it("grants an explicitly typed, correctly priced lead unlock", async () => {
    installEvent(paidSession());

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.grant).toHaveBeenCalledWith({
      builderId: "b1",
      requestId: "r1",
      stripeSessionId: "sess_1",
      amount: 4900,
    });
  });

  it("releases the reservation when a delayed payment fails", async () => {
    // The Session stays `complete` and unpaid forever, so leaving the
    // reservation in place would hand the buyer the dead Session on every
    // retry and they could never start a new checkout.
    installEvent(
      paidSession({ payment_status: "unpaid" }),
      "checkout.session.async_payment_failed",
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.release).toHaveBeenCalledWith(
      { purchaseType: "lead_unlock", accountId: "b1", purchaseId: "r1" },
      "sess_1",
    );
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("releases a certificate reservation when its delayed payment fails", async () => {
    installEvent(
      paidSession({
        payment_status: "unpaid",
        metadata: {
          purchaseType: "certificate",
          uid: "user-1",
          certKey: "cert-1",
        },
      }),
      "checkout.session.async_payment_failed",
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.release).toHaveBeenCalledWith(
      { purchaseType: "certificate", accountId: "user-1", purchaseId: "cert-1" },
      "sess_1",
    );
  });

  it("fulfills a delayed payment after async payment succeeds", async () => {
    installEvent(paidSession(), "checkout.session.async_payment_succeeded");

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grant).toHaveBeenCalledWith({
      builderId: "b1",
      requestId: "r1",
      stripeSessionId: "sess_1",
      amount: 4900,
    });
  });

  it("does not grant when the completed session is not paid", async () => {
    installEvent(paidSession({ payment_status: "unpaid" }));

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types", async () => {
    installEvent({}, "payment_intent.created");

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("does not fall through an unknown purchase type to a lead grant", async () => {
    installEvent(
      paidSession({
        metadata: {
          purchaseType: "sponsorship",
          builderId: "b1",
          requestId: "r1",
        },
      }),
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it.each([
    ["wrong amount", { amount_total: 100 }],
    ["wrong currency", { currency: "eur" }],
    ["wrong Checkout mode", { mode: "subscription" }],
  ])("rejects a lead unlock with the %s", async (_label, overrides) => {
    installEvent(paidSession(overrides));

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("processes a correctly priced 5-credit pack", async () => {
    installEvent(
      paidSession({
        id: "sess_credit",
        amount_total: 17_500,
        metadata: {
          purchaseType: "credit_pack",
          builderId: "b2",
          creditsToGrant: "5",
        },
      }),
    );
    mocks.adminDb.runTransaction.mockImplementation(
      async (cb: (tx: typeof mocks.transaction) => Promise<unknown>) => {
        mocks.transaction.get
          .mockResolvedValueOnce({ exists: false })
          .mockResolvedValueOnce(mocks.builderDoc);
        await cb(mocks.transaction);
      },
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.grant).not.toHaveBeenCalled();
    expect(mocks.transaction.update).toHaveBeenCalledWith(
      mocks.docRef,
      expect.objectContaining({ credits: 15, updatedAt: "mock-timestamp" }),
    );
    expect(mocks.transaction.set).toHaveBeenCalledWith(
      mocks.docRef,
      expect.objectContaining({
        type: "purchase",
        creditsChange: 5,
        amountPaid: 175,
        stripeSessionId: "sess_credit",
        createdAt: "mock-timestamp",
      }),
    );
  });

  it("rejects a credit pack whose amount does not match the pack", async () => {
    installEvent(
      paidSession({
        id: "sess_credit",
        amount_total: 10_000,
        metadata: {
          purchaseType: "credit_pack",
          builderId: "b2",
          creditsToGrant: "5",
        },
      }),
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.adminDb.runTransaction).not.toHaveBeenCalled();
  });

  it("skips duplicate credit pack webhook deliveries", async () => {
    installEvent(
      paidSession({
        id: "sess_credit",
        amount_total: 17_500,
        metadata: {
          purchaseType: "credit_pack",
          builderId: "b2",
          creditsToGrant: "5",
        },
      }),
    );
    mocks.adminDb.runTransaction.mockImplementation(
      async (cb: (tx: typeof mocks.transaction) => Promise<unknown>) => {
        mocks.transaction.get.mockResolvedValueOnce({ exists: true });
        await cb(mocks.transaction);
      },
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.transaction.update).not.toHaveBeenCalled();
    expect(mocks.transaction.set).not.toHaveBeenCalled();
  });

  it("grants a correctly priced certificate purchase", async () => {
    installEvent(
      paidSession({
        id: "sess_cert",
        amount_total: 2900,
        metadata: {
          purchaseType: "certificate",
          uid: "user_1",
          certKey: "1234-oak-street-seattle",
        },
      }),
    );

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.grantCertificate).toHaveBeenCalledWith({
      uid: "user_1",
      certKey: "1234-oak-street-seattle",
      stripeSessionId: "sess_cert",
      amount: 2900,
    });
  });

  it("rejects a certificate purchase with a mismatched amount", async () => {
    installEvent(
      paidSession({
        id: "sess_cert",
        amount_total: 1,
        metadata: {
          purchaseType: "certificate",
          uid: "user_1",
          certKey: "1234-oak-street-seattle",
        },
      }),
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grantCertificate).not.toHaveBeenCalled();
  });
});
