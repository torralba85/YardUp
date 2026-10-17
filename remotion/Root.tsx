import React from "react";
import { Composition } from "remotion";
import { HeroLot } from "./HeroLot";
import { PlayFilm, FILM_DURATION, FILM_FPS } from "./play-film/PlayFilm";
import { LotFoundryDemo } from "./demo/LotFoundryDemo";
import {
  DEMO_DURATION_IN_FRAMES,
  DEMO_FPS,
  DEMO_HEIGHT,
  DEMO_WIDTH,
} from "./demo/constants";
import {
  PLAY_DURATION_IN_FRAMES,
  PLAY_FPS,
  PLAY_HEIGHT,
  PLAY_WIDTH,
  PlayPromo,
} from "./play/PlayPromo";
import { KickstarterCampaign } from "./kickstarter/KickstarterCampaign";
import {
  FPS,
  HEIGHT,
  TOTAL_DURATION_IN_FRAMES,
  WIDTH,
} from "./kickstarter/constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LotFoundryPlayFilm"
        component={PlayFilm}
        durationInFrames={FILM_DURATION}
        fps={FILM_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroLot"
        component={HeroLot}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LotFoundryDemo"
        component={LotFoundryDemo}
        durationInFrames={DEMO_DURATION_IN_FRAMES}
        fps={DEMO_FPS}
        width={DEMO_WIDTH}
        height={DEMO_HEIGHT}
      />
      <Composition
        id="LotFoundryKickstarter"
        component={KickstarterCampaign}
        durationInFrames={TOTAL_DURATION_IN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="LotFoundryPlayPromo"
        component={PlayPromo}
        durationInFrames={PLAY_DURATION_IN_FRAMES}
        fps={PLAY_FPS}
        width={PLAY_WIDTH}
        height={PLAY_HEIGHT}
      />
    </>
  );
};
