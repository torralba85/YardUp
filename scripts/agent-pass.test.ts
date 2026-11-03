import { describe, expect, it } from "vitest";
import { normalizeAgentPassCode } from "@/lib/agent-pass";
import { certificateKey } from "@/lib/certificate-key";
import { agentLink, buildPass, campaignFor, certKeyFor, isSubsequentPaidGrant, listingFromSnapshot, normalizeCode, parseArgs } from "./agent-pass.mjs";

describe("agent-pass script", () => {
  it("attributes only paid orders after redemption and excludes unknown dates", () => {
    const timestamp = (value: number) => ({ toMillis: () => value });
    const redemption = { createdAt: timestamp(100) };
    const paid = { amount: 2900, createdAt: timestamp(101) };
    expect(isSubsequentPaidGrant(paid, redemption)).toBe(true);
    for (const createdAt of [timestamp(99), timestamp(100), undefined]) {
      expect(isSubsequentPaidGrant({ ...paid, createdAt }, redemption)).toBe(false);
    }
    expect(isSubsequentPaidGrant(paid, {})).toBe(false);
    expect(isSubsequentPaidGrant({ ...paid, demo: true }, redemption)).toBe(false);
    expect(isSubsequentPaidGrant({ ...paid, source: "agent_pass" }, redemption)).toBe(false);
    expect(isSubsequentPaidGrant({ ...paid, amount: 0 }, redemption)).toBe(false);
  });
  it.each([
    ["1234 Elm St", "San Diego"],
    ["  77 O'Farrell Ave #2 ", "San José"],
    ["", ""],
  ])("derives the same certificate key as the Studio for %j", (address, city) => {
    expect(certKeyFor(address, city)).toBe(certificateKey({ address, city }));
  });

  it.each([" smith-elm ", "AB12", "abc", "SMITH/ELM", "-SMITH"])("normalizes %j like the app", (raw) => {
    expect(normalizeCode(raw)).toBe(normalizeAgentPassCode(raw));
  });

  it("reads the listing from a stored layout snapshot", () => {
    const snapshot = JSON.stringify({ liveParcel: { address: "1234 Elm St", city: "San Diego", state: "CA" } });
    expect(listingFromSnapshot(snapshot)).toEqual({ address: "1234 Elm St", city: "San Diego", state: "CA" });
    expect(listingFromSnapshot(JSON.stringify({ parcelId: "oak-street" }))).toBeNull();
    expect(listingFromSnapshot("{not json")).toBeNull();
  });

  it("builds the agent's link with their code and the market campaign", () => {
    const layout = "a".repeat(48);
    const url = new URL(agentLink({ layout, code: "SMITH-ELM", city: "San Diego" }));
    expect(url.origin + url.pathname).toBe("https://lotfoundry.net/studio");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      layout,
      pass: "SMITH-ELM",
      utm_source: "agent_smith-elm",
      utm_medium: "referral",
      utm_campaign: "sd_agent_pilot_202611",
    });
    expect(campaignFor("San José")).toBe("sj_agent_pilot_202611");
    expect(campaignFor("Oakland")).toBe("agent_pilot_202611");
  });

  it("builds a capped, expiring pass bound to the listing", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    const listing = { address: "1234 Elm St", city: "San Diego", state: "CA" };
    const { options } = parseArgs(["create", "--layout", "b".repeat(48), "--agent", "Jane Smith", "--brokerage", "Example Realty", "--max", "10", "--days", "30"]);
    const pass = buildPass({ options, listing, now });
    expect(pass).toMatchObject({
      certKey: certificateKey(listing),
      status: "active",
      maxRedemptions: 10,
      redemptions: 0,
      agentName: "Jane Smith",
      brokerage: "Example Realty",
      listingAddress: "1234 Elm St",
    });
    expect(pass.expiresAt.toISOString()).toBe("2026-12-10T00:00:00.000Z");
    expect(options.write).toBe(false);
    expect(() => buildPass({ options: { ...options, max: "500" }, listing, now })).toThrow(/--max/);
    expect(() => buildPass({ options: { ...options, agent: undefined }, listing, now })).toThrow(/--agent/);
  });
});
