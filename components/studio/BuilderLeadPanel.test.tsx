import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("submits to the LotFoundry network when no partner covers the lot", async () => {
    const submit = vi.fn().mockResolvedValue({ matchedCount: 2 });
    vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "true");
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

    expect(screen.queryByRole("radiogroup", { name: /Builder network/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /I agree/i }));
    await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ network: "lotfoundry" }));
  });

  describe("GreatBuildz option", () => {
    const laParcel = {
      ...parcelPresets[0],
      address: "123 Elm St, Pasadena, CA 91101",
      city: "Pasadena",
      state: "CA",
      county: "Los Angeles",
    };

    function renderLa(submit = vi.fn()) {
      render(
        <BuilderLeadPanel
          open
          userDefaults={{ name: "Jane Owner", email: "jane@example.com" }}
          parcelKey="elm-street"
          parcel={laParcel}
          config={defaultAduConfig}
          assumptions={defaultFinancialAssumptions}
          result={result}
          onClose={vi.fn()}
          onSubmit={submit}
        />,
      );
      return submit;
    }

    it("is hidden while the launch flag is off", () => {
      renderLa();
      expect(screen.queryByRole("radio", { name: "GreatBuildz" })).not.toBeInTheDocument();
    });

    it("offers both networks, defaults to LotFoundry, and resets consent on switch", async () => {
      vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "true");
      renderLa();

      expect(screen.getByRole("radio", { name: "LotFoundry builders" })).toHaveAttribute("aria-checked", "true");
      await userEvent.click(screen.getByRole("checkbox", { name: /I agree/i }));
      await userEvent.click(screen.getByRole("radio", { name: "GreatBuildz" }));

      const consent = screen.getByRole("checkbox", { name: /send my name.*to GreatBuildz/i });
      expect(consent).not.toBeChecked();
      expect(screen.getByText(/referral fee from GreatBuildz/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Read about GreatBuildz/i })).toHaveAttribute("href", "https://www.greatbuildz.com");
    });

    it("submits a GreatBuildz referral and shows the referral number", async () => {
      vi.stubEnv("NEXT_PUBLIC_GREATBUILDZ_REFERRAL", "true");
      const submit = renderLa(
        vi.fn().mockResolvedValue({ partnerName: "GreatBuildz", referralId: "LFR-ABCDEF12" }),
      );

      await userEvent.click(screen.getByRole("radio", { name: "GreatBuildz" }));
      await userEvent.click(screen.getByRole("checkbox", { name: /I agree/i }));
      await userEvent.click(screen.getByRole("button", { name: /Submit snapshot/i }));

      expect(await screen.findByText(/Sent to GreatBuildz\. Your referral number is LFR-ABCDEF12/)).toBeInTheDocument();
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ network: "greatbuildz" }));
    });
  });
});
