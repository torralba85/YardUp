import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Minimal fake Firestore backing the export route's read surface. Docs are
// plain objects; `where` filters on the queried field.
const state = {
  users: {} as Record<string, Record<string, unknown>>,
  savedScenarios: [] as Array<{ id: string; data: Record<string, unknown> }>,
  builders: {} as Record<string, Record<string, unknown>>,
  ledger: [] as Array<{ id: string; data: Record<string, unknown> }>,
  connectionRequests: [] as Array<{ id: string; data: Record<string, unknown> }>,
  // Gated per-lead contact PII, keyed by lead id.
  contacts: {} as Record<string, Record<string, unknown>>,
  certificatePurchases: [] as Array<{ id: string; data: Record<string, unknown> }>,
  leadUnlocks: [] as Array<{ id: string; data: Record<string, unknown> }>,
  feedback: [] as Array<{ id: string; data: Record<string, unknown> }>,
  throwOnDb: false,
};

function docsOf(rows: Array<{ id: string; data: Record<string, unknown> }>) {
  return rows.map((row) => ({ id: row.id, data: () => row.data }));
}

function makeDb() {
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists:
            name === "users" ? id in state.users : id in state.builders,
          data: () =>
            name === "users" ? state.users[id] : state.builders[id],
        }),
        collection: (sub: string) => ({
          get: async () => ({
            docs: docsOf(sub === "savedScenarios" ? state.savedScenarios : state.ledger),
          }),
        }),
      }),
      where: (field: string, _op: string, value: string) => ({
        get: async () => {
          if (name === "connectionRequests") {
            const rows = state.connectionRequests.filter(
              (row) => row.data[field] === value,
            );
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
          }
          const rows =
            name === "certificatePurchases"
              ? state.certificatePurchases
              : name === "leadUnlocks"
                ? state.leadUnlocks
                : state.feedback;
          return { docs: docsOf(rows.filter((row) => row.data[field] === value)) };
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
    state.throwOnDb = false;
  });

  it("exports only the authenticated user's records in a portable shape", async () => {
    // requireApiAuth resolves uid "local-dev" in test mode.
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
      { id: "lead-2", data: { ownerUid: "someone-else", preview: {}, status: "submitted" } },
    ];
    // The owner's own gated contact PII (only stored in private/contact).
    state.contacts["lead-1"] = {
      ownerContact: { name: "Alma Reyes", phone: "206-555-0101" },
      streetAddress: "123 Maple St",
    };
    state.certificatePurchases = [
      { id: "cert-1", data: { uid: "local-dev", amount: 4900 } },
      { id: "cert-2", data: { uid: "someone-else", amount: 4900 } },
    ];
    state.feedback = [
      { id: "fb-1", data: { uid: "local-dev", category: "bug", message: "Map tile is blank." } },
      { id: "fb-2", data: { uid: "someone-else", category: "idea", message: "Not mine." } },
    ];

    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain(
      "lotfoundry-account-export.json",
    );

    const body = await res.json();
    expect(body.profile).toEqual({ email: "owner@example.com", role: "user" });
    expect(body.savedScenarios).toEqual([{ id: "s1", name: "Backyard studio" }]);
    // The owner's own lead includes its gated contact PII; the lead owned by
    // someone else is excluded entirely.
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
      { id: "fb-1", uid: "local-dev", category: "bug", message: "Map tile is blank." },
    ]);
    expect(body.purchaseLedger).toEqual([
      { type: "certificate", id: "cert-1", uid: "local-dev", amount: 4900 },
    ]);
    expect(typeof body.exportedAt).toBe("string");
  });

  it("serializes Firestore timestamps as ISO strings", async () => {
    const fakeTimestamp = { toDate: () => new Date("2026-07-01T00:00:00.000Z") };
    state.users["local-dev"] = { email: "owner@example.com", createdAt: fakeTimestamp };

    const res = await GET(getRequest());
    const body = await res.json();
    expect(body.profile.createdAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("returns 500 when the export fails", async () => {
    state.throwOnDb = true;
    const res = await GET(getRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Export failed. Please try again." });
  });
});
