import { describe, expect, it } from "vitest";
import { deriveMaxCoverage } from "./zoning-heuristics";
import { residentialZoningCode } from "@/utils/rules/californiaAduRules";

describe("zoning designation heuristics", () => {
  it.each(["NR3", "R-20", "C-2", "M-1", "I-1", "PD", "WAREHOUSE", "NON-RESIDENTIAL", ""])(
    "does not invent a coverage allowance for %s", (code) => {
      expect(deriveMaxCoverage(code)).toBeNull();
    },
  );

  it.each([["[Q]R2-1", 45], ["(T)(Q)R3-1", 50], ["RE40-1", 40], ["R1V2", 40], ["R-4", 55], ["RM-1-1", 55]] as const)(
    "shares residential recognition for %s", (code, coverage) => {
      expect(residentialZoningCode(code)).toBe("yes");
      expect(deriveMaxCoverage(code)).toBe(coverage);
    },
  );

  it("keeps ambiguous codes unknown and negated residential text non-residential", () => {
    expect(residentialZoningCode("PD")).toBe("unknown");
    expect(residentialZoningCode("NON-RESIDENTIAL")).toBe("no");
    expect(residentialZoningCode("WAREHOUSE")).not.toBe("yes");
  });
});
