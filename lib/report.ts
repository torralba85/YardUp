import { COLOR } from "@/lib/design-tokens";
import { planningRows, type FinancingInputs } from "./certificate-planning";
import {
  finishLabels,
  formatCurrency,
  roofLabels,
  type ADUConfig,
  type FeasibilityResult,
} from "./feasibility";
import { marketProvenanceLine } from "./market/market-basis";
import type { Parcel } from "./parcel-types";
import type { AIProjectBrief } from "./ai-types";
import { buildableArea } from "./feasibility-verdict";
import { getSiteFitCapacityStatus } from "./site-fit";
import { parcelConfidence, parcelDataNotice } from "./parcel-confidence";

function coverageLabel(parcel: Parcel, result: FeasibilityResult): string {
  const { footprintKnown, regulationsEstimated } = parcelConfidence(parcel);
  if (!footprintKnown) return "Unknown — existing building footprint unavailable";
  return `${result.coveragePercent.toFixed(1)}% of ${result.maxCoveragePercent}% ${regulationsEstimated ? "assumed max" : "max"}`;
}

export interface ReportStyleMatchConcept {
  styleName: string;
  matchPercentage: number;
  traits: string[];
  conceptUrl: string;
  photoUrl?: string;
}

/** Inputs needed to render any of the feasibility report formats. */
export interface ReportInput {
  financing?: FinancingInputs;
  /** The parcel the report describes. */
  parcel: Parcel;
  /** The ADU configuration. */
  config: ADUConfig;
  /** The computed feasibility result. */
  result: FeasibilityResult;
  /** Recorded date shown on the certificate; defaults to now. Injectable for tests. */
  recordedAt?: Date;
  /** Optional generated parcel interpretation and permit timeline. */
  projectBrief?: AIProjectBrief;
  projectBriefSavedAt?: string | null;
  /** Optional style-matched concept generated from reference photo. */
  styleMatchConcept?: ReportStyleMatchConcept | null;
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
export function buildReportText({
  financing,
  parcel,
  config,
  result,
  recordedAt,
  projectBrief,
  projectBriefSavedAt,
  styleMatchConcept,
}: ReportInput): string {
  const briefRisks = Array.isArray(projectBrief?.risks) ? projectBrief.risks : [];
  const briefStages = Array.isArray(projectBrief?.stages) ? projectBrief.stages : [];
  const nextSteps = Array.isArray(projectBrief?.recommendedNextSteps)
    ? projectBrief.recommendedNextSteps
    : [
        "Confirm the parcel, zoning, and utility constraints with the local jurisdiction.",
        "Review the concept with a licensed designer or builder.",
        "Update costs, financing, taxes, and rent assumptions before making decisions.",
      ];
  const lines = [
    "LotFoundry Certificate of Feasibility",
    `No. ${makeCertificateSerial(parcel)} - Recorded ${formatRecordedDate(recordedAt ?? new Date())}`,
    "",
    "Property",
    `Address: ${parcel.address}, ${parcel.city}`,
    ...(parcelDataNotice(parcel) ? [`Parcel data: ${parcelDataNotice(parcel)}`] : []),
    "",
    "ADU Concept",
    `Size: ${result.aduSqft.toLocaleString()} sf`,
    `Roof: ${roofLabels[config.roof]}`,
    `Exterior finish: ${finishLabels[config.finish]}`,
    `Openings included: ${config.includeOpenings ? "Yes" : "No"}`,
    "",
    "Site Fit",
    `Lot coverage: ${coverageLabel(parcel, result)}`,
    `Setbacks${parcelConfidence(parcel).regulationsEstimated ? " (assumed)" : ""}: ${parcel.setbacks.front} ft front, ${parcel.setbacks.rear} ft rear, ${parcel.setbacks.side} ft side`,
    `Estimated area after modeled setbacks: ${buildableArea(parcel).toLocaleString()} sf`,
    `Remaining coverage capacity: ${getSiteFitCapacityStatus(result.remainingCapacity, parcel).title}`,
    `Zoning status: ${result.zoningStatus}`,
    ...(result.warnings.length > 0
      ? result.warnings.map((warning, index) => `Review note ${index + 1}: ${warning}`)
      : ["Review note: No coverage warning for the current assumptions."]),
    "",
    "Financial Estimate",
    `Estimated build cost: ${formatCurrency(result.costLow)} - ${formatCurrency(result.costHigh)}`,
    `Monthly rent estimate: ${formatCurrency(result.monthlyRent)}`,
    `Annual net income estimate: ${formatCurrency(result.annualNoi)}`,
    `Payback: ${result.paybackYears} years`,
    `Rent basis: ${result.rentBasis}`,
    `Market source: ${marketProvenanceLine(result.market)}`,
    `Operating expense ratio: ${(result.operatingExpenseRatio * 100).toFixed(1)}%`,
    "",
    ...(styleMatchConcept
      ? [
          "AI Style-Matched Concept",
          `Style: ${styleMatchConcept.styleName} (${styleMatchConcept.matchPercentage}% match)`,
          `Matched traits: ${styleMatchConcept.traits.join(", ")}`,
          "",
        ]
      : []),
    ...(projectBrief
      ? [
          "Property & Permit Brief",
          ...(projectBriefSavedAt ? ["Saved Brief snapshot. Verify these historical notes against current guidance."] : []),
          projectBrief.headline,
          projectBrief.summary,
          `Best fit: ${projectBrief.bestFit}`,
          ...briefRisks.map(
            (risk) => `Verify — ${risk.label} (${risk.level}): ${risk.explanation}`,
          ),
          "",
          `Typical permit track: ${projectBrief.permitTrack.name} (${projectBrief.permitTrack.type})`,
          `Basis: ${projectBrief.permitTrack.basis}`,
          `Typical approval timeline: ${projectBrief.totalEstWeeksLow}-${projectBrief.totalEstWeeksHigh} weeks`,
          ...briefStages.map(
            (stage, index) =>
              `${index + 1}. ${stage.name}: ${stage.estWeeksLow}-${stage.estWeeksHigh} weeks (${stage.status}) — ${stage.description}`,
          ),
          `AI note: ${projectBrief.disclaimer}`,
          "",
        ]
      : []),
    "Next Steps",
    ...nextSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    DISCLAIMER,
  ];
  lines.push("", "Financing, fees & contractor review", ...planningRows(parcel, result, financing).map(([label, value]) => `${label}: ${value}`));
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
export function buildReportHtml({
  financing,
  parcel,
  config,
  result,
  recordedAt,
  projectBrief,
  projectBriefSavedAt,
  styleMatchConcept,
}: ReportInput): string {
  const rows: Array<[string, string]> = [
    ["Property", `${parcel.address}, ${parcel.city}`],
    ...(parcelDataNotice(parcel) ? [["Parcel data", parcelDataNotice(parcel)!] as [string, string]] : []),
    ["ADU size", `${result.aduSqft.toLocaleString()} sf`],
    ["Roof", roofLabels[config.roof]],
    ["Exterior finish", finishLabels[config.finish]],
    ["Lot coverage", coverageLabel(parcel, result)],
    [
      parcelConfidence(parcel).regulationsEstimated ? "Setbacks (assumed)" : "Setbacks",
      `${parcel.setbacks.front} ft front, ${parcel.setbacks.rear} ft rear, ${parcel.setbacks.side} ft side`,
    ],
    ["Estimated area after modeled setbacks", `${buildableArea(parcel).toLocaleString()} sf`],
    ["Remaining coverage capacity", getSiteFitCapacityStatus(result.remainingCapacity, parcel).title],
    ["Zoning status", result.zoningStatus],
    ["Build cost range", `${formatCurrency(result.costLow)} - ${formatCurrency(result.costHigh)}`],
    ["Monthly rent estimate", formatCurrency(result.monthlyRent)],
    ["Annual net income estimate", formatCurrency(result.annualNoi)],
    ["Payback", `${result.paybackYears} years`],
    ["Market basis", marketProvenanceLine(result.market)],
  ];

  const reviewNotes =
    result.warnings.length > 0
      ? result.warnings
      : ["No coverage warning for the current assumptions."];
  const serial = makeCertificateSerial(parcel);
  const recorded = formatRecordedDate(recordedAt ?? new Date());
  // Ledger lines are derived from the engine result so the T-account always
  // balances: gross rent minus the operating allowance equals NOI exactly.
  const grossAnnualRent = result.monthlyRent * 12;
  const operatingAllowance = grossAnnualRent - result.annualNoi;
  const operatingPct =
    grossAnnualRent > 0 ? Math.round((operatingAllowance / grossAnnualRent) * 1000) / 10 : 0;
  const nextSteps = Array.isArray(projectBrief?.recommendedNextSteps)
    ? projectBrief.recommendedNextSteps
    : [
        "Confirm the parcel, zoning, and utility constraints with the local jurisdiction.",
        "Review the concept with a licensed designer or builder.",
        "Update costs, financing, taxes, and rent assumptions before making decisions.",
      ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LotFoundry Certificate of Feasibility — ${escapeHtml(parcel.address)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    /* Certificate of Feasibility (A LOT MORE): an architectural plat sheet, not a
       dashboard. Sharp corners, double frame, ledger T-account, recorder stamp. */
    :root {
      color-scheme: light;
      --ink: ${COLOR["lot-ink"]};
      --muted: ${COLOR["lot-stone"]};
      --line: ${COLOR["lot-line"]};
      --taupe: ${COLOR["lot-stone-on-dark"]};
      --paper: ${COLOR["lot-chalk"]};
      --card: ${COLOR["lot-chalk"]};
      --clay: ${COLOR["lot-orange-ink"]};
      --forest: ${COLOR["status-eligible"]};
      --amber: ${COLOR["status-review"]};
      --brick: ${COLOR["status-blocked"]};
      font-family: "Manrope", Arial, sans-serif;
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
      font-family: "Manrope", Arial, sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    header { text-align: center; border-bottom: 1px solid var(--line); padding-bottom: 22px; margin-bottom: 26px; }
    .eyebrow { font-size: 10px; font-weight: 600; color: var(--clay); }
    h1 {
      margin: 8px 0 6px;
      font-family: "Space Grotesk", Arial, sans-serif;
      font-size: 38px;
      font-weight: 600;
      line-height: 1.05;
    }
    .serial { font-size: 10px; color: var(--muted); }
    .hero-money { text-align: center; margin: 26px 0 8px; }
    .hero-money .figure {
      font-family: "Space Grotesk", Arial, sans-serif;
      font-size: 60px;
      font-weight: 700;
      line-height: 1;
      color: var(--ink);
    }
    .hero-money .unit { font-family: "Manrope", Arial, sans-serif; font-size: 14px; color: var(--muted); }
    .hero-money .caption { margin-top: 6px; font-size: 10px; color: var(--muted); }
    h2 {
      margin: 30px 0 10px;
      font-family: "Manrope", Arial, sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--clay);
    }
    p { margin: 0; color: var(--muted); }
    table { width: 100%; border-collapse: collapse; }
    .ledger th {
      font-family: "Manrope", Arial, sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid var(--ink);
    }
    .ledger td { padding: 9px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
    .ledger td.amt { font-family: "Manrope", Arial, sans-serif; text-align: right; white-space: nowrap; }
    .ledger tr.balance td {
      border-top: 1.5px solid var(--ink);
      border-bottom: 4px double var(--ink);
      font-weight: 700;
    }
    .ledger tr.balance td.amt { color: var(--ink); }
    .snapshot td, .snapshot th {
      padding: 9px 6px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .snapshot th {
      width: 38%;
      font-family: "Manrope", Arial, sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .snapshot tr:last-child th, .snapshot tr:last-child td { border-bottom: 0; }
    .status {
      display: inline-block;
      border: 1px solid ${result.zoningStatus === "Compliant" ? "var(--forest)" : "var(--amber)"};
      color: ${result.zoningStatus === "Compliant" ? "var(--forest)" : "var(--amber)"};
      padding: 3px 10px;
      font-family: "Manrope", Arial, sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .note { border-left: 3px solid var(--amber); background: var(--paper); padding: 12px 14px; color: var(--ink); }
    .note p { color: var(--ink); }
    .note p + p { margin-top: 8px; }
    ol { margin: 0; padding-left: 20px; color: var(--muted); }
    li + li { margin-top: 8px; }
    .ai-brief { margin-top: 32px; padding: 24px 0; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--line); }
    .brief-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
    .brief-heading h2 { margin: 0; }
    .brief-total { white-space: nowrap; text-align: right; }
    .brief-total strong { font-family: "Space Grotesk", Arial, sans-serif; font-size: 32px; line-height: 1; color: var(--ink); }
    .brief-total span { margin-left: 5px; font-family: "Manrope", Arial, sans-serif; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .brief-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 28px; margin-top: 22px; }
    .brief-column + .brief-column { border-left: 1px solid var(--line); padding-left: 28px; }
    .brief-label { font-family: "Manrope", Arial, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--clay); }
    .brief-title { margin: 7px 0 0; font-size: 15px; line-height: 1.4; color: var(--ink); }
    .brief-copy { margin-top: 7px; font-size: 12px; line-height: 1.7; }
    .best-fit { margin-top: 14px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 11px 0; }
    .best-fit p { margin-top: 5px; color: var(--ink); }
    .risk-list { margin-top: 14px; border-top: 1px solid var(--line); }
    .risk-row { padding: 10px 0; border-bottom: 1px solid var(--line); }
    .risk-head, .track-head, .stage-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .risk-head strong, .track-head strong, .stage-head strong { color: var(--ink); }
    .risk-row p, .track-basis, .stage-copy { margin-top: 4px; font-size: 11px; line-height: 1.55; }
    .data-chip { display: inline-block; border: 1px solid var(--line); padding: 2px 7px; font-family: "Manrope", Arial, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
    .tone-low { color: var(--muted); }
    .tone-medium { color: ${COLOR["status-review"]}; border-color: ${COLOR["status-review"]}60; background: ${COLOR["status-review"]}1A; }
    .tone-high { color: var(--brick); border-color: ${COLOR["status-blocked"]}60; background: ${COLOR["status-blocked"]}1A; }
    .stage-list { list-style: none; margin: 16px 0 0; padding: 0; }
    .stage { display: grid; grid-template-columns: 24px 1fr; gap: 10px; position: relative; padding-bottom: 13px; }
    .stage + .stage { margin-top: 0; }
    .stage:not(:last-child)::before { content: ""; position: absolute; left: 11px; top: 23px; bottom: 0; width: 1px; background: var(--line); }
    .stage-index { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 1px solid var(--line); border-radius: 50%; background: var(--card); font-family: "Manrope", Arial, sans-serif; font-size: 9px; color: var(--muted); z-index: 1; }
    .stage-body { padding-bottom: 10px; border-bottom: 1px solid var(--line); }
    .stage:last-child .stage-body { border-bottom: 0; }
    .stage-weeks, .stage-status { font-family: "Manrope", Arial, sans-serif; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
    .stage-status { display: block; margin-top: 5px; font-weight: 600; letter-spacing: 0.08em; }
    .stage-clear { color: var(--forest); }
    .stage-review { color: ${COLOR["status-review"]}; }
    .stage-blocker { color: var(--brick); }
    .brief-disclaimer { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 12px; font-size: 10px; line-height: 1.6; }
    .motto {
      margin-top: 34px;
      text-align: center;
      font-family: "Space Grotesk", Arial, sans-serif;
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
      font-family: "Manrope", Arial, sans-serif;
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
      .brief-heading { align-items: flex-start; flex-direction: column; }
      .brief-total { text-align: left; }
      .brief-grid { grid-template-columns: 1fr; }
      .brief-column + .brief-column { border-left: 0; border-top: 1px solid var(--line); padding-left: 0; padding-top: 20px; }
      .stamp { right: 18px; bottom: 18px; }
    }
    @media print {
      body { background: ${COLOR["lot-print-paper"]}; }
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
          <div class="caption mono">${escapeHtml(result.rentBasis)}</div>
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
              <td>Yearly net income</td>
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

        <h2>Review Notes</h2>
        <div class="note">
          ${reviewNotes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
        </div>

        ${styleMatchConcept ? buildStyleMatchConceptHtml(styleMatchConcept) : ""}

        ${projectBrief && projectBriefSavedAt ? "<p>Saved Brief snapshot. Verify these historical notes against current guidance.</p>" : ""}
        ${projectBrief ? buildProjectBriefHtml(projectBrief) : ""}

        <h2>Recommended Next Steps</h2>
        <ol>
          ${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>

        <div class="motto">&ldquo;See what your backyard can earn.&rdquo;</div>
        <div class="stamp">Concept &middot; Not a Permit</div>
      </div>
    </div>
    <footer>${escapeHtml(DISCLAIMER)}</footer>
  </main>
<section style="margin: 24px auto; max-width: 900px; padding: 24px;">
  <h2>Financing, fees &amp; contractor review</h2>
  <dl>${planningRows(parcel, result, financing).map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd style="margin: 4px 0 16px;">${escapeHtml(value)}</dd>`).join("")}</dl>
</section>
</body>
</html>`;
}

function buildStyleMatchConceptHtml(concept: ReportStyleMatchConcept): string {
  const traits = Array.isArray(concept.traits) ? concept.traits : [];
  return `<section class="concept-plate" aria-labelledby="concept-plate-heading" style="margin-top: 32px; padding: 24px 0; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--line);">
    <div class="brief-heading">
      <div>
        <div class="brief-label">AI Style Match &middot; Architectural Concept Plate</div>
        <h2 id="concept-plate-heading" style="margin: 6px 0 0; font-family: 'Space Grotesk', Arial, sans-serif; font-size: 22px; font-weight: 600; color: var(--ink); text-transform: none; letter-spacing: -0.03em;">
          ${escapeHtml(concept.styleName)} Concept
        </h2>
      </div>
      <div class="brief-total">
        <strong style="font-family: 'Space Grotesk', Arial, sans-serif; font-size: 28px; line-height: 1; color: var(--ink);">${concept.matchPercentage}%</strong>
        <span>style match</span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: ${concept.photoUrl ? "1fr 1fr" : "1fr"}; gap: 16px; margin-top: 18px;">
      ${
        concept.photoUrl
          ? `<div style="border: 1px solid var(--line); padding: 8px; background: var(--card);">
        <div style="font-family: 'Manrope', Arial, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px;">Reference Home</div>
        <img src="${escapeHtml(concept.photoUrl)}" alt="Reference Home" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
      </div>`
          : ""
      }
      <div style="border: 1px solid var(--line); padding: 8px; background: var(--card);">
        <div style="font-family: 'Manrope', Arial, sans-serif; font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px;">Style-Matched ADU Concept</div>
        <img src="${escapeHtml(concept.conceptUrl)}" alt="${escapeHtml(concept.styleName)} ADU Concept" style="width: 100%; height: 220px; object-fit: cover; display: block;" />
      </div>
    </div>

    ${
      traits.length > 0
        ? `<div style="margin-top: 16px;">
      <div class="brief-label" style="margin-bottom: 6px;">Matched Architectural Traits</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${traits
          .map(
            (trait) =>
              `<span class="data-chip tone-low" style="font-size: 10px; padding: 3px 8px;">${escapeHtml(trait)}</span>`,
          )
          .join("")}
      </div>
    </div>`
        : ""
    }

    <p class="brief-disclaimer" style="margin-top: 14px;">Conceptual rendering for stylistic and architectural inspiration. Not engineering or construction blueprints.</p>
  </section>`;
}

function buildProjectBriefHtml(brief: AIProjectBrief): string {
  const risks = Array.isArray(brief.risks) ? brief.risks : [];
  const stages = Array.isArray(brief.stages) ? brief.stages : [];

  return `<section class="ai-brief" aria-labelledby="ai-brief-heading">
    <div class="brief-heading">
      <div>
        <div class="brief-label">AI-assisted &middot; Recorded in this certificate</div>
        <h2 id="ai-brief-heading">Parcel &amp; Permit Brief</h2>
      </div>
      <div class="brief-total">
        <strong>${brief.totalEstWeeksLow}&ndash;${brief.totalEstWeeksHigh}</strong>
        <span>weeks typical</span>
      </div>
    </div>

    <div class="brief-grid">
      <div class="brief-column">
        <div class="brief-label">Parcel interpretation</div>
        <h3 class="brief-title">${escapeHtml(brief.headline)}</h3>
        <p class="brief-copy">${escapeHtml(brief.summary)}</p>

        <div class="best-fit">
          <div class="brief-label">Best-fit concept</div>
          <p>${escapeHtml(brief.bestFit)}</p>
        </div>

        ${
          risks.length > 0
            ? `<div class="risk-list">
              ${risks
                .map(
                  (risk) => `<div class="risk-row">
                    <div class="risk-head">
                      <strong>${escapeHtml(risk.label)}</strong>
                      <span class="data-chip ${reportRiskClass(risk.level)}">${escapeHtml(risk.level)}</span>
                    </div>
                    <p>${escapeHtml(risk.explanation)}</p>
                  </div>`,
                )
                .join("")}
            </div>`
            : ""
        }
      </div>

      <div class="brief-column">
        <div class="track-head">
          <div>
            <div class="brief-label">Typical approval path</div>
            <strong>${escapeHtml(brief.permitTrack.name)}</strong>
          </div>
          <span class="data-chip tone-low">${escapeHtml(brief.permitTrack.type)}</span>
        </div>
        <p class="track-basis">${escapeHtml(brief.permitTrack.basis)}</p>

        <ol class="stage-list">
          ${stages
            .map((stage, index) => {
              const stageTone = reportStageClass(stage.status);
              return `<li class="stage">
                <span class="stage-index">${index + 1}</span>
                <div class="stage-body">
                  <div class="stage-head">
                    <strong>${escapeHtml(stage.name)}</strong>
                    <span class="stage-weeks">${stage.estWeeksLow}&ndash;${stage.estWeeksHigh} wk</span>
                  </div>
                  <p class="stage-copy">${escapeHtml(stage.description)}</p>
                  <span class="stage-status ${stageTone.className}">${stageTone.label}</span>
                </div>
              </li>`;
            })
            .join("")}
        </ol>
      </div>
    </div>

    <p class="brief-disclaimer">${escapeHtml(brief.disclaimer)}</p>
  </section>`;
}

function reportRiskClass(level: string): string {
  if (level === "medium") return "tone-medium";
  if (level === "high") return "tone-high";
  return "tone-low";
}

function reportStageClass(status: string): { className: string; label: string } {
  if (status === "review") return { className: "stage-review", label: "Review" };
  if (status === "blocker") return { className: "stage-blocker", label: "Blocker" };
  return { className: "stage-clear", label: "Clear" };
}

/**
 * Build a two-column (Field, Value) CSV summary of the feasibility report,
 * with values escaped for safe CSV embedding.
 *
 * @param input - The {@link ReportInput} (parcel, config, result).
 * @returns The report as CSV text.
 */
export function buildReportCsv({
  financing,
  parcel,
  config,
  result,
  projectBrief,
  projectBriefSavedAt,
  styleMatchConcept,
}: ReportInput): string {
  const risks = Array.isArray(projectBrief?.risks) ? projectBrief.risks : [];
  const stages = Array.isArray(projectBrief?.stages) ? projectBrief.stages : [];
  const nextSteps = Array.isArray(projectBrief?.recommendedNextSteps)
    ? projectBrief.recommendedNextSteps
    : [];
  const aiRows: Array<[string, string]> = [];
  if (projectBrief && projectBriefSavedAt) {
    aiRows.push(["Brief provenance", "Saved historical snapshot"], ["Scenario saved at", projectBriefSavedAt]);
  }
  if (styleMatchConcept) {
    aiRows.push(
      ["AI Style Match Name", styleMatchConcept.styleName],
      ["AI Style Match Confidence (%)", String(styleMatchConcept.matchPercentage)],
      ["AI Style Match Traits", styleMatchConcept.traits.join("; ")],
    );
    if (!styleMatchConcept.conceptUrl.startsWith("data:")) {
      aiRows.push(["AI Style Match Concept URL", styleMatchConcept.conceptUrl]);
    }
    if (
      styleMatchConcept.photoUrl &&
      !styleMatchConcept.photoUrl.startsWith("data:") &&
      !styleMatchConcept.photoUrl.startsWith("blob:")
    ) {
      aiRows.push(["AI Style Match Reference Photo URL", styleMatchConcept.photoUrl]);
    }
  }
  if (projectBrief) {
    aiRows.push(
      ["AI Brief Headline", projectBrief.headline],
      ["AI Parcel Summary", projectBrief.summary],
      ["AI Best Fit", projectBrief.bestFit],
      ...risks.map(
        (risk): [string, string] => [
          `AI Verify - ${risk.label} (${risk.level})`,
          risk.explanation,
        ],
      ),
      ["Typical Permit Track", projectBrief.permitTrack.name],
      ["Permit Track Type", projectBrief.permitTrack.type],
      ["Permit Track Basis", projectBrief.permitTrack.basis],
      [
        "Typical Approval Timeline (weeks)",
        `${projectBrief.totalEstWeeksLow}-${projectBrief.totalEstWeeksHigh}`,
      ],
      ...stages.map(
        (stage, index): [string, string] => [
          `Permit Stage ${index + 1} - ${stage.name}`,
          `${stage.estWeeksLow}-${stage.estWeeksHigh} weeks (${stage.status}): ${stage.description}`,
        ],
      ),
      ...nextSteps.map(
        (step, index): [string, string] => [`AI Next Step ${index + 1}`, step],
      ),
      ["AI Brief Disclaimer", projectBrief.disclaimer],
    );
  }
  const rows: Array<[string, string]> = [
    ["Field", "Value"],
    ["Address", `${parcel.address}, ${parcel.city}`],
    ...(parcelDataNotice(parcel) ? [["Parcel data", parcelDataNotice(parcel)!] as [string, string]] : []),
    ["ADU Size (sf)", String(result.aduSqft)],
    ["Roof", roofLabels[config.roof]],
    ["Exterior Finish", finishLabels[config.finish]],
    ["Lot Coverage (%)", parcelConfidence(parcel).footprintKnown ? result.coveragePercent.toFixed(1) : "Unknown"],
    ["Max Coverage (%)", String(result.maxCoveragePercent)],
    ["Front Setback (ft)", String(parcel.setbacks.front)],
    ["Rear Setback (ft)", String(parcel.setbacks.rear)],
    ["Side Setback (ft)", String(parcel.setbacks.side)],
    ["Estimated Area After Modeled Setbacks (sf)", String(buildableArea(parcel))],
    ["Remaining Coverage Capacity (sf)", parcelConfidence(parcel).footprintKnown ? String(result.remainingCapacity) : "Unknown"],
    ...(parcelConfidence(parcel).regulationsEstimated ? [["Regulatory assumptions", "Zoning, setbacks and maximum coverage unverified"] as [string, string]] : []),
    ["Zoning Status", result.zoningStatus],
    ["Build Cost Low ($)", String(result.costLow)],
    ["Build Cost High ($)", String(result.costHigh)],
    ["Monthly Rent ($)", String(result.monthlyRent)],
    ["Annual Net Income ($)", String(result.annualNoi)],
    ["Simple Payback (years)", String(result.paybackYears)],
    ["Rent Basis", result.rentBasis],
    ["Market Source", marketProvenanceLine(result.market)],
    ["Operating Expense Ratio (%)", (result.operatingExpenseRatio * 100).toFixed(1)],
    ...result.warnings.map(
      (warning, index): [string, string] => [`Review Note ${index + 1}`, warning],
    ),
    ...aiRows,
    ...planningRows(parcel, result, financing),
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
