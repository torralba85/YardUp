import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Camera, Group, Scene } from "three";
import GaussianSplatLayer from "./GaussianSplatLayer";
import { createSplatDepthFixture, DEFAULT_SPLAT_TRANSFORM } from "@/lib/splat-scene";

const state = vi.hoisted(() => ({
  scene: null as unknown as Scene,
  invalidate: vi.fn(),
  gl: {},
  frame: null as unknown as (state: { camera: Camera }) => void,
  meshes: [] as Array<{ numSplats: number; resolve: () => void; reject: (error: Error) => void; dispose: ReturnType<typeof vi.fn> }>,
  renderers: [] as Array<{ options: { onDirty: () => void }; dispose: ReturnType<typeof vi.fn>; geometry: { dispose: ReturnType<typeof vi.fn> }; material: { dispose: ReturnType<typeof vi.fn> }; update: ReturnType<typeof vi.fn> }>,
}));

vi.mock("@react-three/fiber", () => ({
  useThree: () => ({ gl: state.gl, scene: state.scene, invalidate: state.invalidate }),
  useFrame: (callback: typeof state.frame) => { state.frame = callback; },
}));

vi.mock("@sparkjsdev/spark", async () => {
  const { Group: ThreeGroup } = await import("three");
  return {
    SplatMesh: class extends ThreeGroup {
      numSplats = 5106;
      dispose = vi.fn();
      resolve!: () => void;
      reject!: (error: Error) => void;
      initialized = new Promise<void>((resolve, reject) => { this.resolve = resolve; this.reject = reject; });
      constructor() { super(); state.meshes.push(this); }
    },
    SparkRenderer: class extends ThreeGroup {
      dispose = vi.fn();
      geometry = { dispose: vi.fn() };
      material = { dispose: vi.fn() };
      update = vi.fn(() => Promise.resolve());
      constructor(public options: { onDirty: () => void }) { super(); state.renderers.push(this); }
    },
  };
});

beforeEach(() => {
  state.scene = new Scene();
  state.meshes = [];
  state.renderers = [];
  state.invalidate.mockClear();
});

async function mountReady() {
  const onStatus = vi.fn();
  const source = createSplatDepthFixture();
  const result = render(<GaussianSplatLayer source={source} transform={DEFAULT_SPLAT_TRANSFORM} onStatus={onStatus} />);
  await waitFor(() => expect(state.meshes).toHaveLength(1));
  await act(async () => { state.meshes[0].resolve(); });
  await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ state: "ready" })));
  return { ...result, source, onStatus };
}

describe("GaussianSplatLayer resource ownership", () => {
  it("redraws on sorting completion and calibrates only its scan group", async () => {
    const { rerender, source, onStatus } = await mountReady();
    const unrelated = new Group();
    unrelated.position.set(9, 8, 7);
    state.scene.add(unrelated);
    state.invalidate.mockClear();
    state.renderers[0].options.onDirty();
    expect(state.invalidate).toHaveBeenCalledOnce();
    rerender(<GaussianSplatLayer source={source} transform={{ positionFt: [2, 3, 4], yawRad: 1, uniformScale: 2 }} onStatus={onStatus} />);
    expect(state.meshes).toHaveLength(1);
    const scan = state.scene.children.find((child) => child.children.length === 1)!;
    expect(scan.position.toArray()).toEqual([2, 3, 4]);
    expect(scan.scale.toArray()).toEqual([2, 2, 2]);
    expect(unrelated.position.toArray()).toEqual([9, 8, 7]);
  });

  it("disposes a late decoder result after unmount without publishing ready", async () => {
    const onStatus = vi.fn();
    const view = render(<GaussianSplatLayer source={createSplatDepthFixture()} transform={DEFAULT_SPLAT_TRANSFORM} onStatus={onStatus} />);
    await waitFor(() => expect(state.meshes).toHaveLength(1));
    view.unmount();
    await act(async () => { state.meshes[0].resolve(); });
    expect(state.meshes[0].dispose).toHaveBeenCalledOnce();
    expect(state.renderers).toHaveLength(0);
    expect(onStatus).not.toHaveBeenCalledWith(expect.objectContaining({ state: "ready" }));
    expect(state.scene.children).toHaveLength(0);
  });

  it("detaches immediately but waits for an active sort before disposal", async () => {
    const { unmount } = await mountReady();
    let finish!: () => void;
    state.renderers[0].update.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    state.frame({ camera: new Camera() });
    state.frame({ camera: new Camera() });
    expect(state.renderers[0].update).toHaveBeenCalledOnce();
    unmount();
    expect(state.scene.children).toHaveLength(0);
    expect(state.renderers[0].dispose).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(state.renderers[0].dispose).toHaveBeenCalledOnce();
    expect(state.renderers[0].geometry.dispose).toHaveBeenCalledOnce();
    expect(state.renderers[0].material.dispose).toHaveBeenCalledOnce();
    expect(state.meshes[0].dispose).toHaveBeenCalledOnce();
    state.invalidate.mockClear();
    state.renderers[0].options.onDirty();
    expect(state.invalidate).not.toHaveBeenCalled();
  });

  it("settles after sorting and updates again only for camera or calibration changes", async () => {
    const { rerender, source, onStatus } = await mountReady();
    const camera = new Camera();
    await act(async () => { state.frame({ camera }); });
    await act(async () => { state.frame({ camera }); });
    expect(state.renderers[0].update).toHaveBeenCalledOnce();
    camera.position.x = 4;
    await act(async () => { state.frame({ camera }); });
    expect(state.renderers[0].update).toHaveBeenCalledTimes(2);
    camera.projectionMatrix.elements[0] = 2;
    await act(async () => { state.frame({ camera }); });
    expect(state.renderers[0].update).toHaveBeenCalledTimes(3);
    rerender(<GaussianSplatLayer source={source} transform={{ ...DEFAULT_SPLAT_TRANSFORM, uniformScale: 2 }} onStatus={onStatus} />);
    await act(async () => { state.frame({ camera }); });
    expect(state.renderers[0].update).toHaveBeenCalledTimes(4);
  });

  it("reports decode failure and releases the failed asset", async () => {
    const onStatus = vi.fn();
    render(<GaussianSplatLayer source={createSplatDepthFixture()} transform={DEFAULT_SPLAT_TRANSFORM} onStatus={onStatus} />);
    await waitFor(() => expect(state.meshes).toHaveLength(1));
    await act(async () => { state.meshes[0].reject(new Error("Invalid SPZ")); });
    expect(onStatus).toHaveBeenLastCalledWith({ state: "error", message: "Invalid SPZ" });
    expect(state.meshes[0].dispose).toHaveBeenCalledOnce();
    expect(state.scene.children).toHaveLength(0);
  });

  it("rejects oversized decoded scans before allocating a renderer", async () => {
    const onStatus = vi.fn();
    render(<GaussianSplatLayer source={createSplatDepthFixture()} transform={DEFAULT_SPLAT_TRANSFORM} onStatus={onStatus} />);
    await waitFor(() => expect(state.meshes).toHaveLength(1));
    state.meshes[0].numSplats = 786233;
    await act(async () => { state.meshes[0].resolve(); });
    expect(onStatus).toHaveBeenLastCalledWith({ state: "error", message: expect.stringContaining("100,000") });
    expect(state.meshes[0].dispose).toHaveBeenCalledOnce();
    expect(state.renderers).toHaveLength(0);
  });
});
