import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  created: [] as Array<{ id: string; data: Record<string, unknown> }>,
  docs: new Map<string, Record<string, unknown>>(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    getUser: vi.fn(),
  }),
}));

vi.mock("../stripe", () => ({
  getStripe: async () => null,
}));

function makeDocRef(id: string) {
  return {
    id,
    async create(data: Record<string, unknown>) {
      if (store.docs.has(id)) {
        const err = new Error("already exists") as Error & { code: number };
        err.code = 6;
        throw err;
      }
      store.docs.set(id, data);
      store.created.push({ id, data });
    },
    async get() {
      return {
        exists: store.docs.has(id),
        data: () => store.docs.get(id),
      };
    },
  };
}

vi.mock("./firebase-admin", () => ({
  getAdminApp: () => ({}),
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: (id: string) => makeDocRef(name === "certificateTransfers" ? `transfers/${id}` : id),
      where: (field: string, _op: string, value: unknown) => ({
        async get() {
          const docs = Array.from(store.docs.entries())
            .filter(([, data]) => data[field] === value)
            .map(([id, data]) => ({
              id,
              ref: makeDocRef(id),
              data: () => data,
            }));
          return { docs };
        },
      }),
    }),
    async runTransaction<T>(fn: (tx: {
      get: (ref: ReturnType<typeof makeDocRef>) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
      create: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => void;
      delete: (ref: ReturnType<typeof makeDocRef>) => void;
    }) => Promise<T>): Promise<T> {
      const tx = {
        get: (ref: ReturnType<typeof makeDocRef>) => ref.get(),
        create: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
          if (store.docs.has(ref.id)) {
            throw new Error(`Document ${ref.id} already exists`);
          }
          store.docs.set(ref.id, data);
          store.created.push({ id: ref.id, data });
        },
        delete: (ref: ReturnType<typeof makeDocRef>) => {
          store.docs.delete(ref.id);
        },
      };
      return fn(tx);
    },
  }),
}));

import {
  claimCertificatesByVerifiedEmail,
  grantCertificate,
  hasCertificate,
  purchaseId,
  wasCertificateTransferredFrom,
} from "./certificate-purchases";

beforeEach(() => {
  store.created = [];
  store.docs.clear();
});

describe("purchaseId", () => {
  it("is the deterministic uid_certKey id", () => {
    expect(purchaseId("u1", "413-elmwood-ave-seattle")).toBe("u1_413-elmwood-ave-seattle");
  });
});

describe("grantCertificate idempotency", () => {
  it("creates a granted record with the deterministic id", async () => {
    const created = await grantCertificate({
      uid: "u1",
      certKey: "413-elmwood-ave-seattle",
      stripeSessionId: "sess_1",
      amount: 2900,
    });

    expect(created).toBe(true);
    expect(store.created).toHaveLength(1);
    expect(store.created[0].id).toBe("u1_413-elmwood-ave-seattle");
    expect(store.created[0].data).toMatchObject({
      uid: "u1",
      certKey: "413-elmwood-ave-seattle",
      status: "granted",
      amount: 2900,
      demo: false,
    });
  });

  it("no-ops on a replayed webhook (already exists)", async () => {
    await grantCertificate({ uid: "u1", certKey: "k", stripeSessionId: "sess_1", amount: 2900 });
    const replay = await grantCertificate({
      uid: "u1",
      certKey: "k",
      stripeSessionId: "sess_1_retry",
      amount: 2900,
    });

    expect(replay).toBe(false);
    expect(store.created).toHaveLength(1); // never re-stamped
  });

  it("marks demo grants", async () => {
    await grantCertificate({ uid: "u1", certKey: "k", stripeSessionId: "demo_k", amount: 2900, demo: true });
    expect(store.created[0].data.demo).toBe(true);
  });
});

describe("hasCertificate", () => {
  it("reflects whether a grant exists", async () => {
    expect(await hasCertificate("u1", "k")).toBe(false);
    await grantCertificate({ uid: "u1", certKey: "k", stripeSessionId: "sess_1", amount: 2900 });
    expect(await hasCertificate("u1", "k")).toBe(true);
  });
});

describe("wasCertificateTransferredFrom", () => {
  it("reports whether a certificate grant was recovered from a source uid for that lot", async () => {
    expect(await wasCertificateTransferredFrom("anon-1", "lot-1")).toBe(false);
    store.docs.set("member-2_lot-1", {
      uid: "member-2",
      certKey: "lot-1",
      transferredFromUid: "anon-1",
    });
    expect(await wasCertificateTransferredFrom("anon-1", "lot-1")).toBe(true);
    expect(await wasCertificateTransferredFrom("anon-1", "lot-2")).toBe(false);
    expect(await wasCertificateTransferredFrom("anon-2", "lot-1")).toBe(false);
  });
});

describe("grantCertificate storage guards", () => {
  it("stores finite coordinates and small parcel snapshots", async () => {
    const created = await grantCertificate({
      uid: "u1",
      certKey: "k",
      stripeSessionId: "sess_1",
      amount: 2900,
      lat: 37.33,
      lng: -121.89,
      parcelData: { address: "123 Main St" },
    });

    expect(created).toBe(true);
    expect(store.created[0].data).toMatchObject({
      lat: 37.33,
      lng: -121.89,
      parcelData: { address: "123 Main St" },
    });
  });

  it("drops non-finite coordinates but still writes the grant", async () => {
    const created = await grantCertificate({
      uid: "u1",
      certKey: "k",
      stripeSessionId: "sess_1",
      amount: 2900,
      lat: NaN,
      lng: Infinity,
    });

    expect(created).toBe(true);
    expect(store.created[0].data).not.toHaveProperty("lat");
    expect(store.created[0].data).not.toHaveProperty("lng");
  });

  it("drops oversized parcel snapshots but still writes the grant", async () => {
    const created = await grantCertificate({
      uid: "u1",
      certKey: "k",
      stripeSessionId: "sess_1",
      amount: 2900,
      parcelData: { blob: "x".repeat(300_000) },
    });

    expect(created).toBe(true);
    expect(store.created[0].data).not.toHaveProperty("parcelData");
  });

  it("persists lowercased buyerEmail, anonymousCheckout, and consent receipt fields", async () => {
    await grantCertificate({
      uid: "anon-1",
      certKey: "lot-1",
      stripeSessionId: "cs_live_1",
      amount: 2900,
      buyerEmail: "  Alice@Example.COM ",
      anonymousCheckout: true,
      consentVersion: "2026-11-06",
      privacyVersion: "2026-11-06",
      consentAcceptedAt: "2026-11-16T20:00:00.000Z",
    });

    expect(store.created[0].data).toMatchObject({
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
      consentVersion: "2026-11-06",
      privacyVersion: "2026-11-06",
      consentAcceptedAt: "2026-11-16T20:00:00.000Z",
    });
  });
});

describe("claimCertificatesByVerifiedEmail", () => {
  function paidStripeSession(overrides: Record<string, unknown> = {}) {
    return {
      id: "cs_paid_1",
      mode: "payment",
      status: "complete",
      payment_status: "paid",
      currency: "usd",
      amount_total: 2900,
      customer_details: { email: "alice@example.com" },
      metadata: {
        purchaseType: "certificate",
        uid: "anon-1",
        certKey: "lot-1",
      },
      ...overrides,
    };
  }

  it("transfers an anonymous Stripe-paid grant to a verified-email owner and deletes the old doc", async () => {
    store.docs.set("anon-1_lot-1", {
      uid: "anon-1",
      certKey: "lot-1",
      stripeSessionId: "cs_paid_1",
      amount: 2900,
      status: "granted",
      demo: false,
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
    });

    const result = await claimCertificatesByVerifiedEmail(
      { targetUid: "member-2", verifiedEmail: "Alice@Example.COM" },
      {
        retrieveSession: async () => paidStripeSession() as never,
        getAuthUser: async () => null,
      },
    );

    expect(result).toEqual({
      claimedCertKeys: ["lot-1"],
      alreadyOwnedCertKeys: [],
    });
    expect(store.docs.has("anon-1_lot-1")).toBe(false);
    expect(store.docs.get("member-2_lot-1")).toMatchObject({
      uid: "member-2",
      certKey: "lot-1",
      stripeSessionId: "cs_paid_1",
      buyerEmail: "alice@example.com",
      transferredFromUid: "anon-1",
    });
    // Neither webhook replay nor inline reconciliation can restore guest access.
    expect(await grantCertificate({ uid: "anon-1", certKey: "lot-1", stripeSessionId: "cs_paid_1", amount: 2900 })).toBe(false);
    expect(await hasCertificate("anon-1", "lot-1")).toBe(false);
    expect(await hasCertificate("member-2", "lot-1")).toBe(true);

    // Replaying claim is a clean no-op (already owned).
    const replay = await claimCertificatesByVerifiedEmail(
      { targetUid: "member-2", verifiedEmail: "alice@example.com" },
      {
        retrieveSession: async () => paidStripeSession() as never,
        getAuthUser: async () => null,
      },
    );
    expect(replay).toEqual({
      claimedCertKeys: [],
      alreadyOwnedCertKeys: ["lot-1"],
    });
    // A later, independent payment must remain fulfillable (including Play).
    expect(await grantCertificate({ uid: "anon-1", certKey: "lot-1", stripeSessionId: "store:google-play:new-payment", amount: 2900 })).toBe(true);
    expect(store.docs.get("anon-1_lot-1")?.stripeSessionId).toBe("store:google-play:new-payment");
  });

  it("rejects non-Stripe grants (demo, native store, agent pass)", async () => {
    store.docs.set("anon-1_demo-lot", {
      uid: "anon-1",
      certKey: "demo-lot",
      stripeSessionId: "demo_demo-lot",
      demo: true,
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
    });
    store.docs.set("anon-1_store-lot", {
      uid: "anon-1",
      certKey: "store-lot",
      stripeSessionId: "store:google-play:tx_1",
      demo: false,
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
    });
    store.docs.set("anon-1_pass-lot", {
      uid: "anon-1",
      certKey: "pass-lot",
      stripeSessionId: "pass:SMITH-ELM",
      demo: false,
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
    });

    const retrieveSession = vi.fn();
    const result = await claimCertificatesByVerifiedEmail(
      { targetUid: "member-2", verifiedEmail: "alice@example.com" },
      { retrieveSession, getAuthUser: async () => null },
    );

    expect(result).toEqual({ claimedCertKeys: [], alreadyOwnedCertKeys: [] });
    expect(retrieveSession).not.toHaveBeenCalled();
    expect(store.docs.has("anon-1_demo-lot")).toBe(true);
    expect(store.docs.has("anon-1_store-lot")).toBe(true);
    expect(store.docs.has("anon-1_pass-lot")).toBe(true);
  });

  it("refuses transfer when Stripe shows unpaid, mismatched amount, or mismatched buyer email", async () => {
    store.docs.set("anon-1_lot-1", {
      uid: "anon-1",
      certKey: "lot-1",
      stripeSessionId: "cs_paid_1",
      demo: false,
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
    });

    for (const badSession of [
      paidStripeSession({ payment_status: "unpaid" }),
      paidStripeSession({ amount_total: 100 }),
      paidStripeSession({ customer_details: { email: "other@example.com" } }),
      paidStripeSession({ metadata: { purchaseType: "certificate", uid: "wrong-uid", certKey: "lot-1" } }),
    ]) {
      const result = await claimCertificatesByVerifiedEmail(
        { targetUid: "member-2", verifiedEmail: "alice@example.com" },
        { retrieveSession: async () => badSession as never, getAuthUser: async () => null },
      );
      expect(result).toEqual({ claimedCertKeys: [], alreadyOwnedCertKeys: [] });
      expect(store.docs.has("anon-1_lot-1")).toBe(true);
      expect(store.docs.has("member-2_lot-1")).toBe(false);
    }
  });

  it.each([false, true])("enforces current owner isolation even after anonymous checkout (%s)", async (anonymousCheckout) => {
    store.docs.set("bob-registered_lot-1", {
      uid: "bob-registered",
      certKey: "lot-1",
      stripeSessionId: "cs_paid_1",
      demo: false,
      buyerEmail: "alice@example.com",
      anonymousCheckout,
    });

    const result = await claimCertificatesByVerifiedEmail(
      { targetUid: "alice-registered", verifiedEmail: "alice@example.com" },
      {
        retrieveSession: async () =>
          paidStripeSession({
            metadata: { purchaseType: "certificate", uid: "bob-registered", certKey: "lot-1" },
          }) as never,
        getAuthUser: async () => ({
          email: "bob@example.com",
          emailVerified: true,
          providerData: [{ providerId: "password" }],
        }),
      },
    );

    expect(result).toEqual({ claimedCertKeys: [], alreadyOwnedCertKeys: [] });
    expect(store.docs.has("bob-registered_lot-1")).toBe(true);
    expect(store.docs.has("alice-registered_lot-1")).toBe(false);
  });

  it("reports payment verification outages instead of claiming no purchase exists", async () => {
    store.docs.set("anon-1_lot-1", {
      uid: "anon-1", certKey: "lot-1", stripeSessionId: "cs_paid_1",
      buyerEmail: "alice@example.com", anonymousCheckout: true,
    });
    await expect(claimCertificatesByVerifiedEmail(
      { targetUid: "member-2", verifiedEmail: "alice@example.com" },
      { retrieveSession: async () => { throw new Error("Stripe unavailable"); }, getAuthUser: async () => null },
    )).rejects.toThrow("Could not verify the payment");
    expect(store.docs.has("anon-1_lot-1")).toBe(true);
  });

  it("does not overwrite a distinct grant already owned by the target account", async () => {
    store.docs.set("anon-1_lot-1", {
      uid: "anon-1",
      certKey: "lot-1",
      stripeSessionId: "cs_paid_1",
      demo: false,
      buyerEmail: "alice@example.com",
      anonymousCheckout: true,
    });
    store.docs.set("member-2_lot-1", {
      uid: "member-2",
      certKey: "lot-1",
      stripeSessionId: "cs_paid_existing",
    });

    const result = await claimCertificatesByVerifiedEmail(
      { targetUid: "member-2", verifiedEmail: "alice@example.com" },
      { retrieveSession: async () => paidStripeSession() as never, getAuthUser: async () => null },
    );

    expect(result).toEqual({ claimedCertKeys: [], alreadyOwnedCertKeys: ["lot-1"] });
    expect(store.docs.get("member-2_lot-1")?.stripeSessionId).toBe("cs_paid_existing");
  });
});
