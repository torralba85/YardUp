import { describe, expect, it } from "vitest";
import { ADU_CITIES } from "./adu/content";
import { defaultAduConfig, footprintOptions } from "./feasibility";
import { isValidAduConfig } from "./scenario-design";
import { preapprovedPrograms, preapprovedPlans } from "./preapproved-plans-data";
import {
  configForPlan,
  configForPlanArea,
  findPreapprovedPlan,
  formatFeetInches,
  modelMatchesPlan,
  modelMatchesPlanArea,
  normalizePlanReference,
  planProgramsForLot,
  planScopeForLot,
  suggestPlanJurisdiction,
  usableRectangleForPlan,
} from "./preapproved-plans";

describe("sizing the 3D model to a plan", () => {
  const starts = [
    ...footprintOptions.map(({ value, width, length }) => ({ ...defaultAduConfig, width, length, footprint: value })),
    { ...defaultAduConfig, width: 16, length: 40, footprint: 640, roof: "gable" as const },
  ];
  it.each(preapprovedPlans.filter(plan => plan.sqft !== undefined).map(plan => [plan.id, plan.sqft!] as const))(
    "%s matches its floor area on the half-foot grid from every starting shape",
    (_id, sqft) => {
      for (const start of starts) {
        const sized = configForPlanArea(sqft, start);
        expect(isValidAduConfig(sized)).toBe(true);
        expect(sized.footprint).toBe(sized.width * sized.length);
        expect((sized.width * 2) % 1).toBe(0);
        expect((sized.length * 2) % 1).toBe(0);
        expect(modelMatchesPlanArea(sized.footprint, sqft)).toBe(true);
        expect(Math.abs(Math.log(sized.length / sized.width / (start.length / start.width)))).toBeLessThan(0.15);
        expect({ ...sized, width: 0, length: 0, footprint: 0 }).toEqual({ ...start, width: 0, length: 0, footprint: 0 });
      }
    },
  );
  it("keeps an exact match untouched and prefers the closer shape among equally good areas", () => {
    expect(configForPlanArea(600, defaultAduConfig)).toEqual(defaultAduConfig);
    expect(configForPlanArea(800, defaultAduConfig)).toMatchObject({ width: 23.5, length: 34, footprint: 799 });
    expect(modelMatchesPlanArea(600, 559)).toBe(false);
    expect(modelMatchesPlanArea(564, 559)).toBe(true);
  });
});

describe("plan footprints read from the official sheets", () => {
  const plan = (id: string) => preapprovedPlans.find(item => item.id === id)!;
  it("records a footprint for every active plan that agrees with its listed floor area", () => {
    for (const item of preapprovedPlans.filter(entry => entry.status === "active")) {
      const footprint = item.footprint!;
      expect(footprint, item.id).toBeDefined();
      const ratio = (footprint.width * footprint.length) / item.sqft!;
      // Outside-wall rectangles sit near the listed area: a little over it for wall
      // thickness and porches under the roof, a little under where a city rounds its
      // listed size up (Carlsbad's run 1.4% under). Irregular outer bounds run well over it.
      if (footprint.shape === "rectangle") expect(ratio, item.id).toBeGreaterThanOrEqual(0.98);
      if (footprint.shape === "rectangle") expect(ratio, item.id).toBeLessThanOrEqual(1.1);
      else expect(ratio, item.id).toBeGreaterThan(1.1);
    }
  });
  it("gives a rectangular plan its exact footprint, oriented like the model, and keeps the rest of the design", () => {
    const long = configForPlan(plan("san-diego-county-plan-f"), { ...defaultAduConfig, roof: "gable" });
    expect(long).toMatchObject({ width: 21, length: 28.58, footprint: 21 * 28.58, roof: "gable", finish: defaultAduConfig.finish });
    expect(isValidAduConfig(long)).toBe(true);
    expect(configForPlan(plan("san-diego-county-plan-f"), { ...defaultAduConfig, width: 30, length: 20 })).toMatchObject({ width: 28.58, length: 21 });
    expect(modelMatchesPlan(plan("san-diego-county-plan-f"), { width: 28.58, length: 21, footprint: 600.18 })).toBe(true);
    expect(modelMatchesPlan(plan("san-diego-county-plan-f"), { width: 20, length: 30, footprint: 600 })).toBe(false);
  });
  it("defaults an irregular plan to a usable rectangle: its real depth at its floor area", () => {
    expect(configForPlan(plan("san-diego-county-plan-b"), defaultAduConfig)).toMatchObject({ width: 32, length: 37.5, footprint: 1200 });
    expect(configForPlan(plan("san-diego-county-plan-e"), defaultAduConfig)).toMatchObject({ width: 25, length: 32, footprint: 800 });
    expect(configForPlan(plan("la-mesa-plan-e"), { ...defaultAduConfig, width: 30, length: 20 })).toMatchObject({ width: 43, length: 28, footprint: 1204 });
    for (const item of preapprovedPlans.filter(entry => entry.footprint?.shape === "irregular")) {
      const usable = usableRectangleForPlan(item)!;
      expect(modelMatchesPlanArea(usable.width * usable.length, item.sqft!), item.id).toBe(true);
      expect(usable.length, item.id).toBeLessThanOrEqual(Math.max(item.footprint!.width, item.footprint!.length));
    }
    expect(modelMatchesPlan(plan("san-diego-county-plan-b"), { width: 37.5, length: 32, footprint: 1200 })).toBe(true);
    expect(modelMatchesPlan(plan("san-diego-county-plan-b"), { width: 30, length: 40, footprint: 1200 })).toBe(false);
  });
  it("prints feet the way the drawings do", () => {
    expect([28.58, 21, 34.25, 42.17, 35.67].map(formatFeetInches)).toEqual(["28′-7″", "21′-0″", "34′-3″", "42′-2″", "35′-8″"]);
  });
});

describe("authority choices for a lot", () => {
  it("lists only the lot's state, alphabetically, and keeps a restored authority", () => {
    const ca = planProgramsForLot({ city: "San Diego, CA 92117" }).map(program => program.id);
    expect(ca).not.toContain("wa-seattle");
    expect(ca).toContain("ca-san-diego-county");
    expect(ca).toEqual([...ca].sort((a, b) => preapprovedPrograms.find(p => p.id === a)!.city.localeCompare(preapprovedPrograms.find(p => p.id === b)!.city)));
    expect(planProgramsForLot({ city: "Seattle, WA" }, "ca-sacramento").map(program => program.id)).toEqual(["ca-sacramento", "wa-seattle"]);
    expect(planProgramsForLot({ city: "Springfield" })).toHaveLength(preapprovedPrograms.length);
  });
});

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
