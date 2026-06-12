import { describe, expect, it, vi, beforeEach } from "vitest";
import { geocodeAddress, GeocodeError } from "./geocode-api";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("geocodeAddress", () => {
  it("returns the parsed result on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          lat: 47.66,
          lng: -122.31,
          formattedAddress: "123 Oak St, Seattle, WA",
        }),
      }),
    );
    const result = await geocodeAddress("123 Oak St, Seattle");
    expect(result.lat).toBe(47.66);
    expect(result.formattedAddress).toContain("Seattle");
  });

  it("encodes the query and attaches the bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ lat: 0, lng: 0, formattedAddress: "x" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await geocodeAddress("1 A&B St, Town", "tok-123");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("q=1%20A%26B%20St%2C%20Town");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-123",
    );
  });

  it("throws a friendly GeocodeError on 404 (no match)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    await expect(geocodeAddress("nowhere")).rejects.toThrowError(GeocodeError);
    await expect(geocodeAddress("nowhere")).rejects.toMatchObject({
      userMessage: expect.stringMatching(/couldn't find/i),
    });
  });

  it("throws a GeocodeError on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(geocodeAddress("anywhere")).rejects.toThrowError(GeocodeError);
  });
});
