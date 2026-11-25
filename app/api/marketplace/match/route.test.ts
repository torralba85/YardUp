import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const mocks = vi.hoisted(() => ({
  authUid: "user-1" as string | null,
  throwOnDb: false,
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: async () => {
    if (!mocks.authUid) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return { uid: mocks.authUid };
  },
}));

const mockBuilders = [
  {
    id: "builder-seattle",
    data: () => ({
      active: true,
      serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    }),
  },
  {
    id: "builder-portland",
    data: () => ({
      active: true,
      serviceAreas: [{ city: "Portland", state: "OR", key: "portland-or" }],
    }),
  },
  {
    id: "builder-inactive",
    data: () => ({
      active: false,
      serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
    }),
  },
];

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({
    collection: () => ({
      where: (field: string, op: string, val: unknown) => ({
        get: async () => {
          if (mocks.throwOnDb) throw new Error("secret internal firestore error");
          return {
            docs: mockBuilders.filter((b) => b.data().active === val),
          };
        },
      }),
    }),
  }),
}));

import { POST } from "./route";

function postRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/marketplace/match", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/marketplace/match", () => {
  beforeEach(() => {
    mocks.authUid = "user-1";
    mocks.throwOnDb = false;
    resetRateLimitBuckets();
  });

  it("rejects unauthenticated requests", async () => {
    mocks.authUid = null;
    const res = await POST(postRequest({ parcelCity: "Seattle, WA 98107" }));
    expect(res.status).toBe(401);
  });

  it("rejects requests missing parcelCity", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/parcelCity is required/i);
  });

  it("rejects oversized or non-string location fields", async () => {
    expect((await POST(postRequest({ parcelCity: "x".repeat(121) }))).status).toBe(400);
    expect((await POST(postRequest({ parcelCity: "Seattle", parcelState: 42 }))).status).toBe(400);
    expect((await POST(postRequest({ parcelCity: "Seattle", parcelCounty: "x".repeat(121) }))).status).toBe(400);
  });

  it("matches active builders serving the parcel city and state", async () => {
    const res = await POST(postRequest({ parcelCity: "Seattle, WA 98107" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matchedBuilderIds).toEqual(["builder-seattle"]);
    expect(data.count).toBe(1);
  });

  it("returns empty matches when no builder serves the location", async () => {
    const res = await POST(postRequest({ parcelCity: "Austin, TX 78701" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matchedBuilderIds).toEqual([]);
    expect(data.count).toBe(0);
  });

  it("does not leak internal errors on 500", async () => {
    mocks.throwOnDb = true;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(postRequest({ parcelCity: "Seattle, WA 98107" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to match builders.");
    expect(data.error).not.toContain("secret");
    spy.mockRestore();
  });
});
