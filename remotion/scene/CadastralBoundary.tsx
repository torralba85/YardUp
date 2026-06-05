import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { PARCEL_D } from "../geometry";
import { LF } from "../theme";

export const CadastralBoundary: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [54, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <path
          d={PARCEL_D}
          fill="none"
          stroke={LF.sand}
          strokeWidth={5}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      </svg>
    </AbsoluteFill>
  );
};
