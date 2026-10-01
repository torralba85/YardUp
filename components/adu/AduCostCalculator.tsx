"use client";

import { useState } from "react";
import {
  CALCULATOR_COUNTIES,
  estimateAdu,
} from "@/lib/adu/market-aggregate";
import {
  finishLabels,
  formatCompactCurrency,
  formatCurrency,
  type ExteriorFinish,
  type RentScenario,
} from "@/lib/feasibility";
import { Select } from "@/components/ui/Field";

/** Unit sizes offered by the calculator, in square feet. */
const SIZES = [400, 600, 800, 1000, 1200];

const FINISHES: ExteriorFinish[] = ["lap", "stucco", "cedar", "board"];

const RENT_SCENARIOS: { value: RentScenario; label: string }[] = [
  { value: "conservative", label: "Conservative (HUD rent)" },
  { value: "market", label: "Market (+12%)" },
  { value: "optimistic", label: "Optimistic (+25%)" },
];

/**
 * Interactive ADU cost, rent, and payback calculator for California
 * counties. Firebase-free client island: every figure comes from
 * `estimateAdu`, the same engine and county HUD anchors as the city-page
 * tables, so the calculator and the static tables can never disagree.
 * Server-rendered with its defaults, so the first result is in the HTML.
 */
export function AduCostCalculator() {
  const [county, setCounty] = useState("los-angeles");
  const [size, setSize] = useState(600);
  const [finish, setFinish] = useState<ExteriorFinish>("cedar");
  const [rentScenario, setRentScenario] = useState<RentScenario>("conservative");

  const estimate = estimateAdu({ county, size, finish, rentScenario });
  const countyName =
    CALCULATOR_COUNTIES.find((entry) => entry.slug === county)?.name ?? "";

  return (
    <section
      aria-labelledby="adu-calculator-heading"
      className="border border-lf-hairline p-6 sm:p-8"
    >
      <h2 id="adu-calculator-heading" className="lf-card-heading text-lf-espresso">
        Estimate your ADU
      </h2>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <label className="text-sm font-semibold text-lf-espresso">
          County
          <Select value={county} onChange={(event) => setCounty(event.target.value)}>
            {CALCULATOR_COUNTIES.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold text-lf-espresso">
          Unit size
          <Select value={size} onChange={(event) => setSize(Number(event.target.value))}>
            {SIZES.map((value) => (
              <option key={value} value={value}>
                {value.toLocaleString("en-US")} sq ft
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold text-lf-espresso">
          Exterior finish
          <Select
            value={finish}
            onChange={(event) => setFinish(event.target.value as ExteriorFinish)}
          >
            {FINISHES.map((value) => (
              <option key={value} value={value}>
                {finishLabels[value]}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold text-lf-espresso">
          Rent assumption
          <Select
            value={rentScenario}
            onChange={(event) => setRentScenario(event.target.value as RentScenario)}
          >
            {RENT_SCENARIOS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </Select>
        </label>
      </form>

      {estimate ? (
        <dl className="mt-8 grid gap-6 sm:grid-cols-[1.6fr_1fr_1fr]" aria-live="polite">
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-lf-muted">Build cost</dt>
            <dd className="mt-1 whitespace-nowrap font-display text-2xl font-bold tabular-nums text-lf-espresso">
              {formatCompactCurrency(estimate.costLow)}–{formatCompactCurrency(estimate.costHigh)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-lf-muted">Rent per month</dt>
            <dd className="mt-1 whitespace-nowrap font-display text-2xl font-bold tabular-nums text-lf-espresso">
              {formatCurrency(estimate.monthlyRent)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-lf-muted">Simple payback</dt>
            <dd className="mt-1 whitespace-nowrap font-display text-2xl font-bold tabular-nums text-lf-espresso">
              {estimate.paybackYears.toFixed(1)} years
            </dd>
          </div>
        </dl>
      ) : null}
      {estimate ? (
        <p className="lf-body mt-4 text-sm text-lf-muted">
          A {size.toLocaleString("en-US")} sq ft ADU in {countyName} nets about{" "}
          {formatCurrency(estimate.annualNoi)} a year after operating costs. These
          are countywide estimates, not a quote for your lot.
        </p>
      ) : null}
    </section>
  );
}
