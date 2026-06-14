import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PeekMetrics from "./PeekMetrics";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";

const result = calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions, parcelPresets[0].expectedRent);

describe("PeekMetrics", () => {
  it("shows rent, build range, payback and config chips", () => {
    render(<PeekMetrics result={result} config={defaultAduConfig} estimated={false} />);

    expect(screen.getByText("$2,050")).toBeInTheDocument(); // oak-street conservative rent
    expect(screen.getByText(`${result.paybackYears} yrs`)).toBeInTheDocument();
    expect(screen.getByText("600 ft²")).toBeInTheDocument();
    expect(screen.getByText("Cedar")).toBeInTheDocument();
    expect(screen.queryByText(/estimated/i)).not.toBeInTheDocument();
  });

  it("shows the estimated badge in estimated mode", () => {
    render(<PeekMetrics result={result} config={defaultAduConfig} estimated />);
    expect(screen.getByText(/estimated/i)).toBeInTheDocument();
  });

  it("surfaces a live-data error with a retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <PeekMetrics
        result={result}
        config={defaultAduConfig}
        estimated
        parcelError="Live parcel lookup failed."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Live parcel lookup failed.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
