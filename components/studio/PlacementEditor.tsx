"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { NumericField } from "./NumericField";
import type { Pose2D } from "@/lib/scene-model";
import { buildAduHeightModel } from "@/lib/scene-model";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { snapPoseToSetbackEnvelope } from "@/lib/scene-placement";

export function PlacementEditor({
  parcel,
  config,
  pose,
  onChange,
}: {
  parcel: Parcel;
  config: ADUConfig;
  pose: Pose2D;
  onChange(pose: Pose2D): void;
}) {
  const total = buildAduHeightModel(config)?.totalHeight;
  const [snapEnabled, setSnapEnabled] = useState(false);

  // Optional magnetic snap also catches drag commits, because this editor sees
  // the shared committed pose after the R3F gesture completes.
  useEffect(() => {
    if (!snapEnabled) return;
    const snapped = snapPoseToSetbackEnvelope(parcel, config, pose, 0.5);
    if (snapped && (snapped.x !== pose.x || snapped.z !== pose.z)) onChange(snapped);
  }, [config, onChange, parcel, pose, snapEnabled]);

  function commit(next: Pose2D) {
    if (!snapEnabled) {
      onChange(next);
      return;
    }
    onChange(snapPoseToSetbackEnvelope(parcel, config, next, 0.5) ?? next);
  }

  return (
    <details className="border-t border-lot-line bg-lot-chalk px-3">
      <summary className="flex min-h-11 cursor-pointer items-center rounded-control text-sm font-semibold text-lot-ink motion-safe:transition-colors hover:text-lot-orange-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lot-orange-ink focus-visible:ring-offset-2 focus-visible:ring-offset-lot-chalk">
        Move or rotate ADU
      </summary>
      <p className="mb-3 text-xs text-lot-stone">
        Selected: {config.width} × {config.length} ft ADU · {config.height} ft walls{total != null ? ` · ${total.toFixed(1)} ft total height` : ""}. Position uses modeled lot coordinates; +Z is the front.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <NumericField label="X position (ft)" name="adu-x-position" value={pose.x} min={-10000} max={10000} onChange={(x) => commit({ ...pose, x })} />
        <NumericField label="Z position (ft)" name="adu-z-position" value={pose.z} min={-10000} max={10000} onChange={(z) => commit({ ...pose, z })} />
        <NumericField label="Rotation (degrees)" name="adu-rotation" value={pose.rotationDeg} min={0} max={359.9} step={1} onChange={(rotationDeg) => commit({ ...pose, rotationDeg })} />
      </div>
      <div role="group" aria-label="Nudge ADU one foot" className="my-3 flex flex-wrap gap-1">
        {[
          { label: "Left 1 ft", x: -1, z: 0 },
          { label: "Right 1 ft", x: 1, z: 0 },
          { label: "Rear 1 ft", x: 0, z: -1 },
          { label: "Front 1 ft", x: 0, z: 1 },
        ].map((move) => (
          <Button
            key={move.label}
            variant="secondary"
            size="sm"
            className="min-h-11"
            onClick={() => commit({ ...pose, x: pose.x + move.x, z: pose.z + move.z })}
          >
            {move.label}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11"
          onClick={() => commit({ ...pose, rotationDeg: (pose.rotationDeg + 90) % 360 })}
        >
          Rotate 90°
        </Button>
        <Button
          variant={snapEnabled ? "selected" : "secondary"}
          size="sm"
          className="min-h-11"
          aria-pressed={snapEnabled}
          onClick={() => setSnapEnabled((enabled) => !enabled)}
        >
          Magnetic snap {snapEnabled ? "on" : "off"}
        </Button>
      </div>
      <p className="mb-3 text-[11px] leading-4 text-lot-stone">
        Magnetic snap moves a placement back to the modeled legal boundary when it crosses by 0.5 ft or less. Larger conflicts stay visible for review.
      </p>
    </details>
  );
}
