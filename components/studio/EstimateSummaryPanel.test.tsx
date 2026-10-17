import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EstimateSummaryPanel from "./EstimateSummaryPanel";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";
import { buildCashFlowProForma, formatSignedRange } from "@/lib/certificate-pro-forma";

const compliant = {
  ...calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions),
  zoningStatus: "Compliant" as const,
};

it("names the rendered verdict, not the coverage check, when placement needs review", () => {
  // Coverage passes, but the concept overlaps the house: the Studio says Needs Review.
  render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
    feasibilityStatus="review_needed" onGenerateReport={vi.fn()} />);
  expect(screen.getByText("Compliant")).toBeInTheDocument();
  expect(screen.getByText("Needs Review")).toBeInTheDocument();
  expect(screen.queryByText("Likely Feasible")).not.toBeInTheDocument();
  expect(screen.queryByText("Fits model")).not.toBeInTheDocument();
});

it("shows Likely Feasible only for an eligible rendered verdict", () => {
  render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
    feasibilityStatus="eligible" onGenerateReport={vi.fn()} />);
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

    expect(screen.getByText("Leveraged monthly cash flow")).toBeInTheDocument();
    expect(screen.getByText("Locked in the certificate")).toBeInTheDocument();
    expect(screen.queryByText(/[+−]\$\d/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unlock cash flow" }));
    expect(onGenerateReport).toHaveBeenCalledTimes(1);
  });

  it("disables the teaser while the purchase is busy", () => {
    render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} reportCtaBusy />);
    expect(screen.getByRole("button", { name: "Unlock cash flow" })).toBeDisabled();
  });

  it("shows the HELOC result, sign included, and its break-even rent once purchased", () => {
    const heloc = buildCashFlowProForma(compliant).scenarios[0];
    render(<EstimateSummaryPanel parcelName="Oak Street" result={compliant}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} certificateUnlocked />);

    expect(screen.getByText(formatSignedRange(heloc.netLow, heloc.netHigh))).toBeInTheDocument();
    expect(screen.getByText(/Breaks even at \$[\d,]+–\$[\d,]+\/mo rent/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unlock cash flow" })).not.toBeInTheDocument();
  });
});

describe("750 sq ft impact-fee row", () => {
  const sized = (aduSqft: number) => ({ ...compliant, aduSqft });

  it("is hidden where California's rule does not apply", () => {
    render(<EstimateSummaryPanel parcelName="Oak Street" result={sized(800)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} />);
    expect(screen.queryByText("Size threshold alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/750 sq ft/)).not.toBeInTheDocument();
  });

  it.each([749, 750])("confirms the exemption at %i sq ft", (sqft) => {
    render(<EstimateSummaryPanel parcelName="Lot" result={sized(sqft)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} feeJurisdiction="california" />);
    expect(screen.getByText("Under the 750 sq ft impact-fee limit")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`At ${sqft} sq ft, this layout is within`))).toBeInTheDocument();
  });

  it("alerts above the limit and names the trim that avoids it", () => {
    render(<EstimateSummaryPanel parcelName="Lot" result={sized(800)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} feeJurisdiction="california" />);
    expect(screen.getByText("Size threshold alert")).toBeInTheDocument();
    expect(screen.getByText(/crosses the 750 sq ft SB 13 impact-fee exemption limit/)).toBeInTheDocument();
    expect(screen.getByText(/Trimming 50 sq ft of footprint keeps it under/)).toBeInTheDocument();
  });

  it("notes San Diego's own DIF exemption instead of promising city impact fees", () => {
    render(<EstimateSummaryPanel parcelName="Lot" result={sized(800)}
      feasibilityStatus="eligible" onGenerateReport={vi.fn()} feeJurisdiction="san-diego" />);
    expect(screen.getByText(/exempts a lot's first two ADUs from its own impact fees/)).toBeInTheDocument();
    expect(screen.queryByText(/in proportion to the main house/)).not.toBeInTheDocument();
  });
});
