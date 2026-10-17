import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import type { AIProjectBrief } from "@/lib/ai-types";
import ReportPreview from "./ReportPreview";

const brief: AIProjectBrief = {
  headline: "A workable backyard concept with two review items",
  summary: "The current concept fits the recorded parcel and coverage assumptions.",
  bestFit: "Keep the 600 sf one-bedroom concept and confirm utility routing.",
  risks: [
    { label: "Utility route", level: "medium", explanation: "Confirm the sewer path." },
  ],
  permitTrack: {
    name: "Washington ministerial ADU review",
    type: "ministerial",
    basis: "Typical administrative review for a qualifying ADU.",
  },
  stages: [
    {
      name: "Pre-application check",
      description: "Confirm the submittal set.",
      estWeeksLow: 1,
      estWeeksHigh: 2,
      status: "review",
    },
    {
      name: "Plan review",
      description: "Jurisdiction review of the application.",
      estWeeksLow: 4,
      estWeeksHigh: 7,
      status: "clear",
    },
  ],
  totalEstWeeksLow: 5,
  totalEstWeeksHigh: 9,
  recommendedNextSteps: ["Confirm utilities.", "Prepare the plan set.", "Submit for review."],
  disclaimer: "AI-assisted planning estimate only; not an approval guarantee.",
};

describe("ReportPreview", () => {
  it("opens as a viewport modal dialog so studio flex layout cannot clip it", () => {
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );

    render(
      <ReportPreview
        parcelName={`${parcel.address}, ${parcel.city}`}
        result={result}
        feasibilityStatus="eligible"
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /certificate of feasibility/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("id", "export");
    // Viewport modal: max-height + internal scroll so content is never clipped.
    expect(dialog.className).toMatch(/max-h/);
    expect(dialog.className).toMatch(/overflow/);
    // Overlay is portaled to body so studio overflow cannot trap it.
    expect(dialog.closest("body")).toBe(document.body);
  });

  it("renders the AI parcel assessment and approval timeline inside one certificate", () => {
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );

    render(
      <ReportPreview
        parcelName={`${parcel.address}, ${parcel.city}`}
        result={result}
        feasibilityStatus="eligible"
        projectBrief={brief}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Parcel & Permit Brief" })).toBeInTheDocument();
    expect(screen.getByText(brief.headline)).toBeInTheDocument();
    expect(screen.getByText("Utility route")).toBeInTheDocument();
    expect(screen.getByText("Washington ministerial ADU review")).toBeInTheDocument();
    expect(screen.getByText("Pre-application check")).toBeInTheDocument();
    expect(screen.getByText(/5–9/)).toBeInTheDocument();
    expect(screen.getByText("Confirm utilities.")).toBeInTheDocument();
  });

  it("renders the error alert and triggers retry when onRetryProjectBrief is provided", () => {
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );
    const handleRetry = vi.fn();

    render(
      <ReportPreview
        parcelName={`${parcel.address}, ${parcel.city}`}
        result={result}
        feasibilityStatus="eligible"
        projectBriefError="AI returned an unreadable brief. Please try again."
        onRetryProjectBrief={handleRetry}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/AI returned an unreadable brief\. Please try again\./);
    expect(alert).toHaveTextContent(/The parcel facts and financial ledger remain available/);

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
    retryButton.click();
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the AI style-matched concept section with photo comparisons and traits", () => {
    const parcel = parcelPresets[0];
    const result = calculateFeasibility(
      parcel,
      defaultAduConfig,
      defaultFinancialAssumptions,
    );

    render(
      <ReportPreview
        parcelName={`${parcel.address}, ${parcel.city}`}
        result={result}
        feasibilityStatus="eligible"
        styleMatchConcept={{
          styleName: "Mid-Century Modern",
          matchPercentage: 91,
          traits: ["Post-and-beam", "Clerestory windows", "Flat roof"],
          conceptUrl: "https://example.com/concept.jpg",
          photoUrl: "https://example.com/home.jpg",
        }}
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    expect(screen.getByText(/AI Style Match/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mid-Century Modern Concept" })).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("style match")).toBeInTheDocument();
    expect(screen.getByText("Post-and-beam")).toBeInTheDocument();
    expect(screen.getByText("Clerestory windows")).toBeInTheDocument();
    expect(screen.getByText("Flat roof")).toBeInTheDocument();

    const conceptImg = screen.getByAltText("Mid-Century Modern Concept");
    expect(conceptImg).toHaveAttribute("src", "https://example.com/concept.jpg");

    const homeImg = screen.getByAltText("Reference Home");
    expect(homeImg).toHaveAttribute("src", "https://example.com/home.jpg");
  });
});

describe("ReportPreview certificate packet", () => {
  const caParcel = { ...parcelPresets[0], city: "Oceanside, CA 92054" };
  const config = { ...defaultAduConfig, footprint: 800, width: 25, length: 32 };
  const result = calculateFeasibility(caParcel, config, defaultFinancialAssumptions);

  function renderPacket(parcel = caParcel) {
    render(
      <ReportPreview
        parcel={parcel}
        parcelName={`${parcel.address}, ${parcel.city}`}
        result={result}
        config={config}
        feasibilityStatus="eligible"
        onClose={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
  }

  it("tables both financing scenarios with the same operating share as the annual ledger", () => {
    renderPacket();
    const table = screen.getByRole("heading", { name: "Leveraged monthly cash-flow pro forma" }).closest("section")!;
    expect(within(table).getByRole("columnheader", { name: "100% financed HELOC" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "20% down construction-to-perm" })).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: "Less operating costs (32.5% of rent)" })).toBeInTheDocument();
    for (const name of [
      "Net monthly cash flow",
      "Principal paid down (equity, year-1 avg)",
      "Rent to break even",
      "Cash in to break even",
    ]) {
      expect(within(table).getByRole("rowheader", { name })).toBeInTheDocument();
    }
    // The stronger option leads the summary and the first column.
    expect(within(table).getByText(/^Best option: 20% down construction-to-perm/)).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader")[1]).toHaveTextContent("20% down construction-to-perm");
  });

  it("audits the 750 sq ft threshold, fees, submittals and modeled height for a California lot", () => {
    renderPacket();
    const audit = screen.getByRole("heading", { name: "750 sq ft impact-fee & permit audit" }).closest("section")!;
    expect(within(audit).getByText("50 sq ft over 750")).toBeInTheDocument();
    expect(within(audit).getByText("Impact fees: 50 sq ft over the exemption")).toBeInTheDocument();
    expect(within(audit).getByText(/^Height:/)).toBeInTheDocument();
    expect(within(audit).getByText("Counter submittal checklist")).toBeInTheDocument();
    expect(within(audit).getByRole("link", { name: /HCD ADU Handbook/ })).toHaveAttribute("target", "_blank");
  });

  it("keeps California rules out of the audit for a lot elsewhere", () => {
    renderPacket(parcelPresets[0]);
    expect(screen.getByRole("heading", { name: "Permit fee & submittal audit" })).toBeInTheDocument();
    expect(screen.queryByText(/SB 13/)).not.toBeInTheDocument();
  });

  it("prints a 12-line RFQ sheet with a checkbox per builder", () => {
    renderPacket();
    const sheet = screen.getByRole("heading", { name: "Contractor bid-leveling checklist" }).closest("section")!;
    expect(sheet.className).toMatch(/print:break-before-page/);
    expect(within(sheet).getAllByRole("rowheader")).toHaveLength(12);
    expect(within(sheet).getAllByRole("checkbox")).toHaveLength(36);
    expect(within(sheet).getByRole("checkbox", { name: /^Builder C includes Final inspection/ })).toBeInTheDocument();
  });
});
