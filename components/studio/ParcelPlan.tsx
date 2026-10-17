import { useId } from "react";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { finishColors } from "@/lib/feasibility";
import { buildSceneModel, type Pose2D } from "@/lib/scene-model";
import { getScenePlacement } from "@/lib/site-fit";
import { buildSetbackEnvelope, describePlacementWithEvidence } from "@/lib/placement-validation";

/**
 * The 2D concept plan, drawn from the same scene model the 3D view renders.
 *
 * The audit found three surfaces disagreeing about the same lot: the 3D scene,
 * the WebGL fallback, and the aerial overlay each derived their own house size
 * and ADU position (D3). This component draws only what `buildSceneModel`
 * reports — including the committed pose and rotation — so the fallback can no
 * longer show a different building from the one the user placed.
 *
 * An unknown footprint draws nothing rather than a guessed rectangle.
 */
export function ParcelPlan({
  parcel,
  config,
  pose,
}: {
  parcel: Parcel;
  config: ADUConfig;
  pose: Pose2D;
}) {
  const model = buildSceneModel(parcel, config, pose);
  const grid = useId();
  const envelope = buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, parcel.setbacks);
  const placement = getScenePlacement(parcel, config, pose);
  const points = (corners: { x: number; z: number }[] | null) =>
    corners?.map((p) => `${p.x},${p.z}`).join(" ");
  const color =
    placement.status === "fits" ? "#176B4C" : placement.status === "blocked" ? "#A82D16" : "#8A5300";
  const placementFeedback = describePlacementWithEvidence(placement, parcel);
  return (
    <svg
      role="img"
      aria-label={`2D concept plan. ADU ${config.width} by ${config.length} feet, rotated ${pose.rotationDeg} degrees. ${placementFeedback.title}.`}
      viewBox={`${-parcel.lotWidth / 2 - 12} ${-parcel.lotLength / 2 - 12} ${parcel.lotWidth + 24} ${parcel.lotLength + 24}`}
      className="h-full w-full bg-[#F5F5F0]"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id={grid} width={5} height={5} patternUnits="userSpaceOnUse">
          <path d="M5 0 H0 V5" fill="none" stroke="#161616" strokeOpacity={0.08} strokeWidth={0.2} />
        </pattern>
      </defs>
      <rect
        x={-parcel.lotWidth / 2}
        y={-parcel.lotLength / 2}
        width={parcel.lotWidth}
        height={parcel.lotLength}
        fill={`url(#${grid})`}
        stroke="#161616"
        strokeWidth={0.5}
      />
      {envelope && envelope.length > 0 && (
        <polygon
          points={points(envelope)}
          fill="none"
          stroke="#65655F"
          strokeWidth={0.4}
          strokeDasharray="2 1"
        />
      )}
      {model.existingHouse.corners && (
        <polygon
          data-testid="plan-existing-house"
          points={points(model.existingHouse.corners)}
          fill="#EBEBE6"
          stroke="#161616"
          strokeWidth={0.5}
        />
      )}
      {model.adu.footprintCorners && (
        <polygon
          data-testid="plan-adu"
          points={points(model.adu.footprintCorners)}
          fill={finishColors[config.finish]}
          stroke={color}
          strokeWidth={0.8}
        />
      )}
      <text x={0} y={parcel.lotLength / 2 + 7} fontSize={3} textAnchor="middle" fill="#161616" fontFamily="var(--font-lot-body, sans-serif)" fontWeight="bold">
        FRONT · {parcel.lotWidth} ft
      </text>
    </svg>
  );
}
