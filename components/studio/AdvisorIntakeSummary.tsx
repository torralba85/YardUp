import type { AdvisorIntake } from "@/lib/marketplace-types";
import { formatCurrency } from "@/lib/feasibility";

export function AdvisorIntakeSummary({ intake }: { intake: AdvisorIntake }) {
  const rows = [
    ["Lot", `${intake.lotSqft.toLocaleString()} sq ft`],
    ["Existing building footprint", intake.existingFootprintSqft === null ? "Unknown" : `${intake.existingFootprintSqft.toLocaleString()} sq ft`],
    ["Reported zoning", intake.zoning ?? "Unknown"],
    ["Fire hazard zone", intake.fireHazard], ["Slope", intake.slope],
    ["Proposed size", intake.dimensions], ["Roof", intake.roof],
    ["Modeled bedroom class", intake.bedroomClass],
    ["Estimated build budget", `${formatCurrency(intake.buildBandLow)}–${formatCurrency(intake.buildBandHigh)}`],
  ];
  return <section aria-label="Advisor intake summary" className="border border-lot-line bg-lot-chalk p-4">
    <h3 className="text-sm font-semibold text-lot-ink">Advisor intake summary</h3>
    <dl className="mt-3 space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-lot-stone">{label}</dt><dd className="text-lot-ink">{value}</dd></div>)}</dl>
    <p className="mt-3 text-xs leading-5 text-lot-stone">Planning estimates for an introductory conversation. Site conditions, zoning and costs need confirmation.</p>
  </section>;
}
