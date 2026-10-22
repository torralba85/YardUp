// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canLookUpAttomAddress, fetchAttomAddress } from "./attom";
import { attomResponse } from "@/test/fixtures/attom";

const QUERY = "123 Oak Street, Seattle, WA 98105";

beforeEach(() => vi.stubEnv("ATTOM_API_KEY", "attom-test-key"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("ATTOM address lookup", () => {
  it("sends a header-only credential and returns allowlisted address evidence", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(attomResponse()));
    vi.stubGlobal("fetch", fetchMock);
    const lookup = await fetchAttomAddress(QUERY);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/basicprofile");
    expect(parsed.searchParams.get("address1")).toBe("123 Oak Street");
    expect(parsed.searchParams.get("address2")).toBe("SEATTLE, WA 98105");
    expect(url).not.toContain("attom-test-key");
    expect(init).toMatchObject({ headers: { apikey: "attom-test-key", Accept: "application/json" }, cache: "no-store", redirect: "error" });
    expect(lookup).toMatchObject({ attempt: { outcome: "matched" }, result: {
      lat: 47.661, lng: -122.313, formattedAddress: "123 OAK ST, SEATTLE, WA 98105",
      match: { provider: "attom", providerId: "123456", precision: "street", evidence: { confidence: "low" } },
    } });
    expect(JSON.stringify(lookup)).not.toMatch(/DO NOT RETURN OWNER|assessment|test-apn|attom-test-key/);
  });

  it("does not call the provider without a key", async () => {
    vi.stubEnv("ATTOM_API_KEY", "");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("unsupported");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["Seattle, WA", "123 Oak St", "10 Old Court Road Somewhere, CA 92101", "123 Oak St, Seattle"])("skips incomplete or ambiguous input: %s", async (query) => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(canLookUpAttomAddress(query)).toBe(false);
    expect((await fetchAttomAddress(query)).result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { line1: "124 OAK ST" }, { line1: "123 PINE ST" }, { line1: "123 N OAK ST" },
    { locality: "TACOMA" }, { countrySubd: "OR" }, { postal1: "98115" }, { country: "CA" },
  ])("rejects contradictory provider components: %j", async (address) => {
    const json = attomResponse(); Object.assign(json.property[0].address, address);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    expect((await fetchAttomAddress(QUERY)).result).toBeNull();
  });

  it("accepts normalization, ZIP+4 and an address without commas", async () => {
    const json = attomResponse(); json.property[0].address.postal1 = "98105-1234";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    expect((await fetchAttomAddress("123 Oak Street Seattle WA 98105")).result?.match.components.zip).toBe("98105");
  });

  it.each([null, {}, { status: { code: 0 } }, { status: { code: 0 }, property: [null] },
    { status: { code: -5 }, property: [] },
    { ...attomResponse(), property: [...attomResponse().property, ...attomResponse().property] },
    { ...attomResponse(), status: { code: 0, total: 2 } },
  ])("rejects malformed or ambiguous results", async (json) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("invalid-response");
  });

  it.each(["", "NaN", "91", null, true])("rejects invalid latitude %s", async (latitude) => {
    const json = attomResponse(); Object.assign(json.property[0].location, { latitude });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("invalid-response");
  });

  it.each([[401, "auth-failed"], [403, "auth-failed"], [404, "no-match"], [429, "provider-error"], [500, "provider-error"]])("degrades on HTTP %s", async (status, outcome) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: Number(status) })));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe(outcome);
  });

  it("records no match for empty property results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: { code: 0, total: 0 }, property: [] })));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("no-match");
  });

  it.each([[200, 400], [400, 400], [200, 1], [400, 1]])("recognizes HTTP %s with no-match body code %s", async (httpStatus, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: { code, total: 0 }, property: [] }, { status: httpStatus })));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("no-match");
  });

  it("rejects ATTOM's placeholder ID for addresses absent from property records", async () => {
    const json = attomResponse(); json.property[0].identifier.attomId = 999999999;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("no-match");
  });

  it.each(["Zip5", "PostalCode", "City", "County", "State", "Country", "Locality"])("rejects coordinates published at %s precision", async (accuracy) => {
    const json = attomResponse(); json.property[0].location.accuracy = accuracy;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    expect((await fetchAttomAddress(QUERY)).attempt.outcome).toBe("invalid-response");
  });

  it.each([undefined, "Unknown"])("treats %s accuracy as a street-level point", async (accuracy) => {
    const json = attomResponse(); json.property[0].location.accuracy = accuracy as string;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(json)));
    const { result } = await fetchAttomAddress(QUERY);
    expect(result?.match.precision).toBe("street");
    expect(result?.match.evidence?.confidence).toBe("low");
  });

  it("bounds provider latency with an abort signal", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const pending = fetchAttomAddress(QUERY);
    await vi.advanceTimersByTimeAsync(5000);
    expect((await pending).attempt.outcome).toBe("timeout");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("handles invalid JSON and network errors without returning error contents", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("attom-test-key")));
    const lookup = await fetchAttomAddress(QUERY);
    expect(lookup.attempt.outcome).toBe("provider-error");
    expect(JSON.stringify(lookup)).not.toContain("attom-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not JSON")));
    expect((await fetchAttomAddress(QUERY)).result).toBeNull();
  });
});
