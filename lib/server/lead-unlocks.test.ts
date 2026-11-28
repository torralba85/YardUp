import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
}));

vi.mock("./firebase-admin", () => {
  function snapshot(path: string) {
    return { exists: store.has(path), data: () => store.get(path) };
  }

  return {
    getAdminDb: () => ({
      collection: (name: string) => ({
        doc: (id: string) => {
          const path = `${name}/${id}`;
          return { path, get: async () => snapshot(path) };
        },
      }),
      async runTransaction(
        run: (tx: {
          get: (ref: { path: string }) => Promise<ReturnType<typeof snapshot>>;
          create: (ref: { path: string }, data: Record<string, unknown>) => void;
          set: (ref: { path: string }, data: Record<string, unknown>) => void;
          update: (ref: { path: string }, data: Record<string, unknown>) => void;
        }) => Promise<unknown>,
      ) {
        const write = ({ path }: { path: string }, data: Record<string, unknown>) => {
          store.set(path, { ...store.get(path), ...data });
        };
        return run({ get: async ({ path }) => snapshot(path), create: write, set: write, update: write });
      },
    }),
  };
});

import { grantLeadUnlock, isLeadUnlocked, unlockId } from "./lead-unlocks";

const payment = { builderId: "b1", requestId: "r1", stripeSessionId: "cs_test_one", amount: 4900 };

beforeEach(() => {
  store.clear();
  store.set("connectionRequests/r1", { status: "submitted", matchedBuilderIds: ["b1", "b2"] });
});

describe("lead unlock fulfillment", () => {
  it("uses the deterministic grant id and starts the first builder's window", async () => {
    expect(unlockId("b1", "r1")).toBe("b1_r1");
    await expect(grantLeadUnlock(payment)).resolves.toEqual({ status: "granted" });
    expect(store.get("leadUnlocks/b1_r1")).toMatchObject({
      ...payment, status: "granted", demo: false,
    });
    expect(store.get("connectionRequests/r1")?.firstUnlockedBy).toBe("b1");
  });

  it("distinguishes a replay from a second paid session for the same lead", async () => {
    await grantLeadUnlock(payment);
    await expect(grantLeadUnlock(payment)).resolves.toEqual({ status: "replay" });
    await expect(grantLeadUnlock({ ...payment, stripeSessionId: "cs_test_duplicate" }))
      .resolves.toEqual({ status: "blocked", reason: "already_unlocked" });
    expect(store.get("leadUnlocks/b1_r1")?.stripeSessionId).toBe("cs_test_one");
  });

  it("marks demo grants and reports access", async () => {
    await expect(isLeadUnlocked("b1", "r1")).resolves.toBe(false);
    await grantLeadUnlock({ ...payment, stripeSessionId: "demo_r1", demo: true });
    expect(store.get("leadUnlocks/b1_r1")?.demo).toBe(true);
    await expect(isLeadUnlocked("b1", "r1")).resolves.toBe(true);
  });

  it("permanently blocks the old paid session even after the exclusive window expires", async () => {
    await grantLeadUnlock(payment);
    const competitor = { ...payment, builderId: "b2", stripeSessionId: "cs_test_competitor" };
    await expect(grantLeadUnlock(competitor)).resolves.toMatchObject({
      status: "blocked", reason: "exclusive_window",
    });
    store.get("connectionRequests/r1")!.headStartUntil = "2020-01-01T00:00:00.000Z";
    await expect(grantLeadUnlock(competitor)).resolves.toMatchObject({ status: "blocked" });
    await expect(grantLeadUnlock({ ...competitor, stripeSessionId: "cs_test_new" }))
      .resolves.toEqual({ status: "granted" });
  });
});