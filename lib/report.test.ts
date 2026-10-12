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

it("labels historical Saved Brief snapshots in every exported Report", () => {
  const input = { ...makeInput(), projectBrief: makeProjectBrief(), projectBriefSavedAt: "2026-09-13T00:00:00Z" };
  expect(buildReportText(input)).toContain("Saved Brief snapshot");
  expect(buildReportHtml(input)).toContain("Saved Brief snapshot");
  expect(buildReportCsv(input)).toContain("Brief provenance,Saved historical snapshot");
  expect(buildReportCsv(input)).toContain("Scenario saved at,2026-09-13T00:00:00Z");
});

it("keeps legacy fallback dimensions and footprints qualified in every export", () => {
  const parcel = { ...getParcelById("oak-street"), source: "fallback", zoning: "R-1 (estimated)" };
  const config = defaultAduConfig;
  const result = calculateFeasibility(parcel, config, defaultFinancialAssumptions);
  for (const report of [buildReportText({ parcel, config, result }), buildReportHtml({ parcel, config, result }), buildReportCsv({ parcel, config, result })]) {
    expect(report).toContain("Exact parcel data unavailable");
    expect(report).toContain("Unknown");
    expect(report).toContain("Review needed");
    expect(report).not.toContain("39.6%");
  }
});

it("keeps unknown county GIS coverage out of text, HTML, and CSV certificates", () => {
  const parcel = { ...getParcelById("oak-street"), source: "county-gis", zoning: "Unknown", existingHouseSqft: 0 };
  const config = defaultAduConfig;
  const result = calculateFeasibility(parcel, config, defaultFinancialAssumptions);
  const input = { parcel, config, result };
  for (const report of [buildReportText(input), buildReportHtml(input), buildReportCsv(input)]) {
    expect(report).toContain("Unknown");
    expect(report).toContain("Review needed");
    expect(report).not.toContain("12.0%");
  }
  expect(buildReportText(input)).toContain("Setbacks (assumed)");
  expect(buildReportCsv(input)).toContain("Regulatory assumptions");
});

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
    expect(text).toMatch(/Setbacks: 20 ft front, 25 ft rear, 5 ft side/i);
    expect(text).toMatch(/Estimated area after modeled setbacks/i);
    expect(text).toMatch(/Remaining coverage capacity/i);
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

  it("records the AI style-matched concept when present", () => {
    const text = buildReportText({
      ...makeInput(),
      styleMatchConcept: {
        styleName: "Modern Farmhouse",
        matchPercentage: 94,
        traits: ["Board and batten", "Pitched metal roof"],
        conceptUrl: "https://example.com/concept.jpg",
        photoUrl: "https://example.com/home.jpg",
      },
    });
    expect(text).toContain("AI Style-Matched Concept");
    expect(text).toContain("Style: Modern Farmhouse (94% match)");
    expect(text).toContain("Matched traits: Board and batten, Pitched metal roof");
  });

  it("records every modeled warning instead of dropping later review items", () => {
    const input = makeInput();
    const result = {
      ...input.result,
      warnings: ["Coverage needs review.", "Height needs review."],
    };
    const text = buildReportText({ ...input, result });

    expect(text).toContain("Review note 1: Coverage needs review.");
    expect(text).toContain("Review note 2: Height needs review.");
  });
});

describe("buildReportHtml", () => {
  it("builds a styled, printable certificate", () => {
    const html = buildReportHtml({ ...makeInput(), recordedAt: new Date("2026-06-11T12:00:00Z") });

    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("<style>");
    expect(html).toContain("Certificate of Feasibility");
    expect(html).toContain("Project Snapshot");
    expect(html).toContain("Estimated area after modeled setbacks");
    expect(html).toContain("Remaining coverage capacity");
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

  it("adds the styled architectural concept plate to printable HTML", () => {
    const html = buildReportHtml({
      ...makeInput(),
      styleMatchConcept: {
        styleName: "Modern Farmhouse",
        matchPercentage: 94,
        traits: ["Board and batten", "Pitched metal roof"],
        conceptUrl: "https://example.com/concept.jpg",
        photoUrl: "https://example.com/home.jpg",
      },
    });
    expect(html).toContain("AI Style Match &middot; Architectural Concept Plate");
    expect(html).toContain("Modern Farmhouse");
    expect(html).toContain("94%");
    expect(html).toContain("style match");
    expect(html).toContain("Board and batten");
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
    expect(csv).toMatch(/Front Setback \(ft\)/);
    expect(csv).toMatch(/Estimated Area After Modeled Setbacks \(sf\)/);
    expect(csv).toMatch(/Remaining Coverage Capacity \(sf\)/);
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

  it("exports the AI style-matched concept fields to CSV", () => {
    const csv = buildReportCsv({
      ...makeInput(),
      styleMatchConcept: {
        styleName: "Modern Farmhouse",
        matchPercentage: 94,
        traits: ["Board and batten", "Pitched metal roof"],
        conceptUrl: "https://example.com/concept.jpg",
        photoUrl: "https://example.com/home.jpg",
      },
    });
    expect(csv).toContain("AI Style Match Name,Modern Farmhouse");
    expect(csv).toContain("AI Style Match Confidence (%),94");
    expect(csv).toContain("AI Style Match Traits,Board and batten; Pitched metal roof");
    expect(csv).toContain("AI Style Match Concept URL,https://example.com/concept.jpg");
    expect(csv).toContain("AI Style Match Reference Photo URL,https://example.com/home.jpg");
  });
});
