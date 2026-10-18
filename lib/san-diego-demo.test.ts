import { describe, expect, it } from "vitest";
import {
  calculateFeasibility,
  configForFootprint,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
  type RentScenario,
} from "./feasibility";
import { estimateAdu } from "./adu/market-aggregate";
import { parcelConfidence } from "./parcel-confidence";
import { buildReportCsv, buildReportHtml, buildReportText } from "./report";
import { calculateScenarioFeasibility } from "./scenario-restoration";
import { defaultPose } from "./scenario-design";

describe("San Diego demo review regressions", () => {
  it("keeps the FAR-derived coverage proxy qualified in the engine and every export", () => {
    const parcel = getParcelById("coyote-brush");
    const config = defaultAduConfig;
    const result = calculateFeasibility(parcel, config, defaultFinancialAssumptions);
    expect(parcelConfidence(parcel).regulationsEstimated).toBe(true);
    expect(result.regulationsEstimated).toBe(true);
    expect(result.zoningStatus).toBe("Review needed");
    expect(result.warnings.join(" ")).toContain("unverified assumptions");
    for (const buildReport of [buildReportText, buildReportHtml]) {
      const report = buildReport({ parcel, config, result });
      expect(report).toContain("60% assumed max");
      expect(report).toContain("Review needed");
      expect(report).not.toContain("60% max");
    }
    expect(buildReportCsv({ parcel, config, result })).toContain("Regulatory assumptions");
  });

  it.each([400, 600, 800, 1000])("uses the selected bedroom's HUD rent and financials at %i sf", (size) => {
    const parcel = getParcelById("coyote-brush");
    const config = configForFootprint(size, defaultAduConfig);
    for (const rentScenario of ["conservative", "market", "optimistic"] as RentScenario[]) {
      const result = calculateFeasibility(parcel, config, { ...defaultFinancialAssumptions, rentScenario });
      const expected = estimateAdu({ county: "san-diego", size, finish: config.finish, rentScenario })!;
      expect(result.monthlyRent).toBe(expected.monthlyRent);
      expect(result.annualNoi).toBe(expected.annualNoi);
      expect(result.paybackYears).toBe(expected.paybackYears);
      const studioResult = calculateScenarioFeasibility(
        parcel, config, { ...defaultFinancialAssumptions, rentScenario }, defaultPose(parcel, config),
      );
      expect(studioResult.monthlyRent).toBe(expected.monthlyRent);
      expect(studioResult.annualNoi).toBe(expected.annualNoi);
      expect(studioResult.paybackYears).toBe(expected.paybackYears);
    }
  });

  it("preserves explicit rent overrides for the HUD demo", () => {
    const result = calculateFeasibility(
      getParcelById("coyote-brush"),
      configForFootprint(400, defaultAduConfig),
      defaultFinancialAssumptions,
      { conservative: 1800, market: 2000, optimistic: 2200 },
    );
    expect(result.monthlyRent).toBe(1800);
  });
});
