import type { FeasibilityResult } from "./feasibility";

/**
 * Leveraged monthly cash-flow pro forma recorded in the paid Certificate of
 * Feasibility: the modeled loan payment on the build cost range set against
 * the scenario's rent after operating costs, plus what it would take to break
 * even.
 *
 * Operating costs use the same share of rent as the free estimate's annual
 * net income, so the monthly table and the annual ledger agree. At typical
 * rates a fully financed build often costs more each month than it earns.
 * The terms are not tuned to hide that; instead the pro forma leads with the
 * option closest to positive, shows the principal each payment pays down
 * (equity the owner keeps, not cash), and names the rent or cash in that makes
 * it positive. The terms are fixed, disclosed planning assumptions, not a
 * lender quote.
 *
 * @module certificate-pro-forma
 */

/** One modeled way to pay for the build. */
export interface FinancingScenario {
  id: "heloc" | "construction";
  /** Short name used as a column or row label. */
  label: string;
  /** Share of the build cost that is borrowed (0–1); the rest is cash in. */
  financedShare: number;
  /** Fixed annual rate, e.g. `0.08` for 8.0% APR. */
  annualRate: number;
  /** Fully amortizing term in years. */
  years: number;
}

/**
 * The two scenarios the certificate compares, in display order: the one that
 * usually comes out closer to positive first.
 */
export const FINANCING_SCENARIOS: readonly FinancingScenario[] = [
  {
    id: "construction",
    label: "20% down construction-to-perm",
    financedShare: 0.8,
    annualRate: 0.075,
    years: 30,
  },
  { id: "heloc", label: "100% financed HELOC", financedShare: 1, annualRate: 0.08, years: 20 },
];

function assertTerms(annualRate: number, years: number) {
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new RangeError("Rate must be a non-negative number.");
  if (!Number.isFinite(years) || years <= 0) throw new RangeError("Term must be a positive number of years.");
}

/**
 * Fixed-rate, fully amortizing monthly principal and interest.
 *
 * @param principal - Amount borrowed, in dollars.
 * @param annualRate - Annual rate as a fraction (`0.08` = 8%).
 * @param years - Amortization term in years.
 * @returns The unrounded monthly payment; `0` when nothing is borrowed.
 * @throws RangeError when an input is negative, non-finite, or the term is not positive.
 */
export function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  if (!Number.isFinite(principal) || principal < 0) throw new RangeError("Principal must be a non-negative number.");
  assertTerms(annualRate, years);
  if (principal === 0) return 0;
  const months = years * 12;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

/**
 * The largest loan a monthly payment repays on these terms: the inverse of
 * {@link calculateMonthlyPayment}. `0` when the payment is not positive.
 */
export function maxPrincipalForPayment(monthlyPayment: number, annualRate: number, years: number): number {
  assertTerms(annualRate, years);
  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) return 0;
  const months = years * 12;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return monthlyPayment * months;
  return (monthlyPayment * (1 - (1 + monthlyRate) ** -months)) / monthlyRate;
}

/**
 * Principal repaid over the first 12 payments of a fixed-rate, fully
 * amortizing loan: the part of those payments that becomes equity.
 */
export function principalPaidInFirstYear(principal: number, annualRate: number, years: number): number {
  const payment = calculateMonthlyPayment(principal, annualRate, years);
  const months = Math.min(12, years * 12);
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return payment * months;
  const growth = (1 + monthlyRate) ** months;
  const balance = principal * growth - (payment * (growth - 1)) / monthlyRate;
  return principal - balance;
}

/** Pro forma figures for one financing scenario. Dollars are whole numbers. */
export interface ScenarioCashFlow {
  scenario: FinancingScenario;
  /** Cash in at the low / high build cost. */
  downPaymentLow: number;
  downPaymentHigh: number;
  /** Amount financed at the low / high build cost. */
  principalLow: number;
  principalHigh: number;
  /** Monthly principal and interest at the low / high build cost. */
  paymentLow: number;
  paymentHigh: number;
  /** Net monthly cash flow at the high build cost (the worse case). */
  netLow: number;
  /** Net monthly cash flow at the low build cost (the better case). */
  netHigh: number;
  /**
   * Average monthly principal repaid in year 1 at the low / high build cost:
   * equity the owner keeps. Not cash, so it is never added to the net.
   */
  principalPaydownLow: number;
  principalPaydownHigh: number;
  /**
   * Gross rent at which the net reaches $0, at the low / high build cost.
   * `null` when operating costs take the whole rent.
   */
  breakEvenRentLow: number | null;
  breakEvenRentHigh: number | null;
  /**
   * Total cash in at which the loan payment equals rent after operating
   * costs, rounded up to $1,000, at the low / high build cost. Equals the
   * build cost when rent after operating costs is nothing.
   */
  breakEvenCashInLow: number;
  breakEvenCashInHigh: number;
}

/** The complete monthly pro forma for a scenario's cost range and rent. */
export interface CashFlowProForma {
  /** Gross monthly rent the scenario assumes. */
  monthlyRent: number;
  /** Share of rent taken by operating costs, as in the annual net income (0–1). */
  operatingExpenseRatio: number;
  /** Monthly operating costs taken from rent. */
  operatingCosts: number;
  scenarios: ScenarioCashFlow[];
}

/**
 * Builds the pro forma for every {@link FINANCING_SCENARIOS} entry. Each line
 * is rounded before the net is taken, so the printed table adds up exactly:
 * `net = rent - payment - operating costs`.
 */
export function buildCashFlowProForma(
  result: Pick<FeasibilityResult, "costLow" | "costHigh" | "monthlyRent" | "operatingExpenseRatio">,
): CashFlowProForma {
  const monthlyRent = Math.round(result.monthlyRent);
  const operatingExpenseRatio = Math.min(Math.max(result.operatingExpenseRatio, 0), 1);
  const operatingCosts = Math.round(monthlyRent * operatingExpenseRatio);
  const rentAfterCosts = monthlyRent - operatingCosts;
  const breakEvenRent = (payment: number) =>
    operatingExpenseRatio < 1 ? Math.ceil(payment / (1 - operatingExpenseRatio)) : null;
  const scenarios = FINANCING_SCENARIOS.map((scenario): ScenarioCashFlow => {
    const principalLow = Math.round(result.costLow * scenario.financedShare);
    const principalHigh = Math.round(result.costHigh * scenario.financedShare);
    const paymentLow = Math.round(calculateMonthlyPayment(principalLow, scenario.annualRate, scenario.years));
    const paymentHigh = Math.round(calculateMonthlyPayment(principalHigh, scenario.annualRate, scenario.years));
    const coveredLoan = maxPrincipalForPayment(rentAfterCosts, scenario.annualRate, scenario.years);
    const minDownPayment = (cost: number) => cost * (1 - scenario.financedShare);
    const breakEvenCashIn = (cost: number) =>
      Math.min(cost, Math.ceil(Math.max(minDownPayment(cost), cost - coveredLoan) / 1000) * 1000);
    return {
      scenario,
      downPaymentLow: result.costLow - principalLow,
      downPaymentHigh: result.costHigh - principalHigh,
      principalLow,
      principalHigh,
      paymentLow,
      paymentHigh,
      netLow: rentAfterCosts - paymentHigh,
      netHigh: rentAfterCosts - paymentLow,
      principalPaydownLow: Math.round(principalPaidInFirstYear(principalLow, scenario.annualRate, scenario.years) / 12),
      principalPaydownHigh: Math.round(principalPaidInFirstYear(principalHigh, scenario.annualRate, scenario.years) / 12),
      breakEvenRentLow: breakEvenRent(paymentLow),
      breakEvenRentHigh: breakEvenRent(paymentHigh),
      breakEvenCashInLow: breakEvenCashIn(result.costLow),
      breakEvenCashInHigh: breakEvenCashIn(result.costHigh),
    };
  });
  return { monthlyRent, operatingExpenseRatio, operatingCosts, scenarios };
}

/** The scenario closest to positive: the highest net at the mid-range cost (first wins ties). */
export function leadScenario(proForma: CashFlowProForma): ScenarioCashFlow {
  const mid = (row: ScenarioCashFlow) => row.netLow + row.netHigh;
  return proForma.scenarios.reduce((best, row) => (mid(row) > mid(best) ? row : best));
}

/** "8.0% APR · 20-yr amortization". */
export function financingTermsLabel(scenario: FinancingScenario): string {
  return `${(scenario.annualRate * 100).toFixed(1)}% APR · ${scenario.years}-yr amortization`;
}

/** "32.5%" — the operating share as printed beside the table. */
export function formatOperatingShare(ratio: number): string {
  return `${Number((ratio * 100).toFixed(1))}%`;
}

const WHOLE_DOLLARS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Whole dollars with an explicit sign: "+$1,234", "−$1,234" (true minus) or "$0". */
export function formatSignedCurrency(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return WHOLE_DOLLARS.format(0);
  return `${rounded > 0 ? "+" : "−"}${WHOLE_DOLLARS.format(Math.abs(rounded))}`;
}

/** A signed low–high pair as one figure, collapsing to one value when they match. */
export function formatSignedRange(low: number, high: number): string {
  const lowLabel = formatSignedCurrency(low);
  const highLabel = formatSignedCurrency(high);
  return lowLabel === highLabel ? lowLabel : `${lowLabel} to ${highLabel}`;
}

/** An unsigned low–high dollar pair: "$1,932–$2,417", or one value when they match. */
export function formatCurrencyRange(low: number, high: number): string {
  const lowLabel = WHOLE_DOLLARS.format(Math.round(low));
  const highLabel = WHOLE_DOLLARS.format(Math.round(high));
  return lowLabel === highLabel ? lowLabel : `${lowLabel}–${highLabel}`;
}

/** One printed line of the pro forma: a label and one value per scenario. */
export interface ProFormaRow {
  label: string;
  values: string[];
  /** The net line, ruled off as the table's total. */
  total?: boolean;
}

/** The pro forma as table rows, shared by the certificate, its HTML download and its CSV. */
export function proFormaTableRows(proForma: CashFlowProForma): ProFormaRow[] {
  const each = (value: (row: ScenarioCashFlow) => string) => proForma.scenarios.map(value);
  const rent = WHOLE_DOLLARS.format(proForma.monthlyRent);
  return [
    { label: "Terms", values: each((row) => financingTermsLabel(row.scenario)) },
    { label: "Cash in at start", values: each((row) => formatCurrencyRange(row.downPaymentLow, row.downPaymentHigh)) },
    { label: "Amount financed", values: each((row) => formatCurrencyRange(row.principalLow, row.principalHigh)) },
    { label: "Gross monthly rent", values: each(() => rent) },
    {
      label: `Less operating costs (${formatOperatingShare(proForma.operatingExpenseRatio)} of rent)`,
      values: each(() => WHOLE_DOLLARS.format(proForma.operatingCosts)),
    },
    { label: "Less principal & interest", values: each((row) => formatCurrencyRange(row.paymentLow, row.paymentHigh)) },
    { label: "Net monthly cash flow", values: each((row) => formatSignedRange(row.netLow, row.netHigh)), total: true },
    {
      label: "Principal paid down (equity, year-1 avg)",
      values: each((row) => `${formatCurrencyRange(row.principalPaydownLow, row.principalPaydownHigh)}/mo`),
    },
    {
      label: "Rent to break even",
      values: each((row) =>
        row.breakEvenRentLow === null || row.breakEvenRentHigh === null
          ? "Not reachable"
          : `${formatCurrencyRange(row.breakEvenRentLow, row.breakEvenRentHigh)}/mo`,
      ),
    },
    {
      label: "Cash in to break even",
      values: each((row) => formatCurrencyRange(row.breakEvenCashInLow, row.breakEvenCashInHigh)),
    },
  ];
}

/**
 * The pro forma's lead sentence: the option closest to positive, the equity it
 * builds, and, when it doesn't yet cover itself, what would make it positive
 * across the whole cost range. Every figure also appears in the table.
 */
export function proFormaSummary(proForma: CashFlowProForma): string {
  const lead = leadScenario(proForma);
  const equity = `about ${formatCurrencyRange(lead.principalPaydownLow, lead.principalPaydownHigh)}/mo of principal paid down in year 1, equity you keep`;
  const opening = `Best option: ${lead.scenario.label}, ${formatSignedRange(lead.netLow, lead.netHigh)}/mo after the loan and operating costs, plus ${equity}.`;
  if (lead.netLow >= 0) return opening;
  const rent = lead.breakEvenRentHigh === null ? null : `${WHOLE_DOLLARS.format(lead.breakEvenRentHigh)}/mo rent`;
  const cash = `${WHOLE_DOLLARS.format(lead.breakEvenCashInHigh)} total cash in`;
  return `${opening} Positive across the whole cost range at ${rent ? `${rent} or with ${cash}` : `${cash}`}.`;
}

/** The disclosure printed under every rendering of the pro forma. */
export function proFormaFootnote(proForma: CashFlowProForma): string {
  return `Fixed-rate, fully amortizing payments on the modeled build cost range. Illustrative terms, not a lender quote: loan fees, draw schedules, interest during construction and tax effects are not modeled, and a HELOC's rate can change. Operating costs use the same ${formatOperatingShare(proForma.operatingExpenseRatio)} allowance as the annual net income. Principal paid down is the part of the first year's payments that repays the loan; it builds equity but is not cash, so it is not added to the net. Net monthly cash flow ranges run from the high build cost (conservative) to the low one; loan payments, equity and break-even figures run from low to high. Break-even cash in is the total you would put in, rounded up to $1,000, for rent after operating costs to cover the loan.`;
}
