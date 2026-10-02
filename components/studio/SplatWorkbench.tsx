"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createSplatDepthFixture, DEFAULT_SPLAT_TRANSFORM, validateLocalSplat, type SplatSource, type SplatTransform } from "@/lib/splat-scene";
import type { SplatLayerStatus } from "./GaussianSplatLayer";

const SplatWorkbenchScene = dynamic(() => import("./SplatWorkbenchScene"), { ssr: false });
const control = "min-h-11 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 text-base text-lot-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-orange-ink";

export default function SplatWorkbench() {
  const [source, setSource] = useState<SplatSource>(createSplatDepthFixture);
  const [transform, setTransform] = useState<SplatTransform>(DEFAULT_SPLAT_TRANSFORM);
  const [status, setStatus] = useState<SplatLayerStatus>({ state: "loading" });
  const [visible, setVisible] = useState(true);
  const [orthographic, setOrthographic] = useState(false);
  const [aduZ, setAduZ] = useState(28);
  const [generation, setGeneration] = useState(0);
  const [fileError, setFileError] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const [showCalibration, setShowCalibration] = useState(false);
  const calibrationJson = JSON.stringify({ source: source.fileName, provenance: "visual-only", sourceNormalization: source.normalizeForInspection ? { method: "center-xz-ground-y-fit-longest-axis", targetExtentFt: 30, bounds: "Spark SplatMesh.getBoundingBox", sourceScale: "unknown" } : { method: "none", sourceUnits: "feet" }, transform }, null, 2);
  const readGeneration = useRef(0);
  const sampleDiagnostics = useRef<(() => string) | null>(null);
  const onStatus = useCallback((next: SplatLayerStatus) => setStatus(next), []);
  useEffect(() => () => { readGeneration.current++; }, []);

  async function openFile(file: File) {
    const request = ++readGeneration.current;
    const error = validateLocalSplat(file);
    setFileError(error ?? "");
    if (error) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (request !== readGeneration.current) return;
      setSource({ fileName: file.name, bytes, normalizeForInspection: true });
      setTransform(DEFAULT_SPLAT_TRANSFORM);
      setStatus({ state: "loading" });
      setVisible(true);
    } catch {
      if (request === readGeneration.current) setFileError("Could not read this local file.");
    }
  }

  function fixture() {
    readGeneration.current++;
    setSource(createSplatDepthFixture());
    setTransform(DEFAULT_SPLAT_TRANSFORM);
    setStatus({ state: "loading" });
    setFileError("");
    setVisible(true);
  }

  return (
    <main id="main-content" className="min-h-screen bg-lot-chalk p-4 text-lot-ink md:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-lot-stone">Internal beta · visual registration</p>
          <h1 className="font-display text-3xl">3D scan workbench</h1>
          <p className="mt-2 max-w-2xl text-sm">Inspect a scan beside our dimensioned ADU. This sample has no property match. Calibration changes only the scan.</p>
        </div>
        <Link href="/studio" prefetch={false} className="inline-flex min-h-11 items-center underline">Open Studio</Link>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Scan rendering workbench" className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setVisible(!visible)}>{visible ? "Hide scan" : "Show scan"}</Button>
            <Button variant="secondary" onClick={() => { setStatus({ state: "loading" }); setGeneration(generation + 1); setVisible(true); }}>Reload scan</Button>
            <Button variant="secondary" aria-pressed={orthographic} onClick={() => setOrthographic(!orthographic)}>{orthographic ? "Perspective camera" : "Orthographic camera"}</Button>
          </div>
          <div className="h-[55vh] min-h-80 overflow-hidden border border-lot-line lg:h-[65vh]">
            <SplatWorkbenchScene source={source} transform={transform} visible={visible} generation={generation}
              orthographic={orthographic} aduZ={aduZ} onStatus={onStatus} sampleDiagnostics={sampleDiagnostics} />
          </div>
          <p role="status" className="mt-3 text-sm">
            {!visible ? "Scan hidden. ADU stays in place." : status.state === "ready"
              ? `Decoded ${status.splats.toLocaleString()} splats in ${Math.round(status.loadMs)} ms. Orbit to inspect depth.`
              : status.state === "error" ? `Scan unavailable: ${status.message}` : "Loading scan…"}
          </p>
          <p className="mt-1 break-all text-sm text-lot-stone">{source.fileName} · {source.bytes ? (source.bytes.length / 1048576).toFixed(2) : "0.00"} MiB · {source.normalizeForInspection ? "Scaled to 30 ft for inspection; source scale unknown." : "Synthetic blue wall, 44 × 18 ft; depth test only."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAduZ(28)}>ADU in front</Button>
            <Button variant="secondary" onClick={() => setAduZ(-28)}>ADU behind</Button>
            <Button variant="secondary" onClick={() => setDiagnostics(sampleDiagnostics.current?.() ?? "Scene not ready.")}>Refresh diagnostics</Button>
          </div>
          <p className="mt-2 text-sm">ADU center Z: {aduZ} ft. For the fixture, the blue splat wall should obscure the ADU behind it.</p>
          {diagnostics && <pre aria-label="Rendering diagnostics" className="mt-3 overflow-auto border border-lot-line p-3 text-xs">{diagnostics}</pre>}
        </section>
        <aside aria-label="Scan calibration" className="space-y-5">
          <div>
            <label htmlFor="local-scan" className="mb-2 block font-medium">Open local scan</label>
            <input id="local-scan" type="file" accept=".spz,.splat,.ply,.ksplat" className="min-h-11 w-full text-sm" onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void openFile(file);
              event.currentTarget.value = "";
            }} />
            <p className="mt-2 text-sm text-lot-stone">Stays in this browser. Up to 32 MiB and 100,000 splats; no upload or saved property data.</p>
            {fileError && <p role="alert" className="mt-2 text-sm">{fileError}</p>}
            <Button variant="secondary" className="mt-3" onClick={fixture}>Use depth fixture</Button>
          </div>
          <h2 className="font-display text-xl">Visual calibration</h2>
          <label className="block text-sm">Uniform scale
            <input aria-label="Uniform scale" className={control} type="number" min="0.01" max="100" step="0.05" value={transform.uniformScale} onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value) && value >= 0.01 && value <= 100) setTransform({ ...transform, uniformScale: value });
            }} />
          </label>
          <label className="block text-sm">Yaw (degrees)
            <input aria-label="Yaw (degrees)" className={control} type="number" min="-180" max="180" step="1" value={Math.round(transform.yawRad * 180 / Math.PI)} onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value) && Math.abs(value) <= 180) setTransform({ ...transform, yawRad: value * Math.PI / 180 });
            }} />
          </label>
          {(["X", "Y", "Z"] as const).map((axis, index) => (
            <label key={axis} className="block text-sm">{axis} offset (ft)
              <input aria-label={`${axis} offset (ft)`} className={control} type="number" min="-200" max="200" step="0.5" value={transform.positionFt[index]} onChange={(event) => {
                const value = event.currentTarget.valueAsNumber;
                if (!Number.isFinite(value) || Math.abs(value) > 200) return;
                const positionFt: [number, number, number] = [...transform.positionFt];
                positionFt[index] = value;
                setTransform({ ...transform, positionFt });
              }} />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setTransform(DEFAULT_SPLAT_TRANSFORM)}>Reset calibration</Button>
            <Button onClick={() => setShowCalibration(true)}>Export calibration</Button>
          </div>
          {showCalibration && <label className="block text-sm">Calibration JSON<textarea aria-label="Calibration JSON" readOnly className={`${control} mt-2 h-52`} value={calibrationJson} /></label>}
        </aside>
      </div>
    </main>
  );
}
