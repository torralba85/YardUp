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

import { grantLeadUnlock, isLeadUnlocked, unlockId } from "./lead-unlocks";

beforeEach(() => {
  store.created = [];
  store.existing = new Set();
});

describe("unlockId", () => {
  it("is the deterministic builder_request id", () => {
    expect(unlockId("b1", "r1")).toBe("b1_r1");
  });
});

describe("grantLeadUnlock idempotency", () => {
  it("creates a granted record with the deterministic id", async () => {
    const created = await grantLeadUnlock({
      builderId: "b1",
      requestId: "r1",
      stripeSessionId: "sess_1",
      amount: 4900,
    });

    expect(created).toBe(true);
    expect(store.created).toHaveLength(1);
    expect(store.created[0].id).toBe("b1_r1");
    expect(store.created[0].data).toMatchObject({
      builderId: "b1",
      requestId: "r1",
      status: "granted",
      amount: 4900,
      demo: false,
    });
  });

  it("no-ops on a replayed webhook (already exists)", async () => {
    await grantLeadUnlock({ builderId: "b1", requestId: "r1", stripeSessionId: "sess_1", amount: 4900 });
    const replay = await grantLeadUnlock({
      builderId: "b1",
      requestId: "r1",
      stripeSessionId: "sess_1_retry",
      amount: 4900,
    });

    expect(replay).toBe(false);
    expect(store.created).toHaveLength(1); // never re-stamped
  });

  it("marks demo grants", async () => {
    await grantLeadUnlock({ builderId: "b1", requestId: "r1", stripeSessionId: "demo_r1", amount: 4900, demo: true });
    expect(store.created[0].data.demo).toBe(true);
  });
});

describe("isLeadUnlocked", () => {
  it("reflects whether a grant exists", async () => {
    expect(await isLeadUnlocked("b1", "r1")).toBe(false);
    await grantLeadUnlock({ builderId: "b1", requestId: "r1", stripeSessionId: "sess_1", amount: 4900 });
    expect(await isLeadUnlocked("b1", "r1")).toBe(true);
  });
});
