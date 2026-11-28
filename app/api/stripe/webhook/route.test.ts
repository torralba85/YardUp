import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  stripe: null as null | {
    webhooks: { constructEvent: ReturnType<typeof vi.fn> };
  },
  grant: vi.fn(),
  grantCertificate: vi.fn(),
  rotate: vi.fn(),
  reconcile: vi.fn(),
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

vi.mock("@/lib/server/certificate-purchases", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/certificate-purchases")
  >("@/lib/server/certificate-purchases");
  return {
    fulfillPaidCertificateSession: async (
      session: Parameters<typeof actual.certificateGrantInputFromSession>[0],
    ) => {
      const input = actual.certificateGrantInputFromSession(session);
      return input ? mocks.grantCertificate(input) : null;
    },
  };
});

vi.mock("@/lib/server/stripe-reversals", () => ({
  reconcileStripeReversal: (...args: unknown[]) => mocks.reconcile(...args),
}));

vi.mock("@/lib/server/active-checkout-sessions", () => ({
  rotateFailedActiveCheckout: (...args: unknown[]) => mocks.rotate(...args),
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
      constructEvent: vi.fn(() => ({ type, livemode: false, data: { object } })),
    },
  };
}

const stripeWebhooks = new Stripe("sk_test_fixture").webhooks;

function installSignatureVerifier() {
  mocks.stripe = {
    webhooks: { constructEvent: vi.fn(stripeWebhooks.constructEvent.bind(stripeWebhooks)) },
  };
}

function signedRequest(payload: string) {
  const signature = stripeWebhooks.generateTestHeaderString({ payload, secret: "whsec_x" });
  return webhookRequest(payload, signature);
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
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
  mocks.stripe = null;
  mocks.grant.mockReset().mockResolvedValue({ status: "granted" });
  mocks.reconcile.mockReset();
  mocks.grantCertificate.mockClear();
  mocks.rotate.mockClear();
  mocks.adminDb.runTransaction.mockClear();
  mocks.transaction.get.mockReset().mockResolvedValue({ exists: false, data: () => undefined });
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

  it.each([
    ["sk_live_fixture", false],
    ["rk_test_fixture", true],
  ])("rejects a correctly signed event in the wrong mode for %s", async (key, livemode) => {
    vi.stubEnv("STRIPE_SECRET_KEY", key);
    installSignatureVerifier();
    const payload = JSON.stringify({
      id: "evt_wrong_mode", type: "checkout.session.completed", livemode,
      data: { object: paidSession() },
    });

    expect((await POST(signedRequest(payload))).status).toBe(400);
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("rejects a missing, mismatched, or stale signature and a modified body", async () => {
    installSignatureVerifier();
    const payload = JSON.stringify({
      id: "evt_signature_test", type: "refund.created", livemode: false,
      data: { object: { id: "re_fixture" } },
    });
    const valid = stripeWebhooks.generateTestHeaderString({ payload, secret: "whsec_x" });
    const wrong = stripeWebhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" });
    const stale = stripeWebhooks.generateTestHeaderString({
      payload, secret: "whsec_x", timestamp: Math.floor(Date.now() / 1000) - 600,
    });

    for (const request of [
      webhookRequest(payload, ""), webhookRequest(payload, wrong),
      webhookRequest(payload, stale), webhookRequest(`${payload}\n`, valid),
    ]) {
      expect((await POST(request)).status).toBe(400);
    }
    expect(mocks.reconcile).not.toHaveBeenCalled();
    expect((await POST(webhookRequest(payload, valid))).status).toBe(200);
    expect(mocks.reconcile).toHaveBeenCalledOnce();
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

  it("rotates the reservation when a delayed payment fails", async () => {
    // The Session stays `complete` and unpaid forever. Deleting the
    // reservation would not be enough: the buyer's persisted attempt id would
    // rebuild the same idempotency key and Stripe would replay the dead
    // Session, so the attempt itself has to rotate.
    installEvent(
      paidSession({ payment_status: "unpaid" }),
      "checkout.session.async_payment_failed",
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.rotate).toHaveBeenCalledWith(
      { purchaseType: "lead_unlock", accountId: "b1", purchaseId: "r1" },
      "sess_1",
    );
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("rotates a certificate reservation when its delayed payment fails", async () => {
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
    expect(mocks.rotate).toHaveBeenCalledWith(
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

  it.each(["refund.created", "refund.updated", "refund.failed", "charge.dispute.created", "charge.dispute.closed"])(
    "routes %s to reconciliation after signature verification",
    async (type) => {
      installSignatureVerifier();
      const payload = JSON.stringify({
        id: "evt_reversal", type, livemode: false,
        data: { object: { id: "processor-object" } },
      });

      expect((await POST(signedRequest(payload))).status).toBe(200);
      expect(mocks.reconcile).toHaveBeenCalledWith(mocks.stripe, expect.objectContaining({ type }));
      expect(mocks.grant).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["checkout.session.completed", "paid"],
    ["checkout.session.async_payment_succeeded", "paid"],
    ["checkout.session.async_payment_failed", "unpaid"],
  ])("accepts correctly signed %s in live mode", async (type, paymentStatus) => {
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_fixture");
    installSignatureVerifier();
    const payload = JSON.stringify({
      id: "evt_checkout", type, livemode: true,
      data: { object: paidSession({ payment_status: paymentStatus }) },
    });

    expect((await POST(signedRequest(payload))).status).toBe(200);
  });

  it("returns a retryable response until reconciliation can write the event", async () => {
    installEvent({ id: "re_fixture" }, "refund.updated");
    mocks.reconcile.mockRejectedValueOnce(new Error("Firestore unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect((await POST(webhookRequest())).status).toBe(500);
      expect((await POST(webhookRequest())).status).toBe(200);
      expect(mocks.reconcile).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
    }
  });

  it("does not grant a credit pack after its payment was reversed", async () => {
    installEvent(paidSession({
      amount_total: 17_500,
      metadata: { purchaseType: "credit_pack", builderId: "b2", creditsToGrant: "5" },
    }));
    mocks.adminDb.runTransaction.mockImplementationOnce(
      async (cb: (tx: typeof mocks.transaction) => Promise<unknown>) => {
        mocks.transaction.get
          .mockResolvedValueOnce({ data: () => ({ reversedAt: "timestamp" }) });
        await cb(mocks.transaction);
      },
    );
    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.transaction.update).not.toHaveBeenCalled();
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
          .mockResolvedValueOnce({ data: () => undefined })
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
        mocks.transaction.get
          .mockResolvedValueOnce({ data: () => undefined })
          .mockResolvedValueOnce({ exists: true });
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

  it("drops unparseable coordinates instead of granting NaN", async () => {
    installEvent(
      paidSession({
        id: "sess_cert",
        amount_total: 2900,
        metadata: {
          purchaseType: "certificate",
          uid: "user_1",
          certKey: "1234-oak-street-seattle",
          lat: "not-a-number",
          lng: "1e999",
        },
      }),
    );

    expect((await POST(webhookRequest())).status).toBe(200);
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

  it("stores Stripe-collected customer_details email and anonymous consent receipt on certificate grants", async () => {
    installEvent(
      paidSession({
        id: "sess_guest_cert",
        amount_total: 2900,
        customer_details: { email: "Buyer@Example.COM" },
        metadata: {
          purchaseType: "certificate",
          uid: "anon_1",
          certKey: "1234-oak-street-seattle",
          anonymousCheckout: "true",
          consentVersion: "2026-11-06",
          privacyVersion: "2026-11-06",
          consentAcceptedAt: "2026-11-16T20:00:00.000Z",
        },
      }),
    );

    expect((await POST(webhookRequest())).status).toBe(200);
    expect(mocks.grantCertificate).toHaveBeenCalledWith({
      uid: "anon_1",
      certKey: "1234-oak-street-seattle",
      stripeSessionId: "sess_guest_cert",
      amount: 2900,
      buyerEmail: "buyer@example.com",
      anonymousCheckout: true,
      consentVersion: "2026-11-06",
      privacyVersion: "2026-11-06",
      consentAcceptedAt: "2026-11-16T20:00:00.000Z",
    });
  });

  it("returns structured 500 JSON when fulfilment fails so Stripe retries cleanly", async () => {
    installEvent(paidSession());
    mocks.grant.mockRejectedValueOnce(new Error("transient firestore timeout"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(webhookRequest());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Webhook processing failed." });
    spy.mockRestore();
  });
});
