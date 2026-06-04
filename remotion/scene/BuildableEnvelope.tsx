import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ENVELOPE_D } from "../geometry";
import { LF } from "../theme";

export const BuildableEnvelope: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [90, 112], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ opacity: reveal }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <path
          d={ENVELOPE_D}
          fill="rgba(47,74,56,0.12)"
          stroke={LF.forest}
          strokeWidth={4}
          strokeDasharray="14 12"
          strokeLinejoin="round"
        />
      </svg>
    </AbsoluteFill>
  );
};
