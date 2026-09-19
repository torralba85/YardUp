"use client";

import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { evaluateCaliforniaAduRules } from "@/utils/rules/californiaAduRules";

export function FeasibilityBadge({
  parcel,
  config,
  transitDistanceMiles = null,
  surface = "dark",
}: {
  parcel: Parcel;
  config: Pick<ADUConfig, "footprint" | "width" | "length">;
  transitDistanceMiles?: number | null;
  surface?: "dark" | "light";
}) {
  const evaluation = evaluateCaliforniaAduRules({ parcel, config, transitDistanceMiles });
  if (!evaluation.applicable) return null;

  const qualified = evaluation.status === "qualified";
  const foreground = surface === "dark" ? "text-[#F5F5F0]" : "text-[#161616]";
  const muted = surface === "dark" ? "text-[#B7B7AE]" : "text-[#65655F]";
  const border = surface === "dark" ? "border-[#44443F]" : "border-[#DADAD3]";
  const statusColor = qualified
    ? surface === "dark" ? "text-[#5FBF93]" : "text-[#176B4C]"
    : surface === "dark" ? "text-[#E0A33C]" : "text-[#8A5300]";
  const Icon = qualified ? CheckCircle2 : AlertTriangle;

  return (
    <details className={`group mt-3 border-t ${border} pt-2`}>
      <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-semibold ${foreground}`}>
        <Icon className={`h-4 w-4 shrink-0 ${statusColor}`} aria-hidden="true" />
        <span className={statusColor}>{evaluation.title}</span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className={`space-y-2 pb-2 text-xs leading-5 ${muted}`}>
        <p>{evaluation.summary}</p>
        <p>
          Baseline screen: residential zoning {evaluation.residentialZoning === "yes" ? "identified" : evaluation.residentialZoning === "no" ? "not identified" : "unverified"}; current concept {evaluation.footprintProtected ? "is" : "is not"} at or below 800 sf.
        </p>
        <p>
          State-plan reference: 4 ft side/rear setback baseline, no minimum-lot-size screen, no owner-occupancy screen, and an impact-fee exemption screen below 750 sf. Confirm current local implementation before relying on any of these items.
        </p>
        <p>
          Parking-waiver transit check: {evaluation.parkingWaiverEligible === null
            ? "not evaluated because a verified transit distance is not available"
            : evaluation.parkingWaiverEligible
              ? `within ${evaluation.transitDistanceMiles?.toFixed(2)} mi (baseline threshold: 0.5 mi)`
              : `${evaluation.transitDistanceMiles?.toFixed(2)} mi away, outside the 0.5 mi baseline threshold`}.
        </p>
        <p className={foreground}>Planning screen only - not a permit approval or legal determination.</p>
      </div>
    </details>
  );
}
