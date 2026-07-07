import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import { permitPathwayDef } from "./permit-pathway";

function validInput() {
  const parcel = parcelPresets[0]; // "Seattle, WA 98115"
  const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);
  return { parcel, config: defaultAduConfig, result };
}

describe("permitPathwayDef.validateInput", () => {
  it("accepts a well-formed parcel/config/result payload", () => {
    expect(permitPathwayDef.validateInput(validInput()).ok).toBe(true);
  });

  it("rejects a payload missing the parcel", () => {
    expect(permitPathwayDef.validateInput({ config: {}, result: {} }).ok).toBe(false);
  });
});

describe("permitPathwayDef tools", () => {
  it("looks up permit tracks for the parcel's jurisdiction via context", async () => {
    const ctx = permitPathwayDef.buildContext(validInput());
    const lookup = permitPathwayDef.tools.find((t) => t.name === "lookup_permit_tracks");
    const out = (await lookup!.execute({}, ctx)) as { tracks: Array<{ type: string }> };
    expect(out.tracks.length).toBeGreaterThan(0);
    expect(out.tracks[0].type).toBe("ministerial"); // Seattle, WA
  });

  it("returns stage benchmarks for a chosen track id", async () => {
    const ctx = permitPathwayDef.buildContext(validInput());
    const bench = permitPathwayDef.tools.find((t) => t.name === "get_stage_benchmarks");
    const out = (await bench!.execute({ trackId: "wa-adu-ministerial" }, ctx)) as {
      stages: unknown[];
    };
    expect(out.stages.length).toBeGreaterThan(0);
  });

  it("combines city-only live data with the address to recover the state code", async () => {
    const input = validInput();
    const cityOnlyInput = {
      ...input,
      parcel: {
        ...input.parcel,
        address: "1600 Pennsylvania Avenue, Seattle, WA 98115",
        city: "Seattle",
      },
    };
    const ctx = permitPathwayDef.buildContext(cityOnlyInput);
    const lookup = permitPathwayDef.tools.find((t) => t.name === "lookup_permit_tracks");
    const out = (await lookup!.execute({}, ctx)) as { tracks: Array<{ type: string }> };

    expect(out.tracks[0].type).toBe("ministerial");
  });
});
