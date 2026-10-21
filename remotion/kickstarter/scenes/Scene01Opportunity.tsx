import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene01Opportunity: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow, cinematic push-in toward the backyard (1.0 -> 1.06 over 460 frames)
  const scale = interpolate(frame, [0, 460], [1.0, 1.06], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panY = interpolate(frame, [0, 460], [0, -18], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline stamp animation
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [15, 35], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle card animation
  const cardOpacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame sceneId="scene01" dark>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 2,
          border: `1px solid ${PALETTE.lineDark}`,
        }}
      >
        {/* Background Suburban Home & Backyard Image */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${scale}) translateY(${panY}px)`,
            transformOrigin: "50% 60%",
          }}
        >
          <Img
            src={staticFile("kickstarter-assets/images/backyard-life.webp")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Subtle cinematic gradient overlay to ground typography */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(22,22,22,0.4) 0%, rgba(22,22,22,0.1) 40%, rgba(22,22,22,0.75) 100%)",
            }}
          />
        </div>

        {/* Architectural Setback / Yard Guideline Overlay */}
        <div
          style={{
            position: "absolute",
            top: "22%",
            left: "14%",
            right: "14%",
            bottom: "24%",
            border: "1px dashed rgba(255, 91, 36, 0.45)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -12,
              left: 16,
              backgroundColor: "rgba(22, 22, 22, 0.8)",
              padding: "2px 10px",
              border: "1px solid rgba(255, 91, 36, 0.5)",
              fontFamily: fonts.display,
              fontSize: 11,
              fontWeight: 600,
              color: PALETTE.orange,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Rear Yard Feasibility Boundary
          </div>
        </div>

        {/* On-Screen Text Overlay */}
        <div
          style={{
            position: "absolute",
            top: 70,
            left: 70,
            maxWidth: 820,
            zIndex: 10,
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              backgroundColor: "rgba(22, 22, 22, 0.88)",
              border: `1px solid ${PALETTE.lineDark}`,
              padding: "28px 36px",
              boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 13,
                fontWeight: 700,
                color: PALETTE.orange,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              The Backyard Opportunity
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 56,
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                color: PALETTE.chalk,
              }}
            >
              What could your backyard become?
            </h1>
          </div>

          <div
            style={{
              marginTop: 18,
              opacity: cardOpacity,
              display: "flex",
              gap: 12,
            }}
          >
            {["Family Suite", "Home Office", "Rental Income"].map(
              (label, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "rgba(22, 22, 22, 0.82)",
                    border: `1px solid ${PALETTE.lineDark}`,
                    padding: "8px 16px",
                    fontFamily: fonts.sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: PALETTE.stone,
                  }}
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
