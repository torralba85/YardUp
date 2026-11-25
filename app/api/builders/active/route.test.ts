import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { resetRateLimitBuckets } from "@/lib/server/rate-limit";

const mocks = vi.hoisted(() => ({
  requireApiAuth: vi.fn(),
  get: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
}));

vi.mock("@/lib/server/api-auth", () => ({
  requireApiAuth: (...args: unknown[]) => mocks.requireApiAuth(...args),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  getAdminDb: () => ({ collection: mocks.collection }),
}));

import { GET } from "./route";

describe("GET /api/builders/active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
    mocks.requireApiAuth.mockResolvedValue({ uid: "homeowner-1" });
    mocks.collection.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ get: mocks.get });
  });

  it("returns only the redacted directory fields", async () => {
    mocks.get.mockResolvedValue({
      docs: [
        {
          id: "builder-1",
          data: () => ({
            companyName: "Cascade ADU Co",
            active: true,
            serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
            licenseNumber: "CCB-123",
            contactEmail: "private@example.com",
            phone: "555-0100",
            credits: 9,
          }),
        },
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/builders/active"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      builders: [
        {
          id: "builder-1",
          companyName: "Cascade ADU Co",
          active: true,
          licensed: true,
          serviceAreas: [{ city: "Seattle", state: "WA", key: "seattle-wa" }],
        },
      ],
    });
  });

  it("does not query Firestore when authentication fails", async () => {
    mocks.requireApiAuth.mockResolvedValue(
      NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    );

    const response = await GET(new NextRequest("http://localhost/api/builders/active"));

    expect(response.status).toBe(401);
    expect(mocks.collection).not.toHaveBeenCalled();
  });

  it("returns 500 JSON when Firestore fails", async () => {
    mocks.get.mockRejectedValueOnce(new Error("firestore unavailable"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(new NextRequest("http://localhost/api/builders/active"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Could not load builders. Please try again.",
    });
    spy.mockRestore();
  });
});
