import React from "react";
import { AbsoluteFill } from "remotion";
import { LF } from "./theme";
import { AerialBase } from "./scene/AerialBase";
import { CadastralBoundary } from "./scene/CadastralBoundary";
import { BuildableEnvelope } from "./scene/BuildableEnvelope";
import { AduCast } from "./scene/AduCast";
import { Pin } from "./scene/Pin";
import { RentChip } from "./scene/RentChip";

export const HeroLot: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: LF.espresso }}>
      <AerialBase />
      <CadastralBoundary />
      <BuildableEnvelope />
      <AduCast />
      <Pin />
      <RentChip />
    </AbsoluteFill>
  );
};
