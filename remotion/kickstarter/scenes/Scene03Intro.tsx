import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene03Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const markSpring = spring({
    frame,
    fps,
    config: { damping: 180, stiffness: 140 },
  });
  const markScale = interpolate(markSpring, [0, 1], [0.85, 1]);

  const textOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [15, 30], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const previewOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame sceneId="scene03" dark>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          gap: 28,
        }}
      >
        {/* Brand Reveal Tile */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            transform: `scale(${markScale})`,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: `0 18px 48px rgba(0,0,0,0.6), 0 0 32px ${PALETTE.orange}22`,
              border: `1px solid ${PALETTE.lineDark}`,
            }}
          >
            <Img
              src={staticFile("lotfoundry-mark-dark.svg")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <div
            style={{
              opacity: textOpacity,
              transform: `translateY(${textY}px)`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 16,
                fontWeight: 700,
                color: PALETTE.orange,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Meet LotFoundry
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 64,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: PALETTE.chalk,
              }}
            >
              AI-assisted ADU feasibility
            </h1>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 22,
                color: PALETTE.stone,
                marginTop: 8,
              }}
            >
              An ADU feasibility studio designed to make the first step easier
            </div>
          </div>
        </div>

        {/* Floating Architectural Studio Preview Thumbnail */}
        <div
          style={{
            opacity: previewOpacity,
            display: "flex",
            alignItems: "center",
            gap: 16,
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            padding: "8px 24px",
            borderRadius: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: PALETTE.green,
              boxShadow: `0 0 8px ${PALETTE.green}`,
            }}
          />
          <span
            style={{
              fontFamily: fonts.display,
              fontSize: 14,
              fontWeight: 600,
              color: PALETTE.chalk,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            3D Parcel Engine · Local Zoning · Instant Estimates
          </span>
        </div>
      </div>
    </KickstarterFrame>
  );
};
