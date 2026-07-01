// lib/studio-plates.test.ts
import { describe, expect, it } from "vitest";
import {
  PLATES,
  verdictTick,
  derivePlateStatuses,
  type StudioPlate,
} from "./studio-plates";

describe("studio-plates", () => {
  it("declares the four plates in survey order", () => {
    expect(PLATES.map((p) => p.id)).toEqual<StudioPlate[]>([
      "lot",
      "build",
      "return",
      "record",
    ]);
    expect(PLATES.map((p) => p.numeral)).toEqual(["I", "II", "III", "IV"]);
    expect(PLATES.find((p) => p.id === "build")?.optional).toBe(true);
  });

  it("maps a verdict to a plate tick", () => {
    expect(verdictTick("Likely Feasible")).toBe("eligible");
    expect(verdictTick("Needs Review")).toBe("review");
    expect(verdictTick("Unlikely")).toBe("unlikely");
  });

  it("derives per-plate status from verdict and progress", () => {
    const s = derivePlateStatuses({
      verdict: "Likely Feasible",
      hasBuild: false,
      reportReady: true,
    });
    expect(s.lot).toBe("eligible");
    expect(s.return).toBe("eligible");
    expect(s.build).toBe("pending"); // optional, not yet configured
    expect(s.record).toBe("ready");
  });

  it("marks build eligible once a build is configured", () => {
    const s = derivePlateStatuses({
      verdict: "Needs Review",
      hasBuild: true,
      reportReady: false,
    });
    expect(s.build).toBe("eligible");
    expect(s.lot).toBe("review");
    expect(s.record).toBe("pending");
  });
});
