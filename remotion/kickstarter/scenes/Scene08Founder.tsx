import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene08Founder: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [10, 28], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame sceneId="scene08" dark>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          style={{
            opacity,
            transform: `translateY(${y}px)`,
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            padding: "48px 56px",
            maxWidth: 820,
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            position: "relative",
          }}
        >
          {/* Top accent badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${PALETTE.lineDark}`,
              }}
            >
              <Img
                src={staticFile("lotfoundry-mark-dark.svg")}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 12,
                  fontWeight: 700,
                  color: PALETTE.orange,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                }}
              >
                Project Leadership & Delivery
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: PALETTE.stone,
                }}
              >
                Direct Developer Accountability
              </div>
            </div>
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: fonts.display,
              fontSize: 52,
              fontWeight: 600,
              color: PALETTE.chalk,
              letterSpacing: "-0.03em",
            }}
          >
            Andrew Torralba
          </h1>

          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              fontWeight: 600,
              color: PALETTE.orange,
              marginTop: 6,
              marginBottom: 24,
            }}
          >
            Founder — LotFoundry
          </div>

          <p
            style={{
              margin: 0,
              fontFamily: fonts.sans,
              fontSize: 18,
              color: PALETTE.chalk,
              lineHeight: 1.6,
              borderTop: `1px solid ${PALETTE.lineDark}`,
              paddingTop: 20,
            }}
          >
            “I built the prototype myself, and I’ll be responsible for building, testing,
            and delivering the mobile release directly to our backers and stores.”
          </p>

          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: fonts.display, fontSize: 13, color: PALETTE.stone }}>
                Location:
              </span>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk, fontWeight: 600 }}>
                San Diego, California
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: fonts.display, fontSize: 13, color: PALETTE.stone }}>
                Deliverable:
              </span>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk, fontWeight: 600 }}>
                First Public Mobile Release
              </span>
            </div>
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
