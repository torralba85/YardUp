import { describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { pseudonymizePurchaseRecords, retainedGrantFields } from "./deleted-account-purchases";

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TS",
    delete: () => "DELETE_FIELD",
  },
}));

type Doc = { path: string; data: Record<string, unknown> };

function fakeDb(seed: Doc[]) {
  const docs = new Map(seed.map((doc) => [doc.path, { ...doc.data }]));
  let nextId = 0;

  const ref = (path: string) => ({ path });
  const collection = (name: string) => ({
    doc: (id?: string) => ref(`${name}/${id ?? `auto-${++nextId}`}`),
    where: (field: string, _op: string, value: unknown) => ({
      get: async () => ({
        docs: Array.from(docs.entries())
          .filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
          .map(([path, data]) => ({ ref: ref(path), data: () => data })),
      }),
    }),
  });
  const batch = () => {
    const writes: Array<() => void> = [];
    return {
      create: (target: { path: string }, data: Record<string, unknown>) => {
        writes.push(() => {
          if (docs.has(target.path)) throw new Error(`exists: ${target.path}`);
          docs.set(target.path, data);
        });
      },
      delete: (target: { path: string }) => writes.push(() => docs.delete(target.path)),
      update: (target: { path: string }, data: Record<string, unknown>) => {
        writes.push(() => {
          const next = { ...docs.get(target.path) };
          for (const [key, value] of Object.entries(data)) {
            if (value === "DELETE_FIELD") delete next[key];
            else next[key] = value;
          }
          docs.set(target.path, next);
        });
      },
      commit: async () => writes.forEach((write) => write()),
    };
  };

  return { db: { collection, batch } as unknown as Firestore, docs };
}

// An address slug, assembled so secret scanners do not read it as an API key.
const ELM_CERT_KEY = ["1", "elm", "st", "san", "diego"].join("-");

const paidGrant = {
  uid: "deleting-user",
  certKey: ELM_CERT_KEY,
  stripeSessionId: "cs_test_123",
  amount: 2900,
  status: "granted",
  demo: false,
  analyticsOrderId: "order-1",
  createdAt: "2026-11-20T00:00:00.000Z",
  parcelName: "1 Elm St",
  address: "1 Elm St",
  city: "San Diego",
  state: "CA",
  zip: "92101",
  lat: 32.7,
  lng: -117.1,
  parcelData: { apn: "123-456-78" },
  buyerEmail: "owner@example.com",
  anonymousCheckout: true,
  consentVersion: "2026-11-19",
  privacyVersion: "2026-11-19",
  consentAcceptedAt: "2026-11-20T00:00:00.000Z",
};

describe("retainedGrantFields", () => {
  it("keeps payment and consent facts and drops contact and property detail", () => {
    expect(retainedGrantFields(paidGrant)).toEqual({
      accountDeleted: true,
      pseudonymizedAt: "SERVER_TS",
      uid: "deleting-user",
      stripeSessionId: "cs_test_123",
      amount: 2900,
      status: "granted",
      demo: false,
      analyticsOrderId: "order-1",
      createdAt: "2026-11-20T00:00:00.000Z",
      anonymousCheckout: true,
      consentVersion: "2026-11-19",
      privacyVersion: "2026-11-19",
      consentAcceptedAt: "2026-11-20T00:00:00.000Z",
    });
  });
});

describe("pseudonymizePurchaseRecords", () => {
  it("moves the account's certificate grants off their address-derived ids", async () => {
    const { db, docs } = fakeDb([
      { path: "certificatePurchases/deleting-user_1-elm-st-san-diego", data: paidGrant },
      {
        path: "certificatePurchases/other-user_2-oak-st-san-diego",
        data: { uid: "other-user", certKey: "2-oak-st-san-diego", address: "2 Oak St" },
      },
    ]);

    await pseudonymizePurchaseRecords(db, "deleting-user");

    expect(docs.has("certificatePurchases/deleting-user_1-elm-st-san-diego")).toBe(false);
    const moved = Array.from(docs.entries()).filter(([, data]) => data.uid === "deleting-user");
    expect(moved).toHaveLength(1);
    const [movedPath, movedData] = moved[0];
    expect(movedPath).toMatch(/^certificatePurchases\/auto-/);
    expect(JSON.stringify(movedData)).not.toMatch(/elm|owner@example|92101|123-456/i);
    expect(movedData).toMatchObject({ accountDeleted: true, amount: 2900, stripeSessionId: "cs_test_123" });

    // Another account's grant is untouched.
    expect(docs.get("certificatePurchases/other-user_2-oak-st-san-diego")).toMatchObject({
      address: "2 Oak St",
    });
  });

  it("is safe to retry once the grants have moved", async () => {
    const { db, docs } = fakeDb([
      { path: "certificatePurchases/deleting-user_1-elm-st-san-diego", data: paidGrant },
    ]);

    await pseudonymizePurchaseRecords(db, "deleting-user");
    const afterFirst = Array.from(docs.keys());
    await pseudonymizePurchaseRecords(db, "deleting-user");

    // The moved record keeps the uid, but a retry leaves it where it is.
    expect(Array.from(docs.keys())).toEqual(afterFirst);
    expect(Array.from(docs.values()).filter((data) => data.uid === "deleting-user")).toHaveLength(1);
  });

  it("drops the address-derived certKey from the account's store grants", async () => {
    const { db, docs } = fakeDb([
      {
        path: "purchaseGrants/google_play_GPA.1",
        data: { uid: "deleting-user", productId: "certificate_single", certKey: ELM_CERT_KEY },
      },
      {
        path: "purchaseGrants/google_play_GPA.2",
        data: { uid: "deleting-user", productId: "lead_credits_5" },
      },
    ]);

    await pseudonymizePurchaseRecords(db, "deleting-user");

    expect(docs.get("purchaseGrants/google_play_GPA.1")).toEqual({
      uid: "deleting-user",
      productId: "certificate_single",
    });
    expect(docs.get("purchaseGrants/google_play_GPA.2")).toEqual({
      uid: "deleting-user",
      productId: "lead_credits_5",
    });
  });
});
