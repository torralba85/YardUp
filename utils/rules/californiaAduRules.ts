import type { ADUConfig, Parcel } from "@/lib/feasibility";

export type RuleCheck = "yes" | "no" | "unknown";

/**
 * California residential zoning regex screen.
 * Tests if a zoning code string matches typical residential designations.
 */
export function residentialZoningCode(zoning: string | undefined | null): RuleCheck {
  if (!zoning || typeof zoning !== "string") return "unknown";
  const cleaned = zoning.trim().toUpperCase();
  if (!cleaned) return "unknown";

  // Common residential designations: R1, R2, R3, RS, RD, RM, RH, R-1, etc.
  if (/^(R\d|RS|RD|RM|RH|R-|RES)/i.test(cleaned)) {
    return "yes";
  }

  // Non-residential or commercial/industrial/public facilities
  if (/^(C\d|CC|CR|M\d|IL|IH|PF|OS|A\d|AR)/i.test(cleaned)) {
    return "no";
  }

  return "no";
}

export interface CaliforniaAduEvaluation {
  applicable: boolean;
  status: "qualified" | "review";
  title: string;
  summary: string;
  residentialZoning: RuleCheck;
  footprintProtected: boolean;
  parkingWaiverEligible: boolean | null;
  transitDistanceMiles: number | null;
}

export interface EvaluateCaliforniaAduRulesParams {
  parcel: Parcel;
  config: Pick<ADUConfig, "footprint" | "width" | "length">;
  transitDistanceMiles?: number | null;
}

/**
 * Pre-screen an ADU concept against California state ADU regulations.
 */
export function evaluateCaliforniaAduRules({
  parcel,
  config,
  transitDistanceMiles = null,
}: EvaluateCaliforniaAduRulesParams): CaliforniaAduEvaluation {
  const parcelRecord = parcel as unknown as Record<string, unknown>;
  const parcelState = typeof parcelRecord.state === "string" ? parcelRecord.state : undefined;
  const isCalifornia =
    parcelState?.toUpperCase() === "CA" ||
    parcel.address?.toLowerCase().includes(", ca") ||
    parcel.city?.toLowerCase().includes("san diego") ||
    parcel.city?.toLowerCase().includes("los angeles") ||
    parcel.city?.toLowerCase().includes("chula vista") ||
    parcel.city?.toLowerCase().includes("carlsbad") ||
    parcel.city?.toLowerCase().includes("oceanside") ||
    parcel.city?.toLowerCase().includes("escondido");

  if (!isCalifornia) {
    return {
      applicable: false,
      status: "review",
      title: "California ADU Pre-Screen",
      summary: "Not applicable outside California.",
      residentialZoning: "unknown",
      footprintProtected: false,
      parkingWaiverEligible: null,
      transitDistanceMiles: null,
    };
  }

  const zoning = typeof parcelRecord.zoning === "string" ? parcelRecord.zoning : undefined;
  const residentialZoning = residentialZoningCode(zoning);
  const aduFootprint = config.footprint ?? config.width * config.length;
  const footprintProtected = aduFootprint <= 800;

  const parkingWaiverEligible =
    transitDistanceMiles !== null && transitDistanceMiles !== undefined
      ? transitDistanceMiles <= 0.5
      : null;

  const qualified = residentialZoning !== "no" && footprintProtected;

  return {
    applicable: true,
    status: qualified ? "qualified" : "review",
    title: qualified
      ? "California ADU Pre-Screen: Qualified"
      : "California ADU Pre-Screen: Review needed",
    summary: qualified
      ? "Proposed ADU meets state baseline standards for residential parcels under 800 sq ft."
      : "Proposed ADU has parameters that warrant local verification or exceeds protected baseline limits.",
    residentialZoning,
    footprintProtected,
    parkingWaiverEligible,
    transitDistanceMiles: transitDistanceMiles ?? null,
  };
}
