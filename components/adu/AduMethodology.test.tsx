import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AduMethodology } from "./AduMethodology";
import { countyMarketAggregate } from "@/lib/adu/market-aggregate";
import { defaultFinancialAssumptions, formatCurrency } from "@/lib/feasibility";
import { resolveStaticMarket } from "@/lib/server/market/static-market";

describe("AduMethodology", () => {
  it("shows the same 600 sq ft San Diego County figures the cost guides compute", () => {
    const { container } = render(<AduMethodology />);
    const row = countyMarketAggregate("san-diego")?.rows.find((entry) => entry.size === 600);
    expect(row).toBeDefined();
    if (!row) return;
    const example = container.querySelector('section[aria-labelledby="method-example"]');
    expect(example).not.toBeNull();
    const table = within(example as HTMLElement);
    expect(
      table.getByText(`${formatCurrency(row.costLow)}–${formatCurrency(row.costHigh)}`),
    ).toBeInTheDocument();
    expect(table.getByText(formatCurrency(row.monthlyRent))).toBeInTheDocument();
    expect(table.getByText(formatCurrency(row.annualNoi))).toBeInTheDocument();
    expect(table.getByText(`${row.paybackYears.toFixed(1)} years`)).toBeInTheDocument();
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

  it("discloses the Studio's regional cost factor and expense ratio instead of claiming 1.0 everywhere", () => {
    const { container } = render(<AduMethodology />);
    const text = container.textContent ?? "";
    const sanDiego = resolveStaticMarket({ lat: 32.7157, lng: -117.1611, state: "CA", county: "San Diego" });
    expect(sanDiego.costMultiplier).not.toBe(1);
    expect(sanDiego.operatingExpenseRatio).toBeDefined();
    expect(text).toContain(`${sanDiego.costMultiplier.toFixed(2)} for San Diego County`);
    expect(text).toContain(
      `${Math.round((sanDiego.operatingExpenseRatio ?? 0) * 1000) / 10}% of gross rent in California`,
    );
    expect(text).not.toContain("stays at 1.0 everywhere");
    expect(screen.getByRole("heading", { name: /How the Studio adjusts the inputs/ })).toBeInTheDocument();
  });

  it("declares Article and BreadcrumbList structured data", () => {
    const { container } = render(<AduMethodology />);
    const types = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]'),
    ).map((script) => JSON.parse(script.textContent ?? "{}")["@type"]);
    expect(types).toEqual(["Article", "BreadcrumbList"]);
  });
});
