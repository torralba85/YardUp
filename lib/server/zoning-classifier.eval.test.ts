import { appendFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  classifyZoning,
  clearZoningCache,
  type ZoningClass,
} from "./zoning-classifier";
import {
  acceptedClasses,
  LABELED_ZONING_CASES,
} from "./zoning-labeled-cases";

const liveEvalEnabled =
  process.env.RUN_TYPESAFE_EVAL === "true" &&
  Boolean(process.env.TYPESAFE_API_KEY);

/**
 * Regression floors, set just under the September 28, 2026 live result (39 of
 * 49 cases in an accepted class; 22 of the 23 confident answers right) so a
 * prompt or model change that makes things worse trips them. They are not
 * accuracy targets: the labels come from the same author as the prompt.
 */
const ACCURACY_FLOOR = 0.75;
const CONFIDENT_PRECISION_FLOOR = 0.9;

interface Scored {
  id: string;
  got?: ZoningClass;
  correct: boolean;
  confident: boolean;
}

const scored: Scored[] = [];

/**
 * Deliberately skipped during normal CI and npm test runs. Execute with
 * npm run test:jev-zoning-eval after setting TYPESAFE_API_KEY; each case makes
 * one metered TypeSafe request. Individual misses do not fail a case (Jev is
 * allowed to be wrong or to decline); the aggregate floors below do. Set
 * ZONING_EVAL_REPORT to a file path to append one JSON line per case (class,
 * confidence, margin, duration) for band tuning.
 */
describe.skipIf(!liveEvalEnabled)("live Jev zoning classification eval", () => {
  beforeAll(() => {
    scored.length = 0;
  });

  for (const testCase of LABELED_ZONING_CASES) {
    it(`${testCase.id}: ${testCase.zoning} (${testCase.state})`, async () => {
      clearZoningCache();

      const result = await classifyZoning(testCase);

      const judgment = result.judgment;
      const accepted = acceptedClasses(testCase);
      scored.push({
        id: testCase.id,
        got: judgment?.zoningClass,
        correct: judgment !== undefined && accepted.includes(judgment.zoningClass),
        confident: judgment?.confident === true,
      });
      const reportPath = process.env.ZONING_EVAL_REPORT;
      if (reportPath) {
        appendFileSync(
          reportPath,
          JSON.stringify({
            id: testCase.id,
            zoning: testCase.zoning,
            state: testCase.state,
            accepted,
            got: judgment?.zoningClass,
            confidence: judgment?.confidence,
            probabilityMargin: judgment?.probabilityMargin,
            confident: judgment?.confident,
            durationMs: result.durationMs,
            model: result.model,
            outcome: result.outcome,
          }) + "\n",
        );
      }

      expect(result.outcome).toBe("classified");
    });
  }

  it("meets the regression floors", () => {
    expect(scored).toHaveLength(LABELED_ZONING_CASES.length);
    const misses = scored
      .filter((s) => !s.correct)
      .map((s) => `${s.id}=${s.got}`)
      .join(", ");

    const accuracy = scored.filter((s) => s.correct).length / scored.length;
    expect(accuracy, `misses: ${misses}`).toBeGreaterThanOrEqual(ACCURACY_FLOOR);

    const confident = scored.filter((s) => s.confident);
    const wrongWhenConfident = confident
      .filter((s) => !s.correct)
      .map((s) => `${s.id}=${s.got}`)
      .join(", ");
    const precision =
      confident.filter((s) => s.correct).length / Math.max(confident.length, 1);
    expect(
      precision,
      `confident but wrong: ${wrongWhenConfident}`,
    ).toBeGreaterThanOrEqual(CONFIDENT_PRECISION_FLOOR);
  });
});
