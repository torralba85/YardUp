import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MetricsSummary from "./MetricsSummary";
import type { FeasibilityResult } from "./types";

function baseResult(overrides: Partial<FeasibilityResult> = {}): FeasibilityResult {
  return {
    aduSqft: 600,
    totalFootprint: 1980,
    allowedFootprint: 2000,
    remainingCapacity: 20,
    coveragePercent: 39.6,
    maxCoveragePercent: 40,
    zoningStatus: "Compliant",
    costLow: 231000,
    costHigh: 289000,
    costPerSqftLow: 385,
    costPerSqftHigh: 482,
    monthlyRent: 2050,
    annualNoi: 16605,
    paybackYears: 15.1,
    warnings: [],
    rentBasis: "HUD FMR · King County, WA · 1-bed",
    market: {
      source: "hud-county",
      area: "King County, WA",
      asOf: "HUD FY2026 FMR",
      confidence: "medium",
      verified: true,
    },
    operatingExpenseRatio: 0.315,
    ...overrides,
  };
}

beforeEach(() => {
  // Reduced motion → useCountUp snaps synchronously to its final value.
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList),
  );
});

describe("MetricsSummary", () => {
  it("shows the rent basis citation under monthly rent", () => {
    render(<MetricsSummary result={baseResult()} />);
    expect(screen.getByText("HUD FMR · King County, WA · 1-bed")).toBeInTheDocument();
  });

  it("shows the localized operating expense ratio under annual NOI", () => {
    render(<MetricsSummary result={baseResult()} />);
    expect(screen.getByText("After 31.5% operating expenses")).toBeInTheDocument();
  });

  it("cites the market provenance with source, vintage, and confidence", () => {
    render(<MetricsSummary result={baseResult()} />);
    expect(screen.getByTestId("market-provenance")).toHaveTextContent(
      "HUD fair market rent · King County, WA · fiscal 2026 figures · Medium confidence",
    );
  });

  it("warns when figures come from an unverified benchmark", () => {
    render(
      <MetricsSummary
        result={baseResult({
          rentBasis: "HUD FMR · U.S. average · 1-bed",
          market: {
            source: "national",
            area: "U.S. average",
            asOf: "HUD FY2026 FMR",
            confidence: "low",
            verified: false,
          },
        })}
      />,
    );
    expect(screen.getByTestId("market-provenance")).toHaveTextContent(
      /verified market data unavailable/i,
    );
  });

  it("stays neutral for curated demo presets", () => {
    render(
      <MetricsSummary
        result={baseResult({
          rentBasis: "Curated demo estimate",
          market: {
            source: "preset",
            area: "Curated demo estimate",
            confidence: "medium",
            verified: false,
          },
        })}
      />,
    );
    expect(screen.getByTestId("market-provenance")).not.toHaveTextContent(/unavailable/i);
  });
});
