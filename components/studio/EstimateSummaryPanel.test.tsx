import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EstimateSummaryPanel from "./EstimateSummaryPanel";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";
import { buildCashFlowProForma, formatSignedRange, leadScenario } from "@/lib/certificate-pro-forma";

const compliant = {
  ...calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions),
  zoningStatus: "Compliant" as const,
};

it("names the rendered verdict, not the coverage check, when placement needs review", () => {
  // Coverage passes, but the concept overlaps the house: the Studio says Needs Review.
  render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
    feasibilityStatus="review_needed" onGenerateReport={vi.fn()} certificateUnlocked />);
  expect(screen.getByText("Compliant")).toBeInTheDocument();
  expect(screen.getByText("Needs Review")).toBeInTheDocument();
  expect(screen.queryByText("Likely Feasible")).not.toBeInTheDocument();
  expect(screen.queryByText("Fits model")).not.toBeInTheDocument();
});

it("shows Likely Feasible only for an eligible rendered verdict", () => {
  render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
    feasibilityStatus="eligible" onGenerateReport={vi.fn()} certificateUnlocked />);
  expect(screen.getByText("Likely Feasible")).toBeInTheDocument();
});

it("claims no verdict when the rendered verdict is unknown", () => {
  render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
    feasibilityStatus="unknown" onGenerateReport={vi.fn()} />);
  for (const label of ["Likely Feasible", "Needs Review", "Unlikely"]) {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
});

describe("leveraged cash-flow row", () => {
  it("locks the figure behind the certificate and starts the purchase from the teaser", () => {
    const onGenerateReport = vi.fn();
    render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
      feasibilityStatus="eligible" onGenerateReport={onGenerateReport} />);

    expect(screen.getByText("Financed cash flow")).toBeInTheDocument();
    expect(screen.getByText("Financed cash flow locked in the certificate")).toBeInTheDocument();
    expect(screen.queryByText(/[+−]\$\d/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See what’s behind the numbers" }));
    expect(onGenerateReport).toHaveBeenCalledTimes(1);
  });

  it("disables the teaser while the purchase is busy", () => {
    render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} reportCtaBusy />);
    expect(screen.getByRole("button", { name: "See what’s behind the numbers" })).toBeDisabled();
  });

  it("leads with the scenario with higher modeled cash flow, its equity and its path to positive once purchased", () => {
    const lead = leadScenario(buildCashFlowProForma(compliant));
    render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} certificateUnlocked />);

    expect(lead.scenario.id).toBe("construction");
    expect(screen.getByText(formatSignedRange(lead.netLow, lead.netHigh))).toBeInTheDocument();
    expect(screen.getByText(/^Higher modeled monthly cash flow in this example: 20% down construction-to-perm/)).toBeInTheDocument();
    expect(screen.getByText(/pays down about \$142–\$178\/mo of principal in year 1/)).toBeInTheDocument();
    expect(screen.getByText(/Positive across the cost range at \$2,396\/mo rent or with \$92,000 total cash in/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See cash flow in the Certificate" })).not.toBeInTheDocument();
  });
});

describe("750 sq ft impact-fee row", () => {
  const sized = (aduSqft: number) => ({ ...compliant, aduSqft });

  it("is hidden where California's rule does not apply", () => {
    render(<EstimateSummaryPanel parcelName="Oak Street" result={sized(800)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} certificateUnlocked />);
    expect(screen.queryByText("Size threshold alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/750 sq ft/)).not.toBeInTheDocument();
  });

  it.each([749, 750])("confirms the exemption at %i sq ft", (sqft) => {
    render(<EstimateSummaryPanel parcelName="Lot" result={sized(sqft)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} feeJurisdiction="california" certificateUnlocked />);
    expect(screen.getByText("Within the 750 sq ft impact-fee threshold")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`modeled ${sqft} sq ft footprint is within`))).toBeInTheDocument();
  });

  it("asks the homeowner to confirm livable area above the footprint threshold", () => {
    render(<EstimateSummaryPanel parcelName="Lot" result={sized(800)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} feeJurisdiction="california" certificateUnlocked />);
    expect(screen.getByText("Size threshold alert")).toBeInTheDocument();
    expect(screen.getByText(/footprint exceeds 750 sq ft/)).toBeInTheDocument();
    expect(screen.getByText(/Check the interior livable area on your plans/)).toBeInTheDocument();
  });

  it("separates the state and San Diego fee checks", () => {
    render(<EstimateSummaryPanel parcelName="Lot" result={sized(800)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} feeJurisdiction="san-diego" certificateUnlocked />);
    expect(screen.getByText(/confirm state and City of San Diego fees separately/)).toBeInTheDocument();
    expect(screen.queryByText(/in proportion to the main house/)).not.toBeInTheDocument();
  });

  it("formats non-positive payback as '—' in unlocked view instead of Infinity", () => {
    const nonPositive = { ...compliant, annualNoi: 0, paybackYears: Number.POSITIVE_INFINITY };
    render(<EstimateSummaryPanel parcelName="Lot" result={nonPositive}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} certificateUnlocked />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/Infinity/i)).not.toBeInTheDocument();
  });
});
