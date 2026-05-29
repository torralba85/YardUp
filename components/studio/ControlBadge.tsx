export interface ControlBadgeProps {
  label: string;
  value: string;
}

export default function ControlBadge({ label, value }: ControlBadgeProps) {
  return (
    <div className="rounded-md border border-lf-hairline/80 bg-lf-card/90 px-3 py-2 text-xs font-semibold text-lf-espresso shadow-sm backdrop-blur">
      <span className="mr-2 text-lf-muted">{label}</span>
      {value}
    </div>
  );
}
