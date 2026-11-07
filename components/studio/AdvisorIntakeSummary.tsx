import type { AdvisorIntake } from "@/lib/marketplace-types";
import { formatCurrency, roofLabels, type RoofStyle } from "@/lib/feasibility";
import { fireZoneLabel } from "@/lib/fire-hazard";
import type { FireHazardZone } from "@/lib/parcel-types";

const bedroomLabels: Record<string, string> = { studio: "Studio", "1br": "1 bedroom", "2br": "2 bedrooms" };

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The snapshot stores the raw class; older snapshots may hold other strings. */
function fireHazardText(value: string): string {
  if (value === "none") return "Not in a mapped zone";
  if (value === "unknown") return "Not confirmed";
  return fireZoneLabel(value as FireHazardZone) ?? sentenceCase(value);
}

/**
 * The project facts a builder receives with a lead. Values are stored raw on
 * the snapshot ("high", "shed", "1br") and worded here for people to read.
 *
 * @param props.title - Heading; the builder inbox keeps the default, the
 *   homeowner's connect form says what the summary is for.
 */
export function AdvisorIntakeSummary({
  intake,
  title = "Advisor intake summary",
}: {
  intake: AdvisorIntake;
  title?: string;
}) {
  const rows = [
    ["Lot", `${intake.lotSqft.toLocaleString()} sq ft`],
    ["Existing building footprint", intake.existingFootprintSqft === null ? "Not confirmed" : `${intake.existingFootprintSqft.toLocaleString()} sq ft`],
    ["Reported zoning", intake.zoning ?? "Not found"],
    ["Fire hazard zone", fireHazardText(intake.fireHazard)], ["Slope", intake.slope],
    ["Proposed size", intake.dimensions], ["Roof", roofLabels[intake.roof as RoofStyle] ?? sentenceCase(intake.roof)],
    ["Bedrooms (modeled)", bedroomLabels[intake.bedroomClass] ?? intake.bedroomClass],
    ["Estimated build budget", `${formatCurrency(intake.buildBandLow)}–${formatCurrency(intake.buildBandHigh)}`],
  ];
  return <section aria-label={title} className="border border-lot-line bg-lot-chalk p-4">
    <h3 className="text-sm font-semibold text-lot-ink">{title}</h3>
    <dl className="mt-3 space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-lot-stone">{label}</dt><dd className="text-lot-ink">{value}</dd></div>)}</dl>
    <p className="mt-3 text-xs leading-5 text-lot-stone">Planning estimates for an introductory conversation. Site conditions, zoning and costs need confirmation.</p>
  </section>;
}
