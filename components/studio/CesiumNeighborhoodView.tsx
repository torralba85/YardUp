"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  LocateFixed,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { LiveParcelData, Parcel } from "@/lib/parcel-types";
import type { ADUConfig } from "@/lib/feasibility";
import { type Pose2D } from "@/lib/scene-model";
import { type PlacementResult } from "@/lib/placement-validation";
import { describePlacement } from "@/lib/scene-placement";
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
import {
  applyCameraStep,
  enuFrameFromMatrix,
  planCameraStep,
  poseToLocal,
  poseToWorld,
  recenterPose,
  type CameraPose,
  type NeighborhoodCameraStep,
  type Vec3,
} from "@/lib/neighborhood-camera";
import styles from "./CesiumNeighborhoodView.module.css";
import { COLOR } from "@/lib/design-tokens";


export interface CesiumNeighborhoodViewProps {
  parcel: Parcel | LiveParcelData;
  config: ADUConfig;
  pose: Pose2D;
  placement: PlacementResult;
  onReturnToModel?: () => void;
}

const PLACEMENT_STYLE = {
  clear: { color: COLOR["status-eligible"], className: "text-status-eligible", Icon: CheckCircle2 },
  review: { color: COLOR["status-review"], className: "text-status-review", Icon: AlertTriangle },
  blocked: { color: COLOR["status-blocked"], className: "text-status-blocked", Icon: XCircle },
} as const;

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

/** How long one rotate, tilt or zoom press takes to play out. */
const CAMERA_STEP_MS = 240;
/** Flight time back to the property from wherever the user has wandered. */
const RECENTER_FLIGHT_S = 1;

/** One narrow column, grouped zoom / rotate / tilt / recenter, so phones keep the middle of the map. */
const CAMERA_CONTROL_GROUPS: ReadonlyArray<
  ReadonlyArray<{ control: NeighborhoodCameraStep | "recenter"; label: string; title: string; Icon: typeof Plus }>
> = [
  [
    { control: "zoom-in", label: "Zoom in", title: "Zoom in", Icon: Plus },
    { control: "zoom-out", label: "Zoom out", title: "Zoom out", Icon: Minus },
  ],
  [
    { control: "rotate-ccw", label: "Rotate counterclockwise", title: "Rotate counterclockwise", Icon: RotateCcw },
    { control: "rotate-cw", label: "Rotate clockwise", title: "Rotate clockwise", Icon: RotateCw },
  ],
  [
    { control: "tilt-up", label: "Tilt up", title: "Tilt up, toward the horizon", Icon: ChevronUp },
    { control: "tilt-down", label: "Tilt down", title: "Tilt down, toward overhead", Icon: ChevronDown },
  ],
  [{ control: "recenter", label: "Recenter on property", title: "Recenter on property", Icon: LocateFixed }],
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface CesiumEntityCollection {
  add: (options: Record<string, unknown>) => unknown;
  remove: (entity: unknown) => boolean;
}

interface CesiumPostProcessStages {
  fxaa?: { enabled: boolean };
  ambientOcclusion?: {
    enabled: boolean;
    uniforms?: Record<string, number>;
  };
  tonemapper?: number;
  exposure?: number;
}

export interface CesiumViewerInstance {
  destroy: () => void;
  isDestroyed: () => boolean;
  resolutionScale?: number;
  entities: CesiumEntityCollection;
  imageryLayers?: {
    addImageryProvider?: (provider: unknown) => { alpha?: number } | void;
  };
  camera: {
    flyTo: (options: Record<string, unknown>) => void;
    setView: (options: Record<string, unknown>) => void;
    flyToBoundingSphere: (boundingSphere: unknown, options?: Record<string, unknown>) => void;
    cancelFlight?: () => void;
    positionWC: Vec3;
    directionWC: Vec3;
    upWC: Vec3;
  };
  scene: GroundSnapScene & {
    primitives: {
      add: (primitive: unknown) => void;
    };
    globe?: { show: boolean };
    highDynamicRange?: boolean;
    postProcessStages?: CesiumPostProcessStages;
  };
}

export interface CesiumModule extends PhotorealCesiumModule, GroundSnapCesiumModule {
  Viewer: new (container: Element | string, options?: Record<string, unknown>) => CesiumViewerInstance;
  ImageryLayer: new (provider: unknown) => unknown;
  OpenStreetMapImageryProvider: new (options?: Record<string, unknown>) => unknown;
  UrlTemplateImageryProvider?: new (options: Record<string, unknown>) => unknown;
  Cartesian3: {
    fromDegrees: (lng: number, lat: number, height?: number) => unknown;
    fromDegreesArray: (coordinates: number[]) => unknown;
    fromElements: (x: number, y: number, z: number) => unknown;
  };
  Transforms: {
    /** A column-major Matrix4; see `enuFrameFromMatrix`. */
    eastNorthUpToFixedFrame: (origin: unknown) => Readonly<Record<number, number>>;
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
  ClassificationType?: {
    BOTH?: number;
  };
  Tonemapper?: {
    ACES?: number;
  };
  Math: {
    toRadians: (degrees: number) => number;
  };
  createOsmBuildingsAsync?: () => Promise<unknown>;
}

/**
 * Configures Cesium post-processing, HDR tonemapping, FXAA, HBAO, and high-DPI
 * resolution scaling so photogrammetry and GIS boundary overlays render crisply.
 */
export function configureCesiumSceneQuality(
  Cesium: CesiumModule,
  viewer: CesiumViewerInstance,
  hasPhotoreal: boolean,
): void {
  const dpr = typeof window !== "undefined" && typeof window.devicePixelRatio === "number"
    ? window.devicePixelRatio
    : 1;
  viewer.resolutionScale = Math.min(Math.max(dpr, 1), 1.75);
  viewer.scene.highDynamicRange = true;

  const stages = viewer.scene.postProcessStages;
  if (!stages) return;

  if (Cesium.Tonemapper?.ACES !== undefined) {
    stages.tonemapper = Cesium.Tonemapper.ACES;
    stages.exposure = 1.05;
  }
  if (stages.fxaa) {
    stages.fxaa.enabled = true;
  }
  if (stages.ambientOcclusion) {
    stages.ambientOcclusion.enabled = hasPhotoreal;
    if (hasPhotoreal && stages.ambientOcclusion.uniforms) {
      stages.ambientOcclusion.uniforms.intensity = 2.2;
      stages.ambientOcclusion.uniforms.bias = 0.08;
      stages.ambientOcclusion.uniforms.lengthCap = 0.25;
      stages.ambientOcclusion.uniforms.stepSize = 1.6;
    }
  }
}

interface GroundReadout {
  status: GroundSnapStatus;
  feet: number | null;
  corrected: boolean;
}

interface SceneGeometryOptions {
  parcel: Parcel | LiveParcelData;
  config: ADUConfig;
  pose: Pose2D;
  lat: number;
  lng: number;
}

/**
 * Adds the address pin and published GIS boundary, and returns the entities so
 * they can be excluded from a later height sample or replaced on refinement.
 *
 * Heights come from Cesium's own ground clamping where the build supports it,
 * because that keeps re-clamping as tiles refine — better than any single
 * measurement. The measured height is the fallback, and draping flat is the
 * last resort: an extruded box at an invented height is the burial bug.
 *
 * Conceptual buildings are deliberately absent: address coordinates cannot
 * establish the model's real-world origin or compass bearing.
 */
function placeSceneGeometry(
  Cesium: CesiumModule,
  activeViewer: CesiumViewerInstance,
  groundHeightMeters: number | null,
  options: SceneGeometryOptions,
): unknown[] {
  const { parcel, lat, lng } = options;
  const added: unknown[] = [];
  const clampToGround = Cesium.HeightReference?.RELATIVE_TO_GROUND;
  const canClamp = typeof clampToGround === "number";
  const baseHeight = canClamp ? 0 : (groundHeightMeters ?? 0);
  const heightRef = canClamp ? { heightReference: clampToGround } : {};
  const classifyBoth = Cesium.ClassificationType?.BOTH;

  // 1. Parcel Site pin & label
  added.push(
    activeViewer.entities.add({
      name: "Parcel Site",
      position: Cesium.Cartesian3.fromDegrees(lng, lat, baseHeight),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString(COLOR["lot-orange"]),
        outlineColor: Cesium.Color.fromCssColorString(COLOR["lot-chalk"]),
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        ...heightRef,
      },
      label: {
        text: parcel.address || "Proposed ADU Site",
        font: "600 13px Manrope, sans-serif",
        fillColor: Cesium.Color.fromCssColorString(COLOR["lot-ink"]),
        outlineColor: Cesium.Color.fromCssColorString(COLOR["lot-chalk"]),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        ...heightRef,
      },
    }),
  );

  // 2. Add Parcel Boundary Polygon if GeoJSON is available. Left without an
  // explicit height and classified onto BOTH terrain and 3D Tiles so Cesium
  // drapes it directly over photogrammetry roofs, yards, or flat globe tiles.
  const boundaryGeoJson = "boundaryGeoJson" in parcel ? parcel.boundaryGeoJson : null;
  if (boundaryGeoJson?.coordinates?.[0]?.length) {
    const flatCoords = boundaryGeoJson.coordinates[0].flatMap(([coordLng, coordLat]) => [coordLng, coordLat]);
    added.push(
      activeViewer.entities.add({
        name: "Parcel Boundary",
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
          material: Cesium.Color.fromCssColorString(COLOR["lot-stone"]).withAlpha(0.25),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(COLOR["lot-stone"]),
          outlineWidth: 2,
          ...(typeof classifyBoth === "number" ? { classificationType: classifyBoth } : {}),
        },
      }),
    );
  }


  return added;
}

export default function CesiumNeighborhoodView({
  parcel,
  config,
  pose,
  placement,
  onReturnToModel,
}: CesiumNeighborhoodViewProps) {
  const placementFeedback = describePlacement(placement, parcel);
  const placementStyle = PLACEMENT_STYLE[placementFeedback.tone];
  const PlacementIcon = placementStyle.Icon;
  const containerRef = useRef<HTMLDivElement>(null);
  const creditContainerRef = useRef<HTMLDivElement>(null);

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
    if (city.includes("san diego")) {
      return { lat: 32.7157, lng: -117.1611, isGeocoded: false };
    }
    // Seattle default
    return { lat: 47.6917, lng: -122.3488, isGeocoded: false };
  }, [parcel]);

  // Derive a stable parcel identity key so new object references with the same
  // address and coordinates do not trigger a full viewer recreation.
  const parcelKey = useMemo(() => {
    const parcelId = "id" in parcel && parcel.id ? String(parcel.id) : "";
    const address = parcel.address || "";
    const city = parcel.city || "";
    return `${parcelId}|${address}|${city}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
  }, [parcel, lat, lng]);

  // Keep latest mutable props in refs so async init, refinement, and post-flight
  // recovery always access the freshest config and pose without stale closures.
  const latestPropsRef = useRef<SceneGeometryOptions>({
    parcel,
    config,
    pose,
    lat, lng,
  });
  useEffect(() => {
    latestPropsRef.current = { parcel, config, pose, lat, lng };
  }, [parcel, config, pose, lat, lng]);

  const viewerRef = useRef<CesiumViewerInstance | null>(null);
  const cesiumModuleRef = useRef<CesiumModule | null>(null);
  const placedEntitiesRef = useRef<unknown[]>([]);
  const measuredGroundRef = useRef<number | null>(null);
  const geometryReadyRef = useRef(false);
  const cameraAnimationRef = useRef<{ frame: number; finish: () => void } | null>(null);

  // The HUD stays a compact verdict card over the imagery; provenance, ground
  // height and the full evidence notice open on request.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();

  /** Lands a step still playing out on its final pose. */
  function landCameraAnimation() {
    const active = cameraAnimationRef.current;
    if (!active) return;
    cameraAnimationRef.current = null;
    cancelAnimationFrame(active.frame);
    active.finish();
  }

  /**
   * The property's ground as the camera controls' reference plane. Flat imagery
   * has its ground on the ellipsoid; photogrammetry needs a measurement, and an
   * unmeasured ground disables the buttons rather than steering by a guess.
   */
  function cameraGroundMeters(): number | null {
    if (measuredGroundRef.current !== null) return measuredGroundRef.current;
    return route === "osm" ? 0 : null;
  }

  function runCameraControl(control: NeighborhoodCameraStep | "recenter") {
    const viewer = viewerRef.current;
    const Cesium = cesiumModuleRef.current;
    const groundMeters = cameraGroundMeters();
    if (!viewer || viewer.isDestroyed() || !Cesium || groundMeters === null) return;

    // Land any step still animating so rapid presses add up exactly, and stop
    // an opening or recenter flight that would otherwise overwrite this one.
    landCameraAnimation();
    viewer.camera.cancelFlight?.();

    const frame = enuFrameFromMatrix(
      Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(lng, lat, groundMeters)),
    );
    const toCesiumView = (pose: CameraPose) => {
      const world = poseToWorld(frame, pose);
      const cartesian = ({ x, y, z }: Vec3) => Cesium.Cartesian3.fromElements(x, y, z);
      return {
        destination: cartesian(world.position),
        orientation: { direction: cartesian(world.direction), up: cartesian(world.up) },
      };
    };
    const reduceMotion = prefersReducedMotion();

    if (control === "recenter") {
      viewer.camera.flyTo({ ...toCesiumView(recenterPose()), duration: reduceMotion ? 0 : RECENTER_FLIGHT_S });
      return;
    }

    const { positionWC, directionWC, upWC } = viewer.camera;
    const start = poseToLocal(frame, { position: positionWC, direction: directionWC, up: upWC });
    const plan = planCameraStep(start, control);
    if (!plan) return;

    const showFraction = (fraction: number) => {
      if (!viewer.isDestroyed()) viewer.camera.setView(toCesiumView(applyCameraStep(start, plan, fraction)));
    };
    if (reduceMotion) {
      showFraction(1);
      return;
    }

    // The clock starts on the first frame's timestamp.
    let startedAt: number | null = null;
    const animation = { frame: 0, finish: () => showFraction(1) };
    const tick = (now: number) => {
      startedAt ??= now;
      const progress = Math.min(1, (now - startedAt) / CAMERA_STEP_MS);
      showFraction(1 - (1 - progress) ** 3);
      if (progress < 1) {
        animation.frame = requestAnimationFrame(tick);
      } else if (cameraAnimationRef.current === animation) {
        cameraAnimationRef.current = null;
      }
    };
    animation.frame = requestAnimationFrame(tick);
    cameraAnimationRef.current = animation;
  }

  // ---------------------------------------------------------------------------
  // 1. Viewer Lifecycle Effect (Task 1)
  // Rebuilt ONLY when geographic coordinates, stable parcel identity, or credentials change.
  // Geometry edits (config, pose, placement) NEVER trigger this effect.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let viewer: CesiumViewerInstance | null = null;
    let finishFlight: (() => void) | undefined;
    const isCancelled = () => cancelled;

    // The most recent measurement, so a late geoid load re-publishes the best one.
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

    async function initCesium() {
      setStatus("loading");
      setErrorMessage(null);
      setGround(null);
      measuredGroundRef.current = null;
      placedEntitiesRef.current = [];
      geometryReadyRef.current = false;

      try {
        const rawCesium = await loadCesium();
        const Cesium = rawCesium as unknown as CesiumModule;
        if (cancelled || !containerRef.current) return;

        // Resolve the photorealistic basemap BEFORE the viewer exists: whether a
        // tileset loaded decides if the ellipsoid globe should be drawn at all.
        // Two surfaces at the same place z-fight, and the photogrammetry already
        // carries its own ground.
        const photoreal = await loadPhotorealTileset(Cesium, credentials);
        if (cancelled) {
          const abandoned = photoreal.tileset as { destroy?: () => void; isDestroyed?: () => boolean } | null;
          if (abandoned?.destroy && !abandoned.isDestroyed?.()) abandoned.destroy();
          return;
        }
        setRoute(photoreal.route);
        const hasPhotoreal = photoreal.tileset !== null;

        // Initialize Cesium Viewer with clean minimalist chrome per A LOT MORE guidelines.
        // Pass explicit creditContainer outside canvas to meet Google Map Tiles API attribution rules.
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
          creditContainer: creditContainerRef.current ?? undefined,
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

        viewerRef.current = viewer;
        cesiumModuleRef.current = Cesium;

        configureCesiumSceneQuality(Cesium, viewer, hasPhotoreal);

        if (hasPhotoreal) {
          viewer.scene.primitives.add(photoreal.tileset);
          if (viewer.scene.globe) {
            viewer.scene.globe.show = false;
          }
        } else {
          // When falling back to OSM without photogrammetry keys, layer Esri World
          // Imagery satellite tiles when supported so the block still shows aerial
          // roof/tree context alongside OSM building extrusions.
          try {
            if (
              typeof Cesium.UrlTemplateImageryProvider === "function" &&
              typeof viewer.imageryLayers?.addImageryProvider === "function"
            ) {
              const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
                url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                maximumLevel: 19,
                credit: "Tiles © Esri",
              });
              const layer = viewer.imageryLayers.addImageryProvider(satelliteProvider);
              if (layer && typeof layer === "object") {
                layer.alpha = 0.85;
              }
            }
          } catch {
            // Optional satellite layer; OSM base layer remains active.
          }

          // Only worth asking for OSM building extrusions when there is no
          // photogrammetry — otherwise they duplicate the real buildings.
          try {
            if (typeof Cesium.createOsmBuildingsAsync === "function") {
              const osmBuildings = await Cesium.createOsmBuildingsAsync();
              if (!cancelled && viewer && !viewer.isDestroyed()) {
                viewer.scene.primitives.add(osmBuildings);
              } else {
                const abandoned = osmBuildings as { destroy?: () => void; isDestroyed?: () => boolean };
                if (abandoned.destroy && !abandoned.isDestroyed?.()) abandoned.destroy();
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

        measuredGroundRef.current = coarse.heightMeters;

        // Place initial scene geometry with latest props
        const placed = placeSceneGeometry(Cesium, viewer, coarse.heightMeters, latestPropsRef.current);
        placedEntitiesRef.current = placed;
        geometryReadyRef.current = true;

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
        const flight = new Promise<void>((resolve) => { finishFlight = resolve; });
        const flightCallbacks = { complete: finishFlight, cancel: finishFlight };
        if (coarse.heightMeters !== null) {
          viewer.camera.flyTo({
            ...flightCallbacks,
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
            viewer.camera.flyToBoundingSphere(boundingSphere, { duration: 1.5, ...flightCallbacks });
          } else {
            finishFlight?.();
          }
        } else {
          // Flat imagery: ground IS the ellipsoid, so an absolute height is correct.
          viewer.camera.flyTo({
            ...flightCallbacks,
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
        await flight;
        finishFlight = undefined;
        if (cancelled || viewer.isDestroyed()) return;

        // Task 5: Cold Coarse Sample Recovery
        // If the coarse sample was cold, attempt a post-flight sample once close-range
        // tiles have had time to stream. If it resolves, upgrade geometry, camera framing,
        // and the readout honestly.
        if (hasPhotoreal && coarse.status === "cold") {
          const postFlight = await sampleGroundHeight(
            lat,
            lng,
            { scene: viewer.scene, Cesium },
            { isCancelled, objectsToExclude: placedEntitiesRef.current },
          );
          if (cancelled || !viewer || viewer.isDestroyed()) return;

          if (postFlight.status === "measured" && postFlight.heightMeters !== null) {
            measuredGroundRef.current = postFlight.heightMeters;
            for (const entity of placedEntitiesRef.current) {
              viewer.entities.remove(entity);
            }
            placedEntitiesRef.current.splice(0, placedEntitiesRef.current.length, ...placeSceneGeometry(
              Cesium,
              viewer,
              postFlight.heightMeters,
              latestPropsRef.current,
            ));
            publishGroundReadout(postFlight.status, postFlight.heightMeters);
            void ensureGeoidReady().then(republishGroundReadout);

            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(
                lng,
                lat - NEIGHBORHOOD_VIEW_LAT_OFFSET_DEG,
                postFlight.heightMeters + NEIGHBORHOOD_VIEW_HEIGHT_M,
              ),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-35),
                roll: 0,
              },
              duration: 1.5,
            });
          }
        } else if (hasPhotoreal && coarse.status === "measured") {
          // A coarse sample reads whatever LOD was loaded from 3.5 km up. Once the
          // close view has streamed, re-measure: fresh evidence outranks the earlier
          // reading, and geometry + camera framing are updated if the disagreement is visible.
          const refined = await sampleGroundHeight(
            lat,
            lng,
            { scene: viewer.scene, Cesium },
            { isCancelled, objectsToExclude: placedEntitiesRef.current },
          );
          if (cancelled || !viewer || viewer.isDestroyed()) return;
          if (
            refined.status === "measured" &&
            refined.heightMeters !== null &&
            shouldRefineGround(coarse.heightMeters, refined.heightMeters)
          ) {
            measuredGroundRef.current = refined.heightMeters;
            for (const entity of placedEntitiesRef.current) {
              viewer.entities.remove(entity);
            }
            placedEntitiesRef.current.splice(0, placedEntitiesRef.current.length, ...placeSceneGeometry(
              Cesium,
              viewer,
              refined.heightMeters,
              latestPropsRef.current,
            ));
            publishGroundReadout(refined.status, refined.heightMeters);
            void ensureGeoidReady().then(republishGroundReadout);

            if (!cameraAnimationRef.current) {
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                  lng,
                  lat - NEIGHBORHOOD_VIEW_LAT_OFFSET_DEG,
                  refined.heightMeters + NEIGHBORHOOD_VIEW_HEIGHT_M,
                ),
                orientation: {
                  heading: Cesium.Math.toRadians(0),
                  pitch: Cesium.Math.toRadians(-35),
                  roll: 0,
                },
                duration: 0.9,
              });
            }
          }
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
      finishFlight?.();
      // A step mid-animation must not touch the viewer being destroyed.
      const animation = cameraAnimationRef.current;
      cameraAnimationRef.current = null;
      if (animation) cancelAnimationFrame(animation.frame);
      geometryReadyRef.current = false;
      viewerRef.current = null;
      cesiumModuleRef.current = null;
      placedEntitiesRef.current = [];
      measuredGroundRef.current = null;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, [lat, lng, parcelKey, credentials]);

  // ---------------------------------------------------------------------------
  // 2. Geometry Effect (Task 1)
  // Rebuilds ONLY the parcel pin and boundary when model inputs or
  // compliance changes. Does NOT rerun tileset factory, sampling, or camera flight.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const activeViewer = viewerRef.current;
    const Cesium = cesiumModuleRef.current;
    if (!geometryReadyRef.current || !activeViewer || activeViewer.isDestroyed() || !Cesium) return;

    for (const entity of placedEntitiesRef.current) {
      activeViewer.entities.remove(entity);
    }
    placedEntitiesRef.current = [];

    placedEntitiesRef.current.splice(0, placedEntitiesRef.current.length, ...placeSceneGeometry(
      Cesium,
      activeViewer,
      measuredGroundRef.current,
      latestPropsRef.current,
    ));
  }, [parcel, config, pose]);

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

  // Mirrors cameraGroundMeters: buttons work once the reference plane is known.
  const cameraControlsReady = status === "ready" && (ground?.status === "measured" || route === "osm");

  return (
    <div className="relative h-full w-full min-h-[440px] overflow-hidden bg-lot-chalk text-lot-ink">
      {/* Cesium canvas target */}
      <div ref={containerRef} className="h-full w-full" data-testid="cesium-container" />

      {/* Compact HUD: the verdict and its caveat stay on screen, everything else
          opens on request so the card does not sit over the neighborhood. The
          right-hand allowance keeps it clear of the camera controls. */}
      <div
        data-testid="cesium-hud"
        className="pointer-events-none absolute top-3 left-3 z-(--z-index-scene) flex max-w-[min(24rem,calc(100%-6.5rem))] flex-col border border-lot-line bg-lot-chalk shadow-card"
      >
        <div className="flex items-start gap-2 px-3 pt-2.5">
          <Globe size={16} className="mt-0.5 shrink-0 text-lot-orange-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold tracking-wide text-lot-ink">Neighborhood 3D</p>
            {/* Same placement verdict as the model, paired with a status icon. */}
            <div
              className="mt-0.5 flex items-center gap-1.5 text-xs font-medium"
              data-testid="cesium-compliance-verdict"
            >
              <PlacementIcon size={14} className={`${placementStyle.className} shrink-0`} aria-hidden="true" />
              <span className={placementStyle.className}>{placementFeedback.title}</span>
            </div>
            {/* Stays visible: the Map Tiles policy wants it clear which imagery is
                Google's (docs/cesium-photoreal-deployment.md). */}
            <p className="mt-0.5 text-[11px] text-lot-stone" data-testid="cesium-basemap-route" aria-live="polite" aria-atomic="true">
              {describePhotorealRoute(route)}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight font-medium text-status-review" data-testid="cesium-context-notice">
              Context only — not a survey or zoning approval.
            </p>
            {status === "ready" && !cameraControlsReady && (
              <p className="mt-0.5 text-[11px] leading-tight text-lot-stone" data-testid="cesium-camera-controls-waiting">
                Camera buttons wait for a ground reading. Drag to move · Pinch to zoom.
              </p>
            )}
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 px-1.5 pt-1 pb-1.5">
          {onReturnToModel && (
            <Button type="button" variant="secondary" size="xs" onClick={onReturnToModel} className="font-medium">
              Return to 3D model
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
            rightIcon={
              <ChevronDown
                size={14}
                className={`motion-safe:transition-transform motion-safe:duration-200 ${detailsOpen ? "rotate-180" : ""}`}
              />
            }
            className="font-medium"
          >
            Details
          </Button>
        </div>
        <div
          id={detailsId}
          hidden={!detailsOpen}
          className="flex flex-col gap-1 border-t border-lot-line px-3 pt-2 pb-2.5"
        >
          <p className="truncate text-xs font-medium text-lot-ink">{parcel.address || "Proposed ADU Site"}</p>
          <p className="text-[11px] tabular-nums text-lot-stone">
            {lat.toFixed(5)}°N, {Math.abs(lng).toFixed(5)}°W {!isGeocoded ? "(City Default)" : ""}
          </p>
          <p
            className="text-[11px] tabular-nums text-lot-stone"
            data-testid="cesium-ground-elevation"
            aria-live="polite"
            aria-atomic="true"
          >
            {groundLine}
          </p>
          <p className="text-[11px] leading-tight font-medium text-status-review" data-testid="cesium-evidence-notice">
            {placementFeedback.missingEvidenceNotice || "Confirm surveyed boundaries and building separations."}
          </p>
          {photorealNotice && (
            <p className="text-[11px] text-lot-stone" data-testid="cesium-photoreal-notice">
              {photorealNotice}
            </p>
          )}
          <p className="text-[11px] leading-tight text-lot-stone">
            Mouse: drag to pan, scroll to zoom, Ctrl + drag to rotate and tilt. Touch: pinch to zoom, two-finger drag to rotate and tilt.
          </p>
        </div>
      </div>

      {/* Camera controls: button equivalents of the drag, scroll and pinch gestures. */}
      <div
        role="group"
        aria-label="Camera controls"
        data-testid="cesium-camera-controls"
        className={`pointer-events-auto absolute top-3 right-3 z-(--z-index-scene) flex flex-col border border-lot-line bg-lot-chalk p-1 shadow-card motion-safe:transition-opacity ${
          status === "ready" && !cameraControlsReady ? "motion-safe:animate-pulse opacity-70" : ""
        }`}
      >
        {CAMERA_CONTROL_GROUPS.map((group) => (
          <div key={group[0].control} className="flex flex-col border-t border-lot-line first:border-t-0">
            {group.map(({ control, label, title, Icon }) => (
              <Button
                key={control}
                type="button"
                variant="ghost"
                size="xs"
                aria-label={label}
                title={title}
                disabled={!cameraControlsReady}
                onClick={() => runCameraControl(control)}
                className="w-11 px-0"
              >
                <Icon size={18} aria-hidden="true" />
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* Explicit visible credit container outside canvas with legible chalk/carbon styling per Task 3 */}
      <div
        ref={creditContainerRef}
        data-testid="cesium-credit-container"
        aria-label="Map data credits"
        className={`${styles.credits} pointer-events-auto absolute bottom-2 right-2 z-10 max-w-[calc(100%-1.5rem)] border border-lot-line bg-lot-chalk px-3 py-2 text-xs leading-normal text-lot-ink`}
      />

      {/* Loading overlay */}
      {status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-lot-chalk"
        >
          <RefreshCw size={24} className="motion-safe:animate-spin text-lot-orange-ink" aria-hidden="true" />
          <p className="text-sm font-medium text-lot-ink">Streaming 3D globe & neighborhood data…</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-lot-chalk p-6 text-center"
        >
          <AlertCircle size={28} className="text-lot-orange-ink" aria-hidden="true" />
          <h3 className="font-display text-base font-semibold text-lot-ink">
            3D Globe currently unavailable
          </h3>
          <p className="max-w-xs text-xs text-lot-stone">
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
