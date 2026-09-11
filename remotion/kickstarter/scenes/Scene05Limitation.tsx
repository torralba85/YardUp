import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene05Limitation: React.FC = () => {
  const frame = useCurrentFrame();

  const cardOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardScale = interpolate(frame, [10, 30], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame
      sceneId="scene05"
      badgeText="Important Limitation & Verification"
      badgeVariant="disclaimer"
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
        {/* Left: Background Prototype Studio snapshot */}
        <div
          style={{
            flex: "1 1 45%",
            height: "90%",
            position: "relative",
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            overflow: "hidden",
            opacity: 0.8,
          }}
        >
          <Img
            src={staticFile("kickstarter-assets/images/16-report400-full.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(22, 22, 22, 0.4)",
            }}
          />
        </div>

        {/* Right: Clean Architectural Disclaimer Card */}
        <div
          style={{
            flex: "1 1 55%",
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            padding: "36px 44px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          {/* Accent Line */}
          <div
            style={{
              width: 48,
              height: 3,
              backgroundColor: PALETTE.amber,
              marginBottom: 20,
            }}
          />

          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 13,
              fontWeight: 700,
              color: PALETTE.amber,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Planning Scope & Verification
          </div>

          <h2
            style={{
              margin: "0 0 20px 0",
              fontFamily: fonts.display,
              fontSize: 40,
              fontWeight: 600,
              color: PALETTE.chalk,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            A starting point — not permission to build
          </h2>

          <p
            style={{
              margin: 0,
              fontFamily: fonts.sans,
              fontSize: 18,
              color: PALETTE.stone,
              lineHeight: 1.6,
            }}
          >
            LotFoundry is an early feasibility exploratory tool. It does not replace an
            architect, licensed general contractor, structural engineer, or your local
            municipal planning department.
          </p>

          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: `1px solid ${PALETTE.lineDark}`,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: PALETTE.amber,
                }}
              />
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk }}>
                Site survey required
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: PALETTE.amber,
                }}
              />
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk }}>
                Local zoning verification
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: PALETTE.amber,
                }}
              />
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk }}>
                Title 24 & engineering review
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: PALETTE.amber,
                }}
              />
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk }}>
                Verified contractor bids
              </span>
            </div>
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
