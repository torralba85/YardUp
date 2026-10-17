import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudioMeasurementCollector } from "@/lib/studio-measurement";
import { StudioMeasurementAdapter } from "./StudioMeasurementAdapter";

const { gl, callbacks } = vi.hoisted(() => ({
  gl: { info: { render: { frame: 0, calls: 20 }, memory: { geometries: 10, textures: 3 } } },
  callbacks: new Set<() => void>(),
}));
vi.mock("@react-three/fiber", () => ({
  useThree: () => ({ gl }),
  addAfterEffect: (callback: () => void) => { callbacks.add(callback); return () => callbacks.delete(callback); },
}));
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_PROFILE_STUDIO", "true"); callbacks.clear(); gl.info.render.frame = 0; });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const frame = (ownRoot = true) => act(() => { if (ownRoot) gl.info.render.frame++; callbacks.forEach(callback => callback()); });

describe("opt-in renderer measurement adapter", () => {
  it("ignores other roots and cleans up without owning the collector", () => {
    const collector = new StudioMeasurementCollector();
    collector.start(0);
    const mark = vi.spyOn(collector, "markFrame");
    const stop = vi.spyOn(collector, "stop");
    const view = render(<StudioMeasurementAdapter collector={collector} runId={1} cycleIndex={0} enabled />);
    frame(false);
    expect(mark).not.toHaveBeenCalled();
    frame(); frame(false);
    expect(mark).toHaveBeenCalledTimes(1);
    expect(collector.generateReport().webGLCycles).toEqual([{ cycleIndex: 0, calls: 20, geometries: 10, textures: 3 }]);
    view.unmount();
    expect(callbacks.size).toBe(0);
    expect(stop).not.toHaveBeenCalled();
  });
  it("resets cycle and activity guards when the same collector starts another run", () => {
    const collector = new StudioMeasurementCollector();
    collector.start(0);
    const activity = vi.spyOn(collector, "setActivity");
    const view = render(<StudioMeasurementAdapter collector={collector} runId={1} cycleIndex={0} active={false} enabled />);
    frame();
    collector.start(0);
    view.rerender(<StudioMeasurementAdapter collector={collector} runId={2} cycleIndex={0} active={false} enabled />);
    frame();
    expect(activity).toHaveBeenCalledTimes(2);
    expect(activity).toHaveBeenLastCalledWith(false);
    expect(collector.generateReport().webGLCycles).toHaveLength(1);
    expect(collector.generateReport().firstMeaningfulFrameMs).not.toBeNull();
    view.unmount();
  });
  it("is inert without both a profiling build and explicit enablement", () => {
    const collector = new StudioMeasurementCollector();
    const view = render(<StudioMeasurementAdapter collector={collector} runId={1} />);
    expect(callbacks.size).toBe(0);
    vi.stubEnv("NEXT_PUBLIC_PROFILE_STUDIO", "false");
    view.rerender(<StudioMeasurementAdapter collector={collector} runId={1} enabled />);
    expect(callbacks.size).toBe(0);
    view.unmount();
  });
});
