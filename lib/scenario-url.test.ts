import { describe, expect, it } from "vitest";
import {
  defaultScenarioState,
  parseScenarioParams,
  serializeScenarioParams,
} from "./scenario-url";
import { defaultAduConfig, defaultFinancialAssumptions } from "./feasibility";

describe("parseScenarioParams", () => {
  it("parses a complete valid query string", () => {
    const params = new URLSearchParams(
      "parcel=corner-lot&size=800&roof=gable&finish=board&rent=market&openings=0",
    );
    const result = parseScenarioParams(params);

    expect(result.parcelId).toBe("corner-lot");
    expect(result.config?.footprint).toBe(800);
    expect(result.config?.roof).toBe("gable");
    expect(result.config?.finish).toBe("board");
    expect(result.config?.includeOpenings).toBe(false);
    expect(result.assumptions?.rentScenario).toBe("market");
  });

  it("ignores invalid parcel id", () => {
    const params = new URLSearchParams("parcel=does-not-exist");
    const result = parseScenarioParams(params);
    expect(result.parcelId).toBeUndefined();
  });

  it("clamps unknown footprint values to the default 600 sf", () => {
    const params = new URLSearchParams("size=9999");
    const result = parseScenarioParams(params);
    expect(result.config?.footprint).toBe(defaultAduConfig.footprint);
  });

  it("ignores invalid roof/finish/rent values", () => {
    const params = new URLSearchParams(
      "size=600&roof=banana&finish=glitter&rent=infinite",
    );
    const result = parseScenarioParams(params);
    expect(result.config?.roof).toBe(defaultAduConfig.roof);
    expect(result.config?.finish).toBe(defaultAduConfig.finish);
    expect(result.assumptions).toBeUndefined();
  });

  it("returns empty partial when no params are present", () => {
    const result = parseScenarioParams(new URLSearchParams());
    expect(result).toEqual({});
  });
});

describe("serializeScenarioParams", () => {
  it("produces a canonical, parseable string", () => {
    const serialized = serializeScenarioParams(defaultScenarioState);
    const params = new URLSearchParams(serialized);
    const parsed = parseScenarioParams(params);

    expect(parsed.parcelId).toBe(defaultScenarioState.parcelId);
    expect(parsed.config?.footprint).toBe(defaultAduConfig.footprint);
    expect(parsed.config?.roof).toBe(defaultAduConfig.roof);
    expect(parsed.config?.finish).toBe(defaultAduConfig.finish);
    expect(parsed.assumptions?.rentScenario).toBe(
      defaultFinancialAssumptions.rentScenario,
    );
  });

  it("round-trips a customized state", () => {
    const customized = {
      parcelId: "compact-lot",
      config: { ...defaultAduConfig, footprint: 1000, width: 25, length: 40, roof: "flat" as const, finish: "stucco" as const, includeOpenings: false },
      assumptions: { ...defaultFinancialAssumptions, rentScenario: "optimistic" as const },
    };

    const serialized = serializeScenarioParams(customized);
    const parsed = parseScenarioParams(new URLSearchParams(serialized));

    expect(parsed.parcelId).toBe("compact-lot");
    expect(parsed.config?.footprint).toBe(1000);
    expect(parsed.config?.roof).toBe("flat");
    expect(parsed.config?.finish).toBe("stucco");
    expect(parsed.config?.includeOpenings).toBe(false);
    expect(parsed.assumptions?.rentScenario).toBe("optimistic");
  });
});
