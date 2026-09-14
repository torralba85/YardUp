"use client";

import { useEffect } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import type { PlacementResult } from "@/lib/placement-validation";
import { describePlacement } from "@/lib/placement-validation";
import { getSiteFitCapacityStatus } from "@/lib/site-fit";
import type { Parcel } from "@/lib/parcel-types";
import { updateStudioParcel } from "@/lib/studio-enhancements-store";

/**
 * The one modeled-site-fit readout, shared by the 3D scene and the 2D
 * fallback. Placement and coverage are reported as separate outcomes.
 */
export function SceneStatus({
  id,
  placement,
  remainingCapacity,
  isProxy,
  parcel,
}: {
  id?: string;
  placement: PlacementResult;
  remainingCapacity: number;
  isProxy: boolean;
  parcel?: Parcel;
}) {
  const status = describePlacement(placement);
  const coverage = getSiteFitCapacityStatus(remainingCapacity, parcel);
  const needsReview = status.tone !== "clear" || coverage.tone !== "ok";
  const setbackConflict =
    placement.envelopeStatus === "overflow" || placement.envelopeStatus === "empty";

  useEffect(() => {
    if (parcel) updateStudioParcel(parcel, placement);
  }, [parcel, placement]);

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      aria-label="Modeled site fit status"
      className={`shrink-0 border-t bg-[#F5F5F0] text-[#161616] ${
        needsReview ? "border-[#E0A33C]/60" : "border-[#DADAD3]"
      }`}
    >
      {setbackConflict && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-[#A82D16]/35 bg-[#A82D16]/5 px-3 py-2 text-xs leading-5 text-[#A82D16]"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Setback conflict.</strong> The active ADU crosses the modeled buildable envelope. The scene outline is red until the placement returns inside the boundary.
          </span>
        </div>
      )}

      <details className="group/status px-3">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold">
          <span className="font-sans text-[11px] uppercase tracking-[0.08em] text-[#65655F]">Modeled site fit</span>
          <span className={status.tone === "clear" ? "text-[#176B4C]" : "text-[#8A5300]"}>{status.title}</span>
          <ChevronDown size={14} aria-hidden="true" className="ml-auto shrink-0 group-open/status:rotate-180" />
        </summary>
        <div className="space-y-1 pb-3 text-xs leading-5 text-[#65655F]">
          <p>{status.detail}</p>
          <p>
            {coverage.title}. {coverage.action}
          </p>
          <p>
            {isProxy
              ? "Rectangular parcel proxy standing in for the recorded boundary"
              : "Demo parcel"}
            ; house footprint and position are approximate. Compass bearing is unknown. Confirm surveyed boundaries and building separations.
          </p>
        </div>
      </details>

      {coverage.tone !== "ok" && (
        <p className="flex items-start gap-2 px-3 pb-3 text-xs leading-5 text-[#8A5300]">
          <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />
          <span>{coverage.title}. {coverage.action}</span>
        </p>
      )}
    </div>
  );
}
