import { useState } from "react";
import { FieldLabel, Segmented } from "@lotfoundry/ui";

// A controlled WAI-ARIA radio group: keep the value in state and pass onChange.
export const Roof = () => {
  const [roof, setRoof] = useState("shed");
  return (
    <div className="flex w-80 flex-col gap-2">
      <FieldLabel id="roof-label">Roof</FieldLabel>
      <Segmented
        aria-labelledby="roof-label"
        value={roof}
        onChange={setRoof}
        options={[
          { value: "flat", label: "Flat" },
          { value: "shed", label: "Shed" },
          { value: "gable", label: "Gable" },
        ]}
      />
    </div>
  );
};

export const RentBasis = () => {
  const [basis, setBasis] = useState("typical");
  return (
    <div className="flex w-80 flex-col gap-2">
      <FieldLabel id="rent-label">Rent basis</FieldLabel>
      <Segmented
        aria-labelledby="rent-label"
        value={basis}
        onChange={setBasis}
        options={[
          { value: "conservative", label: "Conservative" },
          { value: "typical", label: "Typical" },
          { value: "strong", label: "Strong" },
        ]}
      />
    </div>
  );
};

export const TwoWay = () => {
  const [type, setType] = useState("detached");
  return (
    <div className="w-64">
      <Segmented
        aria-label="Backyard home type"
        value={type}
        onChange={setType}
        options={[
          { value: "detached", label: "Detached" },
          { value: "attached", label: "Attached" },
        ]}
      />
    </div>
  );
};
