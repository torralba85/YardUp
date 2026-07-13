import { describe, expect, it } from "vitest";
import { buildReportCsv, buildReportHtml, buildReportText, makeCertificateSerial } from "./report";
import {
  calculateFeasibility,
  defaultAduConfig,
  defaultFinancialAssumptions,
  getParcelById,
} from "./feasibility";
import type { AIProjectBrief } from "./ai-types";

function makeInput() {
  const parcel = getParcelById("oak-street");
  const config = defaultAduConfig;
  const result = calculateFeasibility(parcel, config, defaultFinancialAssumptions);
  return { parcel, config, result };
}

function makeProjectBrief(): AIProjectBrief {
  return {
    headline: "A workable backyard concept with two review items",
    summary: "The current concept fits the recorded parcel and coverage assumptions.",
    bestFit: "Keep the 600 sf one-bedroom concept and confirm utility routing.",
    risks: [
      { label: "Utility route", level: "medium", explanation: "Confirm the sewer path." },
      { label: "Coverage", level: "low", explanation: "The concept remains below the cap." },
    ],
    permitTrack: {
      name: "Washington ministerial ADU review",
      type: "ministerial",
      basis: "Typical administrative review for a qualifying ADU.",
    },
    stages: [
      {
        name: "Pre-application check",
        description: "Confirm the submittal set.",
        estWeeksLow: 1,
        estWeeksHigh: 2,
        status: "review",
      },
      {
        name: "Plan review",
        description: "Jurisdiction review of the application.",
        estWeeksLow: 4,
        estWeeksHigh: 7,
        status: "clear",
      },
    ],
    totalEstWeeksLow: 5,
    totalEstWeeksHigh: 9,
    recommendedNextSteps: ["Confirm utilities.", "Prepare the plan set.", "Submit for review."],
    disclaimer: "AI-assisted planning estimate only; not an approval guarantee.",
  };
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

  it("records the merged AI parcel interpretation and permit timeline", () => {
    const text = buildReportText({ ...makeInput(), projectBrief: makeProjectBrief() });
    expect(text).toContain("Property & Permit Brief");
    expect(text).toContain("Utility route");
    expect(text).toContain("Typical approval timeline: 5-9 weeks");
    expect(text).toContain("Pre-application check: 1-2 weeks");
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
    expect(html).toContain("Yearly net income");
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

  it("guards the operating percentage when monthly rent is zero (no NaN)", () => {
    const input = makeInput();
    const zeroRent = { conservative: 0, market: 0, optimistic: 0 };
    const result = calculateFeasibility(input.parcel, input.config, defaultFinancialAssumptions, zeroRent);
    const html = buildReportHtml({ ...input, result });
    expect(html).not.toContain("NaN");
    expect(html).toContain("Operating allowance (0%)");
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

  it("adds one styled parcel and permit brief to the printable certificate", () => {
    const html = buildReportHtml({ ...makeInput(), projectBrief: makeProjectBrief() });

    expect(html).toContain("Parcel &amp; Permit Brief");
    expect(html).toContain("AI-assisted &middot; Recorded in this certificate");
    expect(html).toContain("Washington ministerial ADU review");
    expect(html).toContain("Pre-application check");
    expect(html).toContain("5&ndash;9");
    expect(html).toContain("Confirm utilities.");
  });

  it("escapes AI-generated certificate content", () => {
    const projectBrief = {
      ...makeProjectBrief(),
      headline: '<script data-test="brief">alert(1)</script>',
    };
    const html = buildReportHtml({ ...makeInput(), projectBrief });

    expect(html).not.toContain('<script data-test="brief">');
    expect(html).toContain("&lt;script data-test=&quot;brief&quot;&gt;");
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

  it("exports the recorded AI brief and each timeline stage", () => {
    const csv = buildReportCsv({ ...makeInput(), projectBrief: makeProjectBrief() });
    expect(csv).toContain("AI Brief Headline");
    expect(csv).toContain("Typical Approval Timeline (weeks),5-9");
    expect(csv).toContain("Permit Stage 1 - Pre-application check");
    expect(csv).toContain("AI Next Step 1,Confirm utilities.");
  });
});
