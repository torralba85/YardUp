"use client";

// Gemini T08 adapter, corrected in integration review. Parent owns start/stop.
import { useEffect, useRef } from "react";
import { useThree, addAfterEffect } from "@react-three/fiber";
import type { StudioMeasurementCollector } from "@/lib/studio-measurement";

export interface StudioMeasurementAdapterProps {
  collector: StudioMeasurementCollector;
  runId: string | number;
  cycleIndex?: number;
  enabled?: boolean;
  active?: boolean;
}

export function StudioMeasurementAdapter({
  collector, runId, cycleIndex, enabled = false, active = true,
}: StudioMeasurementAdapterProps) {
  const { gl } = useThree();
  const latestCycleIndex = useRef(cycleIndex);
  useEffect(() => { latestCycleIndex.current = cycleIndex; }, [cycleIndex]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PROFILE_STUDIO !== "true" || !enabled) return;
    let observer: PerformanceObserver | null = null;
    let disposed = false;
    try {
      if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
        const start = performance.now();
        observer = new PerformanceObserver((list) => {
          if (disposed) return;
          for (const entry of list.getEntries()) {
            if (entry.startTime >= start) collector.markLongTask(entry.duration);
          }
        });
        observer.observe({ type: "longtask", buffered: false });
      }
    } catch { observer?.disconnect(); }
    return () => { disposed = true; observer?.disconnect(); };
  }, [collector, runId, enabled]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PROFILE_STUDIO !== "true" || !enabled) return;
    const update = () => collector.setActivity(active && document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [collector, active, runId, enabled]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PROFILE_STUDIO !== "true" || !enabled) return;
    // Global R3F after-effects also run for other Canvas roots. Count only ours.
    let lastFrame = gl.info.render.frame;
    let lastCycle: number | undefined;
    return addAfterEffect(() => {
      if (gl.info.render.frame === lastFrame) return;
      lastFrame = gl.info.render.frame;
      const now = performance.now();
      collector.markFrame(now);
      // CPU render submission proxy, not GPU completion or controls-ready proof.
      collector.markFirstMeaningfulFrame(now);
      const cycle = latestCycleIndex.current;
      if (cycle !== undefined && cycle !== lastCycle) {
        collector.recordWebGLCycle(cycle, gl.info.render.calls, gl.info.memory.geometries, gl.info.memory.textures);
        lastCycle = cycle;
      }
    });
  }, [collector, runId, gl, enabled]);
  return null;
}
