import { describe, expect, it } from "vitest";
import { buildReportCsv, buildReportText } from "./report";
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
  it("includes the address, ADU size, coverage, cost, NOI, and disclaimer", () => {
    const text = buildReportText(makeInput());
    expect(text).toMatch(/1234 Oak Street/);
    expect(text).toMatch(/600 sf/);
    expect(text).toMatch(/Lot coverage/i);
    expect(text).toMatch(/Compliant/);
    expect(text).toMatch(/Estimated build cost/i);
    expect(text).toMatch(/Monthly rent estimate/i);
    expect(text).toMatch(/Annual NOI estimate/i);
    expect(text).toMatch(/Investor-demo estimate only/i);
  });
});

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
    expect(csv).toMatch(/Disclaimer/);
  });

  it("escapes values containing commas, quotes, or newlines", () => {
    const input = makeInput();
    const csv = buildReportCsv(input);
    expect(csv).toContain('"1234 Oak Street, Seattle, WA 98115"');
  });
});
