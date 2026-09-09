import React from "react";
import { AbsoluteFill, Series } from "remotion";
import {
  KICKSTARTER_PALETTE,
  KICKSTARTER_SCENES,
  OVERLAP_FRAMES,
} from "./constants";
import {
  KickstarterBrandScene,
  KickstarterCtaScene,
  KickstarterFlowScene,
  KickstarterHookScene,
  KickstarterMissionScene,
  KickstarterProblemScene,
  KickstarterStudioScene,
} from "./scenes";

/**
 * LotFoundry Kickstarter Campaign Video (~39s @ 30fps).
 * Explains LotFoundry, what it does, how to use it, why Kickstarter, and backer reward tiers.
 */
export const KickstarterDemo: React.FC = () => {
  const overlap = -OVERLAP_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: KICKSTARTER_PALETTE.carbon }}>
      <Series>
        {/* 01: Brand Launch with Kickstarter badge */}
        <Series.Sequence
          durationInFrames={KICKSTARTER_SCENES.brand}
          premountFor={18}
        >
          <KickstarterBrandScene />
        </Series.Sequence>

        {/* 02: The Backyard Question */}
        <Series.Sequence
          offset={overlap}
          durationInFrames={KICKSTARTER_SCENES.hook}
          premountFor={18}
        >
          <KickstarterHookScene />
        </Series.Sequence>

        {/* 03: The Problem vs LotFoundry */}
        <Series.Sequence
          offset={overlap}
          durationInFrames={KICKSTARTER_SCENES.problem}
          premountFor={18}
        >
          <KickstarterProblemScene />
        </Series.Sequence>

        {/* 04: The 4-Step Workflow */}
        <Series.Sequence
          offset={overlap}
          durationInFrames={KICKSTARTER_SCENES.flow}
          premountFor={18}
        >
          <KickstarterFlowScene />
        </Series.Sequence>

        {/* 05: 3D Feasibility Studio Visual */}
        <Series.Sequence
          offset={overlap}
          durationInFrames={KICKSTARTER_SCENES.studio}
          premountFor={18}
        >
          <KickstarterStudioScene />
        </Series.Sequence>

        {/* 06: Why Kickstarter & Backer Tiers */}
        <Series.Sequence
          offset={overlap}
          durationInFrames={KICKSTARTER_SCENES.mission}
          premountFor={18}
        >
          <KickstarterMissionScene />
        </Series.Sequence>

        {/* 07: Kickstarter Call-to-Action */}
        <Series.Sequence
          offset={overlap}
          durationInFrames={KICKSTARTER_SCENES.cta}
          premountFor={18}
        >
          <KickstarterCtaScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
