import { describe, expect, it } from "vitest";
import { ADU_CITIES } from "./adu/content";
import { preapprovedPrograms, preapprovedPlans } from "./preapproved-plans-data";
import { findPreapprovedPlan, normalizePlanReference, planScopeForLot, suggestPlanJurisdiction } from "./preapproved-plans";

describe("pre-approved plan catalog", () => {
  it("covers every content jurisdiction and all six additional studio markets", () => {
    expect(preapprovedPrograms).toHaveLength(20);
    for (const city of ADU_CITIES) expect(preapprovedPrograms.some(p => p.id === `${city.state}-${city.slug}`)).toBe(true);
    for (const id of ["wa-seattle", "or-portland", "tx-austin", "ca-los-angeles", "ca-oakland", "co-denver"]) {
      expect(preapprovedPrograms.some(p => p.id === id)).toBe(true);
    }
  });
  it("matches exact city and state, including accented San José, without treating postal/county names as approvals", () => {
    expect(suggestPlanJurisdiction({ city: "Seattle, WA" })?.id).toBe("wa-seattle");
    expect(suggestPlanJurisdiction({ city: "San José", state: "CA" })?.id).toBe("ca-san-jose");
    expect(suggestPlanJurisdiction({ city: "Portland", state: "ME" })).toBeUndefined();
    expect(suggestPlanJurisdiction({ city: "Portland" })).toBeUndefined();
    expect(suggestPlanJurisdiction({ city: "San Diego", state: "CA" })?.id).toBe("ca-san-diego");
    expect(suggestPlanJurisdiction({ city: "Unincorporated San Diego County", state: "CA" })?.id).toBe("ca-san-diego-county");
    expect(suggestPlanJurisdiction({ city: "1 San Diego Street", state: "CA" })).toBeUndefined();
    expect(suggestPlanJurisdiction({ city: "Seattle, WA", state: "CA" })).toBeUndefined();
  });
  it("scopes shared choices to lot identity and mode without exposing addresses", () => {
    const lot = { address: "123 Main Street", city: "San Diego, CA" };
    expect(planScopeForLot(lot, "live")).toMatch(/^[a-f0-9]{16}$/);
    expect(planScopeForLot(lot, "live")).not.toBe(planScopeForLot(lot, "preset"));
    expect(planScopeForLot(lot, "live")).not.toBe(planScopeForLot({ ...lot, address: "456 Other Street" }, "live"));
    expect(planScopeForLot(lot, "live")).toBe(planScopeForLot({ ...lot, address: "123 MAIN STREET" }, "live"));
  });
  it("has unique sourced plans and no more than six per authority", () => {
    expect(preapprovedPlans.length).toBeGreaterThan(0);
    expect(new Set(preapprovedPlans.map(p => p.id)).size).toBe(preapprovedPlans.length);
    for (const program of preapprovedPrograms) {
      expect(preapprovedPlans.filter(p => p.jurisdictionId === program.id).length).toBeLessThanOrEqual(6);
    }
    for (const plan of preapprovedPlans) {
      expect(plan.sourceUrl).toMatch(/^https:\/\//);
      expect(plan.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(preapprovedPrograms.find(p => p.id === plan.jurisdictionId)?.status).toBe("verified");
    }
  });
  it("resolves references only within their authority and preserves unknown IDs without trusting claims", () => {
    const plan = preapprovedPlans[0];
    expect(findPreapprovedPlan({ planId: plan.id, jurisdictionId: plan.jurisdictionId })).toEqual(plan);
    expect(findPreapprovedPlan({ planId: plan.id, jurisdictionId: "ca-san-jose" })).toBeUndefined();
    expect(findPreapprovedPlan({ planId: "withdrawn-plan", jurisdictionId: "ca-sacramento" })).toBeUndefined();
    expect(normalizePlanReference({ planId: "withdrawn-plan", jurisdictionId: "ca-sacramento", approval: "guaranteed", url: "javascript:alert(1)" })).toEqual({ planId: "withdrawn-plan", jurisdictionId: "ca-sacramento" });
    for (const value of [null, {}, { planId: "../bad", jurisdictionId: "ca-sacramento" }, { planId: "a".repeat(101), jurisdictionId: "ca-sacramento" }]) {
      expect(normalizePlanReference(value)).toBeUndefined();
    }
  });
});
