import { FieldLabel, Select } from "@lotfoundry/ui";

export const Default = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="finish">Exterior finish</FieldLabel>
    <Select id="finish" defaultValue="fiber-cement">
      <option value="stucco">Stucco</option>
      <option value="fiber-cement">Fiber cement siding</option>
      <option value="wood">Wood siding</option>
    </Select>
  </div>
);

export const Placeholder = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="role">I am a</FieldLabel>
    <Select id="role" defaultValue="">
      <option value="" disabled>
        Choose one
      </option>
      <option value="owner">Homeowner</option>
      <option value="builder">Builder</option>
      <option value="agent">Real estate agent</option>
    </Select>
  </div>
);

export const Disabled = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="market">Market</FieldLabel>
    <Select id="market" defaultValue="sd" disabled>
      <option value="sd">San Diego, CA</option>
    </Select>
  </div>
);
