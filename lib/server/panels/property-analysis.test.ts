import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import { propertyAnalysisDef } from "./property-analysis";

function validInput() {
  const parcel = parcelPresets[0]; // "Seattle, WA 98115"
  const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
  return { parcel, config: defaultAduConfig, result };
}

describe("propertyAnalysisDef.validateInput", () => {
  it("accepts a well-formed parcel/config/result payload", () => {
    expect(propertyAnalysisDef.validateInput(validInput()).ok).toBe(true);
  });

  it("rejects a payload missing the parcel", () => {
    expect(propertyAnalysisDef.validateInput({ config: {}, result: {} }).ok).toBe(false);
  });

  it("rejects missing, non-string, and blank parcel addresses before buildContext", () => {
    const input = validInput();
    for (const address of [undefined, 42, "   "]) {
      const raw = { ...input, parcel: { ...input.parcel, address } };
      const outcome = propertyAnalysisDef.validateInput(raw);
      expect(outcome.ok).toBe(false);
    }
  });

  it("rejects missing and blank parcel cities", () => {
    const input = validInput();
    for (const city of [undefined, ""]) {
      const raw = { ...input, parcel: { ...input.parcel, city } };
      expect(propertyAnalysisDef.validateInput(raw).ok).toBe(false);
    }
  });
});

describe("propertyAnalysisDef tools", () => {
  it("returns no benchmarks instead of throwing when tool args are null", async () => {
    const ctx = propertyAnalysisDef.buildContext(validInput());
    const bench = propertyAnalysisDef.tools.find((t) => t.name === "get_stage_benchmarks");
    const out = (await bench!.execute(null, ctx)) as { stages: unknown[] };
    expect(out.stages).toEqual([]);
  });
});
