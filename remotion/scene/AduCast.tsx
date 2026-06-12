import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ADU, ADU2 } from "../geometry";
import { LF } from "../theme";

export const AduCast: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - 100, fps, config: { damping: 14, stiffness: 110 } });
  const ty = interpolate(rise, [0, 1], [44, 0]);
  const opacity = interpolate(frame, [100, 114], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <g transform={`translate(0 ${ty})`}>
          <rect
            x={ADU.x}
            y={ADU.y}
            width={ADU.w}
            height={ADU.h}
            rx={8}
            fill={LF.forest}
            style={{ filter: "drop-shadow(0 14px 18px rgba(38,19,7,0.35))" }}
          />
          <rect x={ADU2.x} y={ADU2.y} width={ADU2.w} height={ADU2.h} rx={8} fill={LF.forest} opacity={0.92} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
