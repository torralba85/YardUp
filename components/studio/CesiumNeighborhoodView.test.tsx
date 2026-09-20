import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CesiumNeighborhoodView from "./CesiumNeighborhoodView";
import type { LiveParcelData } from "@/lib/parcel-types";
import { defaultAduConfig } from "@/lib/feasibility";
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

const mockCesium = {
  Viewer: vi.fn(function (_container: Element, _options?: Record<string, unknown>) {
    void _container;
    void _options;
    mockGlobe = { show: true };
    return {
      destroy: mockDestroy,
      isDestroyed: vi.fn().mockReturnValue(false),
      entities: { add: mockEntitiesAdd, remove: mockEntitiesRemove },
      camera: {
        flyTo: mockCameraFlyTo,
        setView: mockCameraSetView,
        flyToBoundingSphere: mockCameraFlyToBoundingSphere,
      },
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

const samplePose: Pose2D = { x: 0, z: -20, rotationDeg: 0 };

function renderView(props: Partial<React.ComponentProps<typeof CesiumNeighborhoodView>> = {}) {
  return render(
    <CesiumNeighborhoodView
      parcel={sampleParcel}
      config={defaultAduConfig}
      pose={samplePose}
      isCompliant={true}
      {...props}
    />,
  );
}

describe("CesiumNeighborhoodView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCameraFlyTo.mockImplementation((options) => options.complete?.());
    mockCameraFlyToBoundingSphere.mockImplementation((_sphere, options) => options?.complete?.());
    mockSampleHeight = vi.fn(() => MOCK_GROUND_HEIGHT_M);
    mockSampleHeightSupported = true;
    setGeoidModuleForTesting({ meanSeaLevel: () => MOCK_UNDULATION_M });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
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
        .find((options) => options.name === "Proposed ADU Footprint");
      expect(adu).toBeDefined();
      const polygon = (adu as { polygon: Record<string, unknown> }).polygon;
      expect(polygon.heightReference).toBe(mockCesium.HeightReference.RELATIVE_TO_GROUND);
      expect(polygon.extrudedHeightReference).toBe(mockCesium.HeightReference.RELATIVE_TO_GROUND);
      expect(polygon.extrudedHeight).toBeGreaterThan(0);
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
          .find((options) => options.name === "Proposed ADU Footprint");
        const polygon = (adu as { polygon: Record<string, unknown> }).polygon;
        // No clamping and no measurement: a box at an invented height would be buried.
        expect(polygon.extrudedHeight).toBeUndefined();
        expect(polygon.height).toBeUndefined();
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
          isCompliant={true}
        />,
      );
      rerender(
        <CesiumNeighborhoodView
          parcel={sampleParcel}
          config={{ ...defaultAduConfig, width: 28 }}
          pose={samplePose}
          isCompliant={true}
        />,
      );
      rerender(
        <CesiumNeighborhoodView
          parcel={sampleParcel}
          config={{ ...defaultAduConfig, width: 32 }}
          pose={samplePose}
          isCompliant={true}
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
        .filter((opts) => opts.name === "Proposed ADU Footprint");
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
          isCompliant={true}
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
          isCompliant={true}
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
          isCompliant={true}
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

  describe("Task 9: compliance verdict reflects isCompliant honestly", () => {
    it("displays eligible status and color when isCompliant is true", async () => {
      renderView({ isCompliant: true });

      await waitFor(() => {
        expect(screen.getByTestId("cesium-compliance-verdict")).toBeInTheDocument();
      });

      const verdict = screen.getByTestId("cesium-compliance-verdict");
      expect(verdict).toHaveTextContent(/Eligible/i);
      expect(verdict).not.toHaveTextContent(/Review needed/i);
      expect(verdict).not.toHaveTextContent(/Blocked/i);

      // Check 3D ADU entity label & color
      const adu = mockEntitiesAdd.mock.calls
        .map((call) => call[0])
        .find((options) => options.name === "Proposed ADU Footprint");
      expect(adu).toBeDefined();
      expect((adu as { label: { text: string } }).label.text).toContain("Eligible");
      expect(mockCesium.Color.fromCssColorString).toHaveBeenCalledWith("#176B4C");
    });

    it("displays review needed status without inferring blocked when isCompliant is false", async () => {
      renderView({ isCompliant: false });

      await waitFor(() => {
        expect(screen.getByTestId("cesium-compliance-verdict")).toBeInTheDocument();
      });

      const verdict = screen.getByTestId("cesium-compliance-verdict");
      expect(verdict).toHaveTextContent(/Review needed/i);
      // Must NOT claim "Blocked" or use blocked color
      expect(verdict).not.toHaveTextContent(/Blocked/i);

      // Check 3D ADU entity label & color (#8A5300 review-needed token)
      const adu = mockEntitiesAdd.mock.calls
        .map((call) => call[0])
        .find((options) => options.name === "Proposed ADU Footprint");
      expect(adu).toBeDefined();
      expect((adu as { label: { text: string } }).label.text).toContain("Review needed");
      expect(mockCesium.Color.fromCssColorString).toHaveBeenCalledWith("#8A5300");
      expect(mockCesium.Color.fromCssColorString).not.toHaveBeenCalledWith("#A82D16");
    });
  });

  describe("async cancellation and unmount safety", () => {
    it("holds geometry edits until the coarse sample finishes and uses the latest height", async () => {
      vi.useFakeTimers();
      mockSampleHeight = vi.fn().mockReturnValueOnce(undefined).mockReturnValue(MOCK_GROUND_HEIGHT_M);
      const { rerender } = renderView();
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      rerender(<CesiumNeighborhoodView parcel={sampleParcel} config={{ ...defaultAduConfig, height: 19 }} pose={samplePose} isCompliant />);
      expect(mockEntitiesAdd).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(250); });
      const adus = mockEntitiesAdd.mock.calls.map(([options]) => options).filter((options) => options.name === "Proposed ADU Footprint");
      expect(adus).toHaveLength(1);
      expect((adus[0].polygon as { extrudedHeight: number }).extrudedHeight).toBeCloseTo(19 * 0.3048);
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
});
