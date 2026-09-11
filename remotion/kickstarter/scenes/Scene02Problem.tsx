import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

const KEYWORDS = [
  { term: "Zoning", delay: 10, code: "MUM-1 / R-1-8", desc: "Local ADU allowances & floor area ratio limits" },
  { term: "Setbacks", delay: 38, code: "4' Rear / 4' Side", desc: "Mandated building offsets from property boundaries" },
  { term: "Permits", delay: 66, code: "Title 24 / Submittal", desc: "Engineering review, plan checks & clearance friction" },
  { term: "Construction costs", delay: 94, code: "$380–$550 / sqft", desc: "Materials, foundation, utility trenching & labor" },
  { term: "Lot size", delay: 122, code: "6,400 sq ft lot", desc: "Available buildable yard footprint calculation" },
];

export const Scene02Problem: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <KickstarterFrame sceneId="scene02" dark>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          gap: 32,
        }}
      >
        {/* Left Column: Architectural Map & Rules Inspection */}
        <div
          style={{
            flex: "1 1 50%",
            position: "relative",
            border: `1px solid ${PALETTE.lineDark}`,
            backgroundColor: PALETTE.cardDark,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${PALETTE.lineDark}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 12,
                fontWeight: 700,
                color: PALETTE.stone,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Parcel Analysis: Complexity Friction
            </span>
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                color: PALETTE.orange,
                fontWeight: 600,
              }}
            >
              5 Key Unknowns
            </span>
          </div>

          {/* Background image preview with technical grid overlay */}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <Img
              src={staticFile("kickstarter-assets/images/01-rules.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.65,
              }}
            />
            {/* Setback dimension lines */}
            <div
              style={{
                position: "absolute",
                inset: "15%",
                border: `2px dashed ${PALETTE.orange}`,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -14,
                  right: 12,
                  backgroundColor: PALETTE.carbon,
                  padding: "2px 8px",
                  border: `1px solid ${PALETTE.orange}`,
                  fontFamily: fonts.display,
                  fontSize: 11,
                  color: PALETTE.chalk,
                }}
              >
                4 ft setback boundary
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cascading Problem Keywords */}
        <div
          style={{
            flex: "1 1 50%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 13,
                fontWeight: 700,
                color: PALETTE.orange,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              The Early Friction
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 38,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: PALETTE.chalk,
                lineHeight: 1.15,
              }}
            >
              Dozens of questions before talking to a builder
            </h2>
          </div>

          {KEYWORDS.map((item, i) => {
            const local = frame - item.delay;
            const itemOpacity = interpolate(local, [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const itemX = interpolate(local, [0, 12], [24, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                  backgroundColor: PALETTE.cardDark,
                  border: `1px solid ${PALETTE.lineDark}`,
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 14,
                      fontWeight: 700,
                      color: PALETTE.orange,
                      width: 20,
                    }}
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 22,
                        fontWeight: 600,
                        color: PALETTE.chalk,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {item.term}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 12,
                        color: PALETTE.stone,
                        marginTop: 2,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 13,
                    color: PALETTE.stone,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    padding: "4px 10px",
                    borderRadius: 2,
                  }}
                >
                  {item.code}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </KickstarterFrame>
  );
};
