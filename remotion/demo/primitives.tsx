import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DEMO_PALETTE } from "./constants";
import { fonts } from "./fonts";

export const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/** Settle-and-stamp enter: no bounce (DESIGN motion law). */
export function useStamp(delayFrames = 0, distance = 28) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delayFrames,
    fps,
    config: { damping: 200, stiffness: 140, mass: 0.85 },
  });
  const opacity = interpolate(frame - delayFrames, [0, 8], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [distance, 0]);
  const scale = interpolate(progress, [0, 1], [0.97, 1]);
  return { opacity, y, scale, progress };
}

export function useFade(inEnd = 14, outLen = 14) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, inEnd], [0, 1], clamp);
  const fadeOut = interpolate(
    frame,
    [durationInFrames - outLen, durationInFrames],
    [1, 0],
    clamp,
  );
  return Math.min(fadeIn, fadeOut);
}

/** Continuous slow drift for ambient motion (seek-safe via frame). */
export function useDrift(speed = 0.35, amplitude = 12) {
  const frame = useCurrentFrame();
  const x = Math.sin(frame * speed * 0.04) * amplitude;
  const y = Math.cos(frame * speed * 0.03) * (amplitude * 0.55);
  return { x, y };
}

export const SceneShell: React.FC<{
  children: React.ReactNode;
  background?: string;
  /** Disable push-in zoom (use for centered brand/poster locks). */
  steady?: boolean;
}> = ({ children, background = DEMO_PALETTE.ink, steady = false }) => {
  const opacity = useFade(12, 16);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Subtle overall push-in across the scene (off for steady brand frames)
  const zoom = steady
    ? 1
    : interpolate(frame, [0, durationInFrames], [1, 1.035], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: background, opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "50% 50%",
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Kicker: React.FC<{
  children: React.ReactNode;
  color?: string;
  delay?: number;
}> = ({ children, color = DEMO_PALETTE.glow, delay = 0 }) => {
  const { opacity, y, scale } = useStamp(delay, 16);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 28,
          height: 1,
          backgroundColor: color,
          opacity: 0.8,
        }}
      />
      <p
        style={{
          margin: 0,
          fontFamily: fonts.mono,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color,
        }}
      >
        {children}
      </p>
    </div>
  );
};

/** Word-by-word cascade for display headlines. */
export const WordCascade: React.FC<{
  words: ReadonlyArray<{ text: string; glow?: boolean; italic?: boolean }>;
  delay?: number;
  stagger?: number;
  size?: number;
  color?: string;
  maxWidth?: number;
}> = ({
  words,
  delay = 0,
  stagger = 4,
  size = 78,
  color = DEMO_PALETTE.mist,
  maxWidth = 1200,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <h2
      style={{
        margin: 0,
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 500,
        lineHeight: 1.05,
        letterSpacing: "-0.03em",
        color,
        maxWidth,
        display: "flex",
        flexWrap: "wrap",
        gap: "0 0.28em",
      }}
    >
      {words.map((word, i) => {
        const local = frame - delay - i * stagger;
        const progress = spring({
          frame: local,
          fps,
          config: { damping: 200, stiffness: 160, mass: 0.8 },
        });
        const opacity = interpolate(local, [0, 6], [0, 1], clamp);
        const y = interpolate(progress, [0, 1], [22, 0]);
        const blur = interpolate(progress, [0, 1], [6, 0]);
        return (
          <span
            key={`${word.text}-${i}`}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px)`,
              filter: `blur(${blur}px)`,
              color: word.glow ? DEMO_PALETTE.glow : color,
              fontStyle: word.italic ? "italic" : "normal",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </h2>
  );
};

export const DisplayLine: React.FC<{
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  italic?: boolean;
  maxWidth?: number;
}> = ({
  children,
  delay = 0,
  size = 72,
  color = DEMO_PALETTE.mist,
  italic = false,
  maxWidth,
}) => {
  const { opacity, y, scale } = useStamp(delay, 24);
  return (
    <h2
      style={{
        margin: 0,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 500,
        lineHeight: 1.02,
        letterSpacing: "-0.03em",
        color,
        fontStyle: italic ? "italic" : "normal",
        maxWidth,
      }}
    >
      {children}
    </h2>
  );
};

export const BodyLine: React.FC<{
  children: React.ReactNode;
  delay?: number;
  maxWidth?: number;
  color?: string;
}> = ({
  children,
  delay = 0,
  maxWidth = 720,
  color = DEMO_PALETTE.slate,
}) => {
  const { opacity, y } = useStamp(delay, 18);
  return (
    <p
      style={{
        margin: 0,
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: fonts.sans,
        fontSize: 27,
        fontWeight: 400,
        lineHeight: 1.5,
        color,
        maxWidth,
      }}
    >
      {children}
    </p>
  );
};

export const MoneyCount: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  fromFrame?: number;
  durationFrames?: number;
  size?: number;
  color?: string;
}> = ({
  value,
  prefix = "$",
  suffix = "",
  fromFrame = 8,
  durationFrames = 36,
  size = 64,
  color = DEMO_PALETTE.money,
}) => {
  const frame = useCurrentFrame();
  const count = Math.round(
    interpolate(frame, [fromFrame, fromFrame + durationFrames], [0, value], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }),
  );
  const opacity = interpolate(frame, [fromFrame, fromFrame + 8], [0, 1], clamp);
  const scale = interpolate(
    frame,
    [fromFrame, fromFrame + 14],
    [0.92, 1],
    {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "left center",
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1,
        color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}
      {count.toLocaleString("en-US")}
      {suffix}
    </span>
  );
};

export const HairlineRule: React.FC<{ delay?: number; width?: number }> = ({
  delay = 0,
  width = 72,
}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame - delay, [0, 22], [0, width], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        height: 1.5,
        width: w,
        background: `linear-gradient(90deg, ${DEMO_PALETTE.glow}, transparent)`,
        opacity: 0.9,
      }}
    />
  );
};

/** Soft radial vignette for dark campaign frames. */
export const NightGrain: React.FC = () => {
  const frame = useCurrentFrame();
  // Micro grain via animated noise opacity (CSS only)
  const flicker = 0.5 + Math.sin(frame * 0.7) * 0.02;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 28%, transparent 18%, rgba(10,17,32,${0.5 * flicker}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

/** Drifting plat-map grid for instrument feel. */
export const PlatGrid: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const { x, y } = useDrift(0.5, 18);
  const frame = useCurrentFrame();
  const rot = interpolate(frame, [0, 300], [0, 1.2], clamp);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(1.12)`,
        backgroundImage:
          "linear-gradient(to right, #93A3C0 1px, transparent 1px), linear-gradient(to bottom, #93A3C0 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        pointerEvents: "none",
      }}
    />
  );
};

/** Soft money/glow orbs that drift behind content. */
export const AmbientOrbs: React.FC = () => {
  const { x, y } = useDrift(0.25, 40);
  const frame = useCurrentFrame();
  const pulse = 0.55 + Math.sin(frame * 0.05) * 0.08;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          left: `calc(72% + ${x}px)`,
          top: `calc(8% + ${y}px)`,
          background: `radial-gradient(circle, ${DEMO_PALETTE.glow}33 0%, transparent 68%)`,
          opacity: pulse,
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          left: `calc(4% + ${-x * 0.6}px)`,
          bottom: `calc(6% + ${-y * 0.5}px)`,
          background: `radial-gradient(circle, ${DEMO_PALETTE.money}22 0%, transparent 70%)`,
          opacity: pulse * 0.9,
          filter: "blur(6px)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Progress rail under multi-step scenes. */
export const ProgressRail: React.FC<{
  steps: number;
  activeFrom: number;
  duration: number;
}> = ({ steps, activeFrom, duration }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [activeFrom, activeFrom + duration],
    [0, 1],
    clamp,
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
      }}
    >
      {Array.from({ length: steps }).map((_, i) => {
        const edge = (i + 1) / steps;
        const fill = interpolate(progress, [i / steps, edge], [0, 1], clamp);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              backgroundColor: DEMO_PALETTE.hairline,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${fill * 100}%`,
                height: "100%",
                backgroundColor: DEMO_PALETTE.glow,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
