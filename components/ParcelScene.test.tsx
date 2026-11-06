import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import { getDefaultAduPose } from "@/lib/site-fit";
import { EXISTING_HOUSE_ROOF_OVERHANG_FT } from "@/lib/scene-model";
import ParcelScene, {
  computeShadowFrustumHalfExtent,
  existingHouseRidgeCapSize,
  placementToneColor,
} from "./ParcelScene";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="parcel-canvas" />,
  useFrame: vi.fn(),
  useThree: vi.fn(),
  addAfterEffect: vi.fn(() => () => {}),
}));

vi.mock("@react-three/drei", () => ({
  Html: ({ children }: PropsWithChildren) => <>{children}</>,
  Line: () => null,
  OrbitControls: () => null,
}));

beforeEach(() => {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getExtension: vi.fn(() => ({ loseContext: vi.fn() })),
  } as unknown as WebGLRenderingContext);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ParcelScene controls", () => {
  it("presents an honest, adjustable shadow preview without a fake satellite mode", () => {
    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        isCompliant
        remainingCapacity={20}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Illustrative shadow preview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 PM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Satellite" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("slider", { name: "Preview time" }), {
      target: { value: "18.5" },
    });

    // A half hour reads as a clock time, not a decimal hour.
    expect(screen.getByText("6:30 PM")).toBeInTheDocument();
  });

  it("announces the exact modeled capacity and corrective action", () => {
    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        isCompliant={false}
        remainingCapacity={-380}
      />,
    );

    const siteFitStatus = screen.getByRole("status", {
      name: "Modeled site fit status",
    });
    expect(siteFitStatus).toHaveTextContent(
      "380 sf over modeled coverage allowance",
    );
    expect(siteFitStatus).toHaveTextContent(
      "Reduce the ADU footprint by at least 380 sf",
    );
  });

  it("only captures arrow keys while the placement model itself has focus", () => {
    const onPoseCommit = vi.fn();
    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        isCompliant
        remainingCapacity={20}
        onPoseCommit={onPoseCommit}
      />,
    );

    const pageArrow = new KeyboardEvent("keydown", {
      key: "ArrowLeft",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(pageArrow);
    expect(pageArrow.defaultPrevented).toBe(false);
    expect(onPoseCommit).not.toHaveBeenCalled();

    // A keyboard nudge previews while the key is held and commits once, on
    // release, so a held arrow writes one scenario entry rather than one per
    // animation frame.
    const scene = screen.getByRole("group", { name: "Interactive ADU placement model" });
    fireEvent.keyDown(scene, { key: "ArrowLeft" });
    expect(onPoseCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(scene, { key: "ArrowLeft" });
    expect(onPoseCommit).toHaveBeenCalledTimes(1);
    const start = getDefaultAduPose(parcelPresets[0], defaultAduConfig);
    expect(onPoseCommit.mock.calls[0][0]).toMatchObject({ rotationDeg: start.rotationDeg, z: start.z });
    expect(onPoseCommit.mock.calls[0][0].x).toBeLessThan(start.x);
  });

  it("reports placement and coverage as two separate outcomes", () => {
    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={{ ...defaultAduConfig, width: 31, length: 20 }}
        isCompliant
        remainingCapacity={120}
      />,
    );

    // Coverage can pass while the footprint still fails to fit the envelope —
    // the audit found a 31 x 20 ft design accepted in a 30 ft envelope.
    const status = screen.getByRole("status", { name: "Modeled site fit status" });
    expect(status).toHaveTextContent("120 sf of modeled coverage remains");
    expect(status).not.toHaveTextContent("Fits at this placement");
  });

  it("offers Shadow Preview, not the retired Golden Hour, as the default lighting", () => {
    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        isCompliant
        remainingCapacity={20}
      />,
    );

    const presets = screen.getByRole("radiogroup", { name: "Lighting preset" });
    expect(presets).toHaveTextContent("Gallery Daylight");
    expect(screen.getByRole("radio", { name: "Shadow Preview" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Golden Hour" })).not.toBeInTheDocument();
  });

  it("mounts in photoreal scan mode with registered splat scene without errors", () => {
    const mockScan = {
      id: "oak-street-curated",
      parcelId: "oak-street",
      assetUrl: "/scans/oak-street-curated.spz",
      format: "spz" as const,
      approximateBytes: 100000,
      captureLabel: "Oak Street Scan",
      transform: {
        positionFt: [0, 0, 10] as [number, number, number],
        yawRad: 0,
        uniformScale: 1,
      },
    };

    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        isCompliant
        remainingCapacity={20}
        scanMode
        splatScene={mockScan}
      />,
    );

    expect(screen.getByTestId("parcel-canvas")).toBeInTheDocument();
  });

  it("toggles live 3D clearance guides and cycles shadow preview time from the viewport HUD", () => {
    render(
      <ParcelScene
        parcel={parcelPresets[0]}
        config={defaultAduConfig}
        isCompliant
        remainingCapacity={20}
      />,
    );

    const clearancesBtn = screen.getByRole("button", { name: "Clearances" });
    expect(clearancesBtn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(clearancesBtn);
    expect(clearancesBtn).toHaveAttribute("aria-pressed", "true");

    const sunBtn = screen.getByRole("button", {
      name: /Cycle shadow preview time/i,
    });
    expect(sunBtn).toHaveTextContent("Solar · 2 PM");
    fireEvent.click(sunBtn);
    expect(sunBtn).toHaveTextContent("Solar · 5 PM");
    fireEvent.click(sunBtn);
    expect(sunBtn).toHaveTextContent("Solar · 9 AM");
  });
});

describe("placementToneColor", () => {
  it("draws each placement tone in its own status colour, matching the 2D plan", () => {
    expect(placementToneColor("clear")).toBe("#176B4C");
    expect(placementToneColor("review")).toBe("#8A5300");
    expect(placementToneColor("blocked")).toBe("#A82D16");
  });
});

describe("computeShadowFrustumHalfExtent", () => {
  it("fits the orthographic shadow frustum tightly to urban lots instead of fixed 90 ft", () => {
    const compact = computeShadowFrustumHalfExtent(40, 80);
    const standard = computeShadowFrustumHalfExtent(50, 100);
    expect(compact).toBeLessThan(standard);
    expect(standard).toBeLessThan(90);
    expect(computeShadowFrustumHalfExtent(15, 20)).toBeGreaterThanOrEqual(38);
    expect(computeShadowFrustumHalfExtent(200, 300)).toBeLessThanOrEqual(110);
  });
});

describe("existingHouseRidgeCapSize", () => {
  it("lays the ridge cap along the gable ridge (x), not across both slopes (z)", () => {
    const [x, , z] = existingHouseRidgeCapSize(30);
    expect(x).toBeCloseTo(30 + EXISTING_HOUSE_ROOF_OVERHANG_FT * 2 + 0.2);
    expect(z).toBeLessThan(1);
  });
});
