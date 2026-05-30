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
  "Investor-demo estimate only. Verify zoning, costs, financing, taxes, and rent assumptions before decisions.";

export function buildReportText({ parcel, config, result }: ReportInput): string {
  const lines = [
    "LotFoundry - Concept Feasibility Report",
    `${parcel.address}, ${parcel.city}`,
    "",
    `ADU concept: ${result.aduSqft.toLocaleString()} sf, ${roofLabels[config.roof]} roof, ${finishLabels[config.finish]} finish`,
    `Lot coverage: ${result.coveragePercent.toFixed(1)}% of ${result.maxCoveragePercent}% max`,
    `Zoning status: ${result.zoningStatus}`,
    `Estimated build cost: ${formatCurrency(result.costLow)} - ${formatCurrency(result.costHigh)}`,
    `Monthly rent estimate: ${formatCurrency(result.monthlyRent)}`,
    `Annual NOI estimate: ${formatCurrency(result.annualNoi)}`,
    `Simple payback: ${result.paybackYears} years`,
    "",
    DISCLAIMER,
  ];
  return lines.join("\n");
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
    ["Annual NOI ($)", String(result.annualNoi)],
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
