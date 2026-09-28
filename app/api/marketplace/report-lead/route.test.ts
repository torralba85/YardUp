import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

let authUid: string | null = "builder-1";
let isUnlocked = true;
let reportExists = false;
let builderExists = true;
let currentCredits = 2;
const transactionOps: { sets: Record<string, unknown>[]; updates: Record<string, unknown>[] } = {
  sets: [],
  updates: [],
};

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => {
    if (!authUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return { uid: authUid };
  },
}));

vi.mock("@/lib/server/lead-unlocks", () => ({
  isLeadUnlocked: async () => isUnlocked,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "SERVER_TIMESTAMP",
  },
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: (coll: string) => ({
      doc: (docId: string) => {
        if (coll === "leadReports") {
          return {
            id: docId,
            path: `leadReports/${docId}`,
          };
        }
        if (coll === "builders") {
          return {
            id: docId,
            path: `builders/${docId}`,
            collection: (sub: string) => ({
              doc: (subId: string) => ({
                id: subId,
                path: `builders/${docId}/${sub}/${subId}`,
              }),
            }),
          };
        }
        return { id: docId, path: `${coll}/${docId}` };
      },
    }),
    runTransaction: async (updateFunction: (transaction: unknown) => Promise<unknown>) => {
      const mockTx = {
        get: async (ref: { path: string }) => {
          if (ref.path.startsWith("leadReports/")) {
            return { exists: reportExists, data: () => ({}) };
          }
          if (ref.path.startsWith("builders/")) {
            return {
              exists: builderExists,
              data: () => ({ credits: currentCredits }),
            };
          }
          return { exists: false, data: () => ({}) };
        },
        set: (ref: { path: string }, data: Record<string, unknown>) => {
          transactionOps.sets.push({ path: ref.path, data });
        },
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          transactionOps.updates.push({ path: ref.path, data });
        },
      };
      return updateFunction(mockTx);
    },
  }),
}));

import { POST } from "./route";

function postRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/marketplace/report-lead", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/marketplace/report-lead", () => {
  beforeEach(() => {
    authUid = "builder-1";
    isUnlocked = true;
    reportExists = false;
    builderExists = true;
    currentCredits = 2;
    transactionOps.sets = [];
    transactionOps.updates = [];
  });

  it("rejects unauthenticated requests", async () => {
    authUid = null;
    const res = await POST(postRequest({ requestId: "req-1" }));
    expect(res.status).toBe(401);
  });

  it("rejects missing requestId", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Missing requestId/i);
  });

  it("rejects reporting a lead that is not unlocked", async () => {
    isUnlocked = false;
    const res = await POST(postRequest({ requestId: "req-1" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/Only unlocked leads can be reported/i);
  });

  it("rejects reporting an already-reported lead", async () => {
    reportExists = true;
    const res = await POST(postRequest({ requestId: "req-1" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already been reported/i);
  });

  it("successfully processes report and refunds 1 credit", async () => {
    const res = await POST(
      postRequest({
        requestId: "req-1",
        reason: "disconnected_phone",
        notes: "Number disconnected when called.",
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.newCredits).toBe(3);

    // Verify transaction operations
    expect(transactionOps.sets).toHaveLength(2);
    // 1. leadReports record
    expect(transactionOps.sets[0].path).toBe("leadReports/builder-1_req-1");
    expect((transactionOps.sets[0].data as Record<string, unknown>).reason).toBe("disconnected_phone");

    // 2. ledger record
    expect(transactionOps.sets[1].path).toBe("builders/builder-1/ledger/builder-1_req-1_credit");
    expect((transactionOps.sets[1].data as Record<string, unknown>).creditsChange).toBe(1);

    // 3. builder credits update
    expect(transactionOps.updates).toHaveLength(1);
    expect(transactionOps.updates[0].path).toBe("builders/builder-1");
    expect((transactionOps.updates[0].data as Record<string, unknown>).credits).toBe(3);
  });
});
