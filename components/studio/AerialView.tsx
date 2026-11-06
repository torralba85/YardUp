"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import type { LiveParcelData } from "@/lib/parcel-types";
import type { ADUConfig } from "@/lib/feasibility";
import type { Pose2D } from "@/lib/scene-model";
import { Button } from "@/components/ui/Button";
import { latLngToPixel } from "@/lib/map-utils";
import { useAuth } from "@/lib/auth-context";
import { COLOR } from "@/lib/design-tokens";


const IMG_W = 800;
const IMG_H = 540;
const ZOOM = 19;

/** Props for {@link AerialView}. */
export interface AerialViewProps {
  /** The live parcel whose boundary and location drive the overlay. */
  parcel: LiveParcelData;
  /** Legacy caller contract; conceptual geometry is shown only in the model. */
  config: ADUConfig;
  /** Legacy caller contract; model fit never implies zoning approval here. */
  isCompliant: boolean;
  /** Legacy caller contract; no geographic pose transform is established. */
  pose: Pose2D;
  /** Returns to the 3D model — the aerial view is read-only. */
  onReturnToModel?: () => void;
}

/**
 * Renders satellite context and a published parcel boundary when available.
 * Conceptual buildings and setbacks remain in the drafting model; an address
 * point cannot establish their real-world origin and orientation.
 *
 * The satellite image is proxied through /api/aerial so GOOGLE_MAPS_API_KEY
 * is never exposed to the browser.
 */
export default function AerialView({
  parcel,
  onReturnToModel,
}: AerialViewProps) {
  const { user } = useAuth();
  const { lat, lng } = parcel;
  const [aerialSrc, setAerialSrc] = useState<string | null>(null);
  const [aerialError, setAerialError] = useState(false);
  const [attribution, setAttribution] = useState<string | null>(null);
  const [requestedZoom, setRequestedZoom] = useState<19 | 20>(ZOOM);
  const [resolvedZoom, setResolvedZoom] = useState<number>(ZOOM);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadAerial() {
      setAerialError(false);
      setAerialSrc(null);
      setAttribution(null);

      try {
        const idToken = await user?.getIdToken();
        const zoomSuffix = requestedZoom === 20 ? "&zoom=20" : "";
        const res = await fetch(
          `/api/aerial?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&w=${IMG_W}&h=${IMG_H}${zoomSuffix}`,
          {
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
          },
        );
        if (!res.ok) {
          if (!cancelled) {
            setAerialError(true);
          }
          return;
        }

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (!cancelled) {
          const headerZoom = Number(res.headers.get("X-Aerial-Zoom"));
          setResolvedZoom(
            Number.isFinite(headerZoom) && headerZoom >= 18 ? headerZoom : requestedZoom,
          );
          setAerialError(res.headers.get("X-Aerial-Fallback") === "true");
          setAttribution(res.headers.get("X-Aerial-Attribution"));
          setAerialSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setAerialError(true);
        }
      }
    }

    loadAerial();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [lat, lng, requestedZoom, user]);

  // Project parcel boundary GeoJSON to SVG polygon points string using the
  // effective zoom returned by /api/aerial so fallback from zoom 20 -> 19 stays aligned.
  const boundaryPoints = useMemo(() => {
    if (!parcel.boundaryGeoJson?.coordinates?.[0]) return null;
    return parcel.boundaryGeoJson.coordinates[0]
      .map(([pLng, pLat]) => {
        const { x, y } = latLngToPixel(pLat, pLng, lat, lng, resolvedZoom, IMG_W, IMG_H);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [parcel.boundaryGeoJson, lat, lng, resolvedZoom]);

  return (
    <div
      className="relative flex h-full min-h-[460px] w-full flex-col overflow-hidden bg-lot-ink"
      aria-label="Aerial lot view"
    >
      <div className="relative min-h-[240px] flex-1">
      {aerialSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aerialSrc}
            alt={
              aerialError
                ? `Fallback parcel map for ${parcel.address}`
                : `Satellite context near ${parcel.address}`
            }
            className="absolute inset-0 h-full w-full object-contain"
            width={IMG_W}
            height={IMG_H}
            draggable={false}
            onError={() => {
              // Undecodable payload (truncated raster, provider error bytes):
              // drop the image and show the unavailable notice instead.
              setAerialSrc(null);
              setAttribution(null);
              setAerialError(true);
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-lot-ink"
          aria-label={aerialError ? "Aerial image unavailable" : "Loading aerial image"}
          role="status"
          aria-live="polite"
        >
          {!aerialError && (
            <>
              <RefreshCw size={20} className="motion-safe:animate-spin text-lot-orange-ink" aria-hidden="true" />
              <p className="text-xs font-medium text-lot-chalk">Loading satellite context…</p>
            </>
          )}
        </div>
      )}

      {/* Address coordinates cannot establish building placement or bearing. */}
      {boundaryPoints && aerialSrc && !aerialError && (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <polygon points={boundaryPoints} fill="none" stroke={COLOR["lot-ink"]} strokeWidth="5" strokeDasharray="8 4" />
          <polygon points={boundaryPoints} fill="none" stroke={COLOR["lot-chalk"]} strokeWidth="2.5" strokeDasharray="8 4" />
        </svg>
      )}

      {/* The aerial view is read-only; give it a labelled way back to the
          editable model instead of leaving the user to find the toggle (U8). */}
      {onReturnToModel && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onReturnToModel}
          className="absolute left-4 top-4 min-h-11"
        >
          Return to 3D model
        </Button>
      )}

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Button
          type="button"
          size="xs"
          variant={requestedZoom === 20 ? "selected" : "secondary"}
          aria-pressed={requestedZoom === 20}
          onClick={() => setRequestedZoom((z) => (z === 20 ? 19 : 20))}
        >
          {requestedZoom === 20 ? "Closer view (2×)" : "Closer lot view"}
        </Button>
        <div
          className="pointer-events-none border border-lot-line bg-lot-chalk px-2.5 py-1.5 text-xs font-semibold text-lot-ink"
          aria-label="Zoning designation, not approval"
        >
          {parcel.zoning}
        </div>
      </div>

      {/* Fallback notice */}
      {aerialError && (
        <div
          className="pointer-events-none absolute left-4 top-20 max-w-[min(24rem,calc(100%-2rem))] rounded-none border border-lot-line bg-lot-chalk px-3 py-3 text-xs leading-5 text-lot-ink shadow-callout"
          role="note"
        >
          <span className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} className="shrink-0 text-status-review" aria-hidden="true" />Aerial imagery unavailable</span>
          <span className="mt-1 block text-lot-stone">Satellite detail is unavailable. Use the 3D model for conceptual placement.</span>
        </div>
      )}

      </div>

      {/* Normal flow reserves space when the context and credits wrap on phones.
          Provider-embedded Google logos/credits stay in the uncropped image. */}
      <div className="shrink-0 space-y-[7px] border-t border-lot-line-dark bg-lot-ink px-4 py-[13px]"
        aria-label="Aerial context and imagery credits">
        <div
          className="pointer-events-none flex items-start gap-2 rounded-none border border-status-review-on-dark/40 bg-lot-ink/90 px-3 py-2 text-xs text-lot-chalk"
          role="note"
        >
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-status-review-on-dark" aria-hidden="true" />
          <span>
            Imagery is context only. House and ADU positions are not geographically aligned.
            {boundaryPoints ? " Dashed line: published GIS boundary, not a survey." : " Parcel boundary unavailable; model dimensions are estimated."}
            {" "}Use the 3D model for conceptual placement and verify site measurements.
          </span>
        </div>
        {/* Required attribution for the keyless Esri imagery provider. */}
        {attribution && (
          <div className="pointer-events-none text-[10px] leading-4 text-lot-stone-on-dark" role="note">
            {attribution}
          </div>
        )}
      </div>
    </div>
  );
}
