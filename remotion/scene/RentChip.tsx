import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Outfit";
import { RENT } from "../geometry";
import { LF } from "../theme";

const { fontFamily } = loadFont();

export const RentChip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 126, fps, config: { damping: 16, stiffness: 120 } });
  const ty = interpolate(enter, [0, 1], [24, 0]);
  const opacity = interpolate(frame, [126, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const count = Math.round(
    interpolate(frame, [126, 162], [0, RENT.value], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );
  const label = `$${count.toLocaleString("en-US")}/mo`;

  return (
    <AbsoluteFill style={{ opacity }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        <g transform={`translate(0 ${ty})`}>
          <rect x={RENT.x} y={RENT.y} width={RENT.w} height={RENT.h} rx={26} fill={LF.espresso} opacity={0.94} />
          <text
            x={RENT.x + 30}
            y={RENT.y + 46}
            fill={LF.sand}
            fontFamily="monospace"
            fontSize={22}
            fontWeight={700}
            letterSpacing={3}
          >
            EST. RENT
          </text>
          <text
            x={RENT.x + 30}
            y={RENT.y + 104}
            fill={LF.sand}
            fontFamily={fontFamily}
            fontSize={64}
            fontWeight={900}
          >
            {label}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
