import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CesiumNeighborhoodView from "./CesiumNeighborhoodView";
import type { LiveParcelData } from "@/lib/parcel-types";
import { calculateFeasibility, defaultAduConfig, defaultFinancialAssumptions, parcelPresets } from "@/lib/feasibility";
import { getScenePlacement } from "@/lib/site-fit";
import type { Pose2D } from "@/lib/scene-model";
import { setGeoidModuleForTesting, resetGeoidForTesting } from "@/lib/geoid";

const mockDestroy = vi.fn();
const mockEntitiesAdd = vi.fn((options: Record<string, unknown>) => ({ entity: options.name }));
const mockEntitiesRemove = vi.fn();
const mockCameraFlyTo = vi.fn();
const mockCameraSetView = vi.fn();
const mockCameraFlyToBoundingSphere = vi.fn();
const mockPrimitivesAdd = vi.fn();

/**
 * Ellipsoidal ground height the mocked scene reports. Seattle-ish, and far enough
 * from zero that a readout derived from it cannot pass by accident.
 */
const MOCK_GROUND_HEIGHT_M = 56;
/** Seattle's geoid undulation, so the MSL conversion is exercised with a real sign. */
const MOCK_UNDULATION_M = -22.5;

let mockSampleHeight: ReturnType<typeof vi.fn> | undefined;
let mockSampleHeightSupported = true;
let mockGlobe: { show: boolean };

type MockVec = { x: number; y: number; z: number };
/**
 * Live camera state for the control tests. The mocked east-north-up frame is
 * world axes shifted up to the ground, so world and local poses differ only by
 * the ground height.
 */
const mockCamera: { positionWC: MockVec; directionWC: MockVec; upWC: MockVec } = {
  positionWC: { x: 0, y: 0, z: 0 },
  directionWC: { x: 0, y: 1, z: 0 },
  upWC: { x: 0, y: 0, z: 1 },
};
const mockCancelFlight = vi.fn();

const mockCesium = {
  Viewer: vi.fn(function (_container: Element, _options?: Record<string, unknown>) {
    void _container;
    void _options;
    mockGlobe = { show: true };
    return {
      destroy: mockDestroy,
      isDestroyed: vi.fn().mockReturnValue(false),
      entities: { add: mockEntitiesAdd, remove: mockEntitiesRemove },
      camera: Object.assign(mockCamera, {
        flyTo: mockCameraFlyTo,
        setView: mockCameraSetView,
        flyToBoundingSphere: mockCameraFlyToBoundingSphere,
        cancelFlight: mockCancelFlight,
      }),
      scene: {
        primitives: { add: mockPrimitivesAdd },
        globe: mockGlobe,
        sampleHeight: mockSampleHeight,
        sampleHeightSupported: mockSampleHeightSupported,
        isDestroyed: () => false,
      },
    };
  }),
  ImageryLayer: vi.fn(function () {}),
  OpenStreetMapImageryProvider: vi.fn(function () {}),
  Cartesian3: {
    fromDegrees: vi.fn((lng: number, lat: number, alt?: number) => ({ lng, lat, alt })),
    fromDegreesArray: vi.fn((arr: number[]) => arr),
    fromElements: vi.fn((x: number, y: number, z: number) => ({ x, y, z })),
  },
  Transforms: {
    // Column-major identity rotation, translated up to the requested height.
    eastNorthUpToFixedFrame: vi.fn((origin: { alt?: number }) => [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, origin.alt ?? 0, 1,
    ]),
  },
  Cartesian2: vi.fn(function (x: number, y: number) {
    return { x, y };
  }),
  Cartographic: {
    fromDegrees: vi.fn((lng: number, lat: number, height?: number) => ({ lng, lat, height })),
  },
  Color: {
    fromCssColorString: vi.fn(() => ({ withAlpha: vi.fn().mockReturnValue("mock-color") })),
  },
  LabelStyle: { FILL_AND_OUTLINE: 0 },
  VerticalOrigin: { BOTTOM: 0 },
  HeightReference: { RELATIVE_TO_GROUND: 2 },
  Math: { toRadians: (deg: number) => (deg * Math.PI) / 180 },
  createOsmBuildingsAsync: vi.fn().mockResolvedValue({}),
  createGooglePhotorealistic3DTileset: vi.fn().mockResolvedValue({
    id: "google-tileset",
    boundingSphere: { center: "mock-center" },
  }),
  IonResource: { fromAssetId: vi.fn().mockResolvedValue({ id: "ion-resource" }) },
  Cesium3DTileset: { fromUrl: vi.fn().mockResolvedValue({ id: "ion-tileset" }) },
};

vi.mock("@/lib/cesium-loader", () => ({
  loadCesium: vi.fn().mockImplementation(() => Promise.resolve(mockCesium)),
}));

const sampleParcel: LiveParcelData = {
  address: "742 Evergreen Terrace",
  city: "Seattle",
  lotArea: 6000,
  lotWidth: 60,
  lotLength: 100,
  existingHouseSqft: 1800,
  maxLotCoveragePercent: 40,
  setbacks: { front: 20, rear: 10, side: 5 },
  zoning: "NR3",
  boundaryGeoJson: null,
  lat: 47.6062,
  lng: -122.3321,
  source: "regrid",
  state: "WA",
  zip: "98101",
};

const samplePlacement = getScenePlacement(sampleParcel, defaultAduConfig, { x: 0, z: -20, rotationDeg: 0 });

const samplePose: Pose2D = { x: 0, z: -20, rotationDeg: 0 };

function renderView(props: Partial<React.ComponentProps<typeof CesiumNeighborhoodView>> = {}) {
  return render(
    <CesiumNeighborhoodView
      parcel={sampleParcel}
      config={defaultAduConfig}
      pose={samplePose}
      placement={samplePlacement}
      {...props}
    />,
  );
}

/** Puts the mocked camera south of the parcel, looking north, `height` m above the mocked ground. */
function placeCamera(height: number, pitchDeg = -35) {
  const pitch = (pitchDeg * Math.PI) / 180;
  const range = height / Math.sin(-pitch);
  mockCamera.positionWC = { x: 0, y: -range * Math.cos(pitch), z: MOCK_GROUND_HEIGHT_M + height };
  mockCamera.directionWC = { x: 0, y: Math.cos(pitch), z: Math.sin(pitch) };
  mockCamera.upWC = { x: 0, y: -Math.sin(pitch), z: Math.cos(pitch) };
}

let matchMediaSpy: { mockRestore: () => void } | null = null;

function preferReducedMotion() {
  matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) => ({ matches: query.includes("reduce"), media: query }) as MediaQueryList,
  );
}

function lastSetViewPose() {
  const options = mockCameraSetView.mock.calls.at(-1)?.[0] as {
    destination: MockVec;
    orientation: { direction: MockVec; up: MockVec };
  };
  return { position: options.destination, direction: options.orientation.direction };
}

describe("CesiumNeighborhoodView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCameraFlyTo.mockImplementation((options) => options.complete?.());
    mockCameraFlyToBoundingSphere.mockImplementation((_sphere, options) => options?.complete?.());
    // Only a direction/up view moves the mocked camera; the provisional
    // heading/pitch overhead view is recorded but leaves the pose alone.
    mockCameraSetView.mockImplementation((options: { destination?: MockVec; orientation?: { direction?: MockVec; up?: MockVec } }) => {
      if (options.destination && options.orientation?.direction && options.orientation.up) {
        mockCamera.positionWC = options.destination;
        mockCamera.directionWC = options.orientation.direction;
        mockCamera.upWC = options.orientation.up;
      }
    });
    placeCamera(280);
    mockSampleHeight = vi.fn(() => MOCK_GROUND_HEIGHT_M);
    mockSampleHeightSupported = true;
    setGeoidModuleForTesting({ meanSeaLevel: () => MOCK_UNDULATION_M });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    matchMediaSpy?.mockRestore();
    matchMediaSpy = null;
    resetGeoidForTesting();
    vi.useRealTimers();
  });

  it("initializes Cesium viewer and adds parcel entities", async () => {
    renderView();

    expect(screen.getByText(/Streaming 3D globe & neighborhood data/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockCesium.Viewer).toHaveBeenCalled();
    });

    expect(mockEntitiesAdd).toHaveBeenCalled();
    expect(mockCameraFlyTo).toHaveBeenCalled();
    expect(screen.getByText("Neighborhood 3D")).toBeInTheDocument();
    expect(screen.getByText("742 Evergreen Terrace")).toBeInTheDocument();
    expect(screen.getByText(/47.60620°N, 122.33210°W/)).toBeInTheDocument();
  });

  it("calls onReturnToModel when the return button is clicked", async () => {
    const user = userEvent.setup();
    const onReturn = vi.fn();

    renderView({ onReturnToModel: onReturn });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Return to 3D model/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Return to 3D model/i }));
    expect(onReturn).toHaveBeenCalledOnce();
  });

  it("cleans up Cesium viewer on component unmount", async () => {
    const { unmount } = renderView();

    await waitFor(() => {
      expect(mockCesium.Viewer).toHaveBeenCalled();
    });

    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it("displays error fallback when Cesium fails to load", async () => {
    const { loadCesium } = await import("@/lib/cesium-loader");
    vi.mocked(loadCesium).mockRejectedValueOnce(new Error("Network failed to fetch CesiumJS"));

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/3D Globe currently unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Network failed to fetch CesiumJS/i)).toBeInTheDocument();
    });
  });

  describe("photorealistic basemap ladder", () => {
    it("falls back to OSM imagery and says so when no credentials are configured", async () => {
      renderView();

      await waitFor(() => {
        expect(screen.getByTestId("cesium-basemap-route")).toHaveTextContent("OpenStreetMap imagery");
      });

      expect(screen.getByTestId("cesium-photoreal-notice")).toHaveTextContent(
        /No Google Map Tiles key or Cesium ion token/i,
      );
      expect(mockCesium.createGooglePhotorealistic3DTileset).not.toHaveBeenCalled();
      // The globe must stay visible without photogrammetry, and OSM extrusions help.
      expect(mockGlobe.show).toBe(true);
      expect(mockCesium.createOsmBuildingsAsync).toHaveBeenCalled();
    });

    it("uses the direct Google route when a Map Tiles key is present, and hides the ellipsoid globe", async () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");

      renderView();

      await waitFor(() => {
        expect(screen.getByTestId("cesium-basemap-route")).toHaveTextContent(
          "Google Photorealistic 3D",
        );
      });

      expect(mockCesium.createGooglePhotorealistic3DTileset).toHaveBeenCalledWith(expect.objectContaining({
        key: "test-map-tiles-key",
        onlyUsingWithGoogleGeocoder: true,
      }), expect.any(Object));
      expect(mockPrimitivesAdd).toHaveBeenCalledWith(
        expect.objectContaining({ id: "google-tileset" }),
      );
      // Two surfaces in the same place z-fight; the photogrammetry carries its own ground.
      expect(mockGlobe.show).toBe(false);
      expect(screen.queryByTestId("cesium-photoreal-notice")).not.toBeInTheDocument();
      // OSM extrusions would duplicate the real buildings.
      expect(mockCesium.createOsmBuildingsAsync).not.toHaveBeenCalled();
    });

    it("degrades to OSM imagery when the configured Google key is rejected", async () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "revoked-key");
      mockCesium.createGooglePhotorealistic3DTileset.mockRejectedValueOnce(
        new Error("403 not authorized"),
      );

      renderView();

      await waitFor(() => {
        expect(screen.getByTestId("cesium-basemap-route")).toHaveTextContent("OpenStreetMap imagery");
      });

      // A failed photoreal route must still produce a usable scene, not an error state.
      expect(screen.queryByText(/3D Globe currently unavailable/i)).not.toBeInTheDocument();
      expect(mockEntitiesAdd).toHaveBeenCalled();
    });
  });

  describe("ground height", () => {
    it("parks the camera overhead before measuring, then flies to the measured ground", async () => {
      renderView();

      await waitFor(() => {
        expect(mockCameraFlyTo).toHaveBeenCalled();
      });

      // Provisional overhead view comes first so tiles stream before any sample.
      expect(mockCameraSetView).toHaveBeenCalled();
      const setViewOrder = mockCameraSetView.mock.invocationCallOrder[0];
      const flyToOrder = mockCameraFlyTo.mock.invocationCallOrder[0];
      expect(setViewOrder).toBeLessThan(flyToOrder);

      // The settled view sits a fixed distance above the MEASURED ground, not above
      // the ellipsoid — the bug that puts the camera underground in Denver.
      const destination = mockCameraFlyTo.mock.calls[0][0].destination as { alt: number };
      expect(destination.alt).toBe(MOCK_GROUND_HEIGHT_M + 280);
    });

    it("reports the ground elevation in feet above sea level, geoid-corrected", async () => {
      renderView();

      await waitFor(() => {
        expect(screen.getByTestId("cesium-ground-elevation")).toBeInTheDocument();
      });

      // 56 m ellipsoidal minus a -22.5 m undulation is 78.5 m MSL, or 258 ft.
      expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent(
        "Ground 258 ft above sea level",
      );
    });

    it("clamps entities to the ground rather than pinning them to the ellipsoid", async () => {
      renderView();

      await waitFor(() => {
        expect(mockEntitiesAdd).toHaveBeenCalled();
      });

      const adu = mockEntitiesAdd.mock.calls
        .map((call) => call[0])
        .find((options) => options.name === "Parcel Site");
      expect(adu).toBeDefined();
      const point = (adu as { point: Record<string, unknown> }).point;
      expect(point.heightReference).toBe(mockCesium.HeightReference.RELATIVE_TO_GROUND);
    });

    it("excludes our own geometry when re-measuring, so the ADU box is never sampled", async () => {
      // Coarse reads one height, the close-range refinement disagrees by more than
      // the threshold, so the scene is rebuilt on the fresher evidence.
      mockSampleHeight = vi
        .fn()
        .mockReturnValueOnce(MOCK_GROUND_HEIGHT_M)
        .mockReturnValue(MOCK_GROUND_HEIGHT_M + 9);
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");

      renderView();

      await waitFor(() => {
        expect(mockEntitiesRemove).toHaveBeenCalled();
      });

      const refineCall = mockSampleHeight.mock.calls[1];
      expect(refineCall[1]).toEqual(expect.arrayContaining([expect.anything()]));
      // 65 m ellipsoidal minus a -22.5 m undulation is 87.5 m MSL, or 287 ft.
      expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent(
        "Ground 287 ft above sea level",
      );
    });

    it("states that the ground is unknown instead of inventing a height", async () => {
      mockSampleHeightSupported = false;

      renderView();

      await waitFor(() => {
        expect(screen.getByTestId("cesium-ground-elevation")).toBeInTheDocument();
      });

      expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent(
        /Ground height unavailable/i,
      );
    });

    it("drapes the footprint when the build cannot clamp and nothing was measured", async () => {
      mockSampleHeightSupported = false;
      const savedHeightReference = mockCesium.HeightReference;
      // @ts-expect-error — simulating an older Cesium build with no HeightReference enum.
      mockCesium.HeightReference = undefined;

      try {
        renderView();

        await waitFor(() => {
          expect(mockEntitiesAdd).toHaveBeenCalled();
        });

        const adu = mockEntitiesAdd.mock.calls
          .map((call) => call[0])
          .find((options) => options.name === "Parcel Site");
        const point = (adu as { point: Record<string, unknown> }).point;
          expect(point.heightReference).toBeUndefined();
      } finally {
        mockCesium.HeightReference = savedHeightReference;
      }
    });
  });

  describe("Task 1: viewer lifecycle vs geometry effect separation", () => {
    it("constructs Cesium.Viewer once and tileset factory once across N consecutive config edits", async () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");
      const { rerender } = renderView({ config: { ...defaultAduConfig, width: 20 } });

      await waitFor(() => {
        expect(mockCesium.Viewer).toHaveBeenCalledOnce();
      });
      const initialViewerCalls = mockCesium.Viewer.mock.calls.length;
      const initialOsmCalls = mockCesium.createOsmBuildingsAsync.mock.calls.length;
      const initialSamples = mockSampleHeight!.mock.calls.length;
      const initialFlyCalls = mockCameraFlyTo.mock.calls.length;

      // 3 consecutive config updates
      rerender(
        <CesiumNeighborhoodView
          parcel={sampleParcel}
          config={{ ...defaultAduConfig, width: 24 }}
          pose={samplePose}
          placement={samplePlacement}
        />,
      );
      rerender(
        <CesiumNeighborhoodView
          parcel={sampleParcel}
          config={{ ...defaultAduConfig, width: 28 }}
          pose={samplePose}
          placement={samplePlacement}
        />,
      );
      rerender(
        <CesiumNeighborhoodView
          parcel={sampleParcel}
          config={{ ...defaultAduConfig, width: 32 }}
          pose={samplePose}
          placement={samplePlacement}
        />,
      );

      await waitFor(() => {
        expect(mockEntitiesRemove).toHaveBeenCalled();
      });

      // Viewer must NOT be destroyed or reconstructed
      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockCesium.Viewer).toHaveBeenCalledTimes(initialViewerCalls);
      expect(mockCesium.createOsmBuildingsAsync).toHaveBeenCalledTimes(initialOsmCalls);
      expect(mockCesium.createGooglePhotorealistic3DTileset).toHaveBeenCalledOnce();
      expect(mockSampleHeight).toHaveBeenCalledTimes(initialSamples);
      expect(mockCameraFlyTo).toHaveBeenCalledTimes(initialFlyCalls);

      // Verify the ADU entity was re-added with the latest config
      const addedAduCalls = mockEntitiesAdd.mock.calls
        .map((call) => call[0])
        .filter((opts) => opts.name === "Parcel Site");
      expect(addedAduCalls.length).toBeGreaterThanOrEqual(4);
    });

    it("re-places geometry without rebuilding viewer on pose change", async () => {
      const { rerender } = renderView({ pose: samplePose });

      await waitFor(() => {
        expect(mockCesium.Viewer).toHaveBeenCalledOnce();
      });

      rerender(
        <CesiumNeighborhoodView
          parcel={sampleParcel}
          config={defaultAduConfig}
          pose={{ x: 10, z: -10, rotationDeg: 45 }}
          placement={samplePlacement}
        />,
      );

      await waitFor(() => {
        expect(mockEntitiesRemove).toHaveBeenCalled();
      });

      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockCesium.Viewer).toHaveBeenCalledOnce();
    });

    it("rebuilds the Cesium viewer when the parcel changes", async () => {
      const { rerender } = renderView({ parcel: sampleParcel });

      await waitFor(() => {
        expect(mockCesium.Viewer).toHaveBeenCalledOnce();
      });

      const differentParcel: LiveParcelData = {
        ...sampleParcel,
        address: "123 Main St",
        lat: 47.65,
        lng: -122.3,
      };

      rerender(
        <CesiumNeighborhoodView
          parcel={differentParcel}
          config={defaultAduConfig}
          pose={samplePose}
          placement={samplePlacement}
        />,
      );

      await waitFor(() => {
        expect(mockDestroy).toHaveBeenCalledOnce();
      });
      expect(mockCesium.Viewer).toHaveBeenCalledTimes(2);
    });

    it("preserves viewer when a new parcel object reference has the same identity", async () => {
      const { rerender } = renderView({ parcel: sampleParcel });

      await waitFor(() => {
        expect(mockCesium.Viewer).toHaveBeenCalledOnce();
      });

      // Same data, new object reference
      const identicalParcel: LiveParcelData = { ...sampleParcel };

      rerender(
        <CesiumNeighborhoodView
          parcel={identicalParcel}
          config={defaultAduConfig}
          pose={samplePose}
          placement={samplePlacement}
        />,
      );

      expect(mockDestroy).not.toHaveBeenCalled();
      expect(mockCesium.Viewer).toHaveBeenCalledOnce();
    });
  });

  describe("Task 5: cold coarse sample recovery post-flight", () => {
    it("recovers when coarse sample is cold and post-flight measurement resolves", async () => {
      vi.useFakeTimers();
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");
      let samples = 0;
      mockSampleHeight = vi.fn(() => ++samples <= 6 ? undefined : MOCK_GROUND_HEIGHT_M);
      mockCameraFlyToBoundingSphere.mockImplementation(() => {});
      renderView();
      await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
      expect(mockSampleHeight).toHaveBeenCalledTimes(6);
      expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent(/Ground height unavailable/);
      await act(async () => {
        mockCameraFlyToBoundingSphere.mock.calls[0][1].complete();
      });
      expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent("Ground 258 ft above sea level");

      // Post-flight must have removed the draped entity and replaced it with clamped/measured geometry
      expect(mockEntitiesRemove).toHaveBeenCalled();

      // Camera flight should have upgraded to measured ground height + 280m
      const destinations = mockCameraFlyTo.mock.calls.map(
        (call) => (call[0]?.destination as { alt?: number })?.alt,
      );
      expect(destinations).toContain(MOCK_GROUND_HEIGHT_M + 280);
    });

    it("remains cold if post-flight measurement also fails to resolve", async () => {
      vi.useFakeTimers();
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");
      mockSampleHeight = vi.fn().mockReturnValue(undefined);
      renderView();
      await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
      expect(mockSampleHeight).toHaveBeenCalledTimes(12);
      expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent(
        /Ground height unavailable — placement is draped, framing is approximate/i,
      );
    });
  });

  describe("Task 3 & 8: attribution container and accessibility", () => {
    it("passes explicit creditContainer to Cesium.Viewer and renders credit element legibly", async () => {
      renderView();

      await waitFor(() => {
        expect(mockCesium.Viewer).toHaveBeenCalled();
      });

      const viewerOptions = mockCesium.Viewer.mock.calls[0][1] as Record<string, unknown>;
      expect(viewerOptions.creditContainer).toBeInstanceOf(HTMLElement);

      const creditEl = screen.getByTestId("cesium-credit-container");
      expect(creditEl).toBeInTheDocument();
      expect(creditEl).toHaveAttribute("aria-label", "Map data credits");
      // Must not be hidden
      expect(creditEl.className).not.toContain("hidden");
      expect(creditEl.className).not.toContain("display: none");
    });

    it("provides narrow aria-live on the asynchronous ground elevation readout", async () => {
      renderView();

      await waitFor(() => {
        expect(screen.getByTestId("cesium-ground-elevation")).toBeInTheDocument();
      });

      const elevationEl = screen.getByTestId("cesium-ground-elevation");
      expect(elevationEl).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("canonical placement verdict", () => {
    it("shows blocked placement even when parcel zoning is compliant", async () => {
      const parcel = parcelPresets[0];
      const pose = { x: 0, z: 0, rotationDeg: 0 };
      const placement = getScenePlacement(parcel, defaultAduConfig, pose);
      expect(calculateFeasibility(parcel, defaultAduConfig, defaultFinancialAssumptions).zoningStatus).toBe("Compliant");
      expect(placement.status).toBe("blocked");
      renderView({ parcel, pose, placement });
      await waitFor(() => expect(mockEntitiesAdd).toHaveBeenCalled());
      expect(screen.getByTestId("cesium-compliance-verdict")).toHaveTextContent("Doesn't fit at this placement");
      expect(screen.getByTestId("cesium-compliance-verdict")).not.toHaveTextContent("Eligible");
      // HUD shows blocked, ADU footprint is no longer rendered.
    });
    it.each([
      ["fits", "Fits the estimated model"],
      ["review", "Placement needs a closer look"],
      ["invalid", "Can't evaluate this placement"],
    ] as const)("shows canonical %s status in both the HUD and ADU label", async (status, title) => {
      renderView({ placement: { ...samplePlacement, status } });
      await waitFor(() => expect(mockEntitiesAdd).toHaveBeenCalled());
      expect(screen.getByTestId("cesium-compliance-verdict")).toHaveTextContent(title);
      // HUD shows title, ADU footprint is no longer rendered.
    });

    it("updates placement feedback without starting another tileset session", async () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");
      const { rerender } = renderView({ placement: { ...samplePlacement, status: "fits" } });
      await waitFor(() => expect(mockEntitiesAdd).toHaveBeenCalled());
      mockEntitiesAdd.mockClear();
      rerender(<CesiumNeighborhoodView parcel={sampleParcel} config={defaultAduConfig} pose={samplePose} placement={{ ...samplePlacement, status: "blocked" }} />);
      expect(screen.getByTestId("cesium-compliance-verdict")).toHaveTextContent("Doesn't fit at this placement");
      // HUD shows blocked, ADU footprint is no longer rendered.
      expect(mockCesium.Viewer).toHaveBeenCalledOnce();
      expect(mockCesium.createGooglePhotorealistic3DTileset).toHaveBeenCalledOnce();
    });
  });

  describe("async cancellation and unmount safety", () => {
    it("holds geometry edits until the coarse sample finishes and uses the latest height", async () => {
      vi.useFakeTimers();
      mockSampleHeight = vi.fn().mockReturnValueOnce(undefined).mockReturnValue(MOCK_GROUND_HEIGHT_M);
      const { rerender } = renderView();
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      rerender(<CesiumNeighborhoodView parcel={{...sampleParcel, address: "New Address"}} config={defaultAduConfig} pose={samplePose} placement={samplePlacement} />);
        expect(mockEntitiesAdd).not.toHaveBeenCalled();
        await act(async () => { await vi.advanceTimersByTimeAsync(250); });
        const sites = mockEntitiesAdd.mock.calls.map(([options]) => options).filter((options) => options.name === "Parcel Site");
        expect(sites).toHaveLength(1);
        expect((sites[0] as { label: { text: string } }).label.text).toBe("New Address");
    });

    it("destroys a tileset that resolves after unmount without creating a viewer", async () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");
      let resolveTileset!: (value: { id: string; boundingSphere: { center: string }; destroy: () => void }) => void;
      mockCesium.createGooglePhotorealistic3DTileset.mockReturnValueOnce(new Promise((resolve) => { resolveTileset = resolve; }));
      const { unmount } = renderView();
      await waitFor(() => expect(mockCesium.createGooglePhotorealistic3DTileset).toHaveBeenCalledOnce());
      unmount();
      const destroy = vi.fn();
      await act(async () => { resolveTileset({ id: "late", boundingSphere: { center: "center" }, destroy }); });
      expect(destroy).toHaveBeenCalledOnce();
      expect(mockCesium.Viewer).not.toHaveBeenCalled();
    });

    it("aborts safely without errors when unmounted during Cesium initialization", async () => {
      const { unmount } = renderView();
      // Immediate unmount while loadCesium / loadPhotorealTileset are pending
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("compact HUD", () => {
    it("keeps the verdict and its caveat on screen and the rest behind Details", async () => {
      const user = userEvent.setup();
      renderView();
      await waitFor(() => {
        expect(screen.getByTestId("cesium-ground-elevation")).toHaveTextContent(/Ground/);
      });

      const toggle = screen.getByRole("button", { name: "Details" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      const details = document.getElementById(toggle.getAttribute("aria-controls")!);
      expect(details).not.toBeVisible();
      expect(screen.getByTestId("cesium-compliance-verdict")).toBeVisible();
      // Imagery provenance stays visible for the Map Tiles policy.
      expect(screen.getByTestId("cesium-basemap-route")).toBeVisible();
      expect(screen.getByTestId("cesium-context-notice")).toHaveTextContent(/not a survey or zoning approval/);
      expect(screen.getByTestId("cesium-context-notice")).toBeVisible();

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(details).toBeVisible();
      expect(screen.getByTestId("cesium-ground-elevation")).toBeVisible();
      expect(screen.getByTestId("cesium-evidence-notice")).toBeVisible();

      await user.click(toggle);
      expect(details).not.toBeVisible();
    });
  });

  describe("camera controls", () => {
    const controls = () => screen.getByRole("group", { name: "Camera controls" });
    const control = (name: string) => within(controls()).getByRole("button", { name });

    async function renderReady() {
      renderView();
      await waitFor(() => expect(control("Zoom in")).toBeEnabled());
      mockCameraSetView.mockClear();
      mockCameraFlyTo.mockClear();
    }

    it("offers zoom, rotate, tilt and recenter, enabled once the view is ready", async () => {
      renderView();
      expect(control("Zoom in")).toBeDisabled();
      await waitFor(() => expect(control("Zoom in")).toBeEnabled());
      for (const name of [
        "Zoom out",
        "Rotate counterclockwise",
        "Rotate clockwise",
        "Tilt up",
        "Tilt down",
        "Recenter on property",
      ]) {
        expect(control(name)).toBeEnabled();
      }
    });

    it("zooms toward the centre of the view", async () => {
      preferReducedMotion();
      const user = userEvent.setup();
      await renderReady();

      await user.click(control("Zoom in"));

      const { position, direction } = lastSetViewPose();
      expect(position.z - MOCK_GROUND_HEIGHT_M).toBeCloseTo(280 * 0.65, 6);
      // A zoom moves the camera, it does not turn it.
      expect(direction.y).toBeCloseTo(mockCamera.directionWC.y, 6);
      expect(mockCancelFlight).toHaveBeenCalled();
    });

    it("rotates counterclockwise by turning the heading toward the east", async () => {
      preferReducedMotion();
      const user = userEvent.setup();
      await renderReady();

      await user.click(control("Rotate counterclockwise"));

      const { position, direction } = lastSetViewPose();
      const heading = (Math.atan2(direction.x, direction.y) * 180) / Math.PI;
      expect(heading).toBeCloseTo(15, 6);
      expect(position.z - MOCK_GROUND_HEIGHT_M).toBeCloseTo(280, 6);
    });

    it("tilts down toward overhead", async () => {
      preferReducedMotion();
      const user = userEvent.setup();
      await renderReady();

      await user.click(control("Tilt down"));

      const pitch = (Math.asin(lastSetViewPose().direction.z) * 180) / Math.PI;
      expect(pitch).toBeCloseTo(-45, 6);
    });

    it("recenters on the property, centred and facing north", async () => {
      preferReducedMotion();
      const user = userEvent.setup();
      await renderReady();
      placeCamera(900, -70);

      await user.click(control("Recenter on property"));

      const options = mockCameraFlyTo.mock.calls.at(-1)?.[0] as {
        destination: MockVec;
        orientation: { direction: MockVec };
        duration: number;
      };
      expect(options.destination.z - MOCK_GROUND_HEIGHT_M).toBeCloseTo(200, 6);
      expect(options.destination.x).toBeCloseTo(0, 6);
      // Centred: the view ray meets the ground at the property.
      const { destination, orientation } = options;
      const reach = (destination.z - MOCK_GROUND_HEIGHT_M) / -orientation.direction.z;
      expect(destination.y + reach * orientation.direction.y).toBeCloseTo(0, 6);
      expect((Math.asin(options.orientation.direction.z) * 180) / Math.PI).toBeCloseTo(-35, 6);
      // Reduced motion: the jump is instant.
      expect(options.duration).toBe(0);
    });

    it("animates a step across frames and lands it when pressed again", async () => {
      const frames = new Map<number, FrameRequestCallback>();
      let nextFrame = 0;
      vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        nextFrame += 1;
        frames.set(nextFrame, callback);
        return nextFrame;
      });
      vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
      const runFrame = (now: number) => {
        const [id, callback] = frames.entries().next().value!;
        frames.delete(id);
        callback(now);
      };
      const user = userEvent.setup();
      await renderReady();

      await user.click(control("Zoom in"));
      // Nothing jumps: the first frame starts the clock at the start pose.
      runFrame(1000);
      expect(mockCamera.positionWC.z - MOCK_GROUND_HEIGHT_M).toBeCloseTo(280, 6);
      runFrame(1120);
      const midway = mockCamera.positionWC.z - MOCK_GROUND_HEIGHT_M;
      expect(midway).toBeLessThan(280);
      expect(midway).toBeGreaterThan(280 * 0.65);

      // A second press lands the first step, then plans from where it ended.
      await user.click(control("Zoom in"));
      expect(mockCamera.positionWC.z - MOCK_GROUND_HEIGHT_M).toBeCloseTo(280 * 0.65, 6);
      expect(frames.size).toBe(1);
      runFrame(2000);
      runFrame(2240);
      expect(mockCamera.positionWC.z - MOCK_GROUND_HEIGHT_M).toBeCloseTo(280 * 0.65 * 0.65, 6);
      expect(frames.size).toBe(0);
    });

    it("waits for a ground measurement before steering photogrammetry", async () => {
      vi.useFakeTimers();
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY", "test-map-tiles-key");
      mockSampleHeight = vi.fn().mockReturnValue(undefined);
      renderView();
      await act(async () => { await vi.advanceTimersByTimeAsync(12000); });

      expect(control("Zoom in")).toBeDisabled();
      expect(control("Recenter on property")).toBeDisabled();
      expect(screen.getByTestId("cesium-camera-controls-waiting")).toHaveTextContent(/wait for a ground reading/);
    });
  });
});
