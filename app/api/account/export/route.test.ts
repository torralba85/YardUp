import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

type Row = { id: string; data: Record<string, unknown> };

const state = {
  users: {} as Record<string, Record<string, unknown>>,
  savedScenarios: [] as Row[],
  builders: {} as Record<string, Record<string, unknown>>,
  ledger: [] as Row[],
  connectionRequests: [] as Row[],
  contacts: {} as Record<string, Record<string, unknown>>,
  certificatePurchases: [] as Row[],
  leadUnlocks: [] as Row[],
  feedback: [] as Row[],
  purchaseGrants: [] as Row[],
  certificateCredits: {} as Record<string, Record<string, unknown>>,
  throwOnDb: false,
};

function docsOf(rows: Row[]) {
  return rows.map((row) => ({ id: row.id, data: () => row.data }));
}

function rowsForCollection(name: string): Row[] {
  if (name === "connectionRequests") return state.connectionRequests;
  if (name === "certificatePurchases") return state.certificatePurchases;
  if (name === "leadUnlocks") return state.leadUnlocks;
  if (name === "feedback") return state.feedback;
  if (name === "purchaseGrants") return state.purchaseGrants;
  return [];
}

function makeDb() {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data =
            name === "users"
              ? state.users[id]
              : name === "builders"
                ? state.builders[id]
                : name === "certificateCredits"
                  ? state.certificateCredits[id]
                  : undefined;
          return { exists: data != null, data: () => data };
        },
        collection: (sub: string) => ({
          get: async () => ({
            docs: docsOf(sub === "savedScenarios" ? state.savedScenarios : state.ledger),
          }),
        }),
      }),
      where: (field: string, _op: string, value: string) => ({
        get: async () => {
          const rows = rowsForCollection(name).filter(
            (row) => row.data[field] === value,
          );
          if (name !== "connectionRequests") {
            return { docs: docsOf(rows) };
          }
          return {
            docs: rows.map((row) => ({
              id: row.id,
              data: () => row.data,
              ref: {
                collection: (sub: string) => ({
                  doc: (docId: string) => ({
                    get: async () => {
                      const contact = state.contacts[row.id];
                      const present =
                        sub === "private" &&
                        docId === "contact" &&
                        contact != null;
                      return { exists: present, data: () => contact };
                    },
                  }),
                }),
              },
            })),
          };
        },
      }),
    }),
  };
}

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => {
    if (state.throwOnDb) throw new Error("firestore down");
    return makeDb();
  },
  getAdminApp: () => ({}),
}));

import { GET } from "./route";

function getRequest() {
  return new NextRequest("http://localhost/api/account/export");
}

describe("GET /api/account/export", () => {
  beforeEach(() => {
    state.users = {};
    state.savedScenarios = [];
    state.builders = {};
    state.ledger = [];
    state.connectionRequests = [];
    state.contacts = {};
    state.certificatePurchases = [];
    state.leadUnlocks = [];
    state.feedback = [];
    state.purchaseGrants = [];
    state.certificateCredits = {};
    state.throwOnDb = false;
  });

  it("exports only the authenticated user's complete records", async () => {
    state.users["local-dev"] = { email: "owner@example.com", role: "user" };
    state.savedScenarios = [{ id: "s1", data: { name: "Backyard studio" } }];
    state.connectionRequests = [
      {
        id: "lead-1",
        data: {
          ownerUid: "local-dev",
          preview: { cityBand: "Seattle" },
          status: "submitted",
          matchedBuilderIds: ["b-1"],
        },
      },
      {
        id: "lead-2",
        data: { ownerUid: "someone-else", preview: {}, status: "submitted" },
      },
    ];
    state.contacts["lead-1"] = {
      ownerContact: { name: "Alma Reyes", phone: "206-555-0101" },
      streetAddress: "123 Maple St",
    };
    state.certificatePurchases = [
      { id: "cert-1", data: { uid: "local-dev", amount: 4900 } },
      { id: "cert-2", data: { uid: "someone-else", amount: 4900 } },
    ];
    state.feedback = [
      { id: "feedback-1", data: { uid: "local-dev", message: "Please call me" } },
      { id: "feedback-2", data: { uid: "someone-else", message: "Other" } },
    ];
    state.purchaseGrants = [
      {
        id: "google-play:tx-1",
        data: { uid: "local-dev", platform: "google-play", credits: 5 },
      },
    ];
    state.certificateCredits["local-dev"] = { uid: "local-dev", balance: 2 };

    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain(
      "lotfoundry-account-export.json",
    );

    const body = await res.json();
    expect(body.profile).toEqual({ email: "owner@example.com", role: "user" });
    expect(body.savedScenarios).toEqual([{ id: "s1", name: "Backyard studio" }]);
    expect(body.connectionRequests).toEqual([
      {
        id: "lead-1",
        preview: { cityBand: "Seattle" },
        status: "submitted",
        contact: {
          ownerContact: { name: "Alma Reyes", phone: "206-555-0101" },
          streetAddress: "123 Maple St",
        },
      },
    ]);
    expect(body.feedback).toEqual([
      { id: "feedback-1", uid: "local-dev", message: "Please call me" },
    ]);
    expect(body.certificateCreditBalance).toEqual({ uid: "local-dev", balance: 2 });
    expect(body.purchaseLedger).toEqual([
      { type: "certificate", id: "cert-1", uid: "local-dev", amount: 4900 },
      {
        type: "store-grant",
        id: "google-play:tx-1",
        uid: "local-dev",
        platform: "google-play",
        credits: 5,
      },
    ]);
    expect(typeof body.exportedAt).toBe("string");
  });

  it("serializes Firestore timestamps and native Dates as ISO strings", async () => {
    const fakeTimestamp = { toDate: () => new Date("2026-07-01T00:00:00.000Z") };
    state.users["local-dev"] = {
      email: "owner@example.com",
      createdAt: fakeTimestamp,
      lastSeenAt: new Date("2026-07-02T00:00:00.000Z"),
    };

    const res = await GET(getRequest());
    const body = await res.json();
    expect(body.profile.createdAt).toBe("2026-07-01T00:00:00.000Z");
    expect(body.profile.lastSeenAt).toBe("2026-07-02T00:00:00.000Z");
  });

  it("returns 500 when the export fails", async () => {
    state.throwOnDb = true;
    const res = await GET(getRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Export failed. Please try again." });
  });
});
