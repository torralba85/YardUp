import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PIN } from "../geometry";
import { LF } from "../theme";

export const Pin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: frame - 24, fps, config: { damping: 12, stiffness: 130 } });
  const ty = interpolate(drop, [0, 1], [-260, 0]);
  const opacity = interpolate(frame, [24, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(frame, [50, 62], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <ellipse cx={PIN.x} cy={PIN.y + 6} rx={58} ry={16} fill={LF.sand} opacity={glow} />
        <g transform={`translate(${PIN.x} ${PIN.y}) translate(0 ${ty})`}>
          <path
            d="M0 0 C-26 0 -44 -20 -44 -44 C-44 -74 0 -104 0 -104 C0 -104 44 -74 44 -44 C44 -20 26 0 0 0 Z"
            fill="#ffffff"
            style={{ filter: "drop-shadow(0 8px 12px rgba(38,19,7,0.4))" }}
          />
          <circle cx={0} cy={-52} r={18} fill="none" stroke={LF.forest} strokeWidth={8} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
