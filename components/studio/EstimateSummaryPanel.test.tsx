import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import EstimateSummaryPanel from "./EstimateSummaryPanel";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";

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
