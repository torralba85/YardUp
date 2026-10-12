import { describe, expect, it } from "vitest";
import { calculateScenarioFeasibility, restoreScenario } from "./scenario-restoration";
import { defaultAduConfig, defaultFinancialAssumptions, getParcelById } from "./feasibility";
import { defaultPose } from "./scenario-design";
import { SAMPLE_LIVE_PARCEL } from "@/test/fixtures/live-parcel";
import type { AIProjectBrief } from "./ai-types";

const brief: AIProjectBrief = {
  headline: "Saved assessment", summary: "Snapshot", bestFit: "Verify locally", risks: [],
  permitTrack: { name: "Local review", type: "ministerial", basis: "City guidance" },
  stages: [], totalEstWeeksLow: 4, totalEstWeeksHigh: 8, recommendedNextSteps: [], disclaimer: "Estimate",
};
const saved = {
  id: "saved", name: "Saved study", createdAt: "2026-09-13T00:00:00Z", parcelId: "oak-street",
  config: defaultAduConfig, assumptions: defaultFinancialAssumptions, projectBrief: brief,
};

describe("Scenario Restoration", () => {
  it("restores the Live Parcel pose and marks its own Brief as a saved snapshot", () => {
    const restored = restoreScenario({ ...saved, liveParcel: SAMPLE_LIVE_PARCEL, pose: { x: 2, z: 3, rotationDeg: 15 } });
    expect(restored.liveParcel?.address).toBe(SAMPLE_LIVE_PARCEL.address);
    expect(restored.pose).toEqual({ x: 2, z: 3, rotationDeg: 15 });
    expect(restored.briefState).toMatchObject({ data: { tier: "full", brief }, savedAt: saved.createdAt, loading: false });
  });

  it("changes Brief identity after Design, economic, or Placement Validation findings change", () => {
    const initial = restoreScenario(saved);
    const bigger = restoreScenario({ ...saved, config: { ...defaultAduConfig, footprint: 1000, width: 25, length: 40 } });
    const economic = restoreScenario({ ...saved, assumptions: { ...defaultFinancialAssumptions, rentScenario: "market" } });
    const blocked = restoreScenario({ ...saved, pose: { x: 999, z: 999, rotationDeg: 0 } });
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
