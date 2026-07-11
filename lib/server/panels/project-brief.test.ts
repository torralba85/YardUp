import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import { buildAIProjectBriefInput } from "@/lib/ai-project-brief";
import { projectBriefDef } from "./project-brief";

function validInput() {
  const parcel = parcelPresets[0];
  const result = calculateFeasibility(
    parcel,
    defaultAduConfig,
    defaultFinancialAssumptions,
  );
  return buildAIProjectBriefInput({ parcel, config: defaultAduConfig, result });
}

describe("projectBriefDef", () => {
  it("accepts the unified payload and rejects missing parcel data", () => {
    expect(projectBriefDef.validateInput(validInput()).ok).toBe(true);
    expect(projectBriefDef.validateInput({ config: {}, result: {} }).ok).toBe(false);
  });

  it("requires the permit tools in a deterministic order", () => {
    expect(projectBriefDef.requiredToolSequence).toEqual([
      "lookup_permit_tracks",
      "get_stage_benchmarks",
    ]);
  });

  it("looks up the jurisdiction and its stage benchmarks", async () => {
    const ctx = projectBriefDef.buildContext(validInput());
    const lookup = projectBriefDef.tools.find((tool) => tool.name === "lookup_permit_tracks")!;
    const tracks = (await lookup.execute({}, ctx)) as {
      tracks: Array<{ id: string; type: string }>;
    };
    expect(tracks.tracks[0].type).toBe("ministerial");

    const benchmarks = projectBriefDef.tools.find(
      (tool) => tool.name === "get_stage_benchmarks",
    )!;
    const stages = (await benchmarks.execute({ trackId: tracks.tracks[0].id }, ctx)) as {
      stages: unknown[];
    };
    expect(stages.stages.length).toBeGreaterThan(0);
  });

  it("recovers the state from a full address when live parcel city is city-only", async () => {
    const input = validInput();
    const cityOnlyInput = {
      ...input,
      parcel: {
        ...input.parcel,
        address: "1600 Pennsylvania Avenue, Seattle, WA 98115",
        city: "Seattle",
      },
    };
    const ctx = projectBriefDef.buildContext(cityOnlyInput);
    const lookup = projectBriefDef.tools.find((tool) => tool.name === "lookup_permit_tracks")!;
    const out = (await lookup.execute({}, ctx)) as { tracks: Array<{ type: string }> };

    expect(out.tracks[0].type).toBe("ministerial");
  });
});
