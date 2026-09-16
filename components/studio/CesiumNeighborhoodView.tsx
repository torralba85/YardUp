"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LiveParcelData, Parcel } from "@/lib/parcel-types";
import type { ADUConfig } from "@/lib/feasibility";
import { buildAduSceneModel, projectLocalToGeodetic, type Pose2D } from "@/lib/scene-model";
import { loadCesium } from "@/lib/cesium-loader";

export interface CesiumNeighborhoodViewProps {
  parcel: Parcel | LiveParcelData;
  config: ADUConfig;
  pose: Pose2D;
  isCompliant: boolean;
  onReturnToModel?: () => void;
}

interface CesiumViewerInstance {
  destroy: () => void;
  isDestroyed: () => boolean;
  entities: {
    add: (options: Record<string, unknown>) => unknown;
  };
  camera: {
    flyTo: (options: Record<string, unknown>) => void;
  };
  scene: {
    primitives: {
      add: (primitive: unknown) => void;
    };
  };
}

interface CesiumModule {
  Viewer: new (container: Element | string, options?: Record<string, unknown>) => CesiumViewerInstance;
  ImageryLayer: new (provider: unknown) => unknown;
  OpenStreetMapImageryProvider: new (options?: Record<string, unknown>) => unknown;
  Cartesian3: {
    fromDegrees: (lng: number, lat: number, height?: number) => unknown;
    fromDegreesArray: (coordinates: number[]) => unknown;
  };
  Cartesian2: new (x: number, y: number) => unknown;
  Color: {
    fromCssColorString: (color: string) => { withAlpha: (alpha: number) => unknown };
  };
  LabelStyle: {
    FILL_AND_OUTLINE: number;
  };
  VerticalOrigin: {
    BOTTOM: number;
  };
  Math: {
    toRadians: (degrees: number) => number;
  };
  createOsmBuildingsAsync?: () => Promise<unknown>;
}

export default function CesiumNeighborhoodView({
  parcel,
  config,
  pose,
  onReturnToModel,
}: CesiumNeighborhoodViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derive target lat/lng from live parcel data or city defaults for presets
  const { lat, lng, isGeocoded } = useMemo(() => {
    if ("lat" in parcel && typeof parcel.lat === "number" && "lng" in parcel && typeof parcel.lng === "number") {
      return { lat: parcel.lat, lng: parcel.lng, isGeocoded: true };
    }
    const city = (parcel.city || "").toLowerCase();
    if (city.includes("portland")) {
      return { lat: 45.5152, lng: -122.6784, isGeocoded: false };
    }
    if (city.includes("austin")) {
      return { lat: 30.2672, lng: -97.7431, isGeocoded: false };
    }
    // Seattle default
    return { lat: 47.6917, lng: -122.3488, isGeocoded: false };
  }, [parcel]);

  useEffect(() => {
    let cancelled = false;
    let viewer: CesiumViewerInstance | null = null;

    async function initCesium() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const rawCesium = await loadCesium();
        const Cesium = rawCesium as unknown as CesiumModule;
        if (cancelled || !containerRef.current) return;

        // Initialize Cesium Viewer with clean minimalist chrome per A LOT MORE guidelines
        viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          baseLayer: new Cesium.ImageryLayer(
            new Cesium.OpenStreetMapImageryProvider({
              url: "https://tile.openstreetmap.org/",
              maximumLevel: 19,
            }),
          ),
        });

        // Add asynchronous OSM 3D buildings if available in the Cesium distribution
        try {
          if (typeof Cesium.createOsmBuildingsAsync === "function") {
            const osmBuildings = await Cesium.createOsmBuildingsAsync();
            if (!cancelled && viewer && !viewer.isDestroyed()) {
              viewer.scene.primitives.add(osmBuildings);
            }
          }
        } catch {
          // Graceful fallback if Ion token is not present or endpoint is offline
        }

        if (cancelled || !viewer || viewer.isDestroyed()) return;

        // Add Parcel Pin & Label
        viewer.entities.add({
          name: "Parcel Site",
          position: Cesium.Cartesian3.fromDegrees(lng, lat),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString("#FF5B24"),
            outlineColor: Cesium.Color.fromCssColorString("#F5F5F0"),
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: parcel.address || "Proposed ADU Site",
            font: "600 13px Manrope, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#161616"),
            outlineColor: Cesium.Color.fromCssColorString("#F5F5F0"),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -14),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        // Add Parcel Boundary Polygon if GeoJSON is available
        const boundaryGeoJson = "boundaryGeoJson" in parcel ? parcel.boundaryGeoJson : null;
        if (boundaryGeoJson?.coordinates?.[0]?.length) {
          const flatCoords = boundaryGeoJson.coordinates[0].flatMap(([coordLng, coordLat]) => [coordLng, coordLat]);
          viewer.entities.add({
            name: "Parcel Boundary",
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
              material: Cesium.Color.fromCssColorString("#2D6A4F").withAlpha(0.25),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString("#2D6A4F"),
              outlineWidth: 2,
            },
          });
        }

        // Project Proposed ADU Footprint to geodetic coordinates
        try {
          const aduModel = buildAduSceneModel(config, pose);
          const anchor = { lat, lng };
          const corners = aduModel.footprintCorners;
          if (corners && corners.length === 4) {
            const geodeticCorners = corners.map((corner) => projectLocalToGeodetic(anchor, 0, corner));
            if (geodeticCorners.every((c): c is { lat: number; lng: number } => c !== null)) {
              const flatAduCoords = geodeticCorners.flatMap((c) => [c.lng, c.lat]);
              viewer.entities.add({
                name: "Proposed ADU Footprint",
                polygon: {
                  hierarchy: Cesium.Cartesian3.fromDegreesArray(flatAduCoords),
                  material: Cesium.Color.fromCssColorString("#FF5B24").withAlpha(0.75),
                  extrudedHeight: (config.height || 14) * 0.3048,
                  outline: true,
                  outlineColor: Cesium.Color.fromCssColorString("#C43708"),
                },
              });
            }
          }
        } catch {
          // Keep base parcel site visible if local projection fails
        }

        // Camera flight to isometric neighborhood perspective
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat - 0.0022, 280),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0,
          },
          duration: 1.5,
        });

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "CesiumJS viewer failed to initialize.");
        }
      }
    }

    void initCesium();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, [lat, lng, parcel, config, pose]);

  return (
    <div className="relative h-full w-full min-h-[440px] overflow-hidden bg-lf-paper text-lf-ink">
      {/* Cesium canvas target */}
      <div ref={containerRef} className="h-full w-full" data-testid="cesium-container" />

      {/* Floating HUD banner */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex max-w-sm flex-col gap-1 rounded-[3px] border border-lf-hairline bg-lf-paper/95 p-3 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-lot-signal shrink-0" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tracking-wide text-lf-ink">
            Neighborhood 3D
          </span>
          <span className="rounded bg-lf-muted/10 px-1.5 py-0.5 font-mono text-[10px] text-lf-muted uppercase">
            CesiumJS
          </span>
        </div>
        <p className="truncate text-xs text-lf-ink font-medium">
          {parcel.address || "Proposed ADU Site"}
        </p>
        <p className="font-mono text-[11px] text-lf-muted">
          {lat.toFixed(5)}°N, {Math.abs(lng).toFixed(5)}°W {!isGeocoded ? "(City Default)" : ""}
        </p>
        {onReturnToModel && (
          <div className="pointer-events-auto mt-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={onReturnToModel}
              className="h-8 w-full text-xs font-medium"
            >
              Return to 3D model
            </Button>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-lf-paper/85 backdrop-blur-xs"
        >
          <RefreshCw size={24} className="animate-spin text-lot-signal" aria-hidden="true" />
          <p className="text-sm font-medium text-lf-ink">Streaming 3D globe & neighborhood data…</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-lf-paper p-6 text-center"
        >
          <AlertCircle size={28} className="text-lot-signal" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-lf-ink">
            3D Globe currently unavailable
          </h3>
          <p className="max-w-xs text-xs text-lf-muted">
            {errorMessage ?? "Could not load CesiumJS resources in this browser session."}
          </p>
          {onReturnToModel && (
            <Button type="button" variant="secondary" onClick={onReturnToModel} className="mt-2">
              Return to 3D model
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
