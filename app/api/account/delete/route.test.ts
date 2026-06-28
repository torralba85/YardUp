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
    collection: (name: string) => ({
      doc: () => (name === "builders"
        ? { delete: async () => { ops.builderDeleted = true; } }
        : userRef),
    }),
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

  it("returns 500 when the teardown fails", async () => {
    throwOnDb = true;
    const res = await POST(postRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Account deletion failed. Please try again.",
    });
  });
});
