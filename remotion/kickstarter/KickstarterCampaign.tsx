import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { PALETTE, SCENE_DURATIONS } from "./constants";
import { Scene01Opportunity } from "./scenes/Scene01Opportunity";
import { Scene02Problem } from "./scenes/Scene02Problem";
import { Scene03Intro } from "./scenes/Scene03Intro";
import { Scene04Demo } from "./scenes/Scene04Demo";
import { Scene05Limitation } from "./scenes/Scene05Limitation";
import { Scene06WhyKickstarter } from "./scenes/Scene06WhyKickstarter";
import { Scene07FundingGoal } from "./scenes/Scene07FundingGoal";
import { Scene08Founder } from "./scenes/Scene08Founder";
import { Scene09AiDisclosure } from "./scenes/Scene09AiDisclosure";
import { Scene10Closing } from "./scenes/Scene10Closing";

export const KickstarterCampaign: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.carbon }}>
      {/* Background Instrumental Music (subtle, warm ambient underneath narration) */}
      <Audio
        src={staticFile("kickstarter-assets/audio/bgm.mp3")}
        volume={0.35}
      />

      <Series>
        {/* Scene 1 — The opportunity (0 - 15.3s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene01}>
          <Audio src={staticFile("kickstarter-assets/vo/scene01.mp3")} />
          <Scene01Opportunity />
        </Series.Sequence>

        {/* Scene 2 — The problem (15.3 - 26.3s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene02}>
          <Audio src={staticFile("kickstarter-assets/vo/scene02.mp3")} />
          <Scene02Problem />
        </Series.Sequence>

        {/* Scene 3 — Introducing LotFoundry (26.3 - 33.7s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene03}>
          <Audio src={staticFile("kickstarter-assets/vo/scene03.mp3")} />
          <Scene03Intro />
        </Series.Sequence>

        {/* Scene 4 — Real product demonstration (33.7 - 63.7s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene04}>
          <Audio src={staticFile("kickstarter-assets/vo/scene04.mp3")} />
          <Scene04Demo />
        </Series.Sequence>

        {/* Scene 5 — Important limitation (63.7 - 76.0s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene05}>
          <Audio src={staticFile("kickstarter-assets/vo/scene05.mp3")} />
          <Scene05Limitation />
        </Series.Sequence>

        {/* Scene 6 — Why Kickstarter (76.0 - 98.7s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene06}>
          <Audio src={staticFile("kickstarter-assets/vo/scene06.mp3")} />
          <Scene06WhyKickstarter />
        </Series.Sequence>

        {/* Scene 7 — Funding goal (98.7 - 109.0s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene07}>
          <Audio src={staticFile("kickstarter-assets/vo/scene07.mp3")} />
          <Scene07FundingGoal />
        </Series.Sequence>

        {/* Scene 8 — Founder (109.0 - 120.0s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene08}>
          <Audio src={staticFile("kickstarter-assets/vo/scene08.mp3")} />
          <Scene08Founder />
        </Series.Sequence>

        {/* Scene 9 — AI disclosure (120.0 - 133.3s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene09}>
          <Audio src={staticFile("kickstarter-assets/vo/scene09.mp3")} />
          <Scene09AiDisclosure />
        </Series.Sequence>

        {/* Scene 10 — Closing (133.3 - 148.7s) */}
        <Series.Sequence durationInFrames={SCENE_DURATIONS.scene10}>
          <Audio src={staticFile("kickstarter-assets/vo/scene10.mp3")} />
          <Scene10Closing />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
