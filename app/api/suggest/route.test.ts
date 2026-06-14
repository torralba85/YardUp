import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import type { AddressSuggestions } from "./route";

function makeRequest(q?: string): NextRequest {
  const url = new URL("http://localhost/api/suggest");
  if (q !== undefined) url.searchParams.set("q", q);
  return new NextRequest(url);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/suggest", () => {
  it("returns Google Places predictions for a partial address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          predictions: [
            { description: "123 Main St, San Jose, CA, USA" },
            { description: "123 Main St, Santa Monica, CA, USA" },
          ],
        }),
      }),
    );

    const res = await GET(makeRequest("123 Main"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as AddressSuggestions;
    expect(data.suggestions).toEqual([
      "123 Main St, San Jose, CA, USA",
      "123 Main St, Santa Monica, CA, USA",
    ]);
  });

  it("caps the number of suggestions at 5", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          predictions: Array.from({ length: 8 }, (_, i) => ({
            description: `${i} Main St, Denver, CO, USA`,
          })),
        }),
      }),
    );

    const res = await GET(makeRequest("Main St"));
    const data = (await res.json()) as AddressSuggestions;
    expect(data.suggestions).toHaveLength(5);
  });

  it("returns an empty list for queries shorter than 3 characters", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(makeRequest("12"));
    const data = (await res.json()) as AddressSuggestions;
    expect(data.suggestions).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns an empty list when no Google key is configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(makeRequest("123 Main St"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as AddressSuggestions;
    expect(data.suggestions).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns an empty list (not an error) when the provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network error")),
    );

    const res = await GET(makeRequest("123 Main St"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as AddressSuggestions;
    expect(data.suggestions).toEqual([]);
  });
});
