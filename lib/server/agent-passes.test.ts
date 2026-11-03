import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  writes: [] as Array<{ op: string; path: string; data: Record<string, unknown> }>,
}));

vi.mock("firebase-admin/firestore", () => {
  class Timestamp {
    constructor(private readonly ms: number) {}
    static fromMillis(ms: number) { return new Timestamp(ms); }
    toMillis() { return this.ms; }
  }
  return {
    Timestamp,
    FieldValue: {
      serverTimestamp: () => "SERVER_TS",
      increment: (n: number) => ({ increment: n }),
    },
  };
});

function ref(path: string) {
  return {
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  };
}

vi.mock("./firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      get: async (r: { path: string }) => ({
        exists: store.docs.has(r.path),
        data: () => store.docs.get(r.path),
      }),
      create: (r: { path: string }, data: Record<string, unknown>) => store.writes.push({ op: "create", path: r.path, data }),
      update: (r: { path: string }, data: Record<string, unknown>) => store.writes.push({ op: "update", path: r.path, data }),
      set: (r: { path: string }, data: Record<string, unknown>) => store.writes.push({ op: "set", path: r.path, data }),
    }),
  }),
}));

import { Timestamp } from "firebase-admin/firestore";
import { redeemAgentPassGrant } from "./agent-passes";

const NOW = new Date("2026-11-20T12:00:00Z");
const LISTING = "1-elm-st-san-diego";

function seedPass(overrides: Record<string, unknown> = {}) {
  store.docs.set("agentPasses/SMITH-ELM", {
    certKey: LISTING,
    status: "active",
    maxRedemptions: 10,
    redemptions: 3,
    expiresAt: Timestamp.fromMillis(NOW.getTime() + 86_400_000),
    ...overrides,
  });
}

function redeem() {
  return redeemAgentPassGrant({
    code: "SMITH-ELM",
    uid: "buyer-1",
    certKey: LISTING,
    address: "1 Elm St",
    city: "San Diego",
    now: NOW,
  });
}

beforeEach(() => {
  store.docs = new Map();
  store.writes = [];
});

describe("redeemAgentPassGrant", () => {
  it("writes a $0 agent-pass grant, counts the redemption and records the account", async () => {
    seedPass();
    await expect(redeem()).resolves.toEqual({ kind: "granted" });

    const grant = store.writes.find((w) => w.path === "certificatePurchases/buyer-1_1-elm-st-san-diego");
    expect(grant?.op).toBe("create");
    expect(grant?.data).toMatchObject({
      uid: "buyer-1",
      certKey: LISTING,
      amount: 0,
      demo: false,
      status: "granted",
      stripeSessionId: "pass:SMITH-ELM",
      source: "agent_pass",
      passCode: "SMITH-ELM",
      address: "1 Elm St",
      city: "San Diego",
    });
    expect(store.writes).toContainEqual({
      op: "update",
      path: "agentPasses/SMITH-ELM",
      data: { redemptions: { increment: 1 }, lastRedeemedAt: "SERVER_TS" },
    });
    expect(store.writes).toContainEqual({
      op: "set",
      path: "agentPasses/SMITH-ELM/redemptions/buyer-1",
      data: { uid: "buyer-1", certKey: LISTING, createdAt: "SERVER_TS" },
    });
  });

  it("does not spend a redemption when the account already holds the certificate", async () => {
    seedPass();
    store.docs.set("certificatePurchases/buyer-1_1-elm-st-san-diego", { amount: 2900 });
    await expect(redeem()).resolves.toEqual({ kind: "already_granted" });
    expect(store.writes).toEqual([]);
  });

  it.each([
    ["a missing pass", null, "not_found"],
    ["a revoked pass", { status: "revoked" }, "not_found"],
    ["another listing", { certKey: "9-oak-ave-san-jose" }, "wrong_property"],
    ["an expired pass", { expiresAt: Timestamp.fromMillis(NOW.getTime()) }, "expired"],
    ["a pass without an expiry", { expiresAt: undefined }, "expired"],
    ["a used-up pass", { redemptions: 10 }, "used_up"],
  ])("rejects %s without writing", async (_label, overrides, kind) => {
    if (overrides) seedPass(overrides);
    await expect(redeem()).resolves.toEqual({ kind });
    expect(store.writes).toEqual([]);
  });
});
