import React from "react";
import { Composition } from "remotion";
import { HeroLot } from "./HeroLot";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroLot"
      component={HeroLot}
      durationInFrames={180}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
