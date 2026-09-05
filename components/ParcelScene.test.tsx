import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import ParcelScene from "./ParcelScene";

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
    expect(onPoseCommit.mock.calls[0][0]).toMatchObject({ rotationDeg: 0 });
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
});
