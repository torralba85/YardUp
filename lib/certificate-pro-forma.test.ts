import { describe, expect, it } from "vitest";
import {
  buildCashFlowProForma,
  calculateMonthlyPayment,
  FINANCING_SCENARIOS,
  financingTermsLabel,
  formatCurrencyRange,
  formatOperatingShare,
  formatSignedCurrency,
  formatSignedRange,
  leadScenario,
  maxPrincipalForPayment,
  principalPaidInFirstYear,
  proFormaSummary,
  proFormaTableRows,
} from "./certificate-pro-forma";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  parcelPresets,
} from "./feasibility";

describe("calculateMonthlyPayment", () => {
  it("matches standard amortization tables", () => {
    expect(calculateMonthlyPayment(200_000, 0.08, 20)).toBeCloseTo(1672.88, 2);
    expect(calculateMonthlyPayment(160_000, 0.075, 30)).toBeCloseTo(1118.74, 2);
  });

  it("spreads principal evenly at a zero rate and returns 0 when nothing is borrowed", () => {
    expect(calculateMonthlyPayment(120_000, 0, 10)).toBe(1000);
    expect(calculateMonthlyPayment(0, 0.08, 20)).toBe(0);
  });

  it("rejects negative, non-finite, and zero-term inputs", () => {
    expect(() => calculateMonthlyPayment(-1, 0.08, 20)).toThrow(RangeError);
    expect(() => calculateMonthlyPayment(Number.NaN, 0.08, 20)).toThrow(RangeError);
    expect(() => calculateMonthlyPayment(100_000, -0.01, 20)).toThrow(RangeError);
    expect(() => calculateMonthlyPayment(100_000, 0.08, 0)).toThrow(RangeError);
  });
});

describe("principalPaidInFirstYear", () => {
  it("matches a month-by-month amortization schedule", () => {
    expect(principalPaidInFirstYear(200_000, 0.08, 20)).toBeCloseTo(4227.39, 0);
    expect(principalPaidInFirstYear(120_000, 0, 10)).toBe(12_000);
    expect(principalPaidInFirstYear(0, 0.08, 20)).toBe(0);
  });
});

describe("maxPrincipalForPayment", () => {
  it("inverts the payment calculation", () => {
    const payment = calculateMonthlyPayment(200_000, 0.08, 20);
    expect(maxPrincipalForPayment(payment, 0.08, 20)).toBeCloseTo(200_000, 6);
    expect(maxPrincipalForPayment(1000, 0, 10)).toBe(120_000);
  });

  it("covers no loan when nothing is left to pay with", () => {
    expect(maxPrincipalForPayment(0, 0.08, 20)).toBe(0);
    expect(maxPrincipalForPayment(-50, 0.08, 20)).toBe(0);
  });
});

describe("buildCashFlowProForma", () => {
  const proForma = buildCashFlowProForma({
    costLow: 200_000,
    costHigh: 250_000,
    monthlyRent: 2000,
    operatingExpenseRatio: 0.325,
  });
  const [construction, heloc] = proForma.scenarios;

  it("models the two disclosed scenarios, the usually stronger one first", () => {
    expect(FINANCING_SCENARIOS.map((scenario) => scenario.id)).toEqual(["construction", "heloc"]);
    expect(financingTermsLabel(heloc.scenario)).toBe("8.0% APR · 20-yr amortization");
    expect(financingTermsLabel(construction.scenario)).toBe("7.5% APR · 30-yr amortization");
  });

  it("uses the free estimate's operating share, not a separate reserve", () => {
    expect(proForma.operatingExpenseRatio).toBe(0.325);
    expect(proForma.operatingCosts).toBe(650);
    expect(formatOperatingShare(proForma.operatingExpenseRatio)).toBe("32.5%");
  });

  it("finances the whole build on the HELOC and 80% on the construction loan", () => {
    expect(heloc).toMatchObject({
      downPaymentLow: 0,
      downPaymentHigh: 0,
      principalLow: 200_000,
      principalHigh: 250_000,
      paymentLow: 1673,
      paymentHigh: 2091,
    });
    expect(construction).toMatchObject({
      downPaymentLow: 40_000,
      downPaymentHigh: 50_000,
      principalLow: 160_000,
      principalHigh: 200_000,
      paymentLow: 1119,
      paymentHigh: 1398,
    });
  });

  it("nets rent minus operating costs minus the payment, worse case first", () => {
    expect([heloc.netLow, heloc.netHigh]).toEqual([-741, -323]);
    expect([construction.netLow, construction.netHigh]).toEqual([-48, 231]);
    for (const row of proForma.scenarios) {
      expect(row.netLow).toBe(proForma.monthlyRent - proForma.operatingCosts - row.paymentHigh);
      expect(row.netHigh).toBe(proForma.monthlyRent - proForma.operatingCosts - row.paymentLow);
    }
  });

  it("reports the rent and the cash in at which each scenario breaks even", () => {
    expect([heloc.breakEvenRentLow, heloc.breakEvenRentHigh]).toEqual([2479, 3098]);
    expect([heloc.breakEvenCashInLow, heloc.breakEvenCashInHigh]).toEqual([39_000, 89_000]);
    expect([construction.breakEvenRentLow, construction.breakEvenRentHigh]).toEqual([1658, 2072]);
    expect([construction.breakEvenCashInLow, construction.breakEvenCashInHigh]).toEqual([40_000, 57_000]);
  });

  it("reports the equity each payment builds without adding it to the net", () => {
    expect([construction.principalPaydownLow, construction.principalPaydownHigh]).toEqual([123, 154]);
    expect([heloc.principalPaydownLow, heloc.principalPaydownHigh]).toEqual([352, 440]);
    const rows = proFormaTableRows(proForma);
    expect(rows.map((row) => row.label)).toContain("Principal paid down (equity, year-1 avg)");
    expect(rows.find((row) => row.total)?.values).toEqual(["−$48 to +$231", "−$741 to −$323"]);
  });

  it("leads with the option closest to positive and what makes it positive", () => {
    expect(leadScenario(proForma).scenario.id).toBe("construction");
    expect(proFormaSummary(proForma)).toBe(
      "Higher modeled monthly cash flow in this example: 20% down construction-to-perm, −$48 to +$231/mo after the loan and operating costs, plus about $123–$154/mo of principal paid down in year 1. Positive across the whole cost range at $2,072/mo rent or with $57,000 total cash in.",
    );
  });

  it("drops the path sentence once the best option is positive across the range", () => {
    const strong = buildCashFlowProForma({
      costLow: 100_000,
      costHigh: 120_000,
      monthlyRent: 3000,
      operatingExpenseRatio: 0.3,
    });
    expect(proFormaSummary(strong)).toMatch(/^Higher modeled monthly cash flow in this example: 20% down construction-to-perm, \+\$\d/);
    expect(proFormaSummary(strong)).not.toMatch(/Positive across/);
  });

  it("needs only the program down payment when rent already covers the loan", () => {
    const cheap = buildCashFlowProForma({
      costLow: 50_000,
      costHigh: 60_000,
      monthlyRent: 3000,
      operatingExpenseRatio: 0.3,
    });
    const [cheapConstruction, cheapHeloc] = cheap.scenarios;
    expect(cheapHeloc.breakEvenCashInLow).toBe(0);
    expect(cheapHeloc.breakEvenCashInHigh).toBe(0);
    expect(cheapConstruction.breakEvenCashInLow).toBe(10_000);
    expect(cheapConstruction.breakEvenCashInHigh).toBe(12_000);
    for (const row of cheap.scenarios) {
      expect(row.netLow).toBeGreaterThan(0);
    }
  });

  it("asks for the whole build in cash and names no break-even rent when costs take all the rent", () => {
    const allCosts = buildCashFlowProForma({
      costLow: 100_000,
      costHigh: 120_000,
      monthlyRent: 1500,
      operatingExpenseRatio: 1,
    });
    for (const row of allCosts.scenarios) {
      expect(row.breakEvenRentLow).toBeNull();
      expect(row.breakEvenCashInLow).toBe(100_000);
      expect(row.breakEvenCashInHigh).toBe(120_000);
    }
  });

  it("shows the Studio's default concept honestly: a HELOC loss, led by the near-even 20% down option", () => {
    const result = calculateFeasibility(parcelPresets[0], defaultAduConfig, defaultFinancialAssumptions);
    const studio = buildCashFlowProForma(result);
    const fullyFinanced = studio.scenarios.find((row) => row.scenario.id === "heloc")!;
    expect(studio.operatingExpenseRatio).toBe(result.operatingExpenseRatio);
    expect(fullyFinanced.netHigh).toBeLessThan(0);
    expect(fullyFinanced.breakEvenRentLow).toBeGreaterThan(result.monthlyRent);
    const lead = leadScenario(studio);
    expect(lead.scenario.id).toBe("construction");
    expect([lead.netLow, lead.netHigh]).toEqual([-233, 92]);
    expect([lead.principalPaydownLow, lead.principalPaydownHigh]).toEqual([142, 178]);
  });
});

describe("formatting", () => {
  it("signs whole dollars with a true minus", () => {
    expect(formatSignedCurrency(323)).toBe("+$323");
    expect(formatSignedCurrency(-741)).toBe("−$741");
    expect(formatSignedCurrency(-0.4)).toBe("$0");
    expect(formatSignedCurrency(1234.6)).toBe("+$1,235");
  });

  it("joins ranges and collapses equal ends", () => {
    expect(formatSignedRange(-741, -323)).toBe("−$741 to −$323");
    expect(formatSignedRange(-48, -48)).toBe("−$48");
    expect(formatCurrencyRange(1673, 2091)).toBe("$1,673–$2,091");
    expect(formatCurrencyRange(0, 0)).toBe("$0");
  });
});
