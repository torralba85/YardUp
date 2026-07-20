import { describe, expect, it } from "vitest";
import {
  defaultScenarioState,
  isNonDefaultScenario,
  mergeScenarioPartial,
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

  it("ignores an empty openings param even when other params are present", () => {
    const params = new URLSearchParams("size=600&openings=");
    const result = parseScenarioParams(params);
    expect(result.config?.includeOpenings).toBe(defaultAduConfig.includeOpenings);
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

describe("mergeScenarioPartial", () => {
  it("returns the full default state when given an empty partial", () => {
    const result = mergeScenarioPartial({});
    expect(result).toEqual(defaultScenarioState);
  });

  it("uses provided parcelId and fills defaults for config and assumptions", () => {
    const result = mergeScenarioPartial({ parcelId: "corner-lot" });
    expect(result.parcelId).toBe("corner-lot");
    expect(result.config).toEqual(defaultScenarioState.config);
    expect(result.assumptions).toEqual(defaultScenarioState.assumptions);
  });

  it("does not return a reference to the shared default config/assumptions", () => {
    const result = mergeScenarioPartial({});
    result.config.footprint = 99999;
    result.assumptions.rentScenario = "optimistic";
    result.assumptions.costPerSqft.cedar = 99999;
    expect(defaultAduConfig.footprint).not.toBe(99999);
    expect(defaultFinancialAssumptions.rentScenario).not.toBe("optimistic");
    expect(defaultFinancialAssumptions.costPerSqft.cedar).not.toBe(99999);
  });

  it("uses all provided fields when the partial is complete", () => {
    const customConfig = { ...defaultAduConfig, footprint: 800, width: 25, length: 32, roof: "gable" as const };
    const customAssumptions = {
      costPerSqft: { cedar: 400, lap: 375, stucco: 390, board: 420 },
      softCostMultiplier: 1.25,
      operatingExpenseRatio: 0.4,
      rentScenario: "optimistic" as const,
    };
    const result = mergeScenarioPartial({
      parcelId: "compact-lot",
      config: customConfig,
      assumptions: customAssumptions,
    });
    expect(result.parcelId).toBe("compact-lot");
    expect(result.config).toEqual(customConfig);
    expect(result.assumptions).toEqual(customAssumptions);
  });

  it("uses provided config and falls back to default parcelId and assumptions", () => {
    const customConfig = { ...defaultAduConfig, finish: "board" as const };
    const result = mergeScenarioPartial({ config: customConfig });
    expect(result.parcelId).toBe(defaultScenarioState.parcelId);
    expect(result.config).toEqual(customConfig);
    expect(result.assumptions).toEqual(defaultScenarioState.assumptions);
  });

  it("uses provided assumptions and falls back to default parcelId and config", () => {
    const customAssumptions = {
      costPerSqft: { cedar: 400, lap: 375, stucco: 390, board: 420 },
      softCostMultiplier: 1.25,
      operatingExpenseRatio: 0.4,
      rentScenario: "market" as const,
    };
    const result = mergeScenarioPartial({ assumptions: customAssumptions });
    expect(result.parcelId).toBe(defaultScenarioState.parcelId);
    expect(result.config).toEqual(defaultScenarioState.config);
    expect(result.assumptions).toEqual(customAssumptions);
  });
});

describe("isNonDefaultScenario", () => {
  it("is false for an empty partial (first visit, no params)", () => {
    expect(isNonDefaultScenario({})).toBe(false);
  });

  it("is false when params only restate the default scenario", () => {
    const partial = parseScenarioParams(
      new URLSearchParams(serializeScenarioParams(defaultScenarioState)),
    );
    expect(isNonDefaultScenario(partial)).toBe(false);
  });

  it("is true for an explicit non-default parcel", () => {
    const partial = parseScenarioParams(new URLSearchParams("parcel=corner-lot"));
    expect(isNonDefaultScenario(partial)).toBe(true);
  });

  it("is true for the default parcel with a customized config", () => {
    const partial = parseScenarioParams(
      new URLSearchParams("parcel=oak-street&size=800"),
    );
    expect(isNonDefaultScenario(partial)).toBe(true);
  });

  it("is true for the default parcel with a non-default rent scenario", () => {
    const partial = parseScenarioParams(
      new URLSearchParams("parcel=oak-street&rent=optimistic"),
    );
    expect(isNonDefaultScenario(partial)).toBe(true);
  });

  it("is false without an explicit parcel even when config differs", () => {
    const partial = parseScenarioParams(new URLSearchParams("size=800"));
    expect(isNonDefaultScenario(partial)).toBe(false);
  });
});
