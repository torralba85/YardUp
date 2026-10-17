import { useState } from "react";
import { Slider } from "@lotfoundry/ui";

// Slider renders its own FieldLabel; valueText is both the visible readout and
// the aria-valuetext screen readers announce.
export const Footprint = () => {
  const [sqft, setSqft] = useState(600);
  return (
    <div className="w-80">
      <Slider
        id="footprint"
        label="Footprint"
        valueText={`${sqft} sf`}
        min={150}
        max={1200}
        step={50}
        value={sqft}
        onChange={(event) => setSqft(Number(event.target.value))}
      />
    </div>
  );
};

export const WallHeight = () => {
  const [height, setHeight] = useState(10);
  return (
    <div className="w-80">
      <Slider
        id="wall-height"
        label="Wall height"
        valueText={`${height} ft`}
        min={8}
        max={16}
        step={1}
        value={height}
        onChange={(event) => setHeight(Number(event.target.value))}
      />
    </div>
  );
};

export const Disabled = () => (
  <div className="w-80">
    <Slider id="setback" label="Rear setback" valueText="4 ft" min={4} max={20} defaultValue={4} disabled />
  </div>
);
