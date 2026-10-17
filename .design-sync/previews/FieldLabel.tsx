import { FieldLabel, Input, Select } from "@lotfoundry/ui";

// The kicker-voice control label. Always wire htmlFor to the control's id.
export const Default = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="lot-address">Lot address</FieldLabel>
    <Input id="lot-address" placeholder="Street, city, state" />
  </div>
);

// `value` adds a right-aligned tabular readout of the live figure the control sets.
export const WithValue = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="bedrooms" value="1 BR · 600 sf">
      Layout
    </FieldLabel>
    <Select id="bedrooms" defaultValue="1">
      <option value="0">Studio · 400 sf</option>
      <option value="1">1 bedroom · 600 sf</option>
      <option value="2">2 bedrooms · 800 sf</option>
    </Select>
  </div>
);

export const Stacked = () => (
  <div className="flex w-80 flex-col gap-4">
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor="rent" value="$2,050 /mo">
        Estimated rent
      </FieldLabel>
      <Input id="rent" defaultValue="2050" inputMode="numeric" />
    </div>
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor="build" value="$186,000">
        Build budget
      </FieldLabel>
      <Input id="build" defaultValue="186000" inputMode="numeric" />
    </div>
  </div>
);
