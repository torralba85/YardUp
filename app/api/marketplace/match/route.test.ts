import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

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
        get: async () => ({
          docs: mockBuilders.filter((b) => b.data().active === val),
        }),
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
  it("rejects requests missing parcelCity", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/parcelCity is required/i);
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
});
