import React from "react";
import { Composition } from "remotion";
import { HeroLot } from "./HeroLot";
import { BlueHourLot } from "./nocturne/BlueHourLot";
import {
  BLUE_HOUR_DURATION_IN_FRAMES,
  BLUE_HOUR_FPS,
  BLUE_HOUR_HEIGHT,
  BLUE_HOUR_WIDTH,
} from "./nocturne/constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HeroLot"
        component={HeroLot}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="BlueHourLot"
        component={BlueHourLot}
        durationInFrames={BLUE_HOUR_DURATION_IN_FRAMES}
        fps={BLUE_HOUR_FPS}
        width={BLUE_HOUR_WIDTH}
        height={BLUE_HOUR_HEIGHT}
      />
    </>
  );
};
