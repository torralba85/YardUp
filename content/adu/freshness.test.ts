import { describe, expect, it } from "vitest";
import { JADU_AS_OF } from "@/content/adu/ca/jadu";
import { ADU_CITIES, ADU_COST_PAGES } from "@/lib/adu/content";

/**
 * Re-verification gate for the ADU program: California ADU law has changed
 * every year since 2024, so every jurisdiction page carries an as-of date
 * and a 90-day review cadence. This test fails the build when a city's
 * figures go stale, forcing a re-verification pass instead of silently
 * serving last year's rules.
 */
const REVIEW_CADENCE_DAYS = 90;

describe("adu re-verification cadence", () => {
  it("keeps every city's as-of date within the 90-day review cadence", () => {
    const now = Date.now();
    for (const city of ADU_CITIES) {
      const ageDays =
        (now - new Date(`${city.asOf}T00:00:00Z`).getTime()) /
        (1000 * 60 * 60 * 24);
      expect(
        ageDays,
        `${city.slug} last verified ${city.asOf} — re-verify against the municipal code`,
      ).toBeLessThanOrEqual(REVIEW_CADENCE_DAYS);
    }
  });

  it("keeps the junior ADU guide within the same 90-day cadence", () => {
    const ageDays =
      (Date.now() - new Date(`${JADU_AS_OF}T00:00:00Z`).getTime()) /
      (1000 * 60 * 60 * 24);
    expect(
      ageDays,
      `JADU guide last checked ${JADU_AS_OF} — re-verify against the HCD handbook and Gov. Code §66333`,
    ).toBeLessThanOrEqual(REVIEW_CADENCE_DAYS);
  });

  it("keeps every cost page's fee copy within the same 90-day cadence", () => {
    const now = Date.now();
    for (const cost of ADU_COST_PAGES) {
      const ageDays =
        (now - new Date(`${cost.asOf}T00:00:00Z`).getTime()) /
        (1000 * 60 * 60 * 24);
      expect(
        ageDays,
        `${cost.slug} cost page fees last checked ${cost.asOf} — re-verify against the fee schedule`,
      ).toBeLessThanOrEqual(REVIEW_CADENCE_DAYS);
    }
  });
});
