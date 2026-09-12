import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

const DELIVERABLES = [
  { title: "Touch-first interface", desc: "Gestural 3D camera, bottom sheets & haptic controls", delay: 30 },
  { title: "Mobile 3D optimization", desc: "WebGL performance tuning for physical Android & iOS chipsets", delay: 90 },
  { title: "Accounts & saved projects", desc: "Cross-device persistence for multi-property scenarios", delay: 150 },
  { title: "Accessibility & testing", desc: "WCAG 2.1 AA audits, screen readers & varied screen densities", delay: 210 },
  { title: "App Store & Google Play submission", desc: "Release engineering, store signing & sandbox verification", delay: 270 },
];

export const Scene06WhyKickstarter: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <KickstarterFrame
      sceneId="scene06"
      badgeText="Mobile release in development — funded by this campaign"
      badgeVariant="mobile"
      dark
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          gap: 36,
          alignItems: "center",
        }}
      >
        {/* Left Column: Physical Phone / Tablet Testing Mockups */}
        <div
          style={{
            flex: "1 1 45%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          {/* Conceptual Mobile Device Frame */}
          <div
            style={{
              width: 320,
              height: 560,
              borderRadius: 36,
              border: `4px solid #333330`,
              backgroundColor: "#000",
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7), 0 0 40px rgba(255,91,36,0.15)",
            }}
          >
            {/* Phone Screen Screenshot */}
            <Img
              src={staticFile("kickstarter-assets/images/phone-studio.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Clear Conceptual Label on Device */}
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: 20,
                right: 20,
                backgroundColor: "rgba(22, 22, 22, 0.92)",
                border: "1px solid rgba(255, 91, 36, 0.6)",
                padding: "8px 12px",
                borderRadius: 4,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.display,
                  fontSize: 10,
                  fontWeight: 700,
                  color: PALETTE.orange,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                In Development · Mobile Release Target
              </span>
            </div>
          </div>

          {/* Device Testing Badges */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 18,
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 11,
                color: PALETTE.stone,
                border: `1px solid ${PALETTE.lineDark}`,
                padding: "4px 10px",
                backgroundColor: PALETTE.cardDark,
              }}
            >
              iOS Test Matrix
            </span>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 11,
                color: PALETTE.stone,
                border: `1px solid ${PALETTE.lineDark}`,
                padding: "4px 10px",
                backgroundColor: PALETTE.cardDark,
              }}
            >
              Android Physical Hardware
            </span>
          </div>
        </div>

        {/* Right Column: What Kickstarter Funds Checklist */}
        <div
          style={{
            flex: "1 1 55%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 13,
                fontWeight: 700,
                color: PALETTE.orange,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Scoped Campaign Deliverable
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 42,
                fontWeight: 600,
                color: PALETTE.chalk,
                letterSpacing: "-0.02em",
              }}
            >
              What Kickstarter funds
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {DELIVERABLES.map((item, i) => {
              const local = frame - item.delay;
              const opacity = interpolate(local, [0, 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const x = interpolate(local, [0, 12], [20, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <div
                  key={i}
                  style={{
                    opacity,
                    transform: `translateX(${x}px)`,
                    backgroundColor: PALETTE.cardDark,
                    border: `1px solid ${PALETTE.lineDark}`,
                    padding: "12px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 2,
                      border: `1px solid ${PALETTE.orange}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: fonts.display,
                      fontSize: 12,
                      fontWeight: 700,
                      color: PALETTE.orange,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 18,
                        fontWeight: 600,
                        color: PALETTE.chalk,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 13,
                        color: PALETTE.stone,
                        marginTop: 2,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
