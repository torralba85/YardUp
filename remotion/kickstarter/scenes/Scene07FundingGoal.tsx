import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

const BUDGET_ITEMS = [
  { item: "Mobile build completion", amount: "$2,400", pct: "40%" },
  { item: "Physical test devices (Android & iPhone)", amount: "$1,200", pct: "20%" },
  { item: "Accessibility & QA pass (WCAG 2.1 AA)", amount: "$900", pct: "15%" },
  { item: "Store enrollment & release setup", amount: "$600", pct: "10%" },
  { item: "Backer reward production & lookup cards", amount: "$400", pct: "7%" },
  { item: "Kickstarter & payment processing fees", amount: "$500", pct: "8%" },
];

export const Scene07FundingGoal: React.FC = () => {
  const frame = useCurrentFrame();

  const countVal = Math.min(
    Math.round(interpolate(frame, [10, 45], [0, 6000], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })),
    6000,
  );

  return (
    <KickstarterFrame sceneId="scene07" dark>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          gap: 40,
          alignItems: "center",
        }}
      >
        {/* Left Column: Big Typographic Goal Card */}
        <div
          style={{
            flex: "1 1 45%",
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 14,
              fontWeight: 700,
              color: PALETTE.orange,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Campaign Scope & Target
          </div>

          <h2
            style={{
              margin: 0,
              fontFamily: fonts.display,
              fontSize: 64,
              fontWeight: 700,
              color: PALETTE.chalk,
              letterSpacing: "-0.03em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Goal: ${countVal.toLocaleString("en-US")}
          </h2>

          <div
            style={{
              marginTop: 8,
              fontFamily: fonts.display,
              fontSize: 26,
              fontWeight: 600,
              color: PALETTE.stone,
            }}
          >
            A focused mobile release
          </div>

          <p
            style={{
              margin: "18px 0 0 0",
              fontFamily: fonts.sans,
              fontSize: 15,
              color: PALETTE.stone,
              lineHeight: 1.5,
              borderTop: `1px solid ${PALETTE.lineDark}`,
              paddingTop: 16,
            }}
          >
            Every dollar is allocated to finite development deliverables, physical device
            matrix verification, and store preparation. Zero funds for ongoing operations.
          </p>
        </div>

        {/* Right Column: Clean Architectural Line-Item Budget */}
        <div
          style={{
            flex: "1 1 55%",
            backgroundColor: PALETTE.cardDark,
            border: `1px solid ${PALETTE.lineDark}`,
            padding: "28px 32px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 12,
              fontWeight: 700,
              color: PALETTE.stone,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              paddingBottom: 10,
              borderBottom: `1px solid ${PALETTE.lineDark}`,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Budget Breakdown (One-Time Deliverables)</span>
            <span>Allocation</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {BUDGET_ITEMS.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom:
                    i < BUDGET_ITEMS.length - 1 ? `1px solid rgba(68, 68, 63, 0.4)` : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 14,
                    color: PALETTE.chalk,
                    fontWeight: 500,
                  }}
                >
                  {row.item}
                </span>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 12,
                      color: PALETTE.stone,
                    }}
                  >
                    {row.pct}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.display,
                      fontSize: 16,
                      fontWeight: 600,
                      color: PALETTE.chalk,
                      width: 60,
                      textAlign: "right",
                    }}
                  >
                    {row.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: `2px solid ${PALETTE.orange}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 15,
                fontWeight: 700,
                color: PALETTE.chalk,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Total Budget
            </span>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: 700,
                color: PALETTE.orange,
              }}
            >
              $6,000
            </span>
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
