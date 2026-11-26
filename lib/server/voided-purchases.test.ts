import { beforeEach, describe, expect, it, vi } from "vitest";
import { purchaseId } from "@/lib/certificate-purchases-id";
import { PRODUCT_TYPE_ONE_TIME, REFUND_TYPE_FULL, REFUND_TYPE_QUANTITY_PARTIAL } from "./play-rtdn";
// `vi.mock` calls below are hoisted above this import, so the mocked
// `./firebase-admin` is already in place when this module is evaluated.
import {
  applyVoidedPurchase,
  planVoidRemediation,
  purchaseTokenHash,
  type VoidRemediationPlan,
  type VoidRemediationPlanner,
} from "./voided-purchases";

const store = vi.hoisted(() => ({
  grants: new Map<string, Record<string, unknown>>(),
  builders: new Map<string, Record<string, unknown>>(),
  certificateCredits: new Map<string, Record<string, unknown>>(),
  certificatePurchases: new Map<string, Record<string, unknown>>(),
  ledger: new Map<string, Record<string, unknown>>(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "__server_ts__",
    increment: (by: number) => ({ __increment: by }),
  },
}));

vi.mock("./firebase-admin", () => {
  const bucketFor = (path: string) => {
    if (path.includes("/ledger/")) return store.ledger;
    if (path.startsWith("purchaseGrants/")) return store.grants;
    if (path.startsWith("builders/")) return store.builders;
    if (path.startsWith("certificateCredits/")) return store.certificateCredits;
    if (path.startsWith("certificatePurchases/")) return store.certificatePurchases;
    return new Map<string, Record<string, unknown>>();
  };
  const keyFor = (path: string) =>
    path.includes("/ledger/") ? path : path.slice(path.indexOf("/") + 1);

  const makeRef = (path: string) => ({
    id: path.slice(path.lastIndexOf("/") + 1),
    path,
    collection: (sub: string) => ({
      doc: (subId: string) => makeRef(`${path}/${sub}/${subId}`),
    }),
    get: async () => {
      const data = bucketFor(path).get(keyFor(path));
      return { exists: Boolean(data), id: path.slice(path.lastIndexOf("/") + 1), data: () => data };
    },
    delete: async () => {
      bucketFor(path).delete(keyFor(path));
    },
  });

  return {
    getAdminDb: () => ({
      collection: (name: string) => ({
        doc: (id: string) => makeRef(`${name}/${id}`),
        where: (field: string, _op: string, value: unknown) => ({
          limit: () => ({
            get: async () => {
              const docs = Array.from(bucketFor(`${name}/x`).entries())
                .filter(([, data]) => data[field] === value)
                .map(([id, data]) => ({ id, data: () => data }));
              return { empty: docs.length === 0, docs };
            },
          }),
        }),
      }),
      runTransaction: async (
        fn: (tx: {
          get: (ref: { path: string }) => Promise<{ exists: boolean; data: () => unknown }>;
          update: (ref: { path: string }, data: Record<string, unknown>) => void;
          set: (ref: { path: string }, data: Record<string, unknown>, opts?: unknown) => void;
          delete: (ref: { path: string }) => void;
        }) => Promise<unknown>,
      ) => {
        const tx = {
          get: async (ref: { path: string }) => {
            const data = bucketFor(ref.path).get(keyFor(ref.path));
            return { exists: Boolean(data), data: () => data };
          },
          update: (ref: { path: string }, data: Record<string, unknown>) => {
            const bucket = bucketFor(ref.path);
            const key = keyFor(ref.path);
            bucket.set(key, { ...(bucket.get(key) ?? {}), ...data });
          },
          set: (ref: { path: string }, data: Record<string, unknown>) => {
            const bucket = bucketFor(ref.path);
            const key = keyFor(ref.path);
            const prev = bucket.get(key) ?? {};
            const resolved: Record<string, unknown> = { ...prev };
            for (const [field, value] of Object.entries(data)) {
              if (value && typeof value === "object" && "__increment" in value) {
                const base = typeof prev[field] === "number" ? (prev[field] as number) : 0;
                resolved[field] = base + (value as { __increment: number }).__increment;
              } else {
                resolved[field] = value;
              }
            }
            bucket.set(key, resolved);
          },
          delete: (ref: { path: string }) => {
            bucketFor(ref.path).delete(keyFor(ref.path));
          },
        };
        return fn(tx);
      },
    }),
  };
});

const ORDER_ID = "GS.0000-0000-0000";
const TOKEN = "PURCHASE_TOKEN";
const GRANT_ID = `google-play:${ORDER_ID}`;

const VOID = {
  purchaseToken: TOKEN,
  orderId: ORDER_ID,
  productType: PRODUCT_TYPE_ONE_TIME,
  refundType: REFUND_TYPE_FULL,
};

/** A planner that revokes everything, for exercising the apply path. */
const revokeAll: VoidRemediationPlanner = (input) => ({
  leadCreditsToRevoke: input.grant.credits,
  certificateCreditsToRevoke: input.grant.certificateCredits,
  revokeCertificateUnlock: input.hasCertificateUnlock,
  allowNegativeBalance: false,
  reason: "test-revoke-all",
});

function seedGrant(overrides: Record<string, unknown> = {}) {
  store.grants.set(GRANT_ID, {
    id: GRANT_ID,
    uid: "builder-1",
    platform: "google-play",
    productId: "com.lotfoundry.builder.credits10",
    credits: 10,
    certificateCredits: 0,
    transactionId: ORDER_ID,
    purchaseTokenHash: purchaseTokenHash(TOKEN),
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  });
}

beforeEach(() => {
  store.grants.clear();
  store.builders.clear();
  store.certificateCredits.clear();
  store.certificatePurchases.clear();
  store.ledger.clear();
});

describe("applyVoidedPurchase", () => {
  it("returns unmatched when no grant corresponds to the order", async () => {
    const outcome = await applyVoidedPurchase(VOID, revokeAll);

    expect(outcome.status).toBe("unmatched");
  });

  it("marks the grant voided and revokes credits per the plan", async () => {
    seedGrant();
    store.builders.set("builder-1", { credits: 10 });

    const outcome = await applyVoidedPurchase(VOID, revokeAll);

    expect(outcome.status).toBe("applied");
    expect(store.builders.get("builder-1")?.credits).toBe(0);
    expect(store.grants.get(GRANT_ID)?.voidedAt).toBeTruthy();
    expect(store.grants.get(GRANT_ID)?.revokedLeadCredits).toBe(10);
  });

  it("is idempotent — a redelivered void does not revoke twice", async () => {
    seedGrant();
    store.builders.set("builder-1", { credits: 10 });

    await applyVoidedPurchase(VOID, revokeAll);
    store.builders.set("builder-1", { credits: 4 }); // user re-purchased since
    const second = await applyVoidedPurchase(VOID, revokeAll);

    expect(second.status).toBe("replay");
    expect(store.builders.get("builder-1")?.credits).toBe(4);
  });

  it("floors the balance at zero and records the shortfall when the plan disallows debt", async () => {
    seedGrant();
    store.builders.set("builder-1", { credits: 3 }); // 7 already spent
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const outcome = await applyVoidedPurchase(VOID, revokeAll);

    expect(outcome).toMatchObject({
      status: "applied",
      shortfall: { leadCredits: 7, certificateCredits: 0 },
    });
    expect(store.builders.get("builder-1")?.credits).toBe(0);
    expect(store.grants.get(GRANT_ID)).toMatchObject({
      revokedLeadCredits: 3,
      leadCreditShortfall: 7,
    });
    const entries = Array.from(store.ledger.values());
    expect(entries[0]).toMatchObject({
      type: "refund",
      creditsChange: -3,
      requestedRevokeCredits: 10,
      shortfall: 7,
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("allows a negative balance when the plan permits debt", async () => {
    seedGrant();
    store.builders.set("builder-1", { credits: 3 });

    await applyVoidedPurchase(VOID, (input) => ({
      ...revokeAll(input),
      allowNegativeBalance: true,
    }));

    expect(store.builders.get("builder-1")?.credits).toBe(-7);
  });

  it("writes a refund ledger entry mirroring the Stripe webhook's shape", async () => {
    seedGrant();
    store.builders.set("builder-1", { credits: 10 });

    await applyVoidedPurchase(VOID, revokeAll);

    const entries = Array.from(store.ledger.values());
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: "refund",
      creditsChange: -10,
      orderId: ORDER_ID,
    });
  });

  it("deletes the certificate unlock doc, since access is gated on existence", async () => {
    const certKey = "lot-abc";
    seedGrant({
      productId: "com.lotfoundry.certificate.credit1",
      credits: 0,
      certificateCredits: 1,
      certKey,
    });
    store.certificatePurchases.set(purchaseId("builder-1", certKey), {
      uid: "builder-1",
      certKey,
    });

    await applyVoidedPurchase(VOID, revokeAll);

    expect(store.certificatePurchases.has(purchaseId("builder-1", certKey))).toBe(false);
  });

  it("leaves the certificate unlocked when the plan says not to revoke it", async () => {
    const certKey = "lot-abc";
    seedGrant({ credits: 0, certificateCredits: 1, certKey });
    store.certificatePurchases.set(purchaseId("builder-1", certKey), { uid: "builder-1" });

    await applyVoidedPurchase(VOID, (input) => ({
      ...revokeAll(input),
      revokeCertificateUnlock: false,
    }));

    expect(store.certificatePurchases.has(purchaseId("builder-1", certKey))).toBe(true);
  });

  it("falls back to the purchase-token hash when the order id does not match", async () => {
    seedGrant();
    // Re-key the grant so the `google-play:{orderId}` direct lookup misses.
    const data = store.grants.get(GRANT_ID)!;
    store.grants.delete(GRANT_ID);
    store.grants.set("google-play:some-other-key", data);
    store.builders.set("builder-1", { credits: 10 });

    const outcome = await applyVoidedPurchase(VOID, revokeAll);

    expect(outcome.status).toBe("applied");
    expect(store.builders.get("builder-1")?.credits).toBe(0);
  });

  it("passes the live balance and refund type to the planner", async () => {
    seedGrant();
    store.builders.set("builder-1", { credits: 6 });
    const seen: VoidRemediationPlan[] = [];

    await applyVoidedPurchase(VOID, (input) => {
      expect(input.currentLeadCredits).toBe(6);
      expect(input.fullRefund).toBe(true);
      expect(input.grant.credits).toBe(10);
      const plan = revokeAll(input);
      seen.push(plan);
      return plan;
    });

    expect(seen).toHaveLength(1);
  });

  it("uses the default floor-at-zero policy and records shortfalls end-to-end", async () => {
    seedGrant({ credits: 10 });
    store.builders.set("builder-1", { credits: 4 });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const outcome = await applyVoidedPurchase(VOID);

    expect(outcome).toMatchObject({
      status: "applied",
      plan: {
        leadCreditsToRevoke: 10,
        certificateCreditsToRevoke: 0,
        revokeCertificateUnlock: false,
        allowNegativeBalance: false,
        reason: "full-refund-floor-zero",
      },
      shortfall: { leadCredits: 6, certificateCredits: 0 },
    });
    expect(store.builders.get("builder-1")?.credits).toBe(0);
    expect(store.grants.get(GRANT_ID)).toMatchObject({
      revokedLeadCredits: 4,
      leadCreditShortfall: 6,
      voidReason: "full-refund-floor-zero",
    });
    warn.mockRestore();
  });

  it("revokes single-lot certificate unlock without touching certificateCredits balance under default policy", async () => {
    const certKey = "lot-xyz";
    seedGrant({
      productId: "com.lotfoundry.certificate.credit1",
      credits: 0,
      certificateCredits: 1,
      certKey,
    });
    store.certificatePurchases.set(purchaseId("builder-1", certKey), {
      uid: "builder-1",
      certKey,
    });

    const outcome = await applyVoidedPurchase(VOID);

    expect(outcome).toMatchObject({
      status: "applied",
      shortfall: { leadCredits: 0, certificateCredits: 0 },
    });
    expect(store.certificatePurchases.has(purchaseId("builder-1", certKey))).toBe(false);
    expect(store.certificateCredits.has("builder-1")).toBe(false);
    expect(store.grants.get(GRANT_ID)).toMatchObject({
      revokedCertificateCredits: 0,
      certificateCreditShortfall: 0,
      revokedCertificateUnlock: true,
    });
  });

  it("floors multi-credit certificate balance at zero and records certificate credit shortfall", async () => {
    seedGrant({
      productId: "com.lotfoundry.certificate.pack5",
      credits: 0,
      certificateCredits: 5,
    });
    store.certificateCredits.set("builder-1", { uid: "builder-1", balance: 2 });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const outcome = await applyVoidedPurchase(VOID);

    expect(outcome).toMatchObject({
      status: "applied",
      shortfall: { leadCredits: 0, certificateCredits: 3 },
    });
    expect(store.certificateCredits.get("builder-1")?.balance).toBe(0);
    expect(store.grants.get(GRANT_ID)).toMatchObject({
      revokedCertificateCredits: 2,
      certificateCreditShortfall: 3,
    });
    warn.mockRestore();
  });

  it("flags partial refunds for manual review without automated revocation", async () => {
    seedGrant({ credits: 10 });
    store.builders.set("builder-1", { credits: 10 });

    const outcome = await applyVoidedPurchase({
      ...VOID,
      refundType: REFUND_TYPE_QUANTITY_PARTIAL,
    });

    expect(outcome).toMatchObject({
      status: "applied",
      plan: {
        leadCreditsToRevoke: 0,
        certificateCreditsToRevoke: 0,
        revokeCertificateUnlock: false,
        allowNegativeBalance: false,
        reason: "partial-refund-manual-review",
      },
      shortfall: { leadCredits: 0, certificateCredits: 0 },
    });
    expect(store.builders.get("builder-1")?.credits).toBe(10);
    expect(
      planVoidRemediation({
        grant: {
          id: GRANT_ID,
          uid: "builder-1",
          productId: "com.lotfoundry.builder.credits10",
          credits: 10,
          certificateCredits: 0,
          transactionId: ORDER_ID,
        },
        fullRefund: false,
        currentLeadCredits: 10,
        hasCertificateUnlock: false,
      }).reason,
    ).toBe("partial-refund-manual-review");
  });
});
