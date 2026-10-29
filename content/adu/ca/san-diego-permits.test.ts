import { describe, expect, it } from "vitest";
import data from "./san-diego-permits.json";
import { permitStudyCsv, SAN_DIEGO_PERMIT_STUDY as study } from "./san-diego-permits";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("San Diego ADU permit study aggregate", () => {
  it("adds up: years and planning areas both reproduce the study totals", () => {
    for (const key of ["approvals", "units", "aduUnits", "jaduUnits", "bonusAduUnits", "affordableAduUnits"] as const) {
      expect(sum(study.byYear.map((row) => row[key]))).toBe(study.totals[key]);
    }
    expect(study.unmatched).toBe(0);
    expect(sum(study.byArea.map((area) => area.units))).toBe(study.totals.units);
    expect(sum(study.byArea.map((area) => area.approvals))).toBe(study.totals.approvals);
  });

  it("keeps each summary internally consistent", () => {
    for (const row of [study.totals, ...study.byYear, ...study.byArea]) {
      expect(row.aduUnits + row.jaduUnits).toBe(row.units);
      expect(sum(Object.values(row.affordableByTier))).toBe(row.affordableAduUnits);
      expect(row.units).toBeGreaterThanOrEqual(row.approvals);
      if (row.approvals < study.minGroup) expect(row.multiUnitShare).toBeNull();
    }
    expect(sum(Object.values(study.approvalsByUnitCount))).toBe(study.totals.approvals);
  });

  it("lists planning areas from most units to fewest", () => {
    const units = study.byArea.map((area) => area.units);
    expect(units).toEqual([...units].sort((a, b) => b - a));
  });

  it("publishes aggregates only, with no property or person fields", () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/HOLDER|ADDRESS|APN|LATITUDE|LONGITUDE|APPROVAL_ID|PROJECT_ID/i);
  });

  it("exports one CSV row per planning area with units by year", () => {
    const lines = permitStudyCsv().trim().split("\n");
    expect(lines).toHaveLength(study.byArea.length + 1);
    expect(lines[0]).toContain("community_planning_area,approvals,units");
    for (const row of study.byYear) expect(lines[0]).toContain(`units_${row.year}`);
    expect(lines[1].startsWith(`${study.byArea[0].name},`)).toBe(true);
  });
});
