export interface ControlBadgeProps {
  label: string;
  value: string;
}

export default function ControlBadge({ label, value }: ControlBadgeProps) {
  return (
    <div className="rounded-md border border-white/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
      <span className="mr-2 text-slate-500">{label}</span>
      {value}
    </div>
  );
}
