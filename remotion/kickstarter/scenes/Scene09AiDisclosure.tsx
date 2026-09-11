import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene09AiDisclosure: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame
      sceneId="scene09"
      badgeText="Kickstarter AI Policy Compliance"
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
        {/* Left Column: Sample AI Concept Render */}
        <div
          style={{
            flex: "1 1 45%",
            height: "85%",
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Img
            src={staticFile("kickstarter-assets/images/clean-gable.webp")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: "rgba(22, 22, 22, 0.9)",
              border: `1px solid ${PALETTE.lineDark}`,
              padding: "6px 12px",
              fontFamily: fonts.sans,
              fontSize: 12,
              color: PALETTE.stone,
            }}
          >
            Illustrative Concept Rendering · Not a completed construction photo
          </div>
        </div>

        {/* Right Column: Transparent Disclosure Card */}
        <div
          style={{
            flex: "1 1 55%",
            opacity,
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            padding: "36px 40px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 13,
              fontWeight: 700,
              color: PALETTE.stone,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Creative & Technical Transparency
          </div>

          <h2
            style={{
              margin: "0 0 18px 0",
              fontFamily: fonts.display,
              fontSize: 38,
              fontWeight: 600,
              color: PALETTE.chalk,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            AI is used as a development and creative tool
          </h2>

          <p
            style={{
              margin: 0,
              fontFamily: fonts.sans,
              fontSize: 17,
              color: PALETTE.stone,
              lineHeight: 1.6,
            }}
          >
            AI tools assist in software development routines, voiceover generation, and
            illustrative concept generation. Any architectural concepts shown are design
            illustrations and planning estimates, never misrepresented as real completed
            construction.
          </p>

          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: `1px solid ${PALETTE.lineDark}`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: PALETTE.orange, fontWeight: "bold" }}>•</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk }}>
                Edge-TTS narration disclosed under Kickstarter AI policy
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: PALETTE.orange, fontWeight: "bold" }}>•</span>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.chalk }}>
                ADU styles are conceptual models generated for feasibility guidance
              </span>
            </div>
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
