import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "@/lib/feasibility";
import BuilderLeadPanel from "./BuilderLeadPanel";

const result = {
  aduSqft: 600,
  totalFootprint: 1980,
  allowedFootprint: 2000,
  remainingCapacity: 20,
  coveragePercent: 39.6,
  maxCoveragePercent: 40,
  zoningStatus: "Compliant" as const,
  costLow: 220000,
  costHigh: 270000,
  costPerSqftLow: 367,
  costPerSqftHigh: 450,
  monthlyRent: 2050,
  annualNoi: 16605,
  paybackYears: 15.7,
  warnings: [],
  rentBasis: "Curated demo estimate",
  market: {
    source: "preset" as const,
    area: "Curated demo estimate",
    confidence: "medium" as const,
    verified: false,
  },
  operatingExpenseRatio: 0.325,
};

describe("BuilderLeadPanel", () => {
  it("requires consent before submit", async () => {
    const submit = vi.fn();
    render(
      <BuilderLeadPanel
        open
        userDefaults={{ name: "Jane Owner", email: "jane@example.com" }}
        parcelKey="oak-street"
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        onClose={vi.fn()}
        onSubmit={submit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Consent is required/i);
    expect(submit).not.toHaveBeenCalled();
  });

  it("shows the result beside Submit, after the fields", async () => {
    // The form is taller than most screens; a message at its top was out of view.
    render(
      <BuilderLeadPanel
        open
        userDefaults={{ name: "Jane Owner", email: "jane@example.com" }}
        parcelKey="oak-street"
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const submitButton = screen.getByRole("button", { name: /Submit snapshot/i });
    await userEvent.click(submitButton);

    const alert = screen.getByRole("alert");
    const consent = screen.getByRole("checkbox", { name: /18 or older/i });
    expect(consent.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alert.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("submits validated contact and snapshot", async () => {
    const submit = vi.fn().mockResolvedValue({ matchedCount: 1 });
    render(
      <BuilderLeadPanel
        open
        userDefaults={{ name: "Jane Owner", email: "jane@example.com" }}
        parcelKey="oak-street"
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        assumptions={defaultFinancialAssumptions}
        result={result}
        onClose={vi.fn()}
        onSubmit={submit}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: /18 or older/i }));
    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

    expect(await screen.findByText(/Sent to 1 local builder/i)).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        contact: expect.objectContaining({ email: "jane@example.com" }),
        snapshot: expect.objectContaining({ parcelCity: "Seattle" }),
      }),
    );
  });
});
