import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene04Demo: React.FC = () => {
  const frame = useCurrentFrame();

  // 5 Sub-stages across the 900 frames:
  // 1. Enter Property (0 - 150)
  // 2. Parcel & Setback Envelope (150 - 330)
  // 3. ADU Placement & Fit (330 - 510)
  // 4. Size & Roof Variations (510 - 700)
  // 5. Cost, Rent & Feasibility Report (700 - 900)

  let activeImg = "12-home.png";
  let stepNumber = "01";
  let stepTitle = "Enter Property Address";
  let stepSub = "Resolves lot geometry, jurisdiction & zoning boundaries";

  if (frame >= 700) {
    activeImg = "16-report400-full.png";
    stepNumber = "05";
    stepTitle = "Estimates & Feasibility Report";
    stepSub = "Construction budget range, monthly rental yield & project workbook";
  } else if (frame >= 510) {
    activeImg = "15-size400-full.png";
    stepNumber = "04";
    stepTitle = "Adjust Footprint & Sizing";
    stepSub = "Live 3D model recalculates envelope from 600 sq ft down to 400 sq ft";
  } else if (frame >= 330) {
    activeImg = "03-demo-fit.png";
    stepNumber = "03";
    stepTitle = "Place ADU in Usable Yard";
    stepSub = "Tests placement within allowable rear yard and setback buffers";
  } else if (frame >= 150) {
    activeImg = "11-full.png";
    stepNumber = "02";
    stepTitle = "Generate Parcel & Setbacks";
    stepSub = "Extracts existing home footprint and automated 4' setback lines";
  }

  // Crossfade between images
  const zoom = interpolate(frame, [0, 900], [1.0, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame
      sceneId="scene04"
      badgeText="Current working web prototype"
      badgeVariant="prototype"
      dark
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          gap: 28,
        }}
      >
        {/* Main Left: Real Web Prototype Screen Capture Window */}
        <div
          style={{
            flex: "1 1 72%",
            position: "relative",
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Mock Browser Header */}
          <div
            style={{
              height: 38,
              backgroundColor: "#161616",
              borderBottom: `1px solid ${PALETTE.lineDark}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
              <span
                style={{
                  marginLeft: 12,
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: PALETTE.stone,
                }}
              >
                LotFoundry Feasibility Studio — Web Prototype
              </span>
            </div>

            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 11,
                fontWeight: 600,
                color: PALETTE.orange,
                backgroundColor: "rgba(255, 91, 36, 0.12)",
                padding: "2px 8px",
                border: "1px solid rgba(255, 91, 36, 0.3)",
              }}
            >
              LIVE PROTOTYPE
            </div>
          </div>

          {/* Actual Prototype Screen Footage */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <Img
              src={staticFile(`kickstarter-assets/images/${activeImg}`)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transform: `scale(${zoom})`,
              }}
            />
          </div>
        </div>

        {/* Right Sidebar: Step Tracker & Architectural Highlights */}
        <div
          style={{
            flex: "1 1 28%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Active Step Indicator */}
          <div
            style={{
              backgroundColor: PALETTE.cardDark,
              border: `1px solid ${PALETTE.lineDark}`,
              padding: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.display,
                  fontSize: 12,
                  fontWeight: 700,
                  color: PALETTE.orange,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Step {stepNumber} of 05
              </span>
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 24,
                fontWeight: 600,
                color: PALETTE.chalk,
                lineHeight: 1.2,
              }}
            >
              {stepTitle}
            </h3>
            <p
              style={{
                margin: "8px 0 0 0",
                fontFamily: fonts.sans,
                fontSize: 14,
                color: PALETTE.stone,
                lineHeight: 1.45,
              }}
            >
              {stepSub}
            </p>
          </div>

          {/* Financial Feasibility Readout Cards (Animated during Phase 5) */}
          <div
            style={{
              backgroundColor: PALETTE.cardDark,
              border: `1px solid ${PALETTE.lineDark}`,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 11,
                fontWeight: 700,
                color: PALETTE.stone,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                borderBottom: `1px solid ${PALETTE.lineDark}`,
                paddingBottom: 6,
              }}
            >
              Preliminary Studio Metrics
            </div>

            <div>
              <div style={{ fontFamily: fonts.sans, fontSize: 12, color: PALETTE.stone }}>
                Est. Construction Range
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: PALETTE.chalk,
                }}
              >
                $230,000 – $290,000
              </div>
            </div>

            <div>
              <div style={{ fontFamily: fonts.sans, fontSize: 12, color: PALETTE.stone }}>
                Est. Rental Income
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: PALETTE.chalk,
                }}
              >
                $2,350 / mo
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontFamily: fonts.sans, fontSize: 13, color: PALETTE.stone }}>
                Project Payback
              </span>
              <span
                style={{
                  fontFamily: fonts.display,
                  fontSize: 14,
                  fontWeight: 600,
                  color: PALETTE.green,
                }}
              >
                ~12 Years · Feasible
              </span>
            </div>
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
