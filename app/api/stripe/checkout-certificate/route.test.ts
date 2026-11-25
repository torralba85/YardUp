import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { certificateKey } from "@/lib/certificate-key";
import { CURRENT_LEGAL_CONSENT } from "@/lib/legal-consent";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const mocks = vi.hoisted(() => ({
  auth: { uid: "user-1" } as {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
  },
  purchased: false,
  transferred: false,
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
  requireApiAuth: async () => mocks.auth,
}));

vi.mock("@/lib/server/certificate-purchases", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/certificate-purchases")
  >("@/lib/server/certificate-purchases");
  return {
    // Real Session -> Grant mapping; only the Firestore write is mocked.
    certificateGrantInputFromSession: actual.certificateGrantInputFromSession,
    fulfillPaidCertificateSession: async (
      session: Parameters<typeof actual.certificateGrantInputFromSession>[0],
    ) => {
      const input = actual.certificateGrantInputFromSession(session);
      return input ? mocks.grant(input) : null;
    },
    hasCertificate: async () => mocks.purchased,
    wasCertificateTransferredFrom: async () => mocks.transferred,
  };
});

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
  resetRateLimitBuckets();
  mocks.auth = { uid: "user-1" };
  mocks.purchased = false;
  mocks.transferred = false;
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

  it.each([
    [{ uid: "user-1", email: "first@example.test", emailVerified: true }, { uid: "user-1", email: "changed@example.test", emailVerified: true }],
    [{ uid: "user-1" }, { uid: "user-1", email: "new@example.test", emailVerified: true }],
    [{ uid: "user-1", email: "owner@example.test", emailVerified: false }, { uid: "user-1", email: "owner@example.test", emailVerified: true }],
  ])("keeps email parameters identical after uncertain creation despite auth changes", async (originalAuth, refreshedAuth) => {
    mocks.auth = originalAuth;
    const create = vi.fn()
      .mockRejectedValueOnce(new Error("Connection lost after Stripe accepted creation"))
      .mockResolvedValueOnce({ id: "cs_retry", url: "https://checkout.stripe.com/retry" });
    mocks.stripe = { checkout: { sessions: { create } } };

    expect((await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }))).status).toBe(502);
    mocks.auth = refreshedAuth;
    expect((await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-2" }))).status).toBe(200);

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

  // Demo-lot slugs live in constants: Gitleaks reads `certKey: "<long slug>"` as an API key.
  const SAN_DIEGO_DEMO = "1234-coyote-brush-court-san-diego-ca-92117";
  const SEATTLE_DEMO = "1234-oak-street-seattle-wa-98115";

  it.each([SAN_DIEGO_DEMO, SEATTLE_DEMO])("refuses to sell a certificate for the demo lot %s", async (certKey) => {
    const create = vi.fn();
    mocks.stripe = { checkout: { sessions: { create } } };

    const res = await POST(postRequest({ certKey, checkoutAttemptId: "attempt-1" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Demo lots can't be purchased. Search your own address to get its certificate.",
    });
    expect(create).not.toHaveBeenCalled();
    expect(mocks.grant).not.toHaveBeenCalled();
  });

  it("still opens a demo-lot certificate bought before demo checkout was blocked", async () => {
    mocks.purchased = true;
    const res = await POST(postRequest({ certKey: SEATTLE_DEMO }));

    expect(await res.json()).toMatchObject({ status: "granted", alreadyPurchased: true });
  });

  it("returns 409 when the certificate was recovered to another account", async () => {
    mocks.transferred = true;
    const create = vi.fn();
    mocks.stripe = { checkout: { sessions: { create } } };

    const res = await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "This certificate was recovered to another account. Sign in to that account to open it.",
    });
    expect(create).not.toHaveBeenCalled();
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
          parcelName: "123 Main Street",
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

  it("carries state and zip through to fulfilment metadata", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(
      postRequest({
        certKey: "parcel-1",
        parcelName: "123 Main Street",
        checkoutAttemptId: "attempt-1",
        address: "123 Main St",
        city: "San Jose",
        state: "CA",
        zip: "95110",
      }),
    );

    expect(create.mock.calls[0][0].metadata).toMatchObject({
      purchaseType: "certificate",
      uid: "user-1",
      certKey: "parcel-1",
      address: "123 Main St",
      city: "San Jose",
      state: "CA",
      zip: "95110",
    });
  });

  it("keeps a long but accepted address and city intact so the Grant still matches certKey", async () => {
    // Property records accept address/city up to 200 chars and rebuild certKey
    // from the Grant; the old 100/50 metadata caps broke that for these lots.
    const address = `4000 ${"Old Ranch Road ".repeat(8).trim()}`;
    const city = "Rancho Santa Margarita Unincorporated Area, Orange County, CA";
    expect(address.length).toBeGreaterThan(100);
    expect(city.length).toBeGreaterThan(50);
    const certKey = certificateKey({ address, city });
    const create = vi.fn().mockResolvedValue({ id: "cs_long", url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    const res = await POST(
      postRequest({ certKey, checkoutAttemptId: "attempt-1", address, city, state: "CA" }),
    );

    expect(res.status).toBe(200);
    const { metadata } = create.mock.calls[0][0];
    expect(metadata).toMatchObject({ certKey, address, city, state: "CA" });
    const { certificateGrantInputFromSession } = await vi.importActual<
      typeof import("@/lib/server/certificate-purchases")
    >("@/lib/server/certificate-purchases");
    const grant = certificateGrantInputFromSession({ id: "cs_long", metadata });
    expect(certificateKey({ address: grant?.address ?? "", city: grant?.city ?? "" })).toBe(
      certKey,
    );
  });

  it("caps address and city metadata at the property-records limit", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(
      postRequest({
        certKey: "parcel-1",
        checkoutAttemptId: "attempt-1",
        address: "a".repeat(600),
        city: "c".repeat(600),
      }),
    );

    const { metadata } = create.mock.calls[0][0];
    expect(metadata.address).toBe("a".repeat(200));
    expect(metadata.city).toBe("c".repeat(200));
  });

  it("strips cert overrides from the client return query in redirect URLs", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(
      postRequest({
        certKey: "parcel-1",
        checkoutAttemptId: "attempt-1",
        returnSearch: "?parcelId=abc&cert=evil",
      }),
    );

    const args = create.mock.calls[0][0];
    expect(args.success_url).toContain("?cert=parcel-1");
    expect(args.success_url).toContain("parcelId=abc");
    expect(args.success_url).not.toContain("evil");
    expect(args.cancel_url).toContain("parcelId=abc");
    expect(args.cancel_url).not.toContain("cert=");
  });

  it.each([false, true])("reconciles only while the paid grant still belongs to the checkout uid (transferred=%s)", async (transferred) => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "cs_1", url: "https://stripe.test/cert/1" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "paid",
      mode: "payment",
      currency: "usd",
      amount_total: 2900,
      metadata: { uid: "user-1", certKey: "parcel-1" },
    });
    mocks.stripe = { checkout: { sessions: { create, retrieve } } };

    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));
    if (transferred) mocks.grant.mockResolvedValueOnce(false);
    const res = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
    );

    expect(res.status).toBe(transferred ? 409 : 200);
    const body = await res.json();
    if (transferred) expect(body.error).toContain("recovered to another account");
    else expect(body).toEqual({ status: "granted", reconciled: true });
    expect(mocks.grant).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "user-1",
        certKey: "parcel-1",
        stripeSessionId: "cs_1",
        amount: 2900,
      }),
    );
  });

  it("rotates a completed Session whose payment failed instead of 409 lockout", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "cs_1", url: "https://stripe.test/cert/1" })
      .mockResolvedValueOnce({ id: "cs_2", url: "https://stripe.test/cert/2" });
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

    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));
    const retry = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
    );

    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ url: "https://stripe.test/cert/2" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("rotates an expired completed Session instead of 409 lockout", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ id: "cs_1", url: "https://stripe.test/cert/1" })
      .mockResolvedValueOnce({ id: "cs_2", url: "https://stripe.test/cert/2" });
    const retrieve = vi.fn().mockResolvedValue({
      id: "cs_1",
      status: "complete",
      payment_status: "unpaid",
      expires_at: Math.floor(Date.now() / 1000) - 60,
    });
    mocks.stripe = {
      checkout: { sessions: { create, retrieve } },
    };

    await POST(postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }));
    const retry = await POST(
      postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
    );

    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ url: "https://stripe.test/cert/2" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("carries parcelName through to fulfilment metadata", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(
      postRequest({
        certKey: "parcel-1",
        parcelName: "123 Main Street",
        checkoutAttemptId: "attempt-1",
      }),
    );

    expect(create.mock.calls[0][0].metadata).toMatchObject({
      purchaseType: "certificate",
      uid: "user-1",
      certKey: "parcel-1",
      parcelName: "123 Main Street",
    });
  });

  it("disables adaptive pricing to ensure USD billing", async () => {
    const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
    mocks.stripe = { checkout: { sessions: { create } } };

    await POST(
      postRequest({
        certKey: "parcel-1",
        checkoutAttemptId: "attempt-1",
      }),
    );

    expect(create.mock.calls[0][0].adaptive_pricing).toEqual({ enabled: false });
  });

  describe("conversion presentation", () => {
    async function createSession(body: Record<string, unknown> = {}) {
      const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/cert" });
      mocks.stripe = { checkout: { sessions: { create } } };
      const res = await POST(
        postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1", ...body }),
      );
      return { res, args: create.mock.calls[0][0] };
    }

    it("prefills Checkout with the verified email from the Firebase token", async () => {
      mocks.auth = { uid: "user-1", email: "owner@example.com", emailVerified: true };

      const { res, args } = await createSession();

      expect(res.status).toBe(200);
      expect(args.customer_email).toBe("owner@example.com");
      // Prefill only; no persistent Customer is created for it.
      expect(args).not.toHaveProperty("customer");
      expect(args).not.toHaveProperty("customer_creation");
    });

    it("still creates Checkout when the token carries no email", async () => {
      mocks.auth = { uid: "user-1" };

      const { res, args } = await createSession();

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://stripe.test/cert" });
      expect(args).not.toHaveProperty("customer_email");
    });

    it("does not lock an unverified email into Checkout", async () => {
      // Stripe makes a customer_email prefill read-only, so an unverified
      // (possibly mistyped) address would trap the receipt.
      mocks.auth = { uid: "user-1", email: "typo@example.con", emailVerified: false };

      const { res, args } = await createSession();

      expect(res.status).toBe(200);
      expect(args).not.toHaveProperty("customer_email");
    });

    it("ignores an email supplied in the request body", async () => {
      mocks.auth = { uid: "user-1", email: "owner@example.com", emailVerified: true };

      const { args } = await createSession({
        email: "attacker@example.com",
        customer_email: "attacker@example.com",
      });

      expect(args.customer_email).toBe("owner@example.com");
      expect(JSON.stringify(args)).not.toContain("attacker@example.com");
    });

    it("never prefills a body-supplied email when the token has none", async () => {
      mocks.auth = { uid: "user-1" };

      const { args } = await createSession({ customer_email: "attacker@example.com" });

      expect(args).not.toHaveProperty("customer_email");
    });

    it("describes what the certificate includes without changing price or fulfilment", async () => {
      const { args } = await createSession({ parcelName: "123 Main Street" });

      const [lineItem] = args.line_items;
      expect(lineItem.quantity).toBe(1);
      expect(lineItem.price_data.currency).toBe("usd");
      expect(lineItem.price_data.unit_amount).toBe(2900);
      expect(lineItem.price_data.product_data.name).toBe(
        "LotFoundry Certificate of Feasibility — 123 Main Street",
      );
      const description: string = lineItem.price_data.product_data.description;
      expect(description).toMatch(/property-specific/i);
      expect(description).toMatch(/approval-path guidance/i);
      expect(description).toMatch(/next steps/i);
      // Stripe Checkout truncates long product descriptions; keep it scannable.
      expect(description.length).toBeLessThanOrEqual(160);
      // No regulatory or professional-service claims.
      expect(description).not.toMatch(/permit approval|guarantee|certified|appraisal|engineer/i);
      expect(args).not.toHaveProperty("payment_method_types");
      expect(args.integration_identifier).toBe("lotfoundry_certificate_wndqkplz");
      expect(args.metadata).toEqual({
        purchaseType: "certificate",
        uid: "user-1",
        certKey: "parcel-1",
        parcelName: "123 Main Street",
      });
    });

    it("returns a cancelled checkout to the certificate step with a server-stamped marker", async () => {
      const { args } = await createSession({ returnSearch: "?v=2&parcel=abc&size=600" });

      const cancel = new URL(args.cancel_url);
      expect(cancel.origin).toBe("http://localhost");
      expect(cancel.pathname).toBe("/studio");
      expect(cancel.searchParams.get("v")).toBe("2");
      expect(cancel.searchParams.get("parcel")).toBe("abc");
      expect(cancel.searchParams.get("size")).toBe("600");
      expect(cancel.searchParams.get("step")).toBe("certificate");
      expect(cancel.searchParams.get("checkout")).toBe("cancelled");
      expect(cancel.searchParams.has("cert")).toBe(false);
    });

    it("keeps the cancellation marker and step out of client control", async () => {
      const { args } = await createSession({
        returnSearch: "?parcel=abc&checkout=paid&checkout=cancelled&step=lot&cert=evil",
      });

      const cancel = new URL(args.cancel_url);
      expect(cancel.searchParams.getAll("checkout")).toEqual(["cancelled"]);
      expect(cancel.searchParams.getAll("step")).toEqual(["certificate"]);
      expect(cancel.searchParams.has("cert")).toBe(false);

      const success = new URL(args.success_url);
      expect(success.searchParams.getAll("cert")).toEqual(["parcel-1"]);
      expect(success.searchParams.get("parcel")).toBe("abc");
      // A paid return must never look like a cancellation.
      expect(success.searchParams.get("checkout")).toBe("returned");
      expect(success.searchParams.has("step")).toBe(false);
    });
  });

  describe("anonymous guest web checkout", () => {
    it("requires current legal consent before starting anonymous checkout", async () => {
      mocks.auth = { uid: "anon-1", isAnonymous: true };
      const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/anon" });
      mocks.stripe = { checkout: { sessions: { create } } };

      const missing = await POST(
        postRequest({ certKey: "parcel-1", checkoutAttemptId: "attempt-1" }),
      );
      expect(missing.status).toBe(400);

      const stale = await POST(
        postRequest({
          certKey: "parcel-1",
          checkoutAttemptId: "attempt-1",
          legalConsent: { ...CURRENT_LEGAL_CONSENT, termsVersion: "2020-01-01" },
        }),
      );
      expect(stale.status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    });

    it("stamps anonymousCheckout and consent version into Stripe metadata without customer_email", async () => {
      mocks.auth = { uid: "anon-1", isAnonymous: true };
      const create = vi.fn().mockResolvedValue({ url: "https://stripe.test/anon" });
      mocks.stripe = { checkout: { sessions: { create } } };

      const res = await POST(
        postRequest({
          certKey: "parcel-1",
          parcelName: "123 Main Street",
          checkoutAttemptId: "attempt-1",
          legalConsent: CURRENT_LEGAL_CONSENT,
        }),
      );

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ url: "https://stripe.test/anon" });
      const args = create.mock.calls[0][0];
      expect(args).not.toHaveProperty("customer_email");
      expect(args.metadata).toMatchObject({
        purchaseType: "certificate",
        uid: "anon-1",
        certKey: "parcel-1",
        anonymousCheckout: "true",
        consentVersion: CURRENT_LEGAL_CONSENT.termsVersion,
        privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
      });
      expect(typeof args.metadata.consentAcceptedAt).toBe("string");
    });

    it("records buyerEmail and consent metadata during inline complete-session reconciliation", async () => {
      mocks.auth = { uid: "anon-1", isAnonymous: true };
      const reservation = {
        attemptId: "attempt-1",
        parameters: {
          origin: "http://localhost",
          customerEmail: "",
          parcelName: "123 Main Street",
          anonymousCheckout: "true",
          consentVersion: CURRENT_LEGAL_CONSENT.termsVersion,
          privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
          consentAcceptedAt: "2026-11-16T20:00:00.000Z",
        },
        sessionId: "cs_done",
        sessionUrl: "https://stripe.test/done",
        expiresAtMs: Date.now() + 60_000,
      };
      mocks.reservations.set("certificate:anon-1:parcel-1", reservation);
      mocks.stripe = {
        checkout: {
          sessions: {
            create: vi.fn(),
            retrieve: vi.fn().mockResolvedValue({
              id: "cs_done",
              mode: "payment",
              status: "complete",
              payment_status: "paid",
              currency: "usd",
              amount_total: 2900,
              customer_details: { email: "Guest@Example.COM" },
              metadata: {
                purchaseType: "certificate",
                uid: "anon-1",
                certKey: "parcel-1",
                anonymousCheckout: "true",
                consentVersion: CURRENT_LEGAL_CONSENT.termsVersion,
                privacyVersion: CURRENT_LEGAL_CONSENT.privacyVersion,
                consentAcceptedAt: "2026-11-16T20:00:00.000Z",
              },
            }),
          },
        },
      };

      const res = await POST(
        postRequest({
          certKey: "parcel-1",
          checkoutAttemptId: "attempt-1",
          legalConsent: CURRENT_LEGAL_CONSENT,
        }),
      );
      expect(res.status).toBe(200);
      expect(mocks.grant).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: "anon-1",
          certKey: "parcel-1",
          buyerEmail: "guest@example.com",
          anonymousCheckout: true,
          consentVersion: CURRENT_LEGAL_CONSENT.termsVersion,
        }),
      );
    });

    it("writes the same Grant as the webhook for one paid Session", async () => {
      mocks.auth = { uid: "anon-1", isAnonymous: true };
      mocks.reservations.set("certificate:anon-1:parcel-1", {
        attemptId: "attempt-1",
        // Reservation drifts from the Session; the Session must win.
        parameters: { origin: "http://localhost", parcelName: "Drifted" },
        sessionId: "cs_done",
        sessionUrl: "https://stripe.test/done",
        expiresAtMs: Date.now() + 60_000,
      });
      const session = {
        id: "cs_done",
        mode: "payment",
        status: "complete",
        payment_status: "paid",
        currency: "usd",
        amount_total: 2900,
        customer_details: { email: "Guest@Example.COM" },
        metadata: {
          purchaseType: "certificate",
          uid: "anon-1",
          certKey: "parcel-1",
          parcelName: "123 Main Street",
          lat: "47.6",
          lng: "nope",
          anonymousCheckout: "true",
        },
      };
      mocks.stripe = {
        checkout: {
          sessions: { create: vi.fn(), retrieve: vi.fn().mockResolvedValue(session) },
        },
      };
      const res = await POST(
        postRequest({
          certKey: "parcel-1",
          checkoutAttemptId: "attempt-1",
          legalConsent: CURRENT_LEGAL_CONSENT,
        }),
      );
      expect(res.status).toBe(200);
      const { certificateGrantInputFromSession } = await vi.importActual<
        typeof import("@/lib/server/certificate-purchases")
      >("@/lib/server/certificate-purchases");
      // The webhook builds its Grant from this same function.
      expect(mocks.grant).toHaveBeenCalledWith(
        certificateGrantInputFromSession(session),
      );
      expect(certificateGrantInputFromSession(session)).toMatchObject({
        parcelName: "123 Main Street",
        lat: 47.6,
        lng: undefined,
        buyerEmail: "guest@example.com",
        anonymousCheckout: true,
      });
      // No consent was stamped on the Session, so none is invented at retry.
      expect(mocks.grant.mock.calls[0][0]).not.toHaveProperty("consentVersion");
    });
  });
});
