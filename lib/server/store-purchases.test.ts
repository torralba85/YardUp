import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORE_PRODUCTS } from "@/lib/commerce/products";
import { purchaseId } from "@/lib/certificate-purchases-id";
import type { StorePurchaseVerifier } from "./store-purchases";

const store = vi.hoisted(() => {
  const grants = new Map<string, Record<string, unknown>>();
  const builders = new Map<string, { credits: number }>();
  const certificatePurchases = new Map<string, Record<string, unknown>>();
  return { grants, builders, certificatePurchases };
});

const grantCertificate = vi.hoisted(() =>
  vi.fn(async (input: { uid: string; certKey: string; stripeSessionId: string }) => {
    const id = purchaseId(input.uid, input.certKey);
    if (store.certificatePurchases.has(id)) return false;
    store.certificatePurchases.set(id, {
      uid: input.uid,
      certKey: input.certKey,
      stripeSessionId: input.stripeSessionId,
      status: "granted",
    });
    return true;
  }),
);

vi.mock("./certificate-purchases", () => ({
  grantCertificate: (...args: unknown[]) =>
    grantCertificate(...(args as [{ uid: string; certKey: string; stripeSessionId: string }])),
}));

vi.mock("./firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        path: `${name}/${id}`,
      }),
    }),
    runTransaction: async (
      fn: (tx: {
        get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => unknown }>;
        create: (ref: { path: string }, data: Record<string, unknown>) => void;
        update: (ref: { path: string }, data: Record<string, unknown>) => void;
        set: (ref: { path: string }, data: Record<string, unknown>, opts?: unknown) => void;
      }) => Promise<unknown>,
    ) => {
      const tx = {
        get: async (ref: { path: string }) => {
          if (ref.path.startsWith("purchaseGrants/")) {
            const id = ref.path.split("/")[1];
            const data = store.grants.get(id);
            return { exists: Boolean(data), data: () => data };
          }
          if (ref.path.startsWith("builders/")) {
            const id = ref.path.split("/")[1];
            const data = store.builders.get(id);
            return { exists: Boolean(data), data: () => data };
          }
          return { exists: false, data: () => undefined };
        },
        create: (ref: { path: string }, data: Record<string, unknown>) => {
          const id = ref.path.split("/")[1];
          if (store.grants.has(id)) throw new Error("already exists");
          store.grants.set(id, data);
        },
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          if (ref.path.startsWith("builders/")) {
            const id = ref.path.split("/")[1];
            const current = store.builders.get(id) ?? { credits: 0 };
            const productCredits =
              (data.credits as { _increment?: number } | undefined)?._increment ?? 5;
            store.builders.set(id, {
              credits: current.credits + productCredits,
            });
          }
        },
        set: () => {
          // certificateCredits balance — no-op for these tests
        },
      };
      return fn(tx);
    },
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "server-time",
    increment: (n: number) => ({ _increment: n }),
  },
}));

import { verifyAndGrantPurchase } from "./store-purchases";

const verifier: StorePurchaseVerifier = {
  verifyApple: async ({ token }) => {
    if (token.includes("bad")) return { error: "Invalid signature" };
    return { transactionId: `tx-apple-${token}` };
  },
  verifyGoogle: async ({ token }) => {
    if (token.includes("bad")) return { error: "Invalid purchase token" };
    return { transactionId: `tx-google-${token}` };
  },
};

/** Mirrors useCertificateAccess: purchased iff certificatePurchases/{uid}_{certKey} exists. */
function isCertificatePurchased(uid: string, certKey: string): boolean {
  return store.certificatePurchases.has(purchaseId(uid, certKey));
}

describe("verifyAndGrantPurchase", () => {
  beforeEach(() => {
    store.grants.clear();
    store.builders.clear();
    store.certificatePurchases.clear();
    grantCertificate.mockClear();
    store.builders.set("user-1", { credits: 0 });
  });

  it("rejects web platform on the store verify path", async () => {
    const result = await verifyAndGrantPurchase(
      {
        uid: "user-1",
        platform: "web",
        productId: STORE_PRODUCTS.certificate.id,
        token: "anything",
        certKey: "lot-1",
      },
      verifier,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects certificate SKUs without certKey", async () => {
    const result = await verifyAndGrantPurchase(
      {
        uid: "user-1",
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "good-token-abc",
      },
      verifier,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/certKey/i);
    expect(grantCertificate).not.toHaveBeenCalled();
    expect(isCertificatePurchased("user-1", "lot-1")).toBe(false);
  });

  it("rejects invalid signatures", async () => {
    const result = await verifyAndGrantPurchase(
      {
        uid: "user-1",
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "bad-token-xyz",
        certKey: "lot-1",
      },
      verifier,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid signature/i);
  });

  it("unlocks certificatePurchases for the certKey so studio access is purchased", async () => {
    const certKey = "seattle-oak-street";
    const uid = "user-1";

    // Precondition: locked
    expect(isCertificatePurchased(uid, certKey)).toBe(false);

    const result = await verifyAndGrantPurchase(
      {
        uid,
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "demo:good-token-cert-1",
        certKey,
      },
      verifier,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.replay).toBe(false);
      expect(result.grant.certificateCredits).toBe(1);
      expect(result.grant.certKey).toBe(certKey);
    }

    // Real unlock path: grantCertificate wrote the same doc id the client hook reads.
    expect(grantCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        uid,
        certKey,
        stripeSessionId: expect.stringContaining("store:app-store:"),
      }),
    );
    expect(purchaseId(uid, certKey)).toBe(`${uid}_${certKey}`);
    expect(isCertificatePurchased(uid, certKey)).toBe(true);
  });

  it("replays without double-granting but keeps certificate unlocked", async () => {
    const certKey = "lot-replay";
    const input = {
      uid: "user-1",
      platform: "app-store" as const,
      productId: STORE_PRODUCTS.certificate.id,
      token: "demo:good-token-replay",
      certKey,
    };
    const first = await verifyAndGrantPurchase(input, verifier);
    expect(first.ok).toBe(true);
    const second = await verifyAndGrantPurchase(input, verifier);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.replay).toBe(true);
    expect(store.grants.size).toBe(1);
    expect(isCertificatePurchased("user-1", certKey)).toBe(true);
  });

  it("rejects a replayed transaction from a different account", async () => {
    const first = await verifyAndGrantPurchase(
      {
        uid: "user-1",
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "demo:cross-account-tx",
        certKey: "lot-a",
      },
      verifier,
    );
    expect(first.ok).toBe(true);

    const second = await verifyAndGrantPurchase(
      {
        uid: "user-2",
        platform: "app-store",
        productId: STORE_PRODUCTS.certificate.id,
        token: "demo:cross-account-tx",
        certKey: "lot-b",
      },
      verifier,
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.status).toBe(403);
    expect(store.grants.size).toBe(1);
    expect(isCertificatePurchased("user-2", "lot-b")).toBe(false);
  });

  it("ignores a client-supplied certKey on replay so one receipt unlocks one lot", async () => {
    const base = {
      uid: "user-1",
      platform: "app-store" as const,
      productId: STORE_PRODUCTS.certificate.id,
      token: "demo:replay-key-tx",
    };
    const first = await verifyAndGrantPurchase({ ...base, certKey: "lot-original" }, verifier);
    expect(first.ok).toBe(true);

    const second = await verifyAndGrantPurchase({ ...base, certKey: "lot-other" }, verifier);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.replay).toBe(true);
      expect(second.grant.certKey).toBe("lot-original");
    }
    expect(isCertificatePurchased("user-1", "lot-original")).toBe(true);
    expect(isCertificatePurchased("user-1", "lot-other")).toBe(false);
  });

  it("grants google-play builder credits without requiring certKey", async () => {
    const result = await verifyAndGrantPurchase(
      {
        uid: "user-1",
        platform: "google-play",
        productId: STORE_PRODUCTS.builder10.id,
        token: "demo:play-ok-token",
      },
      verifier,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.grant.credits).toBe(10);
      expect(result.grant.platform).toBe("google-play");
    }
    expect(grantCertificate).not.toHaveBeenCalled();
  });
});

describe("createDefaultStoreVerifier production path", () => {
  it("runs real Apple verification when APPLE_BUNDLE_ID is set (does not hard-fail)", async () => {
    const prev = process.env.APPLE_BUNDLE_ID;
    process.env.APPLE_BUNDLE_ID = "com.lotfoundry.app";
    try {
      const { createDefaultStoreVerifier } = await import("./store-purchases");
      const v = createDefaultStoreVerifier();
      // Demo token still accepted in test NODE_ENV via parseDemoReceiptToken.
      const ok = await v.verifyApple({
        productId: STORE_PRODUCTS.certificate.id,
        token: "demo:prod-path-tx",
      });
      expect(ok).toEqual(
        expect.objectContaining({
          transactionId: expect.stringContaining("prod-path-tx"),
        }),
      );
      // Garbage JWS fails with a real verification error, not "not configured".
      const bad = await v.verifyApple({
        productId: STORE_PRODUCTS.certificate.id,
        token: "not.a.valid.jws",
      });
      expect(bad).toEqual(expect.objectContaining({ error: expect.any(String) }));
      if ("error" in bad) {
        expect(bad.error).not.toMatch(/not configured/i);
      }
    } finally {
      if (prev === undefined) delete process.env.APPLE_BUNDLE_ID;
      else process.env.APPLE_BUNDLE_ID = prev;
    }
  });
});
