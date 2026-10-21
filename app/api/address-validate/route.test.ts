import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { GMP_SOLUTION_ATTRIBUTION_ID, type AddressValidationResult } from "@/lib/address-validation";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/address-validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-server-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/address-validate", () => {
  it("validates an address via Google Places API (New) searchText with mandatory solution attribution", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        places: [
          {
            id: "ChIJ-test-123",
            formattedAddress: "456 Pine St, Denver, CO 80203, USA",
            location: { latitude: 39.7392, longitude: -104.9903 },
            types: ["street_address"],
            addressComponents: [
              { shortText: "456", longText: "456", types: ["street_number"] },
              { shortText: "Pine St", longText: "Pine Street", types: ["route"] },
              { shortText: "Denver", longText: "Denver", types: ["locality"] },
              { shortText: "CO", longText: "Colorado", types: ["administrative_area_level_1"] },
              { shortText: "80203", longText: "80203", types: ["postal_code"] },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(makeRequest({ address: "456 Pine St, Denver, CO" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as AddressValidationResult;
    expect(data.deliverable).toBe(true);
    expect(data.status).toBe("deliverable");
    expect(data.formattedAddress).toBe("456 Pine St, Denver, CO 80203, USA");
    expect(data.components.postalCode).toBe("80203");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("test-server-key");
    expect(headers["X-Goog-Maps-Solution-ID"]).toBe(GMP_SOLUTION_ATTRIBUTION_ID);
  });

  it("validates a Place ID via Google Places Details (New) when placeId is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "ChIJ-place-id-999",
        formattedAddress: "789 Oak Ave, Austin, TX 78701, USA",
        location: { latitude: 30.2672, longitude: -97.7431 },
        types: ["premise"],
        addressComponents: [
          { shortText: "789", longText: "789", types: ["street_number"] },
          { shortText: "Oak Ave", longText: "Oak Avenue", types: ["route"] },
          { shortText: "Austin", longText: "Austin", types: ["locality"] },
          { shortText: "TX", longText: "Texas", types: ["administrative_area_level_1"] },
          { shortText: "78701", longText: "78701", types: ["postal_code"] },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeRequest({ placeId: "ChIJ-place-id-999", address: "789 Oak Ave, Austin, TX" }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as AddressValidationResult;
    expect(data.deliverable).toBe(true);
    expect(data.placeId).toBe("ChIJ-place-id-999");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://places.googleapis.com/v1/places/ChIJ-place-id-999");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Maps-Solution-ID"]).toBe(GMP_SOLUTION_ATTRIBUTION_ID);
  });

  it("returns 400 when neither address nor placeId is provided", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("falls back to client readiness evaluation when no server key is configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(makeRequest({ address: "456 Pine St, Denver, CO 80203" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as AddressValidationResult;
    expect(data.source).toBe("client_heuristic");
    expect(data.deliverable).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
