import { describe, expect, it } from "vitest";
import { defaultAduConfig, defaultFinancialAssumptions, getParcelById, parcelPresets } from "./feasibility";
import { migrateSavedScenario } from "./saved-scenarios";
import {
  calculateScenarioFeasibility,
  createScenarioState,
  defaultPose,
  describePlanControls,
  isPlainPlaceText,
  isValidAduConfig,
  migrateDesign,
  parseEmailScenario,
  resolveScenarioForLot,
  restoreScenario,
  scenarioReducer,
} from "./scenario";
import {
  defaultScenarioState,
  mergeScenarioPartial,
  parseScenarioParams,
  serializeScenarioParams,
} from "./scenario-url";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import { EMAIL_SCENARIO } from "@/test/fixtures/email-scenario";
import type { AIProjectBrief } from "./ai-types";

const pose = { x: 3.25, z: -17.5, rotationDeg: 90 };
const saved = {
  id: "fixture",
  name: "Study",
  createdAt: "2026-09-04T00:00:00Z",
  parcelId: "oak-street",
  config: defaultAduConfig,
  assumptions: defaultFinancialAssumptions,
};

const brief: AIProjectBrief = {
  headline: "Saved assessment",
  summary: "Snapshot",
  bestFit: "Verify locally",
  risks: [],
  permitTrack: { name: "Local review", type: "ministerial", basis: "City guidance" },
  stages: [],
  totalEstWeeksLow: 4,
  totalEstWeeksHigh: 8,
  recommendedNextSteps: [],
  disclaimer: "Estimate",
};

describe("complete scenario persistence", () => {
  it.each([[31, 20], [20, 31], [24, 25], [20, 30]])(
    "round trips %s x %s without losing shape, pose, height, or assumptions",
    (width, length) => {
      const state = {
        ...defaultScenarioState,
        config: { ...defaultAduConfig, width, length, footprint: width * length, height: 14 },
        pose,
        assumptions: {
          ...defaultFinancialAssumptions,
          softCostMultiplier: 1.3,
          operatingExpenseRatio: 0.4,
          costPerSqft: { cedar: 430, lap: 420, stucco: 410, board: 450 },
        },
      };
      expect(mergeScenarioPartial(parseScenarioParams(new URLSearchParams(serializeScenarioParams(state))))).toEqual(state);
      expect(migrateSavedScenario({ ...saved, ...state })?.pose).toEqual(pose);
    },
  );

  it("migrates area-only legacy links to their documented preset and explicit pose", () => {
    const state = mergeScenarioPartial(parseScenarioParams(new URLSearchParams("parcel=corner-lot&size=800&roof=gable")));
    expect(state.version).toBe(2);
    expect(state.config).toMatchObject({ width: 25, length: 32, footprint: 800 });
    expect(state.pose).toEqual(defaultPose(parcelPresets[1], state.config));
  });

  it("migrates legacy saved dimensions and aliases, repairing only the stale area label", () => {
    const record = migrateSavedScenario({
      ...saved,
      config: {
        ...defaultAduConfig,
        width: 31,
        length: 20,
        footprint: 600,
        roof: undefined,
        roofStyle: "gable",
        finish: undefined,
        exteriorFinish: "board",
      },
    });
    expect(record).toMatchObject({
      version: 2,
      heightConvention: "wall",
      config: { width: 31, length: 20, footprint: 620, roof: "gable", finish: "board", height: 12 },
    });
    expect(record?.pose).toEqual(defaultPose(parcelPresets[0], { width: 31, length: 20 }));
  });

  it("rejects malformed and unsupported current designs instead of inventing geometry", () => {
    for (const bad of [NaN, Infinity, -1, 0, 81]) expect(isValidAduConfig({ ...defaultAduConfig, width: bad })).toBe(false);
    const current = { ...saved, version: 2, heightConvention: "wall", pose };
    expect(migrateDesign({ ...current, config: { ...defaultAduConfig, footprint: 620 } })).toBeNull();
    expect(migrateDesign({ ...current, pose: { ...pose, x: Infinity } })).toBeNull();
    expect(migrateDesign({ ...current, pose: undefined })).toBeNull();
    expect(migrateDesign({ ...current, version: 99 })).toBeNull();
    expect(migrateDesign({ ...current, heightConvention: "total" })).toBeNull();
    expect(migrateSavedScenario({ ...saved, liveParcel: { lat: 200 } })).toBeNull();
  });

  it("validates untrusted URL fields and strips private data from serialization", () => {
    const params = new URLSearchParams(serializeScenarioParams(defaultScenarioState));
    for (const [key, value] of [["w", "NaN"], ["l", "Infinity"], ["size", "620"], ["x", ""], ["rotation", "999"], ["hc", "total"]]) {
      const bad = new URLSearchParams(params);
      bad.set(key, value);
      expect(parseScenarioParams(bad).config).toBeUndefined();
    }
    params.set("v", "99");
    expect(parseScenarioParams(params)).toEqual({});
    const privateState = { ...defaultScenarioState, parcelId: "private-address", liveParcel: { address: "PRIVATE", lat: 37, lng: -122 } };
    const link = serializeScenarioParams(privateState);
    expect(link).not.toMatch(/PRIVATE|private-address|liveParcel|address|lat|lng/);
  });
});

describe("isPlainPlaceText and emailed layouts", () => {
  it.each([
    "141 N Almaden Blvd",
    "18595 Del Monte Ave",
    "12 O'Neil & Main St.",
    "1234 Oak Street #5, Unit B",
    "100 N. Main St, St. Louis",
    "San Jose, CA",
    "HUD FMR · San Jose, CA · 1 bed",
  ])("accepts the real place label %j", (value) => {
    expect(isPlainPlaceText(value, 160)).toBe(true);
  });

  it.each([
    ["an empty label", "   "],
    ["a URL", "Refund at https://evil.test/claim"],
    ["a www host", "go to www.evil.test"],
    ["a bare domain", "see evil-site.com today"],
    ["an email address", "write help@evil.test"],
    ["a line break", "123 Main St\nCall now"],
    ["markup", "<b>123 Main St</b>"],
  ])("rejects %s", (_label, value) => {
    expect(isPlainPlaceText(value, 160)).toBe(false);
  });

  it("enforces the length cap after trimming", () => {
    expect(isPlainPlaceText(`  ${"1".repeat(120)}  `, 120)).toBe(true);
    expect(isPlainPlaceText("1".repeat(121), 120)).toBe(false);
  });

  it("keeps only the safe reference IDs in emailed layouts", () => {
    const preapprovedPlan = { planId: "san-diego-city-plan-f", jurisdictionId: "ca-san-diego" };
    expect(parseEmailScenario({ ...EMAIL_SCENARIO, preapprovedPlan: { ...preapprovedPlan, url: "javascript:bad" } })).toHaveProperty("preapprovedPlan", preapprovedPlan);
  });
});

describe("Scenario Restoration", () => {
  it("restores the Live Parcel pose and marks its own Brief as a saved snapshot", () => {
    const restored = restoreScenario({ ...saved, projectBrief: brief, liveParcel: SAMPLE_LIVE_PARCEL, pose: { x: 2, z: 3, rotationDeg: 15 } });
    expect(restored.liveParcel?.address).toBe(SAMPLE_LIVE_PARCEL.address);
    expect(restored.pose).toEqual({ x: 2, z: 3, rotationDeg: 15 });
    expect(restored.briefState).toMatchObject({ data: { tier: "full", brief }, savedAt: saved.createdAt, loading: false });
  });

  it("changes Brief identity after Design, economic, or Placement Validation findings change", () => {
    const initial = restoreScenario({ ...saved, projectBrief: brief });
    const bigger = restoreScenario({ ...saved, projectBrief: brief, config: { ...defaultAduConfig, footprint: 1000, width: 25, length: 40 } });
    const economic = restoreScenario({ ...saved, projectBrief: brief, assumptions: { ...defaultFinancialAssumptions, rentScenario: "market" } });
    const blocked = restoreScenario({ ...saved, projectBrief: brief, pose: { x: 999, z: 999, rotationDeg: 0 } });
    expect(bigger.briefState?.key).not.toBe(initial.briefState?.key);
    expect(economic.briefState?.key).not.toBe(initial.briefState?.key);
    expect(blocked.briefState?.key).not.toBe(initial.briefState?.key);
  });

  it("preserves explicit Preset rent precedence over attached market data", () => {
    const parcel = { ...SAMPLE_LIVE_PARCEL, expectedRent: { conservative: 1234, market: 1500, optimistic: 1700 } };
    const result = calculateScenarioFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions, defaultPose(getParcelById("oak-street"), defaultAduConfig));
    expect(result.monthlyRent).toBe(1234);
  });
});

describe("scenarioReducer", () => {
  it("sizes to a Pre-approved Plan, moves pose when needed, undoes cleanly, and clears on lot change", () => {
    const coyoteBrush = getParcelById("coyote-brush");
    let state = scenarioReducer(createScenarioState(), { type: "select-preset", parcel: coyoteBrush });
    const initialPose = state.pose;
    const planRef = { jurisdictionId: "ca-san-diego-county", planId: "san-diego-county-plan-a" };

    state = scenarioReducer(state, { type: "select-plan", reference: planRef, parcel: coyoteBrush });
    expect(state.preapprovedPlan).toEqual(planRef);
    expect(state.config.footprint).not.toBe(defaultAduConfig.footprint);
    expect(describePlanControls(state, coyoteBrush).planSizeUndo).not.toBeNull();

    state = scenarioReducer(state, { type: "undo-plan-size" });
    expect(state.config).toMatchObject({ width: defaultAduConfig.width, length: defaultAduConfig.length, footprint: defaultAduConfig.footprint });
    expect(state.pose).toEqual(initialPose);
    expect(state.preapprovedPlan).toEqual(planRef);

    // Switching lots via sync-lot or select-preset clears the plan atomically and recomputes default pose.
    const nextLot = getParcelById("oak-street");
    const derived = resolveScenarioForLot(state, nextLot.id, nextLot);
    expect(derived.preapprovedPlan).toBeNull();
    expect(derived.pose).toEqual(defaultPose(nextLot, derived.config));

    const synced = scenarioReducer(state, { type: "sync-lot", sceneKey: nextLot.id, parcel: nextLot });
    expect(synced.preapprovedPlan).toBeNull();
    expect(synced.pose).toEqual(defaultPose(nextLot, synced.config));
  });

  it("ignores invalid poses and restores saved scenarios atomically", () => {
    const initial = createScenarioState();
    expect(scenarioReducer(initial, { type: "commit-pose", pose: { x: NaN, z: 0, rotationDeg: 0 } })).toBe(initial);

    const restored = restoreScenario({
      ...saved,
      liveParcel: SAMPLE_LIVE_PARCEL,
      pose: { x: 1, z: 2, rotationDeg: 90 },
      preapprovedPlan: { jurisdictionId: "ca-sacramento", planId: "sacramento-studio-367" },
    });
    const next = scenarioReducer(initial, { type: "restore", restored });
    expect(next.sceneKey).toBe(`${SAMPLE_LIVE_PARCEL.address}|${SAMPLE_LIVE_PARCEL.city}`);
    expect(next.pose).toEqual({ x: 1, z: 2, rotationDeg: 90 });
    expect(next.preapprovedPlan).toEqual({ jurisdictionId: "ca-sacramento", planId: "sacramento-studio-367" });
  });
});
