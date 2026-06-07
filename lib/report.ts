import {
  finishLabels,
  formatCurrency,
  roofLabels,
  type ADUConfig,
  type FeasibilityResult,
} from "./feasibility";
import type { Parcel } from "./parcel-types";

export interface ReportInput {
  parcel: Parcel;
  config: ADUConfig;
  result: FeasibilityResult;
}

const DISCLAIMER =
  "Planning estimate only. Verify zoning, costs, financing, taxes, utilities, and rent assumptions with local professionals before decisions.";

export function buildReportText({ parcel, config, result }: ReportInput): string {
  const lines = [
    "LotFoundry Concept Feasibility Report",
    "",
    "Property",
    `Address: ${parcel.address}, ${parcel.city}`,
    "",
    "ADU Concept",
    `Size: ${result.aduSqft.toLocaleString()} sf`,
    `Roof: ${roofLabels[config.roof]}`,
    `Exterior finish: ${finishLabels[config.finish]}`,
    `Openings included: ${config.includeOpenings ? "Yes" : "No"}`,
    "",
    "Site Fit",
    `Lot coverage: ${result.coveragePercent.toFixed(1)}% of ${result.maxCoveragePercent}% max`,
    `Zoning status: ${result.zoningStatus}`,
    result.warnings.length > 0 ? `Review note: ${result.warnings[0]}` : "Review note: No coverage warning for the current assumptions.",
    "",
    "Financial Estimate",
    `Estimated build cost: ${formatCurrency(result.costLow)} - ${formatCurrency(result.costHigh)}`,
    `Monthly rent estimate: ${formatCurrency(result.monthlyRent)}`,
    `Annual net income estimate: ${formatCurrency(result.annualNoi)}`,
    `Simple payback: ${result.paybackYears} years`,
    "",
    "Next Steps",
    "1. Confirm the parcel, zoning, and utility constraints with the local jurisdiction.",
    "2. Review the concept with a licensed designer or builder.",
    "3. Update costs, financing, taxes, and rent assumptions before making decisions.",
    "",
    DISCLAIMER,
  ];
  return lines.join("\n");
}

export function buildReportHtml({ parcel, config, result }: ReportInput): string {
  const rows: Array<[string, string]> = [
    ["Property", `${parcel.address}, ${parcel.city}`],
    ["ADU size", `${result.aduSqft.toLocaleString()} sf`],
    ["Roof", roofLabels[config.roof]],
    ["Exterior finish", finishLabels[config.finish]],
    ["Lot coverage", `${result.coveragePercent.toFixed(1)}% of ${result.maxCoveragePercent}% max`],
    ["Zoning status", result.zoningStatus],
    ["Build cost range", `${formatCurrency(result.costLow)} - ${formatCurrency(result.costHigh)}`],
    ["Monthly rent estimate", formatCurrency(result.monthlyRent)],
    ["Annual net income estimate", formatCurrency(result.annualNoi)],
    ["Simple payback", `${result.paybackYears} years`],
  ];

  const reviewNote = result.warnings[0] ?? "No coverage warning for the current assumptions.";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LotFoundry Concept Feasibility Report</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #261307;
      --muted: #6f5f53;
      --line: #ded2c2;
      --paper: #fffaf2;
      --panel: #ffffff;
      --accent: #7a3f1d;
      --soft: #f2e5d5;
      --good: #2f6b4f;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-size: 14px;
      line-height: 1.55;
    }
    main {
      max-width: 880px;
      margin: 0 auto;
      padding: 48px 32px;
    }
    header {
      border-bottom: 2px solid var(--ink);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand {
      color: var(--accent);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    h1 {
      margin: 10px 0 8px;
      max-width: 680px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 42px;
      line-height: 1.05;
      letter-spacing: 0;
    }
    h2 {
      margin: 0 0 12px;
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    p { margin: 0; color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin: 28px 0;
    }
    .metric, section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(38, 19, 7, 0.06);
    }
    .metric { padding: 18px; }
    .label {
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .value {
      margin-top: 8px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      font-weight: 700;
      line-height: 1.05;
    }
    section {
      margin-top: 18px;
      padding: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    th, td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      width: 36%;
      background: var(--soft);
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    tr:last-child th, tr:last-child td { border-bottom: 0; }
    ol {
      margin: 0;
      padding-left: 20px;
      color: var(--muted);
    }
    li + li { margin-top: 8px; }
    .status {
      display: inline-block;
      border-radius: 999px;
      background: ${result.zoningStatus === "Compliant" ? "#e4efe8" : "#f8e5d5"};
      color: ${result.zoningStatus === "Compliant" ? "var(--good)" : "var(--accent)"};
      padding: 5px 10px;
      font-weight: 800;
      font-size: 12px;
    }
    .note {
      border-left: 4px solid var(--accent);
      background: #fff4e8;
      padding: 14px 16px;
      color: var(--ink);
    }
    footer {
      margin-top: 24px;
      color: var(--muted);
      font-size: 12px;
    }
    @media (max-width: 720px) {
      main { padding: 28px 18px; }
      h1 { font-size: 32px; }
      .grid { grid-template-columns: 1fr; }
      th, td { display: block; width: 100%; }
      th { border-bottom: 0; padding-bottom: 4px; }
      td { padding-top: 4px; }
    }
    @media print {
      body { background: white; }
      main { max-width: none; padding: 24px; }
      .metric, section { box-shadow: none; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">LotFoundry</div>
      <h1>Concept Feasibility Report</h1>
      <p>${escapeHtml(parcel.address)}, ${escapeHtml(parcel.city)}</p>
    </header>

    <div class="grid" aria-label="Key estimate metrics">
      <div class="metric">
        <div class="label">Monthly rent</div>
        <div class="value">${escapeHtml(formatCurrency(result.monthlyRent))}</div>
      </div>
      <div class="metric">
        <div class="label">Annual net income</div>
        <div class="value">${escapeHtml(formatCurrency(result.annualNoi))}</div>
      </div>
      <div class="metric">
        <div class="label">Build range</div>
        <div class="value">${escapeHtml(formatCurrency(result.costLow))} - ${escapeHtml(formatCurrency(result.costHigh))}</div>
      </div>
    </div>

    <section>
      <h2>Project Snapshot</h2>
      <table>
        <tbody>
          ${rows.map(([field, value]) => `<tr><th scope="row">${escapeHtml(field)}</th><td>${field === "Zoning status" ? `<span class="status">${escapeHtml(value)}</span>` : escapeHtml(value)}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Review Note</h2>
      <p class="note">${escapeHtml(reviewNote)}</p>
    </section>

    <section>
      <h2>Recommended Next Steps</h2>
      <ol>
        <li>Confirm the parcel, zoning, and utility constraints with the local jurisdiction.</li>
        <li>Review the concept with a licensed designer or builder.</li>
        <li>Update costs, financing, taxes, and rent assumptions before making decisions.</li>
      </ol>
    </section>

    <footer>${escapeHtml(DISCLAIMER)}</footer>
  </main>
</body>
</html>`;
}

export function buildReportCsv({ parcel, config, result }: ReportInput): string {
  const rows: Array<[string, string]> = [
    ["Field", "Value"],
    ["Address", `${parcel.address}, ${parcel.city}`],
    ["ADU Size (sf)", String(result.aduSqft)],
    ["Roof", roofLabels[config.roof]],
    ["Exterior Finish", finishLabels[config.finish]],
    ["Lot Coverage (%)", result.coveragePercent.toFixed(1)],
    ["Max Coverage (%)", String(result.maxCoveragePercent)],
    ["Zoning Status", result.zoningStatus],
    ["Build Cost Low ($)", String(result.costLow)],
    ["Build Cost High ($)", String(result.costHigh)],
    ["Monthly Rent ($)", String(result.monthlyRent)],
    ["Annual Net Income ($)", String(result.annualNoi)],
    ["Simple Payback (years)", String(result.paybackYears)],
    ["Disclaimer", DISCLAIMER],
  ];

  return rows
    .map(([field, value]) =>
      [escapeCsv(field), escapeCsv(value)].join(","),
    )
    .join("\n");
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadBlob(filename: string, content: string, mimeType: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
