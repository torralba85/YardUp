import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import ParcelScene from "./ParcelScene";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="parcel-canvas" />,
  useFrame: vi.fn(),
  useThree: vi.fn(),
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

    expect(screen.getByText("6.5 PM")).toBeInTheDocument();
  });
});
