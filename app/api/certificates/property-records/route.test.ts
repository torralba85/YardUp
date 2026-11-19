// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ref: vi.fn(),
  records: vi.fn(),
}));
vi.mock("@/lib/server/api-auth", () => ({ requireApiAuth: mocks.auth }));
vi.mock("@/lib/server/certificate-purchases", () => ({
  certificateGrantRef: mocks.ref,
}));
vi.mock("@/lib/server/realie", () => ({ propertyRecords: mocks.records }));

const grant = {
  uid: "buyer",
  certKey: "100-main-st-austin-tx",
  stripeSessionId: "cs_paid",
  amount: 2900,
  status: "granted",
};
function grantData(data: unknown) {
  mocks.ref.mockReturnValue({ get: async () => ({ data: () => data }) });
}
function request(mode: string) {
  return POST(
    new NextRequest("https://example.test/api/certificates/property-records", {
      method: "POST",
      body: JSON.stringify({
        mode,
        address: "100 Main St",
        city: "Austin, TX",
      }),
    }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ uid: "buyer" });
  grantData(grant);
  mocks.records.mockResolvedValue([]);
});

describe.each(["history", "comparables"])("%s access", (mode) => {
  it("rejects unauthenticated callers before reading a grant", async () => {
    mocks.auth.mockResolvedValue(NextResponse.json({}, { status: 401 }));
    expect((await request(mode)).status).toBe(401);
    expect(mocks.ref).not.toHaveBeenCalled();
    expect(mocks.records).not.toHaveBeenCalled();
  });
  it.each([
    undefined,
    { ...grant, demo: true },
    { ...grant, source: "agent_pass", amount: 0 },
    { ...grant, uid: "someone-else" },
    { ...grant, status: "revoked" },
  ])("rejects unpaid access", async (data) => {
    grantData(data);
    expect((await request(mode)).status).toBe(403);
    expect(mocks.records).not.toHaveBeenCalled();
  });
  it.each([
    grant,
    { ...grant, stripeSessionId: "store:google-play:receipt", amount: 0 },
  ])("uses the purchased lot", async (data) => {
    grantData(data);
    const response = await request(mode);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.ref).toHaveBeenCalledWith("buyer", grant.certKey);
    expect(mocks.records).toHaveBeenCalledWith(
      "100 Main St",
      "Austin, TX",
      "TX",
      mode === "comparables",
    );
  });
});
