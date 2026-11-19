"use client";

import { useState } from "react";
import { Move } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getSnapToFitPose } from "@/lib/scene-placement";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import type { Pose2D } from "@/lib/scene-model";

export function SnapToFitControl({ parcel, config, pose, onCommit }: {
  parcel: Parcel; config: ADUConfig; pose: Pose2D; onCommit: (pose: Pose2D) => void;
}) {
  const [outcome, setOutcome] = useState<{ key: string; message: string } | null>(null);
  const key = JSON.stringify([parcel, config, pose]);
  return <div className="px-4 py-2">
    <Button variant="secondary" size="sm" onClick={() => {
      const next = getSnapToFitPose(parcel, config, pose);
      if (next) onCommit(next);
      setOutcome({ key: JSON.stringify([parcel, config, next ?? pose]), message: next
        ? "Placed within the modeled setbacks and clear of the estimated house. Confirm site measurements."
        : "No fit found in this search. Try a smaller footprint or review the site measurements." });
    }}><Move size={16} aria-hidden="true" /> Snap to fit</Button>
    {outcome?.key === key && <p role="status" className="mt-2 text-xs leading-5 text-lot-stone">{outcome.message}</p>}
  </div>;
}
