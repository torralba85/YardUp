import type { ADUConfig } from "@/lib/feasibility";

/** Footprints share one scale so a larger choice actually looks larger. */
export function FootprintDiagram({ width, length }: Pick<ADUConfig, "width" | "length">) {
  return (
    <svg viewBox="0 0 56 56" fill="none" aria-hidden="true" className="h-14 w-14 shrink-0">
      <rect x={(56 - width) / 2} y={(56 - length) / 2} width={width} height={length}
        fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 52H52" stroke="currentColor" strokeOpacity="0.25" />
    </svg>
  );
}

/** Illustrative elevations; roof profiles match the three available choices. */
export function RoofProfile({ roof }: { roof: ADUConfig["roof"] }) {
  const outline = {
    shed: "M8 22L48 10V42H8Z",
    gable: "M8 24L28 8L48 24V42H8Z",
    flat: "M8 16H48V42H8Z",
  }[roof];
  return (
    <svg viewBox="0 0 56 48" fill="none" aria-hidden="true" className="h-9 w-12">
      <path d={outline} fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
      <path d="M23 42V29H33V42M4 44H52" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
