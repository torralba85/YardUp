import { describe, expect, it } from "vitest";
import { buildReportCsv, buildReportHtml, buildReportText } from "./report";
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
  it("builds a styled, printable HTML report", () => {
    const html = buildReportHtml(makeInput());

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<style>");
    expect(html).toContain("Project Snapshot");
    expect(html).toContain("Recommended Next Steps");
    expect(html).toContain("1234 Oak Street");
    expect(html).toContain("Annual net income");
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
    expect(csv).toMatch(/Annual Net Income/);
    expect(csv).toMatch(/Disclaimer/);
  });

  it("escapes values containing commas, quotes, or newlines", () => {
    const input = makeInput();
    const csv = buildReportCsv(input);
    expect(csv).toContain('"1234 Oak Street, Seattle, WA 98115"');
  });
});
