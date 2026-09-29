import { describe, expect, it } from "vitest";
import { ZONING_CLASSES } from "./zoning-classifier";
import {
  acceptedClasses,
  LABELED_ZONING_CASES,
} from "./zoning-labeled-cases";

describe("labeled zoning cases", () => {
  it("has unique ids and unique designations", () => {
    const ids = LABELED_ZONING_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);

    const designations = LABELED_ZONING_CASES.map((c) =>
      [c.state, c.county, c.zoning, c.description].join("|").toUpperCase(),
    );
    expect(new Set(designations).size).toBe(designations.length);
  });

  it("uses only known classes, and never lists the label as an alternative", () => {
    for (const testCase of LABELED_ZONING_CASES) {
      const accepted = acceptedClasses(testCase);
      expect(accepted[0]).toBe(testCase.label);
      expect(new Set(accepted).size).toBe(accepted.length);
      for (const zoningClass of accepted) {
        expect(ZONING_CLASSES).toContain(zoningClass);
      }
    }
  });

  it("names a state and a designation for every case", () => {
    for (const testCase of LABELED_ZONING_CASES) {
      expect(testCase.state).toMatch(/^[A-Z]{2}$/);
      expect(testCase.zoning.trim()).not.toBe("");
    }
  });

  it("covers every class, including declining to answer", () => {
    const labels = new Set(LABELED_ZONING_CASES.map((c) => c.label));
    for (const zoningClass of ZONING_CLASSES) {
      expect(labels).toContain(zoningClass);
    }
  });
});
