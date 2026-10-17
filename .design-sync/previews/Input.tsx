import { FieldLabel, Input } from "@lotfoundry/ui";

// Inputs pair with a kicker-voice FieldLabel wired through htmlFor.
export const Default = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="address">Property address</FieldLabel>
    <Input id="address" placeholder="1234 Oak Street, San Diego, CA" />
  </div>
);

export const Filled = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="name">Display name</FieldLabel>
    <Input id="name" defaultValue="Andrea Morales" />
  </div>
);

// aria-invalid turns the stone boundary blocked red; the message carries the meaning.
export const Invalid = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input id="email" type="email" defaultValue="andrea@" aria-invalid="true" aria-describedby="email-error" />
    <p id="email-error" role="alert" className="lf-caption text-status-blocked">
      Enter a complete email address.
    </p>
  </div>
);

export const Disabled = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="apn">Parcel number</FieldLabel>
    <Input id="apn" defaultValue="453-221-14-00" disabled />
  </div>
);
