import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  created: [] as Array<{ id: string; data: Record<string, unknown> }>,
  existing: new Set<string>(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
}));

vi.mock("./firebase-admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      doc: (id: string) => ({
        async create(data: Record<string, unknown>) {
          if (store.existing.has(id)) {
            const err = new Error("already exists") as Error & { code: number };
            err.code = 6;
            throw err;
          }
          store.existing.add(id);
          store.created.push({ id, data });
        },
        async get() {
          return { exists: store.existing.has(id) };
        },
      }),
    }),
  }),
}));

import { grantCertificate, hasCertificate, purchaseId } from "./certificate-purchases";

beforeEach(() => {
  store.created = [];
  store.existing = new Set();
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
});
