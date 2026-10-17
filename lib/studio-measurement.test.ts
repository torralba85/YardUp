import { describe, expect, it } from "vitest";
import { StudioMeasurementCollector } from "./studio-measurement";

describe("T08 synthetic measurement validation (not GPU evidence)", () => {
  it("counts submitted frames during warmup and explicit idle without adding timing samples", () => {
    const collector = new StudioMeasurementCollector();
    collector.start(0, 100);
    collector.markFrame(50);
    collector.setActivity(false);
    collector.markFrame(200);
    collector.markFrame(216);
    collector.markFrame(216);
    collector.stop();
    collector.markFrame(300);
    expect(collector.generateReport()).toMatchObject({ submittedFrames: 3, frameCount: 0 });
    collector.start(400);
    expect(collector.generateReport().submittedFrames).toBe(0);
  });
  it("reports nearest-rank p50/p95 for 100 known intervals", () => {
    const collector = new StudioMeasurementCollector();
    collector.start(1000);
    collector.markFrame(1000);
    let now = 1000;
    for (let delta = 10; delta < 110; delta++) { now += delta; collector.markFrame(now); }
    expect(collector.generateReport()).toMatchObject({ frameCount: 100, p50FrameMs: 59, p95FrameMs: 104 });
  });
  it("measures readiness from the run clock, independently of warmup and wall-clock labels", () => {
    const collector = new StudioMeasurementCollector({ timestamp: 1700000000000 });
    collector.start(1000, 100);
    collector.markFrame(1050);
    collector.markFirstMeaningfulFrame(1080);
    collector.markFirstMeaningfulFrame(1090);
    collector.markFrame(1100);
    collector.markFrame(1116);
    expect(collector.generateReport()).toMatchObject({ firstMeaningfulFrameMs: 80, frameCount: 1, p50FrameMs: 16 });
  });
  it("retains real stalls and excludes explicitly idle intervals across resume", () => {
    const collector = new StudioMeasurementCollector();
    collector.start(0);
    collector.markFrame(0);
    collector.markFrame(380);
    collector.setActivity(false);
    collector.markFrame(390);
    collector.markFrame(780);
    collector.setActivity(true);
    collector.markFrame(1000);
    collector.markFrame(1016);
    expect(collector.generateReport()).toMatchObject({ frameCount: 2, p95FrameMs: 380, idlePeriods: 1 });
  });
  it("bounds every collection, reports dropped samples, and preserves 20 cycle indices", () => {
    const collector = new StudioMeasurementCollector({}, { maxFrames: 2, maxLongTasks: 2, maxCycles: 20 });
    collector.start(0);
    for (let i = 0; i < 4; i++) collector.markFrame(i * 16);
    for (let i = 0; i < 3; i++) collector.markLongTask(60);
    for (let i = 1; i <= 21; i++) collector.recordWebGLCycle(i, 40, 10, null);
    const report = collector.generateReport();
    expect(report).toMatchObject({ frameCount: 2, droppedFrames: 1, droppedLongTasks: 1, droppedCycles: 1 });
    expect(report.longTasks).toHaveLength(2);
    expect(report.webGLCycles.map(cycle => cycle.cycleIndex)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(report.webGLCycles[0].textures).toBeNull();
  });
  it("rejects invalid input without poisoning later frame intervals", () => {
    const collector = new StudioMeasurementCollector();
    expect(() => collector.start(NaN)).toThrow(RangeError);
    expect(() => collector.start(0, -1)).toThrow(RangeError);
    expect(() => new StudioMeasurementCollector({}, { maxFrames: Infinity })).toThrow(RangeError);
    collector.start(100);
    collector.markFrame(100);
    for (const invalid of [-1, 50, NaN, Infinity, 100]) collector.markFrame(invalid);
    collector.markFrame(116);
    collector.markLongTask(-1);
    collector.recordWebGLCycle(1, 1, NaN, 1);
    collector.recordWebGLCycle(-1, 1, 1, 1);
    expect(collector.generateReport()).toMatchObject({ frameCount: 1, p50FrameMs: 16, longTasks: [], webGLCycles: [] });
  });
  it("stops all recording, starts a fresh run, and resets to unknown measurements", () => {
    const collector = new StudioMeasurementCollector();
    collector.start(0);
    collector.stop();
    collector.markFrame(16);
    collector.markLongTask(60);
    collector.markFirstMeaningfulFrame(20);
    collector.recordWebGLCycle(1, 1, 1, 1);
    collector.setActivity(false);
    expect(collector.generateReport()).toMatchObject({ frameCount: 0, longTasks: [], webGLCycles: [], firstMeaningfulFrameMs: null, idlePeriods: 0 });
    collector.start(1000);
    collector.markFirstMeaningfulFrame(1010);
    expect(collector.generateReport().firstMeaningfulFrameMs).toBe(10);
    collector.start(2000);
    expect(collector.generateReport().firstMeaningfulFrameMs).toBeNull();
    collector.reset();
    expect(collector.generateReport()).toMatchObject({ p50FrameMs: null, metadata: { browser: null, physicalDevice: null } });
  });
  it("isolates input metadata and returned mutable report fields", () => {
    const metadata = { browser: "Synthetic" };
    const collector = new StudioMeasurementCollector(metadata);
    metadata.browser = "Changed";
    collector.start(0);
    collector.recordWebGLCycle(1, 10, 10, 10);
    collector.markLongTask(60);
    const report = collector.generateReport();
    report.metadata.browser = "Changed";
    report.webGLCycles[0].calls = 999;
    report.longTasks[0] = 999;
    expect(collector.generateReport()).toMatchObject({ metadata: { browser: "Synthetic" }, longTasks: [60], webGLCycles: [{ cycleIndex: 1, calls: 10, geometries: 10, textures: 10 }] });
  });
});
