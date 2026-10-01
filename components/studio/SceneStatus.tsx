"use client";

import { useEffect } from "react";
import { CheckCircle2, ChevronDown, TriangleAlert, XCircle } from "lucide-react";
import type { PlacementResult } from "@/lib/placement-validation";
import { describePlacementWithEvidence } from "@/lib/placement-evidence";
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
  const status = describePlacementWithEvidence(placement, parcel);
  const coverage = getSiteFitCapacityStatus(remainingCapacity, parcel);
  const needsReview = status.tone !== "clear" || coverage.tone !== "ok";
  const StatusIcon = status.tone === "clear" ? CheckCircle2 : status.tone === "blocked" ? XCircle : TriangleAlert;
  const statusColor = status.tone === "clear" ? "text-status-eligible" : status.tone === "blocked" ? "text-status-blocked" : "text-status-review";
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
      className={`shrink-0 border-t bg-lot-chalk text-lot-ink ${
        needsReview ? "border-status-review/40" : "border-lot-line"
      }`}
    >
      {setbackConflict && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-status-blocked/35 bg-status-blocked/5 px-3 py-2 text-xs leading-5 text-status-blocked"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Setback conflict.</strong> The active ADU crosses the modeled buildable envelope. The scene outline is red until the placement returns inside the boundary.
          </span>
        </div>
      )}

      <div className="flex items-start gap-2.5 px-4 pt-3">
        <StatusIcon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${statusColor}`} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${statusColor}`}>{status.title}</p>
          <p className="mt-1 max-w-prose text-xs leading-5 text-lot-stone">
            {placement.reasons[0]?.message ?? status.detail}
          </p>
          {status.missingEvidenceNotice && (
            <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-tight text-status-review font-medium">
              <TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              {status.missingEvidenceNotice}
            </p>
          )}
        </div>
      </div>

      <details className="group/status px-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-inset">
          Modeled site fit details
          <ChevronDown size={14} aria-hidden="true" className="ml-auto shrink-0 group-open/status:rotate-180" />
        </summary>
        <div className="space-y-1 pb-3 text-xs leading-5 text-lot-stone">
          <p>{status.detail}</p>
          <p>
            {coverage.title}. {coverage.action}
          </p>
          <p>
            {isProxy
              ? "Rectangular parcel proxy standing in for the recorded boundary"
              : parcel && "expectedRent" in parcel ? "Demo parcel" : parcel && ("boundaryGeoJson" in parcel && !!parcel.boundaryGeoJson) ? "Recorded GIS boundary (not a survey)" : "Measured boundary is unavailable"}
            ; house footprint and position are approximate. Compass bearing is unverified. Confirm surveyed boundaries and building separations.
          </p>
        </div>
      </details>

      {coverage.tone !== "ok" && (
        <p className="flex items-start gap-2 px-3 pb-3 text-xs leading-5 text-status-review">
          <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />
          <span>{coverage.title}. {coverage.action}</span>
        </p>
      )}
    </div>
  );
}
