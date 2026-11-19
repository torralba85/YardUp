import { describe, expect, it } from "vitest";
import { configForInspirationItem, inspirationItems } from "./inspiration-data";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
} from "./feasibility";
import { defaultPose, isValidAduConfig } from "./scenario";
import { serializeScenarioParams } from "./scenario-url";

describe("inspiration data layer", () => {
  it("contains all 6 templates", () => {
    expect(inspirationItems.length).toBe(6);
  });

  it("verifies properties are correctly typed", () => {
    const item = inspirationItems[0];
    expect(item.id).toBe("canyon-courtyard");
    expect(item.sqft).toBe(640);
    expect(item.roof).toBe("shed");
    expect(item.finish).toBe("cedar");
    expect(item.imagePath).toBe("/inspiration/catalogue/courtyard-studio.webp");
  });
});

describe("configForInspirationItem", () => {
  // Every concept must produce a config that passes validation. Four of the six
  // used to fail it: their areas (640, 520, 780, 704) are absent from the
  // 400/600/800/1000 footprint option list, so the old handler left `footprint`
  // snapped to 600 while applying the concept's real dimensions.
  it.each(inspirationItems.map((item) => [item.id, item] as const))(
    "produces a valid config for %s",
    (_id, item) => {
      const applied = configForInspirationItem(item, defaultAduConfig);
      expect(isValidAduConfig(applied)).toBe(true);
      expect(applied.footprint).toBe(item.width * item.length);
      expect(applied.width).toBe(item.width);
      expect(applied.length).toBe(item.length);
      expect(applied.roof).toBe(item.roof);
      expect(applied.finish).toBe(item.finish);
    },
  );

  // The validity guard above is not academic: an invalid config makes the
  // studio's URL-sync effect bail, which is how the applied design got lost on
  // reload. Serializing is the step that used to be unreachable.
  it.each(inspirationItems.map((item) => [item.id, item] as const))(
    "keeps %s serializable into a shareable scenario URL",
    (_id, item) => {
      const config = configForInspirationItem(item, defaultAduConfig);
      const query = serializeScenarioParams({
        parcelId: "oak-street",
        config,
        assumptions: defaultFinancialAssumptions,
        pose: defaultPose(getParcelById("oak-street"), config),
        version: 2,
        heightConvention: "wall",
      });
      const params = new URLSearchParams(query);
      expect(Number(params.get("size"))).toBe(item.width * item.length);
      expect(Number(params.get("w"))).toBe(item.width);
      expect(Number(params.get("l"))).toBe(item.length);
    },
  );

  it("preserves fields the concept does not specify", () => {
    const base = { ...defaultAduConfig, height: 11, includeOpenings: false };
    const applied = configForInspirationItem(inspirationItems[0], base);
    expect(applied.height).toBe(11);
    expect(applied.includeOpenings).toBe(false);
  });
});
