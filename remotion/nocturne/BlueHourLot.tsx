import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import {
  BLUE_HOUR_DURATION_IN_FRAMES,
  GEOMETRY,
  LN,
  PHASES,
} from "./constants";

const { fontFamily: monoFamily } = loadPlexMono("normal", {
  weights: ["500", "600"],
  subsets: ["latin"],
});

/** Clamped 0→1 progress across a frame range. */
function phase(frame: number, start: number, end: number, easing = Easing.bezier(0.16, 1, 0.3, 1)) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

function toPoints(
  polygon: ReadonlyArray<readonly [number, number]>,
  width: number,
  height: number,
) {
  return polygon.map(([x, y]) => `${x * width},${y * height}`).join(" ");
}

/**
 * Blue Hour survey — the landing hero composition. A dusk aerial of a real
 * lot, over which the feasibility story draws itself in survey linework:
 * parcel boundary → setback envelope → ADU cast. On the landing page the
 * timeline is scrubbed by scroll position rather than played, and the rent
 * verdict renders as real HTML pinned by the page (portrait crops would cut
 * a composition-space plate; HTML text also stays selectable and readable).
 */
export const BlueHourLot: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Camera settle: slow push-out across the full timeline.
  const settle = phase(frame, 0, BLUE_HOUR_DURATION_IN_FRAMES, Easing.linear);
  const scale = interpolate(settle, [0, 1], [1.14, 1.02]);
  // Night grade deepens as the survey progresses.
  const grade = interpolate(settle, [0, 1], [0.12, 0.44]);

  const boundary = phase(frame, PHASES.boundary.start, PHASES.boundary.end);
  const boundaryLabel = phase(frame, PHASES.boundary.end - 26, PHASES.boundary.end);
  const setbacks = phase(frame, PHASES.setbacks.start, PHASES.setbacks.end);
  const setbackLabel = phase(frame, PHASES.setbacks.end - 24, PHASES.setbacks.end);
  const cast = phase(frame, PHASES.cast.start, PHASES.cast.end);
  const castPulse = 0.55 + 0.45 * Math.sin(frame / 9) * cast;

  const parcelPoints = toPoints(GEOMETRY.parcel, width, height);
  const envelopePoints = toPoints(GEOMETRY.envelope, width, height);
  const aduPoints = toPoints(GEOMETRY.adu, width, height);
  const aduCenterX =
    (GEOMETRY.adu.reduce((sum, [x]) => sum + x, 0) / GEOMETRY.adu.length) * width;

  const chip: React.CSSProperties = {
    position: "absolute",
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 18px",
    borderRadius: 8,
    border: `1.5px solid ${LN.hairline}`,
    backgroundColor: "rgba(10, 17, 32, 0.78)",
    color: LN.slate,
    fontFamily: monoFamily,
    fontSize: 19,
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: LN.ink }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img
          src={staticFile("landing/hero-dusk.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          pauseWhenLoading
        />
      </AbsoluteFill>

      {/* Night grade + vignette */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(10,17,32,${grade * 0.9}) 0%, rgba(10,17,32,${grade * 0.4}) 40%, rgba(10,17,32,${grade}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(10,17,32,0.55) 100%)",
        }}
      />

      {/* Survey linework */}
      <AbsoluteFill>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Parcel boundary */}
          <polygon
            points={parcelPoints}
            pathLength={1}
            fill="none"
            stroke={LN.mist}
            strokeWidth={3}
            strokeDasharray={1}
            strokeDashoffset={1 - boundary}
            opacity={boundary > 0 ? 0.9 : 0}
          />
          {/* Corner ticks */}
          {GEOMETRY.parcel.map(([x, y], index) => {
            const tick = phase(
              frame,
              PHASES.boundary.start + index * 14,
              PHASES.boundary.start + index * 14 + 10,
            );
            return (
              <circle
                key={index}
                cx={x * width}
                cy={y * height}
                r={7 * tick}
                fill={LN.ink}
                stroke={LN.mist}
                strokeWidth={2.5}
                opacity={tick}
              />
            );
          })}

          {/* Setback envelope */}
          <polygon
            points={envelopePoints}
            pathLength={1}
            fill={`rgba(234, 240, 250, ${setbacks * 0.05})`}
            stroke={LN.slate}
            strokeWidth={2.5}
            strokeDasharray="0.02 0.012"
            strokeDashoffset={(1 - setbacks) * 2}
            opacity={setbacks > 0 ? setbacks : 0}
          />

          {/* ADU cast */}
          <polygon
            points={aduPoints}
            fill={`rgba(245, 181, 74, ${cast * 0.16 * castPulse})`}
            stroke={LN.glow}
            strokeWidth={3.5}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - cast}
            opacity={cast > 0 ? 1 : 0}
            style={{
              filter: cast > 0.6 ? `drop-shadow(0 0 ${18 * castPulse}px rgba(245,181,74,0.65))` : undefined,
            }}
          />
        </svg>
      </AbsoluteFill>

      {/* APN label — pinned above the street-front parcel corner */}
      <div
        style={{
          ...chip,
          left: GEOMETRY.parcel[0][0] * width - 10,
          top: GEOMETRY.parcel[0][1] * height - 66,
          opacity: boundaryLabel,
          transform: `translateY(${(1 - boundaryLabel) * 10}px)`,
        }}
      >
        <span style={{ color: LN.mist }}>Parcel</span> APN 0423-011-118 · 6,480 sq ft
      </div>

      {/* Setback label — riding the envelope's top edge, clear of the page's
          copy column on the left */}
      <div
        style={{
          ...chip,
          left:
            ((GEOMETRY.envelope[1][0] + GEOMETRY.envelope[2][0]) / 2) * width,
          top:
            ((GEOMETRY.envelope[1][1] + GEOMETRY.envelope[2][1]) / 2) * height - 24,
          opacity: setbackLabel,
          transform: `translateX(-50%) translateY(${(1 - setbackLabel) * 10}px)`,
        }}
      >
        Setbacks 20 · 5 · 25 ft
      </div>

      {/* ADU cast label — centered under the footprint, nudged left so the
          portrait crop keeps it fully on screen */}
      <div
        style={{
          ...chip,
          left: aduCenterX - 40,
          top: GEOMETRY.adu[1][1] * height + 18,
          borderColor: "rgba(245, 181, 74, 0.55)",
          color: LN.glow,
          opacity: phase(frame, PHASES.cast.start + 24, PHASES.cast.start + 40),
          transform: "translateX(-50%)",
        }}
      >
        Cast · ADU 480 sq ft
      </div>
    </AbsoluteFill>
  );
};
