import { residentialZoningCode } from "@/lib/zoning-designation";
export { residentialZoningCode } from "@/lib/zoning-designation";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import type { LiveParcelData } from "@/lib/parcel-types";

export type RuleCheck = "yes" | "no" | "unknown";

export interface CaliforniaAduEvaluation {
  applicable: boolean;
  status: "qualified" | "review" | "not-applicable";
  residentialZoning: RuleCheck;
  footprintProtected: boolean;
  parkingWaiverEligible: boolean | null;
  transitDistanceMiles: number | null;
  title: string;
  summary: string;
}

function parcelState(parcel: Parcel): string {
  if ("state" in parcel && typeof (parcel as LiveParcelData).state === "string") {
    return (parcel as LiveParcelData).state.trim().toUpperCase();
  }
  const match = parcel.city.match(/,\s*([A-Z]{2})(?:\s|$)/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function residentialZoning(parcel: Parcel): RuleCheck {
  if (!("zoning" in parcel)) return "unknown";
  return residentialZoningCode(String((parcel as LiveParcelData).zoning ?? ""));
}

/**
 * Baseline California ADU screen requested by the LotFoundry sprint plan.
 *
 * This is intentionally a narrow statewide-baseline evaluator, not a local
 * zoning determination or permit approval. Transit distance is optional because
 * the current parcel contract does not provide a verified transit measurement;
 * when it is unavailable the parking-waiver check remains explicitly unknown.
 */
export function evaluateCaliforniaAduRules({
  parcel,
  config,
  transitDistanceMiles = null,
}: {
  parcel: Parcel;
  config: Pick<ADUConfig, "footprint" | "width" | "length">;
  transitDistanceMiles?: number | null;
}): CaliforniaAduEvaluation {
  const applicable = parcelState(parcel) === "CA";
  const zoning = residentialZoning(parcel);
  const footprintSqft = Number.isFinite(config.footprint)
    ? config.footprint
    : config.width * config.length;
  const footprintProtected = footprintSqft > 0 && footprintSqft <= 800;
  const normalizedTransitDistance =
    transitDistanceMiles !== null && Number.isFinite(transitDistanceMiles) && transitDistanceMiles >= 0
      ? transitDistanceMiles
      : null;
  const parkingWaiverEligible =
    normalizedTransitDistance === null ? null : normalizedTransitDistance <= 0.5;

  if (!applicable) {
    return {
      applicable: false,
      status: "not-applicable",
      residentialZoning: zoning,
      footprintProtected,
      parkingWaiverEligible,
      transitDistanceMiles: normalizedTransitDistance,
      title: "California statewide screen not applicable",
      summary: "Use the parcel's local zoning and state rules for this address.",
    };
  }

  const qualified = zoning === "yes" && footprintProtected;
  return {
    applicable: true,
    status: qualified ? "qualified" : "review",
    residentialZoning: zoning,
    footprintProtected,
    parkingWaiverEligible,
    transitDistanceMiles: normalizedTransitDistance,
    title: qualified
      ? "Statewide Exemption Qualified (Gov Code § 65852.2)"
      : "California baseline needs review",
    summary: qualified
      ? "The current concept passes LotFoundry's baseline residential-zone and 800 sf screening checks."
      : zoning === "unknown"
        ? "Zoning is unverified, so LotFoundry cannot confirm the statewide baseline screen yet."
        : zoning === "no"
          ? "The parcel's reported zoning does not read as residential in the current dataset."
          : "Reduce the concept to 800 sf or less to satisfy this baseline footprint screen.",
  };
}
