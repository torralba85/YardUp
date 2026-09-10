import type { PlacementResult } from "@/lib/placement-validation";
import { describePlacement } from "@/lib/placement-validation";
import { getSiteFitCapacityStatus } from "@/lib/site-fit";
import type { Parcel } from "@/lib/parcel-types";

/**
 * The one modeled-site-fit readout, shared by the 3D scene and the 2D
 * fallback. Placement and coverage are reported as two separate outcomes: an
 * ADU can pass the coverage allowance and still fail to fit (U1, D2), and the
 * old scene collapsed both into a single "site fit" line that could read
 * clear while the building overlapped the house.
 *
 * The whole block is one polite live region so a placement change announces
 * its new headline and its reasons together.
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
      <details className="px-3">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold">
          <span className="font-sans text-[11px] uppercase tracking-[0.14em] text-[#65655F]">Modeled site fit</span>
          <span className={status.tone === "clear" ? "text-[#176B4C]" : "text-[#8A5300]"}>{status.title}</span>
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
            ; house footprint and position are approximate. Compass bearing is
            unknown. Confirm surveyed boundaries and building separations.
          </p>
        </div>
      </details>
    </div>
  );
}
