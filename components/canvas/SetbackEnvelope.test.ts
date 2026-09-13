import { describe, expect, it } from "vitest";
import { setbackEnvelopeStyle } from "./SetbackEnvelope";

describe("setbackEnvelopeStyle", () => {
  it("leaves a compliant lot's setback band untinted so the lawn keeps its colour", () => {
    const style = setbackEnvelopeStyle(false);

    expect(style.fill).toBeNull();
    expect(style.line).toEqual({ color: "#65655F", lineWidth: 1.5 });
  });

  it("fills the band in the blocked tone only when the ADU violates the setbacks", () => {
    const style = setbackEnvelopeStyle(true);

    expect(style.fill).toEqual({ color: "#A82D16", opacity: 0.22 });
    expect(style.line).toEqual({ color: "#A82D16", lineWidth: 2.25 });
  });
});
