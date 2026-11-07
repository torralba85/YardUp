import { describe, expect, it } from "vitest";
import { STUDIO_STEPS, deriveStepStates, type StudioStep } from "./studio-steps";

describe("STUDIO_STEPS", () => {
  it("is the ordered funnel spine", () => {
    expect(STUDIO_STEPS.map((s) => s.id)).toEqual([
      "lot",
      "feasibility",
      "design",
      "certificate",
      "builders",
    ]);
  });

  it("marks only the certificate, where the homeowner pays, with the revenue $", () => {
    // Builders is free to the homeowner (builders pay), so a $ there read as a cost.
    const revenue = STUDIO_STEPS.filter((s) => s.revenue).map((s) => s.id);
    expect(revenue).toEqual(["certificate"]);
  });

  it("gates the revenue steps behind a resolved parcel", () => {
    const gated = STUDIO_STEPS.filter((s) => s.requiresParcel).map((s) => s.id);
    expect(gated).toEqual(["certificate", "builders"]);
  });
});

describe("deriveStepStates", () => {
  const stateFor = (steps: ReturnType<typeof deriveStepStates>, id: StudioStep) =>
    steps.find((s) => s.id === id)!.state;

  it("marks earlier steps done, the active step current, and later steps upcoming (parcel resolved)", () => {
    const steps = deriveStepStates("feasibility", { hasParcel: true });
    expect(stateFor(steps, "lot")).toBe("done");
    expect(stateFor(steps, "feasibility")).toBe("current");
    expect(stateFor(steps, "design")).toBe("upcoming");
    expect(stateFor(steps, "certificate")).toBe("upcoming");
    expect(stateFor(steps, "builders")).toBe("upcoming");
  });

  it("locks the revenue steps until a parcel is resolved", () => {
    const steps = deriveStepStates("lot", { hasParcel: false });
    expect(stateFor(steps, "lot")).toBe("current");
    expect(stateFor(steps, "feasibility")).toBe("upcoming");
    expect(stateFor(steps, "certificate")).toBe("locked");
    expect(stateFor(steps, "builders")).toBe("locked");
  });

  it("always reports the active step as current, even a gated one", () => {
    const steps = deriveStepStates("certificate", { hasParcel: false });
    expect(stateFor(steps, "certificate")).toBe("current");
  });

  it("keeps passed gated steps done even when later parcel state is missing", () => {
    const steps = deriveStepStates("builders", { hasParcel: false });
    expect(stateFor(steps, "certificate")).toBe("done");
    expect(stateFor(steps, "builders")).toBe("current");
  });

  it("marks all preceding steps done when deep in the journey", () => {
    const steps = deriveStepStates("design", { hasParcel: true });
    expect(stateFor(steps, "lot")).toBe("done");
    expect(stateFor(steps, "feasibility")).toBe("done");
    expect(stateFor(steps, "design")).toBe("current");
  });
});
