import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const deleteUser = vi.fn(async () => undefined);
const { requireApiAuthMock } = vi.hoisted(() => ({
  requireApiAuthMock: vi.fn(async () => ({
    uid: "local-dev",
    email: "owner@example.com",
    emailVerified: true,
  })),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: requireApiAuthMock,
}));

type Ref = {
  kind: "scenario" | "contact" | "lead" | "feedback" | "checkout" | "scenarioLead";
  id: string;
};

const ops = {
  deleted: [] as Ref[],
  updatedLeads: [] as Array<{ id: string; data: Record<string, unknown> }>,
  builderDeleted: false,
  userDeleted: false,
  userSet: null as Record<string, unknown> | null,
  scenarioIds: [] as string[],
  feedbackIds: [] as string[],
  checkoutReservationIds: [] as string[],
  connectionRequests: [] as { id: string; ownerUid: string }[],
  studioScenarioLeads: [] as { id: string; email: string }[],
  failCommit: false,
};

function makeDb() {
  const userRef = {
    collection: (name: string) => ({
      get: async () => ({
        docs: name === "savedScenarios"
          ? ops.scenarioIds.map((id) => ({ ref: { kind: "scenario", id } as Ref }))
          : [],
      }),
    }),
    set: async (data: Record<string, unknown>) => {
      ops.userSet = data;
    },
    delete: async () => {
      ops.userDeleted = true;
    },
  };

  return {
    collection: (name: string) => {
      if (name === "connectionRequests") {
        return {
          where: (_field: string, _op: string, uid: string) => ({
            get: async () => ({
              docs: ops.connectionRequests
                .filter((request) => request.ownerUid === uid)
                .map((request) => ({
                  id: request.id,
                  ref: {
                    kind: "lead",
                    id: request.id,
                    collection: () => ({
                      doc: () => ({ kind: "contact", id: request.id } as Ref),
                    }),
                  },
                })),
            }),
          }),
        };
      }
      if (name === "activeCheckoutSessions") {
        return {
          where: () => ({
            get: async () => ({
              docs: ops.checkoutReservationIds.map((id) => ({
                ref: { kind: "checkout", id } as Ref,
              })),
            }),
          }),
        };
      }
      if (name === "feedback") {
        return {
          where: () => ({
            get: async () => ({
              docs: ops.feedbackIds.map((id) => ({
                ref: { kind: "feedback", id } as Ref,
              })),
            }),
          }),
        };
      }
      if (name === "studioScenarioLeads") {
        return {
          where: (_field: string, _op: string, email: string) => ({
            get: async () => ({
              docs: ops.studioScenarioLeads
                .filter((row) => row.email === email)
                .map((row) => ({
                  ref: { kind: "scenarioLead", id: row.id } as Ref,
                })),
            }),
          }),
        };
      }
      return {
        doc: () => (name === "builders"
          ? { delete: async () => { ops.builderDeleted = true; } }
          : userRef),
      };
    },
    batch: () => {
      const deletes: Ref[] = [];
      const updates: Array<{ ref: { id: string }; data: Record<string, unknown> }> = [];
      return {
        delete: (ref: Ref) => deletes.push(ref),
        update: (ref: { id: string }, data: Record<string, unknown>) => {
          updates.push({ ref, data });
        },
        commit: async () => {
          if (ops.failCommit) throw new Error("batch failed");
          ops.deleted.push(...deletes);
          ops.updatedLeads.push(
            ...updates.map(({ ref, data }) => ({ id: ref.id, data })),
          );
        },
      };
    },
  };
}

let throwOnDb = false;

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => {
    if (throwOnDb) throw new Error("firestore down");
    return makeDb();
  },
  getAdminApp: () => ({}),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ deleteUser }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    delete: () => "DELETE_FIELD",
    serverTimestamp: () => "SERVER_TIMESTAMP",
  },
}));

import { POST } from "./route";

function postRequest() {
  return new NextRequest("http://localhost/api/account/delete", { method: "POST" });
}

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    ops.deleted = [];
    ops.updatedLeads = [];
    ops.builderDeleted = false;
    ops.userDeleted = false;
    ops.userSet = null;
    ops.scenarioIds = [];
    ops.feedbackIds = [];
    ops.checkoutReservationIds = [];
    ops.connectionRequests = [];
    ops.studioScenarioLeads = [];
    ops.failCommit = false;
    throwOnDb = false;
    deleteUser.mockClear();
    requireApiAuthMock.mockReset().mockResolvedValue({
      uid: "local-dev",
      email: "owner@example.com",
      emailVerified: true,
    });
  });

  it("deletes saved scenarios, feedback, studioScenarioLeads, builder data, and the user tombstone", async () => {
    ops.scenarioIds = ["s1", "s2"];
    ops.feedbackIds = ["f1"];
    // Reservations hold checkout presentation data, so they go before Auth.
    ops.checkoutReservationIds = ["cr1"];
    ops.studioScenarioLeads = [
      { id: "sl-1", email: "owner@example.com" },
      { id: "sl-2", email: "other@example.com" },
    ];

    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(ops.deleted).toEqual([
      { kind: "scenario", id: "s1" },
      { kind: "scenario", id: "s2" },
      { kind: "checkout", id: "cr1" },
      { kind: "feedback", id: "f1" },
      { kind: "scenarioLead", id: "sl-1" },
    ]);
    expect(ops.builderDeleted).toBe(true);
    expect(ops.userSet).toEqual(
      expect.objectContaining({ deletionPending: true }),
    );
    expect(ops.userDeleted).toBe(true);
  });

  it("does not delete studioScenarioLeads when the account email is unverified", async () => {
    requireApiAuthMock.mockResolvedValue({
      uid: "local-dev",
      email: "owner@example.com",
      emailVerified: false,
    });
    ops.studioScenarioLeads = [{ id: "sl-1", email: "owner@example.com" }];

    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(ops.deleted).not.toContainEqual({ kind: "scenarioLead", id: "sl-1" });
  });

  it("does not delete the Firebase Auth identity for the dev/test stub uid", async () => {
    await POST(postRequest());
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("removes lead contacts and retires retained lead roots", async () => {
    ops.connectionRequests = [
      { id: "lead-1", ownerUid: "local-dev" },
      { id: "lead-2", ownerUid: "someone-else" },
    ];

    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(ops.deleted).toContainEqual({ kind: "contact", id: "lead-1" });
    expect(ops.updatedLeads).toEqual([
      expect.objectContaining({
        id: "lead-1",
        data: expect.objectContaining({ status: "withdrawn", ownerUid: "DELETE_FIELD" }),
      }),
    ]);
  });

  it("keeps the account retryable when Firestore cleanup fails", async () => {
    ops.connectionRequests = [{ id: "lead-1", ownerUid: "local-dev" }];
    ops.failCommit = true;

    const res = await POST(postRequest());
    expect(res.status).toBe(500);
    expect(ops.builderDeleted).toBe(false);
    expect(ops.userSet).toBeNull();
    expect(ops.userDeleted).toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("is safe to retry after account data is already gone", async () => {
    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
  });

  it("returns 500 when the teardown cannot start", async () => {
    throwOnDb = true;
    const res = await POST(postRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Account deletion failed. Please try again.",
    });
  });
});
