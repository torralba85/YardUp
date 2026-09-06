import { describe, expect, it } from "vitest";
import { defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "./feasibility";
import { defaultPose, isValidAduConfig, migrateDesign } from "./scenario-design";
import { defaultScenarioState, mergeScenarioPartial, parseScenarioParams, serializeScenarioParams } from "./scenario-url";
import { migrateSavedScenario } from "./saved-scenarios";

const pose = { x: 3.25, z: -17.5, rotationDeg: 90 };
const saved = { id: "fixture", name: "Study", createdAt: "2026-09-04T00:00:00Z", parcelId: "oak-street", config: defaultAduConfig, assumptions: defaultFinancialAssumptions };

describe("complete scenario persistence", () => {
  it.each([[31, 20], [20, 31], [24, 25], [20, 30]])("round trips %s x %s without losing shape, pose, height, or assumptions", (width, length) => {
    const state = { ...defaultScenarioState, config: { ...defaultAduConfig, width, length, footprint: width * length, height: 14 }, pose,
      assumptions: { ...defaultFinancialAssumptions, softCostMultiplier: 1.3, operatingExpenseRatio: 0.4, costPerSqft: { cedar: 430, lap: 420, stucco: 410, board: 450 } } };
    expect(mergeScenarioPartial(parseScenarioParams(new URLSearchParams(serializeScenarioParams(state))))).toEqual(state);
    expect(migrateSavedScenario({ ...saved, ...state })?.pose).toEqual(pose);
  });
  it("migrates area-only legacy links to their documented preset and explicit pose", () => {
    const state = mergeScenarioPartial(parseScenarioParams(new URLSearchParams("parcel=corner-lot&size=800&roof=gable")));
    expect(state.version).toBe(2);
    expect(state.config).toMatchObject({ width: 25, length: 32, footprint: 800 });
    expect(state.pose).toEqual(defaultPose(parcelPresets[1], state.config));
  });
  it("migrates legacy saved dimensions and aliases, repairing only the stale area label", () => {
    const record = migrateSavedScenario({ ...saved, config: { ...defaultAduConfig, width: 31, length: 20, footprint: 600, roof: undefined, roofStyle: "gable", finish: undefined, exteriorFinish: "board" } });
    expect(record).toMatchObject({ version: 2, heightConvention: "wall", config: { width: 31, length: 20, footprint: 620, roof: "gable", finish: "board", height: 12 } });
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
      const bad = new URLSearchParams(params); bad.set(key, value);
      expect(parseScenarioParams(bad).config).toBeUndefined();
    }
    params.set("v", "99"); expect(parseScenarioParams(params)).toEqual({});
    const privateState = { ...defaultScenarioState, parcelId: "private-address", liveParcel: { address: "PRIVATE", lat: 37, lng: -122 } };
    const link = serializeScenarioParams(privateState);
    expect(link).not.toMatch(/PRIVATE|private-address|liveParcel|address|lat|lng/);
  });
});
