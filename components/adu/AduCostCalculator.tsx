"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import { formatDecimal, formatNumber } from "@/lib/intl-format";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { stashAddressQuery } from "@/lib/address-handoff";
import { useStorePrice } from "@/lib/commerce/store-price";
import { trackEvent } from "@/lib/analytics/gtag";
import { aduCtaEvent } from "@/lib/adu/types";
import { PRIMARY_CTA_LABEL } from "@/lib/site-nav";
import { AduFinancingCalculator } from "./AduFinancingCalculator";

/** Unit sizes offered by the calculator, in square feet. */
const SIZES = [400, 600, 800, 1000, 1200];

const FINISHES: ExteriorFinish[] = ["lap", "stucco", "cedar", "board"];

const RENT_SCENARIOS: { value: RentScenario; label: string }[] = [
  { value: "conservative", label: "Conservative (HUD rent)" },
  { value: "market", label: "Market (+12%)" },
  { value: "optimistic", label: "Optimistic (+25%)" },
];

const calculatorUrlListeners = new Set<() => void>();
function subscribeCalculatorUrl(listener: () => void): () => void {
  calculatorUrlListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", listener);
  }
  return () => {
    calculatorUrlListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", listener);
    }
  };
}
function getCalculatorUrlSnapshot(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}
function getServerCalculatorUrlSnapshot(): string {
  return "";
}
function syncCalculatorQuery(updates: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, val] of Object.entries(updates)) {
    url.searchParams.set(key, val);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  calculatorUrlListeners.forEach((listener) => listener());
}

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
  initialCounty = "san-diego",
  showAddressCheck = true,
}: {
  /** County slug from `CALCULATOR_COUNTIES` to start on, e.g. on a county cost page. */
  initialCounty?: string;
  /** Whether to render the parcel address lookup beside the result. */
  showAddressCheck?: boolean;
} = {}) {
  const router = useRouter();
  // Quote the certificate on the channel that will charge it: inside the
  // Android app Play sets (and localizes) the amount, so the Stripe figure is
  // never shown there. No figure is named until an exact price is known.
  const certPrice = useStorePrice("certificate");
  const urlSearch = useSyncExternalStore(
    subscribeCalculatorUrl,
    getCalculatorUrlSnapshot,
    getServerCalculatorUrlSnapshot,
  );
  const searchParams = useMemo(() => new URLSearchParams(urlSearch), [urlSearch]);
  const paramCounty = searchParams.get("county");
  const county =
    paramCounty && CALCULATOR_COUNTIES.some((entry) => entry.slug === paramCounty)
      ? paramCounty
      : initialCounty;
  const rawSize = searchParams.get("size");
  const parsedSize = rawSize !== null ? Number(rawSize) : NaN;
  const size = SIZES.includes(parsedSize) ? parsedSize : 600;
  const paramFinish = searchParams.get("finish") as ExteriorFinish | null;
  const finish: ExteriorFinish =
    paramFinish && FINISHES.includes(paramFinish) ? paramFinish : "cedar";
  const paramRent = searchParams.get("rent") as RentScenario | null;
  const rentScenario: RentScenario =
    paramRent && RENT_SCENARIOS.some((entry) => entry.value === paramRent)
      ? paramRent
      : "conservative";

  // Custom quote overrides
  const [customHardCost, setCustomHardCost] = useState<string>("");
  const [customSoftCost, setCustomSoftCost] = useState<string>("");
  const [customSiteWork, setCustomSiteWork] = useState<string>("");
  const [customFinancing, setCustomFinancing] = useState<string>("");
  const [lastClearedQuotes, setLastClearedQuotes] = useState<{
    hard: string;
    soft: string;
    site: string;
    financing: string;
  } | null>(null);
  const [showQuoteInputs, setShowQuoteInputs] = useState(false);

  // Address check input
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const estimate = estimateAdu({ county, size, finish, rentScenario });
  const countyName =
    CALCULATOR_COUNTIES.find((entry) => entry.slug === county)?.name ?? "";

  // Base hard cost allowance: size * costPerSqft + openings ($9,000)
  const baseCostPerSqft = defaultFinancialAssumptions.costPerSqft[finish];
  const openingPremium = 9000;
  const hardCostAllowance = size * baseCostPerSqft + openingPremium;
  const softCostAllowance = Math.round(hardCostAllowance * 0.18);

  // Parse user quote inputs cleanly: reject non-numeric strings rather than silently coercing to $0
  function parseQuoteField(raw: string): { value: number | null; invalid: boolean } {
    const trimmed = raw.trim();
    if (!trimmed) return { value: null, invalid: false };
    const cleaned = trimmed.replace(/[$,\s]/g, "");
    if (!/^\d+$/.test(cleaned)) return { value: null, invalid: true };
    return { value: Number(cleaned), invalid: false };
  }

  const hardQuote = parseQuoteField(customHardCost);
  const softQuote = parseQuoteField(customSoftCost);
  const siteQuote = parseQuoteField(customSiteWork);
  const financingQuote = parseQuoteField(customFinancing);
  const parsedHardCost = hardQuote.value;
  const parsedSoftCost = softQuote.value;
  const parsedSiteWork = siteQuote.value;
  const parsedFinancing = financingQuote.value;

  const hasCustomQuotes =
    parsedHardCost !== null ||
    parsedSoftCost !== null ||
    parsedSiteWork !== null ||
    parsedFinancing !== null;

  const effectiveHardCost = parsedHardCost ?? hardCostAllowance;

  const effectiveSoftCost =
    parsedSoftCost !== null
      ? parsedSoftCost
      : parsedHardCost !== null
        ? Math.round(parsedHardCost * 0.18)
        : softCostAllowance;

  const effectiveSiteWork = parsedSiteWork ?? 0;

  const effectiveFinancing = parsedFinancing ?? 0;

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
    setLastClearedQuotes({
      hard: customHardCost,
      soft: customSoftCost,
      site: customSiteWork,
      financing: customFinancing,
    });
    setCustomHardCost("");
    setCustomSoftCost("");
    setCustomSiteWork("");
    setCustomFinancing("");
  }

  function undoResetQuotes() {
    if (!lastClearedQuotes) return;
    setCustomHardCost(lastClearedQuotes.hard);
    setCustomSoftCost(lastClearedQuotes.soft);
    setCustomSiteWork(lastClearedQuotes.site);
    setCustomFinancing(lastClearedQuotes.financing);
    setLastClearedQuotes(null);
  }

  function handleAddressSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setAddressError("Enter a California street address to check your lot.");
      addressInputRef.current?.focus();
      return;
    }
    setAddressError(null);
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
            name="county"
            autoComplete="off"
            className="mt-1 block"
            value={county}
            onChange={(event) => {
              syncCalculatorQuery({ county: event.target.value });
            }}
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
            name="size"
            autoComplete="off"
            className="mt-1 block"
            value={size}
            onChange={(event) => {
              syncCalculatorQuery({ size: event.target.value });
            }}
          >
            {SIZES.map((value) => (
              <option key={value} value={value}>
                {formatNumber(value)}&nbsp;sq&nbsp;ft
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-semibold text-lot-ink">
          Exterior finish
          <Select
            name="finish"
            autoComplete="off"
            className="mt-1 block"
            value={finish}
            onChange={(event) => {
              syncCalculatorQuery({ finish: event.target.value });
            }}
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
            name="rentScenario"
            autoComplete="off"
            className="mt-1 block"
            value={rentScenario}
            onChange={(event) => {
              syncCalculatorQuery({ rent: event.target.value });
            }}
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
              {formatDecimal(effectivePaybackYears, 1)}&nbsp;years
            </dd>
          </div>
        </dl>
      ) : null}

      {estimate ? (
        <p className="lf-body mt-4 text-sm text-lot-stone">
          A {formatNumber(size)}&nbsp;sq&nbsp;ft ADU in {countyName} nets about{" "}
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
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
              ) : lastClearedQuotes ? (
                <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-lot-stone">
                  <span>Quotes reset.</span>
                  <Button type="button" variant="ghost" size="xs" onClick={undoResetQuotes}>
                    Undo
                  </Button>
                </div>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-lot-stone">
              Construction and soft costs itemize the model without adding fees
              twice. Site work and financing are unpriced until you have
              site-specific quotes.
            </p>

            <ul className="mt-4 divide-y divide-lot-line text-sm">
              <li className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-lot-ink">
                    Construction (hard costs)
                  </span>
                  <p className="text-xs text-lot-stone">
                    {formatNumber(size)}&nbsp;sq&nbsp;ft · {finishLabels[finish]} · openings ({formatCompactCurrency(openingPremium)})
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-sans font-semibold tabular-nums text-lot-ink">
                    {formatCurrency(effectiveHardCost)}
                  </span>
                  <p className="text-xs text-lot-stone">
                    {parsedHardCost !== null ? "Custom quote" : "Model allowance"}
                  </p>
                </div>
              </li>

              <li className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-lot-ink">
                    Design &amp; permits (soft costs)
                  </span>
                  <p className="text-xs text-lot-stone">
                    18% allowance for architectural plans &amp; municipal fees
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-sans font-semibold tabular-nums text-lot-ink">
                    {formatCurrency(effectiveSoftCost)}
                  </span>
                  <p className="text-xs text-lot-stone">
                    {parsedSoftCost !== null ? "Custom quote" : "18% allowance"}
                  </p>
                </div>
              </li>

              <li className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-lot-ink">Site work</span>
                  <p className="text-xs text-lot-stone">
                    Grading, utility trenching, tie-ins, foundation prep
                  </p>
                </div>
                <div className="shrink-0 text-right">
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

              <li className="flex items-start justify-between gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-lot-ink">
                    Financing &amp; loan costs
                  </span>
                  <p className="text-xs text-lot-stone">
                    Interest during build, origination, closing
                  </p>
                </div>
                <div className="shrink-0 text-right">
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

              <li className="flex items-baseline justify-between gap-4 pt-3 font-semibold">
                <span className="min-w-0 flex-1 text-lot-ink">Itemized total midpoint</span>
                <span className="shrink-0 font-sans text-base tabular-nums text-lot-ink">
                  {formatCurrency(totalBudgetMid)}
                </span>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-lot-line">
              <button
                type="button"
                aria-expanded={showQuoteInputs}
                onClick={() => setShowQuoteInputs(!showQuoteInputs)}
                className="inline-flex min-h-11 items-center text-xs font-semibold text-lot-ink underline underline-offset-2 hover:text-lot-orange-ink"
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
                      name="customHardCost"
                      autoComplete="off"
                      type="text"
                      inputMode="numeric"
                      placeholder={`${formatCurrency(hardCostAllowance)}…`}
                      value={customHardCost}
                      aria-invalid={hardQuote.invalid}
                      aria-describedby={hardQuote.invalid ? "quote-hard-error" : undefined}
                      onChange={(event) => {
                        setCustomHardCost(event.target.value);
                        setLastClearedQuotes(null);
                      }}
                      className="mt-1"
                    />
                    {hardQuote.invalid ? (
                      <span id="quote-hard-error" role="alert" className="mt-1 block font-normal text-status-blocked">
                        Enter whole dollars only (e.g. 210000).
                      </span>
                    ) : null}
                  </label>
                  <label className="text-xs font-semibold text-lot-ink">
                    Design &amp; permits quote ($)
                    <Input
                      name="customSoftCost"
                      autoComplete="off"
                      type="text"
                      inputMode="numeric"
                      placeholder={`${formatCurrency(softCostAllowance)}…`}
                      value={customSoftCost}
                      aria-invalid={softQuote.invalid}
                      aria-describedby={softQuote.invalid ? "quote-soft-error" : undefined}
                      onChange={(event) => {
                        setCustomSoftCost(event.target.value);
                        setLastClearedQuotes(null);
                      }}
                      className="mt-1"
                    />
                    {softQuote.invalid ? (
                      <span id="quote-soft-error" role="alert" className="mt-1 block font-normal text-status-blocked">
                        Enter whole dollars only (e.g. 38000).
                      </span>
                    ) : null}
                  </label>
                  <label className="text-xs font-semibold text-lot-ink">
                    Site work quote ($)
                    <Input
                      name="customSiteWork"
                      autoComplete="off"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. $18,000…"
                      value={customSiteWork}
                      aria-invalid={siteQuote.invalid}
                      aria-describedby={siteQuote.invalid ? "quote-site-error" : undefined}
                      onChange={(event) => {
                        setCustomSiteWork(event.target.value);
                        setLastClearedQuotes(null);
                      }}
                      className="mt-1"
                    />
                    {siteQuote.invalid ? (
                      <span id="quote-site-error" role="alert" className="mt-1 block font-normal text-status-blocked">
                        Enter whole dollars only (e.g. 18000).
                      </span>
                    ) : null}
                  </label>
                  <label className="text-xs font-semibold text-lot-ink">
                    Financing quote ($)
                    <Input
                      name="customFinancing"
                      autoComplete="off"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. $12,000…"
                      value={customFinancing}
                      aria-invalid={financingQuote.invalid}
                      aria-describedby={financingQuote.invalid ? "quote-financing-error" : undefined}
                      onChange={(event) => {
                        setCustomFinancing(event.target.value);
                        setLastClearedQuotes(null);
                      }}
                      className="mt-1"
                    />
                    {financingQuote.invalid ? (
                      <span id="quote-financing-error" role="alert" className="mt-1 block font-normal text-status-blocked">
                        Enter whole dollars only (e.g. 12000).
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {estimate ? (
          <AduFinancingCalculator projectCost={totalBudgetMid} annualNoi={estimate.annualNoi} />
        ) : null}

        {/* Free address check below the breakdown */}
        {showAddressCheck ? (
          <section aria-labelledby="calculator-address-heading" className="border border-lot-line bg-lot-chalk p-5 sm:p-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-lot-stone">
                Parcel-Specific Check
              </span>
              <h3 id="calculator-address-heading" className="font-display text-xl font-semibold text-lot-ink mt-1">
                Free address check
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-lot-stone">
                Countywide tools can&apos;t check lot boundaries or setbacks.
                Enter your California address to see property lines, base-zone
                setbacks, a placed ADU in 3D and an estimated rent range where available.
              </p>
            </div>

            <form onSubmit={handleAddressSubmit} className="mt-5 space-y-3" noValidate>
              <label htmlFor="calculator-address-input" className="block text-sm font-medium text-lot-ink">
                Your California street address
              </label>
              <Input
                ref={addressInputRef}
                id="calculator-address-input"
                name="address"
                type="text"
                autoComplete="street-address"
                placeholder="Street address, city, CA"
                value={address}
                aria-invalid={Boolean(addressError)}
                aria-describedby={addressError ? "calculator-address-error" : undefined}
                onChange={(event) => {
                  setAddress(event.target.value);
                  if (addressError) setAddressError(null);
                }}
                className="bg-lot-surface"
              />
              {addressError ? (
                <p id="calculator-address-error" role="alert" className="text-xs font-semibold text-status-blocked">
                  {addressError}
                </p>
              ) : null}
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-lot-orange px-5 text-sm font-semibold text-lot-ink motion-safe:transition hover:bg-lot-orange-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk"
              >
                {PRIMARY_CTA_LABEL}
              </button>
              <p className="text-xs text-lot-stone text-center">
                Up to 3 free guest searches · No account or credit card needed
              </p>
            </form>
            <dl className="mt-5 border-t border-lot-line pt-4 text-sm">
              <dt className="font-semibold text-lot-ink">
                Certificate of Feasibility{certPrice.exact ? ` · ${certPrice.amountCompact} one-time` : ""}
              </dt>
              <dd className="mt-1 leading-relaxed text-lot-stone">
                Add a shareable report with property-specific build-cost estimates, net income,
                payback, financing scenarios, and fee and permit checks to confirm locally.
              </dd>
            </dl>
            <Link
              href="/sample-certificate/san-diego"
              prefetch={false}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-lot-orange-ink underline underline-offset-4 hover:text-lot-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink"
            >
              View a sample certificate
            </Link>
          </section>
        ) : null}
      </div>
    </section>
  );
}
