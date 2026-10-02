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
    <div className="rounded-none border border-lot-line bg-lot-chalk px-3 py-1.5 text-xs font-semibold text-lot-ink shadow-none">
      <span className="mr-2 font-sans text-[11px] uppercase tracking-[0.08em] text-lot-stone">{label}</span>
      {value}
    </div>
  );
}
