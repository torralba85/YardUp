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

    await userEvent.click(screen.getByRole("checkbox", { name: /I agree/i }));
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
