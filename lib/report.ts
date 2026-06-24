import {
  finishLabels,
  formatCurrency,
  roofLabels,
  type ADUConfig,
  type FeasibilityResult,
} from "./feasibility";
import type { Parcel } from "./parcel-types";

/** Inputs needed to render any of the feasibility report formats. */
export interface ReportInput {
  /** The parcel the report describes. */
  parcel: Parcel;
  /** The ADU configuration. */
  config: ADUConfig;
  /** The computed feasibility result. */
  result: FeasibilityResult;
  /** Recorded date shown on the certificate; defaults to now. Injectable for tests. */
  recordedAt?: Date;
}

const DISCLAIMER =
  "Planning estimate only. Verify zoning, costs, financing, taxes, utilities, and rent assumptions with local professionals before decisions.";

/**
 * Deterministic certificate serial derived from the parcel identity (FNV-1a
 * over address+city). Same lot, same number — the certificate is reproducible.
 * Live parcels have no APN field, so the address is the stable identity.
 */
export function makeCertificateSerial(parcel: Parcel): string {
  const key = `${parcel.address}|${parcel.city}`.toUpperCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const digits = String(hash % 10_000_000).padStart(7, "0");
  return `LF-${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function formatRecordedDate(date: Date): string {
  return date
    .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
    .toUpperCase();
}

/**
 * Build a plain-text Certificate of Feasibility suitable for a `.txt` download.
 *
 * @param input - The {@link ReportInput} (parcel, config, result, optional date).
 * @returns The report as newline-joined text.
 */
export function buildReportText({ parcel, config, result, recordedAt }: ReportInput): string {
  const lines = [
    "LotFoundry Certificate of Feasibility",
    `No. ${makeCertificateSerial(parcel)} - Recorded ${formatRecordedDate(recordedAt ?? new Date())}`,
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

/**
 * Build a fully self-contained HTML Certificate of Feasibility, styled per
 * `DESIGN.md` (engraved instrument with a balancing annual T-account ledger).
 * All interpolated values are HTML-escaped.
 *
 * @param input - The {@link ReportInput} (parcel, config, result, optional date).
 * @returns A complete HTML document string (printable / saveable).
 */
export function buildReportHtml({ parcel, config, result, recordedAt }: ReportInput): string {
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
  const serial = makeCertificateSerial(parcel);
  const recorded = formatRecordedDate(recordedAt ?? new Date());
  // Ledger lines are derived from the engine result so the T-account always
  // balances: gross rent minus the operating allowance equals NOI exactly.
  const grossAnnualRent = result.monthlyRent * 12;
  const operatingAllowance = grossAnnualRent - result.annualNoi;
  const operatingPct =
    grossAnnualRent > 0 ? Math.round((operatingAllowance / grossAnnualRent) * 1000) / 10 : 0;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LotFoundry Certificate of Feasibility — ${escapeHtml(parcel.address)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Libre+Franklin:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    /* Certificate of Feasibility (DESIGN.md v2): an engraved instrument, not a
       dashboard. Sharp corners, double frame, ledger T-account, recorder stamp. */
    :root {
      color-scheme: light;
      --ink: #261307;
      --muted: #6B5B4D;
      --line: #E0CDB4;
      --taupe: #BFA58E;
      --paper: #F2E5D5;
      --card: #FBF6EE;
      --clay: #8C5B3F;
      --forest: #2F4A38;
      --amber: #C8922A;
      --brick: #A23B26;
      font-family: "Libre Franklin", Georgia, serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-size: 14px;
      line-height: 1.55;
      font-variant-numeric: tabular-nums;
    }
    main { max-width: 820px; margin: 0 auto; padding: 40px 24px; }
    .frame { background: var(--card); border: 1.5px solid var(--ink); padding: 10px; }
    .frame-inner { border: 1px solid var(--taupe); padding: 44px 48px; position: relative; }
    .mono {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    header { text-align: center; border-bottom: 1px solid var(--line); padding-bottom: 22px; margin-bottom: 26px; }
    .eyebrow { font-size: 10px; font-weight: 600; color: var(--clay); }
    h1 {
      margin: 8px 0 6px;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 38px;
      font-weight: 600;
      line-height: 1.05;
    }
    .serial { font-size: 10px; color: var(--muted); }
    .hero-money { text-align: center; margin: 26px 0 8px; }
    .hero-money .figure {
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 60px;
      font-weight: 700;
      line-height: 1;
      color: var(--forest);
    }
    .hero-money .unit { font-family: "IBM Plex Mono", monospace; font-size: 14px; color: var(--muted); }
    .hero-money .caption { margin-top: 6px; font-size: 10px; color: var(--muted); }
    h2 {
      margin: 30px 0 10px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--clay);
    }
    p { margin: 0; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; }
    .ledger th {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid var(--ink);
    }
    .ledger td { padding: 9px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
    .ledger td.amt { font-family: "IBM Plex Mono", ui-monospace, monospace; text-align: right; white-space: nowrap; }
    .ledger tr.balance td {
      border-top: 1.5px solid var(--ink);
      border-bottom: 4px double var(--ink);
      font-weight: 700;
    }
    .ledger tr.balance td.amt { color: var(--forest); }
    .snapshot td, .snapshot th {
      padding: 9px 6px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .snapshot th {
      width: 38%;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .snapshot tr:last-child th, .snapshot tr:last-child td { border-bottom: 0; }
    .status {
      display: inline-block;
      border: 1px solid ${result.zoningStatus === "Compliant" ? "var(--forest)" : "var(--amber)"};
      color: ${result.zoningStatus === "Compliant" ? "var(--forest)" : "var(--amber)"};
      padding: 3px 10px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .note { border-left: 3px solid var(--amber); background: var(--paper); padding: 12px 14px; color: var(--ink); }
    ol { margin: 0; padding-left: 20px; color: var(--muted); }
    li + li { margin-top: 8px; }
    .motto {
      margin-top: 34px;
      text-align: center;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-style: italic;
      font-size: 17px;
      color: var(--muted);
    }
    .stamp {
      position: absolute;
      right: 36px;
      bottom: 30px;
      transform: rotate(-7deg);
      border: 2px solid var(--brick);
      color: var(--brick);
      padding: 7px 14px;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    footer {
      margin-top: 22px;
      text-align: center;
      color: var(--muted);
      font-size: 11px;
    }
    @media (max-width: 680px) {
      main { padding: 20px 10px; }
      .frame-inner { padding: 28px 18px 84px; }
      h1 { font-size: 30px; }
      .hero-money .figure { font-size: 46px; }
      .snapshot th, .snapshot td { display: block; width: 100%; }
      .snapshot th { border-bottom: 0; padding-bottom: 2px; }
      .snapshot td { padding-top: 2px; }
      .stamp { right: 18px; bottom: 18px; }
    }
    @media print {
      body { background: white; }
      main { max-width: none; padding: 0; }
      .frame { border-color: var(--ink); }
      .stamp { opacity: 0.85; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <main>
    <div class="frame">
      <div class="frame-inner">
        <header>
          <div class="eyebrow mono">LotFoundry &middot; Feasibility Concept</div>
          <h1>Certificate of Feasibility</h1>
          <div class="serial mono">No. ${escapeHtml(serial)} &middot; ${escapeHtml(parcel.address)}, ${escapeHtml(parcel.city)} &middot; Recorded ${escapeHtml(recorded)}</div>
        </header>

        <div class="hero-money">
          <span class="figure">${escapeHtml(formatCurrency(result.monthlyRent))}</span><span class="unit">/mo</span>
          <div class="caption mono">Estimated rent &middot; ${result.aduSqft.toLocaleString()} sf ADU concept</div>
        </div>

        <h2>Annual Ledger</h2>
        <table class="ledger" aria-label="Annual income and cost ledger">
          <thead>
            <tr><th>Income (annual)</th><th></th><th>Costs (annual)</th><th></th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Gross rent, ${result.aduSqft.toLocaleString()} sf ADU</td>
              <td class="amt">${escapeHtml(formatCurrency(grossAnnualRent))}</td>
              <td>Operating allowance (${operatingPct}%)</td>
              <td class="amt">${escapeHtml(formatCurrency(operatingAllowance))}</td>
            </tr>
            <tr>
              <td>Build investment (one-time)</td>
              <td class="amt">${escapeHtml(formatCurrency(result.costLow))}&ndash;${escapeHtml(formatCurrency(result.costHigh))}</td>
              <td>Vacancy, maintenance, insurance &amp; tax delta</td>
              <td class="amt">within allowance</td>
            </tr>
            <tr class="balance">
              <td>Net operating income</td>
              <td class="amt">${escapeHtml(formatCurrency(result.annualNoi))}</td>
              <td>Payback estimate</td>
              <td class="amt">${result.paybackYears} yrs</td>
            </tr>
          </tbody>
        </table>

        <h2>Project Snapshot</h2>
        <table class="snapshot">
          <tbody>
            ${rows.map(([field, value]) => `<tr><th scope="row">${escapeHtml(field)}</th><td>${field === "Zoning status" ? `<span class="status">${escapeHtml(value)}</span>` : escapeHtml(value)}</td></tr>`).join("")}
          </tbody>
        </table>

        <h2>Review Note</h2>
        <p class="note">${escapeHtml(reviewNote)}</p>

        <h2>Recommended Next Steps</h2>
        <ol>
          <li>Confirm the parcel, zoning, and utility constraints with the local jurisdiction.</li>
          <li>Review the concept with a licensed designer or builder.</li>
          <li>Update costs, financing, taxes, and rent assumptions before making decisions.</li>
        </ol>

        <div class="motto">&ldquo;Your backyard is an asset.&rdquo;</div>
        <div class="stamp">Concept &middot; Not a Permit</div>
      </div>
    </div>
    <footer>${escapeHtml(DISCLAIMER)}</footer>
  </main>
</body>
</html>`;
}

/**
 * Build a two-column (Field, Value) CSV summary of the feasibility report,
 * with values escaped for safe CSV embedding.
 *
 * @param input - The {@link ReportInput} (parcel, config, result).
 * @returns The report as CSV text.
 */
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

/**
 * Trigger a client-side file download of string content via a temporary
 * object URL. No-op when run outside the browser (SSR-safe).
 *
 * @param filename - Suggested download filename.
 * @param content - The file contents.
 * @param mimeType - The content MIME type (charset `utf-8` is appended).
 */
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
