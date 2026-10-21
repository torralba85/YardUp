import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CAPTIONS, FPS, fonts, PALETTE } from "../constants";

interface CaptionsProps {
  sceneId: string;
}

export const Captions: React.FC<CaptionsProps> = ({ sceneId }) => {
  const frame = useCurrentFrame();
  const currentSec = frame / FPS;

  const segments = CAPTIONS[sceneId] || [];
  const activeSegment = segments.find(
    (seg) => currentSec >= seg.startSec && currentSec < seg.endSec,
  );

  if (!activeSegment) return null;

  // Gentle micro-fade on subtitle change
  const timeIntoSegment = currentSec - activeSegment.startSec;
  const timeUntilEnd = activeSegment.endSec - currentSec;
  const opacity = Math.min(
    interpolate(timeIntoSegment, [0, 0.15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(timeUntilEnd, [0, 0.15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 84,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 50,
        paddingLeft: "10%",
        paddingRight: "10%", // Guarantees inside central 80% safe zone
      }}
    >
      <div
        style={{
          opacity,
          backgroundColor: "rgba(22, 22, 22, 0.94)",
          border: `1px solid rgba(245, 245, 240, 0.22)`,
          borderRadius: 4,
          padding: "12px 28px",
          maxWidth: 1300,
          boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
          textAlign: "center",
          backdropFilter: "blur(6px)",
        }}
      >
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 32,
            fontWeight: 600,
            lineHeight: 1.35,
            color: PALETTE.chalk,
            letterSpacing: "-0.01em",
          }}
        >
          {activeSegment.text}
        </span>
      </div>
    </div>
  );
};
