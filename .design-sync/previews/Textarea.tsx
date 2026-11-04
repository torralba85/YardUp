import { FieldLabel, Textarea } from "@lotfoundry/ui";

export const Default = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="notes">Notes for your builder</FieldLabel>
    <Textarea
      id="notes"
      rows={4}
      placeholder="Access is from the alley. We want the backyard home for a parent."
    />
  </div>
);

export const Filled = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="feedback">What could be clearer?</FieldLabel>
    <Textarea
      id="feedback"
      rows={4}
      defaultValue="The setback numbers make sense. I wasn't sure whether the cost includes the utility trench."
    />
  </div>
);

export const Invalid = () => (
  <div className="flex w-80 flex-col gap-2">
    <FieldLabel htmlFor="message">Message</FieldLabel>
    <Textarea id="message" rows={3} aria-invalid="true" aria-describedby="message-error" />
    <p id="message-error" role="alert" className="lf-caption text-status-blocked">
      Write a short message before sending.
    </p>
  </div>
);
