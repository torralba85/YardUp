import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { defaultAduConfig, parcelPresets } from "@/lib/feasibility";
import {
  getStudioEnhancementsSnapshot,
  setUtilityAnchor,
} from "@/lib/studio-enhancements-store";
import { SceneVisibility } from "./SceneVisibility";

vi.mock("@react-three/fiber", () => ({ useThree: () => threeState }));
vi.mock("@react-three/drei", () => ({ Line: () => null }));
vi.mock("@/components/canvas/SetbackEnvelope", () => ({ SetbackEnvelope: () => null }));
vi.mock("@/components/canvas/UtilityAnchorPoint", () => ({
  UtilityAnchorPoint: () => <div data-testid="utility-anchor" />,
}));
vi.mock("@/components/canvas/UtilityTrenchLine", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/canvas/UtilityTrenchLine")>(),
  UtilityTrenchLine: () => <div data-testid="utility-trench" />,
}));

const threeState = {
  gl: { domElement: document.createElement("canvas") },
  scene: {},
  setFrameloop: vi.fn(),
  invalidate: vi.fn(),
  get: () => ({ frameloop: "demand" }),
};
const pose = { x: 0, z: 20, rotationDeg: 0 };
const anchor = { x: 2, y: 0.3, z: -20 };

beforeEach(() => {
  setUtilityAnchor(null);
});

it.each(["same", "different"])("scopes utility state to the %s lot across a scene remount", (destination) => {
  const first = render(<SceneVisibility parcel={parcelPresets[0]} config={defaultAduConfig} pose={pose} />);
  act(() => setUtilityAnchor(anchor));
  const estimate = getStudioEnhancementsSnapshot().utilityEstimate;
  expect(estimate?.distanceFt).toBeGreaterThan(0);
  first.unmount();

  // Address lookup hides the scene while pending; view changes can also remount it.
  const target = destination === "same" ? { ...parcelPresets[0] } : parcelPresets[1];
  render(<SceneVisibility parcel={target} config={defaultAduConfig} pose={pose} />);
  if (destination === "same") {
    expect(screen.getByTestId("utility-anchor")).toBeInTheDocument();
    expect(getStudioEnhancementsSnapshot()).toMatchObject({ utilityAnchor: anchor, utilityEstimate: estimate });
  } else {
    expect(screen.queryByTestId("utility-anchor")).not.toBeInTheDocument();
    expect(screen.queryByTestId("utility-trench")).not.toBeInTheDocument();
    expect(getStudioEnhancementsSnapshot()).toMatchObject({ utilityAnchor: null, utilityEstimate: null });
  }
});

it("clears utility state when the mounted scene changes lots", () => {
  const view = render(<SceneVisibility parcel={parcelPresets[0]} config={defaultAduConfig} pose={pose} />);
  act(() => setUtilityAnchor(anchor));
  view.rerender(<SceneVisibility parcel={parcelPresets[1]} config={defaultAduConfig} pose={pose} />);
  expect(getStudioEnhancementsSnapshot()).toMatchObject({ utilityAnchor: null, utilityEstimate: null });
});
