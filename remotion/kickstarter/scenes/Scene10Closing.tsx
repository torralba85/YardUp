import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { fonts, PALETTE } from "../constants";
import { KickstarterFrame } from "../components/KickstarterFrame";

export const Scene10Closing: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow push in
  const zoom = interpolate(frame, [0, 460], [1.0, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Crossfade from before (plain backyard) to after (ADU feasibility overlay)
  // Crossfade occurs smoothly between frames 80 and 170
  const afterOpacity = interpolate(frame, [80, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // End card reveal starting around frame 200
  const cardOpacity = interpolate(frame, [200, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardY = interpolate(frame, [200, 230], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KickstarterFrame sceneId="scene10" dark>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          border: `1px solid ${PALETTE.lineDark}`,
        }}
      >
        {/* Layer 1: Before - Suburban Backyard */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${zoom})`,
          }}
        >
          <Img
            src={staticFile("kickstarter-assets/images/parcel-before.webp")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Layer 2: After - LotFoundry Property Visualization Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: afterOpacity,
            transform: `scale(${zoom})`,
          }}
        >
          <Img
            src={staticFile("kickstarter-assets/images/parcel-after.webp")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Darkening tint for readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(22, 22, 22, 0.45)",
          }}
        />

        {/* Closing CTA Card */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              opacity: cardOpacity,
              transform: `translateY(${cardY}px)`,
              backgroundColor: "rgba(22, 22, 22, 0.94)",
              border: `1px solid ${PALETTE.lineDark}`,
              padding: "44px 56px",
              maxWidth: 880,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
              backdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Logo */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: "hidden",
                border: `1px solid ${PALETTE.lineDark}`,
                marginBottom: 20,
              }}
            >
              <Img
                src={staticFile("lotfoundry-mark-dark.svg")}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <h1
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 48,
                fontWeight: 600,
                color: PALETTE.chalk,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              See What Your Property Could Become
            </h1>

            <p
              style={{
                margin: "12px 0 24px 0",
                fontFamily: fonts.sans,
                fontSize: 20,
                color: PALETTE.stone,
                maxWidth: 620,
              }}
            >
              Help bring LotFoundry to iPhone and Android.
            </p>

            <div
              style={{
                backgroundColor: PALETTE.orange,
                color: PALETTE.carbon,
                fontFamily: fonts.display,
                fontSize: 20,
                fontWeight: 700,
                padding: "16px 36px",
                borderRadius: 3,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                boxShadow: "0 8px 24px rgba(255, 91, 36, 0.35)",
              }}
            >
              Back LotFoundry on Kickstarter
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                gap: 20,
                fontFamily: fonts.sans,
                fontSize: 13,
                color: PALETTE.stone,
              }}
            >
              <span>Goal: $6,000</span>
              <span>•</span>
              <span>All Tiers Include Beta Access + Address Lookup</span>
              <span>•</span>
              <span>July 2027 Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </KickstarterFrame>
  );
};
