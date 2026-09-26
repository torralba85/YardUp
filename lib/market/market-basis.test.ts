import { describe, expect, it } from "vitest";
import { marketBasisLabel, marketProvenanceLine } from "./market-basis";

describe("marketBasisLabel", () => {
  it("cites HUD FMR for static tiers with the area and bedroom", () => {
    expect(
      marketBasisLabel({ source: "hud-county", area: "King County, WA", bedroom: "1br" }),
    ).toBe("HUD FMR · King County, WA · 1-bed");
    expect(marketBasisLabel({ source: "hud-zip", area: "ZIP 98107", bedroom: "studio" })).toBe(
      "HUD FMR · ZIP 98107 · studio",
    );
    expect(marketBasisLabel({ source: "national", area: "U.S. average", bedroom: "2br" })).toBe(
      "HUD FMR · U.S. average · 2-bed",
    );
  });

  it("cites live comps when refined by a live provider", () => {
    expect(marketBasisLabel({ source: "live", area: "ZIP 98107", bedroom: "1br" })).toBe(
      "Live comps · ZIP 98107 · 1-bed",
    );
  });

  it("labels presets and the legacy heuristic plainly", () => {
    expect(marketBasisLabel({ source: "preset", bedroom: "1br" })).toBe("Curated demo estimate");
    expect(marketBasisLabel({ source: "heuristic", bedroom: "1br" })).toBe(
      "Rough lot-size estimate",
    );
  });
});

describe("marketProvenanceLine", () => {
  it("cites source, area, vintage, and confidence for HUD data", () => {
    expect(
      marketProvenanceLine({
        source: "hud-county",
        area: "Los Angeles County, CA",
        asOf: "HUD FY2026 FMR",
        confidence: "medium",
        verified: true,
      }),
    ).toBe("HUD FMR · Los Angeles County, CA · HUD FY2026 FMR · Medium confidence");
  });

  it("includes comp counts for live sources", () => {
    expect(
      marketProvenanceLine({
        source: "live",
        area: "ZIP 98107",
        comparableCount: 14,
        confidence: "high",
        verified: true,
      }),
    ).toBe("Live comps · ZIP 98107 · 14 comps · High confidence");
  });

  it("discloses when costs and expenses are separate planning assumptions", () => {
    const evidence = {
      status: "derived" as const,
      source: { provider: "LotFoundry", dataset: "Planning factors" },
      retrievedAt: "2026-09-25T00:00:00.000Z",
      confidence: "medium" as const,
      warnings: [],
    };
    expect(
      marketProvenanceLine({
        source: "live",
        area: "ZIP 98107",
        comparableCount: 14,
        confidence: "high",
        verified: true,
        components: {
          rent: { ...evidence, status: "observed", source: { provider: "RentCast", dataset: "AVM" } },
          constructionCost: evidence,
          operatingExpenses: evidence,
        },
      }),
    ).toContain("Costs and expenses are planning assumptions");
  });

  it("labels non-market sources honestly", () => {
    expect(
      marketProvenanceLine({
        source: "preset",
        area: "Curated demo estimate",
        confidence: "medium",
        verified: false,
      }),
    ).toBe("Curated demo estimate · Not a market source");
  });
});
