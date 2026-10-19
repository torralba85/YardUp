import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import { HAPTIC_PATTERNS } from "@/lib/haptics";
import EarnStep from "./EarnStep";

const parcel = parcelPresets[0];
const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);

function stubVibrate() {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: vibrate,
  });
  return vibrate;
}

function restoreVibrate() {
  Object.defineProperty(navigator, "vibrate", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

describe("EarnStep", () => {
  afterEach(() => {
    restoreVibrate();
  });

  it("fires the reveal haptic exactly once on mount, not again when result changes on rerender", () => {
    const vibrate = stubVibrate();
    const { rerender } = render(
      <EarnStep
        parcelName="1234 Oak Street, Seattle, WA"
        result={result}
        estimated={false}
        onContinue={vi.fn()}
      />,
    );

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.reveal);

    // Simulate a rent recalculation (the user tunes the ADU config) by
    // rerendering the SAME mounted instance with a different result. If the
    // effect's dependency array ever grows to include `result`, this is what
    // would catch it: a naive mount-only test would still pass.
    const recalculated = calculateFeasibility(
      parcel,
      { ...defaultAduConfig, footprint: 800, width: 25, length: 32 },
      defaultFinancialAssumptions,
    );
    rerender(
      <EarnStep
        parcelName="1234 Oak Street, Seattle, WA"
        result={recalculated}
        estimated={false}
        onContinue={vi.fn()}
      />,
    );

    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});


it("identifies the free rent range as monthly", () => {
  render(<EarnStep parcelName="Sample" result={result} estimated={false} onContinue={vi.fn()} />);
  expect(screen.getByText("/mo")).toBeInTheDocument();
});
