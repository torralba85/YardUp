import { describe, expect, it } from "vitest";
import { marketBasisLabel } from "./market-basis";

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
