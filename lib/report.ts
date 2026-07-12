import {
  finishLabels,
  formatCurrency,
  roofLabels,
  type ADUConfig,
  type FeasibilityResult,
} from "./feasibility";
import type { Parcel } from "./parcel-types";
import type { AIProjectBrief } from "./ai-types";

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
  /** Optional generated parcel interpretation and permit timeline. */
  projectBrief?: AIProjectBrief;
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
  parcel,
  config,
  result,
  recordedAt,
  projectBrief,
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
    ...(projectBrief
      ? [
          "AI Parcel & Permit Brief",
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
  parcel,
  config,
  result,
  recordedAt,
  projectBrief,
}: ReportInput): string {
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
    .ai-brief { margin-top: 32px; padding: 24px 0; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--line); }
    .brief-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
    .brief-heading h2 { margin: 0; }
    .brief-total { white-space: nowrap; text-align: right; }
    .brief-total strong { font-family: "Cormorant Garamond", Georgia, serif; font-size: 32px; line-height: 1; color: var(--ink); }
    .brief-total span { margin-left: 5px; font-family: "IBM Plex Mono", monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .brief-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 28px; margin-top: 22px; }
    .brief-column + .brief-column { border-left: 1px solid var(--line); padding-left: 28px; }
    .brief-label { font-family: "IBM Plex Mono", monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--clay); }
    .brief-title { margin: 7px 0 0; font-size: 15px; line-height: 1.4; color: var(--ink); }
    .brief-copy { margin-top: 7px; font-size: 12px; line-height: 1.7; }
    .best-fit { margin-top: 14px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 11px 0; }
    .best-fit p { margin-top: 5px; color: var(--ink); }
    .risk-list { margin-top: 14px; border-top: 1px solid var(--line); }
    .risk-row { padding: 10px 0; border-bottom: 1px solid var(--line); }
    .risk-head, .track-head, .stage-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    .risk-head strong, .track-head strong, .stage-head strong { color: var(--ink); }
    .risk-row p, .track-basis, .stage-copy { margin-top: 4px; font-size: 11px; line-height: 1.55; }
    .data-chip { display: inline-block; border: 1px solid var(--line); padding: 2px 7px; font-family: "IBM Plex Mono", monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
    .tone-low { color: var(--muted); }
    .tone-medium { color: #745A00; border-color: #745A0060; background: #C8922A1A; }
    .tone-high { color: var(--brick); border-color: #A23B2660; background: #A23B261A; }
    .stage-list { list-style: none; margin: 16px 0 0; padding: 0; }
    .stage { display: grid; grid-template-columns: 24px 1fr; gap: 10px; position: relative; padding-bottom: 13px; }
    .stage + .stage { margin-top: 0; }
    .stage:not(:last-child)::before { content: ""; position: absolute; left: 11px; top: 23px; bottom: 0; width: 1px; background: var(--line); }
    .stage-index { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 1px solid var(--line); border-radius: 50%; background: var(--card); font-family: "IBM Plex Mono", monospace; font-size: 9px; color: var(--muted); z-index: 1; }
    .stage-body { padding-bottom: 10px; border-bottom: 1px solid var(--line); }
    .stage:last-child .stage-body { border-bottom: 0; }
    .stage-weeks, .stage-status { font-family: "IBM Plex Mono", monospace; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
    .stage-status { display: block; margin-top: 5px; font-weight: 600; letter-spacing: 0.14em; }
    .stage-clear { color: var(--forest); }
    .stage-review { color: #745A00; }
    .stage-blocker { color: var(--brick); }
    .brief-disclaimer { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 12px; font-size: 10px; line-height: 1.6; }
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
      .brief-heading { align-items: flex-start; flex-direction: column; }
      .brief-total { text-align: left; }
      .brief-grid { grid-template-columns: 1fr; }
      .brief-column + .brief-column { border-left: 0; border-top: 1px solid var(--line); padding-left: 0; padding-top: 20px; }
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

        ${projectBrief ? buildProjectBriefHtml(projectBrief) : ""}

        <h2>Recommended Next Steps</h2>
        <ol>
          ${nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
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
export function buildReportCsv({ parcel, config, result, projectBrief }: ReportInput): string {
  const risks = Array.isArray(projectBrief?.risks) ? projectBrief.risks : [];
  const stages = Array.isArray(projectBrief?.stages) ? projectBrief.stages : [];
  const nextSteps = Array.isArray(projectBrief?.recommendedNextSteps)
    ? projectBrief.recommendedNextSteps
    : [];
  const aiRows: Array<[string, string]> = projectBrief
    ? [
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
      ]
    : [];
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
    ...aiRows,
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
