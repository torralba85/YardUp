"use client";

// Gemini T08 harness with review corrections for metadata, exports, and lifecycle.
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { parcelPresets, defaultAduConfig, type RoofStyle } from "@/lib/feasibility";
import { StudioMeasurementCollector } from "@/lib/studio-measurement";

const ParcelScene = dynamic(() => import("@/components/ParcelScene"), { ssr: false });
const roofs: RoofStyle[] = ["shed", "gable", "flat"];
const control = "min-h-11 rounded-none border border-lf-clay px-4 py-2 text-lf-clay-ink disabled:opacity-50";

export default function StudioProfile() {
  const [run, setRun] = useState<{ collector: StudioMeasurementCollector; id: number; started: number; thermal: string; device: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(true);
  const [cycle, setCycle] = useState(0);
  const [remount, setRemount] = useState(0);
  const [device, setDevice] = useState("");
  const [thermal, setThermal] = useState("unknown");
  const [report, setReport] = useState("");
  useEffect(() => () => run?.collector.stop(), [run]);

  function start() {
    run?.collector.stop();
    const collector = new StudioMeasurementCollector({
      browser: navigator.userAgent, device: device || null, dpr: window.devicePixelRatio,
      quality: "baseline: DPR [1,1.8], shadows 2048", build: process.env.NODE_ENV === "production" ? "production" : "development",
      timestamp: Date.now(), physicalDevice: null,
    });
    const started = performance.now();
    collector.start(started, 500);
    setRun({ collector, id: (run?.id ?? 0) + 1, started, thermal, device });
    setCycle(0); setActive(true); setReport(""); setRunning(true);
  }

  function snapshot(stop = false) {
    if (!run) return;
    if (stop) { run.collector.stop(); setRunning(false); }
    const canvas = document.querySelector<HTMLCanvasElement>("[data-profile-scene] canvas");
    // Reuse the scene's context; do not create an additional GPU context.
    const context = canvas?.getContext("webgl2");
    const debug = context?.getExtension("WEBGL_debug_renderer_info");
    const text = JSON.stringify({
      ...run.collector.generateReport(), elapsedMs: performance.now() - run.started,
      workload: "Direct scene harness; first render is CPU submission proxy, not full Shape readiness",
      fixture: "Seattle demo", viewport: { width: window.innerWidth, height: window.innerHeight },
      actualRendererDpr: canvas?.clientWidth ? canvas.width / canvas.clientWidth : null,
      renderer: context && debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
      thermalState: run.thermal, cycle, sceneRemounts: remount,
    }, null, 2);
    setReport(text);
    return text;
  }

  function exportReport() {
    const text = snapshot(true);
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "studio-profile.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const width = cycle === 0 ? defaultAduConfig.width : 20 + cycle % 5 * 2;
  const length = cycle === 0 ? defaultAduConfig.length : 20 + cycle % 4 * 3;
  const config = { ...defaultAduConfig, width, length, footprint: width * length, roof: cycle === 0 ? defaultAduConfig.roof : roofs[cycle % 3] };
  const parcel = parcelPresets[0];
  const remainingCapacity = parcel.lotArea * parcel.maxLotCoveragePercent / 100 - parcel.existingHouseSqft - config.footprint;

  return (
    <main className="min-h-screen space-y-4 bg-lf-sand p-4 font-sans text-lf-espresso">
      <h1 className="font-display text-2xl">Local Studio profiling</h1>
      <p className="text-sm text-lf-muted">Direct scene workload. First render measures CPU submission; full Shape readiness and GPU completion remain separate. Idle samples exclude timing intervals but retain submitted frame counts.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label>Device description<input className="block min-h-11 rounded-[3px] border border-lf-hairline bg-lf-card px-3" value={device} onChange={event => setDevice(event.target.value)} disabled={running} /></label>
        <label>Thermal state<input className="block min-h-11 rounded-[3px] border border-lf-hairline bg-lf-card px-3" value={thermal} onChange={event => setThermal(event.target.value)} disabled={running} /></label>
        <button className={control} onClick={start} disabled={running}>Start run</button>
        <button className={control} onClick={() => snapshot()} disabled={!run}>Snapshot</button>
        <button className={control} onClick={exportReport} disabled={!run}>Stop and export JSON</button>
        <label>Sampling<select className={control} value={active ? "active" : "idle"} onChange={event => setActive(event.target.value === "active")} disabled={!running}><option value="active">Active</option><option value="idle">Idle</option></select></label>
        <button className={control} onClick={() => setCycle(value => value + 1)} disabled={!running || cycle >= 20}>Next edit cycle ({cycle}/20)</button>
        <button className={control} onClick={() => setRemount(value => value + 1)} disabled={!running}>Remount scene</button>
      </div>
      <div data-profile-scene className="relative h-[70vh] min-h-80 overflow-hidden border border-lf-hairline">
        {run && <ParcelScene key={`${run.id}-${remount}`} parcel={parcel} config={config} isCompliant={remainingCapacity >= 0} remainingCapacity={remainingCapacity} measurement={{ collector: run.collector, runId: run.id, cycleIndex: cycle, enabled: running, active }} />}
      </div>
      <pre aria-label="Measurement report" className="overflow-auto rounded-none bg-lf-card p-4 text-xs">{report || "No snapshot yet."}</pre>
    </main>
  );
}
