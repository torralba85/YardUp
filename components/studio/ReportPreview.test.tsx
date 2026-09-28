import { render, screen } from "@testing-library/react";
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
