import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { fetchParcelTerrain } from "@/lib/server/parcel-terrain";

vi.mock("@/lib/server/parcel-terrain", () => ({ fetchParcelTerrain: vi.fn() }));
vi.mock("@/lib/server/rate-limit", () => ({ checkRateLimit: vi.fn(() => null) }));

const boundary = { type: "Polygon", coordinates: [[[-122.001, 37], [-122, 37], [-122, 37.001], [-122.001, 37.001], [-122.001, 37]]] };
function request(body: string) {
  return new NextRequest("http://localhost/api/parcel-terrain", { method: "POST", headers: { "Content-Type": "application/json" }, body });
}
beforeEach(() => vi.clearAllMocks());

describe("terrain endpoint", () => {
  it.each(["{bad json", "null", "{}", JSON.stringify({ boundary: { ...boundary, coordinates: [] } })])("rejects invalid input before requesting a provider", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchParcelTerrain).not.toHaveBeenCalled();
  });

  it("bounds body size before querying USGS", async () => {
    expect((await POST(request(" ".repeat(50_001)))).status).toBe(413);
    expect(fetchParcelTerrain).not.toHaveBeenCalled();
  });

  it("returns a safe unavailable result on provider errors", async () => {
    vi.mocked(fetchParcelTerrain).mockRejectedValueOnce(new Error("Upstream failure with private request details"));
    const response = await POST(request(JSON.stringify({ boundary })));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private request");
  });
});
