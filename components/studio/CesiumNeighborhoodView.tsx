"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LiveParcelData, Parcel } from "@/lib/parcel-types";
import type { ADUConfig } from "@/lib/feasibility";
import { buildAduSceneModel, projectLocalToGeodetic, type Pose2D } from "@/lib/scene-model";
import { loadCesium } from "@/lib/cesium-loader";
import {
  describePhotorealRoute,
  loadPhotorealTileset,
  photorealUnavailableReason,
  readPhotorealCredentialsFromEnv,
  selectPhotorealStartupRoute,
  type PhotorealCesiumModule,
  type PhotorealRoute,
} from "@/lib/cesium-photoreal";
import {
  sampleGroundHeight,
  shouldRefineGround,
  type GroundSnapCesiumModule,
  type GroundSnapScene,
  type GroundSnapStatus,
} from "@/lib/cesium-ground-snap";
import { ensureGeoidReady, formatGroundElevation, geoidHeightMeters } from "@/lib/geoid";

export interface CesiumNeighborhoodViewProps {
  parcel: Parcel | LiveParcelData;
  config: ADUConfig;
  pose: Pose2D;
  isCompliant: boolean;
  onReturnToModel?: () => void;
}

const FEET_TO_METERS = 0.3048;

/**
 * Provisional camera altitude, in metres above the WGS84 ellipsoid, used only to
 * get tiles streaming before the ground height under the parcel is known. It has
 * to clear the ground everywhere the Studio operates — the highest incorporated
 * US town sits near 3,100 m — because a camera placed below the photogrammetry
 * surface renders the inside of a hill and streams nothing useful.
 */
const PROVISIONAL_CAMERA_HEIGHT_M = 3500;

/** Height above the measured ground for the settled oblique neighborhood view. */
const NEIGHBORHOOD_VIEW_HEIGHT_M = 280;

/** Latitude offset that puts the camera south of the parcel for the oblique approach. */
const NEIGHBORHOOD_VIEW_LAT_OFFSET_DEG = 0.0022;

interface CesiumEntityCollection {
  add: (options: Record<string, unknown>) => unknown;
  remove: (entity: unknown) => boolean;
}

interface CesiumViewerInstance {
  destroy: () => void;
  isDestroyed: () => boolean;
  entities: CesiumEntityCollection;
  camera: {
    flyTo: (options: Record<string, unknown>) => void;
    setView: (options: Record<string, unknown>) => void;
    flyToBoundingSphere: (boundingSphere: unknown, options?: Record<string, unknown>) => void;
  };
  scene: GroundSnapScene & {
    primitives: {
      add: (primitive: unknown) => void;
    };
    globe?: { show: boolean };
  };
}

interface CesiumModule extends PhotorealCesiumModule, GroundSnapCesiumModule {
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
  HeightReference?: {
    RELATIVE_TO_GROUND?: number;
  };
  Math: {
    toRadians: (degrees: number) => number;
  };
  createOsmBuildingsAsync?: () => Promise<unknown>;
}

interface GroundReadout {
  status: GroundSnapStatus;
  feet: number | null;
  corrected: boolean;
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

  const credentials = useMemo(() => readPhotorealCredentialsFromEnv(), []);
  const [route, setRoute] = useState<PhotorealRoute>(() => selectPhotorealStartupRoute(credentials));
  const [ground, setGround] = useState<GroundReadout | null>(null);

  const photorealNotice = useMemo(() => photorealUnavailableReason(credentials), [credentials]);

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
    const isCancelled = () => cancelled;

    async function initCesium() {
      setStatus("loading");
      setErrorMessage(null);
      setGround(null);

      try {
        const rawCesium = await loadCesium();
        const Cesium = rawCesium as unknown as CesiumModule;
        if (cancelled || !containerRef.current) return;

        // Resolve the photorealistic basemap BEFORE the viewer exists: whether a
        // tileset loaded decides if the ellipsoid globe should be drawn at all.
        // Two surfaces at the same place z-fight, and the photogrammetry already
        // carries its own ground.
        const photoreal = await loadPhotorealTileset(Cesium, credentials);
        if (cancelled) return;
        setRoute(photoreal.route);
        const hasPhotoreal = photoreal.tileset !== null;

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
          globe: hasPhotoreal ? false : undefined,
          baseLayer: hasPhotoreal
            ? false
            : new Cesium.ImageryLayer(
                new Cesium.OpenStreetMapImageryProvider({
                  url: "https://tile.openstreetmap.org/",
                  maximumLevel: 19,
                }),
              ),
        });

        if (hasPhotoreal) {
          viewer.scene.primitives.add(photoreal.tileset);
          if (viewer.scene.globe) {
            viewer.scene.globe.show = false;
          }
        } else {
          // Only worth asking for OSM building extrusions when there is no
          // photogrammetry — otherwise they duplicate the real buildings.
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
        }

        if (cancelled || !viewer || viewer.isDestroyed()) return;

        // Park the camera high overhead so tiles covering the parcel start
        // streaming. Nothing is measured or placed until they have.
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, PROVISIONAL_CAMERA_HEIGHT_M),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0,
          },
        });

        // One retried measurement of the surface under the parcel. Sampled before
        // any of our own geometry exists, so nothing needs excluding yet.
        const coarse = await sampleGroundHeight(lat, lng, { scene: viewer.scene, Cesium }, { isCancelled });
        if (cancelled || !viewer || viewer.isDestroyed()) return;

        const placed = placeSceneGeometry(Cesium, viewer, coarse.heightMeters);

        publishGroundReadout(coarse.status, coarse.heightMeters);
        // Geoid correction is only needed for the readout, and its grid is a lazy
        // 2.7 MB import — never block the scene on it. This re-publishes from the
        // LATEST measurement rather than the one in scope when it was queued: the
        // grid can resolve after a refinement has already landed, and a stale
        // closure would quietly overwrite the better height.
        void ensureGeoidReady().then(republishGroundReadout);

        // Settle into the oblique neighborhood view. With no measurement there is
        // no honest absolute height to fly to, so let Cesium frame the tiles it
        // actually loaded rather than guessing an altitude.
        if (coarse.heightMeters !== null) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              lng,
              lat - NEIGHBORHOOD_VIEW_LAT_OFFSET_DEG,
              coarse.heightMeters + NEIGHBORHOOD_VIEW_HEIGHT_M,
            ),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-35),
              roll: 0,
            },
            duration: 1.5,
          });
        } else if (hasPhotoreal) {
          const boundingSphere = (photoreal.tileset as { boundingSphere?: unknown } | null)
            ?.boundingSphere;
          if (boundingSphere) {
            viewer.camera.flyToBoundingSphere(boundingSphere, { duration: 1.5 });
          }
        } else {
          // Flat imagery: ground IS the ellipsoid, so an absolute height is correct.
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              lng,
              lat - NEIGHBORHOOD_VIEW_LAT_OFFSET_DEG,
              NEIGHBORHOOD_VIEW_HEIGHT_M,
            ),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-35),
              roll: 0,
            },
            duration: 1.5,
          });
        }

        if (!cancelled) {
          setStatus("ready");
        }

        // A coarse sample reads whatever LOD was loaded from 3.5 km up. Once the
        // close view has streamed, re-measure: fresh evidence outranks the earlier
        // reading, and geometry is rebuilt only if the disagreement is visible.
        if (hasPhotoreal && coarse.status === "measured") {
          const refined = await sampleGroundHeight(
            lat,
            lng,
            { scene: viewer.scene, Cesium },
            { isCancelled, objectsToExclude: placed },
          );
          if (cancelled || !viewer || viewer.isDestroyed()) return;
          if (refined.status === "measured" && shouldRefineGround(coarse.heightMeters, refined.heightMeters)) {
            for (const entity of placed) {
              viewer.entities.remove(entity);
            }
            placeSceneGeometry(Cesium, viewer, refined.heightMeters);
            publishGroundReadout(refined.status, refined.heightMeters);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "CesiumJS viewer failed to initialize.");
        }
      }
    }

    /** The most recent measurement, so a late geoid load re-publishes the best one. */
    let latestGround: { status: GroundSnapStatus; heightMeters: number | null } | null = null;

    function publishGroundReadout(snapStatus: GroundSnapStatus, heightMeters: number | null) {
      latestGround = { status: snapStatus, heightMeters };
      republishGroundReadout();
    }

    function republishGroundReadout() {
      if (cancelled || !latestGround) return;
      const { status: snapStatus, heightMeters } = latestGround;
      const undulation = heightMeters === null ? null : geoidHeightMeters(lat, lng);
      const { feet, corrected } = formatGroundElevation(heightMeters, undulation);
      setGround({ status: snapStatus, feet, corrected });
    }

    /**
     * Adds the parcel pin, boundary, and proposed ADU, and returns the entities so
     * they can be excluded from a later height sample or replaced on refinement.
     *
     * Heights come from Cesium's own ground clamping where the build supports it,
     * because that keeps re-clamping as tiles refine — better than any single
     * measurement. The measured height is the fallback, and draping flat is the
     * last resort: an extruded box at an invented height is the burial bug.
     */
    function placeSceneGeometry(
      Cesium: CesiumModule,
      activeViewer: CesiumViewerInstance,
      groundHeightMeters: number | null,
    ): unknown[] {
      const added: unknown[] = [];
      const clampToGround = Cesium.HeightReference?.RELATIVE_TO_GROUND;
      const canClamp = typeof clampToGround === "number";
      const baseHeight = canClamp ? 0 : (groundHeightMeters ?? 0);
      const heightRef = canClamp ? { heightReference: clampToGround } : {};

      added.push(
        activeViewer.entities.add({
          name: "Parcel Site",
          position: Cesium.Cartesian3.fromDegrees(lng, lat, baseHeight),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString("#FF5B24"),
            outlineColor: Cesium.Color.fromCssColorString("#F5F5F0"),
            outlineWidth: 3,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            ...heightRef,
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
            ...heightRef,
          },
        }),
      );

      // Add Parcel Boundary Polygon if GeoJSON is available. Left without an
      // explicit height so Cesium drapes it on whatever surface is rendering.
      const boundaryGeoJson = "boundaryGeoJson" in parcel ? parcel.boundaryGeoJson : null;
      if (boundaryGeoJson?.coordinates?.[0]?.length) {
        const flatCoords = boundaryGeoJson.coordinates[0].flatMap(([coordLng, coordLat]) => [coordLng, coordLat]);
        added.push(
          activeViewer.entities.add({
            name: "Parcel Boundary",
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
              material: Cesium.Color.fromCssColorString("#2D6A4F").withAlpha(0.25),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString("#2D6A4F"),
              outlineWidth: 2,
            },
          }),
        );
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
            const aduHeightM = (config.height || 14) * FEET_TO_METERS;
            const canExtrude = canClamp || groundHeightMeters !== null;
            added.push(
              activeViewer.entities.add({
                name: "Proposed ADU Footprint",
                polygon: {
                  hierarchy: Cesium.Cartesian3.fromDegreesArray(flatAduCoords),
                  material: Cesium.Color.fromCssColorString("#FF5B24").withAlpha(0.75),
                  outline: true,
                  outlineColor: Cesium.Color.fromCssColorString("#C43708"),
                  // With no clamping support and no measurement, the ground height
                  // is unknown: drape the footprint instead of burying a box.
                  ...(canExtrude
                    ? {
                        height: baseHeight,
                        extrudedHeight: baseHeight + aduHeightM,
                        ...(canClamp
                          ? {
                              heightReference: clampToGround,
                              extrudedHeightReference: clampToGround,
                            }
                          : {}),
                      }
                    : {}),
                },
              }),
            );
          }
        }
      } catch {
        // Keep base parcel site visible if local projection fails
      }

      return added;
    }

    void initCesium();

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, [lat, lng, parcel, config, pose, credentials]);

  const groundLine = useMemo(() => {
    if (!ground) return null;
    if (ground.status !== "measured" || ground.feet === null) {
      return "Ground height unavailable — placement is draped, framing is approximate";
    }
    const feet = ground.feet.toLocaleString();
    return ground.corrected
      ? `Ground ${feet} ft above sea level`
      : `Ground ${feet} ft (ellipsoid — sea-level correction pending)`;
  }, [ground]);

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
        <p className="font-mono text-[11px] text-lf-muted" data-testid="cesium-basemap-route">
          {describePhotorealRoute(route)}
        </p>
        {groundLine && (
          <p className="font-mono text-[11px] text-lf-muted" data-testid="cesium-ground-elevation">
            {groundLine}
          </p>
        )}
        {photorealNotice && (
          <p className="text-[11px] text-lf-muted" data-testid="cesium-photoreal-notice">
            {photorealNotice}
          </p>
        )}
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
