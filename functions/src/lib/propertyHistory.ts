import type { PropertyRecord } from "../types";

export function buildStarterPropertyHistory(address: string, projectId: string): PropertyRecord[] {
  const city = inferCity(address);
  const now = new Date().toISOString();

  return [
    {
      id: `history-${projectId}-jurisdiction`,
      projectId,
      source: `${city} public permit portal`,
      recordType: "Permit history search",
      date: now,
      summary:
        "Backend lookup is configured, but no live municipal permit-data provider is connected yet. Treat this as a sourced search state, not an official result.",
      citationUrl: "https://www.hcd.ca.gov/building-standards/adu/handbook",
    },
    {
      id: `history-${projectId}-verification`,
      projectId,
      source: "ADU Advisor backend",
      recordType: "Verification note",
      date: now,
      summary:
        "Before design or construction decisions, verify address jurisdiction, assessor records, prior permits, and historic overlays with the city or county portal.",
      citationUrl: "https://www.hcd.ca.gov/building-standards/adu/handbook",
    },
  ];
}

function inferCity(address: string): string {
  const normalized = address.toLowerCase();
  if (normalized.includes("san diego")) return "San Diego";
  if (normalized.includes("san jose")) return "San Jose";
  if (normalized.includes("oakland")) return "Oakland";
  if (normalized.includes("sacramento")) return "Sacramento";
  return "Los Angeles";
}
