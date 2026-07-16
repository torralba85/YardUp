import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const deleteUser = vi.fn(async () => undefined);

// Track the fake Firestore operations the route performs.
const ops = {
  batchDeletes: [] as unknown[],
  batchCommits: 0,
  builderDeleted: false,
  userDeleted: false,
  scenarioDocs: [] as { ref: unknown }[],
  connectionRequests: [] as { id: string; ownerUid: string }[],
  deletedPrivateContacts: [] as string[],
  deletedLeadRoots: [] as string[],
  failContactId: null as string | null,
  feedbackDocs: [] as { id: string; uid: string }[],
};

function makeDb() {
  const userRef = {
    collection: (name: string) => ({
      get: async () => ({ docs: name === "savedScenarios" ? ops.scenarioDocs : [] }),
    }),
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
                  ref: {
                    collection: () => ({
                      doc: () => ({
                        delete: async () => {
                          if (ops.failContactId === request.id) {
                            throw new Error("contact delete failed");
                          }
                          ops.deletedPrivateContacts.push(request.id);
                        },
                      }),
                    }),
                    delete: async () => {
                      ops.deletedLeadRoots.push(request.id);
                    },
                  },
                })),
            }),
          }),
        };
      }
      if (name === "feedback") {
        return {
          where: (_field: string, _op: string, uid: string) => ({
            get: async () => ({
              docs: ops.feedbackDocs
                .filter((entry) => entry.uid === uid)
                .map((entry) => ({ ref: `feedback:${entry.id}` })),
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
    batch: () => ({
      delete: (ref: unknown) => ops.batchDeletes.push(ref),
      commit: async () => { ops.batchCommits += 1; },
    }),
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

import { POST } from "./route";

function postRequest() {
  return new NextRequest("http://localhost/api/account/delete", { method: "POST" });
}

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    ops.batchDeletes = [];
    ops.batchCommits = 0;
    ops.builderDeleted = false;
    ops.userDeleted = false;
    ops.scenarioDocs = [];
    ops.connectionRequests = [];
    ops.deletedPrivateContacts = [];
    ops.deletedLeadRoots = [];
    ops.failContactId = null;
    ops.feedbackDocs = [];
    throwOnDb = false;
    deleteUser.mockClear();
  });

  it("deletes saved scenarios, the builder profile, and the user profile", async () => {
    ops.scenarioDocs = [{ ref: "s1" }, { ref: "s2" }];

    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });

    expect(ops.batchDeletes).toEqual(["s1", "s2"]);
    expect(ops.batchCommits).toBe(1);
    expect(ops.builderDeleted).toBe(true);
    expect(ops.userDeleted).toBe(true);
  });

  it("does not delete the Firebase Auth identity for the dev/test stub uid", async () => {
    // In test mode requireApiAuth returns uid "local-dev", which is not a real
    // Firebase user, so the Auth deletion must be skipped.
    await POST(postRequest());
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("removes lead contact PII while retaining the redacted lead roots", async () => {
    // requireApiAuth returns uid "local-dev" in test mode; only requests owned
    // by that uid get their private contact payload torn down.
    ops.connectionRequests = [
      { id: "lead-1", ownerUid: "local-dev" },
      { id: "lead-2", ownerUid: "someone-else" },
    ];

    const res = await POST(postRequest());
    expect(res.status).toBe(200);

    expect(ops.deletedPrivateContacts).toEqual(["lead-1"]);
    // The redacted root is a shared business record a builder may have paid to
    // unlock — it must be retained.
    expect(ops.deletedLeadRoots).toEqual([]);
  });

  it("attempts every contact and preserves the profile when one delete fails", async () => {
    // A transient failure on one lead's contact must not stop the others from
    // being attempted, and must abort before the irreversible profile/identity
    // removal so a retry can finish cleanly.
    ops.connectionRequests = [
      { id: "lead-1", ownerUid: "local-dev" },
      { id: "lead-2", ownerUid: "local-dev" },
    ];
    ops.failContactId = "lead-2";

    const res = await POST(postRequest());
    expect(res.status).toBe(500);

    // The healthy contact was still torn down (loop was not stopped at the
    // failure)...
    expect(ops.deletedPrivateContacts).toEqual(["lead-1"]);
    // ...and the profile/identity remain for a clean retry.
    expect(ops.builderDeleted).toBe(false);
    expect(ops.userDeleted).toBe(false);
  });

  it("deletes feedback the user submitted, leaving other users' feedback", async () => {
    ops.feedbackDocs = [
      { id: "fb-1", uid: "local-dev" },
      { id: "fb-2", uid: "someone-else" },
    ];

    const res = await POST(postRequest());
    expect(res.status).toBe(200);

    expect(ops.batchDeletes).toContain("feedback:fb-1");
    expect(ops.batchDeletes).not.toContain("feedback:fb-2");
  });

  it("is safe to retry after account data is already gone", async () => {
    // Everything already deleted: no scenarios, no leads, and every direct
    // delete resolves as a no-op. The route must still report success.
    const res = await POST(postRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
  });

  it("returns 500 when the teardown fails", async () => {
    throwOnDb = true;
    const res = await POST(postRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Account deletion failed. Please try again.",
    });
  });
});
