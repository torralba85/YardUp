import { describe, expect, it } from "vitest";
import { pickGeocodeCandidate } from "./geocode-candidate-picker";

const liveEvalEnabled =
  process.env.RUN_TYPESAFE_EVAL === "true" &&
  Boolean(process.env.TYPESAFE_API_KEY);

const cases = [
  {
    name: "overrides a wrong-city first result for a directional Seattle address",
    query: "1421 NE 88th St, Seattle, WA",
    candidates: [
      "NE 88th Street, Shoreline, King County, Washington, 98155, United States",
      "1421 Northeast 88th Street, Seattle, Washington, 98115, United States",
    ],
    expected: 1,
  },
  {
    name: "treats a unit-bearing query as the same building address",
    query: "100 Pine St Fl 2, San Francisco, CA",
    candidates: [
      "100 Pine Street, San Francisco, California, 94111, United States",
      "100 Pine Avenue, Oakland, California, 94607, United States",
    ],
    expected: 0,
  },
  {
    name: "returns none when nearby or namesake cities are not the typed city",
    query: "88 Main St, Portland, Maine",
    candidates: [
      "88 Main Street, Westbrook, Maine, 04092, United States",
      "88 Main Street, Portland, Oregon, 97204, United States",
    ],
    expected: "none",
  },
  {
    name: "understands Northeast and NE as the same street directional",
    query: "350 NE 72nd St, Seattle, WA",
    candidates: [
      "350 Northeast 72nd Street, Seattle, Washington, 98115, United States",
      "350 North 72nd Street, Seattle, Washington, 98103, United States",
    ],
    expected: 0,
  },
  {
    name: "uses the named state to distinguish same-city-name candidates",
    query: "123 Main St, Springfield, MA",
    candidates: [
      "123 Main Street, Springfield, Illinois, 62701, United States",
      "123 Main Street, Springfield, Massachusetts, 01103, United States",
    ],
    expected: 1,
  },
] as const;

/**
 * Deliberately skipped during normal CI and npm test runs. Execute with
 * npm run test:jev-eval after setting TYPESAFE_API_KEY; each case makes one
 * metered TypeSafe request.
 */
describe.skipIf(!liveEvalEnabled)("live Jev geocode candidate eval", () => {
  for (const testCase of cases) {
    it(testCase.name, async () => {
      const result = await pickGeocodeCandidate(
        testCase.query,
        [...testCase.candidates],
      );

      expect(result).toBe(testCase.expected);
    });
  }
});
