import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fonts, PALETTE } from "../constants";
import { Captions } from "./Captions";

interface KickstarterFrameProps {
  children: React.ReactNode;
  sceneId: string;
  badgeText?: string;
  badgeVariant?: "prototype" | "mobile" | "disclaimer" | "default";
  background?: string;
  dark?: boolean;
}

export const KickstarterFrame: React.FC<KickstarterFrameProps> = ({
  children,
  sceneId,
  badgeText,
  badgeVariant = "default",
  background,
  dark = false,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle fade in and out for scene transitions
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  const bg = background || (dark ? PALETTE.carbon : PALETTE.chalk);

  // Badge styling
  let badgeBg = "rgba(22, 22, 22, 0.85)";
  let badgeBorder = PALETTE.lineDark;
  let badgeColor = PALETTE.chalk;
  let badgeDotColor = PALETTE.orange;

  if (badgeVariant === "prototype") {
    badgeBg = "rgba(22, 22, 22, 0.9)";
    badgeBorder = PALETTE.orange;
    badgeColor = PALETTE.chalk;
    badgeDotColor = PALETTE.orange;
  } else if (badgeVariant === "mobile") {
    badgeBg = "rgba(22, 22, 22, 0.9)";
    badgeBorder = "rgba(255, 91, 36, 0.8)";
    badgeColor = PALETTE.chalk;
    badgeDotColor = "#3B82F6"; // Electric blue dot for mobile dev
  } else if (badgeVariant === "disclaimer") {
    badgeBg = "rgba(22, 22, 22, 0.92)";
    badgeBorder = PALETTE.lineDark;
    badgeColor = PALETTE.stone;
    badgeDotColor = PALETTE.amber;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: bg, opacity }}>
      {/* Background architectural plat grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: dark
            ? `linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)`
            : `linear-gradient(to right, rgba(22, 22, 22, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(22, 22, 22, 0.04) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          pointerEvents: "none",
        }}
      />

      {/* Top Header Bar inside safe area */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 72,
          right: 72,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 40,
        }}
      >
        {/* Brand Lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Img
            src={staticFile("lotfoundry-mark-dark.svg")}
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: dark ? PALETTE.chalk : PALETTE.carbon,
                textTransform: "uppercase",
              }}
            >
              LotFoundry
            </span>
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                color: dark ? PALETTE.stone : "#6E6E68",
                textTransform: "uppercase",
              }}
            >
              ADU Feasibility Studio
            </span>
          </div>
        </div>

        {/* Required Disclosure/Status Badge */}
        {badgeText && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: badgeBg,
              border: `1px solid ${badgeBorder}`,
              borderRadius: 3,
              padding: "6px 14px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: badgeDotColor,
                boxShadow: `0 0 8px ${badgeDotColor}`,
              }}
            />
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: badgeColor,
              }}
            >
              {badgeText}
            </span>
          </div>
        )}
      </div>

      {/* Main Content inside 16:9 safe frame */}
      <div
        style={{
          position: "absolute",
          top: 96,
          bottom: 130,
          left: 72,
          right: 72,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
      </div>

      {/* Burned-in Subtitles */}
      <Captions sceneId={sceneId} />
    </AbsoluteFill>
  );
};
