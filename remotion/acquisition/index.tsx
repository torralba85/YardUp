import React from "react";
import { Composition, registerRoot } from "remotion";
import { FinancingDemo, SizeDemo } from "./AcquisitionDemos";

function AcquisitionRoot() {
  return <>
    <Composition id="AduSizeComparison" component={SizeDemo} durationInFrames={720} fps={30} width={1080} height={1920}/>
    <Composition id="AduFinancing" component={FinancingDemo} durationInFrames={720} fps={30} width={1080} height={1920}/>
  </>;
}

registerRoot(AcquisitionRoot);
