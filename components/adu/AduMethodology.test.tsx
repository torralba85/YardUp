import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AduMethodology } from "./AduMethodology";
import { countyMarketAggregate } from "@/lib/adu/market-aggregate";
import { defaultFinancialAssumptions, formatCurrency } from "@/lib/feasibility";

describe("AduMethodology", () => {
  it("shows the same 600 sq ft San Diego County figures the cost guides compute", () => {
    render(<AduMethodology />);
    const row = countyMarketAggregate("san-diego")?.rows.find((entry) => entry.size === 600);
    expect(row).toBeDefined();
    if (!row) return;
    expect(
      screen.getByText(`${formatCurrency(row.costLow)}–${formatCurrency(row.costHigh)}`),
    ).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(row.monthlyRent))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(row.annualNoi))).toBeInTheDocument();
    expect(screen.getByText(`${row.paybackYears.toFixed(1)} years`)).toBeInTheDocument();
  });

  it("states the engine's own soft-cost and operating-expense assumptions", () => {
    const { container } = render(<AduMethodology />);
    const text = container.textContent ?? "";
    const softPercent = Math.round((defaultFinancialAssumptions.softCostMultiplier - 1) * 100);
    expect(text).toContain(`soft-cost allowance of ${softPercent}%`);
    expect(text).toContain(
      `${Math.round(defaultFinancialAssumptions.operatingExpenseRatio * 1000) / 10}% of gross rent`,
    );
    expect(text).toContain("600 and 800 sq ft use the one-bedroom FMR");
  });

  it("declares Article and BreadcrumbList structured data", () => {
    const { container } = render(<AduMethodology />);
    const types = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).map((script) => JSON.parse(script.textContent ?? "{}")["@type"]);
    expect(types).toEqual(["Article", "BreadcrumbList"]);
  });
});
