import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CesiumNeighborhoodView from "./CesiumNeighborhoodView";
import type { LiveParcelData } from "@/lib/parcel-types";
import { defaultAduConfig } from "@/lib/feasibility";
import type { Pose2D } from "@/lib/scene-model";

const mockDestroy = vi.fn();
const mockEntitiesAdd = vi.fn();
const mockCameraFlyTo = vi.fn();

const mockCesium = {
  Viewer: vi.fn(function () {
    return {
      destroy: mockDestroy,
      isDestroyed: vi.fn().mockReturnValue(false),
      entities: { add: mockEntitiesAdd },
      camera: { flyTo: mockCameraFlyTo },
      scene: { primitives: { add: vi.fn() } },
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
  Color: {
    fromCssColorString: vi.fn(() => ({ withAlpha: vi.fn().mockReturnValue("mock-color") })),
  },
  LabelStyle: { FILL_AND_OUTLINE: 0 },
  VerticalOrigin: { BOTTOM: 0 },
  Math: { toRadians: (deg: number) => (deg * Math.PI) / 180 },
  createOsmBuildingsAsync: vi.fn().mockResolvedValue({}),
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

describe("CesiumNeighborhoodView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("initializes Cesium viewer and adds parcel entities", async () => {
    render(
      <CesiumNeighborhoodView
        parcel={sampleParcel}
        config={defaultAduConfig}
        pose={samplePose}
        isCompliant={true}
      />,
    );

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

    render(
      <CesiumNeighborhoodView
        parcel={sampleParcel}
        config={defaultAduConfig}
        pose={samplePose}
        isCompliant={true}
        onReturnToModel={onReturn}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Return to 3D model/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Return to 3D model/i }));
    expect(onReturn).toHaveBeenCalledOnce();
  });

  it("cleans up Cesium viewer on component unmount", async () => {
    const { unmount } = render(
      <CesiumNeighborhoodView
        parcel={sampleParcel}
        config={defaultAduConfig}
        pose={samplePose}
        isCompliant={true}
      />,
    );

    await waitFor(() => {
      expect(mockCesium.Viewer).toHaveBeenCalled();
    });

    unmount();
    expect(mockDestroy).toHaveBeenCalledOnce();
  });

  it("displays error fallback when Cesium fails to load", async () => {
    const { loadCesium } = await import("@/lib/cesium-loader");
    vi.mocked(loadCesium).mockRejectedValueOnce(new Error("Network failed to fetch CesiumJS"));

    render(
      <CesiumNeighborhoodView
        parcel={sampleParcel}
        config={defaultAduConfig}
        pose={samplePose}
        isCompliant={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/3D Globe currently unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Network failed to fetch CesiumJS/i)).toBeInTheDocument();
    });
  });
});
