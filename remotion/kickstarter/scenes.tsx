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
import {
  BACKER_TIERS,
  KICKSTARTER_PALETTE,
  KICKSTARTER_STEPS,
} from "./constants";
import { fonts } from "../demo/fonts";
import {
  AmbientOrbs,
  BodyLine,
  clamp,
  HairlineRule,
  Kicker,
  NightGrain,
  PlatGrid,
  ProgressRail,
  SceneShell,
  useDrift,
  useStamp,
  WordCascade,
} from "../demo/primitives";

/* -------------------------------------------------------------------------- */
/*  Scene 1: Kickstarter Brand Launch                                         */
/* -------------------------------------------------------------------------- */

export const KickstarterBrandScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markSpring = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const scale = interpolate(markSpring, [0, 1], [0.88, 1]);

  const ring = interpolate(frame, [10, 48], [0.72, 1.35], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  const ringOpacity = interpolate(frame, [10, 30, 75], [0, 0.6, 0], clamp);
  const opacity = interpolate(frame, [0, 14], [0, 1], clamp);

  const badgeOpacity = interpolate(frame, [6, 20], [0, 1], clamp);
  const badgeY = interpolate(frame, [6, 20], [-10, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  const tagOpacity = interpolate(frame, [24, 42], [0, 1], clamp);
  const tagY = interpolate(frame, [24, 42], [14, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <SceneShell steady>
      <PlatGrid opacity={0.06} />
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
            gap: 28,
            transform: "translateY(-10px)",
          }}
        >
          {/* Kickstarter Live Badge */}
          <div
            style={{
              opacity: badgeOpacity,
              transform: `translateY(${badgeY}px)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 18px",
              backgroundColor: KICKSTARTER_PALETTE.kickstarterPillBg,
              border: `1px solid ${KICKSTARTER_PALETTE.kickstarterPillBorder}`,
              borderRadius: 999,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: KICKSTARTER_PALETTE.kickstarterGreen,
                boxShadow: `0 0 10px ${KICKSTARTER_PALETTE.kickstarterGreen}`,
              }}
            />
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: KICKSTARTER_PALETTE.kickstarterGreen,
              }}
            >
              Live on Kickstarter · Founding Campaign
            </span>
          </div>

          {/* Glowing pulse ring */}
          <div
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              borderRadius: "50%",
              border: `1px solid ${KICKSTARTER_PALETTE.signalOrange}`,
              opacity: ringOpacity,
              transform: `scale(${ring})`,
              top: 50,
              left: "50%",
              marginLeft: -160,
              pointerEvents: "none",
            }}
          />

          {/* Official LotFoundry Mark */}
          <div
            style={{
              opacity,
              transform: `scale(${scale})`,
              width: 220,
              height: 220,
              borderRadius: 48,
              overflow: "hidden",
              boxShadow: `0 28px 90px rgba(0,0,0,0.6), 0 0 40px ${KICKSTARTER_PALETTE.signalOrange}28`,
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile("lotfoundry-mark-dark.svg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* Title & Tagline */}
          <div
            style={{
              opacity: tagOpacity,
              transform: `translateY(${tagY}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 54,
                fontWeight: 700,
                color: KICKSTARTER_PALETTE.chalk,
                letterSpacing: "-0.02em",
              }}
            >
              LotFoundry
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: fonts.sans,
                fontSize: 18,
                letterSpacing: "0.08em",
                color: KICKSTARTER_PALETTE.stone,
                maxWidth: 580,
                lineHeight: 1.4,
              }}
            >
              The 3D AI Feasibility Studio for Accessory Dwelling Units
            </p>
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Scene 2: The Backyard Hook                                                */
/* -------------------------------------------------------------------------- */

export const KickstarterHookScene: React.FC = () => {
  const { x, y } = useDrift(0.3, 10);

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          padding: "100px 120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          transform: `translate(${x * 0.4}px, ${y * 0.35}px)`,
        }}
      >
        <Kicker color={KICKSTARTER_PALETTE.kickstarterGreen}>
          Unlock Backyard Potential
        </Kicker>
        <HairlineRule delay={6} width={92} />
        <WordCascade
          delay={10}
          stagger={3}
          size={82}
          words={[
            { text: "Can" },
            { text: "you" },
            { text: "build" },
            { text: "an" },
            { text: "ADU" },
            { text: "in" },
            { text: "your" },
            { text: "backyard?", glow: true, italic: true },
          ]}
        />
        <BodyLine delay={36} maxWidth={860}>
          Millions of homeowners want to build an ADU for passive rental income
          or multigenerational living. But navigating zoning, setbacks, and
          building costs has always been a painful, expensive guessing game.
        </BodyLine>
      </AbsoluteFill>
    </SceneShell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Scene 3: The Problem vs. LotFoundry                                       */
/* -------------------------------------------------------------------------- */

export const KickstarterProblemScene: React.FC = () => {
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
    "$5,000+ feasibility retainers",
    "200-page municipal zoning PDFs",
    "8 weeks waiting for contractors",
    "Confusing setback calculations",
  ];
  const withLf = [
    "Instant GIS parcel boundary lookup",
    "Automated municipal setback envelopes",
    "Real-time 3D lot visualization",
    "Live rental yield & construction pro-forma",
  ];

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          padding: "90px 100px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Kicker color={KICKSTARTER_PALETTE.stone}>The Old Way vs. LotFoundry</Kicker>
        <div style={{ marginTop: 14 }}>
          <WordCascade
            delay={6}
            stagger={4}
            size={60}
            words={[
              { text: "Feasibility" },
              { text: "was" },
              { text: "broken." },
              { text: "Now" },
              { text: "it's" },
              { text: "instant.", glow: true },
            ]}
          />
        </div>
        <div
          style={{
            marginTop: 44,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          {/* Left card: Without */}
          <div
            style={{
              opacity: left.opacity,
              transform: `translateX(${-left.y * 0.6}px) translateY(${left.y}px) scale(${left.scale})`,
              backgroundColor: KICKSTARTER_PALETTE.carbon,
              border: `1px solid ${KICKSTARTER_PALETTE.hairline}`,
              borderRadius: 20,
              padding: "32px 34px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: KICKSTARTER_PALETTE.stone,
              }}
            >
              The Old Way
            </p>
            <ul
              style={{
                margin: "20px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {without.map((line, i) => {
                const a = checkIn(26, i);
                return (
                  <li
                    key={line}
                    style={{
                      opacity: a.opacity,
                      transform: `translateX(${a.x}px)`,
                      fontFamily: fonts.sans,
                      fontSize: 22,
                      color: KICKSTARTER_PALETTE.chalk,
                      lineHeight: 1.35,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        color: KICKSTARTER_PALETTE.dangerRed,
                        fontWeight: 700,
                        marginTop: 1,
                      }}
                    >
                      ×
                    </span>
                    {line}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right card: With LotFoundry */}
          <div
            style={{
              opacity: right.opacity,
              transform: `translateX(${right.y * 0.45}px) translateY(${right.y}px) scale(${right.scale})`,
              backgroundColor: KICKSTARTER_PALETTE.card,
              border: `1px solid ${KICKSTARTER_PALETTE.kickstarterGreen}66`,
              borderRadius: 20,
              padding: "32px 34px",
              boxShadow: `0 0 0 1px ${KICKSTARTER_PALETTE.kickstarterGreen}22, 0 32px 90px rgba(0,0,0,0.5)`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: KICKSTARTER_PALETTE.kickstarterGreen,
              }}
            >
              With LotFoundry
            </p>
            <ul
              style={{
                margin: "20px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {withLf.map((line, i) => {
                const a = checkIn(42, i);
                return (
                  <li
                    key={line}
                    style={{
                      opacity: a.opacity,
                      transform: `translateX(${a.x}px)`,
                      fontFamily: fonts.sans,
                      fontSize: 22,
                      color: KICKSTARTER_PALETTE.chalk,
                      lineHeight: 1.35,
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        color: KICKSTARTER_PALETTE.kickstarterGreen,
                        fontWeight: 700,
                        marginTop: 1,
                      }}
                    >
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

/* -------------------------------------------------------------------------- */
/*  Scene 4: How It Works (4 Steps)                                           */
/* -------------------------------------------------------------------------- */

export const KickstarterFlowScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          padding: "90px 96px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Kicker color={KICKSTARTER_PALETTE.signalOrange}>Workflow</Kicker>
        <div style={{ marginTop: 14 }}>
          <WordCascade
            delay={6}
            stagger={3}
            size={56}
            words={[
              { text: "Four" },
              { text: "steps" },
              { text: "from" },
              { text: "address" },
              { text: "to" },
              { text: "approved" },
              { text: "plan." },
            ]}
          />
        </div>
        <div style={{ marginTop: 24, maxWidth: 720 }}>
          <ProgressRail steps={4} activeFrom={20} duration={150} />
        </div>
        <div
          style={{
            marginTop: 36,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 18,
          }}
        >
          {KICKSTARTER_STEPS.map((step, i) => {
            const delay = 16 + i * 12;
            const progress = spring({
              frame: frame - delay,
              fps,
              config: { damping: 200, stiffness: 150 },
            });
            const opacity = interpolate(frame - delay, [0, 8], [0, 1], clamp);
            const y = interpolate(progress, [0, 1], [36, 0]);

            return (
              <div
                key={step.n}
                style={{
                  opacity,
                  transform: `translateY(${y}px)`,
                  backgroundColor: KICKSTARTER_PALETTE.card,
                  border: `1px solid ${KICKSTARTER_PALETTE.cardBorder}`,
                  borderRadius: 16,
                  padding: "26px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 13,
                    letterSpacing: "0.14em",
                    color: KICKSTARTER_PALETTE.signalOrange,
                    fontWeight: 700,
                  }}
                >
                  {step.n}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.display,
                    fontSize: 20,
                    fontWeight: 600,
                    color: KICKSTARTER_PALETTE.chalk,
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: KICKSTARTER_PALETTE.stone,
                    lineHeight: 1.45,
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

/* -------------------------------------------------------------------------- */
/*  Scene 5: 3D Feasibility Studio Visual                                     */
/* -------------------------------------------------------------------------- */

export const KickstarterStudioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200, stiffness: 140 },
  });
  const imgScale = interpolate(imgSpring, [0, 1], [0.94, 1]);
  const imgOpacity = interpolate(frame - 10, [0, 12], [0, 1], clamp);

  const hud1 = useStamp(25, 24);
  const hud2 = useStamp(38, 24);
  const hud3 = useStamp(50, 24);

  return (
    <SceneShell>
      <PlatGrid opacity={0.06} />
      <NightGrain />
      <AbsoluteFill style={{ padding: "70px 90px" }}>
        <Kicker color={KICKSTARTER_PALETTE.kickstarterGreen}>
          Interactive 3D Engine
        </Kicker>
        <div style={{ marginTop: 12 }}>
          <WordCascade
            delay={4}
            stagger={3}
            size={52}
            words={[
              { text: "Your" },
              { text: "property," },
              { text: "modeled" },
              { text: "in" },
              { text: "full" },
              { text: "3D.", glow: true },
            ]}
          />
        </div>

        {/* 3D Scene Viewport */}
        <div
          style={{
            position: "relative",
            marginTop: 28,
            width: "100%",
            height: 600,
            borderRadius: 20,
            overflow: "hidden",
            border: `1px solid ${KICKSTARTER_PALETTE.cardBorder}`,
            boxShadow: "0 30px 100px rgba(0,0,0,0.7)",
            opacity: imgOpacity,
            transform: `scale(${imgScale})`,
          }}
        >
          <Img
            src={staticFile("landing/a-lot-more/parcel-after.webp")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Floating HUD Card 1: Setbacks */}
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 30,
              backgroundColor: "rgba(22, 22, 22, 0.88)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${KICKSTARTER_PALETTE.cardBorder}`,
              borderRadius: 14,
              padding: "16px 20px",
              opacity: hud1.opacity,
              transform: `translateY(${hud1.y}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: KICKSTARTER_PALETTE.verifiedGreen,
                }}
              />
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  color: KICKSTARTER_PALETTE.kickstarterGreen,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Zoning Validated
              </span>
            </div>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 18,
                fontWeight: 600,
                color: KICKSTARTER_PALETTE.chalk,
              }}
            >
              {"Setbacks: Rear 4' · Side 4' · Front 20'"}
            </span>
          </div>

          {/* Floating HUD Card 2: Financials */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              left: 30,
              backgroundColor: "rgba(22, 22, 22, 0.88)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${KICKSTARTER_PALETTE.cardBorder}`,
              borderRadius: 14,
              padding: "18px 24px",
              opacity: hud2.opacity,
              transform: `translateY(${hud2.y}px)`,
              display: "flex",
              gap: 28,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: KICKSTARTER_PALETTE.stone,
                }}
              >
                Est. Monthly Rent
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: fonts.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: KICKSTARTER_PALETTE.chalk,
                }}
              >
                $2,350/mo
              </p>
            </div>
            <div style={{ width: 1, backgroundColor: KICKSTARTER_PALETTE.hairline }} />
            <div>
              <p
                style={{
                  margin: 0,
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: KICKSTARTER_PALETTE.stone,
                }}
              >
                Annual NOI
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontFamily: fonts.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: KICKSTARTER_PALETTE.kickstarterGreen,
                }}
              >
                +$22,400
              </p>
            </div>
          </div>

          {/* Floating HUD Card 3: Payback */}
          <div
            style={{
              position: "absolute",
              bottom: 30,
              right: 30,
              backgroundColor: "rgba(22, 22, 22, 0.88)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${KICKSTARTER_PALETTE.cardBorder}`,
              borderRadius: 14,
              padding: "18px 24px",
              opacity: hud3.opacity,
              transform: `translateY(${hud3.y}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: KICKSTARTER_PALETTE.stone,
              }}
            >
              Estimated Payback
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 26,
                fontWeight: 700,
                color: KICKSTARTER_PALETTE.chalk,
              }}
            >
              11.8 Years
            </p>
          </div>
        </div>

        {/* Compliance footnote */}
        <p
          style={{
            margin: "20px 0 0",
            textAlign: "center",
            fontFamily: fonts.mono,
            fontSize: 13,
            letterSpacing: "0.06em",
            color: KICKSTARTER_PALETTE.stone,
            opacity: imgOpacity,
          }}
        >
          {"* Estimates based on municipal public records · Not legal guarantees · Software feasibility calculation, not financial advice"}
        </p>
      </AbsoluteFill>
    </SceneShell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Scene 6: Why Kickstarter & Backer Tiers                                   */
/* -------------------------------------------------------------------------- */

export const KickstarterMissionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell>
      <PlatGrid opacity={0.05} />
      <AmbientOrbs />
      <NightGrain />
      <AbsoluteFill
        style={{
          padding: "90px 100px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Kicker color={KICKSTARTER_PALETTE.kickstarterGreen}>
          Why Kickstarter
        </Kicker>
        <div style={{ marginTop: 14 }}>
          <WordCascade
            delay={6}
            stagger={3}
            size={56}
            words={[
              { text: "Help" },
              { text: "us" },
              { text: "expand" },
              { text: "to" },
              { text: "all" },
              { text: "50" },
              { text: "states.", glow: true },
            ]}
          />
        </div>
        <p
          style={{
            margin: "16px 0 0",
            fontFamily: fonts.sans,
            fontSize: 20,
            color: KICKSTARTER_PALETTE.stone,
            maxWidth: 780,
            lineHeight: 1.4,
          }}
        >
          {
            "We are building the nation's open zoning intelligence platform. Back our campaign to receive exclusive lifetime studio access and founding member perks."
          }
        </p>

        {/* Backer Tiers Grid */}
        <div
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {BACKER_TIERS.map((tier, i) => {
            const delay = 22 + i * 14;
            const progress = spring({
              frame: frame - delay,
              fps,
              config: { damping: 200, stiffness: 140 },
            });
            const opacity = interpolate(frame - delay, [0, 8], [0, 1], clamp);
            const y = interpolate(progress, [0, 1], [32, 0]);

            return (
              <div
                key={tier.tier}
                style={{
                  opacity,
                  transform: `translateY(${y}px)`,
                  backgroundColor: tier.featured
                    ? KICKSTARTER_PALETTE.card
                    : KICKSTARTER_PALETTE.carbon,
                  border: tier.featured
                    ? `2px solid ${KICKSTARTER_PALETTE.kickstarterGreen}`
                    : `1px solid ${KICKSTARTER_PALETTE.hairline}`,
                  borderRadius: 18,
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: tier.featured
                    ? `0 20px 60px rgba(5, 206, 120, 0.15)`
                    : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: tier.featured
                        ? KICKSTARTER_PALETTE.kickstarterGreen
                        : KICKSTARTER_PALETTE.stone,
                    }}
                  >
                    {tier.tier}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 34,
                      fontWeight: 700,
                      color: KICKSTARTER_PALETTE.chalk,
                    }}
                  >
                    {tier.pledge}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.display,
                    fontSize: 22,
                    fontWeight: 600,
                    color: KICKSTARTER_PALETTE.chalk,
                  }}
                >
                  {tier.title}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    color: KICKSTARTER_PALETTE.stone,
                    lineHeight: 1.45,
                  }}
                >
                  {tier.perk}
                </p>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Scene 7: Kickstarter Call to Action                                       */
/* -------------------------------------------------------------------------- */

export const KickstarterCtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = spring({
    frame: frame - 32,
    fps,
    config: { damping: 200, stiffness: 120 },
  });
  const btnScale = interpolate(pulse, [0, 1], [0.94, 1]);
  const glowRing = 0.35 + Math.sin(frame * 0.12) * 0.15;
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
          gap: 24,
          textAlign: "center",
          padding: 80,
          transform: `translate(${x * 0.3}px, ${y * 0.25}px)`,
        }}
      >
        {/* Kickstarter Live Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            backgroundColor: KICKSTARTER_PALETTE.kickstarterPillBg,
            border: `1px solid ${KICKSTARTER_PALETTE.kickstarterPillBorder}`,
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: KICKSTARTER_PALETTE.kickstarterGreen,
              boxShadow: `0 0 10px ${KICKSTARTER_PALETTE.kickstarterGreen}`,
            }}
          />
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: KICKSTARTER_PALETTE.kickstarterGreen,
            }}
          >
            Now Funding on Kickstarter
          </span>
        </div>

        <WordCascade
          delay={8}
          stagger={3}
          size={70}
          words={[
            { text: "Back" },
            { text: "LotFoundry." },
            { text: "Build" },
            { text: "your" },
            { text: "future.", glow: true, italic: true },
          ]}
        />

        <BodyLine delay={32} maxWidth={720}>
          Join our founding backers and get lifetime studio access, early parcel unlocks,
          and help bring automated housing feasibility to millions of homeowners.
        </BodyLine>

        {/* Primary Kickstarter Button */}
        <div
          style={{
            marginTop: 16,
            position: "relative",
            opacity: interpolate(frame, [36, 50], [0, 1], clamp),
            transform: `scale(${btnScale})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -14,
              borderRadius: 999,
              border: `1px solid ${KICKSTARTER_PALETTE.kickstarterGreen}`,
              opacity: glowRing,
            }}
          />
          <div
            style={{
              backgroundColor: KICKSTARTER_PALETTE.kickstarterGreen,
              color: KICKSTARTER_PALETTE.carbon,
              fontFamily: fonts.sans,
              fontSize: 24,
              fontWeight: 700,
              padding: "18px 52px",
              borderRadius: 999,
              letterSpacing: "-0.01em",
              boxShadow: `0 12px 40px rgba(5, 206, 120, 0.4)`,
            }}
          >
            Back This Project on Kickstarter
          </div>
        </div>

        <p
          style={{
            margin: "8px 0 0",
            opacity: interpolate(frame, [48, 62], [0, 1], clamp),
            fontFamily: fonts.mono,
            fontSize: 15,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: KICKSTARTER_PALETTE.stone,
          }}
        >
          lotfoundry.net · kickstarter.com
        </p>

        <p
          style={{
            margin: 0,
            opacity: interpolate(frame, [54, 68], [0, 1], clamp),
            fontFamily: fonts.mono,
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "#66665E",
          }}
        >
          Estimates based on municipal public records · Not legal guarantees
        </p>
      </AbsoluteFill>
    </SceneShell>
  );
};
