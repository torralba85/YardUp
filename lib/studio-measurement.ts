/** T08 opt-in collector. No runtime hooks, timers, observers, or network side effects.
 * Based on Gemini's delegated draft; lifecycle and sample validity corrected in review.
 * All timestamps supplied to methods use the same monotonic clock (e.g. performance.now).
 */
export interface MeasurementMetadata {
  browser?: string | null;
  device?: string | null;
  dpr?: number | null;
  quality?: string | null;
  build?: "production" | "development" | null;
  timestamp?: number | null; // Optional wall-clock label; never used for elapsed time.
  commit?: string | null;
  physicalDevice?: boolean | null;
}
export interface WebGLSnapshot {
  cycleIndex: number;
  calls: number | null;
  geometries: number | null;
  textures: number | null;
}
export interface MeasurementOptions {
  maxFrames?: number;
  maxLongTasks?: number;
  maxCycles?: number;
}
const validTime = (value: number) => Number.isFinite(value) && value >= 0;
const validCount = (value: number | null) => value === null || (Number.isSafeInteger(value) && value >= 0);
const capacity = (value: number | undefined, fallback: number) => {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 1 || value > 100000) throw new RangeError("Invalid sample capacity");
  return value;
};

export class StudioMeasurementCollector {
  private readonly metadata: MeasurementMetadata;
  private readonly limits: { frames: number; longTasks: number; cycles: number };
  private running = false;
  private active = true;
  private runStart: number | null = null;
  private samplingStart = 0;
  private lastFrame: number | null = null;
  private latestTimestamp: number | null = null;
  private meaningfulFrame: number | null = null;
  private frames: number[] = [];
  private longTasks: number[] = [];
  private cycles: WebGLSnapshot[] = [];
  private dropped = { frames: 0, longTasks: 0, cycles: 0 };
  private idlePeriods = 0;
  private submittedFrames = 0;

  constructor(metadata: MeasurementMetadata = {}, options: MeasurementOptions = {}) {
    this.metadata = { ...metadata };
    this.limits = {
      frames: capacity(options.maxFrames, 5000),
      longTasks: capacity(options.maxLongTasks, 1000),
      cycles: capacity(options.maxCycles, 100),
    };
  }

  /** Starts a fresh run; readiness includes warmup, frame statistics exclude it. */
  start(timestamp: number, warmupMs = 0): void {
    if (!validTime(timestamp) || !validTime(warmupMs) || !Number.isFinite(timestamp + warmupMs)) {
      throw new RangeError("Invalid measurement time");
    }
    this.reset();
    this.running = true;
    this.runStart = timestamp;
    this.samplingStart = timestamp + warmupMs;
  }

  stop(): void { this.running = false; this.lastFrame = null; }

  reset(): void {
    this.running = false;
    this.active = true;
    this.runStart = null;
    this.samplingStart = 0;
    this.lastFrame = null;
    this.latestTimestamp = null;
    this.meaningfulFrame = null;
    this.frames = [];
    this.longTasks = [];
    this.cycles = [];
    this.dropped = { frames: 0, longTasks: 0, cycles: 0 };
    this.idlePeriods = 0;
    this.submittedFrames = 0;
  }

  /** Explicit task activity. Long active frames are stalls, never inferred idle time. */
  setActivity(active: boolean): void {
    if (!this.running || active === this.active) return;
    if (!active) this.idlePeriods++;
    this.active = active;
    this.lastFrame = null;
  }

  markFrame(timestamp: number): void {
    if (!this.running || this.runStart === null || !validTime(timestamp) || timestamp < this.runStart) return;
    if (this.latestTimestamp !== null && timestamp <= this.latestTimestamp) return;
    this.latestTimestamp = timestamp;
    this.submittedFrames++;
    if (!this.active || timestamp < this.samplingStart) { this.lastFrame = null; return; }
    const previous = this.lastFrame;
    this.lastFrame = timestamp;
    if (previous === null) return; // First frame after start/warmup/activity change establishes origin.
    if (this.frames.length < this.limits.frames) this.frames.push(timestamp - previous);
    else this.dropped.frames++;
  }

  markLongTask(duration: number): void {
    if (!this.running || !validTime(duration)) return;
    if (this.longTasks.length < this.limits.longTasks) this.longTasks.push(duration);
    else this.dropped.longTasks++;
  }

  markFirstMeaningfulFrame(timestamp: number): void {
    if (!this.running || this.runStart === null || !validTime(timestamp) || timestamp < this.runStart) return;
    if (this.meaningfulFrame === null) this.meaningfulFrame = timestamp - this.runStart;
  }

  recordWebGLCycle(cycleIndex: number, calls: number | null, geometries: number | null, textures: number | null): void {
    if (!this.running || !Number.isSafeInteger(cycleIndex) || cycleIndex < 0 || ![calls, geometries, textures].every(validCount)) return;
    if (this.cycles.length < this.limits.cycles) this.cycles.push({ cycleIndex, calls, geometries, textures });
    else this.dropped.cycles++;
  }

  generateReport() {
    const sorted = [...this.frames].sort((a, b) => a - b);
    // Nearest-rank quantile: ceil(p*N)-1. No interpolation or FPS inference.
    const quantile = (p: number) => sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null;
    return {
      metadata: {
        browser: null, device: null, dpr: null, quality: null, build: null,
        timestamp: null, commit: null, physicalDevice: null, ...this.metadata,
      },
      frameCount: this.frames.length,
      submittedFrames: this.submittedFrames,
      droppedFrames: this.dropped.frames,
      firstMeaningfulFrameMs: this.meaningfulFrame,
      p50FrameMs: quantile(0.5), p95FrameMs: quantile(0.95),
      longTasks: [...this.longTasks], droppedLongTasks: this.dropped.longTasks,
      idlePeriods: this.idlePeriods,
      webGLCycles: this.cycles.map(cycle => ({ ...cycle })), droppedCycles: this.dropped.cycles,
    };
  }
}
export type MeasurementReport = ReturnType<StudioMeasurementCollector["generateReport"]>;
