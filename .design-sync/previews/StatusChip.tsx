import { StatusChip } from "@lotfoundry/ui";

// Icon + label always; status never rides on colour alone.
export const Statuses = () => (
  <div className="flex flex-wrap items-center gap-2">
    <StatusChip status="clear" />
    <StatusChip status="review" />
    <StatusChip status="blocked" />
    <StatusChip status="info" />
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-2">
    <StatusChip status="clear" size="sm" />
    <StatusChip status="clear" size="md" />
  </div>
);

export const CustomLabels = () => (
  <div className="flex flex-wrap items-center gap-2">
    <StatusChip status="clear" label="ADU allowed" size="md" />
    <StatusChip status="review" label="Confirm locally" size="md" />
    <StatusChip status="blocked" label="Over coverage" size="md" />
    <StatusChip status="info" label="Demo data" size="md" />
  </div>
);

// In a constraint row, as on the Rules & Fit panel.
export const InARow = () => (
  <div className="flex w-80 items-start justify-between gap-3 border-b border-lot-line py-3">
    <div>
      <p className="text-sm font-semibold text-lot-ink">Sewer / utility access</p>
      <p className="lf-caption text-lot-stone">Not in this estimate. Confirm lateral capacity locally.</p>
    </div>
    <StatusChip status="review" />
  </div>
);
