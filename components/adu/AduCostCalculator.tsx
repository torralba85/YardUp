"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CALCULATOR_COUNTIES,
  estimateAdu,
} from "@/lib/adu/market-aggregate";
import {
  defaultFinancialAssumptions,
  finishLabels,
  formatCompactCurrency,
  formatCurrency,
  type ExteriorFinish,
  type RentScenario,
} from "@/lib/feasibility";
import { Input, Select } from "@/components/ui/Field";
import { stashAddressQuery } from "@/lib/address-handoff";
import { trackEvent } from "@/lib/analytics/gtag";
import { aduCtaEvent } from "@/lib/adu/types";

/** Unit sizes offered by the calculator, in square feet. */
const SIZES = [400, 600, 800, 1000, 1200];

const FINISHES: ExteriorFinish[] = ["lap", "stucco", "cedar", "board"];

const RENT_SCENARIOS: { value: RentScenario; label: string }[] = [
  { value: "conservative", label: "Conservative (HUD rent)" },
  { value: "market", label: "Market (+12%)" },
  { value: "optimistic", label: "Optimistic (+25%)" },
];

/**
 * Interactive ADU cost, rent, and payback calculator for California counties.
 *
 * Firebase-free client island with itemized budget breakdown:
 * - Structure construction (hard cost) and soft costs (18% design & permit
 *   allowance) are itemized from the model without double counting.
 * - Site work and financing are labeled unpriced until an owner replaces an
 *   allowance or enters site-specific quotes.
 * - An integrated free address check sits directly beside the result so
 *   visitors can test their actual parcel in 3D.
 */
export function AduCostCalculator({
  initialCounty = "los-angeles",
  showAddressCheck = true,
}: {
  /** County slug from `CALCULATOR_COUNTIES` to start on, e.g. on a county cost page. */
  initialCounty?: string;
  /** Whether to render the parcel address lookup beside the result. */
  showAddressCheck?: boolean;
} = {}) {
  const router = useRouter();
  const [county, setCounty] = useState(initialCounty);
  const [size, setSize] = useState(600);
  const [finish, setFinish] = useState<ExteriorFinish>("cedar");
  const [rentScenario, setRentScenario] = useState<RentScenario>("conservative");

  // Custom quote overrides
  const [customHardCost, setCustomHardCost] = useState<string>("");
  const [customSoftCost, setCustomSoftCost] = useState<string>("");
  const [customSiteWork, setCustomSiteWork] = useState<string>("");
  const [customFinancing, setCustomFinancing] = useState<string>("");
  const [showQuoteInputs, setShowQuoteInputs] = useState(false);

  // Address check input
  const [address, setAddress] = useState("");

  const estimate = estimateAdu({ county, size, finish, rentScenario });
  const countyName =
    CALCULATOR_COUNTIES.find((entry) => entry.slug === county)?.name ?? "";

  // Base hard cost allowance: size * costPerSqft + openings ($9,000)
  const baseCostPerSqft = defaultFinancialAssumptions.costPerSqft[finish];
  const openingPremium = 9000;
  const hardCostAllowance = size * baseCostPerSqft + openingPremium;
  const softCostAllowance = Math.round(hardCostAllowance * 0.18);

  // Parse user quote inputs
  const parsedHardCost = customHardCost.trim()
    ? Number(customHardCost.replace(/[^0-9]/g, ""))
    : null;
  const parsedSoftCost = customSoftCost.trim()
    ? Number(customSoftCost.replace(/[^0-9]/g, ""))
    : null;
  const parsedSiteWork = customSiteWork.trim()
    ? Number(customSiteWork.replace(/[^0-9]/g, ""))
    : null;
  const parsedFinancing = customFinancing.trim()
    ? Number(customFinancing.replace(/[^0-9]/g, ""))
    : null;

  const hasCustomQuotes =
    (parsedHardCost !== null && !isNaN(parsedHardCost)) ||
    (parsedSoftCost !== null && !isNaN(parsedSoftCost)) ||
    (parsedSiteWork !== null && !isNaN(parsedSiteWork)) ||
    (parsedFinancing !== null && !isNaN(parsedFinancing));

  const effectiveHardCost =
    parsedHardCost !== null && !isNaN(parsedHardCost)
      ? parsedHardCost
      : hardCostAllowance;

  const effectiveSoftCost =
    parsedSoftCost !== null && !isNaN(parsedSoftCost)
      ? parsedSoftCost
      : parsedHardCost !== null && !isNaN(parsedHardCost)
        ? Math.round(parsedHardCost * 0.18)
        : softCostAllowance;

  const effectiveSiteWork =
    parsedSiteWork !== null && !isNaN(parsedSiteWork) ? parsedSiteWork : 0;

  const effectiveFinancing =
    parsedFinancing !== null && !isNaN(parsedFinancing) ? parsedFinancing : 0;

  const totalBudgetMid =
    effectiveHardCost +
    effectiveSoftCost +
    effectiveSiteWork +
    effectiveFinancing;

  const totalCostLow = hasCustomQuotes
    ? Math.round((totalBudgetMid * 0.92) / 1000) * 1000
    : estimate
      ? estimate.costLow
      : Math.round((totalBudgetMid * 0.92) / 1000) * 1000;

  const totalCostHigh = hasCustomQuotes
    ? Math.round((totalBudgetMid * 1.15) / 1000) * 1000
    : estimate
      ? estimate.costHigh
      : Math.round((totalBudgetMid * 1.15) / 1000) * 1000;

  const effectivePaybackYears =
    estimate && estimate.annualNoi > 0
      ? Number((totalBudgetMid / estimate.annualNoi).toFixed(1))
      : estimate?.paybackYears ?? 0;

  function resetQuotes() {
    setCustomHardCost("");
    setCustomSoftCost("");
    setCustomSiteWork("");
    setCustomFinancing("");
  }

  function handleAddressSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;
    trackEvent(aduCtaEvent("calculator"), { city_slug: county });
    stashAddressQuery(trimmed);
    router.push("/studio");
  }

  return (
    <section
      aria-labelledby="adu-calculator-heading"
      className="border border-lot-line p-6 sm:p-8"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="adu-calculator-heading" className="lf-card-heading text-lot-ink">
          Estimate your ADU
        </h2>
        {hasCustomQuotes ? (
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-lot-orange-ink">
            Custom quotes applied
          </span>
        ) : null}
      </div>

      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="text-sm font-semibold text-lot-ink">
          County
          <Select
            className="mt-1 block"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
          >
            {CALCULATOR_COUNTIES.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold text-lot-ink">
          Unit size
          <Select
            className="mt-1 block"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          >
            {SIZES.map((value) => (
              <option key={value} value={value}>
                {value.toLocaleString("en-US")} sq ft
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold text-lot-ink">
          Exterior finish
          <Select
            className="mt-1 block"
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
        <label className="text-sm font-semibold text-lot-ink">
          Rent assumption
          <Select
            className="mt-1 block"
            value={rentScenario}
            onChange={(event) =>
              setRentScenario(event.target.value as RentScenario)
            }
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
        <dl
          className="mt-8 grid gap-6 sm:grid-cols-[1.6fr_1fr_1fr]"
          aria-live="polite"
        >
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-lot-stone">
              {hasCustomQuotes ? "Itemized build cost" : "Build cost"}
            </dt>
            <dd className="mt-1 whitespace-nowrap lf-money-md text-lot-ink">
              {formatCompactCurrency(totalCostLow)}–
              {formatCompactCurrency(totalCostHigh)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-lot-stone">
              Rent per month
            </dt>
            <dd className="mt-1 whitespace-nowrap lf-money-md text-lot-ink">
              {formatCurrency(estimate.monthlyRent)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-lot-stone">
              Simple payback
            </dt>
            <dd className="mt-1 whitespace-nowrap lf-money-md text-lot-ink">
              {effectivePaybackYears.toFixed(1)} years
            </dd>
          </div>
        </dl>
      ) : null}

      {estimate ? (
        <p className="lf-body mt-4 text-sm text-lot-stone">
          A {size.toLocaleString("en-US")} sq ft ADU in {countyName} nets about{" "}
          {formatCurrency(estimate.annualNoi)} a year after operating costs. These
          are countywide estimates, not a quote for your lot.
        </p>
      ) : null}

      {/* Stacked at every width: the calculator sits in a ~36rem article
          column, too narrow to split the breakdown and the address check. */}
      <div className="mt-8 grid gap-8">
        {/* Itemized budget breakdown */}
        <div className="space-y-4">
          <div className="border border-lot-line bg-lot-chalk p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-lot-ink">
                Itemized budget breakdown
              </h3>
              {hasCustomQuotes ? (
                <button
                  type="button"
                  onClick={resetQuotes}
                  className="text-xs font-semibold text-lot-orange-ink underline underline-offset-2 hover:text-lot-ink"
                >
                  Reset to allowances
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-lot-stone">
              Construction and soft costs itemize the model without adding fees
              twice. Site work and financing are unpriced until you have
              site-specific quotes.
            </p>

            <ul className="mt-4 divide-y divide-lot-line text-sm">
              <li className="flex items-start justify-between py-2.5">
                <div>
                  <span className="font-semibold text-lot-ink">
                    Construction (hard costs)
                  </span>
                  <p className="text-xs text-lot-stone">
                    {size} sq ft · {finishLabels[finish]} · openings ($9K)
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-sans font-semibold tabular-nums text-lot-ink">
                    {formatCurrency(effectiveHardCost)}
                  </span>
                  <p className="text-xs text-lot-stone">
                    {parsedHardCost !== null ? "Custom quote" : "Model allowance"}
                  </p>
                </div>
              </li>

              <li className="flex items-start justify-between py-2.5">
                <div>
                  <span className="font-semibold text-lot-ink">
                    Design & permits (soft costs)
                  </span>
                  <p className="text-xs text-lot-stone">
                    18% allowance for architectural plans & municipal fees
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-sans font-semibold tabular-nums text-lot-ink">
                    {formatCurrency(effectiveSoftCost)}
                  </span>
                  <p className="text-xs text-lot-stone">
                    {parsedSoftCost !== null ? "Custom quote" : "18% allowance"}
                  </p>
                </div>
              </li>

              <li className="flex items-start justify-between py-2.5">
                <div>
                  <span className="font-semibold text-lot-ink">Site work</span>
                  <p className="text-xs text-lot-stone">
                    Grading, utility trenching, tie-ins, foundation prep
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-sans font-semibold tabular-nums text-lot-ink">
                    {parsedSiteWork !== null
                      ? formatCurrency(effectiveSiteWork)
                      : "Unpriced"}
                  </span>
                  <p className="text-xs text-lot-stone">
                    {parsedSiteWork !== null
                      ? "Custom quote"
                      : "Site-specific"}
                  </p>
                </div>
              </li>

              <li className="flex items-start justify-between py-2.5">
                <div>
                  <span className="font-semibold text-lot-ink">
                    Financing & loan costs
                  </span>
                  <p className="text-xs text-lot-stone">
                    Interest during build, origination, closing
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-sans font-semibold tabular-nums text-lot-ink">
                    {parsedFinancing !== null
                      ? formatCurrency(effectiveFinancing)
                      : "Unpriced"}
                  </span>
                  <p className="text-xs text-lot-stone">
                    {parsedFinancing !== null
                      ? "Custom quote"
                      : "Loan-dependent"}
                  </p>
                </div>
              </li>

              <li className="flex items-baseline justify-between pt-3 font-semibold">
                <span className="text-lot-ink">Itemized total midpoint</span>
                <span className="font-sans text-base tabular-nums text-lot-ink">
                  {formatCurrency(totalBudgetMid)}
                </span>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-lot-line">
              <button
                type="button"
                onClick={() => setShowQuoteInputs(!showQuoteInputs)}
                className="text-xs font-semibold text-lot-ink underline underline-offset-2 hover:text-lot-orange-ink"
              >
                {showQuoteInputs
                  ? "Hide quote replacement fields"
                  : "Replace allowance with a real quote"}
              </button>

              {showQuoteInputs ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-2">
                  <label className="text-xs font-semibold text-lot-ink">
                    Construction quote ($)
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder={formatCurrency(hardCostAllowance)}
                      value={customHardCost}
                      onChange={(event) =>
                        setCustomHardCost(event.target.value)
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs font-semibold text-lot-ink">
                    Design & permits quote ($)
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder={formatCurrency(softCostAllowance)}
                      value={customSoftCost}
                      onChange={(event) =>
                        setCustomSoftCost(event.target.value)
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs font-semibold text-lot-ink">
                    Site work quote ($)
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Unpriced (enter amount)"
                      value={customSiteWork}
                      onChange={(event) =>
                        setCustomSiteWork(event.target.value)
                      }
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs font-semibold text-lot-ink">
                    Financing quote ($)
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Unpriced (enter amount)"
                      value={customFinancing}
                      onChange={(event) =>
                        setCustomFinancing(event.target.value)
                      }
                      className="mt-1"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Free address check below the breakdown */}
        {showAddressCheck ? (
          <div className="border border-lot-line bg-lot-chalk p-5 sm:p-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-lot-stone">
                Parcel-Specific Check
              </span>
              <h3 className="font-display text-xl font-semibold text-lot-ink mt-1">
                Free address check
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-lot-stone">
                Countywide tools can&apos;t check lot boundaries or setbacks.
                Enter your California address to see property lines, base-zone
                setbacks, and a placed ADU in 3D.
              </p>
            </div>

            <form onSubmit={handleAddressSubmit} className="mt-5 space-y-3">
              <label htmlFor="calculator-address-input" className="sr-only">
                Your California street address
              </label>
              <Input
                id="calculator-address-input"
                type="text"
                autoComplete="street-address"
                placeholder="123 Main St, San Diego, CA"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="bg-lot-surface"
              />
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink motion-safe:transition hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
              >
                Check my address free
              </button>
              <p className="text-xs text-lot-stone text-center">
                Free first search · No account or credit card needed
              </p>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
