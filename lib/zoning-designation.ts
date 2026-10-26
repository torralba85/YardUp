/** A code-pattern screen, not a jurisdiction's permitted-use determination. */
export type ResidentialZoningCheck = "yes" | "no" | "unknown";

export function normalizeZoningDesignation(raw: string): string {
  return raw.trim().toUpperCase().replace(/^(?:(?:\[[A-Z0-9]+\]|\([A-Z0-9]+\))\s*)+/, "");
}

export function residentialZoningCode(raw: string): ResidentialZoningCheck {
  const zoning = normalizeZoningDesignation(raw);
  if (!zoning || zoning === "UNKNOWN") return "unknown";
  if (/\bNON[- ]?RESIDENTIAL\b/.test(zoning)) return "no";
  // Mixed-use and planned districts need local permitted-use information.
  if (/\bMIXED[- ]?USE\b|^(?:PD|PUD|MU)(?:[-\s\d]|$)/.test(zoning)) return "unknown";
  if (/^(?:C\d*|CC|CG|CN|M\d*|I\d*|IL|IH|IG|PF)(?:[-\s.\d]|$)/.test(zoning) ||
      /\b(?:COMMERCIAL|INDUSTRIAL)\b/.test(zoning)) return "no";
  if (/\b(?:RESIDENTIAL|SINGLE[- ]?FAMILY|MULTI[- ]?FAMILY)\b/.test(zoning)) return "yes";
  if (/^(?:R\d+[A-Z]*|R|RS|RM|RD|RE|RA|RW|RU|RT|RX|RL|RH|RR|RMP|SF|MF|LDR|MDR|HDR)(?:[-\s.\d]|$)/.test(zoning)) return "yes";
  return "unknown";
}

/** Broad planning estimate only; unrecognized code families have no inferred allowance. */
export function estimatedZoningCoverage(raw: string): number | null {
  const zoning = normalizeZoningDesignation(raw);
  if (residentialZoningCode(zoning) !== "yes") return null;
  // Consume the complete numeric district, so R-20 cannot become R-2.
  const numbered = /^R-?(\d+)(?=[A-Z\s.-]|$)/.exec(zoning);
  if (numbered) return ({ "1": 40, "2": 45, "3": 50, "4": 55, "5": 55 } as Record<string, number>)[numbered[1]] ?? null;
  if (/^(?:RS|RE|RA|RW|RL|RR|SF|LDR)(?=[\d\s.-]|$)/.test(zoning)) return 40;
  if (/^(?:RD|RT|RX|MDR)(?=[\d\s.-]|$)/.test(zoning)) return 45;
  if (/^(?:MF|RM|RMP|RU|RH|HDR)(?=[\d\s.-]|$)/.test(zoning)) return 55;
  return null;
}
