import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import { HAPTIC_PATTERNS } from "@/lib/haptics";
import CheckStep from "./CheckStep";

const parcel = parcelPresets[0];
const result = calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions);

function renderStep(overrides: Partial<Parameters<typeof CheckStep>[0]> = {}) {
  return render(
    <CheckStep
      parcel={parcel}
      parcelName="1234 Oak Street, Seattle, WA"
      result={result}
      config={defaultAduConfig}
      estimated={false}
      onFineTune={vi.fn()}
      onContinue={vi.fn()}
      {...overrides}
    />,
  );
}

function stubVibrate() {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, "vibrate", { configurable: true, writable: true, value: vibrate });
  return vibrate;
}

describe("CheckStep (phone step 2, Rules & fit)", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "vibrate", { configurable: true, writable: true, value: undefined });
  });

  it("reveals the monthly rent range and moves on to Design, not to the paywall", () => {
    const onContinue = vi.fn();
    renderStep({ onContinue });
    expect(screen.getByText("Step 2 · Rules & fit")).toBeInTheDocument();
    expect(screen.getByText("/mo")).toBeInTheDocument();
    // The paywall lives on the Certificate step, as on desktop.
    expect(screen.queryByRole("button", { name: /behind the numbers|checkout|Certificate/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Design your backyard home" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("fires the reveal haptic exactly once on mount, not again when the result changes", () => {
    const vibrate = stubVibrate();
    const { rerender } = renderStep();
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.reveal);

    const recalculated = calculateFeasibility(
      parcel,
      { ...defaultAduConfig, footprint: 800, width: 25, length: 32 },
      defaultFinancialAssumptions,
    );
    rerender(
      <CheckStep
        parcel={parcel}
        parcelName="1234 Oak Street, Seattle, WA"
        result={recalculated}
        config={defaultAduConfig}
        estimated={false}
        onFineTune={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it("keeps an actual layout conflict visible before purchase", () => {
    const blocked = { ...result, placement: { status: "blocked", reasons: [{ message: "The ADU overlaps the modeled house." }] } } as typeof result;
    renderStep({ result: blocked });
    expect(screen.getByText("The ADU overlaps the modeled house.")).toBeInTheDocument();
  });
});
