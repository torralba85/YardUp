import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const AerialBase: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const intro = interpolate(frame, [0, 24], [1.08, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const drift = interpolate(frame, [0, durationInFrames], [0, -26]);
  const fade = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{ transform: `scale(${intro}) translateX(${drift}px)`, transformOrigin: "center" }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9c3a8" />
            <stop offset="0.42" stopColor="#9fae9b" />
            <stop offset="1" stopColor="#4f6b4f" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#sky)" />
        <path d="M0 470 Q480 410 980 460 T1920 440 V1080 H0 Z" fill="#6f8c5f" />
        <path d="M0 600 Q620 540 1100 600 T1920 575 V1080 H0 Z" fill="#c9b27e" opacity="0.85" />
        <path d="M-40 760 Q560 690 1040 770 T1960 720 V1120 H-40 Z" fill="#3f5a3c" />
        <path d="M-40 930 Q700 870 1160 940 T1980 900 V1140 H-40 Z" fill="#2f4632" opacity="0.9" />
      </svg>
    </AbsoluteFill>
  );
};
