import { describe, expect, it } from "vitest";
import { buildReportCsv, buildReportHtml, buildReportText, makeCertificateSerial } from "./report";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
} from "./feasibility";

function makeInput() {
  const parcel = getParcelById("oak-street");
  const config = defaultAduConfig;
  const result = calculateFeasibility(parcel, config, defaultFinancialAssumptions);
  return { parcel, config, result };
}

describe("buildReportText", () => {
  it("includes the address, ADU size, coverage, cost, income, and disclaimer", () => {
    const text = buildReportText(makeInput());
    expect(text).toMatch(/1234 Oak Street/);
    expect(text).toMatch(/600 sf/);
    expect(text).toMatch(/Lot coverage/i);
    expect(text).toMatch(/Compliant/);
    expect(text).toMatch(/Estimated build cost/i);
    expect(text).toMatch(/Monthly rent estimate/i);
    expect(text).toMatch(/Annual net income estimate/i);
    expect(text).toMatch(/Planning estimate only/i);
  });
});

describe("buildReportHtml", () => {
  it("builds a styled, printable certificate", () => {
    const html = buildReportHtml({ ...makeInput(), recordedAt: new Date("2026-06-11T12:00:00Z") });

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<style>");
    expect(html).toContain("Certificate of Feasibility");
    expect(html).toContain("Project Snapshot");
    expect(html).toContain("Recommended Next Steps");
    expect(html).toContain("1234 Oak Street");
    expect(html).toContain("Net operating income");
    expect(html).toContain("Annual Ledger");
    expect(html).toContain("Recorded JUN 11, 2026");
    expect(html).toContain("Not a Permit");
  });

  it("stamps a deterministic serial derived from the parcel identity", () => {
    const first = buildReportHtml(makeInput());
    const second = buildReportHtml(makeInput());
    const serial = makeCertificateSerial(makeInput().parcel);
    expect(serial).toMatch(/^LF-\d{3}-\d{4}$/);
    expect(first).toContain(serial);
    expect(second).toContain(serial);
  });

  it("keeps the ledger balanced: gross rent minus operating allowance equals NOI", () => {
    const input = makeInput();
    const html = buildReportHtml(input);
    const gross = input.result.monthlyRent * 12;
    const allowance = gross - input.result.annualNoi;
    expect(html).toContain(formatCurrencyForTest(gross));
    expect(html).toContain(formatCurrencyForTest(allowance));
    expect(html).toContain(formatCurrencyForTest(input.result.annualNoi));
  });
});

function formatCurrencyForTest(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

describe("buildReportCsv", () => {
  it("starts with a header row and includes every key field", () => {
    const csv = buildReportCsv(makeInput());
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Field,Value");
    expect(csv).toMatch(/Address/);
    expect(csv).toMatch(/ADU Size \(sf\)/);
    expect(csv).toMatch(/Zoning Status/);
    expect(csv).toMatch(/Build Cost Low/);
    expect(csv).toMatch(/Monthly Rent/);
    expect(csv).toMatch(/Annual Net Income/);
    expect(csv).toMatch(/Disclaimer/);
  });

  it("escapes values containing commas, quotes, or newlines", () => {
    const input = makeInput();
    const csv = buildReportCsv(input);
    expect(csv).toContain('"1234 Oak Street, Seattle, WA 98115"');
  });
});
