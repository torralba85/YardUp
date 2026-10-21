import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { calculateCameraFit } from "@/lib/scene-camera-fit";
import { SceneCameraController } from "./SceneCameraController";

const hooks = vi.hoisted(() => ({ frame: null as null | ((state: unknown, delta: number) => void) }));
vi.mock("@react-three/fiber", () => ({
  useThree: () => state,
  useFrame: (frame: typeof hooks.frame) => { hooks.frame = frame; },
}));
vi.mock("@react-three/drei", () => ({ OrthographicCamera: () => null, PerspectiveCamera: () => null }));

const state = {
  camera: new PerspectiveCamera(),
  size: { width: 800, height: 600 },
  invalidate: vi.fn(),
  controls: {
    target: new Vector3(),
    update: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
};
const bounds = { minX: -30, maxX: 30, minZ: -60, maxZ: 60, minY: 0, maxY: 18 };

beforeEach(() => {
  vi.clearAllMocks();
  hooks.frame = null;
  state.camera.position.set(58, 58, 72);
  state.controls.target.set(0, 0, 0);
});

it.each([60, 2])("finishes framing in three seconds at %i frames per second", (fps) => {
  const fit = calculateCameraFit({
    bounds, fov: 42, viewportWidth: 800, viewportHeight: 600,
    insets: { top: 12, bottom: 64, left: 12, right: 12 }, mode: "overview",
  })!;
  render(<SceneCameraController commandId={1} mode="overview" bounds={bounds} geometryRevision="lot" />);
  for (let frame = 0; frame < fps * 3; frame++) hooks.frame!(null, 1 / fps);

  expect(state.camera.position.distanceTo(new Vector3().fromArray(fit.position))).toBe(0);
  expect(state.controls.target.distanceTo(new Vector3().fromArray(fit.target))).toBe(0);
  const updates = state.controls.update.mock.calls.length;
  hooks.frame!(null, 0.5);
  expect(state.controls.update).toHaveBeenCalledTimes(updates);
});
