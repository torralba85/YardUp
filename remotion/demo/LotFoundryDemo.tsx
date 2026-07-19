import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { DEMO_PALETTE, SCENES } from "./constants";
import {
  BrandScene,
  CtaScene,
  FlowScene,
  HookScene,
  MoneyScene,
  ProblemScene,
  ReportScene,
  StudioScene,
} from "./scenes";

/**
 * LotFoundry product demo (~46s @ 30fps, with short scene overlaps).
 * Dark campaign palette + Fraunces display; settle-and-stamp motion.
 */
export const LotFoundryDemo: React.FC<{ voiceoverSrc?: string }> = ({
  voiceoverSrc,
}) => {
  const overlap = -12;

  return (
    <AbsoluteFill style={{ backgroundColor: DEMO_PALETTE.ink }}>
      {voiceoverSrc ? <Audio src={staticFile(voiceoverSrc)} /> : null}
      <Series>
        <Series.Sequence durationInFrames={SCENES.brand} premountFor={18}>
          <BrandScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.hook}
          premountFor={18}
        >
          <HookScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.problem}
          premountFor={18}
        >
          <ProblemScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.flow}
          premountFor={18}
        >
          <FlowScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.money}
          premountFor={18}
        >
          <MoneyScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.studio}
          premountFor={18}
        >
          <StudioScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.report}
          premountFor={18}
        >
          <ReportScene />
        </Series.Sequence>
        <Series.Sequence
          offset={overlap}
          durationInFrames={SCENES.cta}
          premountFor={18}
        >
          <CtaScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
