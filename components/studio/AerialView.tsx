"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveParcelData } from "@/lib/parcel-types";
import type { ADUConfig } from "@/lib/feasibility";
import { latLngToPixel } from "@/lib/map-utils";
import { useAuth } from "@/lib/auth-context";

const IMG_W = 800;
const IMG_H = 540;
const ZOOM = 19;
const SCALE = 2; // retina — matches /api/aerial

export interface AerialViewProps {
  parcel: LiveParcelData;
  config: ADUConfig;
  isCompliant: boolean;
}

/**
 * Renders a satellite aerial view of the parcel with:
 * - Parcel boundary polygon overlay (dashed forest green)
 * - ADU footprint rectangle overlay (solid forest green)
 * - Setback dimension labels
 * - "PROPOSED ADU" and "EXISTING HOUSE" labels
 *
 * The satellite image is proxied through /api/aerial so GOOGLE_MAPS_API_KEY
 * is never exposed to the browser.
 */
export default function AerialView({
  parcel,
  config,
  isCompliant,
}: AerialViewProps) {
  const { user } = useAuth();
  const { lat, lng } = parcel;
  const [aerialSrc, setAerialSrc] = useState<string | null>(null);
  const [aerialError, setAerialError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadAerial() {
      setAerialError(false);
      setAerialSrc(null);

      try {
        const idToken = await user?.getIdToken();
        const res = await fetch(
          `/api/aerial?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&w=${IMG_W}&h=${IMG_H}`,
          {
            headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
            cache: "no-store",
          },
        );
        if (!res.ok) throw new Error(`Aerial image returned ${res.status}`);

        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (!cancelled) {
          setAerialSrc(objectUrl);
        }
      } catch (err) {
        console.error("[AerialView] Failed to load aerial image:", err);
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
  }, [lat, lng, user]);

  // Project a lat/lng to SVG pixel coordinates
  const toPixel = (pLat: number, pLng: number) =>
    latLngToPixel(pLat, pLng, lat, lng, ZOOM, IMG_W, IMG_H, SCALE);

  // Project parcel boundary GeoJSON to SVG polygon points string
  const boundaryPoints = useMemo(() => {
    if (!parcel.boundaryGeoJson?.coordinates?.[0]) return null;
    return parcel.boundaryGeoJson.coordinates[0]
      .map(([pLng, pLat]) => {
        const { x, y } = toPixel(pLat, pLng);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcel.boundaryGeoJson, lat, lng]);

  // Approximate ADU footprint rectangle centered behind the house
  // (placed at rear of lot — a typical ADU placement)
  const aduRect = useMemo(() => {
    // 1 degree lat ≈ 364,000 ft, 1 degree lng ≈ 288,000 ft at 38°N
    const ftPerDegLat = 364000;
    const ftPerDegLng = 288000;

    // Place ADU in the rear portion of the lot
    const rearOffsetFt = parcel.setbacks.rear + config.length / 2;
    const aduLatCenter = lat - rearOffsetFt / ftPerDegLat;
    const aduLngCenter = lng;

    const halfW = (config.width / 2) / ftPerDegLng;
    const halfL = (config.length / 2) / ftPerDegLat;

    const corners = [
      { lat: aduLatCenter + halfL, lng: aduLngCenter - halfW },
      { lat: aduLatCenter + halfL, lng: aduLngCenter + halfW },
      { lat: aduLatCenter - halfL, lng: aduLngCenter + halfW },
      { lat: aduLatCenter - halfL, lng: aduLngCenter - halfW },
    ];

    const pixels = corners.map((c) => toPixel(c.lat, c.lng));
    const minX = Math.min(...pixels.map((p) => p.x));
    const minY = Math.min(...pixels.map((p) => p.y));
    const maxX = Math.max(...pixels.map((p) => p.x));
    const maxY = Math.max(...pixels.map((p) => p.y));

    const centerPixel = toPixel(aduLatCenter, aduLngCenter);

    return {
      points: pixels.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
      labelX: centerPixel.x,
      labelY: centerPixel.y,
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, config.width, config.length, parcel.setbacks.rear]);

  // Approximate existing house center (middle of lot, slightly front-biased)
  const houseCenter = useMemo(() => {
    const ftPerDegLat = 364000;
    const houseLat = lat - (parcel.lotLength * 0.3) / ftPerDegLat;
    return toPixel(houseLat, lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, parcel.lotLength]);

  // SVG overlay colors — these match --lf-forest (#2F4A38) and --lf-brick (#A23B26)
  // but must be hardcoded hex for SVG attributes (CSS variables don't work in SVG stroke/fill)
  const statusColor = isCompliant ? "#2F4A38" : "#A23B26";

  return (
    <div
      className="relative h-full min-h-[460px] w-full overflow-hidden bg-lf-espresso"
      aria-label="Aerial parcel view"
    >
      {aerialSrc ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aerialSrc}
            alt={`Satellite view of ${parcel.address}`}
            className="absolute inset-0 h-full w-full object-cover"
            width={IMG_W}
            height={IMG_H}
            draggable={false}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-lf-espresso"
          aria-label={aerialError ? "Aerial image unavailable" : "Loading aerial image"}
          role="status"
        />
      )}

      {/* SVG overlay */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${IMG_W} ${IMG_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {/* Parcel boundary */}
        {boundaryPoints && (
          <polygon
            points={boundaryPoints}
            fill="none"
            stroke={statusColor}
            strokeWidth="2.5"
            strokeDasharray="8 4"
            strokeLinejoin="round"
            opacity="0.9"
          />
        )}

        {/* ADU footprint */}
        <polygon
          points={aduRect.points}
          fill={`${statusColor}22`}
          stroke={statusColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* "PROPOSED ADU" label background */}
        <rect
          x={aduRect.labelX - 46}
          y={aduRect.labelY - 10}
          width="92"
          height="18"
          rx="3"
          fill="rgba(0,0,0,0.65)"
        />
        <text
          x={aduRect.labelX}
          y={aduRect.labelY + 4}
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontFamily="'Geist Mono', monospace"
          fontWeight="600"
          letterSpacing="0.06em"
        >
          PROPOSED ADU
        </text>

        {/* Existing house marker */}
        <rect
          x={houseCenter.x - 52}
          y={houseCenter.y - 10}
          width="104"
          height="18"
          rx="3"
          fill="rgba(0,0,0,0.55)"
        />
        <text
          x={houseCenter.x}
          y={houseCenter.y + 4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize="10"
          fontFamily="'Geist Mono', monospace"
          fontWeight="600"
          letterSpacing="0.06em"
        >
          EXISTING HOUSE
        </text>

        {/* Setback labels — rear */}
        <SetbackLabel
          x={IMG_W / 2}
          y={40}
          text={`Rear Setback ${parcel.setbacks.rear}.0 ft`}
        />
        {/* Setback labels — side */}
        <SetbackLabel
          x={24}
          y={IMG_H / 2}
          text={`Side ${parcel.setbacks.side}.0 ft`}
          rotate={-90}
        />
        {/* Setback labels — front */}
        <SetbackLabel
          x={IMG_W / 2}
          y={IMG_H - 24}
          text={`Front Setback ${parcel.setbacks.front}.0 ft`}
        />
      </svg>

      {/* Zoning badge */}
      <div
        className={`pointer-events-none absolute right-4 top-4 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white shadow-md ${
          isCompliant ? "bg-[var(--lf-forest)]" : "bg-[var(--lf-brick)]"
        }`}
        aria-label={`Zoning status: ${isCompliant ? "Compliant" : "Review needed"}`}
      >
        {parcel.zoning}
      </div>

      {/* Fallback notice */}
      {parcel.source === "fallback" && (
        <div
          className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-md border border-lf-amber/40 bg-lf-mahogany/80 px-3 py-2 text-xs text-lf-sand backdrop-blur-sm"
          role="note"
        >
          ⚠ Parcel boundary unavailable for this address — showing estimated defaults. Verify dimensions with your local jurisdiction.
        </div>
      )}
    </div>
  );
}

function SetbackLabel({
  x,
  y,
  text,
  rotate,
}: {
  x: number;
  y: number;
  text: string;
  rotate?: number;
}) {
  const transform = rotate ? `rotate(${rotate}, ${x}, ${y})` : undefined;
  const w = text.length * 6.2 + 12;
  return (
    <g transform={transform}>
      <rect
        x={x - w / 2}
        y={y - 10}
        width={w}
        height="18"
        rx="3"
        fill="rgba(0,0,0,0.55)"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill="white"
        fontSize="9.5"
        fontFamily="'Geist Mono', monospace"
        opacity="0.92"
        letterSpacing="0.04em"
      >
        {text}
      </text>
    </g>
  );
}
