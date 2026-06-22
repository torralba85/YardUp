/** Props for {@link ControlBadge}. */
export interface ControlBadgeProps {
  /** Muted leading label. */
  label: string;
  /** Emphasized value text. */
  value: string;
}

/**
 * A small label/value chip used to surface a single control or stat in the
 * studio (e.g. a dimension or status readout).
 *
 * @param props - The {@link ControlBadgeProps}.
 */
export default function ControlBadge({ label, value }: ControlBadgeProps) {
  return (
    <div className="rounded-md border border-lf-hairline/80 bg-lf-card px-3 py-2 text-xs font-semibold text-lf-espresso shadow-sm">
      <span className="mr-2 text-lf-muted">{label}</span>
      {value}
    </div>
  );
}
