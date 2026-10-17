import type { FeasibilityResult, Parcel } from "./feasibility";

export interface FinancingInputs {
  financedPercent: number;
  annualRate: number;
  years: number;
  paymentType: "amortizing" | "interest-only";
}

/** Illustrative assumptions, not a current lender quote. */
export const DEFAULT_FINANCING: FinancingInputs = {
  financedPercent: 80, annualRate: 8, years: 20, paymentType: "amortizing",
};

export function validFinancing(value: FinancingInputs): boolean {
  return Number.isFinite(value.financedPercent) && value.financedPercent >= 0 && value.financedPercent <= 100 &&
    Number.isFinite(value.annualRate) && value.annualRate >= 0 && value.annualRate <= 30 &&
    Number.isInteger(value.years) && value.years >= 1 && value.years <= 40 &&
    ["amortizing", "interest-only"].includes(value.paymentType);
}

export function monthlyPayment(principal: number, inputs: FinancingInputs): number {
  if (!validFinancing(inputs) || !Number.isFinite(principal) || principal < 0) throw new Error("Invalid financing assumptions.");
  const rate = inputs.annualRate / 1200;
  if (inputs.paymentType === "interest-only") return principal * rate;
  const months = inputs.years * 12;
  return rate === 0 ? principal / months : principal * rate / (1 - (1 + rate) ** -months);
}

export function financingBreakdown(result: FeasibilityResult, inputs: FinancingInputs) {
  const principalLow = result.costLow * inputs.financedPercent / 100;
  const principalHigh = result.costHigh * inputs.financedPercent / 100;
  const paymentLow = monthlyPayment(principalLow, inputs);
  const paymentHigh = monthlyPayment(principalHigh, inputs);
  const monthlyOperatingIncome = result.annualNoi / 12;
  return { principalLow, principalHigh, paymentLow, paymentHigh, monthlyOperatingIncome,
    cashFlowLow: monthlyOperatingIncome - paymentHigh,
    cashFlowHigh: monthlyOperatingIncome - paymentLow };
}

/** City-name evidence is only a prompt to confirm jurisdiction, never an overlay lookup. */
export function isSanDiego(parcel: Parcel): boolean {
  if ("state" in parcel && typeof parcel.state === "string" && parcel.state && parcel.state.toUpperCase() !== "CA") return false;
  return /^san diego(?:,?\s+(?:CA|California)(?:\s+\d{5})?)?$/i.test(parcel.city.trim());
}

export const BID_CHECKLIST = [
  "Compare the same floor area, finishes, drawings, and included scope in every bid.",
  "Separate design, permits, fees, utility connections, trenching, and site work from construction.",
  "Record allowances, exclusions, contingency, change-order rates, and escalation clauses.",
  "Verify contractor license and insurance; compare schedule, payment milestones, and warranty.",
];

export const SAN_DIEGO_SOURCES = [
  { label: "City Development Impact Fee FAQ", url: "https://www.sandiego.gov/planning/work/public-spaces/faq" },
  { label: "City ADU regulatory updates", url: "https://www.sandiego.gov/development-services/regulatory-updates" },
  { label: "City ADU guidance (IB 400)", url: "https://www.sandiego.gov/development-services/forms-publications/information-bulletins/400" },
];

export function feeReview(parcel: Parcel, sqft: number): string[] {
  if (!isSanDiego(parcel)) return ["Local fees and overlays: not assessed. Confirm the permitting jurisdiction and obtain its current fee estimate and official hazard/overlay maps."];
  return [
    "San Diego fee & overlay review — jurisdiction and parcel overlays are unverified. San Diego city guidance does not establish rules for other cities or unincorporated county land.",
    `${sqft.toLocaleString()} sq ft modeled area: ${sqft < 750 ? "below" : "at or above"} 750 sq ft. The under-750 DIF exemption is not a waiver of every project fee. Confirm gross floor area with the City.`,
    "The City DIF FAQ describes an exemption for the first two ADUs, regardless of size, with program-specific exceptions. Unit count and program eligibility are not known here; no fee waiver or dollar savings is verified.",
    "The ADU Home Density Bonus Program can carry a Community Enhancement Fee for units under 750 sq ft; confirm applicable exemptions and coastal effective dates with the City.",
    "Coastal overlay: not checked. Verify the parcel on the City's official zoning map and confirm coastal permit, parking, and height requirements.",
    "High / Very High Fire Hazard Severity Zone: not checked. Confirm official mapping, fire access, evacuation, setbacks, and construction requirements; a blank flag does not mean clear.",
    "Sources reviewed 2026-10-16. Verify current guidance before committing to construction.",
  ];
}

export function planningRows(parcel: Parcel, result: FeasibilityResult, inputs = DEFAULT_FINANCING): Array<[string, string]> {
  const finance = financingBreakdown(result, inputs);
  const dollars = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return [
    ["Financing assumptions", `${inputs.financedPercent}% of modeled cost; ${inputs.annualRate}% annual interest; ${inputs.years} years; ${inputs.paymentType}. Illustrative, not a lender quote.`],
    ["Modeled principal", `${dollars(finance.principalLow)}–${dollars(finance.principalHigh)}`],
    ["Monthly gross rent", dollars(result.monthlyRent)],
    ["Monthly operating costs", dollars(result.monthlyRent - finance.monthlyOperatingIncome)],
    ["Monthly loan payment", `${dollars(finance.paymentLow)}–${dollars(finance.paymentHigh)}`],
    ["Monthly cash flow after operating costs and debt", `${dollars(finance.cashFlowLow)}–${dollars(finance.cashFlowHigh)}`],
    ["Financing limits", "Constant-rate model. Excludes financing fees, draw schedules, construction-period carry, balloon payments, and tax changes not in operating costs. Interest-only payments do not repay principal. HELOC rates and repayment terms can change. No income or financing approval is guaranteed."],
    ...feeReview(parcel, result.aduSqft).map((line): [string, string] => ["Fee & overlay review", line]),
    ...(isSanDiego(parcel) ? SAN_DIEGO_SOURCES.map((source): [string, string] => [source.label, source.url]) : []),
    ...BID_CHECKLIST.map((line): [string, string] => ["Contractor bid-leveling checklist", line]),
  ];
}
