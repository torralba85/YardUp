"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { type SplatSceneDefinition, type SplatTransform } from "@/lib/splat-scene";
import { Copy, Check, RotateCcw, X, Eye, EyeOff } from "lucide-react";

export interface SplatCalibrationPanelProps {
  scene: SplatSceneDefinition;
  transform: SplatTransform;
  onChangeTransform: (next: SplatTransform) => void;
  onResetTransform: () => void;
  splatOnly?: boolean;
  onToggleSplatOnly?: (splatOnly: boolean) => void;
  onClose?: () => void;
}

const inputControl =
  "min-h-11 w-full rounded-control border border-lot-stone bg-lot-chalk px-3 text-base text-lot-ink tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lot-orange-ink";

export default function SplatCalibrationPanel({
  scene,
  transform,
  onChangeTransform,
  onResetTransform,
  splatOnly = false,
  onToggleSplatOnly,
  onClose,
}: SplatCalibrationPanelProps) {
  const [copied, setCopied] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    closeButton.current?.focus();
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);
  const [showJson, setShowJson] = useState(false);

  const calibrationData = {
    id: scene.id,
    parcelId: scene.parcelId,
    provenance: scene.registration ?? "visual-calibration-not-surveyed",
    sourceNormalization: scene.registration === "unmatched-sample" ? "fit-longest-axis-to-30-feet-source-scale-unknown" : "none",
    transform: {
      positionFt: transform.positionFt,
      yawRad: Number(transform.yawRad.toFixed(4)),
      uniformScale: Number(transform.uniformScale.toFixed(4)),
    },
  };

  const jsonString = JSON.stringify(calibrationData, null, 2);

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowJson(true);
    }
  }

  const yawDeg = Math.round((transform.yawRad * 180) / Math.PI);

  return (
    <aside
      aria-label="3DGS Visual Calibration"
      onKeyDown={(event) => { if (event.key === "Escape" && onClose) { event.stopPropagation(); onClose(); } }}
      className="flex flex-col border border-lot-line bg-lot-chalk text-lot-ink w-full pb-[env(safe-area-inset-bottom)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-lot-line px-4 py-3">
        <div>
          <span className="inline-block bg-lot-ink px-1.5 py-0.5 text-[10px] tabular-nums uppercase tracking-[0.08em] text-lot-chalk">
            BETA · INTERNAL
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight text-lot-ink">
            Scan Calibration
          </h2>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClose}
            aria-label="Close calibration panel"
            ref={closeButton}
            className="h-11 w-11 shrink-0 p-0 text-lot-stone hover:text-lot-ink"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Survey Invariant Notice */}
      <div className="border-b border-lot-line bg-lot-surface px-4 py-2.5 text-xs text-lot-stone">
        <p className="font-medium text-lot-ink">VISUAL CALIBRATION — NOT SURVEYED</p>
        <p className="mt-0.5 leading-relaxed">
          Moves only the scan. Parcel bounds, setbacks, and feasibility still use the estimated model.
        </p>
      </div>

      {/* Controls List */}
      <div className="space-y-4 p-4 text-sm">
        {/* Uniform Scale */}
        <label className="block">
          <div className="mb-1 flex justify-between text-xs font-medium">
            <span>Uniform Scale</span>
            <span className="tabular-nums text-lot-stone">{transform.uniformScale.toFixed(2)}×</span>
          </div>
          <input
            type="number"
            min="0.01"
            max="100"
            step="0.05"
            aria-label="Uniform scale"
            value={transform.uniformScale}
            onChange={(e) => {
              const val = e.currentTarget.valueAsNumber;
              if (Number.isFinite(val) && val >= 0.01 && val <= 100) {
                onChangeTransform({ ...transform, uniformScale: val });
              }
            }}
            className={inputControl}
          />
        </label>

        {/* Yaw (Orientation) */}
        <label className="block">
          <div className="mb-1 flex justify-between text-xs font-medium">
            <span>Yaw Rotation</span>
            <span className="tabular-nums text-lot-stone">{yawDeg}°</span>
          </div>
          <input
            type="number"
            min="-180"
            max="180"
            step="1"
            aria-label="Yaw rotation in degrees"
            value={yawDeg}
            onChange={(e) => {
              const val = e.currentTarget.valueAsNumber;
              if (Number.isFinite(val) && Math.abs(val) <= 180) {
                onChangeTransform({
                  ...transform,
                  yawRad: (val * Math.PI) / 180,
                });
              }
            }}
            className={inputControl}
          />
        </label>

        {/* X, Y, Z Offsets */}
        <div className="grid grid-cols-3 gap-2">
          {(["X", "Y", "Z"] as const).map((axis, i) => (
            <label key={axis} className="block">
              <span className="mb-1 block text-xs font-medium">{axis} (ft)</span>
              <input
                type="number"
                step="0.5"
                min="-200"
                max="200"
                aria-label={`${axis} offset in feet`}
                value={transform.positionFt[i]}
                onChange={(e) => {
                  const val = e.currentTarget.valueAsNumber;
                  if (Number.isFinite(val) && Math.abs(val) <= 200) {
                    const nextPos: [number, number, number] = [...transform.positionFt];
                    nextPos[i] = val;
                    onChangeTransform({ ...transform, positionFt: nextPos });
                  }
                }}
                className={inputControl}
              />
            </label>
          ))}
        </div>

        {/* Splat-only Toggle */}
        {onToggleSplatOnly && (
          <div className="pt-1">
            <Button
              type="button"
              variant={splatOnly ? "selected" : "secondary"}
              size="sm"
              fullWidth
              aria-pressed={splatOnly}
              onClick={() => onToggleSplatOnly(!splatOnly)}
              leftIcon={splatOnly ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            >
              {splatOnly ? "Exit Splat-Only Mode" : "Splat-Only Inspection"}
            </Button>
          </div>
        )}

        {/* Actions: Reset & Export */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onResetTransform}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="commit"
            size="sm"
            onClick={handleCopyJson}
            leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            className="flex-1"
          >
            {copied ? "Copied!" : "Export JSON"}
          </Button>
        </div>

        <p role="status" className="sr-only">{copied ? "Calibration copied to clipboard." : showJson ? "Clipboard unavailable. Select and copy the calibration below." : ""}</p>

        {/* JSON Display toggle fallback */}
        {showJson && (
          <div className="pt-2">
            <label className="block text-xs font-medium text-lot-stone">
              Exported Registration JSON:
              <textarea
                readOnly
                value={jsonString}
                aria-label="Calibration JSON export"
                className="mt-1 h-32 w-full rounded-control border border-lot-stone bg-lot-surface p-2 tabular-nums text-base text-lot-ink"
              />
            </label>
          </div>
        )}
      </div>
    </aside>
  );
}
