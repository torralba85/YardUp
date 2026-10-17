import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fonts } from "../demo/fonts";
import timing from "./timing.json";

/**
 * Google Play promo video (1920x1080, 30fps, ~40s).
 * Every figure on screen comes from the live Studio Seattle demo captures in
 * public/play/, so the video shows only what the app actually outputs.
 * Voiceover: scripts/play-promo-voiceover.py (edge-tts, AI-generated).
 */
export const PLAY_FPS = 30;
export const PLAY_WIDTH = 1920;
export const PLAY_HEIGHT = 1080;

const LEAD_IN = 10;
const TAIL = 18;
const TRANSITION = 14;

const C = {
  ink: "#161616",
  paper: "#F5F5F0",
  muted: "#B7B7AE",
  clay: "#FF5B24",
  hairline: "#44443F",
} as const;

type Clip = (typeof timing)[number];

const sceneFrames = (c: Clip) =>
  LEAD_IN + Math.ceil(c.seconds * PLAY_FPS) + TAIL;

export const PLAY_DURATION_IN_FRAMES = timing.reduce(
  (sum, c) => sum + sceneFrames(c),
  0,
);

const clip = (key: string) => {
  const found = timing.find((t) => t.key === key);
  if (!found) throw new Error(`No voiceover clip for ${key}`);
  return found;
};

/** Sentence-level captions, timed in proportion to characters spoken. */
const Captions: React.FC<{ clip: Clip }> = ({ clip: c }) => {
  const frame = useCurrentFrame() - LEAD_IN;
  const parts = c.text.match(/[^.?!:]+[.?!:]?/g)?.map((s) => s.trim()) ?? [
    c.text,
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const spoken = c.seconds * PLAY_FPS;
  let start = 0;
  let current = parts[0];
  for (const p of parts) {
    if (frame >= start) current = p;
    start += (p.length / total) * spoken;
  }
  const opacity = interpolate(
    frame,
    [-LEAD_IN, 0, spoken + 4, spoken + TAIL],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 40,
        display: "flex",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(10,10,10,0.72)",
          color: C.paper,
          fontFamily: fonts.sans,
          fontWeight: 600,
          fontSize: 28,
          lineHeight: 1.35,
          padding: "10px 22px",
          maxWidth: 1260,
          textAlign: "center",
        }}
      >
        {current}
      </div>
    </div>
  );
};

const useEnter = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
};

/** Phone frame showing a 1080x1920 capture, easing toward a focus point. */
const Phone: React.FC<{
  src: string;
  focus: [number, number];
  zoom: number;
  zoomFrom: number;
  zoomTo: number;
}> = ({ src, focus, zoom, zoomFrom, zoomTo }) => {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const screenH = 860;
  const screenW = (screenH * 1080) / 1920;
  const z = interpolate(frame, [zoomFrom, zoomTo], [1, zoom], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const driftX = interpolate(frame, [zoomFrom, zoomTo], [10, -10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const driftY = interpolate(frame, [zoomFrom, zoomTo], [4, -4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const k = screenW / 1080;
  return (
    <div
      style={{
        width: screenW + 36,
        height: screenH + 36,
        borderRadius: 54,
        background: "#0B0B0B",
        border: `2px solid ${C.hairline}`,
        padding: 16,
        boxShadow: "0 40px 90px rgba(0,0,0,0.5)",
        transform: `translate(${driftX}px, ${driftY + (1 - enter) * 120}px)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          width: screenW,
          height: screenH,
          borderRadius: 38,
          overflow: "hidden",
          background: C.paper,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: screenW,
            height: screenH,
            transformOrigin: `${focus[0] * k}px ${focus[1] * k}px`,
            transform: `scale(${z})`,
          }}
        />
      </div>
    </div>
  );
};

const STEPS = ["Find", "Earn", "Shape", "Check"] as const;

const AppScene: React.FC<{
  clipKey: string;
  step: number;
  headline: string;
  sub: string;
  src: string;
  focus: [number, number];
  zoom?: number;
}> = ({ clipKey, step, headline, sub, src, focus, zoom = 1.35 }) => {
  const c = clip(clipKey);
  const spoken = Math.ceil(c.seconds * PLAY_FPS);
  const t1 = useEnter(6);
  const t2 = useEnter(14);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={LEAD_IN} layout="none">
        <Audio src={staticFile(c.src)} />
      </Sequence>
      <AbsoluteFill
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: "0 150px 70px",
          gap: 130,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 44 }}>
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  fontFamily: fonts.sans,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  padding: "8px 16px",
                  border: `2px solid ${i === step ? C.clay : C.hairline}`,
                  color: i === step ? C.ink : i < step ? C.paper : C.muted,
                  background: i === step ? C.clay : "transparent",
                }}
              >
                {i + 1} · {s}
              </div>
            ))}
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1.02,
              color: C.paper,
              letterSpacing: -2,
              opacity: t1,
              transform: `translateX(${(1 - t1) * -40}px)`,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontWeight: 500,
              fontSize: 38,
              lineHeight: 1.35,
              color: C.muted,
              marginTop: 30,
              maxWidth: 820,
              opacity: t2,
              transform: `translateX(${(1 - t2) * -40}px)`,
            }}
          >
            {sub}
          </div>
        </div>
        <Phone
          src={src}
          focus={focus}
          zoom={zoom}
          zoomFrom={LEAD_IN + Math.round(spoken * 0.3)}
          zoomTo={LEAD_IN + Math.round(spoken * 0.7)}
        />
      </AbsoluteFill>
      <Captions clip={c} />
    </AbsoluteFill>
  );
};

const HookScene: React.FC = () => {
  const c = clip("hook");
  const frame = useCurrentFrame();
  const a = useEnter(4);
  const b = useEnter(60);
  const draw = interpolate(frame, [0, 70], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const adu = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const perimeter = 2 * (520 + 300);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={LEAD_IN} layout="none">
        <Audio src={staticFile(c.src)} />
      </Sequence>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        <rect
          x={1250}
          y={300}
          width={520}
          height={300}
          fill="none"
          stroke={C.muted}
          strokeWidth={4}
          strokeDasharray={perimeter}
          strokeDashoffset={perimeter * (1 - draw)}
        />
        <rect x={1300} y={350} width={230} height={200} fill="#2A2A28" opacity={draw} />
        <rect
          x={1590}
          y={430}
          width={130}
          height={120}
          fill={C.clay}
          opacity={adu}
          transform={`translate(0 ${(1 - adu) * -20})`}
        />
        <text
          x={1590}
          y={416}
          fill={C.clay}
          opacity={adu}
          fontFamily={fonts.sans}
          fontWeight={700}
          fontSize={22}
          letterSpacing={2}
        >
          ADU
        </text>
      </svg>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 150px 80px" }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 132,
            lineHeight: 1,
            letterSpacing: -3,
            color: C.paper,
            maxWidth: 1000,
            opacity: a,
            transform: `translateY(${(1 - a) * 40}px)`,
          }}
        >
          Could your backyard be{" "}
          <span style={{ color: C.clay }}>earning rent?</span>
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: 40,
            color: C.muted,
            marginTop: 40,
            opacity: b,
          }}
        >
          See what your lot can do, in about a minute.
        </div>
      </AbsoluteFill>
      <Captions clip={c} />
    </AbsoluteFill>
  );
};

const CtaScene: React.FC = () => {
  const c = clip("cta");
  const a = useEnter(0);
  const b = useEnter(24);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={LEAD_IN} layout="none">
        <Audio src={staticFile(c.src)} />
      </Sequence>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 150,
        }}
      >
        <Img
          src={staticFile("lotfoundry-lockup-horizontal-inverse.svg")}
          style={{
            height: 140,
            opacity: a,
            transform: `scale(${0.94 + a * 0.06})`,
          }}
        />
        <div
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: 72,
            color: C.paper,
            marginTop: 56,
            letterSpacing: -1,
            opacity: a,
          }}
        >
          Find out what your backyard can do.
        </div>
        <div
          style={{
            marginTop: 48,
            padding: "18px 36px",
            background: C.clay,
            color: C.ink,
            fontFamily: fonts.sans,
            fontWeight: 700,
            fontSize: 40,
            opacity: b,
            transform: `translateY(${(1 - b) * 24}px)`,
          }}
        >
          Available on Google Play
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 150,
          textAlign: "center",
          fontFamily: fonts.sans,
          fontSize: 24,
          color: C.muted,
          opacity: b,
        }}
      >
        Estimates only; demo figures shown. Confirm details with your local
        permit office. AI-generated voiceover.
      </div>
      <Captions clip={c} />
    </AbsoluteFill>
  );
};

const SceneTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
}> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - TRANSITION, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const SCENES: Array<[string, React.ReactNode]> = [
  ["hook", <HookScene key="hook" />],
  [
    "find",
    <AppScene
      key="find"
      clipKey="find"
      step={0}
      headline="Start with your address."
      sub="Your parcel, local zoning and area market rents, pulled together."
      src="play/4-find.png"
      focus={[540, 900]}
      zoom={1.25}
    />,
  ],
  [
    "earn",
    <AppScene
      key="earn"
      clipKey="earn"
      step={1}
      headline="See what it could earn."
      sub="An estimated monthly rent for a backyard home on your lot."
      src="play/1-earn.png"
      focus={[380, 830]}
      zoom={1.45}
    />,
  ],
  [
    "shape",
    <AppScene
      key="shape"
      clipKey="shape"
      step={2}
      headline="Shape it in 3D."
      sub="Place an ADU on your actual lot and see whether it fits."
      src="play/2-shape.png"
      focus={[540, 820]}
      zoom={1.4}
    />,
  ],
  [
    "check",
    <AppScene
      key="check"
      clipKey="check"
      step={3}
      headline="Check feasibility."
      sub="Build range, rent and payback, plus what to verify before you permit."
      src="play/3-check.png"
      focus={[540, 980]}
      zoom={1.35}
    />,
  ],
  ["cta", <CtaScene key="cta" />],
];

export const PlayPromo: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {SCENES.map(([key, node], i) => {
        const len = sceneFrames(clip(key));
        const seq = (
          <Sequence key={key} from={from} durationInFrames={len} premountFor={15}>
            <SceneTransition durationInFrames={len}>{node}</SceneTransition>
          </Sequence>
        );
        from += len;
        return seq;
      })}
    </AbsoluteFill>
  );
};
