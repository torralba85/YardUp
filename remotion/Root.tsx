import React from "react";
import { Composition } from "remotion";
import { HeroLot } from "./HeroLot";
import { LotFoundryDemo } from "./demo/LotFoundryDemo";
import {
  DEMO_DURATION_IN_FRAMES,
  DEMO_FPS,
  DEMO_HEIGHT,
  DEMO_WIDTH,
} from "./demo/constants";

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
        id="LotFoundryDemo"
        component={LotFoundryDemo}
        durationInFrames={DEMO_DURATION_IN_FRAMES}
        fps={DEMO_FPS}
        width={DEMO_WIDTH}
        height={DEMO_HEIGHT}
      />
    </>
  );
};
