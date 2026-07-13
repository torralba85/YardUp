import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DEMO_PALETTE, MARKET } from "./constants";
import { fonts } from "./fonts";
import {
  AmbientOrbs,
  BodyLine,
  clamp,
  HairlineRule,
  Kicker,
  MoneyCount,
  NightGrain,
  PlatGrid,
  ProgressRail,
  SceneShell,
  useDrift,
  useStamp,
  WordCascade,
} from "./primitives";

export const BrandScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const scale = interpolate(mark, [0, 1], [0.88, 1]);
  const ring = interpolate(frame, [8, 40], [0.72, 1.28], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const ringOpacity = interpolate(frame, [8, 28, 70], [0, 0.5, 0], clamp);
  const opacity = interpolate(frame, [0, 12], [0, 1], clamp);
  const tagOpacity = interpolate(frame, [22, 40], [0, 1], clamp);
  const tagY = interpolate(frame, [22, 40], [14, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    // steady: no push-in / drift — brand lockup stays dead-centered for poster
    <SceneShell steady>
      <PlatGrid opacity={0.05} />
      <NightGrain />
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
            // Optical center of the full lockup (mark + wordmark + tagline)
            transform: "translateY(-8px)",
          }}
        >
          {/* Centered glow ring behind the mark */}
          <div
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: `1px solid ${DEMO_PALETTE.glow}`,
              opacity: ringOpacity,
              transform: `scale(${ring})`,
              // Sit on the mark, not the whole stack
              top: 0,
              left: "50%",
              marginLeft: -150,
              pointerEvents: "none",
            }}
          />

          {/*
            Official inverse mark (lotfoundry-mark-dark.svg) —
            monogram is centered in the mahogany tile (unlike icon-512 which
            parks the glyph upper-left for app-icon crop).
          */}
          <div
            style={{
              opacity,
              transform: `scale(${scale})`,
              width: 240,
              height: 240,
              borderRadius: 52,
              overflow: "hidden",
              boxShadow: `0 28px 90px rgba(0,0,0,0.5), 0 0 40px ${DEMO_PALETTE.glow}22`,
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile("lotfoundry-mark-dark.svg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              opacity: tagOpacity,
              transform: `translateY(${tagY}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.sans,
                fontSize: 48,
                fontWeight: 700,
                color: DEMO_PALETTE.mist,
                letterSpacing: "-0.02em",
                textAlign: "center",
              }}
            >
              LotFoundry
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 16,
                letterSpacing: "0.2em",
                textTransform: "lowercase",
                color: DEMO_PALETTE.slate,
                textAlign: "center",
              }}
            >
              ADU planning for homeowners
            </p>
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

export const HookScene: React.FC = () => {
  const { x, y } = useDrift(0.3, 10);

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          padding: "110px 120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 30,
          transform: `translate(${x * 0.4}px, ${y * 0.35}px)`,
        }}
      >
        <Kicker>ADU planning tool</Kicker>
        <HairlineRule delay={6} width={88} />
        <WordCascade
          delay={10}
          stagger={3}
          size={86}
          words={[
            { text: "See" },
            { text: "what" },
            { text: "your" },
            { text: "backyard", glow: true, italic: true },
            { text: "can", glow: true, italic: true },
            { text: "earn.", glow: true, italic: true },
          ]}
        />
        <BodyLine delay={34} maxWidth={820}>
          LotFoundry looks up your property and estimates rent, build cost, and
          how long it takes to pay back—before you spend money on plans.
        </BodyLine>
      </AbsoluteFill>
    </SceneShell>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const left = useStamp(10, 36);
  const right = useStamp(28, 36);
  const checkIn = (delay: number, i: number) => {
    const t = frame - delay - i * 8;
    return {
      opacity: interpolate(t, [0, 8], [0, 1], clamp),
      x: interpolate(t, [0, 12], [18, 0], {
        ...clamp,
        easing: Easing.out(Easing.cubic),
      }),
    };
  };

  const without = [
    "Rough contractor quotes",
    "Hard-to-read zoning rules",
    "No clear rent estimate",
  ];
  const withLf = [
    "Property and zoning data",
    "Where an ADU can fit",
    "Rent, income, and payback",
  ];

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill style={{ padding: "92px 100px" }}>
        <Kicker color={DEMO_PALETTE.slate}>The hard way</Kicker>
        <div style={{ marginTop: 18 }}>
          <WordCascade
            delay={6}
            stagger={4}
            size={64}
            words={[
              { text: "Guessing" },
              { text: "costs" },
              { text: "you." },
            ]}
          />
        </div>
        <div
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          <div
            style={{
              opacity: left.opacity,
              transform: `translateX(${-left.y * 0.6}px) translateY(${left.y}px) scale(${left.scale})`,
              backgroundColor: DEMO_PALETTE.navy,
              border: `1px solid ${DEMO_PALETTE.hairline}`,
              borderRadius: 22,
              padding: "34px 36px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: DEMO_PALETTE.slate,
              }}
            >
              Without LotFoundry
            </p>
            <ul
              style={{
                margin: "22px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {without.map((line, i) => {
                const a = checkIn(28, i);
                return (
                  <li
                    key={line}
                    style={{
                      opacity: a.opacity,
                      transform: `translateX(${a.x}px)`,
                      fontFamily: fonts.sans,
                      fontSize: 24,
                      color: DEMO_PALETTE.mist,
                      lineHeight: 1.35,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: "#A23B26", marginTop: 2 }}>×</span>
                    {line}
                  </li>
                );
              })}
            </ul>
          </div>
          <div
            style={{
              opacity: right.opacity,
              transform: `translateX(${right.y * 0.45}px) translateY(${right.y}px) scale(${right.scale})`,
              backgroundColor: DEMO_PALETTE.card,
              border: `1px solid ${DEMO_PALETTE.money}66`,
              borderRadius: 22,
              padding: "34px 36px",
              boxShadow: `0 0 0 1px ${DEMO_PALETTE.money}18, 0 32px 90px rgba(0,0,0,0.4)`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: DEMO_PALETTE.money,
              }}
            >
              With LotFoundry
            </p>
            <ul
              style={{
                margin: "22px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {withLf.map((line, i) => {
                const a = checkIn(44, i);
                return (
                  <li
                    key={line}
                    style={{
                      opacity: a.opacity,
                      transform: `translateX(${a.x}px)`,
                      fontFamily: fonts.sans,
                      fontSize: 24,
                      color: DEMO_PALETTE.mist,
                      lineHeight: 1.35,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: DEMO_PALETTE.money, marginTop: 2 }}>
                      ✓
                    </span>
                    {line}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const FLOW_STEPS = [
  {
    n: "01",
    title: "Enter your address",
    body: "Start with the home you already own.",
  },
  {
    n: "02",
    title: "Map your lot",
    body: "Property lines, setbacks, and room for an ADU.",
  },
  {
    n: "03",
    title: "See the numbers",
    body: "Estimated rent, build cost, and payback.",
  },
  {
    n: "04",
    title: "Share the report",
    body: "Send a real plan to a builder, not a vague idea.",
  },
] as const;

export const FlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill style={{ padding: "88px 96px" }}>
        <Kicker>How it works</Kicker>
        <div style={{ marginTop: 16 }}>
          <WordCascade
            delay={6}
            stagger={3}
            size={58}
            words={[
              { text: "Four" },
              { text: "steps" },
              { text: "to" },
              { text: "a" },
              { text: "clear" },
              { text: "answer." },
            ]}
          />
        </div>
        <div style={{ marginTop: 28, maxWidth: 720 }}>
          <ProgressRail steps={4} activeFrom={20} duration={150} />
        </div>
        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
        >
          {FLOW_STEPS.map((step, i) => {
            const delay = 16 + i * 12;
            const progress = spring({
              frame: frame - delay,
              fps,
              config: { damping: 200, stiffness: 150 },
            });
            const opacity = interpolate(frame - delay, [0, 8], [0, 1], clamp);
            const y = interpolate(progress, [0, 1], [36, 0]);
            const scale = interpolate(progress, [0, 1], [0.94, 1]);
            const active = interpolate(
              frame,
              [delay + 8, delay + 40],
              [0, 1],
              clamp,
            );

            return (
              <div
                key={step.n}
                style={{
                  opacity,
                  transform: `translateY(${y}px) scale(${scale})`,
                  backgroundColor: DEMO_PALETTE.navy,
                  border: `1px solid ${
                    active > 0.5 ? `${DEMO_PALETTE.glow}88` : DEMO_PALETTE.hairline
                  }`,
                  borderRadius: 18,
                  padding: "26px 24px",
                  minHeight: 290,
                  boxShadow:
                    active > 0.4
                      ? `0 0 28px ${DEMO_PALETTE.glow}18`
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    border: `1px solid ${DEMO_PALETTE.glow}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: fonts.mono,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    color: DEMO_PALETTE.glow,
                  }}
                >
                  {step.n}
                </div>
                <p
                  style={{
                    margin: "28px 0 0",
                    fontFamily: fonts.display,
                    fontSize: 30,
                    fontWeight: 500,
                    lineHeight: 1.15,
                    color: DEMO_PALETTE.mist,
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    margin: "14px 0 0",
                    fontFamily: fonts.sans,
                    fontSize: 19,
                    lineHeight: 1.4,
                    color: DEMO_PALETTE.slate,
                  }}
                >
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

const BuildRangeCount: React.FC = () => {
  const frame = useCurrentFrame();
  const low = Math.round(
    interpolate(frame, [28, 70], [0, MARKET.buildLow], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }),
  );
  const high = Math.round(
    interpolate(frame, [28, 70], [0, MARKET.buildHigh], {
      ...clamp,
      easing: Easing.out(Easing.cubic),
    }),
  );
  const opacity = interpolate(frame, [28, 40], [0, 1], clamp);
  const scale = interpolate(frame, [28, 48], [0.92, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "left center",
        fontFamily: fonts.display,
        fontSize: 42,
        fontWeight: 600,
        color: DEMO_PALETTE.mist,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      ${Math.round(low / 1000)}K–${Math.round(high / 1000)}K
    </span>
  );
};

const MetricCard: React.FC<{
  label: string;
  note: string;
  delay: number;
  accent?: boolean;
  children: React.ReactNode;
}> = ({ label, note, delay, accent, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 150 },
  });
  const opacity = interpolate(frame - delay, [0, 8], [0, 1], clamp);
  const y = interpolate(progress, [0, 1], [30, 0]);
  const scale = interpolate(progress, [0, 1], [0.94, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        backgroundColor: DEMO_PALETTE.navy,
        border: `1px solid ${accent ? `${DEMO_PALETTE.money}55` : DEMO_PALETTE.hairline}`,
        borderRadius: 18,
        padding: "28px 24px",
        minHeight: 210,
        boxShadow: accent ? `0 0 32px ${DEMO_PALETTE.money}14` : "none",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: fonts.mono,
          fontSize: 13,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: DEMO_PALETTE.slate,
        }}
      >
        {label}
      </p>
      <div style={{ marginTop: 28 }}>{children}</div>
      <p
        style={{
          margin: "18px 0 0",
          fontFamily: fonts.mono,
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: DEMO_PALETTE.slate,
        }}
      >
        {note}
      </p>
    </div>
  );
};

export const MoneyScene: React.FC = () => {
  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill style={{ padding: "84px 96px" }}>
        <Kicker color={DEMO_PALETTE.money}>Why it helps</Kicker>
        <div style={{ marginTop: 16 }}>
          <WordCascade
            delay={6}
            stagger={3}
            size={56}
            words={[
              { text: "Start" },
              { text: "with" },
              { text: "the" },
              { text: "money.", glow: true },
            ]}
          />
        </div>
        <BodyLine delay={28} maxWidth={860}>
          Sample ranges for cities we cover ({MARKET.markets}). Enter your
          address for figures based on your lot. These are estimates, not
          guarantees.
        </BodyLine>
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
        >
          <MetricCard label="Est. rent" note="per month" delay={10} accent>
            <MoneyCount
              value={MARKET.rentMid}
              suffix="/mo"
              fromFrame={14}
              durationFrames={42}
              size={54}
            />
          </MetricCard>
          <MetricCard label="Yearly income" note="after ops" delay={18} accent>
            <MoneyCount
              value={MARKET.noi}
              suffix="/yr"
              fromFrame={22}
              durationFrames={42}
              size={54}
            />
          </MetricCard>
          <MetricCard label="Payback" note="years" delay={26}>
            <MoneyCount
              value={MARKET.paybackYears}
              prefix="~"
              suffix=" yrs"
              fromFrame={30}
              durationFrames={34}
              size={54}
              color={DEMO_PALETTE.mist}
            />
          </MetricCard>
          <MetricCard label="Build cost" note="estimate" delay={34}>
            <BuildRangeCount />
          </MetricCard>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

export const StudioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200, stiffness: 110 },
  });
  const ken = interpolate(frame, [0, durationInFrames], [1.08, 1.0], clamp);
  const panX = interpolate(frame, [0, durationInFrames], [-2.5, 2.5], clamp);
  const imgOpacity = interpolate(frame, [0, 14], [0, 1], clamp);
  const panel = useStamp(24, 32);
  const chip1 = useStamp(48, 20);
  const chip2 = useStamp(58, 20);
  const chip3 = useStamp(68, 20);

  return (
    <SceneShell background={DEMO_PALETTE.espresso}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            opacity: imgOpacity * enter,
            transform: `scale(${ken}) translateX(${panX}%)`,
            width: "100%",
            height: "100%",
          }}
        >
          <Img
            src={staticFile("landing/studio-scene-still.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(0.95) contrast(1.06)",
            }}
          />
        </div>
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(105deg, rgba(38,19,7,0.92) 0%, rgba(38,19,7,0.62) 46%, rgba(38,19,7,0.18) 100%)",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          padding: "96px 100px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 960,
        }}
      >
        <Kicker color={DEMO_PALETTE.glow}>In the studio</Kicker>
        <div style={{ marginTop: 18 }}>
          <WordCascade
            delay={8}
            stagger={3}
            size={60}
            color={DEMO_PALETTE.sand}
            words={[
              { text: "Place" },
              { text: "the" },
              { text: "ADU." },
              { text: "See" },
              { text: "the" },
              { text: "fit." },
              { text: "Check" },
              { text: "the" },
              { text: "numbers." },
            ]}
          />
        </div>
        <div
          style={{
            marginTop: 32,
            opacity: panel.opacity,
            transform: `translateY(${panel.y}px) scale(${panel.scale})`,
            backgroundColor: "rgba(251,246,238,0.96)",
            borderRadius: 18,
            padding: "26px 30px",
            maxWidth: 560,
            border: `1px solid ${DEMO_PALETTE.sand}`,
            boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: fonts.mono,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: DEMO_PALETTE.clay,
            }}
          >
            Live lot map
          </p>
          <p
            style={{
              margin: "12px 0 0",
              fontFamily: fonts.sans,
              fontSize: 23,
              lineHeight: 1.4,
              color: DEMO_PALETTE.espresso,
            }}
          >
            Drag the ADU on your lot, check setbacks, and watch the rent and
            payback estimates update as you move it.
          </p>
        </div>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Lot map", anim: chip1 },
            { label: "Setbacks", anim: chip2 },
            { label: "Rent estimate", anim: chip3 },
          ].map((chip) => (
            <div
              key={chip.label}
              style={{
                opacity: chip.anim.opacity,
                transform: `translateY(${chip.anim.y}px)`,
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: DEMO_PALETTE.sand,
                backgroundColor: "rgba(38,19,7,0.72)",
                border: `1px solid ${DEMO_PALETTE.glow}55`,
                borderRadius: 999,
                padding: "10px 16px",
              }}
            >
              {chip.label}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

export const ReportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamp = spring({
    frame: frame - 16,
    fps,
    config: { damping: 200, stiffness: 130 },
  });
  const certY = interpolate(stamp, [0, 1], [40, 0]);
  const certRot = interpolate(stamp, [0, 1], [2.2, 0]);
  const certScale = interpolate(stamp, [0, 1], [0.94, 1]);
  const certOpacity = interpolate(frame - 16, [0, 10], [0, 1], clamp);
  const rows = [
    { label: "Est. rent", value: MARKET.rentBand, money: true },
    {
      label: "Yearly",
      value: `$${MARKET.noi.toLocaleString("en-US")}`,
      money: true,
    },
    { label: "Payback", value: `~${MARKET.paybackYears} yrs`, money: false },
    { label: "Build", value: MARKET.buildBand, money: false },
  ];

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          padding: "96px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 52,
          alignItems: "center",
        }}
      >
        <div>
          <Kicker>What you walk away with</Kicker>
          <div style={{ marginTop: 16 }}>
            <WordCascade
              delay={6}
              stagger={3}
              size={56}
              maxWidth={780}
              words={[
                { text: "A" },
                { text: "report" },
                { text: "you" },
                { text: "can" },
                { text: "hand" },
                { text: "a" },
                { text: "builder." },
              ]}
            />
          </div>
          <div style={{ marginTop: 26 }}>
            <BodyLine delay={30} maxWidth={640}>
              Show them the lot layout, estimated rent, and build range—not just
              “maybe we should add an ADU?”
            </BodyLine>
          </div>
        </div>
        <div
          style={{
            opacity: certOpacity,
            transform: `translateY(${certY}px) rotate(${certRot}deg) scale(${certScale})`,
            backgroundColor: DEMO_PALETTE.parchment,
            borderRadius: 16,
            padding: "38px 34px",
            boxShadow: "0 32px 100px rgba(0,0,0,0.45)",
            border: "1px solid #E0CDB4",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: fonts.mono,
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: DEMO_PALETTE.clay,
            }}
          >
            ADU estimate · not a guarantee
          </p>
          <p
            style={{
              margin: "20px 0 0",
              fontFamily: fonts.display,
              fontSize: 34,
              fontWeight: 600,
              color: DEMO_PALETTE.espresso,
              lineHeight: 1.15,
            }}
          >
            Backyard income estimate
          </p>
          <div
            style={{
              marginTop: 26,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            {rows.map((row, i) => {
              const delay = 34 + i * 6;
              const o = interpolate(frame, [delay, delay + 10], [0, 1], clamp);
              const y = interpolate(frame, [delay, delay + 12], [12, 0], {
                ...clamp,
                easing: Easing.out(Easing.cubic),
              });
              return (
                <div
                  key={row.label}
                  style={{ opacity: o, transform: `translateY(${y}px)` }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: fonts.mono,
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#6B5B4D",
                    }}
                  >
                    {row.label}
                  </p>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontFamily: fonts.display,
                      fontSize: 25,
                      fontWeight: 600,
                      color: row.money
                        ? DEMO_PALETTE.forest
                        : DEMO_PALETTE.espresso,
                    }}
                  >
                    {row.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = spring({
    frame: frame - 42,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const btnScale = interpolate(pulse, [0, 1], [0.94, 1]);
  const glowRing = 0.35 + Math.sin(frame * 0.12) * 0.12;
  const { x, y } = useDrift(0.35, 10);

  return (
    <SceneShell>
      <PlatGrid opacity={0.06} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          textAlign: "center",
          padding: 80,
          transform: `translate(${x * 0.3}px, ${y * 0.25}px)`,
        }}
      >
        <Kicker>Your backyard can earn</Kicker>
        <HairlineRule delay={6} width={96} />
        <WordCascade
          delay={10}
          stagger={3}
          size={74}
          words={[
            { text: "Check" },
            { text: "your" },
            { text: "address." },
            { text: "Get" },
            { text: "your" },
            { text: "numbers." },
          ]}
        />
        <BodyLine delay={34} maxWidth={740}>
          LotFoundry maps your property and estimates rent so you can decide—and
          talk to a builder with a real plan.
        </BodyLine>
        <div
          style={{
            marginTop: 18,
            position: "relative",
            opacity: interpolate(frame, [40, 54], [0, 1], clamp),
            transform: `scale(${btnScale})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -14,
              borderRadius: 999,
              border: `1px solid ${DEMO_PALETTE.glow}`,
              opacity: glowRing,
            }}
          />
          <div
            style={{
              backgroundColor: DEMO_PALETTE.glow,
              color: DEMO_PALETTE.ink,
              fontFamily: fonts.sans,
              fontSize: 26,
              fontWeight: 700,
              padding: "20px 52px",
              borderRadius: 999,
              letterSpacing: "-0.01em",
              boxShadow: `0 12px 40px ${DEMO_PALETTE.glow}44`,
            }}
          >
            Try LotFoundry
          </div>
        </div>
        <p
          style={{
            margin: "6px 0 0",
            opacity: interpolate(frame, [52, 66], [0, 1], clamp),
            fontFamily: fonts.mono,
            fontSize: 15,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: DEMO_PALETTE.slate,
          }}
        >
          Estimates only · not guarantees
        </p>
      </AbsoluteFill>
    </SceneShell>
  );
};
