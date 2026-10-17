import { describe, expect, it } from "vitest";
import { parseEmailScenario, validLayoutToken } from "./scenario-email";
import { defaultScenarioState, parseScenarioParams, serializeScenarioParams, mergeScenarioPartial } from "./scenario-url";

describe("emailed layout snapshot", () => {
  it("restores dimensions, position, rotation and financial assumptions exactly", () => {
    const saved = parseEmailScenario({ ...defaultScenarioState, projectBrief: { secret: "paid" }, email: "private@example.com" });
    expect(saved).not.toBeNull();
    expect(saved).not.toHaveProperty("projectBrief");
    expect(saved).not.toHaveProperty("email");
    const restored = mergeScenarioPartial(parseScenarioParams(new URLSearchParams(serializeScenarioParams(saved!))));
    expect(restored.config).toEqual(defaultScenarioState.config);
    expect(restored.pose).toEqual(defaultScenarioState.pose);
    expect(restored.assumptions).toEqual(defaultScenarioState.assumptions);
  });
  it("rejects unsupported parcel ids, invalid placement and malformed live data", () => {
    expect(parseEmailScenario({ ...defaultScenarioState, parcelId: "unknown" })).toBeNull();
    expect(parseEmailScenario({ ...defaultScenarioState, pose: { x: Infinity, z: 0, rotationDeg: 0 } })).toBeNull();
    expect(parseEmailScenario({ ...defaultScenarioState, liveParcel: { address: "missing geometry" } })).toBeNull();
    expect(validLayoutToken("a".repeat(48))).toBe(true);
    expect(validLayoutToken("../private")).toBe(false);
  });
});
